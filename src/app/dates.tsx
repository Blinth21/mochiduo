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
  BodyFontSemi,
  MonoFont,
  MonoFontBold,
  Pastel,
  RoundedFont,
  SerifFontSemi,
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
    <View style={[styles.bucketCard, item.done && styles.bucketCardDone]}>
      <BouncyPressable
        onPress={() => onToggle(item.id)}
        scaleTo={0.85}
        style={[
          styles.checkbox,
          item.done && { backgroundColor: Pastel.matcha, borderColor: Pastel.matcha },
        ]}>
        {item.done ? <Check size={14} color={Pastel.pureWhite} strokeWidth={3} /> : null}
      </BouncyPressable>

      <View style={styles.bucketBody}>
        <Text style={[styles.bucketTitle, item.done && styles.bucketTitleDone]}>
          {item.title}
        </Text>

        <View style={styles.bucketMetaRow}>
          <View style={[styles.catBadge, { backgroundColor: cat.bg }]}>
            <Text style={[styles.catBadgeText, { color: cat.accent }]}>
              {cat.label.toUpperCase()}
            </Text>
          </View>

          {item.targetDate ? (
            <View style={styles.dateBadge}>
              <Calendar size={10} color={Pastel.textMuted} />
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
        {/* Editorial Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.pageTitle}>Kencan & Bucket List</Text>
            <Text style={styles.pageSub}>
              {doneCount}/{totalCount} TERCAPAI • {progressPct}% SELESAI
            </Text>
          </View>

          <BouncyPressable
            onPress={() => setModalVisible(true)}
            style={styles.addBtn}>
            <Plus size={15} color={Pastel.pureWhite} />
            <Text style={styles.addBtnText}>Rencana</Text>
          </BouncyPressable>
        </View>

        {/* Precision Ledger Progress Bar */}
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.max(4, progressPct)}%` },
            ]}
          />
        </View>

        {/* Random Date Idea Prompt Card */}
        <Animated.View style={[styles.rouletteCard, spinAnimStyle]}>
          <View style={styles.rouletteTop}>
            <View style={styles.roulettePill}>
              <Sparkles size={11} color="#8E5D15" />
              <Text style={styles.roulettePillText}>
                IDE KENCAN ACAK • {currentIdea.vibe.toUpperCase()}
              </Text>
            </View>
            <Text style={styles.rouletteEmoji}>{currentIdea.emoji}</Text>
          </View>

          <Text style={styles.rouletteTitle}>{currentIdea.title}</Text>

          <View style={styles.rouletteActions}>
            <BouncyPressable onPress={handleSpinIdea} style={styles.spinBtn}>
              <Dices size={14} color={Pastel.text} />
              <Text style={styles.spinBtnText}>Acak Ide</Text>
            </BouncyPressable>

            <BouncyPressable
              onPress={handleAddIdeaToBucket}
              style={styles.acceptIdeaBtn}>
              <Plus size={14} color={Pastel.pureWhite} />
              <Text style={styles.acceptIdeaText}>Masuk List</Text>
            </BouncyPressable>
          </View>
        </Animated.View>

        {/* Segmented Filter Tabs */}
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
                style={[styles.filterTab, active && styles.filterTabActive]}>
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
              <View style={styles.emptyBox}>
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

          <Text style={styles.inputLabel}>Waktu (Pilih Kalender atau Ketik)</Text>
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
                    selected && { backgroundColor: c.bg, borderColor: c.accent },
                  ]}>
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
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  pageTitle: {
    fontFamily: SerifFontSemi,
    fontSize: 25,
    color: Pastel.text,
  },
  pageSub: {
    fontFamily: MonoFont,
    fontSize: 10.5,
    color: Pastel.textMuted,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Pastel.text,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 10,
  },
  addBtnText: {
    fontFamily: BodyFontBold,
    fontSize: 13,
    color: Pastel.pureWhite,
  },
  progressTrack: {
    height: 6,
    borderRadius: 4,
    backgroundColor: Pastel.bgMuted,
    borderWidth: 1,
    borderColor: Pastel.borderStrong,
    overflow: 'hidden',
    marginBottom: 14,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Pastel.matcha,
  },
  rouletteCard: {
    backgroundColor: Pastel.honeySoft,
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: '#DFCA9E',
    marginBottom: 14,
    gap: 10,
  },
  rouletteTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roulettePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Pastel.bgElevated,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DFCA9E',
  },
  roulettePillText: {
    fontFamily: MonoFontBold,
    fontSize: 9.5,
    color: '#8E5D15',
    letterSpacing: 0.5,
  },
  rouletteEmoji: {
    fontSize: 20,
  },
  rouletteTitle: {
    fontFamily: SerifFontSemi,
    fontSize: 18.5,
    color: Pastel.text,
    lineHeight: 24,
  },
  rouletteActions: {
    flexDirection: 'row',
    gap: 8,
  },
  spinBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Pastel.bgElevated,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Pastel.borderStrong,
  },
  spinBtnText: {
    fontFamily: BodyFontSemi,
    fontSize: 13,
    color: Pastel.text,
  },
  acceptIdeaBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: Pastel.coral,
    paddingVertical: 10,
    borderRadius: 8,
  },
  acceptIdeaText: {
    fontFamily: BodyFontBold,
    fontSize: 13,
    color: Pastel.pureWhite,
  },
  filterRow: {
    flexDirection: 'row',
    backgroundColor: Pastel.bgMuted,
    padding: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Pastel.borderStrong,
    gap: 4,
    marginBottom: 12,
  },
  filterTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 7,
    borderRadius: 7,
  },
  filterTabActive: {
    backgroundColor: Pastel.bgElevated,
    borderWidth: 1,
    borderColor: Pastel.borderStrong,
  },
  filterTabText: {
    fontFamily: BodyFontSemi,
    fontSize: 12,
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
    paddingBottom: 112,
    paddingTop: 2,
  },
  bucketCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Pastel.bgElevated,
    borderRadius: 10,
    padding: 13,
    borderWidth: 1,
    borderColor: Pastel.borderStrong,
    marginBottom: 10,
  },
  bucketCardDone: {
    backgroundColor: Pastel.bg,
    borderColor: Pastel.border,
    opacity: 0.78,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: Pastel.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Pastel.bg,
  },
  bucketBody: {
    flex: 1,
    gap: 6,
  },
  bucketTitle: {
    fontFamily: BodyFontSemi,
    fontSize: 14.5,
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
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 5,
  },
  catBadgeText: {
    fontFamily: MonoFontBold,
    fontSize: 9.5,
    letterSpacing: 0.4,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Pastel.bg,
    borderWidth: 1,
    borderColor: Pastel.border,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  dateBadgeText: {
    fontFamily: MonoFont,
    fontSize: 10,
    color: Pastel.textMuted,
  },
  authorHint: {
    fontFamily: RoundedFont,
    fontSize: 11,
    color: Pastel.textSoft,
  },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: Pastel.bg,
    borderWidth: 1,
    borderColor: Pastel.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBox: {
    backgroundColor: Pastel.bgElevated,
    borderRadius: 12,
    padding: 26,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: Pastel.borderStrong,
    marginTop: 12,
  },
  emptyTitle: {
    fontFamily: SerifFontSemi,
    fontSize: 16,
    color: Pastel.text,
  },
  emptySub: {
    fontFamily: RoundedFont,
    fontSize: 13,
    color: Pastel.textMuted,
    textAlign: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    fontFamily: SerifFontSemi,
    fontSize: 20,
    color: Pastel.text,
  },
  modalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: Pastel.bg,
    borderWidth: 1,
    borderColor: Pastel.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    gap: 10,
    paddingBottom: 20,
  },
  inputLabel: {
    fontFamily: MonoFontBold,
    fontSize: 10,
    color: Pastel.textMuted,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  modalInput: {
    backgroundColor: Pastel.bg,
    borderWidth: 1,
    borderColor: Pastel.borderStrong,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontFamily: RoundedFont,
    fontSize: 14,
    color: Pastel.text,
  },
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  catChoice: {
    backgroundColor: Pastel.bg,
    borderWidth: 1,
    borderColor: Pastel.borderStrong,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  catChoiceLabel: {
    fontFamily: BodyFontSemi,
    fontSize: 12.5,
    color: Pastel.textMuted,
  },
  saveBtn: {
    backgroundColor: Pastel.coral,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  saveBtnText: {
    fontFamily: BodyFontBold,
    fontSize: 14.5,
    color: Pastel.pureWhite,
  },
});
