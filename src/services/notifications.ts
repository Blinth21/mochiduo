import {
  AndroidImportance,
  getPermissionsAsync,
  requestPermissionsAsync,
  scheduleNotificationAsync,
  setNotificationChannelAsync,
  setNotificationHandler,
} from 'expo-notifications';
import { Platform } from 'react-native';

import type { NotificationCategory, NotificationPrefs } from '@/types/couple';

const ANDROID_CHANNEL_ID = 'mochiduo-couple-alerts';
let configured = false;

export function setupNotificationHandler() {
  if (configured || Platform.OS === 'web') return;
  configured = true;

  setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function ensureNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  setupNotificationHandler();

  if (Platform.OS === 'android') {
    await setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: 'MochiDuo Couple Alerts',
      description: 'Notifikasi chat, pelukan, mood, lokasi, kenangan, dan kencan pasangan',
      importance: AndroidImportance?.MAX ?? 7,
      vibrationPattern: [0, 180, 100, 180],
      lightColor: '#FF6B8B',
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
    }).catch(() => {});
  }

  const existing = await getPermissionsAsync();
  if (existing.status === 'granted') return true;

  const requested = await requestPermissionsAsync();
  return requested.status === 'granted';
}

export function isCategoryEnabled(
  prefs: NotificationPrefs,
  category: NotificationCategory
): boolean {
  if (!prefs.enabled) return false;
  switch (category) {
    case 'chat':
      return prefs.chat;
    case 'hug':
    case 'mood':
      return prefs.hugAndMood;
    case 'notes':
      return prefs.notes;
    case 'memories':
      return prefs.memories;
    case 'dates':
      return prefs.dates;
    case 'location':
      return prefs.location;
    case 'anniversary':
      return prefs.anniversary;
    default:
      return true;
  }
}

export async function fireSystemNotification(params: {
  title: string;
  body: string;
  route?: string;
}): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const perm = await getPermissionsAsync();
    if (perm.status !== 'granted') return;

    await scheduleNotificationAsync({
      content: {
        title: params.title,
        body: params.body,
        sound: 'default',
        data: { route: params.route ?? '/' },
      },
      trigger: null,
    });
  } catch {
    // Ignore notification errors in unsupported environments
  }
}
