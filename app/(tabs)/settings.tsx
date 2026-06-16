import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import { useApp } from '../../src/context/AppContext';
import { COLORS } from '../../src/constants';
import { styles } from '../../src/styles/settings.styles';
export default function SettingsScreen() {
  const {
    zones,
    threshold,
    setThreshold,
    addZone,
    deleteZone,
    clearCheckIns,
    checkIns,
    locationState,
  } = useApp();

  const [addModalVisible, setAddModalVisible] = useState(false);
  const [zoneName, setZoneName] = useState('');
  const [zoneLat, setZoneLat] = useState('');
  const [zoneLng, setZoneLng] = useState('');
  const [zoneRadius, setZoneRadius] = useState('100');

  const { currentLocation } = locationState;

  const handleDeleteZone = (id: string, name: string) => {
    Alert.alert(
      'Eliminar Zona',
      `¿Estás seguro de eliminar la zona "${name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteZone(id);
            } catch (err) {
              Alert.alert('Error', 'No se pudo eliminar la zona.');
            }
          },
        },
      ]
    );
  };

  const handleUseCurrentLocation = () => {
    if (currentLocation) {
      setZoneLat(currentLocation.latitude.toFixed(6));
      setZoneLng(currentLocation.longitude.toFixed(6));
    } else {
      Alert.alert(
        'Ubicación no disponible',
        'Por favor, asegúrate de activar el Rastreo GPS en el Dashboard y permitir los permisos de ubicación.'
      );
    }
  };

  const handleAddZone = async () => {
    const lat = parseFloat(zoneLat);
    const lng = parseFloat(zoneLng);
    const rad = parseFloat(zoneRadius);

    if (!zoneName.trim() || isNaN(lat) || isNaN(lng) || isNaN(rad)) {
      Alert.alert('Datos inválidos', 'Por favor llena todos los campos con valores numéricos correctos.');
      return;
    }

    try {
      await addZone(zoneName.trim(), lat, lng, rad);
      setZoneName('');
      setZoneLat('');
      setZoneLng('');
      setZoneRadius('100');
      setAddModalVisible(false);
      Alert.alert('Listo', 'Nueva zona registrada correctamente.');
    } catch (err) {
      Alert.alert('Error', 'No se pudo crear la zona.');
    }
  };

  const handleClearHistory = () => {
    if (checkIns.length === 0) {
      Alert.alert('Sin datos', 'No hay registros en el historial.');
      return;
    }

    Alert.alert(
      'Limpiar Historial',
      '¿Estás seguro? Se eliminarán permanentemente todos los registros de check-in de la base de datos local.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpiar',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearCheckIns();
              Alert.alert('Listo', 'Historial de asistencia eliminado.');
            } catch (err) {
              Alert.alert('Error', 'No se pudo limpiar el historial.');
            }
          },
        },
      ]
    );
  };

  const handleExport = async () => {
    if (checkIns.length === 0) {
      Alert.alert('Sin datos', 'No hay registros de check-in para exportar.');
      return;
    }
    
    try {
      let csvContent = 'ID,Persona,Zona,Resultado,Confianza,Latitud,Longitud,Fecha y Hora\n';
      checkIns.forEach((item) => {
        const row = [
          item.id,
          `"${item.profileName}"`,
          `"${item.zone.name}"`,
          item.verification.isMatch ? 'Exitoso' : 'Fallido',
          `${Math.round(item.verification.confidence * 100)}%`,
          item.location.latitude,
          item.location.longitude,
          item.timestamp,
        ].join(',');
        csvContent += row + '\n';
      });

      const path = `${FileSystem.documentDirectory}check_ins_export.csv`;
      await FileSystem.writeAsStringAsync(path, csvContent);
      
      Alert.alert(
        'Exportación Exitosa',
        `Se ha guardado el archivo en tu dispositivo:\n\n${path}\n\nLos registros se exportaron en formato CSV.`
      );
    } catch (err) {
      Alert.alert('Error', 'No se pudo exportar el archivo CSV.');
      console.error(err);
    }
  };

  const adjustThreshold = (delta: number) => {
    setThreshold(threshold + delta);
  };

  return (
    <View style={styles.container}>
      {/* Background decorations */}
      <View style={styles.bgCircle1} />
      <View style={styles.bgCircle2} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Configuración</Text>
          <Text style={styles.headerSubtitle}>Administra zonas y preferencias</Text>
        </View>

        {/* Section: Zones */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Ionicons name="location" size={18} color={COLORS.accent} />
            </View>
            <Text style={styles.sectionTitle}>Zonas de Verificación (Geocercas)</Text>
          </View>

          {zones.map((zone) => (
            <View key={zone.id} style={styles.zoneCard}>
              <View style={styles.zoneInfo}>
                <Text style={styles.zoneName}>{zone.name}</Text>
                <View style={styles.zoneCoords}>
                  <Ionicons name="navigate-outline" size={12} color={COLORS.textMuted} />
                  <Text style={styles.zoneCoordsText}>
                    {zone.center.latitude.toFixed(6)}, {zone.center.longitude.toFixed(6)}
                  </Text>
                </View>
                <View style={styles.zoneRadiusBadge}>
                  <Text style={styles.zoneRadiusText}>{zone.radius}m radio</Text>
                </View>
              </View>
              <View style={styles.zoneActions}>
                <TouchableOpacity
                  style={styles.zoneActionBtnDanger}
                  onPress={() => handleDeleteZone(zone.id, zone.name)}
                >
                  <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                </TouchableOpacity>
              </View>
            </View>
          ))}

          <TouchableOpacity style={styles.addZoneBtn} onPress={() => setAddModalVisible(true)} activeOpacity={0.8}>
            <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} />
            <Text style={styles.addZoneBtnText}>Agregar Zona</Text>
          </TouchableOpacity>
        </View>

        {/* Section: Facial Recognition */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Ionicons name="scan" size={18} color={COLORS.primaryLight} />
            </View>
            <Text style={styles.sectionTitle}>Reconocimiento Facial</Text>
          </View>

          <View style={styles.thresholdCard}>
            <View style={styles.thresholdHeader}>
              <Text style={styles.thresholdLabel}>Umbral de coincidencia</Text>
              <Text style={styles.thresholdValue}>{threshold}%</Text>
            </View>
            <Text style={styles.thresholdDesc}>
              Confianza mínima requerida para considerar una verificación facial exitosa.
            </Text>

            {/* Visual slider */}
            <View style={styles.sliderContainer}>
              <TouchableOpacity
                style={styles.sliderBtn}
                onPress={() => adjustThreshold(-5)}
              >
                <Ionicons name="remove" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
              <View style={styles.sliderTrack}>
                <View
                  style={[
                    styles.sliderFill,
                    { width: `${((threshold - 50) / 49) * 100}%` },
                  ]}
                />
                <View
                  style={[
                    styles.sliderThumb,
                    { left: `${((threshold - 50) / 49) * 100}%` },
                  ]}
                />
              </View>
              <TouchableOpacity
                style={styles.sliderBtn}
                onPress={() => adjustThreshold(5)}
              >
                <Ionicons name="add" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabelText}>50%</Text>
              <Text style={styles.sliderLabelText}>99%</Text>
            </View>
          </View>
        </View>

        {/* Section: Data */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Ionicons name="server-outline" size={18} color={COLORS.info} />
            </View>
            <Text style={styles.sectionTitle}>Datos</Text>
          </View>

          <TouchableOpacity style={styles.dataButton} onPress={handleExport}>
            <View style={styles.dataButtonLeft}>
              <View style={[styles.dataIcon, { backgroundColor: 'rgba(0, 184, 148, 0.1)' }]}>
                <Ionicons name="download-outline" size={20} color={COLORS.success} />
              </View>
              <View>
                <Text style={styles.dataButtonText}>Exportar Check-ins</Text>
                <Text style={styles.dataButtonDesc}>Descargar historial en CSV</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.dataButton} onPress={handleClearHistory}>
            <View style={styles.dataButtonLeft}>
              <View style={[styles.dataIcon, { backgroundColor: 'rgba(255, 118, 117, 0.1)' }]}>
                <Ionicons name="trash-outline" size={20} color={COLORS.danger} />
              </View>
              <View>
                <Text style={styles.dataButtonText}>Limpiar Historial</Text>
                <Text style={styles.dataButtonDesc}>Eliminar todos los registros locales</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Section: About */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Ionicons name="information-circle-outline" size={18} color={COLORS.warning} />
            </View>
            <Text style={styles.sectionTitle}>Acerca de</Text>
          </View>

          <View style={styles.aboutCard}>
            <View style={styles.aboutLogoContainer}>
              <View style={styles.aboutLogo}>
                <Ionicons name="shield-checkmark" size={36} color={COLORS.primary} />
              </View>
            </View>
            <Text style={styles.aboutTitle}>GeoFace</Text>
            <Text style={styles.aboutVersion}>Versión 1.0.0</Text>
            <View style={styles.aboutDivider} />
            <Text style={styles.aboutDesc}>
              Sistema de asistencia inteligente con geolocalización y reconocimiento facial. Fuerza al usuario a registrar su presencia física real dentro de la zona de verificación.
            </Text>

            <View style={styles.aboutInfoRow}>
              <View style={styles.aboutInfoItem}>
                <Text style={styles.aboutInfoLabel}>Plataforma</Text>
                <Text style={styles.aboutInfoValue}>React Native + Expo</Text>
              </View>
              <View style={styles.aboutInfoItem}>
                <Text style={styles.aboutInfoLabel}>Licencia</Text>
                <Text style={styles.aboutInfoValue}>MIT</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Add Zone Modal */}
      <Modal
        visible={addModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAddModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setAddModalVisible(false)}
          />
          <View style={styles.modalContainer}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Nueva Geocerca</Text>
            <Text style={styles.modalSubtitle}>
              Configura las coordenadas y el radio de la zona de asistencia.
            </Text>

            <View style={styles.inputContainer}>
              <Ionicons name="location-outline" size={20} color={COLORS.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="Nombre de la zona (ej. Oficina Principal)"
                placeholderTextColor={COLORS.textMuted}
                value={zoneName}
                onChangeText={setZoneName}
                autoFocus
              />
            </View>

            {/* Quick GPS Autofill Button */}
            <TouchableOpacity style={styles.useLocationBtn} onPress={handleUseCurrentLocation}>
              <Ionicons name="navigate-outline" size={16} color={COLORS.accent} />
              <Text style={styles.useLocationBtnText}>Obtener ubicación GPS actual</Text>
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
              <View style={[styles.inputContainer, { flex: 1, marginBottom: 0 }]}>
                <Text style={{ color: COLORS.textMuted, fontSize: 13, marginRight: 4 }}>Lat:</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00000"
                  placeholderTextColor={COLORS.textMuted}
                  value={zoneLat}
                  onChangeText={setZoneLat}
                  keyboardType="numeric"
                />
              </View>

              <View style={[styles.inputContainer, { flex: 1, marginBottom: 0 }]}>
                <Text style={{ color: COLORS.textMuted, fontSize: 13, marginRight: 4 }}>Lng:</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00000"
                  placeholderTextColor={COLORS.textMuted}
                  value={zoneLng}
                  onChangeText={setZoneLng}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={[styles.inputContainer, { marginBottom: 24 }]}>
              <Ionicons name="analytics-outline" size={20} color={COLORS.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="Radio en metros (ej. 100)"
                placeholderTextColor={COLORS.textMuted}
                value={zoneRadius}
                onChangeText={setZoneRadius}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => {
                  setZoneName('');
                  setZoneLat('');
                  setZoneLng('');
                  setZoneRadius('100');
                  setAddModalVisible(false);
                }}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, (!zoneName.trim() || !zoneLat || !zoneLng || !zoneRadius) && { opacity: 0.4 }]}
                onPress={handleAddZone}
                disabled={!zoneName.trim() || !zoneLat || !zoneLng || !zoneRadius}
              >
                <Text style={styles.modalConfirmText}>Agregar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

