import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import {
  Camera,
  Heart,
  ImagePlus,
  MapPin,
  Plus,
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
import { SafeAreaView } from 'react-native-safe-area-context';

import { BouncyPressable } from '@/components/BouncyPressable';
import { MEMORY_TAGS, Pastel, RoundedFont } from '@/constants/pastelTheme';
import { useCoupleStore } from '@/store/useCoupleStore';
import type { MemoryItem, MemoryTag } from '@/types/couple';
import { formatIndonesianDate } from '@/utils/dateCalc';
import { triggerMediumHaptic, triggerSuccessHaptic } from '@/utils/haptics';

const MEMORY_STICKERS = ['📸', '🍜', '🛵', '🍦', '🌸', '🎬', '🧸', '✨'];
const CARD_COLORS = ['#FFE8EE', '#FFF4DC', '#E5F4FF', '#EFEAFF', '#E3FAF2'];

interface MemoryCardProps {
  item: MemoryItem;
  onToggleFavorite: (id: string) => void;
  onDelete: (id: string) => void;
}

const MemoryCard = React.memo(function MemoryCard({
  item,
  onToggleFavorite,
  onDelete,
}: MemoryCardProps) {
  const tagMeta = MEMORY_TAGS.find((t) => t.id === item.tag) ?? MEMORY_TAGS[1];

  return (
    <View style={styles.polaroidCard}>
      {/* Photo or Pastel Illustration Cover */}
      <View style={[styles.coverBox, { backgroundColor: item.cardBg }]}>
        {item.photoUri ? (
          <Image
            source={{ uri: item.photoUri }}
            style={styles.coverImage}
            contentFit="cover"
            transition={200}
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={styles.pastelCoverContent}>
            <Text style={styles.pastelCoverSticker}>{item.sticker}</Text>
            <Text style={styles.pastelCoverHint}>Momen Tersimpan</Text>
          </View>
        )}

        {/* Top Badges */}
        <View style={styles.coverTopRow}>
          <View style={[styles.tagPill, { backgroundColor: tagMeta.bg }]}>
            <Text style={[styles.tagPillText, { color: tagMeta.accent }]}>
              {tagMeta.emoji} {tagMeta.label}
            </Text>
          </View>

          <BouncyPressable
            onPress={() => onToggleFavorite(item.id)}
            style={styles.favCircle}
            scaleTo={0.85}>
            <Heart
              size={16}
              color={item.isFavorite ? Pastel.coral : Pastel.textSoft}
              fill={item.isFavorite ? Pastel.coral : 'none'}
            />
          </BouncyPressable>
        </View>
      </View>

      {/* Story Body */}
      <View style={styles.cardBody}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardTitle}>
            {item.sticker} {item.title}
          </Text>
          <BouncyPressable onPress={() => onDelete(item.id)} style={styles.deleteBtn}>
            <Trash2 size={14} color={Pastel.textSoft} />
          </BouncyPressable>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaDate}>📅 {formatIndonesianDate(item.date)}</Text>
          {item.location ? (
            <View style={styles.metaLocRow}>
              <MapPin size={12} color={Pastel.textMuted} />
              <Text style={styles.metaLoc} numberOfLines={1}>
                {item.location}
              </Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.cardStory}>{item.story}</Text>
      </View>
    </View>
  );
});

export default function MemoriesScreen() {
  const memories = useCoupleStore((s) => s.memories);
  const addMemory = useCoupleStore((s) => s.addMemory);
  const toggleMemoryFavorite = useCoupleStore((s) => s.toggleMemoryFavorite);
  const deleteMemory = useCoupleStore((s) => s.deleteMemory);

  const [selectedTag, setSelectedTag] = useState<'all' | MemoryTag>('all');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [story, setStory] = useState('');
  const [location, setLocation] = useState('');
  const [dateStr, setDateStr] = useState(() => new Date().toISOString().slice(0, 10));
  const [tag, setTag] = useState<MemoryTag>('date');
  const [sticker, setSticker] = useState('📸');
  const [photoUri, setPhotoUri] = useState<string | undefined>(undefined);

  const filteredMemories = useMemo(() => {
    return memories.filter((m) => {
      if (onlyFavorites && !m.isFavorite) return false;
      if (selectedTag !== 'all' && m.tag !== selectedTag) return false;
      return true;
    });
  }, [memories, onlyFavorites, selectedTag]);

  const favCount = useMemo(
    () => memories.filter((m) => m.isFavorite).length,
    [memories]
  );

  const handleToggleFavorite = useCallback(
    (id: string) => {
      triggerMediumHaptic();
      toggleMemoryFavorite(id);
    },
    [toggleMemoryFavorite]
  );

  const handleDelete = useCallback(
    (id: string) => {
      triggerMediumHaptic();
      deleteMemory(id);
    },
    [deleteMemory]
  );

  const pickPhoto = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.45,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      if (asset.base64) {
        setPhotoUri(`data:image/jpeg;base64,${asset.base64}`);
      } else if (asset.uri) {
        setPhotoUri(asset.uri);
      }
    }
  }, []);

  const handleCreateMemory = useCallback(() => {
    if (!title.trim()) return;
    triggerSuccessHaptic();
    const randomBg = CARD_COLORS[Math.floor(Math.random() * CARD_COLORS.length)];
    addMemory({
      title: title.trim(),
      story: story.trim() || 'Momen seru yang pengen selalu kita ingat berdua 💕',
      location: location.trim() || 'Tempat Favorit Kita',
      date: dateStr.trim() || new Date().toISOString().slice(0, 10),
      tag,
      sticker,
      photoUri,
      cardBg: randomBg,
    });
    setTitle('');
    setStory('');
    setLocation('');
    setPhotoUri(undefined);
    setModalVisible(false);
  }, [addMemory, dateStr, location, photoUri, sticker, story, tag, title]);

  const renderItem = useCallback(
    ({ item }: { item: MemoryItem }) => (
      <MemoryCard
        item={item}
        onToggleFavorite={handleToggleFavorite}
        onDelete={handleDelete}
      />
    ),
    [handleDelete, handleToggleFavorite]
  );

  const keyExtractor = useCallback((item: MemoryItem) => item.id, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.pageTitle}>Jurnal Kenangan 📸</Text>
            <Text style={styles.pageSub}>
              {memories.length} momen tersimpan • {favCount} favorit
            </Text>
          </View>

          <BouncyPressable
            onPress={() => setModalVisible(true)}
            style={styles.addBtn}>
            <Plus size={16} color={Pastel.white} />
            <Text style={styles.addBtnText}>Momen</Text>
          </BouncyPressable>
        </View>

        {/* Filter Bar */}
        <View style={styles.filterWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}>
            <BouncyPressable
              onPress={() => setOnlyFavorites((v) => !v)}
              style={[
                styles.filterChip,
                onlyFavorites && {
                  backgroundColor: Pastel.coralSoft,
                  borderColor: Pastel.coral,
                },
              ]}>
              <Heart
                size={13}
                color={onlyFavorites ? Pastel.coralDark : Pastel.textMuted}
                fill={onlyFavorites ? Pastel.coralDark : 'none'}
              />
              <Text
                style={[
                  styles.filterChipText,
                  onlyFavorites && { color: Pastel.coralDark, fontWeight: '800' },
                ]}>
                Favorit
              </Text>
            </BouncyPressable>

            {MEMORY_TAGS.map((t) => {
              const active = selectedTag === t.id;
              return (
                <BouncyPressable
                  key={t.id}
                  onPress={() => setSelectedTag(t.id as 'all' | MemoryTag)}
                  style={[
                    styles.filterChip,
                    active && {
                      backgroundColor: t.bg,
                      borderColor: t.accent,
                    },
                  ]}>
                  <Text style={styles.filterEmoji}>{t.emoji}</Text>
                  <Text
                    style={[
                      styles.filterChipText,
                      active && { color: t.accent, fontWeight: '800' },
                    ]}>
                    {t.label}
                  </Text>
                </BouncyPressable>
              );
            })}
          </ScrollView>
        </View>

        {/* FlashList of Polaroid Memories */}
        <View style={styles.listFlex}>
          <FlashList
            data={filteredMemories}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Camera size={36} color={Pastel.sky} />
                <Text style={styles.emptyTitle}>Belum ada kenangan di kategori ini</Text>
                <Text style={styles.emptySub}>
                  Tap tombol “+ Momen” buat simpan cerita atau foto kencan kalian!
                </Text>
              </View>
            }
          />
        </View>
      </View>

      {/* Add Memory Modal */}
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
              <Text style={styles.modalTitle}>Abadikan Momen Baru ✨</Text>
              <BouncyPressable
                onPress={() => setModalVisible(false)}
                style={styles.modalCloseBtn}>
                <X size={18} color={Pastel.textMuted} />
              </BouncyPressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalBody}>
              {/* Photo Picker */}
              <BouncyPressable onPress={pickPhoto} style={styles.photoPickerBox}>
                {photoUri ? (
                  <Image
                    source={{ uri: photoUri }}
                    style={styles.previewImage}
                    contentFit="cover"
                  />
                ) : (
                  <View style={styles.photoPickerPlaceholder}>
                    <ImagePlus size={26} color={Pastel.sky} />
                    <Text style={styles.photoPickerTitle}>Pilih Foto dari Galeri</Text>
                    <Text style={styles.photoPickerSub}>
                      Opsional — kosongkan untuk pakai kartu stiker pastel
                    </Text>
                  </View>
                )}
              </BouncyPressable>

              <Text style={styles.inputLabel}>Judul Momen *</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Misal: Kencan Es Krim Sore"
                placeholderTextColor={Pastel.textSoft}
                style={styles.modalInput}
              />

              <View style={styles.twoCol}>
                <View style={styles.col}>
                  <Text style={styles.inputLabel}>Tanggal (YYYY-MM-DD)</Text>
                  <TextInput
                    value={dateStr}
                    onChangeText={setDateStr}
                    style={styles.modalInput}
                  />
                </View>
                <View style={styles.col}>
                  <Text style={styles.inputLabel}>Lokasi</Text>
                  <TextInput
                    value={location}
                    onChangeText={setLocation}
                    placeholder="Misal: Blok M"
                    placeholderTextColor={Pastel.textSoft}
                    style={styles.modalInput}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Kategori</Text>
              <View style={styles.tagRow}>
                {MEMORY_TAGS.filter((t) => t.id !== 'all').map((t) => {
                  const selected = tag === t.id;
                  return (
                    <BouncyPressable
                      key={t.id}
                      onPress={() => setTag(t.id as MemoryTag)}
                      style={[
                        styles.filterChip,
                        selected && { backgroundColor: t.bg, borderColor: t.accent },
                      ]}>
                      <Text style={styles.filterEmoji}>{t.emoji}</Text>
                      <Text
                        style={[
                          styles.filterChipText,
                          selected && { color: t.accent, fontWeight: '800' },
                        ]}>
                        {t.label}
                      </Text>
                    </BouncyPressable>
                  );
                })}
              </View>

              <Text style={styles.inputLabel}>Pilih Stiker Lucu</Text>
              <View style={styles.stickerRow}>
                {MEMORY_STICKERS.map((s) => (
                  <BouncyPressable
                    key={s}
                    onPress={() => setSticker(s)}
                    style={[
                      styles.stickerBtn,
                      sticker === s && styles.stickerBtnActive,
                    ]}>
                    <Text style={styles.stickerText}>{s}</Text>
                  </BouncyPressable>
                ))}
              </View>

              <Text style={styles.inputLabel}>Cerita Singkat</Text>
              <TextInput
                value={story}
                onChangeText={setStory}
                placeholder="Ceritain hal paling lucu atau manis di momen ini..."
                placeholderTextColor={Pastel.textSoft}
                style={[styles.modalInput, styles.textArea]}
                multiline
              />

              <BouncyPressable
                onPress={handleCreateMemory}
                style={[styles.saveBtn, !title.trim() && { opacity: 0.5 }]}>
                <Text style={styles.saveBtnText}>Simpan Kenangan 💕</Text>
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
    marginBottom: 12,
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
    backgroundColor: Pastel.sky,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    shadowColor: Pastel.sky,
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
  filterWrap: {
    marginBottom: 10,
  },
  filterScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Pastel.white,
    borderWidth: 1.5,
    borderColor: Pastel.border,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  filterEmoji: {
    fontSize: 13,
  },
  filterChipText: {
    fontFamily: RoundedFont,
    fontSize: 12.5,
    fontWeight: '600',
    color: Pastel.textMuted,
  },
  listFlex: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 112,
    paddingTop: 4,
  },
  polaroidCard: {
    backgroundColor: Pastel.white,
    borderRadius: 24,
    padding: 12,
    borderWidth: 2,
    borderColor: Pastel.border,
    marginBottom: 14,
    shadowColor: '#D9A7B8',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
    gap: 12,
  },
  coverBox: {
    width: '100%',
    height: 168,
    borderRadius: 18,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  pastelCoverContent: {
    alignItems: 'center',
    gap: 6,
  },
  pastelCoverSticker: {
    fontSize: 52,
  },
  pastelCoverHint: {
    fontFamily: RoundedFont,
    fontSize: 12,
    fontWeight: '700',
    color: Pastel.textMuted,
    opacity: 0.8,
  },
  coverTopRow: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tagPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  tagPillText: {
    fontFamily: RoundedFont,
    fontSize: 11.5,
    fontWeight: '800',
  },
  favCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    paddingHorizontal: 4,
    gap: 6,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardTitle: {
    flex: 1,
    fontFamily: RoundedFont,
    fontSize: 16.5,
    fontWeight: '800',
    color: Pastel.text,
  },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Pastel.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  metaDate: {
    fontFamily: RoundedFont,
    fontSize: 12,
    fontWeight: '700',
    color: Pastel.textMuted,
  },
  metaLocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    flexShrink: 1,
  },
  metaLoc: {
    fontFamily: RoundedFont,
    fontSize: 12,
    fontWeight: '600',
    color: Pastel.textMuted,
  },
  cardStory: {
    fontFamily: RoundedFont,
    fontSize: 13.5,
    fontWeight: '500',
    color: Pastel.text,
    lineHeight: 19.5,
  },
  emptyBox: {
    backgroundColor: Pastel.white,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: Pastel.border,
    marginTop: 20,
  },
  emptyTitle: {
    fontFamily: RoundedFont,
    fontSize: 15.5,
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
    maxHeight: '88%',
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
  photoPickerBox: {
    height: 132,
    borderRadius: 20,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#AEDBFF',
    backgroundColor: Pastel.skySoft,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  photoPickerPlaceholder: {
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
  },
  photoPickerTitle: {
    fontFamily: RoundedFont,
    fontSize: 14,
    fontWeight: '800',
    color: '#1B82D6',
  },
  photoPickerSub: {
    fontFamily: RoundedFont,
    fontSize: 11.5,
    color: Pastel.textMuted,
    textAlign: 'center',
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
  textArea: {
    minHeight: 82,
    textAlignVertical: 'top',
  },
  twoCol: {
    flexDirection: 'row',
    gap: 10,
  },
  col: {
    flex: 1,
    gap: 4,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  stickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  stickerBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: Pastel.bg,
    borderWidth: 1.5,
    borderColor: Pastel.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stickerBtnActive: {
    backgroundColor: Pastel.coralSoft,
    borderColor: Pastel.coral,
  },
  stickerText: {
    fontSize: 20,
  },
  saveBtn: {
    backgroundColor: Pastel.coral,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnText: {
    fontFamily: RoundedFont,
    fontSize: 15,
    fontWeight: '800',
    color: Pastel.white,
  },
});
