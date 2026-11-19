import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Check,
  ChevronLeft,
  Coins,
  Flame,
  Gift,
  Lock,
  RefreshCw,
  Send,
  Sparkles,
  Trophy,
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
  SUIT_CHOICES,
  SUIT_PRESET_STAKES,
  computeCoupleStreak,
  getDailyQuestion,
  getDailyQuestionById,
  getMochiSkinSpec,
} from '@/constants/mochiduoPlay';
import {
  BodyFontBold,
  BodyFontRegular,
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
import type { PartnerId, SuitChoice } from '@/types/couple';
import { formatIndonesianDate, getLocalDateKey } from '@/utils/dateCalc';
import { triggerMediumHaptic, triggerSuccessHaptic } from '@/utils/haptics';

type PlaySectionTab = 'qa' | 'shop' | 'suit' | 'ttt';

const SECTION_TABS: { id: PlaySectionTab; label: string; emoji: string }[] = [
  { id: 'qa', label: 'Q&A', emoji: '❓' },
  { id: 'shop', label: 'Toko Skin', emoji: '🎨' },
  { id: 'suit', label: 'Suit', emoji: '✌️' },
  { id: 'ttt', label: 'XOXO', emoji: '🎮' },
];

export default function MochiPlayScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();

  const [manualTab, setManualTab] = useState<PlaySectionTab | null>(null);
  const [prevParamTab, setPrevParamTab] = useState<string | undefined>(params.tab);
  if (params.tab !== prevParamTab) {
    setPrevParamTab(params.tab);
    setManualTab(null);
  }
  const paramTab: PlaySectionTab =
    params.tab === 'qa' || params.tab === 'shop' || params.tab === 'suit' || params.tab === 'ttt'
      ? params.tab
      : 'qa';
  const activeTab = manualTab ?? paramTab;
  const setActiveTab = setManualTab;

  const [qaDraft, setQaDraft] = useState('');
  const [shopTarget, setShopTarget] = useState<'self' | 'gift'>('self');
  const [keyboardHeight, setKeyboardHeight] = useState(0);

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

  const buyShopItem = useCoupleStore((s) => s.buyShopItem);
  const equipShopItem = useCoupleStore((s) => s.equipShopItem);
  const submitDailyQa = useCoupleStore((s) => s.submitDailyQa);
  const setSuitMode = useCoupleStore((s) => s.setSuitMode);
  const setSuitStake = useCoupleStore((s) => s.setSuitStake);
  const pickSuitChoice = useCoupleStore((s) => s.pickSuitChoice);
  const resetSuitRound = useCoupleStore((s) => s.resetSuitRound);
  const setTttMode = useCoupleStore((s) => s.setTttMode);
  const makeTttMove = useCoupleStore((s) => s.makeTttMove);
  const resetTttMatch = useCoupleStore((s) => s.resetTttMatch);
  const pushFeatureNotification = useCoupleStore((s) => s.pushFeatureNotification);

  const me = activePartnerId === 'p1' ? p1 : p2;
  const otherId: PartnerId = activePartnerId === 'p1' ? 'p2' : 'p1';
  const other = activePartnerId === 'p1' ? p2 : p1;
  const recipientId: PartnerId = shopTarget === 'self' ? activePartnerId : otherId;
  const recipient = recipientId === 'p1' ? p1 : p2;

  const myCoins = getProfileCoins(me);
  const todayKey = getLocalDateKey();
  const todayQuestion = useMemo(() => getDailyQuestion(todayKey), [todayKey]);
  const streakInfo = useMemo(
    () => computeCoupleStreak(p1.activeDays, p2.activeDays, todayKey),
    [p1.activeDays, p2.activeDays, todayKey]
  );

  const isLiveConnected = syncConfig.enabled && syncStatus === 'connected';

  // Q&A Today & Journal
  const myTodayQa = me.qaResponses?.[todayKey];
  const otherTodayQa = other.qaResponses?.[todayKey];

  const pastQaDays = useMemo(() => {
    const keys = new Set([
      ...Object.keys(p1.qaResponses ?? {}),
      ...Object.keys(p2.qaResponses ?? {}),
    ]);
    keys.delete(todayKey);
    return Array.from(keys).sort().reverse().slice(0, 12);
  }, [p1.qaResponses, p2.qaResponses, todayKey]);

  const handleSubmitQa = () => {
    const trimmed = qaDraft.trim();
    if (!trimmed) return;
    triggerSuccessHaptic();
    const { coinsEarned } = submitDailyQa(
      activePartnerId,
      todayKey,
      todayQuestion.id,
      trimmed
    );
    setQaDraft('');
    Keyboard.dismiss();
    if (coinsEarned > 0) {
      pushFeatureNotification({
        category: 'play',
        emoji: '🪙',
        title: `Jawaban Q&A Tersimpan! (+${coinsEarned} Koin)`,
        body: otherTodayQa
          ? `Jawaban ${other.name} sudah terbuka di bawah!`
          : `Nanti kalau ${other.name} menjawab, jawabannya otomatis terbuka.`,
        route: '/play',
        systemAlert: false,
      });
    }
  };

  // Shop handlers
  const recipientSkins = getUnlockedSkins(recipient);
  const recipientAccessories = getUnlockedAccessories(recipient);
  const recipientEquippedSkin = getProfileSkin(recipient);
  const recipientEquippedAcc = getProfileAccessory(recipient);

  const handleShopPress = (
    kind: 'skin' | 'accessory',
    itemId: string,
    itemName: string,
    emoji: string,
    price: number
  ) => {
    const isOwned =
      kind === 'skin'
        ? recipientSkins.includes(itemId as any)
        : recipientAccessories.includes(itemId as any);

    if (isOwned) {
      triggerMediumHaptic();
      equipShopItem(recipientId, kind, itemId);
      return;
    }

    const res = buyShopItem({
      buyerId: activePartnerId,
      recipientId,
      kind,
      itemId,
    });

    if (!res.ok) {
      Alert.alert('Koin Belum Cukup 🪙', res.reason ?? 'Kumpulkan koin lewat misi harian & game!');
      return;
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
    const isMyTurn =
      tttGame.mode === 'local' ||
      (tttGame.mode === 'bot' && tttGame.turn === activePartnerId) ||
      (tttGame.mode === 'live' && tttGame.turn === activePartnerId);

    const winnerName =
      tttGame.winner === 'p1'
        ? p1.name
        : tttGame.winner === 'p2'
          ? tttGame.mode === 'bot' && activePartnerId === 'p1'
            ? 'Mochi Bot'
            : p2.name
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
                {p1.name}
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
                  {tttGame.mode === 'bot' && tttGame.turn !== activePartnerId
                    ? 'Mochi Bot...'
                    : turnOwner.name}
                </Text>
              )}
            </View>

            <View style={[styles.scoreBox, { backgroundColor: p2SkinSpec.pillBg }]}>
              <Text style={styles.scoreEmoji}>{p2SkinSpec.emoji}</Text>
              <Text style={styles.scoreName} numberOfLines={1}>
                {tttGame.mode === 'bot' && activePartnerId === 'p1' ? 'Mochi Bot' : p2.name}
              </Text>
              <Text style={[styles.scoreNum, { color: p2SkinSpec.accent }]}>
                {tttGame.scores.p2}
              </Text>
            </View>
          </View>

          {/* 3x3 Board */}
          <View style={styles.tttGrid}>
            {tttGame.board.map((cell, idx) => {
              const isWinCell = tttGame.winLine?.includes(idx);
              const cellBg = isWinCell
                ? cell === 'p1'
                  ? Pastel.coralSoft
                  : Pastel.matchaSoft
                : cell
                  ? Pastel.bgElevated
                  : Pastel.bg;

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
                    SoftShadowSm,
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
                  ) : null}
                </BouncyPressable>
              );
            })}
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
            <BouncyPressable
              onPress={() => router.back()}
              style={[styles.backBtn, SoftShadowSm]}
              accessibilityLabel="Kembali ke Beranda">
              <ChevronLeft size={20} color={Pastel.text} />
            </BouncyPressable>

            <View style={{ flex: 1 }}>
              <Text style={styles.screenTitle}>MochiPlay Hub</Text>
              <View style={styles.subMetaRow}>
                <Flame size={13} color={Pastel.peach} />
                <Text style={styles.screenSub} numberOfLines={1}>
                  Streak {streakInfo.streak} Hari · {me.name}
                </Text>
              </View>
            </View>

            <View style={[styles.coinPill, SoftShadowSm]}>
              <Coins size={15} color={Pastel.honeyDark} />
              <Text style={styles.coinText} maxFontSizeMultiplier={1.15}>
                {myCoins}
              </Text>
            </View>
          </View>

          {/* 4-Pill Segmented Navigation */}
          <View style={[styles.segmentBar, SoftShadowSm]}>
            {SECTION_TABS.map((tab) => {
              const selected = activeTab === tab.id;
              return (
                <BouncyPressable
                  key={tab.id}
                  onPress={() => {
                    triggerMediumHaptic();
                    setActiveTab(tab.id);
                  }}
                  style={[
                    styles.segmentBtn,
                    selected && styles.segmentBtnActive,
                  ]}>
                  <Text style={styles.segmentEmoji}>{tab.emoji}</Text>
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.82}
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
          </View>

          {/* TAB 1: DAILY BLIND Q&A */}
          {activeTab === 'qa' ? (
            <View style={styles.sectionStack}>
              <View style={[styles.qaHeroCard, SoftShadow]}>
                <View style={styles.qaTopRow}>
                  <View style={styles.qaCatPill}>
                    <Text style={styles.qaCatText} maxFontSizeMultiplier={1.15}>
                      {todayQuestion.emoji} {todayQuestion.category}
                    </Text>
                  </View>
                  <Text style={styles.qaDateText}>
                    {formatIndonesianDate(todayKey)}
                  </Text>
                </View>

                <Text style={styles.qaPrompt}>{todayQuestion.prompt}</Text>

                {/* My answer */}
                <View style={styles.qaAnswerBox}>
                  <Text style={styles.qaSideLabel}>
                    Jawaban {me.name} (Kamu)
                  </Text>
                  {myTodayQa ? (
                    <View style={styles.qaSavedBubble}>
                      <Text style={styles.qaSavedText}>“{myTodayQa.answer}”</Text>
                      <Text style={styles.qaSavedBadge}>✓ Terkirim</Text>
                    </View>
                  ) : (
                    <View style={styles.qaInputRow}>
                      <TextInput
                        value={qaDraft}
                        onChangeText={setQaDraft}
                        placeholder="Tulis jawaban jujurmu di sini..."
                        placeholderTextColor={Pastel.textSoft}
                        style={styles.qaTextInput}
                        multiline
                        maxLength={220}
                      />
                      <BouncyPressable
                        onPress={handleSubmitQa}
                        style={[
                          styles.qaSendBtn,
                          !qaDraft.trim() && { opacity: 0.45 },
                        ]}>
                        <Send size={16} color={Pastel.pureWhite} />
                      </BouncyPressable>
                    </View>
                  )}
                </View>

                {/* Partner answer (Locked until I answer!) */}
                <View style={styles.qaAnswerBox}>
                  <Text style={styles.qaSideLabel}>Jawaban {other.name}</Text>

                  {!otherTodayQa ? (
                    <View style={styles.qaLockedCard}>
                      <Sparkles size={16} color={Pastel.textSoft} />
                      <Text style={styles.qaLockedText}>
                        {other.name} belum menjawab hari ini. Ajak {other.name} buka MochiPlay ya!
                      </Text>
                    </View>
                  ) : !myTodayQa ? (
                    <View style={styles.qaSecretCard}>
                      <Lock size={16} color={Pastel.taro} />
                      <Text style={styles.qaSecretText}>
                        {other.name} sudah menjawab! Kirim jawabanmu dulu di atas buat membukanya 👀
                      </Text>
                    </View>
                  ) : (
                    <View style={[styles.qaSavedBubble, { backgroundColor: Pastel.matchaSoft }]}>
                      <Text style={styles.qaSavedText}>“{otherTodayQa.answer}”</Text>
                      <Text style={[styles.qaSavedBadge, { color: Pastel.matcha }]}>
                        Terbuka Berdua ✨
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Q&A Past History */}
              {pastQaDays.length > 0 ? (
                <View style={[styles.bentoCard, SoftShadow]}>
                  <Text style={styles.cardTitle}>Jurnal Q&A Sebelumnya</Text>
                  <View style={{ gap: 10 }}>
                    {pastQaDays.map((dayKey) => {
                      const q1 = p1.qaResponses?.[dayKey];
                      const q2 = p2.qaResponses?.[dayKey];
                      const qId = q1?.questionId ?? q2?.questionId ?? '';
                      const qObj = getDailyQuestionById(qId, dayKey);
                      return (
                        <View key={dayKey} style={styles.historyQaCard}>
                          <Text style={styles.historyQaDate}>
                            {qObj.emoji} {formatIndonesianDate(dayKey)} · {qObj.category}
                          </Text>
                          <Text style={styles.historyQaPrompt}>{qObj.prompt}</Text>
                          {q1 ? (
                            <Text style={styles.historyQaAns}>
                              <Text style={{ fontFamily: BodyFontBold }}>{p1.name}: </Text>
                              {q1.answer}
                            </Text>
                          ) : null}
                          {q2 ? (
                            <Text style={styles.historyQaAns}>
                              <Text style={{ fontFamily: BodyFontBold }}>{p2.name}: </Text>
                              {q2.answer}
                            </Text>
                          ) : null}
                        </View>
                      );
                    })}
                  </View>
                </View>
              ) : null}
            </View>
          ) : null}

          {/* TAB 2: MOCHI SKIN & ACCESSORY SHOP */}
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
                    <MochiMascot
                      bodyColor={p1.mochiColor}
                      auraColor={p1.auraColor}
                      skinId={getProfileSkin(p1)}
                      accessoryId={getProfileAccessory(p1)}
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
                    <MochiMascot
                      bodyColor={p2.mochiColor}
                      auraColor={p2.auraColor}
                      skinId={getProfileSkin(p2)}
                      accessoryId={getProfileAccessory(p2)}
                      mood={p2.mood}
                      size={74}
                      delayMs={400}
                    />
                    <Text style={styles.wardrobeName} numberOfLines={1}>
                      {p2.name} {recipientId === 'p2' ? '✨' : ''}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Skins Grid */}
              <View style={[styles.bentoCard, SoftShadow]}>
                <Text style={styles.cardTitle}>Rasa & Warna Mochi</Text>
                <View style={styles.catalogGrid}>
                  {MOCHI_SKINS.map((skin) => {
                    const owned = recipientSkins.includes(skin.id);
                    const equipped = recipientEquippedSkin === skin.id;
                    return (
                      <BouncyPressable
                        key={skin.id}
                        onPress={() =>
                          handleShopPress('skin', skin.id, skin.name, skin.emoji, skin.price)
                        }
                        style={[
                          styles.catalogItem,
                          equipped && { backgroundColor: skin.pillBg },
                        ]}>
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
                              : owned
                                ? styles.priceBadgeOwned
                                : styles.priceBadgeBuy,
                          ]}>
                          {equipped ? (
                            <>
                              <Check size={11} color={Pastel.pureWhite} />
                              <Text style={styles.priceBadgeTextWhite}>Dipakai</Text>
                            </>
                          ) : owned ? (
                            <Text style={styles.priceBadgeTextOwned}>Milik {recipient.nickname}</Text>
                          ) : (
                            <Text style={styles.priceBadgeTextBuy}>🪙 {skin.price}</Text>
                          )}
                        </View>
                      </BouncyPressable>
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
                    const equipped = recipientEquippedAcc === acc.id;
                    return (
                      <BouncyPressable
                        key={acc.id}
                        onPress={() =>
                          handleShopPress('accessory', acc.id, acc.name, acc.emoji, acc.price)
                        }
                        style={[
                          styles.accRow,
                          equipped && { backgroundColor: Pastel.coralSoft },
                        ]}>
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
                              : owned
                                ? styles.priceBadgeOwned
                                : styles.priceBadgeBuy,
                          ]}>
                          {equipped ? (
                            <>
                              <Check size={11} color={Pastel.pureWhite} />
                              <Text style={styles.priceBadgeTextWhite}>Dipakai</Text>
                            </>
                          ) : owned ? (
                            <Text style={styles.priceBadgeTextOwned}>Pasang</Text>
                          ) : (
                            <Text style={styles.priceBadgeTextBuy}>🪙 {acc.price}</Text>
                          )}
                        </View>
                      </BouncyPressable>
                    );
                  })}
                </View>
              </View>
            </View>
          ) : null}

          {/* TAB 3: SUIT MOCHI */}
          {activeTab === 'suit' ? renderSuitArena() : null}

          {/* TAB 4: TIC-TAC-TOE MOCHI */}
          {activeTab === 'ttt' ? renderTttArena() : null}
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
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Pastel.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenTitle: {
    fontFamily: BodyFontBold,
    fontSize: 19,
    lineHeight: 25,
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
  segmentBar: {
    flexDirection: 'row',
    backgroundColor: Pastel.bgElevated,
    borderRadius: 20,
    padding: 5,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 9,
    paddingHorizontal: 6,
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
    fontSize: 12,
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
  qaHeroCard: {
    backgroundColor: Pastel.bgElevated,
    borderRadius: 24,
    padding: 18,
    gap: 14,
  },
  qaTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  qaCatPill: {
    backgroundColor: Pastel.taroSoft,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 999,
  },
  qaCatText: {
    fontFamily: BodyFontBold,
    fontSize: 12,
    lineHeight: 17,
    color: Pastel.taro,
    paddingRight: 2,
  },
  qaDateText: {
    fontFamily: RoundedFont,
    fontSize: 12,
    lineHeight: 17,
    color: Pastel.textSoft,
  },
  qaPrompt: {
    fontFamily: BodyFontBold,
    fontSize: 17,
    lineHeight: 25,
    color: Pastel.text,
  },
  qaAnswerBox: {
    gap: 6,
  },
  qaSideLabel: {
    fontFamily: BodyFontSemi,
    fontSize: 12.5,
    lineHeight: 18,
    color: Pastel.textMuted,
  },
  qaInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  qaTextInput: {
    flex: 1,
    backgroundColor: Pastel.bgMuted,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontFamily: BodyFontRegular,
    fontSize: 14,
    lineHeight: 20,
    color: Pastel.text,
    minHeight: 46,
    maxHeight: 110,
  },
  qaSendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Pastel.coral,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qaSavedBubble: {
    backgroundColor: Pastel.coralSoft,
    borderRadius: 18,
    padding: 14,
    gap: 6,
  },
  qaSavedText: {
    fontFamily: BodyFontSemi,
    fontSize: 14.5,
    lineHeight: 21,
    color: Pastel.text,
  },
  qaSavedBadge: {
    fontFamily: BodyFontBold,
    fontSize: 11.5,
    lineHeight: 16,
    color: Pastel.coralDark,
  },
  qaLockedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Pastel.bg,
    borderRadius: 16,
    padding: 13,
  },
  qaLockedText: {
    flex: 1,
    fontFamily: RoundedFont,
    fontSize: 12.5,
    lineHeight: 18,
    color: Pastel.textMuted,
  },
  qaSecretCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Pastel.taroSoft,
    borderRadius: 16,
    padding: 13,
  },
  qaSecretText: {
    flex: 1,
    fontFamily: BodyFontSemi,
    fontSize: 13,
    lineHeight: 19,
    color: Pastel.taro,
  },
  historyQaCard: {
    backgroundColor: Pastel.bg,
    borderRadius: 16,
    padding: 13,
    gap: 4,
  },
  historyQaDate: {
    fontFamily: BodyFontBold,
    fontSize: 11.5,
    lineHeight: 16,
    color: Pastel.coralDark,
  },
  historyQaPrompt: {
    fontFamily: BodyFontSemi,
    fontSize: 13.5,
    lineHeight: 19,
    color: Pastel.text,
    marginBottom: 4,
  },
  historyQaAns: {
    fontFamily: BodyFontRegular,
    fontSize: 12.5,
    lineHeight: 18,
    color: Pastel.textMuted,
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
  },
  wardrobeSlotFocused: {
    backgroundColor: Pastel.coralSoft,
  },
  wardrobeName: {
    fontFamily: BodyFontBold,
    fontSize: 13,
    lineHeight: 18,
    color: Pastel.text,
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
  accRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    backgroundColor: Pastel.bg,
    borderRadius: 18,
    padding: 12,
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
  tttGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 4,
  },
  tttCell: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
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
});
