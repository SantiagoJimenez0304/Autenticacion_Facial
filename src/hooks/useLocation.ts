import { useState, useEffect, useCallback, useRef } from 'react';
import * as Location from 'expo-location';
import { LatLng, Zone, LocationState } from '../types';
import { requestLocationPermissions, watchLocation } from '../services/location';
import { isPointInZone, findNearestZone } from '../utils/geo';

export function useLocation(zones: Zone[]) {
  const [state, setState] = useState<LocationState>({
    currentLocation: null,
    isInZone: false,
    distanceToZone: null,
    nearestZone: null,
    isTracking: false,
    error: null,
  });

  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);

  const updateLocation = useCallback(
    (location: LatLng) => {
      const { zone, distance } = findNearestZone(location, zones);
      const inZone = zone ? isPointInZone(location, zone) : false;

      setState({
        currentLocation: location,
        isInZone: inZone,
        distanceToZone: distance,
        nearestZone: zone,
        isTracking: true,
        error: null,
      });
    },
    [zones]
  );

  const startTracking = useCallback(async () => {
    const hasPermission = await requestLocationPermissions();
    if (!hasPermission) {
      setState((prev) => ({
        ...prev,
        error: 'Permiso de ubicación denegado',
        isTracking: false,
      }));
      return;
    }

    try {
      const subscription = await watchLocation(updateLocation);
      subscriptionRef.current = subscription;
      setState((prev) => ({ ...prev, isTracking: true, error: null }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: 'Error al iniciar tracking de ubicación',
        isTracking: false,
      }));
    }
  }, [updateLocation]);

  const stopTracking = useCallback(() => {
    if (subscriptionRef.current) {
      subscriptionRef.current.remove();
      subscriptionRef.current = null;
    }
    setState((prev) => ({ ...prev, isTracking: false }));
  }, []);

  useEffect(() => {
    startTracking();
    return () => {
      stopTracking();
    };
  }, [startTracking, stopTracking]);

  return {
    ...state,
    startTracking,
    stopTracking,
  };
}
