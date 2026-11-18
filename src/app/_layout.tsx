import { Tabs } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { PlayfulTabBar } from '@/components/PlayfulTabBar';
import { Pastel } from '@/constants/pastelTheme';
import { joinOrCreateRoom, subscribeToRoom } from '@/services/coupleSync';
import { useCoupleStore } from '@/store/useCoupleStore';

SplashScreen.preventAutoHideAsync().catch(() => {});

function LiveSyncBridge() {
  const syncConfig = useCoupleStore((s) => s.syncConfig);
  const setSyncStatus = useCoupleStore((s) => s.setSyncStatus);
  const applyRemoteRoom = useCoupleStore((s) => s.applyRemoteRoom);
  const applyRemoteMemoryUpsert = useCoupleStore((s) => s.applyRemoteMemoryUpsert);
  const applyRemoteMemoryDelete = useCoupleStore((s) => s.applyRemoteMemoryDelete);
  const applyRemoteBucketUpsert = useCoupleStore((s) => s.applyRemoteBucketUpsert);
  const applyRemoteBucketDelete = useCoupleStore((s) => s.applyRemoteBucketDelete);
  const applyRemoteNoteUpsert = useCoupleStore((s) => s.applyRemoteNoteUpsert);
  const applyRemoteNoteDelete = useCoupleStore((s) => s.applyRemoteNoteDelete);

  useEffect(() => {
    if (!syncConfig.enabled || !syncConfig.supabaseUrl || !syncConfig.supabaseAnonKey || !syncConfig.roomCode) {
      return;
    }

    let active = true;
    setSyncStatus('connecting');

    // Hydrate latest snapshot on startup/reconnect
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
        });
      }
    });

    const unsubscribe = subscribeToRoom(syncConfig, {
      onRoomUpdate: applyRemoteRoom,
      onMemoryUpsert: applyRemoteMemoryUpsert,
      onMemoryDelete: applyRemoteMemoryDelete,
      onBucketUpsert: applyRemoteBucketUpsert,
      onBucketDelete: applyRemoteBucketDelete,
      onNoteUpsert: applyRemoteNoteUpsert,
      onNoteDelete: applyRemoteNoteDelete,
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
    applyRemoteBucketDelete,
    applyRemoteBucketUpsert,
    applyRemoteMemoryDelete,
    applyRemoteMemoryUpsert,
    applyRemoteNoteDelete,
    applyRemoteNoteUpsert,
    applyRemoteRoom,
    setSyncStatus,
    syncConfig,
  ]);

  return null;
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <LiveSyncBridge />
        <Tabs
          tabBar={(props) => <PlayfulTabBar {...props} />}
          screenOptions={{
            headerShown: false,
            sceneStyle: { backgroundColor: Pastel.bg },
            lazy: true,
          }}>
          <Tabs.Screen name="index" options={{ title: 'Beranda' }} />
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
