import type { MoodOption, NOTE_PALETTES } from '@/constants/pastelTheme';

export type PartnerId = 'p1' | 'p2';
export type MoodId = MoodOption['id'];
export type MemoryTag = 'date' | 'food' | 'trip' | 'random';
export type BucketCategory = 'hangout' | 'food' | 'cozy' | 'milestone';
export type NoteColorId = (typeof NOTE_PALETTES)[number]['id'];

export type MochiSkinId =
  | 'peach'
  | 'matcha'
  | 'strawberry'
  | 'taro'
  | 'honey'
  | 'choco';

export type MochiAccessoryId =
  | 'none'
  | 'bow'
  | 'cat_ears'
  | 'beret'
  | 'shades'
  | 'headphone'
  | 'crown';

export interface DailyQaEntry {
  questionId: string;
  answer: string;
  answeredAt: number;
}

export interface PartnerGiftNotice {
  id: string;
  fromId: PartnerId;
  itemId: string;
  itemName: string;
  emoji: string;
  kind: 'skin' | 'accessory';
  createdAt: number;
}

export interface PartnerProfile {
  id: PartnerId;
  name: string;
  nickname: string;
  avatarUri?: string;
  mochiColor: string;
  auraColor: string;
  mood: MoodId;
  statusText: string;
  updatedAt: number;
  // Engagement, Skins, Streak & Q&A fields (stored inside jsonb profile -> zero SQL migration)
  coins?: number;
  skinId?: MochiSkinId;
  accessoryId?: MochiAccessoryId;
  unlockedSkins?: MochiSkinId[];
  unlockedAccessories?: MochiAccessoryId[];
  activeDays?: string[]; // YYYY-MM-DD
  dailyClaims?: Record<string, string[]>; // dateKey -> claimed mission IDs
  qaResponses?: Record<string, DailyQaEntry>; // dateKey -> answer
  latestGift?: PartnerGiftNotice;
}

export interface LocationSnapshot {
  latitude: number;
  longitude: number;
  areaName: string;
  spotTag?: string;
  isSharing: boolean;
  accuracyMeters?: number;
  updatedAt: number;
}

export interface MemoryItem {
  id: string;
  title: string;
  story: string;
  date: string; // YYYY-MM-DD
  location: string;
  tag: MemoryTag;
  sticker: string;
  photoUri?: string;
  cardBg: string;
  isFavorite: boolean;
  createdAt: number;
}

export interface BucketItem {
  id: string;
  title: string;
  category: BucketCategory;
  targetDate?: string;
  done: boolean;
  doneAt?: number;
  createdBy: PartnerId;
}

export interface LoveNote {
  id: string;
  authorId: PartnerId;
  message: string;
  sticker: string;
  colorId: NoteColorId;
  pinned: boolean;
  reaction?: string;
  createdAt: number;
}

export interface DateIdea {
  id: string;
  title: string;
  vibe: string;
  category: BucketCategory;
  emoji: string;
}

export type SyncStatus = 'offline' | 'connecting' | 'connected' | 'error';

export interface SyncConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  roomCode: string;
  enabled: boolean;
}

export interface ChatMessage {
  id: string;
  senderId: PartnerId;
  text: string;
  sticker?: string;
  imageUri?: string;
  replyToId?: string;
  replyToSender?: PartnerId;
  replyToPreview?: string;
  reaction?: string;
  status: 'sent' | 'delivered' | 'read';
  createdAt: number;
}

export type SuitChoice = 'rock' | 'paper' | 'scissors';
export type SuitMode = 'live' | 'bot';

export interface SuitMatchState {
  roundId: string;
  mode: SuitMode;
  stake: string;
  picks: Partial<Record<PartnerId, SuitChoice>>;
  winner: PartnerId | 'draw' | null;
  updatedAt: number;
}

export type TttCell = PartnerId | null;
export type TttMode = 'live' | 'bot' | 'local';

export interface TttMatchState {
  matchId: string;
  mode: TttMode;
  board: TttCell[];
  turn: PartnerId;
  winner: PartnerId | 'draw' | null;
  winLine: number[] | null;
  scores: Record<PartnerId, number>;
  updatedAt: number;
}

export type PlayBroadcastEvent =
  | {
      type: 'suit_pick';
      roundId: string;
      partnerId: PartnerId;
      choice: SuitChoice;
      stake: string;
    }
  | {
      type: 'suit_reset';
      roundId: string;
      stake: string;
      by: PartnerId;
    }
  | {
      type: 'ttt_move';
      matchId: string;
      index: number;
      by: PartnerId;
    }
  | {
      type: 'ttt_reset';
      matchId: string;
      starter: PartnerId;
    };

export type NotificationCategory =
  | 'chat'
  | 'hug'
  | 'mood'
  | 'notes'
  | 'memories'
  | 'dates'
  | 'location'
  | 'anniversary'
  | 'play';

export interface NotificationPrefs {
  enabled: boolean;
  chat: boolean;
  hugAndMood: boolean;
  notes: boolean;
  memories: boolean;
  dates: boolean;
  location: boolean;
  anniversary: boolean;
  play: boolean;
}

export interface InAppNotification {
  id: string;
  category: NotificationCategory;
  title: string;
  body: string;
  emoji: string;
  route?: string;
  createdAt: number;
  read: boolean;
}
