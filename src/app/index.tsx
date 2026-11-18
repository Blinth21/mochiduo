import { useRouter } from 'expo-router';
import {
  ArrowLeftRight,
  Cloud,
  Heart,
  MapPin,
  Pin,
  Send,
  Sparkles,
  X,
} from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
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
import { LiveSyncModal } from '@/components/LiveSyncModal';
import { MochiMascot } from '@/components/MochiMascot';
import {
  MOOD_OPTIONS,
  NOTE_PALETTES,
  Pastel,
  RoundedFont,
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
  }, [activePartnerId, statusInput, updateStatusText]);

  const handleSendHug = useCallback(() => {
    triggerSuccessHaptic();
    sendHug(activePartnerId);

    hugScale.set(
      withSequence(
        withSpring(1.32, { damping: 8, stiffness: 360 }),
        withSpring(1, { damping: 12, stiffness: 260 })
      )
    );
    burstTranslateY.set(
      withSequence(withTiming(0, { duration: 0 }), withTiming(-26, { duration: 700 }))
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

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <View style={styles.centerColumn}>
          {/* Top App Header & Active Partner / Sync Switchers */}
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.brandHello}>Hai, {activePartner.nickname}! ✨</Text>
              <Text style={styles.brandSub}>Ruang berdua kalian hari ini</Text>
            </View>

            <View style={styles.headerActions}>
              <BouncyPressable
                onPress={() => setSyncModalVisible(true)}
                style={[
                  styles.syncPill,
                  syncConfig.enabled && syncStatus === 'connected' && styles.syncPillLive,
                ]}>
                <Cloud
                  size={13}
                  color={
                    syncConfig.enabled && syncStatus === 'connected'
                      ? '#178C68'
                      : Pastel.coralDark
                  }
                />
                <Text
                  style={[
                    styles.syncPillText,
                    syncConfig.enabled && syncStatus === 'connected' && { color: '#178C68' },
                  ]}>
                  {syncConfig.enabled && syncStatus === 'connected' ? 'Live' : '2 HP'}
                </Text>
              </BouncyPressable>

              <BouncyPressable onPress={handleTogglePartner} style={styles.switchPill}>
                <ArrowLeftRight size={13} color={Pastel.taro} />
                <Text style={styles.switchPillText}>{activePartner.name}</Text>
              </BouncyPressable>
            </View>
          </View>

          {/* 1. Anniversary & Live Countdown Banner */}
          <AnniversaryBanner onPressEdit={openEditModal} />

          {/* 2. Duo Mochi Mood & Status Widget */}
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Mood & Kabar Kalian 🍡</Text>
              <Text style={styles.sectionBadge}>{hugCount} Pelukan 💕</Text>
            </View>

            <View style={styles.duoGrid}>
              {/* Partner 1 Card */}
              <View
                style={[
                  styles.mochiCard,
                  { backgroundColor: p1MoodObj.bg, borderColor: p1MoodObj.accent + '44' },
                  activePartnerId === 'p1' && styles.mochiCardActive,
                ]}>
                <View style={styles.mochiNameRow}>
                  <Text style={styles.mochiName}>{p1.name}</Text>
                  <View style={[styles.moodTag, { backgroundColor: Pastel.white }]}>
                    <Text style={styles.moodTagText}>
                      {p1MoodObj.emoji} {p1MoodObj.label}
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

              {/* Partner 2 Card */}
              <View
                style={[
                  styles.mochiCard,
                  { backgroundColor: p2MoodObj.bg, borderColor: p2MoodObj.accent + '44' },
                  activePartnerId === 'p2' && styles.mochiCardActive,
                ]}>
                <View style={styles.mochiNameRow}>
                  <Text style={styles.mochiName}>{p2.name}</Text>
                  <View style={[styles.moodTag, { backgroundColor: Pastel.white }]}>
                    <Text style={styles.moodTagText}>
                      {p2MoodObj.emoji} {p2MoodObj.label}
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

            {/* Send Hug Button */}
            <View style={styles.hugRow}>
              <Animated.View style={[styles.burstFloat, burstAnim]} pointerEvents="none">
                <Text style={styles.burstText}>+1 Peluk Hangat! 🫂💕</Text>
              </Animated.View>

              <BouncyPressable onPress={handleSendHug} style={styles.hugButton} scaleTo={0.94}>
                <Animated.View style={hugIconAnim}>
                  <Heart size={18} color={Pastel.white} fill={Pastel.white} />
                </Animated.View>
                <Text style={styles.hugButtonText}>
                  Kirim Peluk ke {partnerOther.name}
                </Text>
              </BouncyPressable>

              {lastHugSenderName && lastHugAt ? (
                <Text style={styles.lastHugHint}>
                  Terakhir: {lastHugSenderName} kirim peluk ({formatRelativeTime(lastHugAt)})
                </Text>
              ) : null}
            </View>
          </View>

          {/* 2.5. Compact Radar Lokasi Quick Strip */}
          <BouncyPressable
            onPress={() => router.push('/lokasi')}
            style={styles.locationStrip}>
            <View style={styles.locationIconWrap}>
              <MapPin size={18} color="#178C68" />
            </View>
            <View style={styles.locationInfo}>
              <Text style={styles.locationTitle}>
                Radar Lokasi • Jarak {distanceLabel}
              </Text>
              <Text style={styles.locationSub} numberOfLines={1}>
                {partnerLoc.isSharing
                  ? `${partnerOther.name}: ${partnerLoc.areaName}`
                  : `${partnerOther.name} mengaktifkan mode privasi`}
              </Text>
            </View>
            <Text style={styles.locationArrow}>Cek →</Text>
          </BouncyPressable>

          {/* 3. Quick Update Mood & Status Bar */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              Update Mood {activePartner.name} Hari Ini
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
                      {
                        backgroundColor: selected ? mood.bg : Pastel.bg,
                        borderColor: selected ? mood.accent : Pastel.border,
                      },
                    ]}>
                    <Text style={styles.moodChipEmoji}>{mood.emoji}</Text>
                    <Text
                      style={[
                        styles.moodChipLabel,
                        selected && { color: Pastel.text, fontWeight: '800' },
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
                onSubmitEditing={handleSaveStatus}
              />
              <BouncyPressable
                onPress={handleSaveStatus}
                style={[
                  styles.sendStatusBtn,
                  !statusInput.trim() && { opacity: 0.5 },
                ]}>
                <Send size={16} color={Pastel.white} />
              </BouncyPressable>
            </View>
          </View>

          {/* 4. Pinned Love Note Spotlight */}
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
                    Love Note Disematkan • Dari{' '}
                    {pinnedNote.authorId === 'p1' ? p1.name : p2.name}
                  </Text>
                </View>
                <Text style={styles.pinnedSticker}>{pinnedNote.sticker}</Text>
              </View>
              <Text style={styles.pinnedMessage}>{pinnedNote.message}</Text>
              <View style={styles.pinnedFooter}>
                <Text style={styles.pinnedHint}>
                  Tap untuk buka papan Love Notes →
                </Text>
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
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setEditModalVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Sparkles size={18} color={Pastel.coral} />
                <Text style={styles.modalTitle}>Atur Profil Couple</Text>
              </View>
              <BouncyPressable
                onPress={() => setEditModalVisible(false)}
                style={styles.modalCloseBtn}>
                <X size={18} color={Pastel.textMuted} />
              </BouncyPressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalBody}>
              <Text style={styles.inputLabel}>Nama Couple Kalian</Text>
              <TextInput
                value={formTitle}
                onChangeText={setFormTitle}
                placeholder="Misal: Mochi & Boba"
                placeholderTextColor={Pastel.textSoft}
                style={styles.modalInput}
              />

              <Text style={styles.inputLabel}>Tanggal Jadian (YYYY-MM-DD)</Text>
              <TextInput
                value={formDate}
                onChangeText={setFormDate}
                placeholder="2024-02-14"
                placeholderTextColor={Pastel.textSoft}
                style={styles.modalInput}
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
                <Text style={styles.saveModalBtnText}>Simpan Perubahan ✨</Text>
              </BouncyPressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <LiveSyncModal
        visible={syncModalVisible}
        onClose={() => setSyncModalVisible(false)}
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
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  syncPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Pastel.coralSoft,
    borderWidth: 1.5,
    borderColor: '#FFC7D6',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
  },
  syncPillLive: {
    backgroundColor: Pastel.matchaSoft,
    borderColor: '#B5EED9',
  },
  syncPillText: {
    fontFamily: RoundedFont,
    fontSize: 12,
    fontWeight: '800',
    color: Pastel.coralDark,
  },
  brandHello: {
    fontFamily: RoundedFont,
    fontSize: 22,
    fontWeight: '800',
    color: Pastel.text,
  },
  brandSub: {
    fontFamily: RoundedFont,
    fontSize: 13,
    fontWeight: '600',
    color: Pastel.textMuted,
  },
  switchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Pastel.taroSoft,
    borderWidth: 1.5,
    borderColor: '#D6CCFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  switchPillText: {
    fontFamily: RoundedFont,
    fontSize: 12.5,
    fontWeight: '700',
    color: '#5B43D6',
  },
  card: {
    backgroundColor: Pastel.white,
    borderRadius: 26,
    padding: 16,
    borderWidth: 2,
    borderColor: Pastel.border,
    shadowColor: '#D9A7B8',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 3,
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontFamily: RoundedFont,
    fontSize: 16,
    fontWeight: '800',
    color: Pastel.text,
  },
  sectionBadge: {
    fontFamily: RoundedFont,
    fontSize: 12.5,
    fontWeight: '700',
    color: Pastel.coralDark,
    backgroundColor: Pastel.coralSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  duoGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  mochiCard: {
    flex: 1,
    borderRadius: 22,
    padding: 12,
    borderWidth: 2,
    alignItems: 'center',
    gap: 8,
  },
  mochiCardActive: {
    borderWidth: 2.5,
  },
  mochiNameRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  mochiName: {
    fontFamily: RoundedFont,
    fontSize: 14,
    fontWeight: '800',
    color: Pastel.text,
  },
  moodTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  moodTagText: {
    fontFamily: RoundedFont,
    fontSize: 11,
    fontWeight: '700',
    color: Pastel.text,
  },
  statusBubble: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderRadius: 14,
    padding: 9,
    gap: 4,
  },
  statusBubbleText: {
    fontFamily: RoundedFont,
    fontSize: 12,
    fontWeight: '600',
    color: Pastel.text,
    lineHeight: 16,
    textAlign: 'center',
  },
  updatedTime: {
    fontFamily: RoundedFont,
    fontSize: 10.5,
    fontWeight: '600',
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
    fontFamily: RoundedFont,
    fontSize: 13,
    fontWeight: '800',
    color: Pastel.coralDark,
  },
  hugButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Pastel.coral,
    paddingVertical: 13,
    borderRadius: 18,
    shadowColor: Pastel.coral,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 4,
  },
  hugButtonText: {
    fontFamily: RoundedFont,
    fontSize: 14.5,
    fontWeight: '800',
    color: Pastel.white,
  },
  lastHugHint: {
    fontFamily: RoundedFont,
    fontSize: 11.5,
    fontWeight: '600',
    color: Pastel.textMuted,
  },
  moodList: {
    gap: 8,
    paddingVertical: 2,
  },
  moodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  moodChipEmoji: {
    fontSize: 15,
  },
  moodChipLabel: {
    fontFamily: RoundedFont,
    fontSize: 12.5,
    fontWeight: '600',
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
    borderWidth: 1.5,
    borderColor: Pastel.border,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontFamily: RoundedFont,
    fontSize: 13.5,
    color: Pastel.text,
  },
  sendStatusBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: Pastel.taro,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinnedCard: {
    borderRadius: 24,
    padding: 16,
    borderWidth: 2,
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
    fontFamily: RoundedFont,
    fontSize: 12,
    fontWeight: '800',
  },
  pinnedSticker: {
    fontSize: 20,
  },
  pinnedMessage: {
    fontFamily: RoundedFont,
    fontSize: 14.5,
    fontWeight: '600',
    color: Pastel.text,
    lineHeight: 21,
  },
  pinnedFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  pinnedHint: {
    fontFamily: RoundedFont,
    fontSize: 12,
    fontWeight: '700',
    color: Pastel.textMuted,
  },
  reactionPill: {
    backgroundColor: Pastel.white,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
  },
  reactionText: {
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(45, 34, 53, 0.42)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalCard: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '85%',
    backgroundColor: Pastel.white,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 20,
    borderTopWidth: 2,
    borderColor: Pastel.border,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontFamily: RoundedFont,
    fontSize: 18,
    fontWeight: '800',
    color: Pastel.text,
  },
  modalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Pastel.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    gap: 10,
    paddingBottom: 18,
  },
  inputLabel: {
    fontFamily: RoundedFont,
    fontSize: 12.5,
    fontWeight: '700',
    color: Pastel.textMuted,
    marginTop: 4,
  },
  modalInput: {
    backgroundColor: Pastel.bg,
    borderWidth: 1.5,
    borderColor: Pastel.border,
    borderRadius: 16,
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
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  saveModalBtnText: {
    fontFamily: RoundedFont,
    fontSize: 15,
    fontWeight: '800',
    color: Pastel.white,
  },
  locationStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Pastel.matchaSoft,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: '#B5EED9',
  },
  locationIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: Pastel.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationInfo: {
    flex: 1,
    gap: 2,
  },
  locationTitle: {
    fontFamily: RoundedFont,
    fontSize: 14,
    fontWeight: '800',
    color: '#157A5A',
  },
  locationSub: {
    fontFamily: RoundedFont,
    fontSize: 12,
    fontWeight: '600',
    color: Pastel.textMuted,
  },
  locationArrow: {
    fontFamily: RoundedFont,
    fontSize: 12.5,
    fontWeight: '800',
    color: '#157A5A',
  },
});
