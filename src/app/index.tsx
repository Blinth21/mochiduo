import { useRouter } from 'expo-router';
import {
  ArrowLeftRight,
  Bell,
  ChevronRight,
  Cloud,
  Heart,
  MapPin,
  Pin,
  Send,
  X,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnniversaryBanner } from '@/components/AnniversaryBanner';
import { BouncyPressable } from '@/components/BouncyPressable';
import { DatePickerField } from '@/components/DatePickerField';
import { KeyboardModalSheet } from '@/components/KeyboardModalSheet';
import { LiveSyncModal } from '@/components/LiveSyncModal';
import { MochiBrandMark } from '@/components/MochiBrandMark';
import { MochiMascot } from '@/components/MochiMascot';
import { NotificationCenterModal } from '@/components/NotificationCenterModal';
import {
  BodyFontBold,
  BodyFontRegular,
  BodyFontSemi,
  MOOD_OPTIONS,
  NOTE_PALETTES,
  Pastel,
  RoundedFont,
  SoftShadow,
  SoftShadowSm,
} from '@/constants/pastelTheme';
import { useCoupleStore } from '@/store/useCoupleStore';
import type { MoodId } from '@/types/couple';
import { formatRelativeTime } from '@/utils/dateCalc';
import { formatDistanceId, getDistanceMeters } from '@/utils/geoCalc';
import { triggerMediumHaptic, triggerSuccessHaptic } from '@/utils/haptics';

export default function HomeScreen() {
  const router = useRouter();

  const activePartnerId = useCoupleStore((s) => s.activePartnerId);
  const setActivePartner = useCoupleStore((s) => s.setActivePartner);
  const p1 = useCoupleStore((s) => s.partners.p1);
  const p2 = useCoupleStore((s) => s.partners.p2);
  const loc1 = useCoupleStore((s) => s.locations.p1);
  const loc2 = useCoupleStore((s) => s.locations.p2);
  const hugCount = useCoupleStore((s) => s.hugCount);
  const lastHugFrom = useCoupleStore((s) => s.lastHugFrom);
  const lastHugAt = useCoupleStore((s) => s.lastHugAt);
  const loveNotes = useCoupleStore((s) => s.loveNotes);
  const coupleTitle = useCoupleStore((s) => s.coupleTitle);
  const anniversaryDate = useCoupleStore((s) => s.anniversaryDate);
  const syncConfig = useCoupleStore((s) => s.syncConfig);
  const syncStatus = useCoupleStore((s) => s.syncStatus);
  const notifications = useCoupleStore((s) => s.notifications);

  const updateMood = useCoupleStore((s) => s.updateMood);
  const updateStatusText = useCoupleStore((s) => s.updateStatusText);
  const sendHug = useCoupleStore((s) => s.sendHug);
  const updateCoupleSettings = useCoupleStore((s) => s.updateCoupleSettings);

  const activePartner = activePartnerId === 'p1' ? p1 : p2;
  const partnerOther = activePartnerId === 'p1' ? p2 : p1;
  const partnerLoc = activePartnerId === 'p1' ? loc2 : loc1;
  const distanceLabel =
    loc1.isSharing && loc2.isSharing
      ? formatDistanceId(
          getDistanceMeters(loc1.latitude, loc1.longitude, loc2.latitude, loc2.longitude)
        )
      : 'Privasi';

  const [statusInput, setStatusInput] = useState('');
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [syncModalVisible, setSyncModalVisible] = useState(false);
  const [notifModalVisible, setNotifModalVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates?.height ?? 0);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const unreadNotifCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  // Edit modal form state
  const [formTitle, setFormTitle] = useState(coupleTitle);
  const [formDate, setFormDate] = useState(anniversaryDate);
  const [formP1Name, setFormP1Name] = useState(p1.name);
  const [formP1Nick, setFormP1Nick] = useState(p1.nickname);
  const [formP2Name, setFormP2Name] = useState(p2.name);
  const [formP2Nick, setFormP2Nick] = useState(p2.nickname);

  // Reanimated heart burst for "Kirim Peluk"
  const hugScale = useSharedValue(1);
  const burstOpacity = useSharedValue(0);
  const burstTranslateY = useSharedValue(0);

  const hugIconAnim = useAnimatedStyle(() => ({
    transform: [{ scale: hugScale.value }],
  }));

  const burstAnim = useAnimatedStyle(() => ({
    opacity: burstOpacity.value,
    transform: [{ translateY: burstTranslateY.value }],
  }));

  const handleTogglePartner = useCallback(() => {
    setActivePartner(activePartnerId === 'p1' ? 'p2' : 'p1');
  }, [activePartnerId, setActivePartner]);

  const handleSelectMood = useCallback(
    (moodId: MoodId) => {
      triggerMediumHaptic();
      updateMood(activePartnerId, moodId);
    },
    [activePartnerId, updateMood]
  );

  const handleSaveStatus = useCallback(() => {
    const trimmed = statusInput.trim();
    if (!trimmed) return;
    triggerSuccessHaptic();
    updateStatusText(activePartnerId, trimmed);
    setStatusInput('');
    Keyboard.dismiss();
  }, [activePartnerId, statusInput, updateStatusText]);

  const handleSendHug = useCallback(() => {
    triggerSuccessHaptic();
    sendHug(activePartnerId);

    hugScale.set(
      withSequence(
        withSpring(1.28, { damping: 9, stiffness: 360 }),
        withSpring(1, { damping: 12, stiffness: 260 })
      )
    );
    burstTranslateY.set(
      withSequence(withTiming(0, { duration: 0 }), withTiming(-24, { duration: 700 }))
    );
    burstOpacity.set(
      withSequence(withTiming(1, { duration: 0 }), withTiming(0, { duration: 750 }))
    );
  }, [activePartnerId, burstOpacity, burstTranslateY, hugScale, sendHug]);

  const openEditModal = useCallback(() => {
    setFormTitle(coupleTitle);
    setFormDate(anniversaryDate);
    setFormP1Name(p1.name);
    setFormP1Nick(p1.nickname);
    setFormP2Name(p2.name);
    setFormP2Nick(p2.nickname);
    setEditModalVisible(true);
  }, [anniversaryDate, coupleTitle, p1.name, p1.nickname, p2.name, p2.nickname]);

  const handleSaveSettings = useCallback(() => {
    triggerSuccessHaptic();
    updateCoupleSettings({
      coupleTitle: formTitle,
      anniversaryDate: formDate,
      p1Name: formP1Name,
      p1Nickname: formP1Nick,
      p2Name: formP2Name,
      p2Nickname: formP2Nick,
    });
    setEditModalVisible(false);
  }, [
    formDate,
    formP1Name,
    formP1Nick,
    formP2Name,
    formP2Nick,
    formTitle,
    updateCoupleSettings,
  ]);

  const pinnedNote = useMemo(
    () => loveNotes.find((n) => n.pinned) ?? loveNotes[0] ?? null,
    [loveNotes]
  );

  const pinnedPalette = useMemo(() => {
    if (!pinnedNote) return NOTE_PALETTES[0];
    return NOTE_PALETTES.find((p) => p.id === pinnedNote.colorId) ?? NOTE_PALETTES[0];
  }, [pinnedNote]);

  const p1MoodObj = MOOD_OPTIONS.find((m) => m.id === p1.mood) ?? MOOD_OPTIONS[0];
  const p2MoodObj = MOOD_OPTIONS.find((m) => m.id === p2.mood) ?? MOOD_OPTIONS[0];

  const lastHugSenderName =
    lastHugFrom === 'p1' ? p1.name : lastHugFrom === 'p2' ? p2.name : null;

  const isLive = syncConfig.enabled && syncStatus === 'connected';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          keyboardHeight > 0 && { paddingBottom: keyboardHeight + 48 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <View style={styles.centerColumn}>
          {/* Airy Borderless Top Header */}
          <View style={styles.headerRow}>
            <View style={styles.brandWrap}>
              <MochiBrandMark
                size={36}
                showWordmark
                subtitle={`Hai, ${activePartner.nickname}`}
              />
            </View>

            <View style={styles.headerActions}>
              <BouncyPressable
                onPress={() => setNotifModalVisible(true)}
                style={[styles.circleBtn, SoftShadowSm]}
                accessibilityLabel="Pusat Notifikasi">
                <Bell size={17} color={Pastel.text} />
                {unreadNotifCount > 0 ? (
                  <View style={styles.bellBadge}>
                    <Text style={styles.bellBadgeText}>
                      {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                    </Text>
                  </View>
                ) : null}
              </BouncyPressable>

              <BouncyPressable
                onPress={() => setSyncModalVisible(true)}
                style={[
                  styles.circleBtn,
                  SoftShadowSm,
                  isLive && styles.circleBtnLive,
                ]}
                accessibilityLabel="Live Sync 2 HP">
                <Cloud size={17} color={isLive ? Pastel.matcha : Pastel.textMuted} />
                {isLive ? <View style={styles.liveDot} /> : null}
              </BouncyPressable>

              <BouncyPressable
                onPress={handleTogglePartner}
                style={[styles.switchPill, SoftShadowSm]}>
                <ArrowLeftRight size={13} color={Pastel.coral} />
                <Text style={styles.switchPillText} numberOfLines={1}>
                  {activePartner.name}
                </Text>
              </BouncyPressable>
            </View>
          </View>

          {/* 1. Cheerful Coral Anniversary Hero */}
          <AnniversaryBanner onPressEdit={openEditModal} />

          {/* 2. Side-by-Side Soft Bento Partner Cards */}
          <View style={styles.duoGrid}>
            {/* Partner 1 Bento Card */}
            <View style={[styles.partnerBento, SoftShadow]}>
              <View style={styles.partnerTopRow}>
                <Text style={styles.partnerName} numberOfLines={1}>
                  {p1.name}
                </Text>
                {activePartnerId === 'p1' ? (
                  <View style={styles.youBadge}>
                    <Text style={styles.youBadgeText}>Kamu</Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.mascotStage}>
                <MochiMascot
                  bodyColor={p1.mochiColor}
                  auraColor={p1.auraColor}
                  mood={p1.mood}
                  size={80}
                />
              </View>

              <View style={[styles.moodPill, { backgroundColor: p1MoodObj.bg }]}>
                <Text style={styles.moodPillEmoji}>{p1MoodObj.emoji}</Text>
                <Text style={[styles.moodPillLabel, { color: p1MoodObj.accent }]}>
                  {p1MoodObj.label}
                </Text>
              </View>

              <View style={styles.quotePill}>
                <Text style={styles.quoteText} numberOfLines={3}>
                  “{p1.statusText}”
                </Text>
                <Text style={styles.quoteTime}>{formatRelativeTime(p1.updatedAt)}</Text>
              </View>
            </View>

            {/* Partner 2 Bento Card */}
            <View style={[styles.partnerBento, SoftShadow]}>
              <View style={styles.partnerTopRow}>
                <Text style={styles.partnerName} numberOfLines={1}>
                  {p2.name}
                </Text>
                {activePartnerId === 'p2' ? (
                  <View style={styles.youBadge}>
                    <Text style={styles.youBadgeText}>Kamu</Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.mascotStage}>
                <MochiMascot
                  bodyColor={p2.mochiColor}
                  auraColor={p2.auraColor}
                  mood={p2.mood}
                  size={80}
                  delayMs={450}
                />
              </View>

              <View style={[styles.moodPill, { backgroundColor: p2MoodObj.bg }]}>
                <Text style={styles.moodPillEmoji}>{p2MoodObj.emoji}</Text>
                <Text style={[styles.moodPillLabel, { color: p2MoodObj.accent }]}>
                  {p2MoodObj.label}
                </Text>
              </View>

              <View style={styles.quotePill}>
                <Text style={styles.quoteText} numberOfLines={3}>
                  “{p2.statusText}”
                </Text>
                <Text style={styles.quoteTime}>{formatRelativeTime(p2.updatedAt)}</Text>
              </View>
            </View>
          </View>

          {/* 3. Joyful Tactile Send Hug Action */}
          <View style={styles.hugSection}>
            <Animated.View style={[styles.burstFloat, burstAnim]} pointerEvents="none">
              <Text style={styles.burstText}>+1 Pelukan Hangat 🫂</Text>
            </Animated.View>

            <BouncyPressable
              onPress={handleSendHug}
              style={styles.hugButton}
              scaleTo={0.96}>
              <View style={styles.hugBtnLeft}>
                <Animated.View style={hugIconAnim}>
                  <Heart size={18} color={Pastel.pureWhite} fill={Pastel.pureWhite} />
                </Animated.View>
                <Text style={styles.hugButtonText} numberOfLines={1}>
                  Kirim Peluk ke {partnerOther.name}
                </Text>
              </View>
              <View style={styles.hugCounterPill}>
                <Text style={styles.hugCounterText}>{hugCount}</Text>
              </View>
            </BouncyPressable>

            {lastHugSenderName && lastHugAt ? (
              <Text style={styles.lastHugHint}>
                Pelukan terakhir dari {lastHugSenderName} · {formatRelativeTime(lastHugAt)}
              </Text>
            ) : null}
          </View>

          {/* 4. Clean Borderless Location Bento Strip */}
          <BouncyPressable
            onPress={() => router.push('/lokasi')}
            style={[styles.locationStrip, SoftShadow]}>
            <View style={styles.locationIconWrap}>
              <MapPin size={19} color={Pastel.matcha} />
            </View>
            <View style={styles.locationInfo}>
              <View style={styles.locationTitleRow}>
                <Text style={styles.locationTitle}>Lokasi Berdua</Text>
                <View style={styles.distancePill}>
                  <Text style={styles.distancePillText}>{distanceLabel}</Text>
                </View>
              </View>
              <Text style={styles.locationSub} numberOfLines={1}>
                {partnerLoc.isSharing
                  ? `${partnerOther.name} di ${partnerLoc.areaName}`
                  : `${partnerOther.name} mengaktifkan mode privasi`}
              </Text>
            </View>
            <View style={styles.locationArrowWrap}>
              <ChevronRight size={18} color={Pastel.textMuted} />
            </View>
          </BouncyPressable>

          {/* 5. Soft Mood & Status Composer Bento */}
          <View style={[styles.composerCard, SoftShadow]}>
            <Text style={styles.composerHeading}>
              Apa kabar {activePartner.name} sekarang?
            </Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.moodList}>
              {MOOD_OPTIONS.map((mood) => {
                const selected = activePartner.mood === mood.id;
                return (
                  <BouncyPressable
                    key={mood.id}
                    onPress={() => handleSelectMood(mood.id)}
                    style={[
                      styles.moodChip,
                      selected
                        ? { backgroundColor: mood.bg }
                        : { backgroundColor: Pastel.bgMuted },
                    ]}>
                    <Text style={styles.moodChipEmoji}>{mood.emoji}</Text>
                    <Text
                      style={[
                        styles.moodChipLabel,
                        selected && { color: mood.accent, fontFamily: BodyFontBold },
                      ]}>
                      {mood.label}
                    </Text>
                  </BouncyPressable>
                );
              })}
            </ScrollView>

            <View style={styles.statusInputRow}>
              <TextInput
                value={statusInput}
                onChangeText={setStatusInput}
                placeholder={`Tulis kabar singkat buat ${partnerOther.name}...`}
                placeholderTextColor={Pastel.textSoft}
                style={styles.statusInput}
                maxLength={90}
                returnKeyType="send"
                onFocus={() => {
                  setTimeout(() => {
                    scrollRef.current?.scrollToEnd({ animated: true });
                  }, 150);
                }}
                onSubmitEditing={handleSaveStatus}
              />
              <BouncyPressable
                onPress={handleSaveStatus}
                style={[
                  styles.sendStatusBtn,
                  !statusInput.trim() && { opacity: 0.45 },
                ]}>
                <Send size={16} color={Pastel.pureWhite} />
              </BouncyPressable>
            </View>
          </View>

          {/* 6. Soft Pastel Pinned Love Note Card */}
          {pinnedNote ? (
            <BouncyPressable
              onPress={() => router.push('/notes')}
              style={[
                styles.pinnedCard,
                SoftShadowSm,
                { backgroundColor: pinnedPalette.bg },
              ]}>
              <View style={styles.pinnedTop}>
                <View style={styles.pinnedAuthorPill}>
                  <Pin size={12} color={pinnedPalette.accent} />
                  <Text style={[styles.pinnedBadgeText, { color: pinnedPalette.accent }]}>
                    Catatan dari {pinnedNote.authorId === 'p1' ? p1.name : p2.name}
                  </Text>
                </View>
                <Text style={styles.pinnedSticker}>{pinnedNote.sticker}</Text>
              </View>

              <Text style={styles.pinnedMessage}>“{pinnedNote.message}”</Text>

              <View style={styles.pinnedFooter}>
                <Text style={styles.pinnedHint}>Lihat semua Love Notes</Text>
                {pinnedNote.reaction ? (
                  <View style={styles.reactionPill}>
                    <Text style={styles.reactionText}>{pinnedNote.reaction}</Text>
                  </View>
                ) : null}
              </View>
            </BouncyPressable>
          ) : null}
        </View>
      </ScrollView>

      {/* Edit Couple Profile & Anniversary Modal */}
      <KeyboardModalSheet
        visible={editModalVisible}
        onRequestClose={() => setEditModalVisible(false)}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Atur Profil Couple</Text>
          <BouncyPressable
            onPress={() => setEditModalVisible(false)}
            style={styles.modalCloseBtn}>
            <X size={18} color={Pastel.textMuted} />
          </BouncyPressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.modalBody}>
          <Text style={styles.inputLabel}>Nama Couple Kalian</Text>
          <TextInput
            value={formTitle}
            onChangeText={setFormTitle}
            placeholder="Misal: Mochi & Boba"
            placeholderTextColor={Pastel.textSoft}
            style={styles.modalInput}
          />

          <Text style={styles.inputLabel}>Tanggal Jadian</Text>
          <DatePickerField
            value={formDate}
            onChange={setFormDate}
            placeholder="2024-02-14"
          />

          <View style={styles.modalTwoCol}>
            <View style={styles.modalCol}>
              <Text style={styles.inputLabel}>Nama Partner 1</Text>
              <TextInput
                value={formP1Name}
                onChangeText={setFormP1Name}
                style={styles.modalInput}
              />
            </View>
            <View style={styles.modalCol}>
              <Text style={styles.inputLabel}>Panggilan</Text>
              <TextInput
                value={formP1Nick}
                onChangeText={setFormP1Nick}
                style={styles.modalInput}
              />
            </View>
          </View>

          <View style={styles.modalTwoCol}>
            <View style={styles.modalCol}>
              <Text style={styles.inputLabel}>Nama Partner 2</Text>
              <TextInput
                value={formP2Name}
                onChangeText={setFormP2Name}
                style={styles.modalInput}
              />
            </View>
            <View style={styles.modalCol}>
              <Text style={styles.inputLabel}>Panggilan</Text>
              <TextInput
                value={formP2Nick}
                onChangeText={setFormP2Nick}
                style={styles.modalInput}
              />
            </View>
          </View>

          <BouncyPressable onPress={handleSaveSettings} style={styles.saveModalBtn}>
            <Text style={styles.saveModalBtnText}>Simpan Perubahan</Text>
          </BouncyPressable>
        </ScrollView>
      </KeyboardModalSheet>

      <LiveSyncModal
        visible={syncModalVisible}
        onClose={() => setSyncModalVisible(false)}
      />

      <NotificationCenterModal
        visible={notifModalVisible}
        onClose={() => setNotifModalVisible(false)}
      />
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
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingBottom: 2,
  },
  brandWrap: {
    flex: 1,
    flexShrink: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  circleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Pastel.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  circleBtnLive: {
    backgroundColor: Pastel.matchaSoft,
  },
  liveDot: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Pastel.matcha,
  },
  bellBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: Pastel.coral,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  bellBadgeText: {
    fontFamily: BodyFontBold,
    fontSize: 9.5,
    lineHeight: 13,
    color: Pastel.pureWhite,
  },
  switchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Pastel.bgElevated,
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 999,
    maxWidth: 116,
  },
  switchPillText: {
    fontFamily: BodyFontBold,
    fontSize: 13,
    lineHeight: 18,
    color: Pastel.text,
    flexShrink: 1,
  },
  duoGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  partnerBento: {
    flex: 1,
    backgroundColor: Pastel.bgElevated,
    borderRadius: 24,
    padding: 14,
    alignItems: 'center',
    gap: 10,
  },
  partnerTopRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  partnerName: {
    fontFamily: BodyFontBold,
    fontSize: 15,
    lineHeight: 21,
    color: Pastel.text,
    flexShrink: 1,
  },
  youBadge: {
    backgroundColor: Pastel.coralSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  youBadgeText: {
    fontFamily: BodyFontBold,
    fontSize: 10.5,
    lineHeight: 15,
    color: Pastel.coralDark,
  },
  mascotStage: {
    paddingVertical: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  moodPillEmoji: {
    fontSize: 13,
    lineHeight: 18,
  },
  moodPillLabel: {
    fontFamily: BodyFontBold,
    fontSize: 12,
    lineHeight: 17,
  },
  quotePill: {
    width: '100%',
    backgroundColor: Pastel.bg,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 9,
    gap: 4,
  },
  quoteText: {
    fontFamily: BodyFontRegular,
    fontSize: 12.5,
    lineHeight: 18,
    color: Pastel.text,
    textAlign: 'center',
  },
  quoteTime: {
    fontFamily: RoundedFont,
    fontSize: 10.5,
    lineHeight: 15,
    color: Pastel.textSoft,
    textAlign: 'center',
  },
  hugSection: {
    alignItems: 'center',
    gap: 8,
  },
  burstFloat: {
    position: 'absolute',
    top: -22,
    zIndex: 10,
  },
  burstText: {
    fontFamily: BodyFontBold,
    fontSize: 13,
    lineHeight: 18,
    color: Pastel.coral,
  },
  hugButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Pastel.coral,
    paddingLeft: 18,
    paddingRight: 10,
    paddingVertical: 12,
    borderRadius: 999,
    ...Platform.select({
      ios: {
        shadowColor: '#FF5C7A',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.28,
        shadowRadius: 16,
      },
      android: { elevation: 3 },
      default: {},
    }),
  },
  hugBtnLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  hugButtonText: {
    fontFamily: BodyFontBold,
    fontSize: 14.5,
    lineHeight: 20,
    color: Pastel.pureWhite,
    flexShrink: 1,
  },
  hugCounterPill: {
    backgroundColor: 'rgba(255,255,255,0.24)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  hugCounterText: {
    fontFamily: BodyFontBold,
    fontSize: 13,
    lineHeight: 18,
    color: Pastel.pureWhite,
  },
  lastHugHint: {
    fontFamily: RoundedFont,
    fontSize: 12,
    lineHeight: 17,
    color: Pastel.textMuted,
  },
  locationStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Pastel.bgElevated,
    borderRadius: 24,
    padding: 14,
  },
  locationIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Pastel.matchaSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationInfo: {
    flex: 1,
    gap: 3,
  },
  locationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationTitle: {
    fontFamily: BodyFontBold,
    fontSize: 14.5,
    lineHeight: 20,
    color: Pastel.text,
  },
  distancePill: {
    backgroundColor: Pastel.matchaSoft,
    paddingHorizontal: 9,
    paddingVertical: 2,
    borderRadius: 999,
  },
  distancePillText: {
    fontFamily: BodyFontBold,
    fontSize: 11.5,
    lineHeight: 16,
    color: Pastel.matcha,
  },
  locationSub: {
    fontFamily: BodyFontRegular,
    fontSize: 12.5,
    lineHeight: 18,
    color: Pastel.textMuted,
  },
  locationArrowWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Pastel.bgMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composerCard: {
    backgroundColor: Pastel.bgElevated,
    borderRadius: 24,
    padding: 16,
    gap: 12,
  },
  composerHeading: {
    fontFamily: BodyFontBold,
    fontSize: 15.5,
    lineHeight: 22,
    color: Pastel.text,
  },
  moodList: {
    gap: 8,
    paddingVertical: 2,
  },
  moodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 999,
  },
  moodChipEmoji: {
    fontSize: 14,
    lineHeight: 19,
  },
  moodChipLabel: {
    fontFamily: BodyFontSemi,
    fontSize: 13,
    lineHeight: 18,
    color: Pastel.textMuted,
  },
  statusInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusInput: {
    flex: 1,
    backgroundColor: Pastel.bgMuted,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 11,
    fontFamily: RoundedFont,
    fontSize: 14,
    lineHeight: 20,
    color: Pastel.text,
  },
  sendStatusBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Pastel.coral,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinnedCard: {
    borderRadius: 24,
    padding: 18,
    gap: 10,
  },
  pinnedTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  pinnedAuthorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.78)',
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 999,
  },
  pinnedBadgeText: {
    fontFamily: BodyFontBold,
    fontSize: 12,
    lineHeight: 17,
  },
  pinnedSticker: {
    fontSize: 22,
    lineHeight: 28,
  },
  pinnedMessage: {
    fontFamily: BodyFontSemi,
    fontSize: 15.5,
    lineHeight: 24,
    color: Pastel.text,
  },
  pinnedFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  pinnedHint: {
    fontFamily: BodyFontSemi,
    fontSize: 12.5,
    lineHeight: 18,
    color: Pastel.textMuted,
  },
  reactionPill: {
    backgroundColor: Pastel.bgElevated,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  reactionText: {
    fontSize: 14,
    lineHeight: 19,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTitle: {
    fontFamily: BodyFontBold,
    fontSize: 20,
    lineHeight: 28,
    color: Pastel.text,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Pastel.bgMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    gap: 10,
    paddingBottom: 20,
  },
  inputLabel: {
    fontFamily: BodyFontSemi,
    fontSize: 13,
    lineHeight: 19,
    color: Pastel.textMuted,
    marginTop: 4,
  },
  modalInput: {
    backgroundColor: Pastel.bgMuted,
    borderRadius: 16,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontFamily: RoundedFont,
    fontSize: 14.5,
    lineHeight: 20,
    color: Pastel.text,
  },
  modalTwoCol: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCol: {
    flex: 1,
    gap: 4,
  },
  saveModalBtn: {
    backgroundColor: Pastel.coral,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  saveModalBtnText: {
    fontFamily: BodyFontBold,
    fontSize: 15,
    lineHeight: 21,
    color: Pastel.pureWhite,
  },
});
