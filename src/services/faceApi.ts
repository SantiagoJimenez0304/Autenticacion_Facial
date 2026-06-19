import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Importar FileSystem solo en plataformas nativas (no disponible en web)
let FileSystem: typeof import('expo-file-system/legacy') | null = null;
if (Platform.OS !== 'web') {
  FileSystem = require('expo-file-system/legacy');
}

const SERVER_PORT = 5005;
const REQUEST_TIMEOUT = 120000;

function getServerHost(): string {
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const hostname = hostUri.split(':')[0];
    return `http://${hostname}:${SERVER_PORT}`;
  }
  return `http://localhost:${SERVER_PORT}`;
}

let API_BASE = getServerHost();

export function setServerAddress(hostname: string, port?: number) {
  API_BASE = `http://${hostname}:${port || SERVER_PORT}`;
}

export function getServerAddress(): string {
  return API_BASE;
}

export async function loadServerAddress(): Promise<void> {
  try {
    const ip = await AsyncStorage.getItem('@server_ip');
    if (ip) {
      setServerAddress(ip);
    }
  } catch (error) {
    console.error('Failed to load server IP:', error);
  }
}

export async function saveAndSetServerAddress(hostname: string): Promise<void> {
  try {
    await AsyncStorage.setItem('@server_ip', hostname);
    setServerAddress(hostname);
  } catch (error) {
    console.error('Failed to save server IP:', error);
  }
}

export class FaceApiError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'FaceApiError';
  }
}

export interface VerifyMatch {
  id: string;
  distance: number;
  confidence: number;
}

export interface VerifyResponse {
  matches: VerifyMatch[];
  best_match: VerifyMatch | null;
  verified: boolean;
  threshold: number;
}

export interface RepresentResponse {
  embedding: number[];
  facial_area?: { x: number; y: number; w: number; h: number };
  face_confidence?: number;
  model: string;
  dimensions: number;
}

async function request<T>(path: string, body: unknown, timeout = REQUEST_TIMEOUT): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const text = await res.text();

    if (!res.ok) {
      let errorMsg = `Ocurrió un problema en el servidor (${res.status}).`;
      try {
        const errData = JSON.parse(text);
        if (errData && errData.error) {
          errorMsg = errData.error;
        }
      } catch (e) {
        // No es JSON válido, mantener el mensaje genérico para no mostrar HTML o trazas de error al usuario
      }
      throw new FaceApiError(errorMsg, `HTTP_${res.status}`);
    }

    let data: T;
    try {
      data = JSON.parse(text) as T;
    } catch {
      throw new FaceApiError(
        `Ocurrió un error inesperado al leer la respuesta del servidor.`,
        'INVALID_RESPONSE'
      );
    }

    return data;
  } catch (err: any) {
    if (err instanceof FaceApiError) throw err;
    if (err.name === 'AbortError') {
      throw new FaceApiError('El servidor no respondió a tiempo. Revisa tu conexión.', 'TIMEOUT');
    }
    throw new FaceApiError(
      `No se pudo conectar al servidor. Verifica que esté encendido.`,
      'CONNECTION_REFUSED'
    );
  } finally {
    clearTimeout(timer);
  }
}

async function photoToBase64(photoUri: string): Promise<string> {
  // En web, las URIs de fotos son blob: o data: URIs
  if (Platform.OS === 'web') {
    // Si ya es un data URI, retornarlo directamente
    if (photoUri.startsWith('data:')) {
      return photoUri;
    }
    // Convertir blob URI a base64 usando fetch + FileReader
    const response = await fetch(photoUri);
    const blob = await response.blob();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // En nativo, usar FileSystem
  const base64 = await FileSystem!.readAsStringAsync(photoUri, {
    encoding: FileSystem!.EncodingType.Base64,
  });
  return `data:image/jpeg;base64,${base64}`;
}

export async function getEmbedding(photoUri: string): Promise<number[]> {
  const image = await photoToBase64(photoUri);
  const result = await request<RepresentResponse>('/v1/represent', { image });
  return result.embedding;
}

export async function verifyFace(
  photoUri: string,
  embeddings: { id: string; embedding: number[] }[]
): Promise<VerifyResponse> {
  const image = await photoToBase64(photoUri);
  return request<VerifyResponse>('/v1/verify', {
    image,
    embeddings,
  });
}

export async function healthCheck(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${API_BASE}/v1/health`, { signal: controller.signal });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}
