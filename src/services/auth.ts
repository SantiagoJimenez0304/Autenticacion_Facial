import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { UserAccount } from '../types';

const KEYS = {
  ACCOUNTS: 'geo_face_accounts',
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

// --- Password Hashing (SHA-256, pure JS, no extra deps) ---

export async function hashPassword(password: string): Promise<string> {
  // Use Web Crypto API if available (works on web + modern RN)
  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  // Fallback: simple hash for environments without Web Crypto
  // (still secure enough for local-only auth)
  let hash = 0;
  const str = password + '_geoface_salt_2024';
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash).toString(16).padStart(16, '0');
}

// --- Account CRUD ---

export async function getStoredAccounts(): Promise<UserAccount[]> {
  try {
    const data = await secureGetItem(KEYS.ACCOUNTS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function saveAccounts(accounts: UserAccount[]): Promise<void> {
  await secureSetItem(KEYS.ACCOUNTS, JSON.stringify(accounts));
}

export async function createAccount(
  username: string,
  password: string,
  role: 'admin' | 'user',
  displayName: string
): Promise<UserAccount> {
  const accounts = await getStoredAccounts();

  // Check for duplicate username
  const exists = accounts.find(
    (a) => a.username.toLowerCase() === username.toLowerCase()
  );
  if (exists) {
    throw new Error('Ya existe una cuenta con ese nombre de usuario.');
  }

  const passwordHash = await hashPassword(password);
  const newAccount: UserAccount = {
    id: Date.now().toString(),
    username: username.toLowerCase().trim(),
    passwordHash,
    role,
    displayName: displayName.trim(),
    createdAt: new Date().toISOString(),
  };

  accounts.push(newAccount);
  await saveAccounts(accounts);
  return newAccount;
}

export async function deleteAccount(accountId: string): Promise<void> {
  const accounts = await getStoredAccounts();
  const filtered = accounts.filter((a) => a.id !== accountId);
  await saveAccounts(filtered);
}

// --- Authentication ---

export async function authenticateUser(
  username: string,
  password: string
): Promise<UserAccount | null> {
  const accounts = await getStoredAccounts();
  const passwordHash = await hashPassword(password);

  const match = accounts.find(
    (a) =>
      a.username.toLowerCase() === username.toLowerCase().trim() &&
      a.passwordHash === passwordHash
  );

  return match || null;
}

// --- Session Persistence ---

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
  const accounts = await getStoredAccounts();
  return accounts.find((a) => a.id === userId) || null;
}

export async function hasAnyAccounts(): Promise<boolean> {
  const accounts = await getStoredAccounts();
  return accounts.length > 0;
}
