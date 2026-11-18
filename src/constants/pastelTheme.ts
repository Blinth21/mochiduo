import { Platform } from 'react-native';

export const Pastel = {
  bg: '#FFF9F5',
  bgElevated: '#FFFFFF',
  border: '#F2E4DC',
  borderStrong: '#E7D1C5',

  text: '#2D2235',
  textMuted: '#786A80',
  textSoft: '#A698AD',

  // Brand & Playful Accents
  coral: '#FF6B8B',
  coralDark: '#E64D70',
  coralSoft: '#FFE8EE',

  taro: '#8B74FF',
  taroSoft: '#EFEAFF',

  matcha: '#2FC496',
  matchaSoft: '#E3FAF2',

  honey: '#FFB347',
  honeySoft: '#FFF4DC',

  sky: '#4FB3FF',
  skySoft: '#E5F4FF',

  peach: '#FF9472',
  peachSoft: '#FFEDE5',

  lemonSoft: '#FFF9D6',
  white: '#FFFFFF',
} as const;

export const RoundedFont = Platform.select({
  ios: 'ui-rounded',
  android: 'sans-serif-medium',
  web: "'Nunito', 'Quicksand', 'SF Pro Rounded', ui-rounded, system-ui, sans-serif",
  default: 'System',
});

export const MonoFont = Platform.select({
  ios: 'ui-monospace',
  android: 'monospace',
  web: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  default: 'monospace',
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
    accent: Pastel.coral,
    bg: Pastel.coralSoft,
    defaultStatus: 'Lagi sayang banget sama kamu!',
  },
  {
    id: 'miss_you',
    emoji: '🥺',
    label: 'Kangen',
    accent: Pastel.taro,
    bg: Pastel.taroSoft,
    defaultStatus: 'Kangen... kapan ketemu lagi?',
  },
  {
    id: 'happy',
    emoji: '✨',
    label: 'Happy',
    accent: Pastel.matcha,
    bg: Pastel.matchaSoft,
    defaultStatus: 'Mood hari ini cerah banget!',
  },
  {
    id: 'hungry',
    emoji: '🧋',
    label: 'Lapar',
    accent: Pastel.honey,
    bg: Pastel.honeySoft,
    defaultStatus: 'Pengen jajan boba atau seblak~',
  },
  {
    id: 'sleepy',
    emoji: '😴',
    label: 'Ngantuk',
    accent: Pastel.sky,
    bg: Pastel.skySoft,
    defaultStatus: 'Lowbat nih, butuh peluk dulu...',
  },
  {
    id: 'chaotic',
    emoji: '🤪',
    label: 'Random',
    accent: Pastel.peach,
    bg: Pastel.peachSoft,
    defaultStatus: 'Otak lagi mode kocak hari ini!',
  },
];

export const MEMORY_TAGS = [
  { id: 'all', label: 'Semua', emoji: '🌈', bg: Pastel.bgElevated, accent: Pastel.text },
  { id: 'date', label: 'Kencan', emoji: '💕', bg: Pastel.coralSoft, accent: Pastel.coral },
  { id: 'food', label: 'Kuliner', emoji: '🍜', bg: Pastel.honeySoft, accent: '#D97B00' },
  { id: 'trip', label: 'Trip', emoji: '🛵', bg: Pastel.skySoft, accent: '#1B82D6' },
  { id: 'random', label: 'Random', emoji: '📸', bg: Pastel.taroSoft, accent: Pastel.taro },
] as const;

export const BUCKET_CATEGORIES = [
  { id: 'hangout', label: 'Jalan-jalan', emoji: '🎡', bg: Pastel.skySoft, accent: '#1B82D6' },
  { id: 'food', label: 'Kulineran', emoji: '🍰', bg: Pastel.honeySoft, accent: '#D97B00' },
  { id: 'cozy', label: 'Cozy di Rumah', emoji: '🍿', bg: Pastel.taroSoft, accent: Pastel.taro },
  { id: 'milestone', label: 'Impian Besar', emoji: '🌟', bg: Pastel.coralSoft, accent: Pastel.coral },
] as const;

export const NOTE_PALETTES = [
  { id: 'pink', bg: '#FFE8F0', border: '#FFC7DC', accent: '#E64D70', label: 'Strawberry' },
  { id: 'lemon', bg: '#FFF7D6', border: '#FBE594', accent: '#C68500', label: 'Butter' },
  { id: 'lavender', bg: '#EFEAFF', border: '#D4C7FF', accent: '#6F54F5', label: 'Taro' },
  { id: 'mint', bg: '#E3FAF2', border: '#B5EED9', accent: '#199E74', label: 'Matcha' },
  { id: 'peach', bg: '#FFEDE5', border: '#FFD1BD', accent: '#DF643B', label: 'Peach' },
] as const;
