import { Platform } from 'react-native';

/**
 * Clean & Cute Soft Bento Design System for MochiDuo
 * Inspired by modern Dribbble lifestyle/couple apps (Paperpillar, SumOne, iOS Bento):
 * Airy cloud canvas (#F5F6FA), borderless pure white cards (#FFFFFF), soft ambient shadows,
 * zero harsh outline strokes, and one crisp geometric rounded sans family (Plus Jakarta Sans).
 */
export const Pastel = {
  bg: '#F5F6FA',
  bgElevated: '#FFFFFF',
  bgMuted: '#EEF1F6',
  border: '#ECEFF5',
  borderStrong: '#E2E6F0',

  text: '#1C1E26',
  textMuted: '#687082',
  textSoft: '#9BA3B5',

  // Primary Cheerful Rose-Coral
  coral: '#FF5C7A',
  coralDark: '#E04260',
  coralSoft: '#FFF0F3',

  // Soft Lilac-Indigo
  taro: '#7B61FF',
  taroSoft: '#F3F0FF',

  // Fresh Mint-Sage
  matcha: '#22A87A',
  matchaSoft: '#EBF8F3',

  // Warm Honey-Butter
  honey: '#F59E0B',
  honeyDark: '#B86E00',
  honeySoft: '#FFF7E6',

  // Soft Sky Blue
  sky: '#4B8BF5',
  skySoft: '#EEF5FF',

  // Warm Peach
  peach: '#FF7D59',
  peachSoft: '#FFF2EC',

  lemonSoft: '#FFF9E5',
  white: '#FFFFFF',
  pureWhite: '#FFFFFF',
} as const;

export const SoftShadow = Platform.select({
  ios: {
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
  },
  android: {
    elevation: 2,
  },
  default: {
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
  },
});

export const SoftShadowSm = Platform.select({
  ios: {
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
  },
  android: {
    elevation: 1,
  },
  default: {
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
  },
});

export const BodyFontRegular = Platform.select({
  web: "'Plus Jakarta Sans', system-ui, sans-serif",
  default: 'PlusJakartaSans_400Regular',
});

export const RoundedFont = Platform.select({
  web: "'Plus Jakarta Sans', system-ui, sans-serif",
  default: 'PlusJakartaSans_500Medium',
});

export const BodyFontSemi = Platform.select({
  web: "'Plus Jakarta Sans', system-ui, sans-serif",
  default: 'PlusJakartaSans_600SemiBold',
});

export const BodyFontBold = Platform.select({
  web: "'Plus Jakarta Sans', system-ui, sans-serif",
  default: 'PlusJakartaSans_700Bold',
});

export interface MoodOption {
  id: 'happy' | 'in_love' | 'miss_you' | 'hungry' | 'sleepy' | 'chaotic';
  emoji: string;
  label: string;
  accent: string;
  bg: string;
  defaultStatus: string;
}

export const MOOD_OPTIONS: MoodOption[] = [
  {
    id: 'in_love',
    emoji: '🥰',
    label: 'Bucin',
    accent: Pastel.coralDark,
    bg: Pastel.coralSoft,
    defaultStatus: 'Lagi kepikiran kamu terus hari ini.',
  },
  {
    id: 'miss_you',
    emoji: '🥺',
    label: 'Kangen',
    accent: Pastel.taro,
    bg: Pastel.taroSoft,
    defaultStatus: 'Kangen banget, kapan kita ketemu lagi?',
  },
  {
    id: 'happy',
    emoji: '😊',
    label: 'Happy',
    accent: Pastel.matcha,
    bg: Pastel.matchaSoft,
    defaultStatus: 'Hari ini terasa ringan dan ceria!',
  },
  {
    id: 'hungry',
    emoji: '🍜',
    label: 'Lapar',
    accent: Pastel.honeyDark,
    bg: Pastel.honeySoft,
    defaultStatus: 'Pengen cari makan enak bareng kamu.',
  },
  {
    id: 'sleepy',
    emoji: '😴',
    label: 'Ngantuk',
    accent: Pastel.sky,
    bg: Pastel.skySoft,
    defaultStatus: 'Energi menipis, butuh istirahat sebentar.',
  },
  {
    id: 'chaotic',
    emoji: '✨',
    label: 'Random',
    accent: Pastel.peach,
    bg: Pastel.peachSoft,
    defaultStatus: 'Lagi banyak ide random di kepala.',
  },
];

export const MEMORY_TAGS = [
  { id: 'all', label: 'Semua', emoji: '✨', bg: Pastel.bgMuted, accent: Pastel.text },
  { id: 'date', label: 'Kencan', emoji: '💕', bg: Pastel.coralSoft, accent: Pastel.coralDark },
  { id: 'food', label: 'Kuliner', emoji: '🍜', bg: Pastel.honeySoft, accent: Pastel.honeyDark },
  { id: 'trip', label: 'Trip', emoji: '🛵', bg: Pastel.skySoft, accent: Pastel.sky },
  { id: 'random', label: 'Random', emoji: '🎀', bg: Pastel.taroSoft, accent: Pastel.taro },
] as const;

export const BUCKET_CATEGORIES = [
  { id: 'hangout', label: 'Jalan-jalan', emoji: '🎡', bg: Pastel.skySoft, accent: Pastel.sky },
  { id: 'food', label: 'Kulineran', emoji: '🍦', bg: Pastel.honeySoft, accent: Pastel.honeyDark },
  { id: 'cozy', label: 'Cozy di Rumah', emoji: '🛋️', bg: Pastel.matchaSoft, accent: Pastel.matcha },
  { id: 'milestone', label: 'Impian Besar', emoji: '🌟', bg: Pastel.coralSoft, accent: Pastel.coralDark },
] as const;

export const NOTE_PALETTES = [
  { id: 'pink', bg: '#FFF0F3', border: 'transparent', accent: '#E04260', label: 'Rose' },
  { id: 'lemon', bg: '#FFF7E5', border: 'transparent', accent: '#B86E00', label: 'Butter' },
  { id: 'lavender', bg: '#F3F0FF', border: 'transparent', accent: '#6B4EFF', label: 'Lilac' },
  { id: 'mint', bg: '#EBF8F3', border: 'transparent', accent: '#1B8F67', label: 'Mint' },
  { id: 'peach', bg: '#FFF2EC', border: 'transparent', accent: '#E05A33', label: 'Peach' },
] as const;
