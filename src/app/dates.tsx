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
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BouncyPressable } from '@/components/BouncyPressable';
import { BUCKET_CATEGORIES, Pastel, RoundedFont } from '@/constants/pastelTheme';
import { CURATED_DATE_IDEAS, useCoupleStore } from '@/store/useCoupleStore';
import type { BucketCategory, BucketItem } from '@/types/couple';
import { triggerMediumHaptic, triggerSuccessHaptic } from '@/utils/haptics';

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
        {item.done ? <Check size={15} color={Pastel.white} strokeWidth={3} /> : null}
      </BouncyPressable>

      <View style={styles.bucketBody}>
        <Text style={[styles.bucketTitle, item.done && styles.bucketTitleDone]}>
          {item.title}
        </Text>

        <View style={styles.bucketMetaRow}>
          <View style={[styles.catBadge, { backgroundColor: cat.bg }]}>
            <Text style={[styles.catBadgeText, { color: cat.accent }]}>
              {cat.emoji} {cat.label}
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
        withSpring(0.95, { damping: 12, stiffness: 320 }),
        withSpring(1, { damping: 10, stiffness: 260 })
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
      title: `${currentIdea.emoji} ${currentIdea.title}`,
      category: currentIdea.category,
      targetDate: 'Segera!',
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
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.pageTitle}>Kencan & Bucket List 🎡</Text>
            <Text style={styles.pageSub}>
              {doneCount} / {totalCount} misi kencan tercapai ({progressPct}%)
            </Text>
          </View>

          <BouncyPressable
            onPress={() => setModalVisible(true)}
            style={styles.addBtn}>
            <Plus size={16} color={Pastel.white} />
            <Text style={styles.addBtnText}>Rencana</Text>
          </BouncyPressable>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.max(6, progressPct)}%` },
            ]}
          />
        </View>

        {/* Random Date Idea Spinner Card */}
        <Animated.View style={[styles.rouletteCard, spinAnimStyle]}>
          <View style={styles.rouletteTop}>
            <View style={styles.roulettePill}>
              <Sparkles size={13} color="#C67600" />
              <Text style={styles.roulettePillText}>Ide Kencan Acak • {currentIdea.vibe}</Text>
            </View>
            <Text style={styles.rouletteEmoji}>{currentIdea.emoji}</Text>
          </View>

          <Text style={styles.rouletteTitle}>{currentIdea.title}</Text>

          <View style={styles.rouletteActions}>
            <BouncyPressable onPress={handleSpinIdea} style={styles.spinBtn}>
              <Dices size={15} color="#C67600" />
              <Text style={styles.spinBtnText}>Acak Ide</Text>
            </BouncyPressable>

            <BouncyPressable
              onPress={handleAddIdeaToBucket}
              style={styles.acceptIdeaBtn}>
              <Plus size={15} color={Pastel.white} />
              <Text style={styles.acceptIdeaText}>Masuk List!</Text>
            </BouncyPressable>
          </View>
        </Animated.View>

        {/* Filter Tabs */}
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
                <Text style={styles.emptyEmoji}>🎯</Text>
                <Text style={styles.emptyTitle}>Belum ada daftar di sini</Text>
                <Text style={styles.emptySub}>
                  Coba spin ide kencan di atas atau tambahkan impian kalian!
                </Text>
              </View>
            }
          />
        </View>
      </View>

      {/* Add Bucket Item Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tambah Rencana Kencan 🎡</Text>
              <BouncyPressable
                onPress={() => setModalVisible(false)}
                style={styles.modalCloseBtn}>
                <X size={18} color={Pastel.textMuted} />
              </BouncyPressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalBody}>
              <Text style={styles.inputLabel}>Mau Ngapain Nih? *</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Misal: Cobain kafe kucing bareng"
                placeholderTextColor={Pastel.textSoft}
                style={styles.modalInput}
              />

              <Text style={styles.inputLabel}>Kapan? (Opsional)</Text>
              <TextInput
                value={targetDate}
                onChangeText={setTargetDate}
                placeholder="Misal: Sabtu Sore / Bulan Depan"
                placeholderTextColor={Pastel.textSoft}
                style={styles.modalInput}
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
                      <Text style={styles.catChoiceEmoji}>{c.emoji}</Text>
                      <Text
                        style={[
                          styles.catChoiceLabel,
                          selected && { color: c.accent, fontWeight: '800' },
                        ]}>
                        {c.label}
                      </Text>
                    </BouncyPressable>
                  );
                })}
              </View>

              <BouncyPressable
                onPress={handleCreateBucket}
                style={[styles.saveBtn, !title.trim() && { opacity: 0.5 }]}>
                <Text style={styles.saveBtnText}>Masukkan ke Bucket List ✨</Text>
              </BouncyPressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    fontFamily: RoundedFont,
    fontSize: 22,
    fontWeight: '800',
    color: Pastel.text,
  },
  pageSub: {
    fontFamily: RoundedFont,
    fontSize: 13,
    fontWeight: '600',
    color: Pastel.textMuted,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Pastel.honey,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    shadowColor: Pastel.honey,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  addBtnText: {
    fontFamily: RoundedFont,
    fontSize: 13.5,
    fontWeight: '800',
    color: Pastel.white,
  },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: Pastel.white,
    borderWidth: 1.5,
    borderColor: Pastel.border,
    overflow: 'hidden',
    marginBottom: 14,
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: Pastel.matcha,
  },
  rouletteCard: {
    backgroundColor: Pastel.honeySoft,
    borderRadius: 24,
    padding: 15,
    borderWidth: 2,
    borderColor: '#FFE0A3',
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
    backgroundColor: Pastel.white,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  roulettePillText: {
    fontFamily: RoundedFont,
    fontSize: 11.5,
    fontWeight: '800',
    color: '#C67600',
  },
  rouletteEmoji: {
    fontSize: 22,
  },
  rouletteTitle: {
    fontFamily: RoundedFont,
    fontSize: 16,
    fontWeight: '800',
    color: Pastel.text,
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
    backgroundColor: Pastel.white,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#FFD685',
  },
  spinBtnText: {
    fontFamily: RoundedFont,
    fontSize: 13,
    fontWeight: '800',
    color: '#C67600',
  },
  acceptIdeaBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: Pastel.coral,
    paddingVertical: 10,
    borderRadius: 14,
  },
  acceptIdeaText: {
    fontFamily: RoundedFont,
    fontSize: 13,
    fontWeight: '800',
    color: Pastel.white,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  filterTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: Pastel.white,
    borderWidth: 1.5,
    borderColor: Pastel.border,
  },
  filterTabActive: {
    backgroundColor: Pastel.matchaSoft,
    borderColor: Pastel.matcha,
  },
  filterTabText: {
    fontFamily: RoundedFont,
    fontSize: 12,
    fontWeight: '700',
    color: Pastel.textMuted,
  },
  filterTabTextActive: {
    color: '#178C68',
    fontWeight: '800',
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
    backgroundColor: Pastel.white,
    borderRadius: 20,
    padding: 13,
    borderWidth: 2,
    borderColor: Pastel.border,
    marginBottom: 10,
  },
  bucketCardDone: {
    backgroundColor: '#FAFBF9',
    opacity: 0.84,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 9,
    borderWidth: 2,
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
    fontFamily: RoundedFont,
    fontSize: 14.5,
    fontWeight: '700',
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
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  catBadgeText: {
    fontFamily: RoundedFont,
    fontSize: 11,
    fontWeight: '800',
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Pastel.bg,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
  },
  dateBadgeText: {
    fontFamily: RoundedFont,
    fontSize: 11,
    fontWeight: '600',
    color: Pastel.textMuted,
  },
  authorHint: {
    fontFamily: RoundedFont,
    fontSize: 11,
    fontWeight: '600',
    color: Pastel.textSoft,
  },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Pastel.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBox: {
    backgroundColor: Pastel.white,
    borderRadius: 24,
    padding: 26,
    alignItems: 'center',
    gap: 6,
    borderWidth: 2,
    borderColor: Pastel.border,
    marginTop: 16,
  },
  emptyEmoji: {
    fontSize: 34,
  },
  emptyTitle: {
    fontFamily: RoundedFont,
    fontSize: 15,
    fontWeight: '800',
    color: Pastel.text,
  },
  emptySub: {
    fontFamily: RoundedFont,
    fontSize: 13,
    color: Pastel.textMuted,
    textAlign: 'center',
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
    marginBottom: 12,
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
    paddingBottom: 20,
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
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  catChoice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Pastel.bg,
    borderWidth: 1.5,
    borderColor: Pastel.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  catChoiceEmoji: {
    fontSize: 14,
  },
  catChoiceLabel: {
    fontFamily: RoundedFont,
    fontSize: 12.5,
    fontWeight: '600',
    color: Pastel.textMuted,
  },
  saveBtn: {
    backgroundColor: Pastel.coral,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  saveBtnText: {
    fontFamily: RoundedFont,
    fontSize: 15,
    fontWeight: '800',
    color: Pastel.white,
  },
});
