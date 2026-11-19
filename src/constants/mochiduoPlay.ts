import type {
  MochiAccessoryId,
  MochiSkinId,
  PartnerId,
  SuitChoice,
  TttCell,
} from '@/types/couple';
import { getLocalDateKey, parseLocalDate, shiftDateKey } from '@/utils/dateCalc';

export const STARTER_MOCHI_COINS = 0;

export interface MochiSkinSpec {
  id: MochiSkinId;
  name: string;
  emoji: string;
  price: number;
  top: string;
  bottom: string;
  shadow: string;
  pillBg: string;
  accent: string;
}

export const MOCHI_SKINS: MochiSkinSpec[] = [
  {
    id: 'peach',
    name: 'Peach Milk',
    emoji: '🍑',
    price: 0,
    top: '#FFF5EB',
    bottom: '#FFE0C7',
    shadow: '#EDD3C6',
    pillBg: '#FFF2EC',
    accent: '#E05A33',
  },
  {
    id: 'matcha',
    name: 'Mint Matcha',
    emoji: '🍵',
    price: 0,
    top: '#E8F7ED',
    bottom: '#C2E5CE',
    shadow: '#BBDAC7',
    pillBg: '#EBF8F3',
    accent: '#1B8F67',
  },
  {
    id: 'strawberry',
    name: 'Strawberry Milk',
    emoji: '🍓',
    price: 180,
    top: '#FFF0F5',
    bottom: '#FFC8DA',
    shadow: '#F0B6C9',
    pillBg: '#FFF0F3',
    accent: '#E04260',
  },
  {
    id: 'taro',
    name: 'Taro Velvet',
    emoji: '🍠',
    price: 240,
    top: '#F5F0FF',
    bottom: '#D8CBFF',
    shadow: '#C6B6F2',
    pillBg: '#F3F0FF',
    accent: '#6B4EFF',
  },
  {
    id: 'honey',
    name: 'Honey Lemon',
    emoji: '🍯',
    price: 300,
    top: '#FFFCE8',
    bottom: '#FFE396',
    shadow: '#EBCE7A',
    pillBg: '#FFF7E6',
    accent: '#B86E00',
  },
  {
    id: 'choco',
    name: 'Choco Boba',
    emoji: '🧋',
    price: 380,
    top: '#F6EAE2',
    bottom: '#D9B8A6',
    shadow: '#C3A18F',
    pillBg: '#F5ECE6',
    accent: '#7C4D34',
  },
];

export interface MochiAccessorySpec {
  id: MochiAccessoryId;
  name: string;
  emoji: string;
  price: number;
  desc: string;
}

export const MOCHI_ACCESSORIES: MochiAccessorySpec[] = [
  {
    id: 'none',
    name: 'Polos Lucu',
    emoji: '✨',
    price: 0,
    desc: 'Gaya klasik tanpa aksesori',
  },
  {
    id: 'bow',
    name: 'Pita Stroberi',
    emoji: '🎀',
    price: 160,
    desc: 'Pita imut di sisi kepala mochi',
  },
  {
    id: 'cat_ears',
    name: 'Kuping Kucing',
    emoji: '🐱',
    price: 220,
    desc: 'Telinga neko lembut & gemas',
  },
  {
    id: 'beret',
    name: 'Topi Baret',
    emoji: '🎨',
    price: 280,
    desc: 'Vibe estetik ala seniman Paris',
  },
  {
    id: 'shades',
    name: 'Kacamata Kece',
    emoji: '😎',
    price: 340,
    desc: 'Auto keren pas lagi kencan',
  },
  {
    id: 'headphone',
    name: 'Headphone Cozy',
    emoji: '🎧',
    price: 420,
    desc: 'Dengerin lagu favorit berdua',
  },
  {
    id: 'crown',
    name: 'Mahkota Mini',
    emoji: '👑',
    price: 550,
    desc: 'Khusus raja & ratu MochiDuo',
  },
];

export function getMochiSkinSpec(skinId?: MochiSkinId, fallbackHex?: string): MochiSkinSpec {
  if (skinId) {
    const found = MOCHI_SKINS.find((s) => s.id === skinId);
    if (found) return found;
  }
  const upper = (fallbackHex ?? '').toUpperCase();
  if (
    upper === '#DCE5D1' ||
    upper === '#EFEAFF' ||
    upper === '#E1F5EC' ||
    upper === '#D8F0E3'
  ) {
    return MOCHI_SKINS[1]; // matcha
  }
  return MOCHI_SKINS[0]; // peach
}

export function getMochiAccessorySpec(id?: MochiAccessoryId): MochiAccessorySpec {
  return MOCHI_ACCESSORIES.find((a) => a.id === id) ?? MOCHI_ACCESSORIES[0];
}

export type DailyQuestionCategory = 'Romantis' | 'Lucu' | 'Deep Talk' | 'Impian';

export interface DailyQuestionItem {
  id: string;
  category: DailyQuestionCategory;
  emoji: string;
  prompt: string;
}

export const DAILY_QUESTIONS: DailyQuestionItem[] = [
  {
    id: 'q-1',
    category: 'Romantis',
    emoji: '💕',
    prompt: 'Hal kecil apa dari pasanganmu minggu ini yang diam-diam bikin kamu senyum sendiri?',
  },
  {
    id: 'q-2',
    category: 'Lucu',
    emoji: '🍜',
    prompt: 'Kalau sekarang tiba-tiba boleh pesan makanan favorit buat berdua gratis, kamu pilih apa?',
  },
  {
    id: 'q-3',
    category: 'Deep Talk',
    emoji: '🌙',
    prompt: 'Momen apa yang paling bikin kamu ngerasa aman dan nyaman pas lagi bareng kita berdua?',
  },
  {
    id: 'q-4',
    category: 'Impian',
    emoji: '✈️',
    prompt: 'Satu kota atau negara impian yang paling pengen kamu kunjungi bareng pasanganmu?',
  },
  {
    id: 'q-5',
    category: 'Lucu',
    emoji: '🐱',
    prompt: 'Kalau pasanganmu berubah jadi hewan menggemaskan, kira-kira jadi hewan apa dan kenapa?',
  },
  {
    id: 'q-6',
    category: 'Romantis',
    emoji: '🎧',
    prompt: 'Lagu apa yang paling ngingetin kamu ke pasanganmu akhir-akhir ini?',
  },
  {
    id: 'q-7',
    category: 'Deep Talk',
    emoji: '☕',
    prompt: 'Cara paling ampuh buat bikin mood kamu balik ceria lagi saat lagi capek banget?',
  },
  {
    id: 'q-8',
    category: 'Impian',
    emoji: '🏡',
    prompt: 'Satu kebiasaan lucu yang pengen kamu lakuin tiap pagi kalau nanti udah tinggal bareng?',
  },
  {
    id: 'q-9',
    category: 'Lucu',
    emoji: '🧋',
    prompt: 'Kalau kita buka kedai minuman berdua, nama menu andalan kita bakal dinamain apa?',
  },
  {
    id: 'q-10',
    category: 'Romantis',
    emoji: '📸',
    prompt: 'Foto atau kenangan mana di hidup kita yang pengen banget kamu ulang lagi harinya?',
  },
  {
    id: 'q-11',
    category: 'Deep Talk',
    emoji: '🫂',
    prompt: 'Hal apa yang paling kamu syukuri dari hubungan kita sampai hari ini?',
  },
  {
    id: 'q-12',
    category: 'Impian',
    emoji: '🎡',
    prompt: 'Ide kencan sederhana di bawah Rp50rb yang menurutmu bakal paling berkesan?',
  },
  {
    id: 'q-13',
    category: 'Lucu',
    emoji: '🎬',
    prompt: 'Kalau kisah cinta kita dijadiin film, kira-kira genrenya apa dan judulnya apa?',
  },
  {
    id: 'q-14',
    category: 'Romantis',
    emoji: '🌷',
    prompt: 'Tiga kata yang paling ngegambarin perasaanmu ke pasangan hari ini?',
  },
  {
    id: 'q-15',
    category: 'Deep Talk',
    emoji: '💬',
    prompt: 'Sifat pasanganmu mana yang paling kamu kagumi tapi jarang kamu bilang langsung?',
  },
  {
    id: 'q-16',
    category: 'Impian',
    emoji: '🛵',
    prompt: 'Road trip mendadak akhir pekan ini enaknya kabur ke mana berdua?',
  },
  {
    id: 'q-17',
    category: 'Lucu',
    emoji: '🍕',
    prompt: 'Siapa yang paling gampang ngambek kalau lagi laper banget? Jujur ya!',
  },
  {
    id: 'q-18',
    category: 'Romantis',
    emoji: '💌',
    prompt: 'Satu kalimat penyemangat singkat yang pengen kamu titipin ke pasangan buat besok pagi?',
  },
  {
    id: 'q-19',
    category: 'Deep Talk',
    emoji: '⭐',
    prompt: 'Apa hal baru yang pengen kita pelajari atau coba bareng tahun ini?',
  },
  {
    id: 'q-20',
    category: 'Impian',
    emoji: '🧁',
    prompt: 'Kalau besok kita punya 1 hari libur penuh tanpa gadget lain, kita ngapain aja seharian?',
  },
  {
    id: 'q-21',
    category: 'Lucu',
    emoji: '🎮',
    prompt: 'Di antara kalian berdua, siapa yang paling kompetitif kalau lagi main game?',
  },
  {
    id: 'q-22',
    category: 'Romantis',
    emoji: '🌅',
    prompt: 'First impression kamu dulu pas pertama kali kenal/ketemu pasanganmu masih inget gak?',
  },
  {
    id: 'q-23',
    category: 'Deep Talk',
    emoji: '🌈',
    prompt: 'Apa ketakutan kecil atau kekhawatiran yang pengen kamu bagi supaya terasa lebih ringan?',
  },
  {
    id: 'q-24',
    category: 'Impian',
    emoji: '🎨',
    prompt: 'Aktivitas kreatif berdua apa yang pengen kita lakuin pas kencan berikutnya?',
  },
];

export function getDailyQuestion(dateKey: string = getLocalDateKey()): DailyQuestionItem {
  const dateObj = parseLocalDate(dateKey);
  const daysSinceEpoch = Math.floor(dateObj.getTime() / 86400000);
  const idx = ((daysSinceEpoch % DAILY_QUESTIONS.length) + DAILY_QUESTIONS.length) % DAILY_QUESTIONS.length;
  return DAILY_QUESTIONS[idx];
}

export function getDailyQuestionById(id: string, fallbackDateKey?: string): DailyQuestionItem {
  return (
    DAILY_QUESTIONS.find((q) => q.id === id) ??
    (fallbackDateKey ? getDailyQuestion(fallbackDateKey) : DAILY_QUESTIONS[0])
  );
}

export function computeCoupleStreak(
  p1Days: string[] | undefined,
  p2Days: string[] | undefined,
  todayKey: string = getLocalDateKey()
): {
  streak: number;
  p1CheckedToday: boolean;
  p2CheckedToday: boolean;
  anyCheckedToday: boolean;
  bothCheckedToday: boolean;
  statusText: string;
} {
  const set1 = new Set(p1Days ?? []);
  const set2 = new Set(p2Days ?? []);
  const union = new Set([...set1, ...set2]);

  const p1CheckedToday = set1.has(todayKey);
  const p2CheckedToday = set2.has(todayKey);
  const anyCheckedToday = p1CheckedToday || p2CheckedToday;
  const bothCheckedToday = p1CheckedToday && p2CheckedToday;

  let streak = 0;
  let cursor = anyCheckedToday ? todayKey : shiftDateKey(todayKey, -1);

  while (union.has(cursor) && streak < 365) {
    streak += 1;
    cursor = shiftDateKey(cursor, -1);
  }

  let statusText = 'Absen harian hari ini buat mulai streak 🔥';
  if (bothCheckedToday) {
    statusText = 'Kompak berdua hari ini ✨';
  } else if (anyCheckedToday) {
    statusText = '1 udah aktif hari ini · ajak pasangan ikutan!';
  } else if (streak > 0) {
    statusText = `Jaga streak ${streak} hari jangan sampai putus!`;
  }

  return {
    streak,
    p1CheckedToday,
    p2CheckedToday,
    anyCheckedToday,
    bothCheckedToday,
    statusText,
  };
}

export const SUIT_CHOICES: { id: SuitChoice; label: string; emoji: string }[] = [
  { id: 'rock', label: 'Batu', emoji: '✊' },
  { id: 'paper', label: 'Kertas', emoji: '✋' },
  { id: 'scissors', label: 'Gunting', emoji: '✌️' },
];

export const SUIT_PRESET_STAKES = [
  'Traktir Boba / Kopi 🧋',
  'Pijitin Bahu 10 Menit 💆',
  'Yang Kalah Masak / Beliin Makan 🍜',
  'Kirim Voice Note Gombal 🎙️',
];

export function resolveSuitWinner(
  p1Choice: SuitChoice,
  p2Choice: SuitChoice
): PartnerId | 'draw' {
  if (p1Choice === p2Choice) return 'draw';
  if (
    (p1Choice === 'rock' && p2Choice === 'scissors') ||
    (p1Choice === 'paper' && p2Choice === 'rock') ||
    (p1Choice === 'scissors' && p2Choice === 'paper')
  ) {
    return 'p1';
  }
  return 'p2';
}

export function pickRandomSuitChoice(): SuitChoice {
  const choices: SuitChoice[] = ['rock', 'paper', 'scissors'];
  return choices[Math.floor(Math.random() * choices.length)];
}

const TTT_LINES: number[][] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export function checkTttWinner(board: TttCell[]): {
  winner: PartnerId | 'draw' | null;
  line: number[] | null;
} {
  for (const line of TTT_LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line };
    }
  }
  if (board.every((cell) => cell !== null)) {
    return { winner: 'draw', line: null };
  }
  return { winner: null, line: null };
}

export function pickBotTttMove(board: TttCell[], botId: PartnerId): number {
  const humanId: PartnerId = botId === 'p1' ? 'p2' : 'p1';
  const emptyIndices = board
    .map((v, idx) => (v === null ? idx : -1))
    .filter((idx) => idx !== -1);

  if (emptyIndices.length === 0) return -1;

  // 1. Win if possible
  for (const idx of emptyIndices) {
    const copy = [...board];
    copy[idx] = botId;
    if (checkTttWinner(copy).winner === botId) return idx;
  }

  // 2. Block human win
  for (const idx of emptyIndices) {
    const copy = [...board];
    copy[idx] = humanId;
    if (checkTttWinner(copy).winner === humanId) return idx;
  }

  // 3. Take center sometimes (80% smart, 20% playful so user can win)
  if (board[4] === null && Math.random() < 0.8) {
    return 4;
  }

  // 4. Take random corner if available
  const corners = [0, 2, 6, 8].filter((i) => board[i] === null);
  if (corners.length > 0 && Math.random() < 0.75) {
    return corners[Math.floor(Math.random() * corners.length)];
  }

  return emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
}

export const MEMORY_PAIR_EMOJIS = ['🍓', '🧋', '🐱', '🎀', '👑', '💕'] as const;

export interface MemoryCardItem {
  uid: string;
  pairId: string;
  emoji: string;
  matchedBy?: PartnerId;
}

export function createShuffledMemoryDeck(): MemoryCardItem[] {
  const doubled: MemoryCardItem[] = MEMORY_PAIR_EMOJIS.flatMap((emoji, idx) => [
    { uid: `mem-${idx}-a`, pairId: emoji, emoji },
    { uid: `mem-${idx}-b`, pairId: emoji, emoji },
  ]);
  for (let i = doubled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [doubled[i], doubled[j]] = [doubled[j], doubled[i]];
  }
  return doubled;
}

export type CatchItemKind = 'mochi' | 'crown' | 'bomb';

export interface CatchSlotState {
  kind: CatchItemKind;
  emoji: string;
  points: number;
}

const CATCH_MOCHI_EMOJIS = ['🍑', '🍵', '🍓', '🍠'] as const;

export function pickRandomCatchSlot(): CatchSlotState {
  const roll = Math.random();
  if (roll < 0.18) {
    return { kind: 'crown', emoji: '👑', points: 3 };
  }
  if (roll < 0.36) {
    return { kind: 'bomb', emoji: '🌶️', points: -2 };
  }
  const emoji = CATCH_MOCHI_EMOJIS[Math.floor(Math.random() * CATCH_MOCHI_EMOJIS.length)];
  return { kind: 'mochi', emoji, points: 1 };
}

