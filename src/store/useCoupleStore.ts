import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

import {
  MOCHI_ACCESSORIES,
  MOCHI_SKINS,
  STARTER_MOCHI_COINS,
  checkTttWinner,
  pickBotTttMove,
  pickRandomSuitChoice,
  resolveSuitWinner,
} from '@/constants/mochiduoPlay';
import { MOOD_OPTIONS } from '@/constants/pastelTheme';
import {
  broadcastLiveLocation,
  broadcastPlayEvent,
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
  MochiAccessoryId,
  MochiSkinId,
  MoodId,
  NoteColorId,
  NotificationCategory,
  NotificationPrefs,
  PartnerId,
  PartnerProfile,
  PlayBroadcastEvent,
  SuitChoice,
  SuitMatchState,
  SuitMode,
  SyncConfig,
  SyncStatus,
  TttCell,
  TttMatchState,
  TttMode,
} from '@/types/couple';
import { getLocalDateKey } from '@/utils/dateCalc';
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

const pendingStorageTimers = new Map<string, ReturnType<typeof setTimeout>>();

const safeStorage: StateStorage = {
  getItem: async (name) => {
    if (Platform.OS === 'web' && typeof window === 'undefined') return null;
    return AsyncStorage.getItem(name);
  },
  setItem: (name, value) => {
    if (Platform.OS === 'web' && typeof window === 'undefined') return;
    const prev = pendingStorageTimers.get(name);
    if (prev) clearTimeout(prev);
    const timer = setTimeout(() => {
      pendingStorageTimers.delete(name);
      void AsyncStorage.setItem(name, value).catch(() => {});
    }, 700);
    pendingStorageTimers.set(name, timer);
  },
  removeItem: async (name) => {
    if (Platform.OS === 'web' && typeof window === 'undefined') return;
    const prev = pendingStorageTimers.get(name);
    if (prev) {
      clearTimeout(prev);
      pendingStorageTimers.delete(name);
    }
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
  play: true,
};

export function getProfileCoins(p: PartnerProfile): number {
  return typeof p.coins === 'number' ? p.coins : STARTER_MOCHI_COINS;
}

export function getProfileSkin(p: PartnerProfile): MochiSkinId {
  return p.skinId ?? (p.id === 'p2' ? 'matcha' : 'peach');
}

export function getProfileAccessory(p: PartnerProfile): MochiAccessoryId {
  return p.accessoryId ?? 'none';
}

export function getUnlockedSkins(p: PartnerProfile): MochiSkinId[] {
  const base = p.unlockedSkins ?? ['peach', 'matcha'];
  const merged = new Set<MochiSkinId>(['peach', 'matcha', ...base]);
  return Array.from(merged);
}

export function getUnlockedAccessories(p: PartnerProfile): MochiAccessoryId[] {
  const base = p.unlockedAccessories ?? ['none'];
  const merged = new Set<MochiAccessoryId>(['none', ...base]);
  return Array.from(merged);
}

export function getDailyMissionSummary(p: PartnerProfile, dateKey: string = getLocalDateKey()) {
  const claims = new Set(p.dailyClaims?.[dateKey] ?? []);
  const m1CheckIn = claims.has('checkin');
  const m2Interact = claims.has('hug') || claims.has('mood') || claims.has('chat') || claims.has('memory') || claims.has('note');
  const m3PlayOrQa = claims.has('qa') || claims.has('game');
  const bonusClaimed = claims.has('bonus');
  const completedCount = Number(m1CheckIn) + Number(m2Interact) + Number(m3PlayOrQa);
  return {
    m1CheckIn,
    m2Interact,
    m3PlayOrQa,
    completedCount,
    allComplete: completedCount === 3,
    bonusClaimed,
  };
}

function applyProfileEngagement(
  profile: PartnerProfile,
  options: {
    dateKey?: string;
    missionId?: string;
    missionCoins?: number;
    alwaysCoins?: number;
  }
): { nextProfile: PartnerProfile; earned: number; newlyClaimed: boolean } {
  const dateKey = options.dateKey ?? getLocalDateKey();
  const prevDays = profile.activeDays ?? [];
  const nextDaysSet = new Set(prevDays);
  nextDaysSet.add(dateKey);
  const nextActiveDays = Array.from(nextDaysSet).sort().slice(-60);

  const prevClaims = profile.dailyClaims ?? {};
  const todayClaims = [...(prevClaims[dateKey] ?? [])];
  let newlyClaimed = false;
  let earned = options.alwaysCoins ?? 0;

  if (options.missionId) {
    if (!todayClaims.includes(options.missionId)) {
      todayClaims.push(options.missionId);
      newlyClaimed = true;
      earned += options.missionCoins ?? 0;
    }
  }

  // Prune claims older than 7 entries to keep jsonb lean
  const nextClaims: Record<string, string[]> = {};
  const sortedKeys = Object.keys({ ...prevClaims, [dateKey]: todayClaims }).sort().slice(-7);
  for (const k of sortedKeys) {
    nextClaims[k] = k === dateKey ? todayClaims : prevClaims[k];
  }

  const nextCoins = Math.max(0, getProfileCoins(profile) + earned);

  return {
    earned,
    newlyClaimed,
    nextProfile: {
      ...profile,
      coins: nextCoins,
      activeDays: nextActiveDays,
      dailyClaims: nextClaims,
    },
  };
}

function createInitialSuitGame(): SuitMatchState {
  return {
    roundId: `suit-${Date.now()}`,
    mode: 'bot',
    stake: 'Traktir Boba / Kopi 🧋',
    picks: {},
    winner: null,
    updatedAt: Date.now(),
  };
}

function createInitialTttGame(starter: PartnerId = 'p1'): TttMatchState {
  return {
    matchId: `ttt-${Date.now()}`,
    mode: 'bot',
    board: Array(9).fill(null) as TttCell[],
    turn: starter,
    winner: null,
    winLine: null,
    scores: { p1: 0, p2: 0 },
    updatedAt: Date.now(),
  };
}

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

  // Mini-games live/local board state (not persisted)
  playSectionTab: 'suit' | 'ttt' | 'shop';
  suitGame: SuitMatchState;
  tttGame: TttMatchState;

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
  setPlaySectionTab: (tab: 'suit' | 'ttt' | 'shop') => void;
  updateCoupleSettings: (payload: {
    coupleTitle: string;
    anniversaryDate: string;
    p1Name: string;
    p1Nickname: string;
    p2Name: string;
    p2Nickname: string;
  }) => void;
  updatePartnerAvatar: (partnerId: PartnerId, avatarUri?: string) => void;
  updateMood: (partnerId: PartnerId, mood: MoodId, customStatus?: string) => void;
  updateStatusText: (partnerId: PartnerId, statusText: string) => void;
  sendHug: (fromId: PartnerId) => void;

  // Engagement, Streak & Shop actions
  claimDailyCheckIn: (partnerId: PartnerId) => { claimed: boolean; reward: number };
  claimDailyQuestBonus: (partnerId: PartnerId) => { claimed: boolean; reward: number };
  buyShopItem: (input: {
    buyerId: PartnerId;
    recipientId: PartnerId;
    kind: 'skin' | 'accessory';
    itemId: string;
  }) => { ok: boolean; reason?: string };
  equipShopItem: (
    partnerId: PartnerId,
    kind: 'skin' | 'accessory',
    itemId: string
  ) => void;

  // Mini-Game actions
  setSuitMode: (mode: SuitMode) => void;
  setSuitStake: (stake: string) => void;
  pickSuitChoice: (partnerId: PartnerId, choice: SuitChoice) => void;
  resetSuitRound: (byId: PartnerId, stake?: string) => void;
  setTttMode: (mode: TttMode) => void;
  makeTttMove: (index: number, actorId?: PartnerId) => void;
  resetTttMatch: (starter?: PartnerId) => void;
  applyRemotePlayEvent: (event: PlayBroadcastEvent) => void;

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

      playSectionTab: 'suit',
      suitGame: createInitialSuitGame(),
      tttGame: createInitialTttGame(),

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
          mochiColor: '#FFEAD9',
          auraColor: '#FF5C7A',
          mood: 'in_love',
          statusText: 'Lagi kangen pengen makan es krim bareng.',
          updatedAt: now - 1000 * 60 * 12,
          coins: STARTER_MOCHI_COINS,
          skinId: 'peach',
          accessoryId: 'none',
          unlockedSkins: ['peach', 'matcha'],
          unlockedAccessories: ['none'],
          activeDays: [],
          dailyClaims: {},
          qaResponses: {},
        },
        p2: {
          id: 'p2',
          name: 'Naya',
          nickname: 'Boba',
          mochiColor: '#D8F0E3',
          auraColor: '#22A87A',
          mood: 'happy',
          statusText: 'Baru beres kerja, siap peluk kamu.',
          updatedAt: now - 1000 * 60 * 25,
          coins: STARTER_MOCHI_COINS,
          skinId: 'matcha',
          accessoryId: 'none',
          unlockedSkins: ['peach', 'matcha'],
          unlockedAccessories: ['none'],
          activeDays: [],
          dailyClaims: {},
          qaResponses: {},
        },
      },

      locations: {
        p1: {
          latitude: -6.2442,
          longitude: 106.8006,
          areaName: 'Blok M, Jakarta Selatan',
          spotTag: 'Ngopi',
          isSharing: true,
          accuracyMeters: 18,
          updatedAt: now - 1000 * 60 * 8,
        },
        p2: {
          latitude: -6.2297,
          longitude: 106.8165,
          areaName: 'Senopati, Jakarta Selatan',
          spotTag: 'Kampus/Kantor',
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
          cardBg: '#FFF7E6',
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
          cardBg: '#FFF0F3',
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
          cardBg: '#EEF5FF',
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
          cardBg: '#F3F0FF',
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

      setActivePartner: (id) =>
        set((state) => ({
          activePartnerId: id,
          tttGame:
            state.tttGame.mode === 'bot' && state.tttGame.board.every((c) => c === null)
              ? { ...state.tttGame, turn: id }
              : state.tttGame,
        })),

      setPlaySectionTab: (tab) => set({ playSectionTab: tab }),

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

      updatePartnerAvatar: (partnerId, avatarUri) =>
        set((state) => {
          const nextProfile: PartnerProfile = {
            ...state.partners[partnerId],
            avatarUri,
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

      updateMood: (partnerId, mood, customStatus) =>
        set((state) => {
          const moodObj = MOOD_OPTIONS.find((m) => m.id === mood);
          const nextStatus =
            customStatus !== undefined
              ? customStatus
              : moodObj?.defaultStatus ?? state.partners[partnerId].statusText;
          const baseProfile: PartnerProfile = {
            ...state.partners[partnerId],
            mood,
            statusText: nextStatus,
            updatedAt: Date.now(),
          };
          const { nextProfile } = applyProfileEngagement(baseProfile, {
            missionId: 'mood',
            missionCoins: 10,
          });
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
          const baseProfile: PartnerProfile = {
            ...state.partners[partnerId],
            statusText,
            updatedAt: Date.now(),
          };
          const { nextProfile } = applyProfileEngagement(baseProfile, {
            missionId: 'mood',
            missionCoins: 10,
          });
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
          const { nextProfile } = applyProfileEngagement(state.partners[fromId], {
            missionId: 'hug',
            missionCoins: 15,
            alwaysCoins: 2,
          });
          const col = fromId === 'p1' ? 'p1_profile' : 'p2_profile';
          void pushRoomFields(state.syncConfig, {
            hug_count: nextCount,
            last_hug_from: fromId,
            last_hug_at: nextAt,
            [col]: nextProfile,
          });
          return {
            hugCount: nextCount,
            lastHugFrom: fromId,
            lastHugAt: nextAt,
            partners: {
              ...state.partners,
              [fromId]: nextProfile,
            },
          };
        }),

      claimDailyCheckIn: (partnerId) => {
        const prev = get();
        const result = applyProfileEngagement(prev.partners[partnerId], {
          missionId: 'checkin',
          missionCoins: 20,
        });
        if (!result.newlyClaimed) {
          return { claimed: false, reward: 0 };
        }
        const col = partnerId === 'p1' ? 'p1_profile' : 'p2_profile';
        void pushRoomFields(prev.syncConfig, { [col]: result.nextProfile });
        set((state) => ({
          partners: {
            ...state.partners,
            [partnerId]: result.nextProfile,
          },
        }));
        return { claimed: true, reward: result.earned };
      },

      claimDailyQuestBonus: (partnerId) => {
        const prev = get();
        const profile = prev.partners[partnerId];
        const summary = getDailyMissionSummary(profile);
        if (!summary.allComplete || summary.bonusClaimed) {
          return { claimed: false, reward: 0 };
        }
        const result = applyProfileEngagement(profile, {
          missionId: 'bonus',
          missionCoins: 35,
        });
        const col = partnerId === 'p1' ? 'p1_profile' : 'p2_profile';
        void pushRoomFields(prev.syncConfig, { [col]: result.nextProfile });
        set((state) => ({
          partners: {
            ...state.partners,
            [partnerId]: result.nextProfile,
          },
        }));
        return { claimed: true, reward: result.earned };
      },

      buyShopItem: ({ buyerId, recipientId, kind, itemId }) => {
        const prev = get();
        const buyer = prev.partners[buyerId];
        const recipient = prev.partners[recipientId];
        const isGift = buyerId !== recipientId;

        const catalogItem =
          kind === 'skin'
            ? MOCHI_SKINS.find((s) => s.id === itemId)
            : MOCHI_ACCESSORIES.find((a) => a.id === itemId);

        if (!catalogItem) {
          return { ok: false, reason: 'Item tidak ditemukan.' };
        }

        const alreadyUnlocked =
          kind === 'skin'
            ? getUnlockedSkins(recipient).includes(itemId as MochiSkinId)
            : getUnlockedAccessories(recipient).includes(itemId as MochiAccessoryId);

        if (alreadyUnlocked) {
          get().equipShopItem(recipientId, kind, itemId);
          return { ok: true };
        }

        const buyerCoins = getProfileCoins(buyer);
        if (buyerCoins < catalogItem.price) {
          return {
            ok: false,
            reason: `Koin kurang! Butuh ${catalogItem.price} koin (kamu punya ${buyerCoins}).`,
          };
        }

        const nextBuyerCoins = buyerCoins - catalogItem.price;
        const applyToRecipient = (target: PartnerProfile): PartnerProfile => ({
          ...target,
          unlockedSkins:
            kind === 'skin'
              ? Array.from(new Set([...getUnlockedSkins(target), itemId as MochiSkinId]))
              : getUnlockedSkins(target),
          unlockedAccessories:
            kind === 'accessory'
              ? Array.from(
                  new Set([...getUnlockedAccessories(target), itemId as MochiAccessoryId])
                )
              : getUnlockedAccessories(target),
          skinId: kind === 'skin' ? (itemId as MochiSkinId) : getProfileSkin(target),
          accessoryId:
            kind === 'accessory'
              ? (itemId as MochiAccessoryId)
              : getProfileAccessory(target),
          latestGift: isGift
            ? {
                id: `gift-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                fromId: buyerId,
                itemId,
                itemName: catalogItem.name,
                emoji: catalogItem.emoji,
                kind,
                createdAt: Date.now(),
              }
            : target.latestGift,
        });

        if (!isGift) {
          const nextSelf = applyToRecipient({ ...buyer, coins: nextBuyerCoins });
          const col = buyerId === 'p1' ? 'p1_profile' : 'p2_profile';
          void pushRoomFields(prev.syncConfig, { [col]: nextSelf });
          set((state) => ({
            partners: {
              ...state.partners,
              [buyerId]: nextSelf,
            },
          }));
          return { ok: true };
        }

        const nextBuyer: PartnerProfile = { ...buyer, coins: nextBuyerCoins };
        const nextRecipient = applyToRecipient(recipient);
        void pushRoomFields(prev.syncConfig, {
          [buyerId === 'p1' ? 'p1_profile' : 'p2_profile']: nextBuyer,
          [recipientId === 'p1' ? 'p1_profile' : 'p2_profile']: nextRecipient,
        });
        set((state) => ({
          partners: {
            ...state.partners,
            [buyerId]: nextBuyer,
            [recipientId]: nextRecipient,
          },
        }));
        return { ok: true };
      },

      equipShopItem: (partnerId, kind, itemId) =>
        set((state) => {
          const profile = state.partners[partnerId];
          const nextProfile: PartnerProfile = {
            ...profile,
            skinId: kind === 'skin' ? (itemId as MochiSkinId) : getProfileSkin(profile),
            accessoryId:
              kind === 'accessory'
                ? (itemId as MochiAccessoryId)
                : getProfileAccessory(profile),
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

      setSuitMode: (mode) =>
        set(() => ({
          suitGame: {
            ...createInitialSuitGame(),
            mode,
          },
        })),

      setSuitStake: (stake) =>
        set((state) => ({
          suitGame: {
            ...state.suitGame,
            stake,
          },
        })),

      pickSuitChoice: (partnerId, choice) => {
        const prev = get();
        const game = prev.suitGame;
        if (game.winner) return;

        if (game.mode === 'bot') {
          const botChoice = pickRandomSuitChoice();
          const p1Pick = partnerId === 'p1' ? choice : botChoice;
          const p2Pick = partnerId === 'p2' ? choice : botChoice;
          const winner = resolveSuitWinner(p1Pick, p2Pick);
          const rewardCoins = winner === partnerId ? 20 : winner === 'draw' ? 10 : 8;

          const { nextProfile } = applyProfileEngagement(prev.partners[partnerId], {
            missionId: 'game',
            missionCoins: 15,
            alwaysCoins: rewardCoins,
          });
          const col = partnerId === 'p1' ? 'p1_profile' : 'p2_profile';
          void pushRoomFields(prev.syncConfig, { [col]: nextProfile });

          set((state) => ({
            suitGame: {
              ...state.suitGame,
              picks: { p1: p1Pick, p2: p2Pick },
              winner,
              updatedAt: Date.now(),
            },
            partners: {
              ...state.partners,
              [partnerId]: nextProfile,
            },
          }));
          return;
        }

        // Live 2-device Suit Mochi
        const nextPicks = { ...game.picks, [partnerId]: choice };
        const bothPicked = Boolean(nextPicks.p1 && nextPicks.p2);
        const winner =
          bothPicked && nextPicks.p1 && nextPicks.p2
            ? resolveSuitWinner(nextPicks.p1, nextPicks.p2)
            : null;

        if (prev.syncConfig.enabled) {
          broadcastPlayEvent(prev.syncConfig.roomCode, {
            type: 'suit_pick',
            roundId: game.roundId,
            partnerId,
            choice,
            stake: game.stake,
          });
        }

        let updatedProfile: PartnerProfile | null = null;
        if (winner) {
          const rewardCoins = winner === partnerId ? 25 : winner === 'draw' ? 12 : 10;
          updatedProfile = applyProfileEngagement(prev.partners[partnerId], {
            missionId: 'game',
            missionCoins: 15,
            alwaysCoins: rewardCoins,
          }).nextProfile;
          const col = partnerId === 'p1' ? 'p1_profile' : 'p2_profile';
          void pushRoomFields(prev.syncConfig, { [col]: updatedProfile });
        }

        set((state) => ({
          suitGame: {
            ...state.suitGame,
            picks: nextPicks,
            winner,
            updatedAt: Date.now(),
          },
          partners: updatedProfile
            ? { ...state.partners, [partnerId]: updatedProfile }
            : state.partners,
        }));
      },

      resetSuitRound: (byId, stake) => {
        const prev = get();
        const nextRoundId = `suit-${Date.now()}`;
        const nextStake = stake ?? prev.suitGame.stake;
        if (prev.suitGame.mode === 'live' && prev.syncConfig.enabled) {
          broadcastPlayEvent(prev.syncConfig.roomCode, {
            type: 'suit_reset',
            roundId: nextRoundId,
            stake: nextStake,
            by: byId,
          });
        }
        set((state) => ({
          suitGame: {
            ...state.suitGame,
            roundId: nextRoundId,
            stake: nextStake,
            picks: {},
            winner: null,
            updatedAt: Date.now(),
          },
        }));
      },

      setTttMode: (mode) =>
        set((state) => ({
          tttGame: {
            ...createInitialTttGame(mode === 'bot' ? state.activePartnerId : 'p1'),
            mode,
          },
        })),

      makeTttMove: (index, actorId) => {
        const prev = get();
        const game = prev.tttGame;
        const me = prev.activePartnerId;
        const isBoardEmpty = game.board.every((c) => c === null);
        const player = actorId ?? (game.mode === 'local' ? game.turn : me);

        if (game.winner || game.board[index] !== null) return;
        if (game.mode === 'live' && game.turn !== me) return;
        if (game.mode === 'bot' && game.turn !== me && !isBoardEmpty) return;

        const nextBoard = [...game.board];
        nextBoard[index] = player;
        const { winner, line } = checkTttWinner(nextBoard);
        const nextScores = { ...game.scores };
        if (winner === 'p1' || winner === 'p2') {
          nextScores[winner] += 1;
        }
        const nextTurn: PartnerId = player === 'p1' ? 'p2' : 'p1';

        if (game.mode === 'live' && prev.syncConfig.enabled) {
          broadcastPlayEvent(prev.syncConfig.roomCode, {
            type: 'ttt_move',
            matchId: game.matchId,
            index,
            by: player,
          });
        }

        let updatedProfile: PartnerProfile | null = null;
        if (winner) {
          const coins = winner === me ? 20 : winner === 'draw' ? 10 : 8;
          updatedProfile = applyProfileEngagement(prev.partners[me], {
            missionId: 'game',
            missionCoins: 15,
            alwaysCoins: coins,
          }).nextProfile;
          const col = me === 'p1' ? 'p1_profile' : 'p2_profile';
          void pushRoomFields(prev.syncConfig, { [col]: updatedProfile });
        }

        set((state) => ({
          tttGame: {
            ...state.tttGame,
            board: nextBoard,
            turn: nextTurn,
            winner,
            winLine: line,
            scores: nextScores,
            updatedAt: Date.now(),
          },
          partners: updatedProfile
            ? { ...state.partners, [me]: updatedProfile }
            : state.partners,
        }));

        // Trigger Bot reply move smoothly if playing solo vs Mochi Bot
        if (game.mode === 'bot' && !winner) {
          const botId: PartnerId = nextTurn;
          const expectedMatchId = game.matchId;
          setTimeout(() => {
            const latest = get();
            const g = latest.tttGame;
            if (
              g.mode !== 'bot' ||
              g.matchId !== expectedMatchId ||
              g.winner ||
              g.turn !== botId
            ) {
              return;
            }
            const botIdx = pickBotTttMove(g.board, botId);
            if (botIdx < 0) return;

            const botBoard = [...g.board];
            botBoard[botIdx] = botId;
            const res = checkTttWinner(botBoard);
            const botScores = { ...g.scores };
            if (res.winner === 'p1' || res.winner === 'p2') {
              botScores[res.winner] += 1;
            }

            let postProfile: PartnerProfile | null = null;
            if (res.winner) {
              const reward = res.winner === 'draw' ? 10 : 8;
              postProfile = applyProfileEngagement(latest.partners[me], {
                missionId: 'game',
                missionCoins: 15,
                alwaysCoins: reward,
              }).nextProfile;
              const col = me === 'p1' ? 'p1_profile' : 'p2_profile';
              void pushRoomFields(latest.syncConfig, { [col]: postProfile });
            }

            set((s) => ({
              tttGame: {
                ...s.tttGame,
                board: botBoard,
                turn: me,
                winner: res.winner,
                winLine: res.line,
                scores: botScores,
                updatedAt: Date.now(),
              },
              partners: postProfile ? { ...s.partners, [me]: postProfile } : s.partners,
            }));
          }, 360);
        }
      },

      resetTttMatch: (starter) => {
        const prev = get();
        const nextStarter = starter ?? prev.activePartnerId;
        const nextMatchId = `ttt-${Date.now()}`;
        if (prev.tttGame.mode === 'live' && prev.syncConfig.enabled) {
          broadcastPlayEvent(prev.syncConfig.roomCode, {
            type: 'ttt_reset',
            matchId: nextMatchId,
            starter: nextStarter,
          });
        }
        set((state) => ({
          tttGame: {
            ...state.tttGame,
            matchId: nextMatchId,
            board: Array(9).fill(null) as TttCell[],
            turn: nextStarter,
            winner: null,
            winLine: null,
            updatedAt: Date.now(),
          },
        }));
      },

      applyRemotePlayEvent: (event) => {
        const prev = get();
        const me = prev.activePartnerId;

        if (event.type === 'suit_reset') {
          if (event.by === me) return;
          set((state) => ({
            suitGame: {
              ...state.suitGame,
              mode: 'live',
              roundId: event.roundId,
              stake: event.stake || state.suitGame.stake,
              picks: {},
              winner: null,
              updatedAt: Date.now(),
            },
          }));
          return;
        }

        if (event.type === 'suit_pick') {
          if (event.partnerId === me) return;
          const game = prev.suitGame;
          const sameRound = game.roundId === event.roundId;
          const basePicks = sameRound ? game.picks : {};
          const nextPicks = { ...basePicks, [event.partnerId]: event.choice };
          const bothPicked = Boolean(nextPicks.p1 && nextPicks.p2);
          const winner =
            bothPicked && nextPicks.p1 && nextPicks.p2
              ? resolveSuitWinner(nextPicks.p1, nextPicks.p2)
              : null;

          const partnerName = prev.partners[event.partnerId].name;
          if (!bothPicked) {
            prev.pushFeatureNotification({
              category: 'play',
              emoji: '✌️',
              title: `${partnerName} Tantang Suit Mochi!`,
              body: `Taruhan: ${event.stake || game.stake}. Ayo buka MochiPlay sekarang!`,
              route: '/play?tab=suit',
            });
          }

          let updatedProfile: PartnerProfile | null = null;
          if (winner && !game.winner) {
            const rewardCoins = winner === me ? 25 : winner === 'draw' ? 12 : 10;
            updatedProfile = applyProfileEngagement(prev.partners[me], {
              missionId: 'game',
              missionCoins: 15,
              alwaysCoins: rewardCoins,
            }).nextProfile;
            const col = me === 'p1' ? 'p1_profile' : 'p2_profile';
            void pushRoomFields(prev.syncConfig, { [col]: updatedProfile });
          }

          set((state) => ({
            suitGame: {
              ...state.suitGame,
              mode: 'live',
              roundId: event.roundId,
              stake: event.stake || state.suitGame.stake,
              picks: nextPicks,
              winner,
              updatedAt: Date.now(),
            },
            partners: updatedProfile ? { ...state.partners, [me]: updatedProfile } : state.partners,
          }));
          return;
        }

        if (event.type === 'ttt_reset') {
          if (event.matchId === prev.tttGame.matchId) return;
          set((state) => ({
            tttGame: {
              ...state.tttGame,
              mode: 'live',
              matchId: event.matchId,
              board: Array(9).fill(null) as TttCell[],
              turn: event.starter,
              winner: null,
              winLine: null,
              updatedAt: Date.now(),
            },
          }));
          return;
        }

        if (event.type === 'ttt_move') {
          if (event.by === me) return;
          const currentGame = prev.tttGame;
          const baseBoard =
            currentGame.matchId === event.matchId
              ? [...currentGame.board]
              : (Array(9).fill(null) as TttCell[]);
          if (baseBoard[event.index] !== null) return;

          baseBoard[event.index] = event.by;
          const res = checkTttWinner(baseBoard);
          const nextScores = { ...currentGame.scores };
          if (res.winner === 'p1' || res.winner === 'p2') {
            nextScores[res.winner] += 1;
          }
          const nextTurn: PartnerId = event.by === 'p1' ? 'p2' : 'p1';

          if (baseBoard.filter(Boolean).length === 1) {
            const partnerName = prev.partners[event.by].name;
            prev.pushFeatureNotification({
              category: 'play',
              emoji: '🎮',
              title: `${partnerName} Mulai Tic-Tac-Toe Mochi!`,
              body: 'Giliran kamu melangkah sekarang!',
              route: '/play?tab=ttt',
            });
          }

          let updatedProfile: PartnerProfile | null = null;
          if (res.winner) {
            const coins = res.winner === me ? 20 : res.winner === 'draw' ? 10 : 8;
            updatedProfile = applyProfileEngagement(prev.partners[me], {
              missionId: 'game',
              missionCoins: 15,
              alwaysCoins: coins,
            }).nextProfile;
            const col = me === 'p1' ? 'p1_profile' : 'p2_profile';
            void pushRoomFields(prev.syncConfig, { [col]: updatedProfile });
          }

          set((state) => ({
            tttGame: {
              ...state.tttGame,
              mode: 'live',
              matchId: event.matchId,
              board: baseBoard,
              turn: nextTurn,
              winner: res.winner,
              winLine: res.line,
              scores: nextScores,
              updatedAt: Date.now(),
            },
            partners: updatedProfile ? { ...state.partners, [me]: updatedProfile } : state.partners,
          }));
        }
      },

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
          const { nextProfile } = applyProfileEngagement(state.partners[partnerId], {
            missionId: 'spot',
            missionCoins: 10,
          });
          if (state.syncConfig.enabled) {
            broadcastLiveLocation(state.syncConfig.roomCode, partnerId, nextLoc);
            const locCol = partnerId === 'p1' ? 'p1_location' : 'p2_location';
            const profCol = partnerId === 'p1' ? 'p1_profile' : 'p2_profile';
            void pushRoomFields(state.syncConfig, {
              [locCol]: nextLoc,
              [profCol]: nextProfile,
            });
          }

          return {
            locations: {
              ...state.locations,
              [partnerId]: nextLoc,
            },
            partners: {
              ...state.partners,
              [partnerId]: nextProfile,
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
          const me = state.activePartnerId;
          const { nextProfile } = applyProfileEngagement(state.partners[me], {
            missionId: 'memory',
            missionCoins: 15,
          });
          void pushMemoryUpsert(state.syncConfig, created);
          void pushRoomFields(state.syncConfig, {
            [me === 'p1' ? 'p1_profile' : 'p2_profile']: nextProfile,
          });
          return {
            memories: [created, ...state.memories],
            partners: { ...state.partners, [me]: nextProfile },
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
          const { nextProfile } = applyProfileEngagement(state.partners[input.createdBy], {
            missionId: 'bucket',
            missionCoins: 10,
          });
          void pushBucketUpsert(state.syncConfig, created);
          void pushRoomFields(state.syncConfig, {
            [input.createdBy === 'p1' ? 'p1_profile' : 'p2_profile']: nextProfile,
          });
          return {
            bucketList: [created, ...state.bucketList],
            partners: { ...state.partners, [input.createdBy]: nextProfile },
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
          const { nextProfile } = applyProfileEngagement(state.partners[input.authorId], {
            missionId: 'note',
            missionCoins: 12,
          });
          void pushNoteUpsert(state.syncConfig, created);
          prevUnpinned.forEach((n) => {
            void pushNoteUpsert(state.syncConfig, n);
          });
          void pushRoomFields(state.syncConfig, {
            [input.authorId === 'p1' ? 'p1_profile' : 'p2_profile']: nextProfile,
          });

          return {
            loveNotes: [
              created,
              ...state.loveNotes.map((n) =>
                input.pinned ? { ...n, pinned: false } : n
              ),
            ],
            partners: { ...state.partners, [input.authorId]: nextProfile },
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
          const { nextProfile, earned } = applyProfileEngagement(
            state.partners[input.senderId],
            {
              missionId: 'chat',
              missionCoins: 10,
              alwaysCoins: 1,
            }
          );
          void pushMessageUpsert(state.syncConfig, created);
          if (earned > 0) {
            void pushRoomFields(state.syncConfig, {
              [input.senderId === 'p1' ? 'p1_profile' : 'p2_profile']: nextProfile,
            });
          }
          return {
            chatMessages: [...state.chatMessages, created],
            partners: { ...state.partners, [input.senderId]: nextProfile },
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

        // Detect incoming gift for active user from partner
        const prevMe = prev.partners[meId];
        const nextMe = meId === 'p1' ? nextP1 : nextP2;
        if (
          nextMe.latestGift &&
          nextMe.latestGift.id !== prevMe.latestGift?.id &&
          nextMe.latestGift.fromId === otherId
        ) {
          prev.pushFeatureNotification({
            category: 'play',
            emoji: '🎁',
            title: `Kado ${nextMe.latestGift.emoji} dari ${partnerName}!`,
            body: `${partnerName} menghadiahkan "${nextMe.latestGift.itemName}" buat Mochi-mu!`,
            route: '/play?tab=shop',
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
