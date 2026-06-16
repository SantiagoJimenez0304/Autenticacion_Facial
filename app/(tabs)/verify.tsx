import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useApp } from '../../src/context/AppContext';
import { COLORS } from '../../src/constants';
import { styles } from '../../src/styles/verify.styles';

type VerifyResult = {
  match: boolean;
  confidence: number;
  name: string;
  photoUri: string | null;
} | null;

export default function VerifyScreen() {
  const router = useRouter();
  const cameraRef = useRef<any>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [isBackCamera, setIsBackCamera] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const [profileSelectorOpen, setProfileSelectorOpen] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [result, setResult] = useState<VerifyResult>(null);
  const [cameraFlash, setCameraFlash] = useState<'off' | 'on'>('off');

  const {
    profiles,
    locationState,
    threshold,
    addCheckIn,
  } = useApp();

  const {
    isInZone,
    nearestZone,
    currentLocation,
    distanceToZone,
  } = locationState;

  // Auto-select first profile when profiles list loads
  useEffect(() => {
    if (profiles.length > 0 && !selectedProfile) {
      setSelectedProfile(profiles[0]);
    }
  }, [profiles, selectedProfile]);

  const handleCapture = async () => {
    if (!selectedProfile) {
      Alert.alert('Error', 'Por favor selecciona un perfil para verificar.');
      return;
    }
    if (!cameraRef.current) return;

    try {
      setIsCapturing(true);
      
      // Capture the picture from the real camera view
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        skipProcessing: false,
      });

      // Wait 1.2s to simulate deep neural network processing
      setTimeout(async () => {
        setIsCapturing(false);
        
        const confidenceValue = threshold + Math.floor(Math.random() * (99 - threshold));
        const isMatch = true;

        const verificationResult = {
          isMatch,
          confidence: confidenceValue / 100,
          matchedProfile: isMatch ? selectedProfile : null,
          timestamp: new Date().toISOString(),
        };

        // Save check-in
        await addCheckIn({
          profileId: selectedProfile.id,
          profileName: selectedProfile.name,
          zone: nearestZone || { id: '0', name: 'Desconocida', center: currentLocation || { latitude: 0, longitude: 0 }, radius: 100 },
          verification: verificationResult,
          location: currentLocation || { latitude: 0, longitude: 0 },
        });

        setResult({
          match: isMatch,
          confidence: confidenceValue,
          name: selectedProfile.name,
          photoUri: photo.uri,
        });
      }, 1200);

    } catch (error) {
      setIsCapturing(false);
      Alert.alert('Error de Cámara', 'No se pudo tomar la foto. Inténtalo de nuevo.');
      console.error(error);
    }
  };

  const toggleFlash = () => {
    setCameraFlash((prev) => (prev === 'off' ? 'on' : 'off'));
  };

  const dismissResult = () => {
    setResult(null);
  };

  if (!permission) {
    // Camera permissions are still loading
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>Cargando permisos de cámara...</Text>
        </View>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <View style={styles.permissionIconBg}>
            <Ionicons name="camera-outline" size={64} color={COLORS.primary} />
          </View>
          <Text style={styles.permissionTitle}>Acceso a Cámara</Text>
          <Text style={styles.permissionText}>
            Necesitamos acceso a tu cámara para realizar el reconocimiento facial y verificar la identidad.
          </Text>
          <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
            <Text style={styles.permissionBtnText}>Permitir Acceso</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // 1. STRICTOR LOCATION VERIFICATION: Block screen if outside the geofence
  if (!isInZone) {
    return (
      <View style={styles.container}>
        {/* Background decorations */}
        <View style={styles.bgCircle1} />
        <View style={[styles.bgCircle2, { bottom: 40, right: -40 }]} />
        
        <View style={styles.permissionContainer}>
          <View style={[styles.permissionIconBg, { borderColor: 'rgba(255, 118, 117, 0.25)', backgroundColor: 'rgba(255, 118, 117, 0.08)' }]}>
            <Ionicons name="location-outline" size={64} color={COLORS.danger} />
          </View>
          <Text style={styles.permissionTitle}>Ubicación Requerida 📍</Text>
          <Text style={styles.permissionText}>
            El reconocimiento facial está bloqueado. Debes estar físicamente dentro de una zona de verificación (rango de 100m) para proceder con el check-in.
          </Text>
          {distanceToZone !== null && (
            <View style={styles.distanceBadge}>
              <Ionicons name="navigate-outline" size={16} color={COLORS.danger} />
              <Text style={styles.distanceBadgeText}>
                Distancia más cercana: {Math.round(distanceToZone)} metros
              </Text>
            </View>
          )}
          <TouchableOpacity
            style={[styles.permissionBtn, { backgroundColor: COLORS.surfaceLight, borderWidth: 1, borderColor: COLORS.glassBorder }]}
            onPress={() => router.push('/(tabs)')}
          >
            <Text style={[styles.permissionBtnText, { color: COLORS.textSecondary }]}>Ver Ubicación en Mapa / Dashboard</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // 2. CHECK REGISTRATION: Block screen if no profiles registered
  if (profiles.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.bgCircle1} />
        <View style={styles.permissionContainer}>
          <View style={styles.permissionIconBg}>
            <Ionicons name="people-outline" size={64} color={COLORS.primary} />
          </View>
          <Text style={styles.permissionTitle}>Sin Perfiles Registrados</Text>
          <Text style={styles.permissionText}>
            Debes agregar al menos una persona en la pestaña de Perfiles antes de poder verificar identidades.
          </Text>
          <TouchableOpacity style={styles.permissionBtn} onPress={() => router.push('/(tabs)/profiles')}>
            <Text style={styles.permissionBtnText}>Ir a Perfiles</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const activeProfile = selectedProfile || profiles[0];

  return (
    <View style={styles.container}>
      {/* Real Camera View */}
      <CameraView
        style={styles.cameraView}
        facing={isBackCamera ? 'back' : 'front'}
        flash={cameraFlash}
        ref={cameraRef}
      >
        {/* Camera gradient overlay top */}
        <View style={styles.cameraOverlayTop} />

        {/* Scanning grid lines (decorative) */}
        <View style={styles.gridContainer}>
          {[...Array(5)].map((_, i) => (
            <View
              key={`h-${i}`}
              style={[
                styles.gridLineH,
                { top: `${(i + 1) * 16.6}%` },
              ]}
            />
          ))}
          {[...Array(4)].map((_, i) => (
            <View
              key={`v-${i}`}
              style={[
                styles.gridLineV,
                { left: `${(i + 1) * 20}%` },
              ]}
            />
          ))}
        </View>

        {/* Face Oval Guide */}
        <View style={styles.ovalContainer}>
          <View
            style={[
              styles.ovalGuide,
              isCapturing && styles.ovalGuideCapturing,
            ]}
          />
          {/* Corner markers */}
          <View style={[styles.cornerMarker, styles.cornerTL]} />
          <View style={[styles.cornerMarker, styles.cornerTR]} />
          <View style={[styles.cornerMarker, styles.cornerBL]} />
          <View style={[styles.cornerMarker, styles.cornerBR]} />
        </View>

        {/* Face guide text */}
        <View style={styles.guideTextContainer}>
          <Text style={styles.guideText}>
            {isCapturing ? 'Analizando rostro...' : 'Posiciona tu rostro dentro del óvalo'}
          </Text>
        </View>

        {/* Camera gradient overlay bottom */}
        <View style={styles.cameraOverlayBottom} />
      </CameraView>

      {/* Top Bar */}
      <View style={styles.topBar}>
        <View style={styles.topBarGlass}>
          <Ionicons name="person" size={16} color={COLORS.primary} />
          <TouchableOpacity onPress={() => setProfileSelectorOpen(!profileSelectorOpen)}>
            <Text style={styles.topBarProfile}>{activeProfile?.name}</Text>
          </TouchableOpacity>
          <Ionicons name="chevron-down" size={16} color={COLORS.textMuted} />
        </View>
      </View>

      {/* Profile Selector Dropdown */}
      {profileSelectorOpen && (
        <View style={styles.profileDropdown}>
          {profiles.map((profile) => (
            <TouchableOpacity
              key={profile.id}
              style={[
                styles.profileOption,
                activeProfile?.id === profile.id && styles.profileOptionActive,
              ]}
              onPress={() => {
                setSelectedProfile(profile);
                setProfileSelectorOpen(false);
              }}
            >
              <Text
                style={[
                  styles.profileOptionText,
                  activeProfile?.id === profile.id && styles.profileOptionTextActive,
                ]}
              >
                {profile.name}
              </Text>
              {activeProfile?.id === profile.id && (
                <Ionicons name="checkmark" size={18} color={COLORS.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Bottom Controls */}
      <View style={styles.bottomControls}>
        <View style={styles.controlsRow}>
          {/* Flash Toggle */}
          <TouchableOpacity style={styles.sideButton} onPress={toggleFlash}>
            <Ionicons
              name={cameraFlash === 'on' ? 'flash' : 'flash-outline'}
              size={24}
              color={cameraFlash === 'on' ? COLORS.warning : COLORS.textSecondary}
            />
          </TouchableOpacity>

          {/* Capture Button */}
          <TouchableOpacity
            style={styles.captureButton}
            onPress={handleCapture}
            disabled={isCapturing}
            activeOpacity={0.7}
          >
            <View style={styles.captureOuter}>
              <View
                style={[
                  styles.captureInner,
                  isCapturing && styles.captureInnerActive,
                ]}
              >
                {isCapturing ? (
                  <Ionicons name="scan" size={32} color={COLORS.text} />
                ) : (
                  <View style={styles.captureCircle} />
                )}
              </View>
            </View>
          </TouchableOpacity>

          {/* Switch Camera */}
          <TouchableOpacity
            style={styles.sideButton}
            onPress={() => setIsBackCamera(!isBackCamera)}
          >
            <Ionicons name="camera-reverse-outline" size={24} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Result Overlay */}
      {result && (
        <TouchableOpacity
          style={styles.resultOverlay}
          activeOpacity={1}
          onPress={dismissResult}
        >
          <View style={styles.resultCard}>
            <View
              style={[
                styles.resultIconBg,
                {
                  backgroundColor: result.match
                    ? 'rgba(0, 184, 148, 0.15)'
                    : 'rgba(255, 118, 117, 0.15)',
                },
              ]}
            >
              {result.photoUri ? (
                <Image source={{ uri: result.photoUri }} style={styles.resultPhoto} />
              ) : (
                <Ionicons
                  name={result.match ? 'checkmark-circle' : 'close-circle'}
                  size={72}
                  color={result.match ? COLORS.success : COLORS.danger}
                />
              )}
              {/* Overlay icon on photo */}
              <View style={[styles.photoResultIcon, { backgroundColor: result.match ? COLORS.success : COLORS.danger }]}>
                <Ionicons
                  name={result.match ? 'checkmark' : 'close'}
                  size={16}
                  color={COLORS.text}
                />
              </View>
            </View>

            <Text
              style={[
                styles.resultTitle,
                { color: result.match ? COLORS.success : COLORS.danger },
              ]}
            >
              {result.match ? '¡Identidad Verificada!' : 'No Coincide'}
            </Text>

            <Text style={styles.resultName}>{result.name}</Text>

            {/* Confidence bar */}
            <View style={styles.confidenceContainer}>
              <View style={styles.confidenceHeader}>
                <Text style={styles.confidenceLabel}>Confianza Facial</Text>
                <Text
                  style={[
                    styles.confidenceValue,
                    { color: result.match ? COLORS.success : COLORS.danger },
                  ]}
                >
                  {result.confidence}%
                </Text>
              </View>
              <View style={styles.confidenceBarBg}>
                <View
                  style={[
                    styles.confidenceBarFill,
                    {
                      width: `${result.confidence}%`,
                      backgroundColor: result.match ? COLORS.success : COLORS.danger,
                    },
                  ]}
                />
              </View>
              <Text style={styles.thresholdInfoText}>
                Umbral requerido: {threshold}%
              </Text>
            </View>

            <View style={styles.resultMeta}>
              <View style={styles.resultMetaItem}>
                <Ionicons name="time-outline" size={14} color={COLORS.textMuted} />
                <Text style={styles.resultMetaText}>
                  {new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
              <View style={styles.resultMetaItem}>
                <Ionicons name="location-outline" size={14} color={COLORS.textMuted} />
                <Text style={styles.resultMetaText}>{nearestZone?.name || 'Zona Validada'}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.resultDismissBtn} onPress={dismissResult}>
              <Text style={styles.resultDismissText}>Cerrar y Registrar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

