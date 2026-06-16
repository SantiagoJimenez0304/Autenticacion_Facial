import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { FaceProfile, Zone, CheckIn } from '../types';

const KEYS = {
  PROFILES: '@geo_face_profiles',
  ZONES: '@geo_face_zones',
  CHECKINS: '@geo_face_checkins',
};

const FACE_PHOTOS_DIR = `${FileSystem.documentDirectory}face_photos/`;

// Ensure the photos directory exists
async function ensurePhotoDir(): Promise<void> {
  const dirInfo = await FileSystem.getInfoAsync(FACE_PHOTOS_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(FACE_PHOTOS_DIR, { intermediates: true });
  }
}

// PROFILES
export async function getProfiles(): Promise<FaceProfile[]> {
  try {
    const data = await AsyncStorage.getItem(KEYS.PROFILES);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function saveProfile(profile: FaceProfile): Promise<void> {
  const profiles = await getProfiles();
  const index = profiles.findIndex((p) => p.id === profile.id);
  if (index >= 0) {
    profiles[index] = profile;
  } else {
    profiles.push(profile);
  }
  await AsyncStorage.setItem(KEYS.PROFILES, JSON.stringify(profiles));
}

export async function deleteProfile(profileId: string): Promise<void> {
  const profiles = await getProfiles();
  const filtered = profiles.filter((p) => p.id !== profileId);
  await AsyncStorage.setItem(KEYS.PROFILES, JSON.stringify(filtered));
  // Also delete photos
  try {
    const photoDir = `${FACE_PHOTOS_DIR}${profileId}/`;
    const dirInfo = await FileSystem.getInfoAsync(photoDir);
    if (dirInfo.exists) {
      await FileSystem.deleteAsync(photoDir, { idempotent: true });
    }
  } catch {
    // ignore cleanup errors
  }
}

// Save a face photo and return the URI
export async function saveFacePhoto(
  profileId: string,
  photoUri: string,
  index: number
): Promise<string> {
  await ensurePhotoDir();
  const profileDir = `${FACE_PHOTOS_DIR}${profileId}/`;
  const dirInfo = await FileSystem.getInfoAsync(profileDir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(profileDir, { intermediates: true });
  }
  const destUri = `${profileDir}face_${index}.jpg`;
  await FileSystem.copyAsync({ from: photoUri, to: destUri });
  return destUri;
}

// ZONES
export async function getZones(): Promise<Zone[]> {
  try {
    const data = await AsyncStorage.getItem(KEYS.ZONES);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function saveZone(zone: Zone): Promise<void> {
  const zones = await getZones();
  const index = zones.findIndex((z) => z.id === zone.id);
  if (index >= 0) {
    zones[index] = zone;
  } else {
    zones.push(zone);
  }
  await AsyncStorage.setItem(KEYS.ZONES, JSON.stringify(zones));
}

export async function deleteZone(zoneId: string): Promise<void> {
  const zones = await getZones();
  const filtered = zones.filter((z) => z.id !== zoneId);
  await AsyncStorage.setItem(KEYS.ZONES, JSON.stringify(filtered));
}

// CHECK-INS
export async function getCheckIns(): Promise<CheckIn[]> {
  try {
    const data = await AsyncStorage.getItem(KEYS.CHECKINS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function addCheckIn(checkIn: CheckIn): Promise<void> {
  const checkIns = await getCheckIns();
  checkIns.unshift(checkIn); // add to beginning
  // Keep only last 100 check-ins
  const trimmed = checkIns.slice(0, 100);
  await AsyncStorage.setItem(KEYS.CHECKINS, JSON.stringify(trimmed));
}

export async function clearCheckIns(): Promise<void> {
  await AsyncStorage.setItem(KEYS.CHECKINS, JSON.stringify([]));
}

// THRESHOLD
export async function getThreshold(): Promise<number> {
  try {
    const val = await AsyncStorage.getItem('@geo_face_threshold');
    return val ? parseInt(val, 10) : 75;
  } catch {
    return 75;
  }
}

export async function saveThreshold(threshold: number): Promise<void> {
  try {
    await AsyncStorage.setItem('@geo_face_threshold', threshold.toString());
  } catch {
    // ignore
  }
}

