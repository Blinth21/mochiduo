import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

import { MOOD_OPTIONS } from '@/constants/pastelTheme';
import {
  joinOrCreateRoom,
  pushBucketDelete,
  pushBucketUpsert,
  pushMemoryDelete,
  pushMemoryUpsert,
  pushNoteDelete,
  pushNoteUpsert,
  pushRoomFields,
} from '@/services/coupleSync';
import type {
  BucketCategory,
  BucketItem,
  DateIdea,
  LocationSnapshot,
  LoveNote,
  MemoryItem,
  MoodId,
  NoteColorId,
  PartnerId,
  PartnerProfile,
  SyncConfig,
  SyncStatus,
} from '@/types/couple';

export const CURATED_DATE_IDEAS: DateIdea[] = [
  {
    id: 'idea-1',
    title: 'Piknik Sore di Taman + Camilan Favorit',
    vibe: 'Santai & Romantis',
    category: 'hangout',
    emoji: '🧺',
  },
  {
    id: 'idea-2',
    title: 'Masak Pasta / Ramen Bareng di Rumah',
    vibe: 'Cozy & Seru',
    category: 'cozy',
    emoji: '🍝',
  },
  {
    id: 'idea-3',
    title: 'Hunting Jajanan Pasar / Street Food Malam',
    vibe: 'Kuliner Hemat',
    category: 'food',
    emoji: '🍢',
  },
  {
    id: 'idea-4',
    title: 'Photobox Lucu + Tukar Kado Rp25rb',
    vibe: 'Playful',
    category: 'hangout',
    emoji: '📸',
  },
  {
    id: 'idea-5',
    title: 'Movie Marathon Studio Ghibli + Selimut',
    vibe: 'Super Cozy',
    category: 'cozy',
    emoji: '🎬',
  },
  {
    id: 'idea-6',
    title: 'Motoran Pagi Cari Bubur Ayam & Kopi Susu',
    vibe: 'Morning Date',
    category: 'food',
    emoji: '🛵',
  },
  {
    id: 'idea-7',
    title: 'Melukis Kanvas Mini / Clay Date Berdua',
    vibe: 'Kreatif',
    category: 'cozy',
    emoji: '🎨',
  },
  {
    id: 'idea-8',
    title: 'Ke Museum atau Aquarium Date',
    vibe: 'Aesthetic',
    category: 'hangout',
    emoji: '🐠',
  },
  {
    id: 'idea-9',
    title: 'Coba Kafe Matcha Baru + Main Kartu Deep Talk',
    vibe: 'Quality Time',
    category: 'food',
    emoji: '🍵',
  },
  {
    id: 'idea-10',
    title: 'Staycation / Road Trip Weekend ke Puncak',
    vibe: 'Mini Escape',
    category: 'milestone',
    emoji: '⛰️',
  },
];

const safeStorage: StateStorage = {
  getItem: async (name) => {
    if (Platform.OS === 'web' && typeof window === 'undefined') return null;
    return AsyncStorage.getItem(name);
  },
  setItem: async (name, value) => {
    if (Platform.OS === 'web' && typeof window === 'undefined') return;
    await AsyncStorage.setItem(name, value);
  },
  removeItem: async (name) => {
    if (Platform.OS === 'web' && typeof window === 'undefined') return;
    await AsyncStorage.removeItem(name);
  },
};

interface CoupleState {
  activePartnerId: PartnerId;
  anniversaryDate: string; // YYYY-MM-DD
  coupleTitle: string;
  hugCount: number;
  lastHugFrom: PartnerId | null;
  lastHugAt: number | null;
  partners: Record<PartnerId, PartnerProfile>;
  locations: Record<PartnerId, LocationSnapshot>;
  liveWatchEnabled: boolean;
  memories: MemoryItem[];
  bucketList: BucketItem[];
  loveNotes: LoveNote[];

  // Live 2-device sync state
  syncConfig: SyncConfig;
  syncStatus: SyncStatus;
  syncError: string | null;

  // Actions
  setActivePartner: (id: PartnerId) => void;
  updateCoupleSettings: (payload: {
    coupleTitle: string;
    anniversaryDate: string;
    p1Name: string;
    p1Nickname: string;
    p2Name: string;
    p2Nickname: string;
  }) => void;
  updateMood: (partnerId: PartnerId, mood: MoodId, customStatus?: string) => void;
  updateStatusText: (partnerId: PartnerId, statusText: string) => void;
  sendHug: (fromId: PartnerId) => void;

  updatePartnerLocation: (
    partnerId: PartnerId,
    payload: {
      latitude: number;
      longitude: number;
      areaName: string;
      accuracyMeters?: number;
    }
  ) => void;
  checkInSpot: (partnerId: PartnerId, spotTag: string) => void;
  toggleLocationSharing: (partnerId: PartnerId) => void;
  setLiveWatchEnabled: (enabled: boolean) => void;

  addMemory: (input: Omit<MemoryItem, 'id' | 'createdAt' | 'isFavorite'>) => void;
  toggleMemoryFavorite: (id: string) => void;
  deleteMemory: (id: string) => void;

  addBucketItem: (input: {
    title: string;
    category: BucketCategory;
    targetDate?: string;
    createdBy: PartnerId;
  }) => void;
  toggleBucketDone: (id: string) => void;
  deleteBucketItem: (id: string) => void;

  addLoveNote: (input: {
    authorId: PartnerId;
    message: string;
    sticker: string;
    colorId: NoteColorId;
    pinned?: boolean;
  }) => void;
  togglePinNote: (id: string) => void;
  reactToNote: (id: string, emoji: string) => void;
  deleteLoveNote: (id: string) => void;

  // Sync actions
  connectLiveSync: (
    config: Omit<SyncConfig, 'enabled'>,
    role: PartnerId
  ) => Promise<{ ok: boolean; created?: boolean; error?: string }>;
  disconnectLiveSync: () => void;
  setSyncStatus: (status: SyncStatus, error?: string | null) => void;
  applyRemoteRoom: (row: any) => void;
  applyRemoteMemoryUpsert: (item: MemoryItem) => void;
  applyRemoteMemoryDelete: (id: string) => void;
  applyRemoteBucketUpsert: (item: BucketItem) => void;
  applyRemoteBucketDelete: (id: string) => void;
  applyRemoteNoteUpsert: (item: LoveNote) => void;
  applyRemoteNoteDelete: (id: string) => void;
}

const now = Date.now();

export const useCoupleStore = create<CoupleState>()(
  persist(
    (set, get) => ({
      activePartnerId: 'p1',
      anniversaryDate: '2024-02-14',
      coupleTitle: 'Mochi & Boba',
      hugCount: 128,
      lastHugFrom: 'p2',
      lastHugAt: now - 1000 * 60 * 18,
      liveWatchEnabled: false,

      syncConfig: {
        supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
        supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
        roomCode: 'MOCHI-2026',
        enabled: false,
      },
      syncStatus: 'offline',
      syncError: null,

      partners: {
        p1: {
          id: 'p1',
          name: 'Raka',
          nickname: 'Mochi',
          mochiColor: '#FFE8F0',
          auraColor: '#FF6B8B',
          mood: 'in_love',
          statusText: 'Lagi kangen pengen makan es krim bareng 🍦',
          updatedAt: now - 1000 * 60 * 12,
        },
        p2: {
          id: 'p2',
          name: 'Naya',
          nickname: 'Boba',
          mochiColor: '#EFEAFF',
          auraColor: '#8B74FF',
          mood: 'happy',
          statusText: 'Baru beres kerja, siap peluk kamu! 🫂',
          updatedAt: now - 1000 * 60 * 25,
        },
      },

      locations: {
        p1: {
          latitude: -6.2442,
          longitude: 106.8006,
          areaName: 'Blok M, Jakarta Selatan',
          spotTag: 'Ngopi ☕',
          isSharing: true,
          accuracyMeters: 18,
          updatedAt: now - 1000 * 60 * 8,
        },
        p2: {
          latitude: -6.2297,
          longitude: 106.8165,
          areaName: 'Senopati, Jakarta Selatan',
          spotTag: 'Kampus/Kantor 💼',
          isSharing: true,
          accuracyMeters: 24,
          updatedAt: now - 1000 * 60 * 14,
        },
      },

      memories: [
        {
          id: 'mem-1',
          title: 'First Date Makan Ramen Hujan-Hujan',
          story:
            'Inget banget waktu kita kehujanan nyari tempat makan, terus akhirnya ketawa-ketawa sambil makan ramen panas dan rebutan gyoza terakhir!',
          date: '2024-02-14',
          location: 'Blok M, Jakarta',
          tag: 'food',
          sticker: '🍜',
          cardBg: '#FFF4DC',
          isFavorite: true,
          createdAt: now - 1000 * 60 * 60 * 24 * 60,
        },
        {
          id: 'mem-2',
          title: 'Photobox Berdua Pertama Kali',
          story:
            'Panik gaya gara-gara timer cepet banget, hasilnya malah pose kocak semua tapi jadi foto favorit di dompet!',
          date: '2024-05-20',
          location: 'M Bloc Space',
          tag: 'date',
          sticker: '📸',
          cardBg: '#FFE8EE',
          isFavorite: true,
          createdAt: now - 1000 * 60 * 60 * 24 * 40,
        },
        {
          id: 'mem-3',
          title: 'Road Trip Subuh ke Bandung',
          story:
            'Berangkat jam 5 pagi cuma buat nyobain kopi susu sama pisang keju hangat. Playlist sepanjang jalan nyanyi terus!',
          date: '2024-09-08',
          location: 'Dago Atas, Bandung',
          tag: 'trip',
          sticker: '🛵',
          cardBg: '#E5F4FF',
          isFavorite: false,
          createdAt: now - 1000 * 60 * 60 * 24 * 15,
        },
        {
          id: 'mem-4',
          title: 'Momen Random Beli Boneka Bebek',
          story:
            'Niatnya cuma beli air mineral, pulangnya malah bawa boneka bebek gemoy buat nemenin tidur.',
          date: '2025-01-11',
          location: 'Pasar Santa',
          tag: 'random',
          sticker: '🐥',
          cardBg: '#EFEAFF',
          isFavorite: false,
          createdAt: now - 1000 * 60 * 60 * 24 * 5,
        },
      ],

      bucketList: [
        {
          id: 'buck-1',
          title: 'Piknik sore sambil bawa kamera analog',
          category: 'hangout',
          targetDate: 'Akhir Pekan Ini',
          done: false,
          createdBy: 'p1',
        },
        {
          id: 'buck-2',
          title: 'Masak tteokbokki & kimbap bareng',
          category: 'cozy',
          targetDate: 'Minggu Depan',
          done: false,
          createdBy: 'p2',
        },
        {
          id: 'buck-3',
          title: 'Nonton konser band favorit berdua',
          category: 'milestone',
          targetDate: 'Tahun Ini',
          done: false,
          createdBy: 'p1',
        },
        {
          id: 'buck-4',
          title: 'Cobain semua rasa gelato di toko sebelah',
          category: 'food',
          done: true,
          doneAt: now - 1000 * 60 * 60 * 24 * 10,
          createdBy: 'p2',
        },
        {
          id: 'buck-5',
          title: 'Bikin scrapbook mini perjalanan 1 tahun',
          category: 'cozy',
          done: true,
          doneAt: now - 1000 * 60 * 60 * 24 * 25,
          createdBy: 'p1',
        },
      ],

      loveNotes: [
        {
          id: 'note-1',
          authorId: 'p2',
          message:
            'Makasih ya udah selalu sabar dengerin ceritaku tiap malam. Jangan lupa minum air putih hari ini, Mochi! 💕',
          sticker: '🍓',
          colorId: 'pink',
          pinned: true,
          reaction: '🥰',
          createdAt: now - 1000 * 60 * 45,
        },
        {
          id: 'note-2',
          authorId: 'p1',
          message:
            'Nanti pulang kerja aku jemput ya! Aku udah siapin matcha latte kesukaanmu di tas 🍵✨',
          sticker: '🍵',
          colorId: 'mint',
          pinned: false,
          reaction: '🫂',
          createdAt: now - 1000 * 60 * 60 * 4,
        },
        {
          id: 'note-3',
          authorId: 'p2',
          message:
            'Semangat ngerjain tugasnya hari ini! Kalau capek, buka app ini terus pencet tombol peluk ya 🥺',
          sticker: '🌟',
          colorId: 'lemon',
          pinned: false,
          reaction: '❤️',
          createdAt: now - 1000 * 60 * 60 * 20,
        },
      ],

      setActivePartner: (id) => set({ activePartnerId: id }),

      updateCoupleSettings: (payload) => {
        set((state) => {
          const nextP1: PartnerProfile = {
            ...state.partners.p1,
            name: payload.p1Name.trim() || state.partners.p1.name,
            nickname: payload.p1Nickname.trim() || state.partners.p1.nickname,
          };
          const nextP2: PartnerProfile = {
            ...state.partners.p2,
            name: payload.p2Name.trim() || state.partners.p2.name,
            nickname: payload.p2Nickname.trim() || state.partners.p2.nickname,
          };
          const nextTitle = payload.coupleTitle.trim() || state.coupleTitle;
          const nextDate = payload.anniversaryDate.trim() || state.anniversaryDate;

          void pushRoomFields(state.syncConfig, {
            couple_title: nextTitle,
            anniversary_date: nextDate,
            p1_profile: nextP1,
            p2_profile: nextP2,
          });

          return {
            coupleTitle: nextTitle,
            anniversaryDate: nextDate,
            partners: { p1: nextP1, p2: nextP2 },
          };
        });
      },

      updateMood: (partnerId, mood, customStatus) =>
        set((state) => {
          const moodObj = MOOD_OPTIONS.find((m) => m.id === mood);
          const nextStatus =
            customStatus !== undefined
              ? customStatus
              : moodObj?.defaultStatus ?? state.partners[partnerId].statusText;
          const nextProfile: PartnerProfile = {
            ...state.partners[partnerId],
            mood,
            statusText: nextStatus,
            updatedAt: Date.now(),
          };
          const col = partnerId === 'p1' ? 'p1_profile' : 'p2_profile';
          void pushRoomFields(state.syncConfig, { [col]: nextProfile });

          return {
            partners: {
              ...state.partners,
              [partnerId]: nextProfile,
            },
          };
        }),

      updateStatusText: (partnerId, statusText) =>
        set((state) => {
          const nextProfile: PartnerProfile = {
            ...state.partners[partnerId],
            statusText,
            updatedAt: Date.now(),
          };
          const col = partnerId === 'p1' ? 'p1_profile' : 'p2_profile';
          void pushRoomFields(state.syncConfig, { [col]: nextProfile });

          return {
            partners: {
              ...state.partners,
              [partnerId]: nextProfile,
            },
          };
        }),

      sendHug: (fromId) =>
        set((state) => {
          const nextCount = state.hugCount + 1;
          const nextAt = Date.now();
          void pushRoomFields(state.syncConfig, {
            hug_count: nextCount,
            last_hug_from: fromId,
            last_hug_at: nextAt,
          });
          return {
            hugCount: nextCount,
            lastHugFrom: fromId,
            lastHugAt: nextAt,
          };
        }),

      updatePartnerLocation: (partnerId, payload) =>
        set((state) => {
          const nextLoc: LocationSnapshot = {
            ...state.locations[partnerId],
            latitude: payload.latitude,
            longitude: payload.longitude,
            areaName: payload.areaName,
            accuracyMeters: payload.accuracyMeters,
            isSharing: true,
            updatedAt: Date.now(),
          };
          const col = partnerId === 'p1' ? 'p1_location' : 'p2_location';
          void pushRoomFields(state.syncConfig, { [col]: nextLoc });

          return {
            locations: {
              ...state.locations,
              [partnerId]: nextLoc,
            },
          };
        }),

      checkInSpot: (partnerId, spotTag) =>
        set((state) => {
          const nextLoc: LocationSnapshot = {
            ...state.locations[partnerId],
            spotTag,
            updatedAt: Date.now(),
          };
          const col = partnerId === 'p1' ? 'p1_location' : 'p2_location';
          void pushRoomFields(state.syncConfig, { [col]: nextLoc });

          return {
            locations: {
              ...state.locations,
              [partnerId]: nextLoc,
            },
          };
        }),

      toggleLocationSharing: (partnerId) =>
        set((state) => {
          const nextLoc: LocationSnapshot = {
            ...state.locations[partnerId],
            isSharing: !state.locations[partnerId].isSharing,
            updatedAt: Date.now(),
          };
          const col = partnerId === 'p1' ? 'p1_location' : 'p2_location';
          void pushRoomFields(state.syncConfig, { [col]: nextLoc });

          return {
            locations: {
              ...state.locations,
              [partnerId]: nextLoc,
            },
          };
        }),

      setLiveWatchEnabled: (enabled) => set({ liveWatchEnabled: enabled }),

      addMemory: (input) =>
        set((state) => {
          const created: MemoryItem = {
            ...input,
            id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            isFavorite: false,
            createdAt: Date.now(),
          };
          void pushMemoryUpsert(state.syncConfig, created);
          return {
            memories: [created, ...state.memories],
          };
        }),

      toggleMemoryFavorite: (id) =>
        set((state) => {
          const updatedList = state.memories.map((m) =>
            m.id === id ? { ...m, isFavorite: !m.isFavorite } : m
          );
          const target = updatedList.find((m) => m.id === id);
          if (target) void pushMemoryUpsert(state.syncConfig, target);
          return { memories: updatedList };
        }),

      deleteMemory: (id) =>
        set((state) => {
          void pushMemoryDelete(state.syncConfig, id);
          return {
            memories: state.memories.filter((m) => m.id !== id),
          };
        }),

      addBucketItem: (input) =>
        set((state) => {
          const created: BucketItem = {
            id: `buck-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            title: input.title,
            category: input.category,
            targetDate: input.targetDate,
            done: false,
            createdBy: input.createdBy,
          };
          void pushBucketUpsert(state.syncConfig, created);
          return {
            bucketList: [created, ...state.bucketList],
          };
        }),

      toggleBucketDone: (id) =>
        set((state) => {
          const updatedList = state.bucketList.map((item) =>
            item.id === id
              ? {
                  ...item,
                  done: !item.done,
                  doneAt: !item.done ? Date.now() : undefined,
                }
              : item
          );
          const target = updatedList.find((i) => i.id === id);
          if (target) void pushBucketUpsert(state.syncConfig, target);
          return { bucketList: updatedList };
        }),

      deleteBucketItem: (id) =>
        set((state) => {
          void pushBucketDelete(state.syncConfig, id);
          return {
            bucketList: state.bucketList.filter((item) => item.id !== id),
          };
        }),

      addLoveNote: (input) =>
        set((state) => {
          const created: LoveNote = {
            id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            authorId: input.authorId,
            message: input.message,
            sticker: input.sticker,
            colorId: input.colorId,
            pinned: Boolean(input.pinned),
            createdAt: Date.now(),
          };
          const prevUnpinned = input.pinned
            ? state.loveNotes.filter((n) => n.pinned).map((n) => ({ ...n, pinned: false }))
            : [];
          void pushNoteUpsert(state.syncConfig, created);
          prevUnpinned.forEach((n) => {
            void pushNoteUpsert(state.syncConfig, n);
          });

          return {
            loveNotes: [
              created,
              ...state.loveNotes.map((n) =>
                input.pinned ? { ...n, pinned: false } : n
              ),
            ],
          };
        }),

      togglePinNote: (id) =>
        set((state) => {
          const updated = state.loveNotes.map((n) =>
            n.id === id ? { ...n, pinned: !n.pinned } : { ...n, pinned: false }
          );
          updated.forEach((n) => {
            if (n.id === id || n.pinned !== state.loveNotes.find((o) => o.id === n.id)?.pinned) {
              void pushNoteUpsert(state.syncConfig, n);
            }
          });
          return { loveNotes: updated };
        }),

      reactToNote: (id, emoji) =>
        set((state) => {
          const updated = state.loveNotes.map((n) =>
            n.id === id
              ? { ...n, reaction: n.reaction === emoji ? undefined : emoji }
              : n
          );
          const target = updated.find((n) => n.id === id);
          if (target) void pushNoteUpsert(state.syncConfig, target);
          return { loveNotes: updated };
        }),

      deleteLoveNote: (id) =>
        set((state) => {
          void pushNoteDelete(state.syncConfig, id);
          return {
            loveNotes: state.loveNotes.filter((n) => n.id !== id),
          };
        }),

      connectLiveSync: async (configInput, role) => {
        const nextConfig: SyncConfig = {
          supabaseUrl: configInput.supabaseUrl.trim(),
          supabaseAnonKey: configInput.supabaseAnonKey.trim(),
          roomCode: configInput.roomCode.trim().toUpperCase(),
          enabled: true,
        };
        set({
          activePartnerId: role,
          syncStatus: 'connecting',
          syncError: null,
        });

        const state = get();
        const res = await joinOrCreateRoom(nextConfig, {
          coupleTitle: state.coupleTitle,
          anniversaryDate: state.anniversaryDate,
          hugCount: state.hugCount,
          lastHugFrom: state.lastHugFrom,
          lastHugAt: state.lastHugAt,
          partners: state.partners,
          locations: state.locations,
          memories: state.memories,
          bucketList: state.bucketList,
          loveNotes: state.loveNotes,
        });

        if (res.error || !res.data) {
          set({
            syncStatus: 'error',
            syncError: res.error ?? 'Gagal terhubung ke room pasangan.',
            syncConfig: { ...nextConfig, enabled: false },
          });
          return { ok: false, error: res.error };
        }

        set({
          syncConfig: nextConfig,
          syncStatus: 'connected',
          syncError: null,
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

        return { ok: true, created: res.created };
      },

      disconnectLiveSync: () =>
        set((state) => ({
          syncConfig: { ...state.syncConfig, enabled: false },
          syncStatus: 'offline',
          syncError: null,
        })),

      setSyncStatus: (status, error = null) =>
        set({ syncStatus: status, syncError: error ?? null }),

      applyRemoteRoom: (row) =>
        set((state) => ({
          coupleTitle: row.couple_title ?? state.coupleTitle,
          anniversaryDate: row.anniversary_date ?? state.anniversaryDate,
          hugCount: typeof row.hug_count === 'number' ? row.hug_count : state.hugCount,
          lastHugFrom: row.last_hug_from ?? state.lastHugFrom,
          lastHugAt: row.last_hug_at ?? state.lastHugAt,
          partners: {
            p1: row.p1_profile ?? state.partners.p1,
            p2: row.p2_profile ?? state.partners.p2,
          },
          locations: {
            p1: row.p1_location ?? state.locations.p1,
            p2: row.p2_location ?? state.locations.p2,
          },
        })),

      applyRemoteMemoryUpsert: (item) =>
        set((state) => {
          const exists = state.memories.some((m) => m.id === item.id);
          return {
            memories: exists
              ? state.memories.map((m) => (m.id === item.id ? item : m))
              : [item, ...state.memories],
          };
        }),

      applyRemoteMemoryDelete: (id) =>
        set((state) => ({
          memories: state.memories.filter((m) => m.id !== id),
        })),

      applyRemoteBucketUpsert: (item) =>
        set((state) => {
          const exists = state.bucketList.some((b) => b.id === item.id);
          return {
            bucketList: exists
              ? state.bucketList.map((b) => (b.id === item.id ? item : b))
              : [item, ...state.bucketList],
          };
        }),

      applyRemoteBucketDelete: (id) =>
        set((state) => ({
          bucketList: state.bucketList.filter((b) => b.id !== id),
        })),

      applyRemoteNoteUpsert: (item) =>
        set((state) => {
          const exists = state.loveNotes.some((n) => n.id === item.id);
          return {
            loveNotes: exists
              ? state.loveNotes.map((n) => (n.id === item.id ? item : n))
              : [item, ...state.loveNotes],
          };
        }),

      applyRemoteNoteDelete: (id) =>
        set((state) => ({
          loveNotes: state.loveNotes.filter((n) => n.id !== id),
        })),
    }),
    {
      name: 'mochiduo-couple-storage-v1',
      storage: createJSONStorage(() => safeStorage),
      partialize: (state) => ({
        activePartnerId: state.activePartnerId,
        anniversaryDate: state.anniversaryDate,
        coupleTitle: state.coupleTitle,
        hugCount: state.hugCount,
        lastHugFrom: state.lastHugFrom,
        lastHugAt: state.lastHugAt,
        partners: state.partners,
        locations: state.locations,
        liveWatchEnabled: state.liveWatchEnabled,
        memories: state.memories,
        bucketList: state.bucketList,
        loveNotes: state.loveNotes,
        syncConfig: state.syncConfig,
      }),
      merge: (persistedState, currentState) => {
        const persisted = (persistedState ?? {}) as Partial<CoupleState>;
        return {
          ...currentState,
          ...persisted,
          partners: {
            ...currentState.partners,
            ...(persisted.partners ?? {}),
          },
          locations: {
            ...currentState.locations,
            ...(persisted.locations ?? {}),
          },
          syncConfig: {
            ...currentState.syncConfig,
            ...(persisted.syncConfig ?? {}),
          },
        };
      },
    }
  )
);
