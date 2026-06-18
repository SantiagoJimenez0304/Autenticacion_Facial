import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useLocation } from '../hooks/useLocation';
import {
    getCheckIns,
    getProfiles,
    getThreshold,
    getZones,
    saveFacePhoto,
    saveThreshold,
    addCheckIn as storageAddCheckIn,
    clearCheckIns as storageClearCheckIns,
    deleteProfile as storageDeleteProfile,
    deleteZone as storageDeleteZone,
    saveProfile as storageSaveProfile,
    saveZone as storageSaveZone,
} from '../services/storage';
import { CheckIn, FaceProfile, LocationState, Zone } from '../types';
import { getEmbedding, healthCheck } from '../services/faceApi';

interface AppContextType {
  profiles: FaceProfile[];
  zones: Zone[];
  checkIns: CheckIn[];
  threshold: number;
  locationState: LocationState;
  isLoading: boolean;
  
  // Actions
  addProfile: (name: string, photoUri?: string) => Promise<FaceProfile>;
  updateProfilePhoto: (id: string, photoUri: string) => Promise<void>;
  deleteProfile: (id: string) => Promise<void>;
  addZone: (name: string, latitude: number, longitude: number, radius: number) => Promise<Zone>;
  deleteZone: (id: string) => Promise<void>;
  addCheckIn: (checkIn: Omit<CheckIn, 'id' | 'timestamp'>) => Promise<void>;
  clearCheckIns: () => Promise<void>;
  setThreshold: (value: number) => Promise<void>;
  startLocationTracking: () => Promise<void>;
  stopLocationTracking: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [profiles, setProfiles] = useState<FaceProfile[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [threshold, setThresholdState] = useState<number>(75);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize location hook with zones
  const locationHook = useLocation(zones);

  // Load all initial data from storage
  useEffect(() => {
    async function loadData() {
      try {
        // Cargar datos rápidamente sin esperar demasiado
        Promise.all([
          getProfiles(),
          getZones(),
          getCheckIns(),
          getThreshold(),
        ]).then(([storedProfiles, storedZones, storedCheckIns, storedThreshold]) => {
          setProfiles(storedProfiles);
          setZones(storedZones);
          setCheckIns(storedCheckIns);
          setThresholdState(storedThreshold);
        }).catch((error) => {
          console.error('Error al cargar datos:', error);
        }).finally(() => {
          setIsLoading(false);
        });
      } catch (error) {
        console.error('Error al cargar datos del almacenamiento:', error);
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  // Profile operations
  const addProfile = useCallback(async (name: string, photoUri?: string) => {
    const id = Date.now().toString();
    const newProfile: FaceProfile = {
      id,
      name,
      photoUris: [],
      faceDescriptor: null,
      createdAt: new Date().toLocaleDateString('es-MX', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
      updatedAt: new Date().toISOString(),
    };

    if (photoUri) {
      try {
        const localPhotoUri = await saveFacePhoto(id, photoUri, 0);
        newProfile.photoUris = [localPhotoUri];

          const serverOnline = await healthCheck();
        if (serverOnline) {
          const embedding = await getEmbedding(localPhotoUri);
          newProfile.faceDescriptor = embedding || null;
        }
      } catch (err: any) {
        console.error('Error al procesar foto facial:', err?.message || err);
      }
    }

    await storageSaveProfile(newProfile);
    setProfiles((prev) => [newProfile, ...prev]);
    return newProfile;
  }, []);

  const updateProfilePhoto = useCallback(async (id: string, photoUri: string) => {
    try {
      const localPhotoUri = await saveFacePhoto(id, photoUri, 0);
      let faceDescriptor: number[] | null = null;

      try {
        const serverOnline = await healthCheck();
        if (serverOnline) {
          faceDescriptor = await getEmbedding(localPhotoUri);
        }
      } catch (err: any) {
        console.error('Error al obtener embedding facial:', err?.message || err);
      }

      setProfiles((prev) =>
        prev.map((p) => {
          if (p.id === id) {
            const updated = {
              ...p,
              photoUris: [localPhotoUri],
              faceDescriptor,
              updatedAt: new Date().toISOString(),
            };
            storageSaveProfile(updated);
            return updated;
          }
          return p;
        })
      );
    } catch (err) {
      console.error('Error al actualizar la foto de perfil:', err);
    }
  }, []);

  const deleteProfile = useCallback(async (id: string) => {
    await storageDeleteProfile(id);
    setProfiles((prev) => prev.filter((p) => p.id !== id));
  }, []);

  // Zone operations
  const addZone = useCallback(async (name: string, latitude: number, longitude: number, radius: number) => {
    const newZone: Zone = {
      id: Date.now().toString(),
      name,
      center: { latitude, longitude },
      radius,
    };
    await storageSaveZone(newZone);
    setZones((prev) => [...prev, newZone]);
    return newZone;
  }, []);

  const deleteZone = useCallback(async (id: string) => {
    await storageDeleteZone(id);
    setZones((prev) => prev.filter((z) => z.id !== id));
  }, []);

  // Check-in operations
  const addCheckIn = useCallback(async (checkInData: Omit<CheckIn, 'id' | 'timestamp'>) => {
    const newCheckIn: CheckIn = {
      ...checkInData,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
    };
    await storageAddCheckIn(newCheckIn);
    setCheckIns((prev) => [newCheckIn, ...prev.slice(0, 99)]);
  }, []);

  const clearCheckIns = useCallback(async () => {
    await storageClearCheckIns();
    setCheckIns([]);
  }, []);

  // Threshold operations
  const setThreshold = useCallback(async (value: number) => {
    const clamped = Math.max(50, Math.min(99, value));
    await saveThreshold(clamped);
    setThresholdState(clamped);
  }, []);

  return (
    <AppContext.Provider
      value={{
        profiles,
        zones,
        checkIns,
        threshold,
        locationState: locationHook,
        isLoading,
        addProfile,
        updateProfilePhoto,
        deleteProfile,
        addZone,
        deleteZone,
        addCheckIn,
        clearCheckIns,
        setThreshold,
        startLocationTracking: locationHook.startTracking,
        stopLocationTracking: locationHook.stopTracking,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp debe ser usado dentro de un AppProvider');
  }
  return context;
}
