import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';
import { useEffect } from 'react';
import { AppProvider, useApp } from '../src/context/AppContext';
import { AuthProvider, useAuth } from '../src/context/AuthContext';

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, currentUser } = useAuth();
  const { profiles, isLoading: isAppLoading } = useApp();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading || isAppLoading) return;

    const inLoginScreen = segments[0] === 'login';
    const inEnrollScreen = segments[0] === 'enroll';

    if (!isAuthenticated && !inLoginScreen) {
      // No autenticado y no está en login → redirigir a login
      router.replace('/login');
    } else if (isAuthenticated) {
      const profile = profiles.find((p) => p.id === currentUser?.id);
      const hasValidFaceDescriptor = profile && profile.faceDescriptor !== null;

      if (!hasValidFaceDescriptor) {
        if (!inEnrollScreen) {
          // Autenticado pero sin rostro válido, redirigir a enroll
          router.replace('/enroll');
        }
      } else {
        if (inLoginScreen || inEnrollScreen) {
          // Autenticado y con rostro válido, redirigir a tabs
          router.replace('/(tabs)');
        }
      }
    }
  }, [isAuthenticated, isLoading, isAppLoading, segments, currentUser, profiles]);

  return <>{children}</>;
}

import { requestNotificationPermissions } from '../src/services/notifications';

export default function RootLayout() {
  useEffect(() => {
    requestNotificationPermissions().catch(console.error);
  }, []);

  return (
    <AuthProvider>
      <AppProvider>
        <View style={styles.container}>
          <StatusBar style="light" />
          <AuthGate>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: '#0A0A1A' },
                animation: 'slide_from_right',
              }}
            >
              <Stack.Screen name="login" options={{ animation: 'fade' }} />
              <Stack.Screen name="(tabs)" />
            </Stack>
          </AuthGate>
        </View>
      </AppProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A1A',
  },
});
