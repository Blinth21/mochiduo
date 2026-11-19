import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

import { MOOD_OPTIONS } from '@/constants/pastelTheme';
import {
  broadcastLiveLocation,
  joinOrCreateRoom,
  pushBucketDelete,
  pushBucketUpsert,
  pushMemoryDelete,
  pushMemoryUpsert,
  pushMessageDelete,
  pushMessageUpsert,
  pushNoteDelete,
  pushNoteUpsert,
  pushRoomFields,
} from '@/services/coupleSync';
import {
  fireSystemNotification,
  isCategoryEnabled,
} from '@/services/notifications';
import type {
  BucketCategory,
  BucketItem,
  ChatMessage,
  DateIdea,
  InAppNotification,
  LocationSnapshot,
  LoveNote,
  MemoryItem,
  MoodId,
  NoteColorId,
  NotificationCategory,
  NotificationPrefs,
  PartnerId,
  PartnerProfile,
  SyncConfig,
  SyncStatus,
} from '@/types/couple';
import { getDistanceMeters } from '@/utils/geoCalc';

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

const DEFAULT_NOTIF_PREFS: NotificationPrefs = {
  enabled: true,
  chat: true,
  hugAndMood: true,
  notes: true,
  memories: true,
  dates: true,
  location: true,
  anniversary: true,
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
  chatMessages: ChatMessage[];

  // Realtime presence & typing (not persisted)
  partnerTyping: Record<PartnerId, boolean>;
  onlinePartners: Record<PartnerId, boolean>;
  isChatFocused: boolean;

  // Notifications
  notifPrefs: NotificationPrefs;
  notifications: InAppNotification[];
  activeToast: InAppNotification | null;
  lastAnnivNotifiedKey: string | null;

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
    },
    options?: { skipDbPush?: boolean }
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

  // Chat actions
  sendChatMessage: (input: {
    senderId: PartnerId;
    text: string;
    sticker?: string;
    imageUri?: string;
    replyTo?: { id: string; senderId: PartnerId; preview: string };
  }) => void;
  reactToChatMessage: (id: string, emoji: string) => void;
  deleteChatMessage: (id: string) => void;
  markPartnerMessagesRead: (readerId: PartnerId) => void;
  setPartnerTyping: (partnerId: PartnerId, isTyping: boolean) => void;
  setOnlinePartners: (online: Record<PartnerId, boolean>) => void;
  setIsChatFocused: (focused: boolean) => void;

  // Notification actions
  pushFeatureNotification: (input: {
    category: NotificationCategory;
    title: string;
    body: string;
    emoji: string;
    route?: string;
    systemAlert?: boolean;
  }) => void;
  dismissToast: () => void;
  markAllNotificationsRead: () => void;
  clearNotifications: () => void;
  updateNotifPrefs: (patch: Partial<NotificationPrefs>) => void;
  setLastAnnivNotifiedKey: (key: string) => void;

  // Sync actions
  connectLiveSync: (
    config: Omit<SyncConfig, 'enabled'>,
    role: PartnerId
  ) => Promise<{ ok: boolean; created?: boolean; error?: string }>;
  disconnectLiveSync: () => void;
  setSyncStatus: (status: SyncStatus, error?: string | null) => void;
  applyRemoteRoom: (row: any) => void;
  applyRemoteLiveLocation: (partnerId: PartnerId, loc: LocationSnapshot) => void;
  applyRemoteMemoryUpsert: (item: MemoryItem) => void;
  applyRemoteMemoryDelete: (id: string) => void;
  applyRemoteBucketUpsert: (item: BucketItem) => void;
  applyRemoteBucketDelete: (id: string) => void;
  applyRemoteNoteUpsert: (item: LoveNote) => void;
  applyRemoteNoteDelete: (id: string) => void;
  applyRemoteMessageUpsert: (item: ChatMessage) => void;
  applyRemoteMessageDelete: (id: string) => void;
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
      liveWatchEnabled: true,

      partnerTyping: { p1: false, p2: false },
      onlinePartners: { p1: false, p2: false },
      isChatFocused: false,

      notifPrefs: DEFAULT_NOTIF_PREFS,
      notifications: [],
      activeToast: null,
      lastAnnivNotifiedKey: null,

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

      chatMessages: [
        {
          id: 'msg-1',
          senderId: 'p2',
          text: 'Sayang udah makan siang belum? 🍱💕',
          status: 'read',
          createdAt: now - 1000 * 60 * 40,
        },
        {
          id: 'msg-2',
          senderId: 'p1',
          text: 'Udah barusan! Nanti sore jadi kan kita jalan?',
          replyToId: 'msg-1',
          replyToSender: 'p2',
          replyToPreview: 'Sayang udah makan siang belum? 🍱💕',
          reaction: '🥰',
          status: 'read',
          createdAt: now - 1000 * 60 * 35,
        },
        {
          id: 'msg-3',
          senderId: 'p2',
          text: 'Jadi dong! Aku udah siapin kamera buat foto berdua 📸✨',
          status: 'delivered',
          createdAt: now - 1000 * 60 * 10,
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

      updatePartnerLocation: (partnerId, payload, options) =>
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

          if (state.syncConfig.enabled) {
            broadcastLiveLocation(state.syncConfig.roomCode, partnerId, nextLoc);
            if (!options?.skipDbPush) {
              const col = partnerId === 'p1' ? 'p1_location' : 'p2_location';
              void pushRoomFields(state.syncConfig, { [col]: nextLoc });
            }
          }

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
          if (state.syncConfig.enabled) {
            broadcastLiveLocation(state.syncConfig.roomCode, partnerId, nextLoc);
            const col = partnerId === 'p1' ? 'p1_location' : 'p2_location';
            void pushRoomFields(state.syncConfig, { [col]: nextLoc });
          }

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
          if (state.syncConfig.enabled) {
            broadcastLiveLocation(state.syncConfig.roomCode, partnerId, nextLoc);
            const col = partnerId === 'p1' ? 'p1_location' : 'p2_location';
            void pushRoomFields(state.syncConfig, { [col]: nextLoc });
          }

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

      // Chat actions
      sendChatMessage: (input) =>
        set((state) => {
          const created: ChatMessage = {
            id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            senderId: input.senderId,
            text: input.text,
            sticker: input.sticker,
            imageUri: input.imageUri,
            replyToId: input.replyTo?.id,
            replyToSender: input.replyTo?.senderId,
            replyToPreview: input.replyTo?.preview,
            status: state.syncConfig.enabled && state.syncStatus === 'connected' ? 'delivered' : 'sent',
            createdAt: Date.now(),
          };
          void pushMessageUpsert(state.syncConfig, created);
          return {
            chatMessages: [...state.chatMessages, created],
          };
        }),

      reactToChatMessage: (id, emoji) =>
        set((state) => {
          const updated = state.chatMessages.map((m) =>
            m.id === id
              ? { ...m, reaction: m.reaction === emoji ? undefined : emoji }
              : m
          );
          const target = updated.find((m) => m.id === id);
          if (target) void pushMessageUpsert(state.syncConfig, target);
          return { chatMessages: updated };
        }),

      deleteChatMessage: (id) =>
        set((state) => {
          void pushMessageDelete(state.syncConfig, id);
          return {
            chatMessages: state.chatMessages.filter((m) => m.id !== id),
          };
        }),

      markPartnerMessagesRead: (readerId) =>
        set((state) => {
          let changed = false;
          const updated = state.chatMessages.map((m) => {
            if (m.senderId !== readerId && m.status !== 'read') {
              changed = true;
              const nextMsg: ChatMessage = { ...m, status: 'read' };
              void pushMessageUpsert(state.syncConfig, nextMsg);
              return nextMsg;
            }
            return m;
          });
          return changed ? { chatMessages: updated } : {};
        }),

      setPartnerTyping: (partnerId, isTyping) =>
        set((state) => ({
          partnerTyping: {
            ...state.partnerTyping,
            [partnerId]: isTyping,
          },
        })),

      setOnlinePartners: (online) => set({ onlinePartners: online }),

      setIsChatFocused: (focused) => set({ isChatFocused: focused }),

      // Notifications
      pushFeatureNotification: (input) => {
        const state = get();
        if (!isCategoryEnabled(state.notifPrefs, input.category)) return;

        const notif: InAppNotification = {
          id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          category: input.category,
          title: input.title,
          body: input.body,
          emoji: input.emoji,
          route: input.route,
          createdAt: Date.now(),
          read: false,
        };

        set((s) => ({
          notifications: [notif, ...s.notifications].slice(0, 30),
          activeToast: notif,
        }));

        if (input.systemAlert !== false) {
          void fireSystemNotification({
            title: `${input.emoji} ${input.title}`,
            body: input.body,
            route: input.route,
          });
        }
      },

      dismissToast: () => set({ activeToast: null }),

      markAllNotificationsRead: () =>
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
        })),

      clearNotifications: () => set({ notifications: [], activeToast: null }),

      updateNotifPrefs: (patch) =>
        set((state) => ({
          notifPrefs: { ...state.notifPrefs, ...patch },
        })),

      setLastAnnivNotifiedKey: (key) => set({ lastAnnivNotifiedKey: key }),

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
          chatMessages: state.chatMessages,
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
          chatMessages: res.data.chatMessages,
        });

        return { ok: true, created: res.created };
      },

      disconnectLiveSync: () =>
        set((state) => ({
          syncConfig: { ...state.syncConfig, enabled: false },
          syncStatus: 'offline',
          syncError: null,
          onlinePartners: { p1: false, p2: false },
          partnerTyping: { p1: false, p2: false },
        })),

      setSyncStatus: (status, error = null) =>
        set({ syncStatus: status, syncError: error ?? null }),

      applyRemoteRoom: (row) => {
        const prev = get();
        const meId = prev.activePartnerId;
        const otherId: PartnerId = meId === 'p1' ? 'p2' : 'p1';
        const partnerName = prev.partners[otherId].name;

        const nextP1: PartnerProfile = row.p1_profile ?? prev.partners.p1;
        const nextP2: PartnerProfile = row.p2_profile ?? prev.partners.p2;
        const nextLoc1: LocationSnapshot = row.p1_location ?? prev.locations.p1;
        const nextLoc2: LocationSnapshot = row.p2_location ?? prev.locations.p2;
        const nextHugCount =
          typeof row.hug_count === 'number' ? row.hug_count : prev.hugCount;

        // Detect hug notification from partner
        if (nextHugCount > prev.hugCount && row.last_hug_from === otherId) {
          prev.pushFeatureNotification({
            category: 'hug',
            emoji: '🫂',
            title: `Pelukan Hangat dari ${partnerName}!`,
            body: `${partnerName} baru aja ngirim peluk ke kamu 💕 (Total ${nextHugCount} pelukan)`,
            route: '/',
          });
        }

        // Detect mood/status change from partner
        const prevOther = prev.partners[otherId];
        const nextOther = otherId === 'p1' ? nextP1 : nextP2;
        if (
          nextOther.updatedAt > prevOther.updatedAt &&
          (nextOther.mood !== prevOther.mood ||
            nextOther.statusText !== prevOther.statusText)
        ) {
          const moodObj = MOOD_OPTIONS.find((m) => m.id === nextOther.mood);
          prev.pushFeatureNotification({
            category: 'mood',
            emoji: moodObj?.emoji ?? '✨',
            title: `Mood ${partnerName}: ${moodObj?.label ?? 'Update'}`,
            body: `“${nextOther.statusText}”`,
            route: '/',
          });
        }

        // Detect location check-in or sharing change from partner
        const prevOtherLoc = prev.locations[otherId];
        const nextOtherLoc = otherId === 'p1' ? nextLoc1 : nextLoc2;
        if (nextOtherLoc.updatedAt > prevOtherLoc.updatedAt) {
          if (nextOtherLoc.spotTag && nextOtherLoc.spotTag !== prevOtherLoc.spotTag) {
            prev.pushFeatureNotification({
              category: 'location',
              emoji: '📍',
              title: `${partnerName} Check-in: ${nextOtherLoc.spotTag}`,
              body: `Sekarang berada di ${nextOtherLoc.areaName}`,
              route: '/lokasi',
            });
          } else if (!prevOtherLoc.isSharing && nextOtherLoc.isSharing) {
            prev.pushFeatureNotification({
              category: 'location',
              emoji: '🛰️',
              title: `${partnerName} Membagikan Lokasi`,
              body: `Posisi live di ${nextOtherLoc.areaName}`,
              route: '/lokasi',
            });
          }
        }

        set({
          coupleTitle: row.couple_title ?? prev.coupleTitle,
          anniversaryDate: row.anniversary_date ?? prev.anniversaryDate,
          hugCount: nextHugCount,
          lastHugFrom: row.last_hug_from ?? prev.lastHugFrom,
          lastHugAt: row.last_hug_at ?? prev.lastHugAt,
          partners: { p1: nextP1, p2: nextP2 },
          locations: { p1: nextLoc1, p2: nextLoc2 },
        });
      },

      applyRemoteLiveLocation: (partnerId, loc) => {
        const prev = get();
        if (partnerId === prev.activePartnerId) return;

        const myLoc = prev.locations[prev.activePartnerId];
        const prevLoc = prev.locations[partnerId];
        const partnerName = prev.partners[partnerId].name;

        const prevDist = getDistanceMeters(
          myLoc.latitude,
          myLoc.longitude,
          prevLoc.latitude,
          prevLoc.longitude
        );
        const nextDist = getDistanceMeters(
          myLoc.latitude,
          myLoc.longitude,
          loc.latitude,
          loc.longitude
        );

        // Notify if partner just arrived within 150m
        if (loc.isSharing && myLoc.isSharing && prevDist >= 150 && nextDist < 150) {
          prev.pushFeatureNotification({
            category: 'location',
            emoji: '💕',
            title: `${partnerName} Sudah Dekat!`,
            body: `Jarak kalian kurang dari 150 m (${loc.areaName})`,
            route: '/lokasi',
          });
        }

        set((state) => ({
          locations: {
            ...state.locations,
            [partnerId]: loc,
          },
        }));
      },

      applyRemoteMemoryUpsert: (item) => {
        const prev = get();
        const exists = prev.memories.some((m) => m.id === item.id);
        if (!exists) {
          prev.pushFeatureNotification({
            category: 'memories',
            emoji: item.sticker || '📸',
            title: 'Kenangan Baru Ditambahkan!',
            body: `${item.title}${item.location ? ` • ${item.location}` : ''}`,
            route: '/memories',
          });
        }
        set((state) => ({
          memories: exists
            ? state.memories.map((m) => (m.id === item.id ? item : m))
            : [item, ...state.memories],
        }));
      },

      applyRemoteMemoryDelete: (id) =>
        set((state) => ({
          memories: state.memories.filter((m) => m.id !== id),
        })),

      applyRemoteBucketUpsert: (item) => {
        const prev = get();
        const existing = prev.bucketList.find((b) => b.id === item.id);
        const otherId: PartnerId = prev.activePartnerId === 'p1' ? 'p2' : 'p1';
        const partnerName = prev.partners[otherId].name;

        if (!existing && item.createdBy === otherId) {
          prev.pushFeatureNotification({
            category: 'dates',
            emoji: '🎡',
            title: `Rencana Kencan Baru dari ${partnerName}`,
            body: item.title,
            route: '/dates',
          });
        } else if (existing && !existing.done && item.done) {
          prev.pushFeatureNotification({
            category: 'dates',
            emoji: '🎉',
            title: 'Misi Kencan Tercapai!',
            body: `“${item.title}” selesai!`,
            route: '/dates',
          });
        }

        set((state) => ({
          bucketList: existing
            ? state.bucketList.map((b) => (b.id === item.id ? item : b))
            : [item, ...state.bucketList],
        }));
      },

      applyRemoteBucketDelete: (id) =>
        set((state) => ({
          bucketList: state.bucketList.filter((b) => b.id !== id),
        })),

      applyRemoteNoteUpsert: (item) => {
        const prev = get();
        const existing = prev.loveNotes.find((n) => n.id === item.id);
        const partnerName = prev.partners[item.authorId].name;

        if (!existing && item.authorId !== prev.activePartnerId) {
          prev.pushFeatureNotification({
            category: 'notes',
            emoji: item.sticker || '💌',
            title: `Love Note Baru dari ${partnerName}`,
            body: item.message,
            route: '/notes',
          });
        } else if (
          existing &&
          item.authorId === prev.activePartnerId &&
          item.reaction &&
          item.reaction !== existing.reaction
        ) {
          const otherName = prev.partners[prev.activePartnerId === 'p1' ? 'p2' : 'p1'].name;
          prev.pushFeatureNotification({
            category: 'notes',
            emoji: item.reaction,
            title: `${otherName} Bereaksi ke Love Note Kamu`,
            body: `Memberi reaksi ${item.reaction} pada “${item.message.slice(0, 50)}”`,
            route: '/notes',
          });
        }

        set((state) => ({
          loveNotes: existing
            ? state.loveNotes.map((n) => (n.id === item.id ? item : n))
            : [item, ...state.loveNotes],
        }));
      },

      applyRemoteNoteDelete: (id) =>
        set((state) => ({
          loveNotes: state.loveNotes.filter((n) => n.id !== id),
        })),

      applyRemoteMessageUpsert: (item) => {
        const prev = get();
        const existing = prev.chatMessages.find((m) => m.id === item.id);

        if (!existing && item.senderId !== prev.activePartnerId) {
          const senderName = prev.partners[item.senderId].name;
          const previewText = item.imageUri
            ? item.text || 'Mengirim foto 📷'
            : item.sticker
              ? `${item.sticker} ${item.text || 'Mengirim stiker'}`
              : item.text;

          if (!prev.isChatFocused) {
            prev.pushFeatureNotification({
              category: 'chat',
              emoji: '💬',
              title: `Pesan Baru dari ${senderName}`,
              body: previewText,
              route: '/chat',
            });
          }
        }

        // If chat is currently focused and message is from partner, mark as read immediately
        const finalItem: ChatMessage =
          prev.isChatFocused && item.senderId !== prev.activePartnerId && item.status !== 'read'
            ? { ...item, status: 'read' }
            : item;

        if (finalItem !== item) {
          void pushMessageUpsert(prev.syncConfig, finalItem);
        }

        set((state) => {
          const nextList = existing
            ? state.chatMessages.map((m) => (m.id === finalItem.id ? finalItem : m))
            : [...state.chatMessages, finalItem];
          nextList.sort((a, b) => a.createdAt - b.createdAt);
          return { chatMessages: nextList };
        });
      },

      applyRemoteMessageDelete: (id) =>
        set((state) => ({
          chatMessages: state.chatMessages.filter((m) => m.id !== id),
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
        chatMessages: state.chatMessages.slice(-150),
        notifPrefs: state.notifPrefs,
        notifications: state.notifications.slice(0, 20),
        lastAnnivNotifiedKey: state.lastAnnivNotifiedKey,
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
          notifPrefs: {
            ...currentState.notifPrefs,
            ...(persisted.notifPrefs ?? {}),
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
