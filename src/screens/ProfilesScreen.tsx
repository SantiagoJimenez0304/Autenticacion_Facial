import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Platform,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Image,
} from 'react-native';
import { showAlert } from '../utils/alert';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useApp } from '../context/AppContext';
import { COLORS } from '../constants';
import { styles } from '../styles/profiles.styles';
import type { FaceProfile } from '../types';
import ProfileCard from '../components/ProfileCard';

export default function ProfilesScreen() {
  const { profiles, addProfile, deleteProfile, updateProfilePhoto } = useApp();
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      showAlert('Permiso denegado', 'La app necesita acceso a la cámara para tomar fotos.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const selectPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showAlert('Permiso denegado', 'La app necesita acceso a la galería.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const selectPhotoSource = () => {
    showAlert(
      'Foto de Referencia',
      'Elige cómo subir la foto de la persona.',
      [
        { text: 'Tomar Foto', onPress: takePhoto },
        { text: 'Seleccionar de Galería', onPress: selectPhoto },
        { text: 'Cancelar', style: 'cancel' }
      ]
    );
  };

  const handleUpdatePhoto = async (id: string) => {
    showAlert(
      'Actualizar Foto',
      'Elige una opción para actualizar la foto de referencia.',
      [
        {
          text: 'Tomar Foto',
          onPress: async () => {
            const permission = await ImagePicker.requestCameraPermissionsAsync();
            if (!permission.granted) return;
            const result = await ImagePicker.launchCameraAsync({
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8,
            });
            if (!result.canceled) {
              await updateProfilePhoto(id, result.assets[0].uri);
              showAlert('Listo', 'Foto de referencia actualizada.');
            }
          }
        },
        {
          text: 'Seleccionar de Galería',
          onPress: async () => {
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permission.granted) return;
            const result = await ImagePicker.launchImageLibraryAsync({
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8,
            });
            if (!result.canceled) {
              await updateProfilePhoto(id, result.assets[0].uri);
              showAlert('Listo', 'Foto de referencia actualizada.');
            }
          }
        },
        { text: 'Cancelar', style: 'cancel' }
      ]
    );
  };

  const handleAddProfile = async () => {
    if (!newName.trim()) return;
    setIsSaving(true);
    try {
      await addProfile(newName.trim(), photoUri || undefined);
      setNewName('');
      setPhotoUri(null);
      setModalVisible(false);
    } catch (err) {
      showAlert('Error', 'No se pudo agregar la persona.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProfile = (id: string, name: string) => {
    showAlert(
      'Eliminar Perfil',
      `¿Estás seguro de eliminar a "${name}"? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteProfile(id);
            } catch (err) {
              showAlert('Error', 'No se pudo eliminar el perfil.');
            }
          },
        },
      ]
    );
  };

  const renderProfile = ({ item }: { item: FaceProfile }) => (
    <ProfileCard
      profile={item}
      onUpdatePhoto={handleUpdatePhoto}
      onDelete={handleDeleteProfile}
    />
  );

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="people-outline" size={64} color={COLORS.textMuted} />
      </View>
      <Text style={styles.emptyTitle}>Sin perfiles registrados</Text>
      <Text style={styles.emptySubtitle}>
        Agrega personas para poder verificar su identidad mediante reconocimiento facial.
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Background decorations */}
      <View style={styles.bgCircle1} />
      <View style={styles.bgCircle2} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Perfiles Registrados</Text>
          <Text style={styles.headerSubtitle}>
            {profiles.length} {profiles.length === 1 ? 'persona' : 'personas'}
          </Text>
        </View>
      </View>

      {/* Add Button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
      >
        <View style={styles.addButtonBg}>
          <Ionicons name="person-add" size={20} color={COLORS.text} />
          <Text style={styles.addButtonText}>Agregar Persona</Text>
        </View>
      </TouchableOpacity>

      {/* Profiles List */}
      <FlatList
        data={profiles}
        renderItem={renderProfile}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Add Profile Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setPhotoUri(null);
          setNewName('');
          setModalVisible(false);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => {
              setPhotoUri(null);
              setNewName('');
              setModalVisible(false);
            }}
          />
          <View style={styles.modalContainer}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Nuevo Perfil</Text>
            <Text style={styles.modalSubtitle}>
              Ingresa el nombre y foto de la persona a registrar
            </Text>

            {/* Photo Selection Container */}
            <View style={styles.photoSelectContainer}>
              <TouchableOpacity style={styles.photoSelectButton} onPress={selectPhotoSource}>
                {photoUri ? (
                  <Image source={{ uri: photoUri }} style={styles.photoPreview} />
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <Ionicons name="camera-outline" size={36} color={COLORS.textSecondary} />
                    <Text style={styles.photoPlaceholderText}>Añadir Foto</Text>
                  </View>
                )}
              </TouchableOpacity>
              {photoUri && (
                <TouchableOpacity style={styles.removePhotoBtn} onPress={() => setPhotoUri(null)}>
                  <Ionicons name="close-circle" size={24} color={COLORS.danger} />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color={COLORS.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="Nombre completo"
                placeholderTextColor={COLORS.textMuted}
                value={newName}
                onChangeText={setNewName}
                autoFocus
                autoCapitalize="words"
              />
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => {
                  setNewName('');
                  setPhotoUri(null);
                  setModalVisible(false);
                }}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, (!newName.trim() || isSaving) && { opacity: 0.4 }]}
                onPress={handleAddProfile}
                disabled={!newName.trim() || isSaving}
              >
                {isSaving ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="sync" size={18} color={COLORS.text} />
                    <Text style={styles.modalConfirmText}>Guardando...</Text>
                  </View>
                ) : (
                  <Text style={styles.modalConfirmText}>Agregar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

