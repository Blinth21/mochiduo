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
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BouncyPressable } from '@/components/BouncyPressable';
import { DatePickerField } from '@/components/DatePickerField';
import { KeyboardModalSheet } from '@/components/KeyboardModalSheet';
import {
  BodyFontBold,
  BodyFontSemi,
  MEMORY_TAGS,
  MonoFont,
  MonoFontBold,
  Pastel,
  RoundedFont,
  SerifFontSemi,
} from '@/constants/pastelTheme';
import { useCoupleStore } from '@/store/useCoupleStore';
import type { MemoryItem, MemoryTag } from '@/types/couple';
import { formatIndonesianDate } from '@/utils/dateCalc';
import { triggerMediumHaptic, triggerSuccessHaptic } from '@/utils/haptics';

const MEMORY_STICKERS = ['📸', '🍜', '🛵', '🍦', '🌸', '🎬', '🧸', '✨'];
const CARD_COLORS = ['#F9EAE4', '#FBF1DD', '#E8EFF2', '#E9EDF2', '#E7F0EA'];

interface MemoryCardProps {
  item: MemoryItem;
  index: number;
  onToggleFavorite: (id: string) => void;
  onDelete: (id: string) => void;
}

const MemoryCard = React.memo(function MemoryCard({
  item,
  index,
  onToggleFavorite,
  onDelete,
}: MemoryCardProps) {
  const tagMeta = MEMORY_TAGS.find((t) => t.id === item.tag) ?? MEMORY_TAGS[1];

  return (
    <View style={styles.polaroidCard}>
      {/* Contact Sheet Photo / Paper Illustration Bay */}
      <View style={[styles.coverBox, { backgroundColor: item.cardBg || Pastel.bgMuted }]}>
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
            <Text style={styles.pastelCoverHint}>
              ARSIP NO.{String(index + 1).padStart(2, '0')}
            </Text>
          </View>
        )}

        {/* Top Badges */}
        <View style={styles.coverTopRow}>
          <View style={[styles.tagPill, { backgroundColor: Pastel.bgElevated }]}>
            <Text style={[styles.tagPillText, { color: tagMeta.accent }]}>
              {tagMeta.label.toUpperCase()}
            </Text>
          </View>

          <BouncyPressable
            onPress={() => onToggleFavorite(item.id)}
            style={styles.favCircle}
            scaleTo={0.85}>
            <Heart
              size={15}
              color={item.isFavorite ? Pastel.coral : Pastel.textMuted}
              fill={item.isFavorite ? Pastel.coral : 'none'}
            />
          </BouncyPressable>
        </View>
      </View>

      {/* Archival Story Ledger */}
      <View style={styles.cardBody}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <BouncyPressable onPress={() => onDelete(item.id)} style={styles.deleteBtn}>
            <Trash2 size={14} color={Pastel.textSoft} />
          </BouncyPressable>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaDate}>
            {formatIndonesianDate(item.date).toUpperCase()}
          </Text>
          {item.location ? (
            <View style={styles.metaLocRow}>
              <MapPin size={11} color={Pastel.textMuted} />
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
      quality: 0.35,
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
      story: story.trim() || 'Momen yang selalu ingin kita simpan berdua.',
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
    ({ item, index }: { item: MemoryItem; index: number }) => (
      <MemoryCard
        item={item}
        index={index}
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
        {/* Editorial Page Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.pageTitle}>Jurnal Kenangan</Text>
            <Text style={styles.pageSub}>
              {memories.length} MOMEN · {favCount} FAVORIT
            </Text>
          </View>

          <BouncyPressable
            onPress={() => setModalVisible(true)}
            style={styles.addBtn}>
            <Plus size={15} color={Pastel.pureWhite} />
            <Text style={styles.addBtnText}>Momen</Text>
          </BouncyPressable>
        </View>

        {/* Filter Strip */}
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
                size={12}
                color={onlyFavorites ? Pastel.coralDark : Pastel.textMuted}
                fill={onlyFavorites ? Pastel.coralDark : 'none'}
              />
              <Text
                style={[
                  styles.filterChipText,
                  onlyFavorites && { color: Pastel.coralDark, fontFamily: BodyFontBold },
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
                      backgroundColor: Pastel.text,
                      borderColor: Pastel.text,
                    },
                  ]}>
                  <Text
                    style={[
                      styles.filterChipText,
                      active && { color: Pastel.pureWhite, fontFamily: BodyFontBold },
                    ]}>
                    {t.label}
                  </Text>
                </BouncyPressable>
              );
            })}
          </ScrollView>
        </View>

        {/* FlashList of Archival Polaroid Memories */}
        <View style={styles.listFlex}>
          <FlashList
            data={filteredMemories}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Camera size={32} color={Pastel.textMuted} />
                <Text style={styles.emptyTitle}>Belum ada kenangan di kategori ini</Text>
                <Text style={styles.emptySub}>
                  Tap tombol “+ Momen” untuk menyimpan foto atau cerita kencan kalian.
                </Text>
              </View>
            }
          />
        </View>
      </View>

      {/* Add Memory Modal */}
      <KeyboardModalSheet
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Abadikan Momen Baru</Text>
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
                <ImagePlus size={24} color={Pastel.text} />
                <Text style={styles.photoPickerTitle}>Pilih Foto dari Galeri</Text>
                <Text style={styles.photoPickerSub}>
                  Opsional — kosongkan untuk sampul ilustrasi kertas
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

          <Text style={styles.inputLabel}>Tanggal Momen (Kalender atau Ketik)</Text>
          <DatePickerField
            value={dateStr}
            onChange={setDateStr}
            placeholder="Pilih tanggal momen..."
            compact
          />

          <Text style={styles.inputLabel}>Lokasi</Text>
          <TextInput
            value={location}
            onChangeText={setLocation}
            placeholder="Misal: Blok M"
            placeholderTextColor={Pastel.textSoft}
            style={styles.modalInput}
          />

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
                    selected && { backgroundColor: Pastel.text, borderColor: Pastel.text },
                  ]}>
                  <Text
                    style={[
                      styles.filterChipText,
                      selected && { color: Pastel.pureWhite, fontFamily: BodyFontBold },
                    ]}>
                    {t.label}
                  </Text>
                </BouncyPressable>
              );
            })}
          </View>

          <Text style={styles.inputLabel}>Stiker Sampul</Text>
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
            placeholder="Ceritain hal paling manis atau lucu di momen ini..."
            placeholderTextColor={Pastel.textSoft}
            style={[styles.modalInput, styles.textArea]}
            multiline
          />

          <BouncyPressable
            onPress={handleCreateMemory}
            style={[styles.saveBtn, !title.trim() && { opacity: 0.45 }]}>
            <Text style={styles.saveBtnText}>Simpan Kenangan</Text>
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
    marginBottom: 12,
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
    letterSpacing: 0.6,
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
  filterWrap: {
    marginBottom: 10,
  },
  filterScroll: {
    gap: 7,
    paddingVertical: 2,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Pastel.bgElevated,
    borderWidth: 1,
    borderColor: Pastel.borderStrong,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  filterChipText: {
    fontFamily: BodyFontSemi,
    fontSize: 12.5,
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
    backgroundColor: Pastel.bgElevated,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Pastel.borderStrong,
    marginBottom: 16,
    gap: 12,
  },
  coverBox: {
    width: '100%',
    height: 176,
    borderRadius: 8,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Pastel.border,
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
    fontSize: 48,
  },
  pastelCoverHint: {
    fontFamily: MonoFontBold,
    fontSize: 10,
    color: Pastel.textMuted,
    letterSpacing: 1.2,
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
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Pastel.borderStrong,
  },
  tagPillText: {
    fontFamily: MonoFontBold,
    fontSize: 9.5,
    letterSpacing: 0.6,
  },
  favCircle: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(252,251,248,0.92)',
    borderWidth: 1,
    borderColor: Pastel.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    paddingHorizontal: 2,
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
    fontFamily: SerifFontSemi,
    fontSize: 18,
    color: Pastel.text,
  },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Pastel.bg,
    borderWidth: 1,
    borderColor: Pastel.border,
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
    fontFamily: MonoFont,
    fontSize: 10.5,
    color: Pastel.coralDark,
    letterSpacing: 0.4,
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
    color: Pastel.textMuted,
  },
  cardStory: {
    fontFamily: RoundedFont,
    fontSize: 13.5,
    color: Pastel.text,
    lineHeight: 20,
  },
  emptyBox: {
    backgroundColor: Pastel.bgElevated,
    borderRadius: 14,
    padding: 28,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: Pastel.borderStrong,
    marginTop: 20,
  },
  emptyTitle: {
    fontFamily: SerifFontSemi,
    fontSize: 17,
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
    borderRadius: 10,
    backgroundColor: Pastel.bgMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    gap: 10,
    paddingBottom: 20,
  },
  photoPickerBox: {
    height: 128,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Pastel.borderStrong,
    backgroundColor: Pastel.bg,
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
    fontFamily: BodyFontBold,
    fontSize: 13.5,
    color: Pastel.text,
  },
  photoPickerSub: {
    fontFamily: RoundedFont,
    fontSize: 11.5,
    color: Pastel.textMuted,
    textAlign: 'center',
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
  textArea: {
    minHeight: 82,
    textAlignVertical: 'top',
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
    borderRadius: 10,
    backgroundColor: Pastel.bg,
    borderWidth: 1,
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
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnText: {
    fontFamily: BodyFontBold,
    fontSize: 14.5,
    color: Pastel.pureWhite,
  },
});
