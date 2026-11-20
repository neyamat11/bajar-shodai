import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { api } from '@/api/client';
import { storage } from '@/utils/storage';
import { setupAndroidNotificationChannels } from '@/constants/notificationChannels';
import { useAuthStore } from '@/store/useAuthStore';

const PUSH_TOKEN_KEY = 'bazar_push_token';

// Configure foreground presentation behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    priority: Notifications.AndroidNotificationPriority.HIGH,
  }),
});

export async function syncPushTokenWithBackend(explicitToken?: string): Promise<void> {
  const token = explicitToken || getCachedPushToken();
  if (!token) return;

  // 1. Register with customer notification endpoint
  try {
    await api.post('/customer/notifications/token', {
      token,
      platform: Platform.OS,
    });
  } catch {
    // Fallback silently if offline
  }

  // 2. If user is staff/admin/superadmin, register token to staff push endpoint
  try {
    const userRole = useAuthStore.getState().user?.role?.toUpperCase();
    if (userRole === 'STAFF' || userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') {
      await api.post('/staff/push-token', {
        pushToken: token,
        platform: Platform.OS,
      });
    }
  } catch {
    // Fallback silently
  }
}

export async function unregisterStaffPushTokenAsync(): Promise<void> {
  const token = getCachedPushToken();
  if (!token) return;
  try {
    await api.delete('/staff/push-token', {
      data: { pushToken: token },
    });
  } catch {
    // Silent fallback
  }
}

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  // Setup Android channels first
  if (Platform.OS === 'android') {
    await setupAndroidNotificationChannels();
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData.data;

    if (token) {
      storage.setString(PUSH_TOKEN_KEY, token);
      await syncPushTokenWithBackend(token);
    }

    return token;
  } catch (error) {
    // Emulator or missing Google Play Services
    console.warn('[Notifications] Failed to obtain push token:', error);
    return null;
  }
}

export function getCachedPushToken(): string | undefined {
  return storage.getString(PUSH_TOKEN_KEY);
}
