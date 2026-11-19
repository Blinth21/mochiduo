import { FlashList } from '@shopify/flash-list';
import {
  Calendar,
  Check,
  Dices,
  Plus,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import {
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
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BouncyPressable } from '@/components/BouncyPressable';
import { DatePickerField } from '@/components/DatePickerField';
import { KeyboardModalSheet } from '@/components/KeyboardModalSheet';
import {
  BUCKET_CATEGORIES,
  BodyFontBold,
  BodyFontRegular,
  BodyFontSemi,
  Pastel,
  RoundedFont,
  SoftShadow,
  SoftShadowSm,
} from '@/constants/pastelTheme';
import { CURATED_DATE_IDEAS, useCoupleStore } from '@/store/useCoupleStore';
import type { BucketCategory, BucketItem } from '@/types/couple';
import { triggerMediumHaptic, triggerSuccessHaptic } from '@/utils/haptics';

const DATE_QUICK_PRESETS = [
  { label: 'Besok', value: new Date(Date.now() + 86400000).toISOString().slice(0, 10) },
  { label: 'Akhir Pekan Ini', value: 'Akhir Pekan Ini' },
  { label: 'Minggu Depan', value: 'Minggu Depan' },
  { label: 'Bulan Depan', value: 'Bulan Depan' },
];

interface BucketRowProps {
  item: BucketItem;
  authorName: string;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

const BucketRow = React.memo(function BucketRow({
  item,
  authorName,
  onToggle,
  onDelete,
}: BucketRowProps) {
  const cat =
    BUCKET_CATEGORIES.find((c) => c.id === item.category) ?? BUCKET_CATEGORIES[0];

  return (
    <View
      style={[
        styles.bucketCard,
        SoftShadowSm,
        item.done && styles.bucketCardDone,
      ]}>
      <BouncyPressable
        onPress={() => onToggle(item.id)}
        scaleTo={0.85}
        style={[
          styles.checkbox,
          item.done && { backgroundColor: Pastel.matcha },
        ]}>
        {item.done ? <Check size={15} color={Pastel.pureWhite} strokeWidth={3} /> : null}
      </BouncyPressable>

      <View style={styles.bucketBody}>
        <Text style={[styles.bucketTitle, item.done && styles.bucketTitleDone]}>
          {item.title}
        </Text>

        <View style={styles.bucketMetaRow}>
          <View style={[styles.catBadge, { backgroundColor: cat.bg }]}>
            <Text style={styles.catBadgeEmoji}>{cat.emoji}</Text>
            <Text style={[styles.catBadgeText, { color: cat.accent }]}>
              {cat.label}
            </Text>
          </View>

          {item.targetDate ? (
            <View style={styles.dateBadge}>
              <Calendar size={11} color={Pastel.textMuted} />
              <Text style={styles.dateBadgeText}>{item.targetDate}</Text>
            </View>
          ) : null}

          <Text style={styles.authorHint}>oleh {authorName}</Text>
        </View>
      </View>

      <BouncyPressable onPress={() => onDelete(item.id)} style={styles.deleteBtn}>
        <Trash2 size={14} color={Pastel.textSoft} />
      </BouncyPressable>
    </View>
  );
});

export default function DatesScreen() {
  const bucketList = useCoupleStore((s) => s.bucketList);
  const activePartnerId = useCoupleStore((s) => s.activePartnerId);
  const p1Name = useCoupleStore((s) => s.partners.p1.name);
  const p2Name = useCoupleStore((s) => s.partners.p2.name);

  const addBucketItem = useCoupleStore((s) => s.addBucketItem);
  const toggleBucketDone = useCoupleStore((s) => s.toggleBucketDone);
  const deleteBucketItem = useCoupleStore((s) => s.deleteBucketItem);

  const [filterMode, setFilterMode] = useState<'all' | 'todo' | 'done'>('all');
  const [ideaIndex, setIdeaIndex] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<BucketCategory>('hangout');
  const [targetDate, setTargetDate] = useState('');

  const spinScale = useSharedValue(1);
  const spinAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: spinScale.value }],
  }));

  const currentIdea = CURATED_DATE_IDEAS[ideaIndex % CURATED_DATE_IDEAS.length];

  const handleSpinIdea = useCallback(() => {
    triggerMediumHaptic();
    spinScale.set(
      withSequence(
        withSpring(0.96, { damping: 14, stiffness: 320 }),
        withSpring(1, { damping: 12, stiffness: 260 })
      )
    );
    setIdeaIndex((prev) => {
      let next = Math.floor(Math.random() * CURATED_DATE_IDEAS.length);
      if (next === prev) next = (prev + 1) % CURATED_DATE_IDEAS.length;
      return next;
    });
  }, [spinScale]);

  const handleAddIdeaToBucket = useCallback(() => {
    triggerSuccessHaptic();
    addBucketItem({
      title: currentIdea.title,
      category: currentIdea.category,
      targetDate: 'Segera',
      createdBy: activePartnerId,
    });
  }, [activePartnerId, addBucketItem, currentIdea]);

  const handleToggleDone = useCallback(
    (id: string) => {
      triggerSuccessHaptic();
      toggleBucketDone(id);
    },
    [toggleBucketDone]
  );

  const handleDelete = useCallback(
    (id: string) => {
      triggerMediumHaptic();
      deleteBucketItem(id);
    },
    [deleteBucketItem]
  );

  const handleCreateBucket = useCallback(() => {
    if (!title.trim()) return;
    triggerSuccessHaptic();
    addBucketItem({
      title: title.trim(),
      category,
      targetDate: targetDate.trim() || undefined,
      createdBy: activePartnerId,
    });
    setTitle('');
    setTargetDate('');
    setModalVisible(false);
  }, [activePartnerId, addBucketItem, category, targetDate, title]);

  const { doneCount, totalCount, progressPct } = useMemo(() => {
    const done = bucketList.filter((i) => i.done).length;
    const total = bucketList.length;
    const pct = total === 0 ? 0 : Math.round((done / total) * 100);
    return { doneCount: done, totalCount: total, progressPct: pct };
  }, [bucketList]);

  const filteredList = useMemo(() => {
    return bucketList.filter((item) => {
      if (filterMode === 'todo') return !item.done;
      if (filterMode === 'done') return item.done;
      return true;
    });
  }, [bucketList, filterMode]);

  const renderItem = useCallback(
    ({ item }: { item: BucketItem }) => (
      <BucketRow
        item={item}
        authorName={item.createdBy === 'p1' ? p1Name : p2Name}
        onToggle={handleToggleDone}
        onDelete={handleDelete}
      />
    ),
    [handleDelete, handleToggleDone, p1Name, p2Name]
  );

  const keyExtractor = useCallback((item: BucketItem) => item.id, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* Clean Airy Header */}
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.pageTitle}>Kencan & Bucket List</Text>
            <Text style={styles.pageSub}>
              {doneCount} dari {totalCount} tercapai · {progressPct}% selesai
            </Text>
          </View>

          <BouncyPressable
            onPress={() => setModalVisible(true)}
            style={styles.addBtn}>
            <Plus size={16} color={Pastel.pureWhite} />
            <Text style={styles.addBtnText}>Rencana</Text>
          </BouncyPressable>
        </View>

        {/* Smooth Rounded Progress Bar */}
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.max(4, progressPct)}%` },
            ]}
          />
        </View>

        {/* Cute Butter-Peach Random Date Idea Card */}
        <Animated.View style={[styles.rouletteCard, SoftShadowSm, spinAnimStyle]}>
          <View style={styles.rouletteTop}>
            <View style={styles.roulettePill}>
              <Sparkles size={12} color={Pastel.honeyDark} />
              <Text style={styles.roulettePillText}>
                Ide Kencan Acak · {currentIdea.vibe}
              </Text>
            </View>
            <View style={styles.rouletteEmojiWrap}>
              <Text style={styles.rouletteEmoji}>{currentIdea.emoji}</Text>
            </View>
          </View>

          <Text style={styles.rouletteTitle}>{currentIdea.title}</Text>

          <View style={styles.rouletteActions}>
            <BouncyPressable
              onPress={handleSpinIdea}
              style={[styles.spinBtn, SoftShadowSm]}>
              <Dices size={15} color={Pastel.text} />
              <Text style={styles.spinBtnText}>Acak Ide</Text>
            </BouncyPressable>

            <BouncyPressable
              onPress={handleAddIdeaToBucket}
              style={styles.acceptIdeaBtn}>
              <Plus size={15} color={Pastel.pureWhite} />
              <Text style={styles.acceptIdeaText}>Masuk List</Text>
            </BouncyPressable>
          </View>
        </Animated.View>

        {/* Soft Borderless Segmented Filter Tabs */}
        <View style={styles.filterRow}>
          {[
            { id: 'all', label: `Semua (${totalCount})` },
            { id: 'todo', label: `Rencana (${totalCount - doneCount})` },
            { id: 'done', label: `Selesai (${doneCount})` },
          ].map((tab) => {
            const active = filterMode === tab.id;
            return (
              <BouncyPressable
                key={tab.id}
                onPress={() => setFilterMode(tab.id as 'all' | 'todo' | 'done')}
                style={[
                  styles.filterTab,
                  active && [styles.filterTabActive, SoftShadowSm],
                ]}>
                <Text
                  style={[
                    styles.filterTabText,
                    active && styles.filterTabTextActive,
                  ]}>
                  {tab.label}
                </Text>
              </BouncyPressable>
            );
          })}
        </View>

        {/* FlashList Bucket Items */}
        <View style={styles.listFlex}>
          <FlashList
            data={filteredList}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={[styles.emptyBox, SoftShadow]}>
                <Text style={styles.emptyTitle}>Belum ada daftar di sini</Text>
                <Text style={styles.emptySub}>
                  Acak ide kencan di atas atau tambahkan rencana baru berdua.
                </Text>
              </View>
            }
          />
        </View>
      </View>

      {/* Add Bucket Item Modal */}
      <KeyboardModalSheet
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Tambah Rencana Kencan</Text>
          <BouncyPressable
            onPress={() => setModalVisible(false)}
            style={styles.modalCloseBtn}>
            <X size={18} color={Pastel.textMuted} />
          </BouncyPressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.modalBody}>
          <Text style={styles.inputLabel}>Rencana Kegiatan *</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Misal: Cobain kedai kopi kecil berdua"
            placeholderTextColor={Pastel.textSoft}
            style={styles.modalInput}
          />

          <Text style={styles.inputLabel}>Waktu</Text>
          <DatePickerField
            value={targetDate}
            onChange={setTargetDate}
            placeholder="Pilih tanggal / akhir pekan..."
            allowFreeText
            quickPresets={DATE_QUICK_PRESETS}
            compact
          />

          <Text style={styles.inputLabel}>Kategori</Text>
          <View style={styles.catGrid}>
            {BUCKET_CATEGORIES.map((c) => {
              const selected = category === c.id;
              return (
                <BouncyPressable
                  key={c.id}
                  onPress={() => setCategory(c.id)}
                  style={[
                    styles.catChoice,
                    selected && { backgroundColor: c.bg },
                  ]}>
                  <Text style={styles.catBadgeEmoji}>{c.emoji}</Text>
                  <Text
                    style={[
                      styles.catChoiceLabel,
                      selected && { color: c.accent, fontFamily: BodyFontBold },
                    ]}>
                    {c.label}
                  </Text>
                </BouncyPressable>
              );
            })}
          </View>

          <BouncyPressable
            onPress={handleCreateBucket}
            style={[styles.saveBtn, !title.trim() && { opacity: 0.45 }]}>
            <Text style={styles.saveBtnText}>Masukkan ke Bucket List</Text>
          </BouncyPressable>
        </ScrollView>
      </KeyboardModalSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Pastel.bg,
    alignItems: 'center',
  },
  container: {
    flex: 1,
    width: '100%',
    maxWidth: 520,
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 12,
  },
  headerCopy: {
    flex: 1,
    flexShrink: 1,
  },
  pageTitle: {
    fontFamily: BodyFontBold,
    fontSize: 23,
    lineHeight: 31,
    color: Pastel.text,
  },
  pageSub: {
    fontFamily: BodyFontRegular,
    fontSize: 13,
    lineHeight: 19,
    color: Pastel.textMuted,
    marginTop: 1,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Pastel.coral,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 999,
  },
  addBtnText: {
    fontFamily: BodyFontBold,
    fontSize: 13.5,
    lineHeight: 19,
    color: Pastel.pureWhite,
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: Pastel.bgMuted,
    overflow: 'hidden',
    marginBottom: 14,
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: Pastel.matcha,
  },
  rouletteCard: {
    backgroundColor: '#FFF6E8',
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
    gap: 12,
  },
  rouletteTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  roulettePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.85)',
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 999,
    flexShrink: 1,
  },
  roulettePillText: {
    fontFamily: BodyFontBold,
    fontSize: 11.5,
    lineHeight: 16,
    color: Pastel.honeyDark,
  },
  rouletteEmojiWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rouletteEmoji: {
    fontSize: 19,
    lineHeight: 24,
  },
  rouletteTitle: {
    fontFamily: BodyFontBold,
    fontSize: 17.5,
    lineHeight: 25,
    color: Pastel.text,
  },
  rouletteActions: {
    flexDirection: 'row',
    gap: 10,
  },
  spinBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: Pastel.bgElevated,
    paddingVertical: 11,
    borderRadius: 999,
  },
  spinBtnText: {
    fontFamily: BodyFontBold,
    fontSize: 13.5,
    lineHeight: 19,
    color: Pastel.text,
  },
  acceptIdeaBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Pastel.coral,
    paddingVertical: 11,
    borderRadius: 999,
  },
  acceptIdeaText: {
    fontFamily: BodyFontBold,
    fontSize: 13.5,
    lineHeight: 19,
    color: Pastel.pureWhite,
  },
  filterRow: {
    flexDirection: 'row',
    backgroundColor: Pastel.bgMuted,
    padding: 4,
    borderRadius: 999,
    gap: 4,
    marginBottom: 14,
  },
  filterTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 999,
  },
  filterTabActive: {
    backgroundColor: Pastel.bgElevated,
  },
  filterTabText: {
    fontFamily: BodyFontSemi,
    fontSize: 12.5,
    lineHeight: 18,
    color: Pastel.textMuted,
  },
  filterTabTextActive: {
    fontFamily: BodyFontBold,
    color: Pastel.text,
  },
  listFlex: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 118,
    paddingTop: 2,
  },
  bucketCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Pastel.bgElevated,
    borderRadius: 20,
    padding: 15,
    marginBottom: 11,
  },
  bucketCardDone: {
    opacity: 0.72,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Pastel.bgMuted,
  },
  bucketBody: {
    flex: 1,
    gap: 7,
  },
  bucketTitle: {
    fontFamily: BodyFontSemi,
    fontSize: 14.5,
    lineHeight: 21,
    color: Pastel.text,
  },
  bucketTitleDone: {
    textDecorationLine: 'line-through',
    color: Pastel.textMuted,
  },
  bucketMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  catBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
  },
  catBadgeEmoji: {
    fontSize: 11.5,
    lineHeight: 16,
  },
  catBadgeText: {
    fontFamily: BodyFontBold,
    fontSize: 11,
    lineHeight: 16,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Pastel.bg,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
  },
  dateBadgeText: {
    fontFamily: BodyFontRegular,
    fontSize: 11,
    lineHeight: 16,
    color: Pastel.textMuted,
  },
  authorHint: {
    fontFamily: BodyFontRegular,
    fontSize: 11.5,
    lineHeight: 16,
    color: Pastel.textSoft,
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Pastel.bgMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBox: {
    backgroundColor: Pastel.bgElevated,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  emptyTitle: {
    fontFamily: BodyFontBold,
    fontSize: 16.5,
    lineHeight: 23,
    color: Pastel.text,
  },
  emptySub: {
    fontFamily: BodyFontRegular,
    fontSize: 13.5,
    lineHeight: 20,
    color: Pastel.textMuted,
    textAlign: 'center',
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
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  catChoice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Pastel.bgMuted,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 999,
  },
  catChoiceLabel: {
    fontFamily: BodyFontSemi,
    fontSize: 13,
    lineHeight: 18,
    color: Pastel.textMuted,
  },
  saveBtn: {
    backgroundColor: Pastel.coral,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  saveBtnText: {
    fontFamily: BodyFontBold,
    fontSize: 15,
    lineHeight: 21,
    color: Pastel.pureWhite,
  },
});
