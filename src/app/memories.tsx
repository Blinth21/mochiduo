import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import {
  Camera,
  Heart,
  ImagePlus,
  MapPin,
  Maximize2,
  Plus,
  Trash2,
  X,
} from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
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
  type PhotoLightboxData,
  PhotoLightboxModal,
} from '@/components/PhotoLightboxModal';
import {
  BodyFontBold,
  BodyFontRegular,
  BodyFontSemi,
  MEMORY_TAGS,
  Pastel,
  RoundedFont,
  SoftShadow,
  SoftShadowSm,
} from '@/constants/pastelTheme';
import { useCoupleStore } from '@/store/useCoupleStore';
import type { MemoryItem, MemoryTag } from '@/types/couple';
import { formatIndonesianDate } from '@/utils/dateCalc';
import {
  triggerLightHaptic,
  triggerMediumHaptic,
  triggerSuccessHaptic,
} from '@/utils/haptics';
import { pickImageFromGallery, takePhotoWithCamera } from '@/utils/mediaPicker';

const MEMORY_STICKERS = ['📸', '🍜', '🛵', '🍦', '🌸', '🎬', '🧸', '✨'];
const CARD_COLORS = ['#FFF0F3', '#FFF7E6', '#EEF5FF', '#F3F0FF', '#EBF8F3'];

interface MemoryCardProps {
  item: MemoryItem;
  onToggleFavorite: (id: string) => void;
  onDelete: (id: string) => void;
  onPressPhoto: (item: MemoryItem) => void;
}

const MemoryCard = React.memo(function MemoryCard({
  item,
  onToggleFavorite,
  onDelete,
  onPressPhoto,
}: MemoryCardProps) {
  const tagMeta = MEMORY_TAGS.find((t) => t.id === item.tag) ?? MEMORY_TAGS[1];

  return (
    <View style={[styles.storyCard, SoftShadow]}>
      {/* Edge-to-edge Photo (tappable fullscreen) or Soft Pastel Illustration Bay */}
      <View style={[styles.coverBox, { backgroundColor: item.cardBg || Pastel.coralSoft }]}>
        {item.photoUri ? (
          <Pressable
            onPress={() => onPressPhoto(item)}
            style={styles.coverImageTap}
            accessibilityLabel={`Lihat foto ${item.title}`}>
            <Image
              source={{ uri: item.photoUri }}
              style={styles.coverImage}
              contentFit="cover"
              transition={160}
              cachePolicy="memory-disk"
              recyclingKey={item.id}
            />
            <View style={styles.coverExpandPill} pointerEvents="none">
              <Maximize2 size={12} color={Pastel.pureWhite} />
            </View>
          </Pressable>
        ) : (
          <View style={styles.pastelCoverContent}>
            <View style={styles.stickerHalo}>
              <Text style={styles.pastelCoverSticker}>{item.sticker}</Text>
            </View>
          </View>
        )}

        {/* Top Floating Soft White Pills */}
        <View style={styles.coverTopRow} pointerEvents="box-none">
          <View style={[styles.tagPill, SoftShadowSm]}>
            <Text style={styles.tagPillEmoji}>{tagMeta.emoji}</Text>
            <Text style={[styles.tagPillText, { color: tagMeta.accent }]}>
              {tagMeta.label}
            </Text>
          </View>

          <BouncyPressable
            onPress={() => onToggleFavorite(item.id)}
            style={[styles.favCircle, SoftShadowSm]}
            scaleTo={0.85}>
            <Heart
              size={16}
              color={item.isFavorite ? Pastel.coral : Pastel.textMuted}
              fill={item.isFavorite ? Pastel.coral : 'none'}
            />
          </BouncyPressable>
        </View>
      </View>

      {/* Clean Story Body */}
      <View style={styles.cardBody}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <BouncyPressable onPress={() => onDelete(item.id)} style={styles.deleteBtn}>
            <Trash2 size={14} color={Pastel.textSoft} />
          </BouncyPressable>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaDatePill}>
            <Text style={styles.metaDate}>{formatIndonesianDate(item.date)}</Text>
          </View>
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
  const [lightboxPhoto, setLightboxPhoto] = useState<PhotoLightboxData | null>(null);

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

  const handlePressPhoto = useCallback((item: MemoryItem) => {
    if (!item.photoUri) return;
    triggerLightHaptic();
    setLightboxPhoto({
      uri: item.photoUri,
      title: item.title,
      subtitle: item.location
        ? `${formatIndonesianDate(item.date)} · ${item.location}`
        : formatIndonesianDate(item.date),
      caption: item.story,
    });
  }, []);

  const pickPhoto = useCallback(async () => {
    const uri = await pickImageFromGallery({ aspect: [4, 3], quality: 0.35 });
    if (uri) setPhotoUri(uri);
  }, []);

  const takePhoto = useCallback(async () => {
    const uri = await takePhotoWithCamera({ aspect: [4, 3], quality: 0.35 });
    if (uri) setPhotoUri(uri);
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
    ({ item }: { item: MemoryItem }) => (
      <MemoryCard
        item={item}
        onToggleFavorite={handleToggleFavorite}
        onDelete={handleDelete}
        onPressPhoto={handlePressPhoto}
      />
    ),
    [handleDelete, handlePressPhoto, handleToggleFavorite]
  );

  const keyExtractor = useCallback((item: MemoryItem) => item.id, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* Clean Airy Header */}
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.pageTitle} maxFontSizeMultiplier={1.2}>
              Album Kenangan
            </Text>
            <Text style={styles.pageSub} maxFontSizeMultiplier={1.2}>
              {memories.length} momen tersimpan · {favCount} favorit
            </Text>
          </View>

          <BouncyPressable
            onPress={() => setModalVisible(true)}
            style={styles.addBtn}>
            <Plus size={16} color={Pastel.pureWhite} />
            <Text style={styles.addBtnText} maxFontSizeMultiplier={1.15}>
              Momen
            </Text>
          </BouncyPressable>
        </View>

        {/* Borderless Soft Filter Pills */}
        <View style={styles.filterWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}>
            <BouncyPressable
              onPress={() => setOnlyFavorites((v) => !v)}
              style={[
                styles.filterChip,
                SoftShadowSm,
                onlyFavorites && styles.filterChipFavActive,
              ]}>
              <Heart
                size={13}
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
                    SoftShadowSm,
                    active && styles.filterChipActive,
                  ]}>
                  <Text style={styles.filterChipEmoji}>{t.emoji}</Text>
                  <Text
                    style={[
                      styles.filterChipText,
                      active && styles.filterChipTextActive,
                    ]}>
                    {t.label}
                  </Text>
                </BouncyPressable>
              );
            })}
          </ScrollView>
        </View>

        {/* FlashList of Soft Photo-Story Cards */}
        <View style={styles.listFlex}>
          <FlashList
            data={filteredMemories}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            drawDistance={450}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={[styles.emptyBox, SoftShadow]}>
                <View style={styles.emptyIconCircle}>
                  <Camera size={26} color={Pastel.coral} />
                </View>
                <Text style={styles.emptyTitle}>Belum ada kenangan di sini</Text>
                <Text style={styles.emptySub}>
                  Tap tombol “+ Momen” buat simpan foto atau cerita kencan kalian.
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
          {/* Photo Preview + Direct Camera & Gallery Actions */}
          <View style={styles.photoPickerBox}>
            {photoUri ? (
              <>
                <Image
                  source={{ uri: photoUri }}
                  style={styles.previewImage}
                  contentFit="cover"
                />
                <BouncyPressable
                  onPress={() => setPhotoUri(undefined)}
                  style={styles.removePhotoPill}>
                  <Trash2 size={13} color={Pastel.coralDark} />
                  <Text style={styles.removePhotoText}>Hapus</Text>
                </BouncyPressable>
              </>
            ) : (
              <View style={styles.photoPickerPlaceholder}>
                <View style={styles.photoPickerIconWrap}>
                  <Camera size={22} color={Pastel.coral} />
                </View>
                <Text style={styles.photoPickerTitle}>Foto Momen Berdua</Text>
                <Text style={styles.photoPickerSub}>
                  Foto langsung dari kamera atau pilih galeri (opsional)
                </Text>
              </View>
            )}
          </View>

          <View style={styles.mediaSourceRow}>
            <BouncyPressable
              onPress={() => void takePhoto()}
              style={styles.mediaSourceBtnPrimary}>
              <Camera size={16} color={Pastel.coralDark} />
              <Text style={styles.mediaSourceTextPrimary}>Ambil Foto</Text>
            </BouncyPressable>
            <BouncyPressable
              onPress={() => void pickPhoto()}
              style={styles.mediaSourceBtnSoft}>
              <ImagePlus size={16} color={Pastel.text} />
              <Text style={styles.mediaSourceTextSoft}>Pilih Galeri</Text>
            </BouncyPressable>
          </View>

          <Text style={styles.inputLabel}>Judul Momen *</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Misal: Kencan Es Krim Sore"
            placeholderTextColor={Pastel.textSoft}
            style={styles.modalInput}
          />

          <Text style={styles.inputLabel}>Tanggal Momen</Text>
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
                    styles.modalTagChip,
                    selected && { backgroundColor: t.bg },
                  ]}>
                  <Text style={styles.filterChipEmoji}>{t.emoji}</Text>
                  <Text
                    style={[
                      styles.filterChipText,
                      selected && { color: t.accent, fontFamily: BodyFontBold },
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

      <PhotoLightboxModal
        photo={lightboxPhoto}
        onClose={() => setLightboxPhoto(null)}
      />
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
    marginBottom: 14,
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
  filterWrap: {
    marginBottom: 12,
  },
  filterScroll: {
    gap: 8,
    paddingVertical: 4,
    paddingHorizontal: 1,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Pastel.bgElevated,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
  },
  filterChipFavActive: {
    backgroundColor: Pastel.coralSoft,
  },
  filterChipActive: {
    backgroundColor: Pastel.coral,
  },
  filterChipEmoji: {
    fontSize: 13,
    lineHeight: 18,
  },
  filterChipText: {
    fontFamily: BodyFontSemi,
    fontSize: 13,
    lineHeight: 18,
    color: Pastel.textMuted,
  },
  filterChipTextActive: {
    fontFamily: BodyFontBold,
    color: Pastel.pureWhite,
  },
  listFlex: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 118,
    paddingTop: 4,
  },
  storyCard: {
    backgroundColor: Pastel.bgElevated,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 18,
  },
  coverBox: {
    width: '100%',
    height: 188,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverImageTap: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverExpandPill: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(18, 20, 28, 0.56)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pastelCoverContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  stickerHalo: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pastelCoverSticker: {
    fontSize: 44,
    lineHeight: 54,
  },
  coverTopRow: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.94)',
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 999,
  },
  tagPillEmoji: {
    fontSize: 12,
    lineHeight: 16,
  },
  tagPillText: {
    fontFamily: BodyFontBold,
    fontSize: 11.5,
    lineHeight: 16,
  },
  favCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.94)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    padding: 16,
    gap: 8,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  cardTitle: {
    flex: 1,
    fontFamily: BodyFontBold,
    fontSize: 17,
    lineHeight: 24,
    color: Pastel.text,
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Pastel.bgMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaDatePill: {
    backgroundColor: Pastel.coralSoft,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  metaDate: {
    fontFamily: BodyFontSemi,
    fontSize: 11.5,
    lineHeight: 16,
    color: Pastel.coralDark,
  },
  metaLocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
  },
  metaLoc: {
    fontFamily: RoundedFont,
    fontSize: 12.5,
    lineHeight: 18,
    color: Pastel.textMuted,
  },
  cardStory: {
    fontFamily: BodyFontRegular,
    fontSize: 14,
    lineHeight: 21,
    color: Pastel.text,
  },
  emptyBox: {
    backgroundColor: Pastel.bgElevated,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    gap: 10,
    marginTop: 18,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Pastel.coralSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontFamily: BodyFontBold,
    fontSize: 17,
    lineHeight: 24,
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
  photoPickerBox: {
    height: 144,
    borderRadius: 20,
    backgroundColor: Pastel.bgMuted,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  removePhotoPill: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.94)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  removePhotoText: {
    fontFamily: BodyFontBold,
    fontSize: 12,
    lineHeight: 16,
    color: Pastel.coralDark,
  },
  mediaSourceRow: {
    flexDirection: 'row',
    gap: 10,
  },
  mediaSourceBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: Pastel.coralSoft,
    paddingVertical: 11,
    borderRadius: 999,
  },
  mediaSourceTextPrimary: {
    fontFamily: BodyFontBold,
    fontSize: 13.5,
    lineHeight: 19,
    color: Pastel.coralDark,
  },
  mediaSourceBtnSoft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: Pastel.bgMuted,
    paddingVertical: 11,
    borderRadius: 999,
  },
  mediaSourceTextSoft: {
    fontFamily: BodyFontSemi,
    fontSize: 13.5,
    lineHeight: 19,
    color: Pastel.text,
  },
  photoPickerPlaceholder: {
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
  },
  photoPickerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Pastel.coralSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPickerTitle: {
    fontFamily: BodyFontBold,
    fontSize: 14,
    lineHeight: 20,
    color: Pastel.text,
  },
  photoPickerSub: {
    fontFamily: BodyFontRegular,
    fontSize: 12,
    lineHeight: 17,
    color: Pastel.textMuted,
    textAlign: 'center',
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
  textArea: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modalTagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Pastel.bgMuted,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 999,
  },
  stickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  stickerBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Pastel.bgMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stickerBtnActive: {
    backgroundColor: Pastel.coralSoft,
  },
  stickerText: {
    fontSize: 21,
    lineHeight: 26,
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
