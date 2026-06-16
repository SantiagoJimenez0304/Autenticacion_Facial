import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useApp } from '../../src/context/AppContext';
import { COLORS } from '../../src/constants';
import { formatDistance } from '../../src/utils/geo';
import { styles } from '../../src/styles/index.styles';

export default function DashboardScreen() {
  const router = useRouter();
  const { isLoading, checkIns, locationState, startLocationTracking, stopLocationTracking, zones } = useApp();
  const [pulseOpacity, setPulseOpacity] = useState(1);

  const {
    currentLocation = null,
    isInZone = false,
    distanceToZone = null,
    nearestZone = null,
    isTracking = false,
    error = null,
  } = locationState || {};

  // Pulsing animation for tracking dot
  useEffect(() => {
    if (!isTracking) return;
    const interval = setInterval(() => {
      setPulseOpacity((prev) => (prev === 1 ? 0.3 : 1));
    }, 800);
    return () => clearInterval(interval);
  }, [isTracking]);

  // Mostrar pantalla de carga mientras los datos se están cargando
  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={styles.appTitle}>GeoFace</Text>
        <Text style={styles.appSubtitle}>Inicializando...</Text>
      </View>
    );
  }

  const toggleTracking = () => {
    if (isTracking) {
      stopLocationTracking();
    } else {
      startLocationTracking();
    }
  };

  const formatCheckInDate = (isoString: string) => {
    const date = new Date(isoString);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    
    const timeStr = date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    
    if (date.toDateString() === today.toDateString()) {
      return `Hoy · ${timeStr}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Ayer · ${timeStr}`;
    } else {
      return `${date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })} · ${timeStr}`;
    }
  };

  return (
    <View style={styles.container}>
      {/* Header gradient effect */}
      <View style={styles.headerGradient}>
        <View style={styles.headerGradientLayer1} />
        <View style={styles.headerGradientLayer2} />
        <View style={styles.headerGradientLayer3} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.appTitle}>GeoFace</Text>
            <Text style={styles.appSubtitle}>Control de asistencia inteligente</Text>
          </View>
          <TouchableOpacity style={styles.notificationBtn} onPress={() => {
            if (error) {
              alert(error);
            } else {
              alert("Sistema GPS activo y funcionando.");
            }
          }}>
            <Ionicons name="notifications-outline" size={24} color={COLORS.textSecondary} />
            {error && <View style={styles.notifBadge} />}
          </TouchableOpacity>
        </View>

        {/* Tracking Status Card */}
        <View style={styles.trackingCard}>
          <View style={styles.trackingCardInner}>
            <View style={styles.trackingHeader}>
              <View style={styles.trackingDotContainer}>
                <View
                  style={[
                    styles.trackingDot,
                    {
                      backgroundColor: isTracking ? COLORS.success : COLORS.danger,
                      opacity: isTracking ? pulseOpacity : 1,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.trackingDotGlow,
                    {
                      backgroundColor: isTracking ? COLORS.success : COLORS.danger,
                      opacity: isTracking ? pulseOpacity * 0.3 : 0,
                    },
                  ]}
                />
              </View>
              <Text style={styles.trackingText}>
                {isTracking ? 'GPS Activo' : 'GPS Inactivo'}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              {/* GPS Tracking Toggle */}
              <TouchableOpacity
                style={[
                  styles.trackingToggle,
                  { backgroundColor: isTracking ? 'rgba(0, 184, 148, 0.15)' : 'rgba(255, 118, 117, 0.15)' },
                ]}
                onPress={toggleTracking}
              >
                <Ionicons
                  name={isTracking ? 'pause' : 'play'}
                  size={16}
                  color={isTracking ? COLORS.success : COLORS.danger}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Zone Status - Big Card */}
        <View style={styles.zoneCard}>
          {isInZone && <View style={styles.zoneGlow} />}
          <View style={styles.zoneCardContent}>
            <View
              style={[
                styles.zoneIconContainer,
                {
                  backgroundColor: isInZone
                    ? 'rgba(0, 184, 148, 0.15)'
                    : 'rgba(255, 118, 117, 0.1)',
                  borderColor: isInZone
                    ? 'rgba(0, 184, 148, 0.3)'
                    : 'rgba(255, 118, 117, 0.2)',
                },
              ]}
            >
              <Ionicons
                name={isInZone ? 'shield-checkmark' : 'shield-outline'}
                size={48}
                color={isInZone ? COLORS.success : COLORS.textMuted}
              />
            </View>
            <Text
              style={[
                styles.zoneStatus,
                { color: isInZone ? COLORS.success : COLORS.danger },
              ]}
            >
              {isInZone ? 'En Zona' : 'Fuera de Zona'}
            </Text>
            <Text style={styles.zoneSubtext}>
              {isInZone
                ? `Dentro de rango: ${nearestZone?.name || 'Zona Principal'}`
                : nearestZone
                ? `Acércate a ${nearestZone.name}`
                : 'Crea una zona en Ajustes'}
            </Text>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Ionicons name="navigate" size={20} color={COLORS.info} />
            </View>
            <Text style={styles.statValue}>
              {distanceToZone !== null ? formatDistance(distanceToZone) : 'N/A'}
            </Text>
            <Text style={styles.statLabel}>Distancia</Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Ionicons name="location-outline" size={20} color={COLORS.accent} />
            </View>
            <Text style={styles.statValue}>
              {currentLocation ? currentLocation.latitude.toFixed(4) : '0.0000'}
            </Text>
            <Text style={styles.statLabel}>Latitud</Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Ionicons name="compass-outline" size={20} color={COLORS.primaryLight} />
            </View>
            <Text style={styles.statValue}>
              {currentLocation ? currentLocation.longitude.toFixed(4) : '0.0000'}
            </Text>
            <Text style={styles.statLabel}>Longitud</Text>
          </View>
        </View>

        {/* Verify Identity Button */}
        <TouchableOpacity
          style={[
            styles.verifyButton,
            !isInZone && styles.verifyButtonDisabled,
          ]}
          disabled={!isInZone}
          activeOpacity={0.8}
          onPress={() => router.push('/(tabs)/verify')}
        >
          {isInZone && <View style={styles.verifyButtonGlow} />}
          <View style={styles.verifyButtonInner}>
            <View style={styles.verifyButtonBg}>
              <Ionicons name="scan" size={28} color={COLORS.text} />
              <Text style={styles.verifyButtonText}>Verificar Identidad</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Recent Check-ins */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Registros Recientes</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/verify')}>
            <Text style={styles.sectionAction}>Nuevo Registro</Text>
          </TouchableOpacity>
        </View>

        {checkIns.length === 0 ? (
          <View style={[styles.checkInCard, { justifyContent: 'center', paddingVertical: 20 }]}>
            <Text style={{ color: COLORS.textMuted, fontSize: 14 }}>Sin registros recientes</Text>
          </View>
        ) : (
          checkIns.map((item) => (
            <View key={item.id} style={styles.checkInCard}>
              <View
                style={[
                  styles.checkInAvatar,
                  {
                    backgroundColor:
                      item.verification.isMatch
                        ? 'rgba(0, 184, 148, 0.15)'
                        : 'rgba(255, 118, 117, 0.15)',
                  },
                ]}
              >
                <Ionicons
                  name={item.verification.isMatch ? 'checkmark-circle' : 'close-circle'}
                  size={24}
                  color={item.verification.isMatch ? COLORS.success : COLORS.danger}
                />
              </View>
              <View style={styles.checkInInfo}>
                <Text style={styles.checkInName}>{item.profileName}</Text>
                <Text style={styles.checkInTime}>
                  {item.zone.name} · {formatCheckInDate(item.timestamp)}
                </Text>
              </View>
              <View
                style={[
                  styles.checkInBadge,
                  {
                    backgroundColor:
                      item.verification.isMatch
                        ? 'rgba(0, 184, 148, 0.12)'
                        : 'rgba(255, 118, 117, 0.12)',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.checkInBadgeText,
                    {
                      color: item.verification.isMatch ? COLORS.success : COLORS.danger,
                    },
                  ]}
                >
                  {item.verification.isMatch ? `${Math.round(item.verification.confidence * 100)}%` : 'Fallido'}
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}


