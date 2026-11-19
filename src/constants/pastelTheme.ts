import { Platform } from 'react-native';

/**
 * Artisanal Japanese Stationery & Editorial Monograph Design System for MochiDuo
 * Grounded in Washi Ivory (#F7F3EB), Sumi Charcoal Ink (#1F1B18),
 * Hanko Vermilion (#C84B31), Uji Matcha (#3A6B54), and Sepia Hairlines (#E2D9C8).
 */
export const Pastel = {
  bg: '#F7F3EB',
  bgElevated: '#FCFBF8',
  bgMuted: '#EFE9DC',
  border: '#E2D9C8',
  borderStrong: '#C9BDA7',

  text: '#1F1B18',
  textMuted: '#6B6259',
  textSoft: '#9A9086',

  // Signature Hanko Vermilion (Primary Brand Seal)
  coral: '#C84B31',
  coralDark: '#A63821',
  coralSoft: '#F9EAE4',

  // Prussian Slate Indigo (Blueprint / Secondary Ink — zero neon purple)
  taro: '#475B78',
  taroSoft: '#E9EDF2',

  // Uji Matcha Sage (Live Sync / Location / Completion)
  matcha: '#3A6B54',
  matchaSoft: '#E7F0EA',

  // Amber Ochre (Warm Culinary / Highlights)
  honey: '#B87D28',
  honeySoft: '#FBF1DD',

  // Misty Slate (Travel / Calm)
  sky: '#436E85',
  skySoft: '#E8EFF2',

  // Baked Clay
  peach: '#B85D43',
  peachSoft: '#F8EAE5',

  lemonSoft: '#FAF4DF',
  white: '#FCFBF8',
  pureWhite: '#FFFFFF',
} as const;

export const SerifFont = Platform.select({
  web: "'Newsreader', Georgia, serif",
  default: 'Newsreader_500Medium',
});

export const SerifFontSemi = Platform.select({
  web: "'Newsreader', Georgia, serif",
  default: 'Newsreader_600SemiBold',
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

export const MonoFont = Platform.select({
  web: "'JetBrains Mono', ui-monospace, monospace",
  default: 'JetBrainsMono_500Medium',
});

export const MonoFontBold = Platform.select({
  web: "'JetBrains Mono', ui-monospace, monospace",
  default: 'JetBrainsMono_700Bold',
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
    emoji: '♥',
    label: 'Bucin',
    accent: Pastel.coral,
    bg: Pastel.coralSoft,
    defaultStatus: 'Lagi kepikiran kamu terus hari ini.',
  },
  {
    id: 'miss_you',
    emoji: '☁',
    label: 'Kangen',
    accent: Pastel.taro,
    bg: Pastel.taroSoft,
    defaultStatus: 'Kangen, kapan kita ketemu lagi?',
  },
  {
    id: 'happy',
    emoji: '☀',
    label: 'Happy',
    accent: Pastel.matcha,
    bg: Pastel.matchaSoft,
    defaultStatus: 'Hari ini terasa ringan dan cerah.',
  },
  {
    id: 'hungry',
    emoji: '🍵',
    label: 'Lapar',
    accent: Pastel.honey,
    bg: Pastel.honeySoft,
    defaultStatus: 'Lagi pengen cari makan hangat bareng.',
  },
  {
    id: 'sleepy',
    emoji: '☾',
    label: 'Ngantuk',
    accent: Pastel.sky,
    bg: Pastel.skySoft,
    defaultStatus: 'Energi menipis, butuh istirahat sebentar.',
  },
  {
    id: 'chaotic',
    emoji: '⚡',
    label: 'Random',
    accent: Pastel.peach,
    bg: Pastel.peachSoft,
    defaultStatus: 'Lagi banyak ide random di kepala.',
  },
];

export const MEMORY_TAGS = [
  { id: 'all', label: 'Semua', emoji: 'Semua', bg: Pastel.bgMuted, accent: Pastel.text },
  { id: 'date', label: 'Kencan', emoji: 'Kencan', bg: Pastel.coralSoft, accent: Pastel.coralDark },
  { id: 'food', label: 'Kuliner', emoji: 'Kuliner', bg: Pastel.honeySoft, accent: '#8E5D15' },
  { id: 'trip', label: 'Trip', emoji: 'Trip', bg: Pastel.skySoft, accent: Pastel.sky },
  { id: 'random', label: 'Random', emoji: 'Random', bg: Pastel.taroSoft, accent: Pastel.taro },
] as const;

export const BUCKET_CATEGORIES = [
  { id: 'hangout', label: 'Jalan-jalan', emoji: 'Jalan', bg: Pastel.skySoft, accent: Pastel.sky },
  { id: 'food', label: 'Kulineran', emoji: 'Kuliner', bg: Pastel.honeySoft, accent: '#8E5D15' },
  { id: 'cozy', label: 'Cozy di Rumah', emoji: 'Cozy', bg: Pastel.matchaSoft, accent: Pastel.matcha },
  { id: 'milestone', label: 'Impian Besar', emoji: 'Impian', bg: Pastel.coralSoft, accent: Pastel.coralDark },
] as const;

export const NOTE_PALETTES = [
  { id: 'pink', bg: '#FBF1EE', border: '#E4C7BE', accent: '#A63821', label: 'Persimmon' },
  { id: 'lemon', bg: '#FAF4DF', border: '#E3D5A9', accent: '#8C621B', label: 'Kinari' },
  { id: 'lavender', bg: '#ECEFF4', border: '#C7D0DC', accent: '#3F526D', label: 'Slate' },
  { id: 'mint', bg: '#EBF2ED', border: '#C2D5C7', accent: '#2E5A45', label: 'Matcha' },
  { id: 'peach', bg: '#F7EFE8', border: '#DFC7B6', accent: '#9B4D35', label: 'Clay' },
] as const;
