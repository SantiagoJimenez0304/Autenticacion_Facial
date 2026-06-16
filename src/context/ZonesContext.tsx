import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Zone } from '../types';

interface ZonesContextType {
  zones: Zone[];
  addZone: (zone: Zone) => Promise<void>;
  removeZone: (zoneId: string) => Promise<void>;
  updateZone: (zone: Zone) => Promise<void>;
  setDefaultZone: (zone: Zone) => void;
  isLoading: boolean;
}

const ZonesContext = createContext<ZonesContextType | undefined>(undefined);

export function ZonesProvider({ children }: { children: React.ReactNode }) {
  const [zones, setZones] = useState<Zone[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Cargar zonas guardadas al iniciar
  useEffect(() => {
    loadZones();
  }, []);

  const loadZones = async () => {
    try {
      const stored = await AsyncStorage.getItem('zones');
      if (stored) {
        setZones(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error cargando zonas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addZone = async (zone: Zone) => {
    try {
      const updated = [...zones, zone];
      setZones(updated);
      await AsyncStorage.setItem('zones', JSON.stringify(updated));
    } catch (error) {
      console.error('Error añadiendo zona:', error);
    }
  };

  const removeZone = async (zoneId: string) => {
    try {
      const updated = zones.filter((z) => z.id !== zoneId);
      setZones(updated);
      await AsyncStorage.setItem('zones', JSON.stringify(updated));
    } catch (error) {
      console.error('Error eliminando zona:', error);
    }
  };

  const updateZone = async (zone: Zone) => {
    try {
      const updated = zones.map((z) => (z.id === zone.id ? zone : z));
      setZones(updated);
      await AsyncStorage.setItem('zones', JSON.stringify(updated));
    } catch (error) {
      console.error('Error actualizando zona:', error);
    }
  };

  const setDefaultZone = (zone: Zone) => {
    // Remplaza la zona por defecto
    const updated = zones.map((z) => (z.id === 'default' ? zone : z));
    setZones(updated);
  };

  return (
    <ZonesContext.Provider
      value={{
        zones,
        addZone,
        removeZone,
        updateZone,
        setDefaultZone,
        isLoading,
      }}
    >
      {children}
    </ZonesContext.Provider>
  );
}

export function useZones() {
  const context = useContext(ZonesContext);
  if (!context) {
    throw new Error('useZones debe usarse dentro de ZonesProvider');
  }
  return context;
}
