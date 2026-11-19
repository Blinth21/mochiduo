import { FlashList } from '@shopify/flash-list';
import { Pin, Plus, StickyNote, Trash2, X } from 'lucide-react-native';
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
import { KeyboardModalSheet } from '@/components/KeyboardModalSheet';
import {
  BodyFontBold,
  BodyFontRegular,
  BodyFontSemi,
  NOTE_PALETTES,
  Pastel,
  RoundedFont,
  SoftShadow,
  SoftShadowSm,
} from '@/constants/pastelTheme';
import { useCoupleStore } from '@/store/useCoupleStore';
import type { LoveNote, NoteColorId } from '@/types/couple';
import { formatRelativeTime } from '@/utils/dateCalc';
import { triggerMediumHaptic, triggerSuccessHaptic } from '@/utils/haptics';

const NOTE_STICKERS = ['🍓', '💕', '🧸', '🌟', '🍵', '🎀', '🥺', '✨'];
const REACTIONS = ['❤️', '🥰', '🫂', '😂'];

interface NoteCardProps {
  item: LoveNote;
  authorName: string;
  onTogglePin: (id: string) => void;
  onReact: (id: string, emoji: string) => void;
  onDelete: (id: string) => void;
}

const NoteCard = React.memo(function NoteCard({
  item,
  authorName,
  onTogglePin,
  onReact,
  onDelete,
}: NoteCardProps) {
  const palette =
    NOTE_PALETTES.find((p) => p.id === item.colorId) ?? NOTE_PALETTES[0];

  return (
    <View style={[styles.noteCard, SoftShadowSm, { backgroundColor: palette.bg }]}>
      <View style={styles.noteTop}>
        <View style={styles.authorPill}>
          <Text style={[styles.authorChipText, { color: palette.accent }]} numberOfLines={1}>
            Dari {authorName} · {formatRelativeTime(item.createdAt)}
          </Text>
        </View>

        <View style={styles.noteActions}>
          <BouncyPressable
            onPress={() => onTogglePin(item.id)}
            style={[
              styles.iconCircle,
              item.pinned && { backgroundColor: palette.accent },
            ]}
            accessibilityLabel="Sematkan ke Beranda">
            <Pin
              size={13}
              color={item.pinned ? Pastel.pureWhite : palette.accent}
            />
          </BouncyPressable>

          <BouncyPressable
            onPress={() => onDelete(item.id)}
            style={styles.iconCircle}>
            <Trash2 size={13} color={Pastel.textMuted} />
          </BouncyPressable>
        </View>
      </View>

      <View style={styles.noteBodyRow}>
        <View style={styles.stickerCircle}>
          <Text style={styles.noteSticker}>{item.sticker}</Text>
        </View>
        <Text style={styles.noteMessage}>{item.message}</Text>
      </View>

      <View style={styles.reactionRow}>
        {REACTIONS.map((emoji) => {
          const active = item.reaction === emoji;
          return (
            <BouncyPressable
              key={emoji}
              onPress={() => onReact(item.id, emoji)}
              scaleTo={0.85}
              style={[
                styles.reactBtn,
                active && [styles.reactBtnActive, SoftShadowSm],
              ]}>
              <Text style={styles.reactEmoji}>{emoji}</Text>
            </BouncyPressable>
          );
        })}

        {item.pinned ? (
          <View style={styles.pinnedBadge}>
            <Pin size={11} color={palette.accent} />
            <Text style={[styles.pinnedFlag, { color: palette.accent }]}>
              Di Beranda
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
});

export default function NotesScreen() {
  const loveNotes = useCoupleStore((s) => s.loveNotes);
  const activePartnerId = useCoupleStore((s) => s.activePartnerId);
  const p1 = useCoupleStore((s) => s.partners.p1);
  const p2 = useCoupleStore((s) => s.partners.p2);

  const addLoveNote = useCoupleStore((s) => s.addLoveNote);
  const togglePinNote = useCoupleStore((s) => s.togglePinNote);
  const reactToNote = useCoupleStore((s) => s.reactToNote);
  const deleteLoveNote = useCoupleStore((s) => s.deleteLoveNote);

  const [filter, setFilter] = useState<'all' | 'p1' | 'p2' | 'pinned'>('all');
  const [modalVisible, setModalVisible] = useState(false);

  // Form state
  const [message, setMessage] = useState('');
  const [colorId, setColorId] = useState<NoteColorId>('pink');
  const [sticker, setSticker] = useState('🍓');
  const [pinOnCreate, setPinOnCreate] = useState(true);

  const activePartner = activePartnerId === 'p1' ? p1 : p2;

  const filteredNotes = useMemo(() => {
    return loveNotes.filter((n) => {
      if (filter === 'p1') return n.authorId === 'p1';
      if (filter === 'p2') return n.authorId === 'p2';
      if (filter === 'pinned') return n.pinned;
      return true;
    });
  }, [filter, loveNotes]);

  const handleTogglePin = useCallback(
    (id: string) => {
      triggerMediumHaptic();
      togglePinNote(id);
    },
    [togglePinNote]
  );

  const handleReact = useCallback(
    (id: string, emoji: string) => {
      triggerMediumHaptic();
      reactToNote(id, emoji);
    },
    [reactToNote]
  );

  const handleDelete = useCallback(
    (id: string) => {
      triggerMediumHaptic();
      deleteLoveNote(id);
    },
    [deleteLoveNote]
  );

  const handleCreateNote = useCallback(() => {
    if (!message.trim()) return;
    triggerSuccessHaptic();
    addLoveNote({
      authorId: activePartnerId,
      message: message.trim(),
      sticker,
      colorId,
      pinned: pinOnCreate,
    });
    setMessage('');
    setModalVisible(false);
  }, [activePartnerId, addLoveNote, colorId, message, pinOnCreate, sticker]);

  const renderItem = useCallback(
    ({ item }: { item: LoveNote }) => (
      <NoteCard
        item={item}
        authorName={item.authorId === 'p1' ? p1.name : p2.name}
        onTogglePin={handleTogglePin}
        onReact={handleReact}
        onDelete={handleDelete}
      />
    ),
    [handleDelete, handleReact, handleTogglePin, p1.name, p2.name]
  );

  const keyExtractor = useCallback((item: LoveNote) => item.id, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* Clean Airy Header */}
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.pageTitle} maxFontSizeMultiplier={1.2}>
              Love Notes
            </Text>
            <Text style={styles.pageSub} maxFontSizeMultiplier={1.2}>
              {loveNotes.length} catatan manis · menulis sebagai {activePartner.name}
            </Text>
          </View>

          <BouncyPressable
            onPress={() => setModalVisible(true)}
            style={styles.addBtn}>
            <Plus size={16} color={Pastel.pureWhite} />
            <Text style={styles.addBtnText} maxFontSizeMultiplier={1.15}>
              Tulis
            </Text>
          </BouncyPressable>
        </View>

        {/* Borderless Filter Pills (no maxHeight clipping!) */}
        <View style={styles.filterWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}>
            {[
              { id: 'all', label: 'Semua' },
              { id: 'p1', label: `Dari ${p1.name}` },
              { id: 'p2', label: `Dari ${p2.name}` },
              { id: 'pinned', label: 'Disematkan' },
            ].map((tab) => {
              const active = filter === tab.id;
              return (
                <BouncyPressable
                  key={tab.id}
                  onPress={() => setFilter(tab.id as any)}
                  style={[
                    styles.filterChip,
                    SoftShadowSm,
                    active && styles.filterChipActive,
                  ]}>
                  <Text
                    style={[
                      styles.filterChipText,
                      active && styles.filterChipTextActive,
                    ]}
                    maxFontSizeMultiplier={1.15}>
                    {tab.label}
                  </Text>
                </BouncyPressable>
              );
            })}
          </ScrollView>
        </View>

        {/* FlashList Soft Pastel Notes */}
        <View style={styles.listFlex}>
          <FlashList
            data={filteredNotes}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            drawDistance={450}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={[styles.emptyBox, SoftShadow]}>
                <View style={styles.emptyIconCircle}>
                  <StickyNote size={26} color={Pastel.coral} />
                </View>
                <Text style={styles.emptyTitle}>Belum ada catatan di sini</Text>
                <Text style={styles.emptySub}>
                  Tulis catatan singkat atau kata semangat manis buat pasanganmu.
                </Text>
              </View>
            }
          />
        </View>
      </View>

      {/* Write Love Note Modal */}
      <KeyboardModalSheet
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Tulis Love Note Baru</Text>
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
          <Text style={styles.inputLabel}>Pesan dari {activePartner.name}</Text>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="Jangan lupa istirahat dan makan siang hari ini..."
            placeholderTextColor={Pastel.textSoft}
            style={[styles.modalInput, styles.textArea]}
            multiline
            maxLength={220}
          />

          <Text style={styles.inputLabel}>Warna Catatan</Text>
          <View style={styles.paletteRow}>
            {NOTE_PALETTES.map((p) => {
              const selected = colorId === p.id;
              return (
                <BouncyPressable
                  key={p.id}
                  onPress={() => setColorId(p.id)}
                  style={[
                    styles.paletteSwatch,
                    { backgroundColor: p.bg },
                    selected && { backgroundColor: p.accent },
                  ]}>
                  <Text
                    style={[
                      styles.paletteLabel,
                      { color: selected ? Pastel.pureWhite : p.accent },
                    ]}>
                    {p.label}
                  </Text>
                </BouncyPressable>
              );
            })}
          </View>

          <Text style={styles.inputLabel}>Stiker</Text>
          <View style={styles.stickerRow}>
            {NOTE_STICKERS.map((s) => (
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

          <BouncyPressable
            onPress={() => setPinOnCreate((v) => !v)}
            style={[
              styles.pinToggleRow,
              pinOnCreate && { backgroundColor: Pastel.coralSoft },
            ]}>
            <Pin size={15} color={pinOnCreate ? Pastel.coralDark : Pastel.textMuted} />
            <Text
              style={[
                styles.pinToggleText,
                pinOnCreate && { color: Pastel.coralDark, fontFamily: BodyFontBold },
              ]}>
              Sematkan di halaman Home
            </Text>
          </BouncyPressable>

          <BouncyPressable
            onPress={handleCreateNote}
            style={[styles.saveBtn, !message.trim() && { opacity: 0.45 }]}>
            <Text style={styles.saveBtnText}>Tempel Catatan</Text>
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
    backgroundColor: Pastel.bgElevated,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
  },
  filterChipActive: {
    backgroundColor: Pastel.coral,
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
  noteCard: {
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
    gap: 13,
  },
  noteTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  authorPill: {
    backgroundColor: 'rgba(255,255,255,0.78)',
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 999,
    flexShrink: 1,
  },
  authorChipText: {
    fontFamily: BodyFontBold,
    fontSize: 11.5,
    lineHeight: 16,
  },
  noteActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.86)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteBodyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  stickerCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteSticker: {
    fontSize: 22,
    lineHeight: 28,
  },
  noteMessage: {
    flex: 1,
    fontFamily: BodyFontSemi,
    fontSize: 15.5,
    lineHeight: 24,
    color: Pastel.text,
  },
  reactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 7,
  },
  reactBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactBtnActive: {
    backgroundColor: Pastel.bgElevated,
  },
  reactEmoji: {
    fontSize: 15,
    lineHeight: 20,
  },
  pinnedBadge: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.78)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  pinnedFlag: {
    fontFamily: BodyFontBold,
    fontSize: 11,
    lineHeight: 16,
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
    minHeight: 96,
    textAlignVertical: 'top',
  },
  paletteRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  paletteSwatch: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
  },
  paletteLabel: {
    fontFamily: BodyFontBold,
    fontSize: 12.5,
    lineHeight: 17,
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
    fontSize: 20,
    lineHeight: 26,
  },
  pinToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: Pastel.bgMuted,
    borderRadius: 16,
    paddingHorizontal: 15,
    paddingVertical: 13,
    marginTop: 4,
  },
  pinToggleText: {
    fontFamily: BodyFontSemi,
    fontSize: 13.5,
    lineHeight: 19,
    color: Pastel.textMuted,
  },
  saveBtn: {
    backgroundColor: Pastel.coral,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnText: {
    fontFamily: BodyFontBold,
    fontSize: 15,
    lineHeight: 21,
    color: Pastel.pureWhite,
  },
});
