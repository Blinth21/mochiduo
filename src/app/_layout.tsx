import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { useFonts } from 'expo-font';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { Tabs, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef } from 'react';
import { AppState, Platform, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { NotificationToast } from '@/components/NotificationToast';
import { PlayfulTabBar } from '@/components/PlayfulTabBar';
import { Pastel } from '@/constants/pastelTheme';
import { joinOrCreateRoom, subscribeToRoom } from '@/services/coupleSync';
import {
  ensureNotificationPermissions,
  setupNotificationHandler,
} from '@/services/notifications';
import { useCoupleStore } from '@/store/useCoupleStore';
import { getNextAnniversaryInfo } from '@/utils/dateCalc';
import { getDistanceMeters } from '@/utils/geoCalc';

SplashScreen.preventAutoHideAsync().catch(() => {});
setupNotificationHandler();

function LiveSyncBridge() {
  const syncConfig = useCoupleStore((s) => s.syncConfig);
  const activePartnerId = useCoupleStore((s) => s.activePartnerId);
  const setSyncStatus = useCoupleStore((s) => s.setSyncStatus);
  const applyRemoteRoom = useCoupleStore((s) => s.applyRemoteRoom);
  const applyRemoteLiveLocation = useCoupleStore((s) => s.applyRemoteLiveLocation);
  const applyRemoteMemoryUpsert = useCoupleStore((s) => s.applyRemoteMemoryUpsert);
  const applyRemoteMemoryDelete = useCoupleStore((s) => s.applyRemoteMemoryDelete);
  const applyRemoteBucketUpsert = useCoupleStore((s) => s.applyRemoteBucketUpsert);
  const applyRemoteBucketDelete = useCoupleStore((s) => s.applyRemoteBucketDelete);
  const applyRemoteNoteUpsert = useCoupleStore((s) => s.applyRemoteNoteUpsert);
  const applyRemoteNoteDelete = useCoupleStore((s) => s.applyRemoteNoteDelete);
  const applyRemoteMessageUpsert = useCoupleStore((s) => s.applyRemoteMessageUpsert);
  const applyRemoteMessageDelete = useCoupleStore((s) => s.applyRemoteMessageDelete);
  const setPartnerTyping = useCoupleStore((s) => s.setPartnerTyping);
  const setOnlinePartners = useCoupleStore((s) => s.setOnlinePartners);

  useEffect(() => {
    if (!syncConfig.enabled || !syncConfig.supabaseUrl || !syncConfig.supabaseAnonKey || !syncConfig.roomCode) {
      return;
    }

    let active = true;
    setSyncStatus('connecting');

    const snap = useCoupleStore.getState();
    void joinOrCreateRoom(syncConfig, {
      coupleTitle: snap.coupleTitle,
      anniversaryDate: snap.anniversaryDate,
      hugCount: snap.hugCount,
      lastHugFrom: snap.lastHugFrom,
      lastHugAt: snap.lastHugAt,
      partners: snap.partners,
      locations: snap.locations,
      memories: snap.memories,
      bucketList: snap.bucketList,
      loveNotes: snap.loveNotes,
      chatMessages: snap.chatMessages,
    }).then((res) => {
      if (!active) return;
      if (res.data) {
        useCoupleStore.setState({
          coupleTitle: res.data.coupleTitle,
          anniversaryDate: res.data.anniversaryDate,
          hugCount: res.data.hugCount,
          lastHugFrom: res.data.lastHugFrom,
          lastHugAt: res.data.lastHugAt,
          partners: res.data.partners,
          locations: res.data.locations,
          memories: res.data.memories,
          bucketList: res.data.bucketList,
          loveNotes: res.data.loveNotes,
          chatMessages: res.data.chatMessages,
        });
      }
    });

    const unsubscribe = subscribeToRoom(syncConfig, {
      activePartnerId,
      onRoomUpdate: applyRemoteRoom,
      onLiveLocationBroadcast: applyRemoteLiveLocation,
      onMemoryUpsert: applyRemoteMemoryUpsert,
      onMemoryDelete: applyRemoteMemoryDelete,
      onBucketUpsert: applyRemoteBucketUpsert,
      onBucketDelete: applyRemoteBucketDelete,
      onNoteUpsert: applyRemoteNoteUpsert,
      onNoteDelete: applyRemoteNoteDelete,
      onMessageUpsert: applyRemoteMessageUpsert,
      onMessageDelete: applyRemoteMessageDelete,
      onTypingChange: setPartnerTyping,
      onPresenceChange: setOnlinePartners,
      onStatusChange: (status, err) => {
        if (!active) return;
        setSyncStatus(status, err ?? null);
      },
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [
    activePartnerId,
    applyRemoteBucketDelete,
    applyRemoteBucketUpsert,
    applyRemoteLiveLocation,
    applyRemoteMemoryDelete,
    applyRemoteMemoryUpsert,
    applyRemoteMessageDelete,
    applyRemoteMessageUpsert,
    applyRemoteNoteDelete,
    applyRemoteNoteUpsert,
    applyRemoteRoom,
    setOnlinePartners,
    setPartnerTyping,
    setSyncStatus,
    syncConfig,
  ]);

  return null;
}

/**
 * Global real-time GPS watcher that stays active across ALL tabs
 * (not only when viewing Lokasi) whenever liveWatchEnabled & isSharing are true.
 */
function LiveLocationWatcher() {
  const activePartnerId = useCoupleStore((s) => s.activePartnerId);
  const liveWatchEnabled = useCoupleStore((s) => s.liveWatchEnabled);
  const isSharing = useCoupleStore((s) => s.locations[s.activePartnerId].isSharing);
  const updatePartnerLocation = useCoupleStore((s) => s.updatePartnerLocation);

  const lastGeocodeRef = useRef<{ lat: number; lon: number; area: string; at: number } | null>(null);
  const lastDbPushAtRef = useRef<number>(0);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    let cancelled = false;
    let sub: Location.LocationSubscription | null = null;

    async function startGlobalWatch() {
      if (!liveWatchEnabled || !isSharing) return;

      let perm = await Location.getForegroundPermissionsAsync();
      if (perm.status !== 'granted' && perm.canAskAgain) {
        await new Promise((r) => setTimeout(r, 1200));
        if (cancelled) return;
        perm = await Location.requestForegroundPermissionsAsync();
      }
      if (perm.status !== 'granted' || cancelled) return;

      sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 10,
          timeInterval: 5000,
        },
        async (pos) => {
          if (cancelled) return;
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          const nowMs = Date.now();

          const lastGeo = lastGeocodeRef.current;
          const movedSinceGeo = lastGeo
            ? getDistanceMeters(lastGeo.lat, lastGeo.lon, lat, lon)
            : Infinity;

          let areaName = lastGeo?.area ?? `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
          if (!lastGeo || movedSinceGeo >= 120 || nowMs - lastGeo.at >= 30000) {
            try {
              const places = await Location.reverseGeocodeAsync({
                latitude: lat,
                longitude: lon,
              });
              const first = places[0];
              if (first) {
                const parts = [
                  first.district || first.street || first.name,
                  first.city || first.subregion,
                ].filter(Boolean);
                if (parts.length > 0) areaName = parts.join(', ');
              }
            } catch {
              // Keep previous or coordinate fallback
            }
            lastGeocodeRef.current = { lat, lon, area: areaName, at: nowMs };
          }

          const currentLoc = useCoupleStore.getState().locations[activePartnerId];
          const movedFromStored = getDistanceMeters(
            currentLoc.latitude,
            currentLoc.longitude,
            lat,
            lon
          );
          if (movedFromStored < 4 && currentLoc.areaName === areaName && nowMs - currentLoc.updatedAt < 25000) {
            return;
          }

          const shouldSkipDbPush = nowMs - lastDbPushAtRef.current < 4000;
          if (!shouldSkipDbPush) {
            lastDbPushAtRef.current = nowMs;
          }

          updatePartnerLocation(
            activePartnerId,
            {
              latitude: lat,
              longitude: lon,
              areaName,
              accuracyMeters: pos.coords.accuracy ?? undefined,
            },
            { skipDbPush: shouldSkipDbPush }
          );
        }
      );

      if (cancelled) {
        sub.remove();
      }
    }

    startGlobalWatch().catch(() => {});

    const appSub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && !sub && liveWatchEnabled && isSharing) {
        startGlobalWatch().catch(() => {});
      }
    });

    return () => {
      cancelled = true;
      appSub.remove();
      sub?.remove();
      sub = null;
    };
  }, [activePartnerId, isSharing, liveWatchEnabled, updatePartnerLocation]);

  return null;
}

function NotificationBridge() {
  const router = useRouter();
  const anniversaryDate = useCoupleStore((s) => s.anniversaryDate);
  const coupleTitle = useCoupleStore((s) => s.coupleTitle);
  const lastAnnivNotifiedKey = useCoupleStore((s) => s.lastAnnivNotifiedKey);
  const setLastAnnivNotifiedKey = useCoupleStore((s) => s.setLastAnnivNotifiedKey);
  const pushFeatureNotification = useCoupleStore((s) => s.pushFeatureNotification);

  useEffect(() => {
    void ensureNotificationPermissions();

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const route = response.notification.request.content.data?.route;
      if (typeof route === 'string' && route.startsWith('/')) {
        router.push(route as any);
      }
    });

    return () => sub.remove();
  }, [router]);

  useEffect(() => {
    const todayKey = new Date().toISOString().slice(0, 10);
    if (lastAnnivNotifiedKey === todayKey) return;

    const info = getNextAnniversaryInfo(anniversaryDate, Date.now());
    if (info.isTodayAnniversary) {
      setLastAnnivNotifiedKey(todayKey);
      pushFeatureNotification({
        category: 'anniversary',
        emoji: '🎉',
        title: `Happy ${info.annivNumber}th Anniversary, ${coupleTitle}!`,
        body: 'Hari spesial kalian tiba! Yuk kirim peluk & abadikan momen hari ini 💕',
        route: '/',
      });
    } else if (info.daysLeft > 0 && info.daysLeft <= 3) {
      setLastAnnivNotifiedKey(todayKey);
      pushFeatureNotification({
        category: 'anniversary',
        emoji: '💖',
        title: `${info.daysLeft} Hari Menuju Anniv ke-${info.annivNumber}!`,
        body: `Tanggal ${info.nextDateFormatted} sebentar lagi. Siapkan rencana kencan di tab Kencan!`,
        route: '/dates',
      });
    } else if (info.daysToMilestone > 0 && info.daysToMilestone <= 3) {
      setLastAnnivNotifiedKey(todayKey);
      pushFeatureNotification({
        category: 'anniversary',
        emoji: '🎯',
        title: `Hampir ${info.nextMilestoneDays} Hari Bersama!`,
        body: `Tinggal ${info.daysToMilestone} hari lagi menuju milestone ke-${info.nextMilestoneDays} hari kalian!`,
        route: '/',
      });
    }
  }, [
    anniversaryDate,
    coupleTitle,
    lastAnnivNotifiedKey,
    pushFeatureNotification,
    setLastAnnivNotifiedKey,
  ]);

  return null;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });
  const [fontFallbackReady, setFontFallbackReady] = React.useState(false);

  const isReady = fontsLoaded || Boolean(fontError) || fontFallbackReady;

  useEffect(() => {
    if (isReady) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isReady]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFontFallbackReady(true);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  // Wait until Plus Jakarta Sans is registered so Android Yoga never measures
  // text widths with fallback Roboto and clips the last characters.
  if (!isReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <LiveSyncBridge />
        <LiveLocationWatcher />
        <NotificationBridge />
        <NotificationToast />
        <Tabs
          tabBar={(props) => <PlayfulTabBar {...props} />}
          screenOptions={{
            headerShown: false,
            sceneStyle: { backgroundColor: Pastel.bg },
            lazy: true,
            freezeOnBlur: true,
          }}>
          <Tabs.Screen name="index" options={{ title: 'Beranda' }} />
          <Tabs.Screen name="chat" options={{ title: 'Chat' }} />
          <Tabs.Screen name="memories" options={{ title: 'Kenangan' }} />
          <Tabs.Screen name="lokasi" options={{ title: 'Lokasi' }} />
          <Tabs.Screen name="dates" options={{ title: 'Kencan' }} />
          <Tabs.Screen name="notes" options={{ title: 'Catatan' }} />
        </Tabs>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Pastel.bg,
  },
});
