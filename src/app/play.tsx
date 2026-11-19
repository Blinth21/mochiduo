import {
  Check,
  Coins,
  Eye,
  Flame,
  Gift,
  Play,
  RefreshCw,
  ShoppingBag,
  Timer,
  Trophy,
  X,
} from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BouncyPressable } from '@/components/BouncyPressable';
import { MochiMascot } from '@/components/MochiMascot';
import {
  MOCHI_ACCESSORIES,
  MOCHI_SKINS,
  type MemoryCardItem,
  SUIT_CHOICES,
  SUIT_PRESET_STAKES,
  computeCoupleStreak,
  createShuffledMemoryDeck,
  getMochiSkinSpec,
} from '@/constants/mochiduoPlay';
import {
  BodyFontBold,
  BodyFontSemi,
  Pastel,
  RoundedFont,
  SoftShadow,
  SoftShadowSm,
} from '@/constants/pastelTheme';
import {
  getProfileAccessory,
  getProfileCoins,
  getProfileSkin,
  getUnlockedAccessories,
  getUnlockedSkins,
  useCoupleStore,
} from '@/store/useCoupleStore';
import type {
  MochiAccessoryId,
  MochiSkinId,
  PartnerId,
  PlaySectionTab,
  SuitChoice,
} from '@/types/couple';
import { getLocalDateKey } from '@/utils/dateCalc';
import { triggerMediumHaptic, triggerSuccessHaptic } from '@/utils/haptics';

const SECTION_TABS: { id: PlaySectionTab; label: string; emoji: string }[] = [
  { id: 'suit', label: 'Suit', emoji: '✌️' },
  { id: 'ttt', label: 'XOXO', emoji: '⭕' },
  { id: 'memory', label: 'Memori', emoji: '🃏' },
  { id: 'catch', label: 'Tangkap', emoji: '🧁' },
  { id: 'shop', label: 'Toko', emoji: '🎨' },
];

const TTT_ROWS = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
] as const;

const MEMORY_ROWS = [
  [0, 1, 2, 3],
  [4, 5, 6, 7],
  [8, 9, 10, 11],
] as const;

export default function MochiPlayScreen() {
  const activeTab = useCoupleStore((s) => s.playSectionTab);
  const setActiveTab = useCoupleStore((s) => s.setPlaySectionTab);

  const [shopTarget, setShopTarget] = useState<'self' | 'gift'>('self');
  const [previewSkinState, setPreviewSkinState] = useState<{
    forId: PartnerId;
    id: MochiSkinId;
  } | null>(null);
  const [previewAccState, setPreviewAccState] = useState<{
    forId: PartnerId;
    id: MochiAccessoryId;
  } | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Mini-game 3: Mochi Memori (4x3 flip cards)
  const [memMode, setMemMode] = useState<'solo' | 'local'>('solo');
  const [memDeck, setMemDeck] = useState<MemoryCardItem[]>(() =>
    createShuffledMemoryDeck()
  );
  const [memFlipped, setMemFlipped] = useState<number[]>([]);
  const [memMoves, setMemMoves] = useState(0);
  const [memTurn, setMemTurn] = useState<PartnerId>('p1');
  const [memScores, setMemScores] = useState<Record<PartnerId, number>>({
    p1: 0,
    p2: 0,
  });
  const [memEarnedCoins, setMemEarnedCoins] = useState<number | null>(null);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates?.height ?? 0);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const activePartnerId = useCoupleStore((s) => s.activePartnerId);
  const p1 = useCoupleStore((s) => s.partners.p1);
  const p2 = useCoupleStore((s) => s.partners.p2);
  const syncConfig = useCoupleStore((s) => s.syncConfig);
  const syncStatus = useCoupleStore((s) => s.syncStatus);
  const suitGame = useCoupleStore((s) => s.suitGame);
  const tttGame = useCoupleStore((s) => s.tttGame);
  const catchGame = useCoupleStore((s) => s.catchGame);
  const bestCatchScore = useCoupleStore((s) => s.bestCatchScore);

  const buyShopItem = useCoupleStore((s) => s.buyShopItem);
  const equipShopItem = useCoupleStore((s) => s.equipShopItem);
  const setSuitMode = useCoupleStore((s) => s.setSuitMode);
  const setSuitStake = useCoupleStore((s) => s.setSuitStake);
  const pickSuitChoice = useCoupleStore((s) => s.pickSuitChoice);
  const resetSuitRound = useCoupleStore((s) => s.resetSuitRound);
  const setTttMode = useCoupleStore((s) => s.setTttMode);
  const makeTttMove = useCoupleStore((s) => s.makeTttMove);
  const resetTttMatch = useCoupleStore((s) => s.resetTttMatch);
  const recordMiniGameReward = useCoupleStore((s) => s.recordMiniGameReward);
  const startCatchGame = useCoupleStore((s) => s.startCatchGame);
  const stopCatchGame = useCoupleStore((s) => s.stopCatchGame);
  const spawnCatchSlots = useCoupleStore((s) => s.spawnCatchSlots);
  const tapCatchSlot = useCoupleStore((s) => s.tapCatchSlot);
  const tickCatchSecond = useCoupleStore((s) => s.tickCatchSecond);
  const pushFeatureNotification = useCoupleStore((s) => s.pushFeatureNotification);

  // Flip mismatched Memori cards back cleanly without refs
  useEffect(() => {
    if (memFlipped.length !== 2) return;
    const [firstIdx, secondIdx] = memFlipped;
    if (memDeck[firstIdx]?.pairId === memDeck[secondIdx]?.pairId) return;

    const timer = setTimeout(() => {
      setMemFlipped([]);
      if (memMode === 'local') {
        setMemTurn((prevTurn) => (prevTurn === 'p1' ? 'p2' : 'p1'));
      }
    }, 680);

    return () => clearTimeout(timer);
  }, [memDeck, memFlipped, memMode]);

  // Run Tangkap Mochi timers cleanly via Zustand actions
  useEffect(() => {
    if (catchGame.phase !== 'playing') return;

    const spawnTimer = setInterval(() => {
      spawnCatchSlots();
    }, 680);

    const countdownTimer = setInterval(() => {
      const finished = tickCatchSecond();
      if (finished) {
        triggerSuccessHaptic();
      }
    }, 1000);

    return () => {
      clearInterval(spawnTimer);
      clearInterval(countdownTimer);
    };
  }, [catchGame.phase, spawnCatchSlots, tickCatchSecond]);

  const resetMemoryGame = (nextMode?: 'solo' | 'local') => {
    if (nextMode) setMemMode(nextMode);
    setMemDeck(createShuffledMemoryDeck());
    setMemFlipped([]);
    setMemMoves(0);
    setMemTurn(activePartnerId);
    setMemScores({ p1: 0, p2: 0 });
    setMemEarnedCoins(null);
  };

  const handleFlipMemoryCard = (idx: number) => {
    const card = memDeck[idx];
    if (!card || card.matchedBy || memFlipped.length >= 2 || memFlipped.includes(idx)) {
      return;
    }
    triggerMediumHaptic();

    if (memFlipped.length === 0) {
      setMemFlipped([idx]);
      return;
    }

    const firstIdx = memFlipped[0];
    setMemFlipped([firstIdx, idx]);
    const nextMoves = memMoves + 1;
    setMemMoves(nextMoves);

    if (memDeck[firstIdx].pairId === card.pairId) {
      const owner: PartnerId = memMode === 'solo' ? activePartnerId : memTurn;
      const updatedDeck = memDeck.map((c, i) =>
        i === firstIdx || i === idx ? { ...c, matchedBy: owner } : c
      );
      setMemDeck(updatedDeck);
      setMemFlipped([]);
      if (memMode === 'local') {
        setMemScores((prev) => ({ ...prev, [owner]: prev[owner] + 1 }));
      }
      triggerSuccessHaptic();

      if (updatedDeck.every((c) => Boolean(c.matchedBy))) {
        const coins = memMode === 'solo' ? (nextMoves <= 9 ? 30 : 25) : 25;
        setMemEarnedCoins(coins);
        recordMiniGameReward(activePartnerId, coins);
      }
    }
  };

  const handleStartCatch = () => {
    triggerSuccessHaptic();
    startCatchGame();
  };

  const handleTapCatchHole = (idx: number) => {
    const outcome = tapCatchSlot(idx);
    if (outcome === 'positive') {
      triggerSuccessHaptic();
    } else if (outcome === 'negative') {
      triggerMediumHaptic();
    }
  };

  const me = activePartnerId === 'p1' ? p1 : p2;
  const otherId: PartnerId = activePartnerId === 'p1' ? 'p2' : 'p1';
  const other = activePartnerId === 'p1' ? p2 : p1;
  const recipientId: PartnerId = shopTarget === 'self' ? activePartnerId : otherId;
  const recipient = recipientId === 'p1' ? p1 : p2;

  const myCoins = getProfileCoins(me);
  const todayKey = getLocalDateKey();
  const streakInfo = useMemo(
    () => computeCoupleStreak(p1.activeDays, p2.activeDays, todayKey),
    [p1.activeDays, p2.activeDays, todayKey]
  );

  const isLiveConnected = syncConfig.enabled && syncStatus === 'connected';

  // Shop handlers
  const recipientSkins = getUnlockedSkins(recipient);
  const recipientAccessories = getUnlockedAccessories(recipient);
  const recipientEquippedSkin = getProfileSkin(recipient);
  const recipientEquippedAcc = getProfileAccessory(recipient);

  const previewSkinId =
    previewSkinState &&
    previewSkinState.forId === recipientId &&
    !recipientSkins.includes(previewSkinState.id)
      ? previewSkinState.id
      : null;

  const previewAccId =
    previewAccState &&
    previewAccState.forId === recipientId &&
    !recipientAccessories.includes(previewAccState.id)
      ? previewAccState.id
      : null;

  const setPreviewSkinId = (next: MochiSkinId | null) =>
    setPreviewSkinState(next ? { forId: recipientId, id: next } : null);
  const setPreviewAccId = (next: MochiAccessoryId | null) =>
    setPreviewAccState(next ? { forId: recipientId, id: next } : null);

  const handleShopCardPress = (kind: 'skin' | 'accessory', itemId: string) => {
    const isOwned =
      kind === 'skin'
        ? recipientSkins.includes(itemId as MochiSkinId)
        : recipientAccessories.includes(itemId as MochiAccessoryId);

    triggerMediumHaptic();

    if (isOwned) {
      if (kind === 'skin') {
        setPreviewSkinState(null);
      } else {
        setPreviewAccState(null);
      }
      equipShopItem(recipientId, kind, itemId);
      return;
    }

    // Not owned: preview only without charging coins
    if (kind === 'skin') {
      const next = itemId as MochiSkinId;
      setPreviewSkinState((prev) =>
        prev?.forId === recipientId && prev.id === next
          ? null
          : { forId: recipientId, id: next }
      );
    } else {
      const next = itemId as MochiAccessoryId;
      setPreviewAccState((prev) =>
        prev?.forId === recipientId && prev.id === next
          ? null
          : { forId: recipientId, id: next }
      );
    }
  };

  const handleConfirmBuy = (
    kind: 'skin' | 'accessory',
    itemId: string,
    itemName: string,
    emoji: string,
    price: number
  ) => {
    const res = buyShopItem({
      buyerId: activePartnerId,
      recipientId,
      kind,
      itemId,
    });

    if (!res.ok) {
      Alert.alert(
        'Koin Belum Cukup 🪙',
        res.reason ?? 'Main game & absen harian dulu buat kumpulin koin!'
      );
      return;
    }

    if (kind === 'skin') {
      setPreviewSkinState(null);
    } else {
      setPreviewAccState(null);
    }

    triggerSuccessHaptic();
    pushFeatureNotification({
      category: 'play',
      emoji,
      title:
        shopTarget === 'gift'
          ? `Kado Terkirim ke ${other.name}!`
          : `${itemName} Terpasang!`,
      body:
        shopTarget === 'gift'
          ? `Kamu menghadiahkan ${emoji} ${itemName} (-${price} koin)`
          : `Mochi ${me.name} sekarang makin gemas (-${price} koin)`,
      route: '/play',
      systemAlert: false,
    });
  };

  const previewSkinSpec = useMemo(
    () => (previewSkinId ? MOCHI_SKINS.find((s) => s.id === previewSkinId) ?? null : null),
    [previewSkinId]
  );
  const previewAccSpec = useMemo(
    () =>
      previewAccId ? MOCHI_ACCESSORIES.find((a) => a.id === previewAccId) ?? null : null,
    [previewAccId]
  );

  // Skin emojis for Tic-Tac-Toe pieces
  const p1SkinSpec = getMochiSkinSpec(getProfileSkin(p1), p1.mochiColor);
  const p2SkinSpec = getMochiSkinSpec(getProfileSkin(p2), p2.mochiColor);

  const renderSuitArena = () => {
    const myPick = suitGame.picks[activePartnerId];
    const oppPick = suitGame.picks[otherId];
    const oppName = suitGame.mode === 'bot' ? 'Mochi Bot' : other.name;
    const isRevealed = Boolean(suitGame.winner);

    const getChoiceMeta = (c?: SuitChoice) => SUIT_CHOICES.find((x) => x.id === c);
    const myMeta = getChoiceMeta(myPick);
    const oppMeta = getChoiceMeta(oppPick);

    return (
      <View style={styles.sectionStack}>
        {/* Mode Switcher */}
        <View style={[styles.bentoCard, SoftShadow]}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>Suit Mochi Taruhan</Text>
            <View style={styles.modeChipGroup}>
              <BouncyPressable
                onPress={() => setSuitMode('bot')}
                style={[
                  styles.modeChip,
                  suitGame.mode === 'bot' && styles.modeChipActiveCoral,
                ]}>
                <Text
                  style={[
                    styles.modeChipText,
                    suitGame.mode === 'bot' && styles.modeChipTextActive,
                  ]}
                  maxFontSizeMultiplier={1.15}>
                  Bot Mochi
                </Text>
              </BouncyPressable>
              <BouncyPressable
                onPress={() => setSuitMode('live')}
                style={[
                  styles.modeChip,
                  suitGame.mode === 'live' && styles.modeChipActiveMint,
                ]}>
                <Text
                  style={[
                    styles.modeChipText,
                    suitGame.mode === 'live' && styles.modeChipTextActiveMint,
                  ]}
                  maxFontSizeMultiplier={1.15}>
                  2 HP Live
                </Text>
              </BouncyPressable>
            </View>
          </View>

          {suitGame.mode === 'live' && !isLiveConnected ? (
            <View style={styles.hintBanner}>
              <Text style={styles.hintBannerText}>
                Aktifkan Live Sync Supabase dulu buat duel 2 HP, atau main mode Bot Mochi langsung di sini!
              </Text>
            </View>
          ) : null}

          <Text style={styles.fieldLabel}>Taruhan Seru Kalian</Text>
          <TextInput
            value={suitGame.stake}
            onChangeText={setSuitStake}
            placeholder="Tulis taruhan lucu (misal: Traktir seblak!)"
            placeholderTextColor={Pastel.textSoft}
            style={styles.textInput}
            maxLength={60}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}>
            {SUIT_PRESET_STAKES.map((preset) => {
              const selected = suitGame.stake === preset;
              return (
                <BouncyPressable
                  key={preset}
                  onPress={() => setSuitStake(preset)}
                  style={[
                    styles.presetChip,
                    selected && { backgroundColor: Pastel.coralSoft },
                  ]}>
                  <Text
                    style={[
                      styles.presetChipText,
                      selected && { color: Pastel.coralDark, fontFamily: BodyFontBold },
                    ]}
                    maxFontSizeMultiplier={1.15}>
                    {preset}
                  </Text>
                </BouncyPressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Duel Arena */}
        <View style={[styles.bentoCard, SoftShadow]}>
          <View style={styles.duelRow}>
            <View style={styles.duelSide}>
              <MochiMascot
                bodyColor={me.mochiColor}
                auraColor={me.auraColor}
                skinId={getProfileSkin(me)}
                accessoryId={getProfileAccessory(me)}
                mood={suitGame.winner === activePartnerId ? 'in_love' : 'happy'}
                size={68}
              />
              <Text style={styles.duelName} numberOfLines={1}>
                {me.name} (Kamu)
              </Text>
              <View style={styles.pickBubble}>
                <Text style={styles.pickEmoji}>
                  {myMeta ? myMeta.emoji : '❔'}
                </Text>
              </View>
              <Text style={styles.pickCaption}>
                {myMeta ? myMeta.label : 'Pilih jurus'}
              </Text>
            </View>

            <View style={styles.vsBadge}>
              <Text style={styles.vsText}>VS</Text>
            </View>

            <View style={styles.duelSide}>
              <MochiMascot
                bodyColor={other.mochiColor}
                auraColor={other.auraColor}
                skinId={getProfileSkin(other)}
                accessoryId={getProfileAccessory(other)}
                mood={
                  suitGame.winner === otherId
                    ? 'in_love'
                    : suitGame.winner === activePartnerId
                      ? 'sleepy'
                      : 'chaotic'
                }
                size={68}
                delayMs={350}
              />
              <Text style={styles.duelName} numberOfLines={1}>
                {oppName}
              </Text>
              <View style={styles.pickBubble}>
                <Text style={styles.pickEmoji}>
                  {isRevealed && oppMeta ? oppMeta.emoji : oppPick ? '✅' : '⏳'}
                </Text>
              </View>
              <Text style={styles.pickCaption}>
                {isRevealed && oppMeta
                  ? oppMeta.label
                  : oppPick
                    ? 'Sudah pilih!'
                    : suitGame.mode === 'bot'
                      ? 'Siap main'
                      : 'Menunggu...'}
              </Text>
            </View>
          </View>

          {suitGame.winner ? (
            <View
              style={[
                styles.resultBox,
                suitGame.winner === activePartnerId
                  ? { backgroundColor: Pastel.matchaSoft }
                  : suitGame.winner === 'draw'
                    ? { backgroundColor: Pastel.honeySoft }
                    : { backgroundColor: Pastel.coralSoft },
              ]}>
              <Trophy
                size={18}
                color={
                  suitGame.winner === activePartnerId
                    ? Pastel.matcha
                    : suitGame.winner === 'draw'
                      ? Pastel.honeyDark
                      : Pastel.coralDark
                }
              />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.resultTitle}>
                  {suitGame.winner === activePartnerId
                    ? `Yeay! ${me.name} Menang! (+20 🪙)`
                    : suitGame.winner === 'draw'
                      ? 'Seri! Imbang Nih (+10 🪙)'
                      : `${oppName} Menang! (+8 🪙)`}
                </Text>
                <Text style={styles.resultSub}>
                  {suitGame.winner === 'draw'
                    ? 'Ulangi sekali lagi buat tentuin pemenang taruhan!'
                    : `Taruhan berlaku: ${suitGame.stake || 'Traktiran manis!'}`}
                </Text>
              </View>
              <BouncyPressable
                onPress={() => {
                  triggerMediumHaptic();
                  resetSuitRound(activePartnerId);
                }}
                style={styles.replayBtn}>
                <RefreshCw size={14} color={Pastel.pureWhite} />
                <Text style={styles.replayBtnText}>Lagi</Text>
              </BouncyPressable>
            </View>
          ) : (
            <View style={styles.suitActionRow}>
              {SUIT_CHOICES.map((choice) => {
                const chosen = myPick === choice.id;
                return (
                  <BouncyPressable
                    key={choice.id}
                    disabled={Boolean(myPick && suitGame.mode === 'live')}
                    onPress={() => {
                      triggerSuccessHaptic();
                      pickSuitChoice(activePartnerId, choice.id);
                    }}
                    style={[
                      styles.suitChoiceBtn,
                      chosen && styles.suitChoiceBtnActive,
                    ]}>
                    <Text style={styles.suitChoiceEmoji}>{choice.emoji}</Text>
                    <Text
                      style={[
                        styles.suitChoiceLabel,
                        chosen && { color: Pastel.coralDark },
                      ]}
                      maxFontSizeMultiplier={1.15}>
                      {choice.label}
                    </Text>
                  </BouncyPressable>
                );
              })}
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderTttArena = () => {
    const turnOwner = tttGame.turn === 'p1' ? p1 : p2;
    const isBoardEmpty = tttGame.board.every((c) => c === null);
    const isMyTurn =
      tttGame.mode === 'local' ||
      (tttGame.mode === 'bot' && (tttGame.turn === activePartnerId || isBoardEmpty)) ||
      (tttGame.mode === 'live' && tttGame.turn === activePartnerId);

    const p1Label =
      tttGame.mode === 'bot' && activePartnerId === 'p2' ? 'Mochi Bot' : p1.name;
    const p2Label =
      tttGame.mode === 'bot' && activePartnerId === 'p1' ? 'Mochi Bot' : p2.name;

    const winnerName =
      tttGame.winner === 'p1'
        ? p1Label
        : tttGame.winner === 'p2'
          ? p2Label
          : null;

    return (
      <View style={styles.sectionStack}>
        <View style={[styles.bentoCard, SoftShadow]}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>Tic-Tac-Toe Mochi</Text>
            <BouncyPressable
              onPress={() => {
                triggerMediumHaptic();
                resetTttMatch(activePartnerId);
              }}
              style={styles.resetPillBtn}>
              <RefreshCw size={13} color={Pastel.text} />
              <Text style={styles.resetPillText}>Ronde Baru</Text>
            </BouncyPressable>
          </View>

          <View style={styles.tttModeRow}>
            {([
              { id: 'bot', label: 'Lawan Bot' },
              { id: 'local', label: '1 HP Gantian' },
              { id: 'live', label: '2 HP Live' },
            ] as const).map((m) => {
              const selected = tttGame.mode === m.id;
              return (
                <BouncyPressable
                  key={m.id}
                  onPress={() => setTttMode(m.id)}
                  style={[
                    styles.tttModePill,
                    selected && { backgroundColor: Pastel.taroSoft },
                  ]}>
                  <Text
                    style={[
                      styles.tttModeText,
                      selected && { color: Pastel.taro, fontFamily: BodyFontBold },
                    ]}
                    maxFontSizeMultiplier={1.15}>
                    {m.label}
                  </Text>
                </BouncyPressable>
              );
            })}
          </View>

          {/* Scoreboard */}
          <View style={styles.scoreRow}>
            <View style={[styles.scoreBox, { backgroundColor: p1SkinSpec.pillBg }]}>
              <Text style={styles.scoreEmoji}>{p1SkinSpec.emoji}</Text>
              <Text style={styles.scoreName} numberOfLines={1}>
                {p1Label}
              </Text>
              <Text style={[styles.scoreNum, { color: p1SkinSpec.accent }]}>
                {tttGame.scores.p1}
              </Text>
            </View>

            <View style={styles.turnCenterPill}>
              {tttGame.winner ? (
                <Text style={styles.turnCenterText} numberOfLines={2}>
                  {tttGame.winner === 'draw' ? 'Seri! 🤝' : `${winnerName} Menang! 🎉`}
                </Text>
              ) : (
                <Text style={styles.turnCenterText} numberOfLines={2}>
                  Giliran:{'\n'}
                  {tttGame.mode === 'bot' && tttGame.turn !== activePartnerId && !isBoardEmpty
                    ? 'Mochi Bot...'
                    : tttGame.mode === 'bot' && isBoardEmpty
                      ? me.name
                      : turnOwner.name}
                </Text>
              )}
            </View>

            <View style={[styles.scoreBox, { backgroundColor: p2SkinSpec.pillBg }]}>
              <Text style={styles.scoreEmoji}>{p2SkinSpec.emoji}</Text>
              <Text style={styles.scoreName} numberOfLines={1}>
                {p2Label}
              </Text>
              <Text style={[styles.scoreNum, { color: p2SkinSpec.accent }]}>
                {tttGame.scores.p2}
              </Text>
            </View>
          </View>

          {/* Explicit 3x3 Rows Board (crash/collapse-free on Android Yoga) */}
          <View style={styles.tttBoardWrap}>
            {TTT_ROWS.map((row, rowIdx) => (
              <View key={rowIdx} style={styles.tttRow}>
                {row.map((idx) => {
                  const cell = tttGame.board[idx];
                  const isWinCell = tttGame.winLine?.includes(idx);
                  const cellBg = isWinCell
                    ? cell === 'p1'
                      ? Pastel.coralSoft
                      : Pastel.matchaSoft
                    : cell
                      ? Pastel.bgElevated
                      : Pastel.bgMuted;

                  return (
                    <BouncyPressable
                      key={idx}
                      disabled={Boolean(cell || tttGame.winner || !isMyTurn)}
                      onPress={() => {
                        triggerMediumHaptic();
                        makeTttMove(idx);
                      }}
                      style={[
                        styles.tttCell,
                        cell ? SoftShadowSm : undefined,
                        { backgroundColor: cellBg },
                      ]}>
                      {cell ? (
                        <View
                          style={[
                            styles.tttToken,
                            {
                              backgroundColor:
                                cell === 'p1' ? p1SkinSpec.bottom : p2SkinSpec.bottom,
                            },
                          ]}>
                          <Text style={styles.tttTokenEmoji}>
                            {cell === 'p1' ? p1SkinSpec.emoji : p2SkinSpec.emoji}
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.tttEmptyDot} />
                      )}
                    </BouncyPressable>
                  );
                })}
              </View>
            ))}
          </View>

          {tttGame.winner ? (
            <BouncyPressable
              onPress={() => {
                triggerSuccessHaptic();
                resetTttMatch(activePartnerId);
              }}
              style={styles.tttPlayAgainBtn}>
              <Text style={styles.tttPlayAgainText}>
                Main Lagi & Kumpulin Koin (+20 🪙)
              </Text>
            </BouncyPressable>
          ) : null}
        </View>
      </View>
    );
  };

  const renderMemoryArena = () => {
    const matchedPairs = memDeck.filter((c) => Boolean(c.matchedBy)).length / 2;
    const isFinished = matchedPairs === 6;
    const memWinnerName =
      memScores.p1 > memScores.p2
        ? p1.name
        : memScores.p2 > memScores.p1
          ? p2.name
          : null;

    return (
      <View style={styles.sectionStack}>
        <View style={[styles.bentoCard, SoftShadow]}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>Memori Kartu Mochi</Text>
            <BouncyPressable
              onPress={() => {
                triggerMediumHaptic();
                resetMemoryGame();
              }}
              style={styles.resetPillBtn}>
              <RefreshCw size={13} color={Pastel.text} />
              <Text style={styles.resetPillText}>Acak Ulang</Text>
            </BouncyPressable>
          </View>

          <View style={styles.tttModeRow}>
            {([
              { id: 'solo', label: 'Main Solo' },
              { id: 'local', label: '1 HP Gantian' },
            ] as const).map((m) => {
              const selected = memMode === m.id;
              return (
                <BouncyPressable
                  key={m.id}
                  onPress={() => {
                    triggerMediumHaptic();
                    resetMemoryGame(m.id);
                  }}
                  style={[
                    styles.tttModePill,
                    selected && { backgroundColor: Pastel.skySoft },
                  ]}>
                  <Text
                    style={[
                      styles.tttModeText,
                      selected && { color: Pastel.sky, fontFamily: BodyFontBold },
                    ]}
                    maxFontSizeMultiplier={1.15}>
                    {m.label}
                  </Text>
                </BouncyPressable>
              );
            })}
          </View>

          {memMode === 'solo' ? (
            <View style={styles.memStatsRow}>
              <View style={[styles.memStatPill, { backgroundColor: Pastel.coralSoft }]}>
                <Text style={styles.memStatLabel}>Pasang</Text>
                <Text style={[styles.memStatVal, { color: Pastel.coralDark }]}>
                  {matchedPairs}/6
                </Text>
              </View>
              <View style={[styles.memStatPill, { backgroundColor: Pastel.skySoft }]}>
                <Text style={styles.memStatLabel}>Langkah</Text>
                <Text style={[styles.memStatVal, { color: Pastel.sky }]}>
                  {memMoves}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.scoreRow}>
              <View style={[styles.scoreBox, { backgroundColor: p1SkinSpec.pillBg }]}>
                <Text style={styles.scoreName} numberOfLines={1}>
                  {p1.name}
                </Text>
                <Text style={[styles.scoreNum, { color: p1SkinSpec.accent }]}>
                  {memScores.p1}
                </Text>
              </View>

              <View style={styles.turnCenterPill}>
                <Text style={styles.turnCenterText} numberOfLines={2}>
                  {isFinished
                    ? memWinnerName
                      ? `${memWinnerName} Menang! 🎉`
                      : 'Seri! 🤝'
                    : `Giliran:\n${memTurn === 'p1' ? p1.name : p2.name}`}
                </Text>
              </View>

              <View style={[styles.scoreBox, { backgroundColor: p2SkinSpec.pillBg }]}>
                <Text style={styles.scoreName} numberOfLines={1}>
                  {p2.name}
                </Text>
                <Text style={[styles.scoreNum, { color: p2SkinSpec.accent }]}>
                  {memScores.p2}
                </Text>
              </View>
            </View>
          )}

          {/* Explicit 3x4 Memory Card Grid */}
          <View style={styles.memBoardWrap}>
            {MEMORY_ROWS.map((row, rowIdx) => (
              <View key={rowIdx} style={styles.memRow}>
                {row.map((idx) => {
                  const card = memDeck[idx];
                  const isFlipped = memFlipped.includes(idx);
                  const isMatched = Boolean(card?.matchedBy);
                  const faceUp = isFlipped || isMatched;

                  const matchedBg =
                    card?.matchedBy === 'p2' ? p2SkinSpec.pillBg : p1SkinSpec.pillBg;

                  return (
                    <BouncyPressable
                      key={card?.uid ?? idx}
                      disabled={faceUp || memFlipped.length >= 2}
                      onPress={() => handleFlipMemoryCard(idx)}
                      style={[
                        styles.memCard,
                        faceUp ? SoftShadowSm : undefined,
                        {
                          backgroundColor: isMatched
                            ? matchedBg
                            : faceUp
                              ? Pastel.bgElevated
                              : Pastel.bgMuted,
                        },
                      ]}>
                      {faceUp ? (
                        <Text style={styles.memCardEmoji}>{card.emoji}</Text>
                      ) : (
                        <Text style={styles.memCardBack}>?</Text>
                      )}
                    </BouncyPressable>
                  );
                })}
              </View>
            ))}
          </View>

          {isFinished ? (
            <View style={[styles.resultBox, { backgroundColor: Pastel.matchaSoft }]}>
              <Trophy size={18} color={Pastel.matcha} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.resultTitle}>
                  Semua Pasangan Ketemu! (+{memEarnedCoins ?? 25} 🪙)
                </Text>
                <Text style={styles.resultSub}>
                  {memMode === 'solo'
                    ? `Selesai dalam ${memMoves} langkah! ${memMoves <= 9 ? 'Bonus kece!' : ''}`
                    : memWinnerName
                      ? `${memWinnerName} paling jago nebak pasangan!`
                      : 'Kompak banget berdua, skor imbang!'}
                </Text>
              </View>
              <BouncyPressable
                onPress={() => {
                  triggerMediumHaptic();
                  resetMemoryGame();
                }}
                style={styles.replayBtn}>
                <RefreshCw size={14} color={Pastel.pureWhite} />
                <Text style={styles.replayBtnText}>Lagi</Text>
              </BouncyPressable>
            </View>
          ) : (
            <Text style={styles.gameHintText}>
              Cari 6 pasang kartu gemas dalam waktu sesingkat mungkin untuk dapat koin!
            </Text>
          )}
        </View>
      </View>
    );
  };

  const renderCatchArena = () => {
    const displayedBest = Math.max(bestCatchScore, catchGame.score);

    return (
      <View style={styles.sectionStack}>
        <View style={[styles.bentoCard, SoftShadow]}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>Tangkap Mochi Kilat</Text>
            <View style={styles.catchBestPill}>
              <Trophy size={12} color={Pastel.honeyDark} />
              <Text style={styles.catchBestText} maxFontSizeMultiplier={1.15}>
                Rekor: {displayedBest}
              </Text>
            </View>
          </View>

          {/* Timer + Live Score Row */}
          <View style={styles.memStatsRow}>
            <View
              style={[
                styles.memStatPill,
                {
                  backgroundColor:
                    catchGame.timeLeft <= 5 && catchGame.phase === 'playing'
                      ? Pastel.coralSoft
                      : Pastel.skySoft,
                },
              ]}>
              <View style={styles.inlineIconRow}>
                <Timer
                  size={13}
                  color={
                    catchGame.timeLeft <= 5 && catchGame.phase === 'playing'
                      ? Pastel.coralDark
                      : Pastel.sky
                  }
                />
                <Text style={styles.memStatLabel}>Waktu</Text>
              </View>
              <Text
                style={[
                  styles.memStatVal,
                  {
                    color:
                      catchGame.timeLeft <= 5 && catchGame.phase === 'playing'
                        ? Pastel.coralDark
                        : Pastel.sky,
                  },
                ]}>
                {catchGame.timeLeft} dtk
              </Text>
            </View>

            <View style={[styles.memStatPill, { backgroundColor: Pastel.matchaSoft }]}>
              <Text style={styles.memStatLabel}>Skor</Text>
              <Text style={[styles.memStatVal, { color: Pastel.matcha }]}>
                {catchGame.score}
              </Text>
            </View>
          </View>

          {/* Rule Legend */}
          <View style={styles.catchLegendRow}>
            <View style={[styles.catchLegendChip, { backgroundColor: Pastel.peachSoft }]}>
              <Text style={styles.catchLegendText}>🍑 Mochi +1</Text>
            </View>
            <View style={[styles.catchLegendChip, { backgroundColor: Pastel.honeySoft }]}>
              <Text style={styles.catchLegendText}>👑 Mahkota +3</Text>
            </View>
            <View style={[styles.catchLegendChip, { backgroundColor: Pastel.coralSoft }]}>
              <Text style={styles.catchLegendText}>🌶️ Cabai -2</Text>
            </View>
          </View>

          {/* Explicit 3x3 Hole Grid */}
          <View style={styles.tttBoardWrap}>
            {TTT_ROWS.map((row, rowIdx) => (
              <View key={rowIdx} style={styles.tttRow}>
                {row.map((idx) => {
                  const slot = catchGame.slots[idx];
                  const slotBg = !slot
                    ? Pastel.bgMuted
                    : slot.kind === 'crown'
                      ? Pastel.honeySoft
                      : slot.kind === 'bomb'
                        ? Pastel.coralSoft
                        : Pastel.bgElevated;

                  return (
                    <BouncyPressable
                      key={idx}
                      disabled={catchGame.phase !== 'playing' || !slot}
                      onPress={() => handleTapCatchHole(idx)}
                      style={[
                        styles.tttCell,
                        slot ? SoftShadowSm : undefined,
                        { backgroundColor: slotBg },
                      ]}>
                      {slot ? (
                        <Text style={styles.catchHoleEmoji}>{slot.emoji}</Text>
                      ) : (
                        <View style={styles.catchEmptyHole} />
                      )}
                    </BouncyPressable>
                  );
                })}
              </View>
            ))}
          </View>

          {catchGame.phase === 'playing' ? (
            <Text style={styles.gameHintText}>
              Tap Mochi &amp; Mahkota secepat mungkin! Hati-hati jangan kepencet 🌶️
            </Text>
          ) : catchGame.phase === 'done' ? (
            <View style={[styles.resultBox, { backgroundColor: Pastel.matchaSoft }]}>
              <Trophy size={18} color={Pastel.matcha} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.resultTitle}>
                  Skor {catchGame.score} Poin! (+{catchGame.lastCoins} 🪙)
                </Text>
                <Text style={styles.resultSub}>
                  {catchGame.score >= displayedBest && catchGame.score > 0
                    ? 'Rekor baru! Refleks kamu gokil banget ⚡'
                    : 'Ayo main lagi buat pecahin rekor tertinggi!'}
                </Text>
              </View>
              <BouncyPressable onPress={handleStartCatch} style={styles.replayBtn}>
                <RefreshCw size={14} color={Pastel.pureWhite} />
                <Text style={styles.replayBtnText}>Lagi</Text>
              </BouncyPressable>
            </View>
          ) : (
            <BouncyPressable onPress={handleStartCatch} style={styles.catchStartBtn}>
              <Play size={16} color={Pastel.pureWhite} fill={Pastel.pureWhite} />
              <Text style={styles.catchStartText}>Mulai 25 Detik (+Koin 🪙)</Text>
            </BouncyPressable>
          )}
        </View>
      </View>
    );
  };

  const p1DisplayedSkin =
    recipientId === 'p1' && previewSkinId ? previewSkinId : getProfileSkin(p1);
  const p1DisplayedAcc =
    recipientId === 'p1' && previewAccId ? previewAccId : getProfileAccessory(p1);
  const p2DisplayedSkin =
    recipientId === 'p2' && previewSkinId ? previewSkinId : getProfileSkin(p2);
  const p2DisplayedAcc =
    recipientId === 'p2' && previewAccId ? previewAccId : getProfileAccessory(p2);

  const hasPreview = Boolean(previewSkinSpec || previewAccSpec);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          keyboardHeight > 0 && { paddingBottom: keyboardHeight + 48 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <View style={styles.centerColumn}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.screenTitle}>MochiPlay Hub</Text>
              <View style={styles.subMetaRow}>
                <Flame size={13} color={Pastel.peach} />
                <Text style={styles.screenSub} numberOfLines={1}>
                  Streak {streakInfo.streak} Hari · {me.name}
                </Text>
              </View>
            </View>

            <BouncyPressable
              onPress={() => {
                triggerMediumHaptic();
                if (catchGame.phase === 'playing') stopCatchGame();
                setActiveTab('shop');
              }}
              style={[styles.coinPill, SoftShadowSm]}>
              <Coins size={15} color={Pastel.honeyDark} />
              <Text style={styles.coinText} maxFontSizeMultiplier={1.15}>
                {myCoins} Koin
              </Text>
            </BouncyPressable>
          </View>

          {/* Horizontal 5-Pill Segmented Navigation */}
          <View style={[styles.segmentBarOuter, SoftShadowSm]}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.segmentScrollContent}>
              {SECTION_TABS.map((tab) => {
                const selected = activeTab === tab.id;
                return (
                  <BouncyPressable
                    key={tab.id}
                    onPress={() => {
                      triggerMediumHaptic();
                      if (catchGame.phase === 'playing' && tab.id !== 'catch') {
                        stopCatchGame();
                      }
                      setActiveTab(tab.id);
                    }}
                    style={[
                      styles.segmentBtn,
                      selected && styles.segmentBtnActive,
                    ]}>
                    <Text style={styles.segmentEmoji}>{tab.emoji}</Text>
                    <Text
                      numberOfLines={1}
                      maxFontSizeMultiplier={1.15}
                      style={[
                        styles.segmentLabel,
                        selected && styles.segmentLabelActive,
                      ]}>
                      {tab.label}
                    </Text>
                  </BouncyPressable>
                );
              })}
            </ScrollView>
          </View>

          {/* TAB 1: MOCHI SKIN & ACCESSORY SHOP */}
          {activeTab === 'shop' ? (
            <View style={styles.sectionStack}>
              <View style={[styles.bentoCard, SoftShadow]}>
                <View style={styles.shopTargetRow}>
                  <BouncyPressable
                    onPress={() => setShopTarget('self')}
                    style={[
                      styles.shopTargetBtn,
                      shopTarget === 'self' && styles.shopTargetBtnActive,
                    ]}>
                    <Text
                      style={[
                        styles.shopTargetText,
                        shopTarget === 'self' && styles.shopTargetTextActive,
                      ]}
                      maxFontSizeMultiplier={1.15}>
                      Pasang untuk {me.name}
                    </Text>
                  </BouncyPressable>
                  <BouncyPressable
                    onPress={() => setShopTarget('gift')}
                    style={[
                      styles.shopTargetBtn,
                      shopTarget === 'gift' && styles.shopTargetBtnGift,
                    ]}>
                    <Gift
                      size={14}
                      color={shopTarget === 'gift' ? Pastel.pureWhite : Pastel.coralDark}
                    />
                    <Text
                      style={[
                        styles.shopTargetText,
                        shopTarget === 'gift' && styles.shopTargetTextActive,
                      ]}
                      maxFontSizeMultiplier={1.15}>
                      Kado ke {other.name}
                    </Text>
                  </BouncyPressable>
                </View>

                {/* Live Dual Mascot Wardrobe Preview */}
                <View style={styles.wardrobePreview}>
                  <View
                    style={[
                      styles.wardrobeSlot,
                      recipientId === 'p1' && styles.wardrobeSlotFocused,
                    ]}>
                    {recipientId === 'p1' && hasPreview ? (
                      <View style={styles.previewSlotBadge}>
                        <Eye size={10} color={Pastel.taro} />
                        <Text style={styles.previewSlotBadgeText}>Preview</Text>
                      </View>
                    ) : null}
                    <MochiMascot
                      bodyColor={p1.mochiColor}
                      auraColor={p1.auraColor}
                      skinId={p1DisplayedSkin}
                      accessoryId={p1DisplayedAcc}
                      mood={p1.mood}
                      size={74}
                    />
                    <Text style={styles.wardrobeName} numberOfLines={1}>
                      {p1.name} {recipientId === 'p1' ? '✨' : ''}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.wardrobeSlot,
                      recipientId === 'p2' && styles.wardrobeSlotFocused,
                    ]}>
                    {recipientId === 'p2' && hasPreview ? (
                      <View style={styles.previewSlotBadge}>
                        <Eye size={10} color={Pastel.taro} />
                        <Text style={styles.previewSlotBadgeText}>Preview</Text>
                      </View>
                    ) : null}
                    <MochiMascot
                      bodyColor={p2.mochiColor}
                      auraColor={p2.auraColor}
                      skinId={p2DisplayedSkin}
                      accessoryId={p2DisplayedAcc}
                      mood={p2.mood}
                      size={74}
                      delayMs={400}
                    />
                    <Text style={styles.wardrobeName} numberOfLines={1}>
                      {p2.name} {recipientId === 'p2' ? '✨' : ''}
                    </Text>
                  </View>
                </View>

                {hasPreview ? (
                  <View style={styles.previewBar}>
                    <View style={styles.previewBarTop}>
                      <Text style={styles.previewBarTitle} numberOfLines={2}>
                        Preview:{' '}
                        {[
                          previewSkinSpec ? `${previewSkinSpec.emoji} ${previewSkinSpec.name}` : null,
                          previewAccSpec ? `${previewAccSpec.emoji} ${previewAccSpec.name}` : null,
                        ]
                          .filter(Boolean)
                          .join(' + ')}
                      </Text>
                      <BouncyPressable
                        onPress={() => {
                          setPreviewSkinId(null);
                          setPreviewAccId(null);
                        }}
                        style={styles.previewResetBtn}>
                        <X size={13} color={Pastel.textMuted} />
                      </BouncyPressable>
                    </View>

                    <View style={styles.previewBuyRow}>
                      {previewSkinSpec ? (
                        <BouncyPressable
                          onPress={() =>
                            handleConfirmBuy(
                              'skin',
                              previewSkinSpec.id,
                              previewSkinSpec.name,
                              previewSkinSpec.emoji,
                              previewSkinSpec.price
                            )
                          }
                          style={styles.previewBuyChip}>
                          <ShoppingBag size={13} color={Pastel.pureWhite} />
                          <Text style={styles.previewBuyChipText} maxFontSizeMultiplier={1.1}>
                            Beli {previewSkinSpec.emoji} · 🪙 {previewSkinSpec.price}
                          </Text>
                        </BouncyPressable>
                      ) : null}

                      {previewAccSpec ? (
                        <BouncyPressable
                          onPress={() =>
                            handleConfirmBuy(
                              'accessory',
                              previewAccSpec.id,
                              previewAccSpec.name,
                              previewAccSpec.emoji,
                              previewAccSpec.price
                            )
                          }
                          style={styles.previewBuyChip}>
                          <ShoppingBag size={13} color={Pastel.pureWhite} />
                          <Text style={styles.previewBuyChipText} maxFontSizeMultiplier={1.1}>
                            Beli {previewAccSpec.emoji} · 🪙 {previewAccSpec.price}
                          </Text>
                        </BouncyPressable>
                      ) : null}
                    </View>
                  </View>
                ) : (
                  <Text style={styles.shopHintText}>
                    Tap skin atau aksesori di bawah buat coba preview dulu sebelum beli!
                  </Text>
                )}
              </View>

              {/* Skins Grid */}
              <View style={[styles.bentoCard, SoftShadow]}>
                <Text style={styles.cardTitle}>Rasa & Warna Mochi</Text>
                <View style={styles.catalogGrid}>
                  {MOCHI_SKINS.map((skin) => {
                    const owned = recipientSkins.includes(skin.id);
                    const equipped = recipientEquippedSkin === skin.id && !previewSkinId;
                    const previewing = previewSkinId === skin.id && !owned;
                    return (
                      <View
                        key={skin.id}
                        style={[
                          styles.catalogItem,
                          equipped && { backgroundColor: skin.pillBg },
                          previewing && styles.catalogItemPreview,
                        ]}>
                        <BouncyPressable
                          onPress={() => handleShopCardPress('skin', skin.id)}
                          style={styles.catalogItemTapArea}>
                          <View
                            style={[
                              styles.swatchCircle,
                              { backgroundColor: skin.bottom },
                            ]}>
                            <Text style={styles.swatchEmoji}>{skin.emoji}</Text>
                          </View>
                          <Text style={styles.catalogName} numberOfLines={1}>
                            {skin.name}
                          </Text>
                          <View
                            style={[
                              styles.priceBadge,
                              equipped
                                ? styles.priceBadgeEquipped
                                : previewing
                                  ? styles.priceBadgePreview
                                  : owned
                                    ? styles.priceBadgeOwned
                                    : styles.priceBadgeBuy,
                            ]}>
                            {equipped ? (
                              <>
                                <Check size={11} color={Pastel.pureWhite} />
                                <Text style={styles.priceBadgeTextWhite}>Dipakai</Text>
                              </>
                            ) : previewing ? (
                              <>
                                <Eye size={11} color={Pastel.taro} />
                                <Text style={styles.priceBadgeTextPreview}>Preview</Text>
                              </>
                            ) : owned ? (
                              <Text style={styles.priceBadgeTextOwned}>Milik {recipient.nickname}</Text>
                            ) : (
                              <Text style={styles.priceBadgeTextBuy}>🪙 {skin.price}</Text>
                            )}
                          </View>
                        </BouncyPressable>

                        {previewing ? (
                          <BouncyPressable
                            onPress={() =>
                              handleConfirmBuy(
                                'skin',
                                skin.id,
                                skin.name,
                                skin.emoji,
                                skin.price
                              )
                            }
                            style={styles.cardBuyBtn}>
                            <Text style={styles.cardBuyBtnText} maxFontSizeMultiplier={1.1}>
                              Beli 🪙 {skin.price}
                            </Text>
                          </BouncyPressable>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* Accessories Grid */}
              <View style={[styles.bentoCard, SoftShadow]}>
                <Text style={styles.cardTitle}>Aksesori Gemas</Text>
                <View style={{ gap: 10 }}>
                  {MOCHI_ACCESSORIES.map((acc) => {
                    const owned = recipientAccessories.includes(acc.id);
                    const equipped = recipientEquippedAcc === acc.id && !previewAccId;
                    const previewing = previewAccId === acc.id && !owned;
                    return (
                      <View
                        key={acc.id}
                        style={[
                          styles.accCardWrap,
                          equipped && { backgroundColor: Pastel.coralSoft },
                          previewing && styles.accCardWrapPreview,
                        ]}>
                        <BouncyPressable
                          onPress={() => handleShopCardPress('accessory', acc.id)}
                          style={styles.accRow}>
                          <View style={styles.accEmojiCircle}>
                            <Text style={styles.accEmoji}>{acc.emoji}</Text>
                          </View>
                          <View style={{ flex: 1, gap: 2 }}>
                            <Text style={styles.accName}>{acc.name}</Text>
                            <Text style={styles.accDesc}>{acc.desc}</Text>
                          </View>
                          <View
                            style={[
                              styles.priceBadge,
                              equipped
                                ? styles.priceBadgeEquipped
                                : previewing
                                  ? styles.priceBadgePreview
                                  : owned
                                    ? styles.priceBadgeOwned
                                    : styles.priceBadgeBuy,
                            ]}>
                            {equipped ? (
                              <>
                                <Check size={11} color={Pastel.pureWhite} />
                                <Text style={styles.priceBadgeTextWhite}>Dipakai</Text>
                              </>
                            ) : previewing ? (
                              <>
                                <Eye size={11} color={Pastel.taro} />
                                <Text style={styles.priceBadgeTextPreview}>Preview</Text>
                              </>
                            ) : owned ? (
                              <Text style={styles.priceBadgeTextOwned}>Pasang</Text>
                            ) : (
                              <Text style={styles.priceBadgeTextBuy}>🪙 {acc.price}</Text>
                            )}
                          </View>
                        </BouncyPressable>

                        {previewing ? (
                          <View style={styles.accPreviewBar}>
                            <Text style={styles.accPreviewHint}>
                              Cek tampilan Mochi di atas ↑
                            </Text>
                            <BouncyPressable
                              onPress={() =>
                                handleConfirmBuy(
                                  'accessory',
                                  acc.id,
                                  acc.name,
                                  acc.emoji,
                                  acc.price
                                )
                              }
                              style={styles.cardBuyBtnCompact}>
                              <Text style={styles.cardBuyBtnText} maxFontSizeMultiplier={1.1}>
                                Beli 🪙 {acc.price}
                              </Text>
                            </BouncyPressable>
                          </View>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>
          ) : null}

          {/* TAB 2: SUIT MOCHI */}
          {activeTab === 'suit' ? renderSuitArena() : null}

          {/* TAB 3: TIC-TAC-TOE MOCHI */}
          {activeTab === 'ttt' ? renderTttArena() : null}

          {/* TAB 4: MOCHI MEMORI */}
          {activeTab === 'memory' ? renderMemoryArena() : null}

          {/* TAB 5: TANGKAP MOCHI */}
          {activeTab === 'catch' ? renderCatchArena() : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Pastel.bg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 118,
    alignItems: 'center',
  },
  centerColumn: {
    width: '100%',
    maxWidth: 520,
    gap: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  screenTitle: {
    fontFamily: BodyFontBold,
    fontSize: 22,
    lineHeight: 29,
    color: Pastel.text,
  },
  subMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  screenSub: {
    fontFamily: RoundedFont,
    fontSize: 12.5,
    lineHeight: 17,
    color: Pastel.textMuted,
  },
  coinPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Pastel.honeySoft,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  coinText: {
    fontFamily: BodyFontBold,
    fontSize: 13.5,
    lineHeight: 18,
    color: Pastel.honeyDark,
    paddingRight: 2,
  },
  segmentBarOuter: {
    backgroundColor: Pastel.bgElevated,
    borderRadius: 20,
    padding: 5,
  },
  segmentScrollContent: {
    flexGrow: 1,
    gap: 5,
  },
  segmentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    paddingHorizontal: 13,
    borderRadius: 15,
  },
  segmentBtnActive: {
    backgroundColor: Pastel.coralSoft,
  },
  segmentEmoji: {
    fontSize: 13,
    lineHeight: 18,
  },
  segmentLabel: {
    fontFamily: BodyFontSemi,
    fontSize: 12.5,
    lineHeight: 17,
    color: Pastel.textMuted,
    paddingRight: 2,
  },
  segmentLabelActive: {
    fontFamily: BodyFontBold,
    color: Pastel.coralDark,
  },
  sectionStack: {
    gap: 14,
  },
  bentoCard: {
    backgroundColor: Pastel.bgElevated,
    borderRadius: 24,
    padding: 16,
    gap: 12,
  },
  cardTitle: {
    fontFamily: BodyFontBold,
    fontSize: 16,
    lineHeight: 22,
    color: Pastel.text,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  shopTargetRow: {
    flexDirection: 'row',
    gap: 8,
  },
  shopTargetBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Pastel.bgMuted,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  shopTargetBtnActive: {
    backgroundColor: Pastel.coral,
  },
  shopTargetBtnGift: {
    backgroundColor: Pastel.taro,
  },
  shopTargetText: {
    fontFamily: BodyFontBold,
    fontSize: 12.5,
    lineHeight: 18,
    color: Pastel.text,
    paddingRight: 2,
  },
  shopTargetTextActive: {
    color: Pastel.pureWhite,
  },
  wardrobePreview: {
    flexDirection: 'row',
    gap: 10,
  },
  wardrobeSlot: {
    flex: 1,
    backgroundColor: Pastel.bg,
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 6,
    position: 'relative',
  },
  wardrobeSlotFocused: {
    backgroundColor: Pastel.coralSoft,
  },
  previewSlotBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Pastel.taroSoft,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    zIndex: 2,
  },
  previewSlotBadgeText: {
    fontFamily: BodyFontBold,
    fontSize: 9.5,
    lineHeight: 13,
    color: Pastel.taro,
    paddingRight: 1,
  },
  wardrobeName: {
    fontFamily: BodyFontBold,
    fontSize: 13,
    lineHeight: 18,
    color: Pastel.text,
  },
  shopHintText: {
    fontFamily: RoundedFont,
    fontSize: 12,
    lineHeight: 17,
    color: Pastel.textMuted,
    textAlign: 'center',
  },
  previewBar: {
    backgroundColor: Pastel.taroSoft,
    borderRadius: 18,
    padding: 12,
    gap: 10,
  },
  previewBarTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  previewBarTitle: {
    flex: 1,
    fontFamily: BodyFontBold,
    fontSize: 12.5,
    lineHeight: 18,
    color: Pastel.taro,
  },
  previewResetBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Pastel.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewBuyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  previewBuyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Pastel.coral,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 999,
  },
  previewBuyChipText: {
    fontFamily: BodyFontBold,
    fontSize: 12,
    lineHeight: 16,
    color: Pastel.pureWhite,
    paddingRight: 2,
  },
  catalogGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  catalogItem: {
    width: '48%',
    backgroundColor: Pastel.bg,
    borderRadius: 20,
    padding: 12,
    alignItems: 'center',
    gap: 8,
  },
  catalogItemPreview: {
    backgroundColor: Pastel.taroSoft,
  },
  catalogItemTapArea: {
    width: '100%',
    alignItems: 'center',
    gap: 7,
  },
  swatchCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchEmoji: {
    fontSize: 22,
  },
  catalogName: {
    fontFamily: BodyFontBold,
    fontSize: 13.5,
    lineHeight: 19,
    color: Pastel.text,
  },
  priceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  priceBadgeEquipped: {
    backgroundColor: Pastel.matcha,
  },
  priceBadgePreview: {
    backgroundColor: Pastel.bgElevated,
  },
  priceBadgeOwned: {
    backgroundColor: Pastel.bgMuted,
  },
  priceBadgeBuy: {
    backgroundColor: Pastel.honeySoft,
  },
  priceBadgeTextWhite: {
    fontFamily: BodyFontBold,
    fontSize: 11,
    lineHeight: 15,
    color: Pastel.pureWhite,
    paddingRight: 2,
  },
  priceBadgeTextPreview: {
    fontFamily: BodyFontBold,
    fontSize: 11,
    lineHeight: 15,
    color: Pastel.taro,
    paddingRight: 2,
  },
  priceBadgeTextOwned: {
    fontFamily: BodyFontSemi,
    fontSize: 11,
    lineHeight: 15,
    color: Pastel.textMuted,
    paddingRight: 2,
  },
  priceBadgeTextBuy: {
    fontFamily: BodyFontBold,
    fontSize: 11.5,
    lineHeight: 16,
    color: Pastel.honeyDark,
    paddingRight: 2,
  },
  cardBuyBtn: {
    width: '100%',
    backgroundColor: Pastel.coral,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  cardBuyBtnCompact: {
    backgroundColor: Pastel.coral,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  cardBuyBtnText: {
    fontFamily: BodyFontBold,
    fontSize: 12,
    lineHeight: 16,
    color: Pastel.pureWhite,
    paddingRight: 2,
  },
  accCardWrap: {
    backgroundColor: Pastel.bg,
    borderRadius: 18,
    padding: 12,
    gap: 10,
  },
  accCardWrapPreview: {
    backgroundColor: Pastel.taroSoft,
  },
  accRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  accPreviewBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    backgroundColor: Pastel.bgElevated,
    borderRadius: 14,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  accPreviewHint: {
    flex: 1,
    fontFamily: RoundedFont,
    fontSize: 11.5,
    lineHeight: 16,
    color: Pastel.textMuted,
  },
  accEmojiCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Pastel.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accEmoji: {
    fontSize: 20,
  },
  accName: {
    fontFamily: BodyFontBold,
    fontSize: 14,
    lineHeight: 19,
    color: Pastel.text,
  },
  accDesc: {
    fontFamily: RoundedFont,
    fontSize: 12,
    lineHeight: 17,
    color: Pastel.textMuted,
  },
  modeChipGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  modeChip: {
    backgroundColor: Pastel.bgMuted,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  modeChipActiveCoral: {
    backgroundColor: Pastel.coralSoft,
  },
  modeChipActiveMint: {
    backgroundColor: Pastel.matchaSoft,
  },
  modeChipText: {
    fontFamily: BodyFontSemi,
    fontSize: 11.5,
    lineHeight: 16,
    color: Pastel.textMuted,
    paddingRight: 2,
  },
  modeChipTextActive: {
    fontFamily: BodyFontBold,
    color: Pastel.coralDark,
  },
  modeChipTextActiveMint: {
    fontFamily: BodyFontBold,
    color: Pastel.matcha,
  },
  hintBanner: {
    backgroundColor: Pastel.honeySoft,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  hintBannerText: {
    fontFamily: RoundedFont,
    fontSize: 12,
    lineHeight: 17,
    color: Pastel.honeyDark,
  },
  fieldLabel: {
    fontFamily: BodyFontSemi,
    fontSize: 12.5,
    lineHeight: 18,
    color: Pastel.textMuted,
  },
  textInput: {
    backgroundColor: Pastel.bgMuted,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontFamily: RoundedFont,
    fontSize: 14,
    lineHeight: 20,
    color: Pastel.text,
  },
  chipRow: {
    gap: 7,
  },
  presetChip: {
    backgroundColor: Pastel.bgMuted,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  presetChipText: {
    fontFamily: BodyFontSemi,
    fontSize: 12,
    lineHeight: 17,
    color: Pastel.textMuted,
    paddingRight: 2,
  },
  duelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  duelSide: {
    flex: 1,
    backgroundColor: Pastel.bg,
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 6,
  },
  duelName: {
    fontFamily: BodyFontBold,
    fontSize: 13,
    lineHeight: 18,
    color: Pastel.text,
  },
  pickBubble: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Pastel.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickEmoji: {
    fontSize: 24,
  },
  pickCaption: {
    fontFamily: RoundedFont,
    fontSize: 11.5,
    lineHeight: 16,
    color: Pastel.textMuted,
  },
  vsBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Pastel.coralSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vsText: {
    fontFamily: BodyFontBold,
    fontSize: 12,
    lineHeight: 16,
    color: Pastel.coralDark,
  },
  resultBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 18,
    padding: 13,
  },
  resultTitle: {
    fontFamily: BodyFontBold,
    fontSize: 13.5,
    lineHeight: 19,
    color: Pastel.text,
  },
  resultSub: {
    fontFamily: RoundedFont,
    fontSize: 12,
    lineHeight: 17,
    color: Pastel.textMuted,
  },
  replayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Pastel.coral,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  replayBtnText: {
    fontFamily: BodyFontBold,
    fontSize: 12,
    lineHeight: 16,
    color: Pastel.pureWhite,
    paddingRight: 2,
  },
  suitActionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  suitChoiceBtn: {
    flex: 1,
    backgroundColor: Pastel.bg,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 4,
  },
  suitChoiceBtnActive: {
    backgroundColor: Pastel.coralSoft,
  },
  suitChoiceEmoji: {
    fontSize: 26,
  },
  suitChoiceLabel: {
    fontFamily: BodyFontBold,
    fontSize: 12.5,
    lineHeight: 17,
    color: Pastel.text,
    paddingRight: 2,
  },
  resetPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Pastel.bgMuted,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
  },
  resetPillText: {
    fontFamily: BodyFontSemi,
    fontSize: 12,
    lineHeight: 16,
    color: Pastel.text,
    paddingRight: 2,
  },
  tttModeRow: {
    flexDirection: 'row',
    gap: 6,
  },
  tttModePill: {
    flex: 1,
    backgroundColor: Pastel.bgMuted,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 14,
    alignItems: 'center',
  },
  tttModeText: {
    fontFamily: BodyFontSemi,
    fontSize: 12,
    lineHeight: 17,
    color: Pastel.textMuted,
    paddingRight: 2,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scoreBox: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 9,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 2,
  },
  scoreEmoji: {
    fontSize: 18,
  },
  scoreName: {
    fontFamily: BodyFontSemi,
    fontSize: 11.5,
    lineHeight: 16,
    color: Pastel.text,
  },
  scoreNum: {
    fontFamily: BodyFontBold,
    fontSize: 18,
    lineHeight: 24,
  },
  turnCenterPill: {
    flex: 1.1,
    backgroundColor: Pastel.bg,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  turnCenterText: {
    fontFamily: BodyFontBold,
    fontSize: 12,
    lineHeight: 17,
    color: Pastel.text,
    textAlign: 'center',
  },
  tttBoardWrap: {
    width: '100%',
    gap: 10,
    paddingVertical: 4,
  },
  tttRow: {
    flexDirection: 'row',
    gap: 10,
  },
  tttCell: {
    flex: 1,
    height: 88,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tttEmptyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D5DCEB',
  },
  tttToken: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tttTokenEmoji: {
    fontSize: 24,
  },
  tttPlayAgainBtn: {
    backgroundColor: Pastel.coral,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tttPlayAgainText: {
    fontFamily: BodyFontBold,
    fontSize: 13.5,
    lineHeight: 19,
    color: Pastel.pureWhite,
  },
  memStatsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  memStatPill: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inlineIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  memStatLabel: {
    fontFamily: BodyFontSemi,
    fontSize: 12,
    lineHeight: 16,
    color: Pastel.textMuted,
  },
  memStatVal: {
    fontFamily: BodyFontBold,
    fontSize: 16,
    lineHeight: 21,
  },
  memBoardWrap: {
    width: '100%',
    gap: 8,
    paddingVertical: 2,
  },
  memRow: {
    flexDirection: 'row',
    gap: 8,
  },
  memCard: {
    flex: 1,
    height: 76,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memCardEmoji: {
    fontSize: 28,
  },
  memCardBack: {
    fontFamily: BodyFontBold,
    fontSize: 22,
    lineHeight: 28,
    color: Pastel.textSoft,
  },
  gameHintText: {
    fontFamily: RoundedFont,
    fontSize: 12,
    lineHeight: 17,
    color: Pastel.textMuted,
    textAlign: 'center',
  },
  catchBestPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Pastel.honeySoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  catchBestText: {
    fontFamily: BodyFontBold,
    fontSize: 12,
    lineHeight: 16,
    color: Pastel.honeyDark,
    paddingRight: 2,
  },
  catchLegendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  catchLegendChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  catchLegendText: {
    fontFamily: BodyFontSemi,
    fontSize: 11.5,
    lineHeight: 16,
    color: Pastel.text,
    paddingRight: 2,
  },
  catchHoleEmoji: {
    fontSize: 32,
  },
  catchEmptyHole: {
    width: 14,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D5DCEB',
  },
  catchStartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Pastel.coral,
    borderRadius: 999,
    paddingVertical: 13,
  },
  catchStartText: {
    fontFamily: BodyFontBold,
    fontSize: 14,
    lineHeight: 20,
    color: Pastel.pureWhite,
    paddingRight: 2,
  },
});
