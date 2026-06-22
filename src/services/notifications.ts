import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configurar cómo se comportarán las notificaciones cuando la app esté abierta (en primer plano)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Solicita los permisos necesarios para enviar notificaciones al usuario.
 * @returns boolean indicando si se obtuvieron los permisos.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return false; // Web no lo soporta de la misma manera de forma nativa en expo-notifications
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Permisos de notificación no concedidos.');
    return false;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Alertas de Asistencia',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#8a2be2',
    });
  }

  return true;
}

/**
 * Envía una notificación local inmediata.
 * @param title Título de la notificación
 * @param body Cuerpo de la notificación
 */
export async function sendLocalNotification(title: string, body: string) {
  if (Platform.OS === 'web') return; // En web ignoramos esto
  
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
    },
    trigger: null, // trigger: null dispara la notificación inmediatamente
  });
}
