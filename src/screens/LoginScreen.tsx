import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { saveAndSetServerAddress, healthCheck, getServerAddress, setServerAddress } from '../services/faceApi';
import { COLORS } from '../constants';
import { styles } from '../styles/login.styles';

export default function LoginScreen() {
  const { login, createAccount, isFirstRun, isLoading } = useAuth();

  // Form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Focus tracking for input highlight
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Fade-in animation
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  // Error banner animation
  const errorAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (error) {
      errorAnim.setValue(0);
      Animated.timing(errorAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [error, errorAnim]);

  const clearError = () => setError(null);

  // Server settings modal state
  const [serverModalVisible, setServerModalVisible] = useState(false);
  const [serverIp, setServerIp] = useState('');
  const [testingConnection, setTestingConnection] = useState(false);

  const openServerSettings = () => {
    const currentAddr = getServerAddress();
    let ip = currentAddr.replace(/^https?:\/\//, '').replace(/:\d+$/, '');
    setServerIp(ip);
    setServerModalVisible(true);
  };

  const closeServerSettings = () => {
    setServerModalVisible(false);
  };

  const handleTestConnection = async () => {
    if (!serverIp.trim()) return;
    setTestingConnection(true);
    // Temporary set to test
    setServerAddress(serverIp.trim());
    try {
      const isUp = await healthCheck();
      if (isUp) {
        Alert.alert('Éxito', 'Conexión exitosa con el servidor.');
      } else {
        Alert.alert('Error', 'No se pudo conectar con el servidor. Verifica la IP.');
      }
    } catch (e) {
      Alert.alert('Error', 'Ocurrió un error al intentar conectar.');
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSaveServer = async () => {
    if (!serverIp.trim()) return;
    await saveAndSetServerAddress(serverIp.trim());
    closeServerSettings();
  };

  const handleSubmit = async () => {
    clearError();

    if (isFirstRun) {
      // ── First-run validation ──
      if (!displayName.trim()) {
        setError('Por favor ingresa tu nombre completo.');
        return;
      }
      if (!username.trim()) {
        setError('Por favor ingresa un nombre de usuario.');
        return;
      }
      if (password.length < 4) {
        setError('La contraseña debe tener al menos 4 caracteres.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Las contraseñas no coinciden.');
        return;
      }

      setSubmitting(true);
      try {
        const result = await createAccount(
          username.trim(),
          password,
          'admin',
          displayName.trim(),
        );
        if (!result.success) {
          setError(result.error ?? 'No se pudo crear la cuenta.');
          setSubmitting(false);
          return;
        }
        // Auto-login after account creation
        const loginResult = await login(username.trim(), password);
        if (!loginResult.success) {
          setError(loginResult.error ?? 'Cuenta creada, pero no se pudo iniciar sesión.');
        }
      } catch {
        setError('Ocurrió un error inesperado. Inténtalo de nuevo.');
      } finally {
        setSubmitting(false);
      }
    } else {
      // ── Normal login validation ──
      if (!username.trim()) {
        setError('Por favor ingresa tu nombre de usuario.');
        return;
      }
      if (!password) {
        setError('Por favor ingresa tu contraseña.');
        return;
      }

      setSubmitting(true);
      try {
        const result = await login(username.trim(), password);
        if (!result.success) {
          setError(result.error ?? 'Credenciales incorrectas.');
        }
      } catch {
        setError('Ocurrió un error inesperado. Inténtalo de nuevo.');
      } finally {
        setSubmitting(false);
      }
    }
  };

  const isBusy = submitting || isLoading;

  const isFormValid = isFirstRun
    ? displayName.trim() && username.trim() && password.length >= 4 && password === confirmPassword
    : username.trim() && password;

  return (
    <View style={styles.container}>
      {/* Background decorations */}
      <View style={styles.bgCircle1} />
      <View style={styles.bgCircle2} />

      {/* Settings Button */}
      <TouchableOpacity style={styles.settingsButton} onPress={openServerSettings}>
        <Ionicons name="server-outline" size={24} color={COLORS.textMuted} />
      </TouchableOpacity>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={{ opacity: fadeAnim }}>
            {/* Logo & Title */}
            <View style={styles.logoContainer}>
              <View style={styles.logoCircle}>
                <Ionicons name="shield-checkmark" size={64} color={COLORS.primary} />
              </View>
              <Text style={styles.title}>
                {isFirstRun ? 'Configuración Inicial' : 'GeoFace'}
              </Text>
              <Text style={styles.subtitle}>
                {isFirstRun
                  ? 'Crea la cuenta de Administrador para comenzar'
                  : 'Sistema de Asistencia Inteligente'}
              </Text>
            </View>

            {/* Error Banner */}
            {error && (
              <Animated.View
                style={[
                  styles.errorBanner,
                  {
                    opacity: errorAnim,
                    transform: [
                      {
                        translateY: errorAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [-8, 0],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Ionicons name="alert-circle" size={20} color={COLORS.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </Animated.View>
            )}

            {/* Form */}
            <View style={styles.formContainer}>
              {/* Display name — first-run only */}
              {isFirstRun && (
                <View
                  style={[
                    styles.inputWrapper,
                    focusedField === 'displayName' && styles.inputWrapperFocused,
                  ]}
                >
                  <View style={styles.inputIcon}>
                    <Ionicons name="text-outline" size={20} color={COLORS.textMuted} />
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="Nombre completo"
                    placeholderTextColor={COLORS.textMuted}
                    value={displayName}
                    onChangeText={(t) => { setDisplayName(t); clearError(); }}
                    onFocus={() => setFocusedField('displayName')}
                    onBlur={() => setFocusedField(null)}
                    autoCapitalize="words"
                    editable={!isBusy}
                  />
                </View>
              )}

              {/* Username */}
              <View
                style={[
                  styles.inputWrapper,
                  focusedField === 'username' && styles.inputWrapperFocused,
                ]}
              >
                <View style={styles.inputIcon}>
                  <Ionicons name="person-outline" size={20} color={COLORS.textMuted} />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Nombre de usuario"
                  placeholderTextColor={COLORS.textMuted}
                  value={username}
                  onChangeText={(t) => { setUsername(t); clearError(); }}
                  onFocus={() => setFocusedField('username')}
                  onBlur={() => setFocusedField(null)}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isBusy}
                />
              </View>

              {/* Password */}
              <View
                style={[
                  styles.inputWrapper,
                  focusedField === 'password' && styles.inputWrapperFocused,
                ]}
              >
                <View style={styles.inputIcon}>
                  <Ionicons name="lock-closed-outline" size={20} color={COLORS.textMuted} />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Contraseña"
                  placeholderTextColor={COLORS.textMuted}
                  value={password}
                  onChangeText={(t) => { setPassword(t); clearError(); }}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  secureTextEntry
                  editable={!isBusy}
                />
              </View>

              {/* Confirm password — first-run only */}
              {isFirstRun && (
                <View
                  style={[
                    styles.inputWrapper,
                    focusedField === 'confirmPassword' && styles.inputWrapperFocused,
                  ]}
                >
                  <View style={styles.inputIcon}>
                    <Ionicons name="lock-closed-outline" size={20} color={COLORS.textMuted} />
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="Confirmar contraseña"
                    placeholderTextColor={COLORS.textMuted}
                    value={confirmPassword}
                    onChangeText={(t) => { setConfirmPassword(t); clearError(); }}
                    onFocus={() => setFocusedField('confirmPassword')}
                    onBlur={() => setFocusedField(null)}
                    secureTextEntry
                    editable={!isBusy}
                  />
                </View>
              )}
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                (!isFormValid || isBusy) && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              activeOpacity={0.8}
              disabled={!isFormValid || isBusy}
            >
              {isBusy ? (
                <ActivityIndicator size="small" color={COLORS.text} />
              ) : (
                <Text style={styles.submitButtonText}>
                  {isFirstRun ? 'Crear Cuenta de Administrador' : 'Iniciar Sesión'}
                </Text>
              )}
            </TouchableOpacity>

            {/* Version */}
            <View style={styles.versionContainer}>
              <Text style={styles.versionText}>GeoFace v1.0.0</Text>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Server Settings Modal */}
      <Modal
        visible={serverModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeServerSettings}
      >
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Configuración del Servidor</Text>
            
            <View style={styles.modalInputWrapper}>
              <View style={styles.inputIcon}>
                <Ionicons name="globe-outline" size={20} color={COLORS.textMuted} />
              </View>
              <TextInput
                style={styles.modalInput}
                placeholder="Dirección IP del servidor"
                placeholderTextColor={COLORS.textMuted}
                value={serverIp}
                onChangeText={setServerIp}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="numbers-and-punctuation"
              />
            </View>

            <View style={styles.modalButtonContainer}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonSecondary]} 
                onPress={handleTestConnection}
                disabled={testingConnection}
              >
                {testingConnection ? (
                  <ActivityIndicator size="small" color={COLORS.text} />
                ) : (
                  <Text style={styles.modalButtonSecondaryText}>Probar Conexión</Text>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonPrimary]} 
                onPress={handleSaveServer}
                disabled={testingConnection || !serverIp.trim()}
              >
                <Text style={styles.modalButtonPrimaryText}>Guardar</Text>
              </TouchableOpacity>
            </View>
            
            {/* Close button at the top right of modal or we can add a Cancel button. Let's add a close icon */}
            <TouchableOpacity 
              style={{ position: 'absolute', top: 12, right: 12 }} 
              onPress={closeServerSettings}
            >
              <Ionicons name="close" size={24} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
