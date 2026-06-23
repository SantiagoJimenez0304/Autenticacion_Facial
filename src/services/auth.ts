import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { UserAccount } from '../types';
import { getServerAddress } from './faceApi';

const KEYS = {
  SESSION: 'geo_face_session',
};

// --- Secure Store Wrappers (same pattern as storage.ts) ---

async function secureGetItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return AsyncStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function secureSetItem(key: string, value: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  } catch (err: unknown) {
    console.error('Error secureSetItem in auth:', err);
  }
}

async function secureRemoveItem(key: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      await AsyncStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  } catch (err: unknown) {
    console.error('Error secureRemoveItem in auth:', err);
  }
}

// --- Account CRUD (via Cloud Backend) ---

export async function getStoredAccounts(adminId: string): Promise<UserAccount[]> {
  try {
    const res = await fetch(`${getServerAddress()}/v1/users?admin_id=${adminId}`);
    if (!res.ok) throw new Error('Error de red o acceso denegado');
    const data = await res.json();
    return data.users as UserAccount[];
  } catch (e) {
    console.error('getStoredAccounts error:', e);
    return [];
  }
}

export async function createAccount(
  username: string,
  password: string,
  role: 'admin' | 'user',
  displayName: string
): Promise<UserAccount> {
  const res = await fetch(`${getServerAddress()}/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, rol: role, nombre: displayName })
  });
  
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Error al crear la cuenta en la nube');
  }
  
  return {
    id: data.id,
    username,
    role,
    displayName,
    createdAt: new Date().toISOString()
  } as UserAccount;
}

export async function deleteAccount(accountId: string, adminId: string): Promise<void> {
  const res = await fetch(`${getServerAddress()}/v1/users/${accountId}?admin_id=${adminId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Error al eliminar cuenta en la nube');
}

// --- Authentication (via Cloud Backend) ---

export async function authenticateUser(
  username: string,
  password: string
): Promise<UserAccount | null> {
  try {
    const res = await fetch(`${getServerAddress()}/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    if (!res.ok) return null;
    
    const data = await res.json();
    return {
      id: data.id,
      username: data.username,
      role: data.rol,
      displayName: data.nombre,
      createdAt: new Date().toISOString()
    } as UserAccount;
  } catch (e) {
    console.error('authenticateUser error:', e);
    return null;
  }
}

// --- Session Persistence (Local) ---

export async function getActiveSession(): Promise<string | null> {
  try {
    return await secureGetItem(KEYS.SESSION);
  } catch {
    return null;
  }
}

export async function setActiveSession(userId: string): Promise<void> {
  await secureSetItem(KEYS.SESSION, userId);
}

export async function clearSession(): Promise<void> {
  await secureRemoveItem(KEYS.SESSION);
}

// --- Utilities ---

export async function getUserById(userId: string): Promise<UserAccount | null> {
  try {
    const res = await fetch(`${getServerAddress()}/v1/users/${userId}`);
    if (!res.ok) return null;
    return await res.json() as UserAccount;
  } catch (e) {
    console.error('getUserById error:', e);
    return null;
  }
}

export async function hasAnyAccounts(): Promise<boolean> {
  try {
    const res = await fetch(`${getServerAddress()}/v1/auth/has-accounts`);
    if (!res.ok) {
      console.warn('hasAnyAccounts falló con status:', res.status);
      throw new Error('No se pudo verificar el estado de las cuentas');
    }
    const data = await res.json();
    return data.has_accounts;
  } catch (e) {
    console.error('hasAnyAccounts error:', e);
    throw e; // Lanza el error para que el contexto no asuma que no hay cuentas
  }
}
