import type { MoodOption, NOTE_PALETTES } from '@/constants/pastelTheme';

export type PartnerId = 'p1' | 'p2';
export type MoodId = MoodOption['id'];
export type MemoryTag = 'date' | 'food' | 'trip' | 'random';
export type BucketCategory = 'hangout' | 'food' | 'cozy' | 'milestone';
export type NoteColorId = (typeof NOTE_PALETTES)[number]['id'];

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

export type NotificationCategory =
  | 'chat'
  | 'hug'
  | 'mood'
  | 'notes'
  | 'memories'
  | 'dates'
  | 'location'
  | 'anniversary';

export interface NotificationPrefs {
  enabled: boolean;
  chat: boolean;
  hugAndMood: boolean;
  notes: boolean;
  memories: boolean;
  dates: boolean;
  location: boolean;
  anniversary: boolean;
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
