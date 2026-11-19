import { useRouter } from 'expo-router';
import {
  ArrowLeftRight,
  ArrowUpRight,
  Bell,
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
  BodyFontSemi,
  MOOD_OPTIONS,
  MonoFont,
  MonoFontBold,
  NOTE_PALETTES,
  Pastel,
  RoundedFont,
  SerifFont,
  SerifFontSemi,
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
          {/* Editorial Masthead & Brand Mark */}
          <View style={styles.headerRow}>
            <MochiBrandMark
              size={34}
              showWordmark
              subtitle={`Hai, ${activePartner.nickname}`}
            />

            <View style={styles.headerActions}>
              <BouncyPressable
                onPress={() => setNotifModalVisible(true)}
                style={styles.iconBtn}
                accessibilityLabel="Pusat Notifikasi">
                <Bell size={15} color={Pastel.text} />
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
                style={[styles.utilityChip, isLive && styles.utilityChipLive]}>
                <Cloud size={13} color={isLive ? Pastel.matcha : Pastel.textMuted} />
                <Text
                  style={[
                    styles.utilityChipText,
                    isLive && { color: Pastel.matcha },
                  ]}>
                  {isLive ? 'Live' : '2 HP'}
                </Text>
              </BouncyPressable>

              <BouncyPressable onPress={handleTogglePartner} style={styles.switchPill}>
                <ArrowLeftRight size={12} color={Pastel.text} />
                <Text style={styles.switchPillText}>{activePartner.name}</Text>
              </BouncyPressable>
            </View>
          </View>

          {/* 1. Commemorative Anniversary Ledger */}
          <AnniversaryBanner onPressEdit={openEditModal} />

          {/* 2. Duo Mochi Dispatch Card */}
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleGroup}>
                <Text style={styles.sectionKicker}>02</Text>
                <Text style={styles.sectionTitle}>Mood &amp; Kabar Kalian</Text>
              </View>
              <View style={styles.hugCountStamp}>
                <Text style={styles.hugCountText}>{hugCount} PELUKAN</Text>
              </View>
            </View>

            <View style={styles.duoGrid}>
              {/* Partner 1 Column */}
              <View
                style={[
                  styles.mochiCard,
                  activePartnerId === 'p1' && styles.mochiCardActive,
                ]}>
                <View style={styles.mochiNameRow}>
                  <Text style={styles.mochiName} numberOfLines={1}>
                    {p1.name}
                  </Text>
                  <View
                    style={[
                      styles.moodTag,
                      {
                        backgroundColor: p1MoodObj.bg,
                        borderColor: p1MoodObj.accent + '44',
                      },
                    ]}>
                    <Text style={[styles.moodTagText, { color: p1MoodObj.accent }]}>
                      {p1MoodObj.label}
                    </Text>
                  </View>
                </View>

                <MochiMascot
                  bodyColor={p1.mochiColor}
                  auraColor={p1.auraColor}
                  mood={p1.mood}
                  size={74}
                />

                <View style={styles.statusBubble}>
                  <Text style={styles.statusBubbleText} numberOfLines={3}>
                    “{p1.statusText}”
                  </Text>
                  <Text style={styles.updatedTime}>
                    {formatRelativeTime(p1.updatedAt)}
                  </Text>
                </View>
              </View>

              {/* Partner 2 Column */}
              <View
                style={[
                  styles.mochiCard,
                  activePartnerId === 'p2' && styles.mochiCardActive,
                ]}>
                <View style={styles.mochiNameRow}>
                  <Text style={styles.mochiName} numberOfLines={1}>
                    {p2.name}
                  </Text>
                  <View
                    style={[
                      styles.moodTag,
                      {
                        backgroundColor: p2MoodObj.bg,
                        borderColor: p2MoodObj.accent + '44',
                      },
                    ]}>
                    <Text style={[styles.moodTagText, { color: p2MoodObj.accent }]}>
                      {p2MoodObj.label}
                    </Text>
                  </View>
                </View>

                <MochiMascot
                  bodyColor={p2.mochiColor}
                  auraColor={p2.auraColor}
                  mood={p2.mood}
                  size={74}
                  delayMs={500}
                />

                <View style={styles.statusBubble}>
                  <Text style={styles.statusBubbleText} numberOfLines={3}>
                    “{p2.statusText}”
                  </Text>
                  <Text style={styles.updatedTime}>
                    {formatRelativeTime(p2.updatedAt)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Tactile Hanko Hug Stamp Button */}
            <View style={styles.hugRow}>
              <Animated.View style={[styles.burstFloat, burstAnim]} pointerEvents="none">
                <Text style={styles.burstText}>+1 Pelukan Hangat</Text>
              </Animated.View>

              <BouncyPressable onPress={handleSendHug} style={styles.hugButton} scaleTo={0.96}>
                <Animated.View style={hugIconAnim}>
                  <Heart size={16} color={Pastel.pureWhite} fill={Pastel.pureWhite} />
                </Animated.View>
                <Text style={styles.hugButtonText}>
                  Kirim Peluk ke {partnerOther.name}
                </Text>
              </BouncyPressable>

              {lastHugSenderName && lastHugAt ? (
                <Text style={styles.lastHugHint}>
                  Terakhir dari {lastHugSenderName} · {formatRelativeTime(lastHugAt)}
                </Text>
              ) : null}
            </View>
          </View>

          {/* 3. Compact Cartographic Distance Strip */}
          <BouncyPressable
            onPress={() => router.push('/lokasi')}
            style={styles.locationStrip}>
            <View style={styles.locationIconWrap}>
              <MapPin size={17} color={Pastel.matcha} />
            </View>
            <View style={styles.locationInfo}>
              <View style={styles.locationTitleRow}>
                <Text style={styles.locationTitle}>Lokasi Berdua</Text>
                <Text style={styles.locationDistMono}>{distanceLabel}</Text>
              </View>
              <Text style={styles.locationSub} numberOfLines={1}>
                {partnerLoc.isSharing
                  ? `${partnerOther.name}: ${partnerLoc.areaName}`
                  : `${partnerOther.name} mengaktifkan mode privasi`}
              </Text>
            </View>
            <View style={styles.locationArrowWrap}>
              <ArrowUpRight size={16} color={Pastel.textMuted} />
            </View>
          </BouncyPressable>

          {/* 4. Quick Mood & Status Composer */}
          <View style={styles.card}>
            <View style={styles.sectionTitleGroup}>
              <Text style={styles.sectionKicker}>03</Text>
              <Text style={styles.sectionTitle}>
                Perbarui Kabar {activePartner.name}
              </Text>
            </View>

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
                        ? {
                            backgroundColor: mood.bg,
                            borderColor: mood.accent,
                          }
                        : {
                            backgroundColor: Pastel.bg,
                            borderColor: Pastel.border,
                          },
                    ]}>
                    <View
                      style={[
                        styles.moodDot,
                        { backgroundColor: selected ? mood.accent : Pastel.borderStrong },
                      ]}
                    />
                    <Text
                      style={[
                        styles.moodChipLabel,
                        selected && { color: Pastel.text, fontFamily: BodyFontBold },
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
                <Send size={15} color={Pastel.pureWhite} />
              </BouncyPressable>
            </View>
          </View>

          {/* 5. Pinned Stationery Love Note */}
          {pinnedNote ? (
            <BouncyPressable
              onPress={() => router.push('/notes')}
              style={[
                styles.pinnedCard,
                {
                  backgroundColor: pinnedPalette.bg,
                  borderColor: pinnedPalette.border,
                },
              ]}>
              <View style={styles.pinnedTop}>
                <View style={styles.pinnedBadge}>
                  <Pin size={12} color={pinnedPalette.accent} />
                  <Text style={[styles.pinnedBadgeText, { color: pinnedPalette.accent }]}>
                    CATATAN DISEMATKAN · DARI{' '}
                    {(pinnedNote.authorId === 'p1' ? p1.name : p2.name).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.pinnedSticker}>{pinnedNote.sticker}</Text>
              </View>

              <Text style={styles.pinnedMessage}>“{pinnedNote.message}”</Text>

              <View style={styles.pinnedFooter}>
                <Text style={styles.pinnedHint}>Buka papan Love Notes →</Text>
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

          <Text style={styles.inputLabel}>Tanggal Jadian (Kalender atau Ketik)</Text>
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
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 112,
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
    justifyContent: 'space-between',
    gap: 8,
    paddingBottom: 4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: Pastel.bgElevated,
    borderWidth: 1,
    borderColor: Pastel.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: Pastel.coral,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: Pastel.bg,
  },
  bellBadgeText: {
    fontFamily: MonoFontBold,
    fontSize: 8.5,
    color: Pastel.pureWhite,
  },
  utilityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Pastel.bgElevated,
    borderWidth: 1,
    borderColor: Pastel.borderStrong,
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 10,
  },
  utilityChipLive: {
    backgroundColor: Pastel.matchaSoft,
    borderColor: Pastel.matcha + '66',
  },
  utilityChipText: {
    fontFamily: BodyFontSemi,
    fontSize: 11.5,
    color: Pastel.textMuted,
  },
  switchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Pastel.bgMuted,
    borderWidth: 1,
    borderColor: Pastel.borderStrong,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
  },
  switchPillText: {
    fontFamily: BodyFontBold,
    fontSize: 12,
    color: Pastel.text,
  },
  card: {
    backgroundColor: Pastel.bgElevated,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Pastel.borderStrong,
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  sectionTitleGroup: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  sectionKicker: {
    fontFamily: MonoFontBold,
    fontSize: 11,
    color: Pastel.coral,
    letterSpacing: 0.8,
  },
  sectionTitle: {
    fontFamily: SerifFontSemi,
    fontSize: 18,
    color: Pastel.text,
  },
  hugCountStamp: {
    borderWidth: 1,
    borderColor: Pastel.borderStrong,
    backgroundColor: Pastel.bg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  hugCountText: {
    fontFamily: MonoFontBold,
    fontSize: 10,
    color: Pastel.textMuted,
    letterSpacing: 0.6,
  },
  duoGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  mochiCard: {
    flex: 1,
    backgroundColor: Pastel.bg,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: Pastel.border,
    alignItems: 'center',
    gap: 8,
  },
  mochiCardActive: {
    borderColor: Pastel.text,
    backgroundColor: Pastel.bgElevated,
  },
  mochiNameRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  mochiName: {
    fontFamily: BodyFontBold,
    fontSize: 13.5,
    color: Pastel.text,
    flexShrink: 1,
  },
  moodTag: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  moodTagText: {
    fontFamily: BodyFontSemi,
    fontSize: 10.5,
  },
  statusBubble: {
    width: '100%',
    backgroundColor: Pastel.bgElevated,
    borderWidth: 1,
    borderColor: Pastel.border,
    borderRadius: 10,
    padding: 9,
    gap: 4,
  },
  statusBubbleText: {
    fontFamily: RoundedFont,
    fontSize: 12,
    color: Pastel.text,
    lineHeight: 16.5,
    textAlign: 'center',
  },
  updatedTime: {
    fontFamily: MonoFont,
    fontSize: 10,
    color: Pastel.textSoft,
    textAlign: 'center',
  },
  hugRow: {
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  burstFloat: {
    position: 'absolute',
    top: -18,
    zIndex: 10,
  },
  burstText: {
    fontFamily: BodyFontBold,
    fontSize: 12.5,
    color: Pastel.coral,
  },
  hugButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Pastel.coral,
    paddingVertical: 13,
    borderRadius: 12,
  },
  hugButtonText: {
    fontFamily: BodyFontBold,
    fontSize: 14,
    color: Pastel.pureWhite,
  },
  lastHugHint: {
    fontFamily: MonoFont,
    fontSize: 10.5,
    color: Pastel.textMuted,
  },
  locationStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Pastel.bgMuted,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Pastel.borderStrong,
  },
  locationIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Pastel.bgElevated,
    borderWidth: 1,
    borderColor: Pastel.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationInfo: {
    flex: 1,
    gap: 2,
  },
  locationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationTitle: {
    fontFamily: BodyFontBold,
    fontSize: 13.5,
    color: Pastel.text,
  },
  locationDistMono: {
    fontFamily: MonoFontBold,
    fontSize: 11.5,
    color: Pastel.matcha,
  },
  locationSub: {
    fontFamily: RoundedFont,
    fontSize: 12,
    color: Pastel.textMuted,
  },
  locationArrowWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Pastel.bgElevated,
    borderWidth: 1,
    borderColor: Pastel.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodList: {
    gap: 7,
    paddingVertical: 2,
  },
  moodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  moodDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  moodChipLabel: {
    fontFamily: BodyFontSemi,
    fontSize: 12.5,
    color: Pastel.textMuted,
  },
  statusInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusInput: {
    flex: 1,
    backgroundColor: Pastel.bg,
    borderWidth: 1,
    borderColor: Pastel.borderStrong,
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 10,
    fontFamily: RoundedFont,
    fontSize: 13.5,
    color: Pastel.text,
  },
  sendStatusBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Pastel.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinnedCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    gap: 8,
  },
  pinnedTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pinnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  pinnedBadgeText: {
    fontFamily: MonoFontBold,
    fontSize: 10,
    letterSpacing: 0.6,
  },
  pinnedSticker: {
    fontSize: 18,
  },
  pinnedMessage: {
    fontFamily: SerifFont,
    fontSize: 16.5,
    color: Pastel.text,
    lineHeight: 23,
  },
  pinnedFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  pinnedHint: {
    fontFamily: BodyFontSemi,
    fontSize: 12,
    color: Pastel.textMuted,
  },
  reactionPill: {
    backgroundColor: Pastel.bgElevated,
    borderWidth: 1,
    borderColor: Pastel.border,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  reactionText: {
    fontSize: 13,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTitle: {
    fontFamily: SerifFontSemi,
    fontSize: 20,
    color: Pastel.text,
  },
  modalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: Pastel.bgMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    gap: 10,
    paddingBottom: 18,
  },
  inputLabel: {
    fontFamily: BodyFontSemi,
    fontSize: 12,
    color: Pastel.textMuted,
    marginTop: 4,
  },
  modalInput: {
    backgroundColor: Pastel.bg,
    borderWidth: 1,
    borderColor: Pastel.borderStrong,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontFamily: RoundedFont,
    fontSize: 14,
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
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  saveModalBtnText: {
    fontFamily: BodyFontBold,
    fontSize: 14.5,
    color: Pastel.pureWhite,
  },
});
