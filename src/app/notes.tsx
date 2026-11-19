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
  BodyFontSemi,
  MonoFont,
  MonoFontBold,
  NOTE_PALETTES,
  Pastel,
  RoundedFont,
  SerifFont,
  SerifFontSemi,
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
    <View
      style={[
        styles.noteCard,
        { backgroundColor: palette.bg, borderColor: palette.border },
      ]}>
      <View style={[styles.noteTop, { borderBottomColor: palette.border }]}>
        <Text style={[styles.authorChipText, { color: palette.accent }]}>
          DARI {authorName.toUpperCase()} • {formatRelativeTime(item.createdAt).toUpperCase()}
        </Text>

        <View style={styles.noteActions}>
          <BouncyPressable
            onPress={() => onTogglePin(item.id)}
            style={[
              styles.iconCircle,
              { borderColor: palette.border },
              item.pinned && { backgroundColor: palette.accent, borderColor: palette.accent },
            ]}
            accessibilityLabel="Sematkan ke Beranda">
            <Pin
              size={12}
              color={item.pinned ? Pastel.pureWhite : palette.accent}
            />
          </BouncyPressable>

          <BouncyPressable
            onPress={() => onDelete(item.id)}
            style={[styles.iconCircle, { borderColor: palette.border }]}>
            <Trash2 size={12} color={Pastel.textMuted} />
          </BouncyPressable>
        </View>
      </View>

      <View style={styles.noteBodyRow}>
        <Text style={styles.noteSticker}>{item.sticker}</Text>
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
                { borderColor: active ? palette.accent : palette.border },
                active && { backgroundColor: Pastel.bgElevated },
              ]}>
              <Text style={styles.reactEmoji}>{emoji}</Text>
            </BouncyPressable>
          );
        })}

        {item.pinned ? (
          <View style={styles.pinnedBadge}>
            <Pin size={10} color={palette.accent} />
            <Text style={[styles.pinnedFlag, { color: palette.accent }]}>
              DI BERANDA
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
        {/* Editorial Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.pageTitle}>Papan Love Notes</Text>
            <Text style={styles.pageSub}>
              {loveNotes.length} CATATAN • MENULIS SEBAGAI {activePartner.name.toUpperCase()}
            </Text>
          </View>

          <BouncyPressable
            onPress={() => setModalVisible(true)}
            style={styles.addBtn}>
            <Plus size={15} color={Pastel.pureWhite} />
            <Text style={styles.addBtnText}>Tulis</Text>
          </BouncyPressable>
        </View>

        {/* Filter Bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScrollWrap}
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
                style={[styles.filterChip, active && styles.filterChipActive]}>
                <Text
                  style={[
                    styles.filterChipText,
                    active && styles.filterChipTextActive,
                  ]}>
                  {tab.label}
                </Text>
              </BouncyPressable>
            );
          })}
        </ScrollView>

        {/* FlashList Stationery Notes */}
        <View style={styles.listFlex}>
          <FlashList
            data={filteredNotes}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <StickyNote size={30} color={Pastel.textMuted} />
                <Text style={styles.emptyTitle}>Belum ada catatan di filter ini</Text>
                <Text style={styles.emptySub}>
                  Tulis catatan singkat atau kata semangat untuk pasanganmu.
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
          <Text style={styles.inputLabel}>Pesan ({activePartner.name})</Text>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="Jangan lupa istirahat dan makan siang hari ini..."
            placeholderTextColor={Pastel.textSoft}
            style={[styles.modalInput, styles.textArea]}
            multiline
            maxLength={220}
          />

          <Text style={styles.inputLabel}>Kertas Catatan</Text>
          <View style={styles.paletteRow}>
            {NOTE_PALETTES.map((p) => {
              const selected = colorId === p.id;
              return (
                <BouncyPressable
                  key={p.id}
                  onPress={() => setColorId(p.id)}
                  style={[
                    styles.paletteSwatch,
                    { backgroundColor: p.bg, borderColor: selected ? p.accent : p.border },
                    selected && { borderWidth: 2 },
                  ]}>
                  <Text style={[styles.paletteLabel, { color: p.accent }]}>
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
              pinOnCreate && {
                backgroundColor: Pastel.coralSoft,
                borderColor: Pastel.coral,
              },
            ]}>
            <Pin size={14} color={pinOnCreate ? Pastel.coralDark : Pastel.textMuted} />
            <Text
              style={[
                styles.pinToggleText,
                pinOnCreate && { color: Pastel.coralDark, fontFamily: BodyFontBold },
              ]}>
              Sematkan di halaman Beranda
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
    fontSize: 10,
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
  filterScrollWrap: {
    maxHeight: 42,
    marginBottom: 10,
  },
  filterScroll: {
    gap: 7,
    alignItems: 'center',
  },
  filterChip: {
    backgroundColor: Pastel.bgElevated,
    borderWidth: 1,
    borderColor: Pastel.borderStrong,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  filterChipActive: {
    backgroundColor: Pastel.text,
    borderColor: Pastel.text,
  },
  filterChipText: {
    fontFamily: BodyFontSemi,
    fontSize: 12.5,
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
    paddingBottom: 112,
    paddingTop: 4,
  },
  noteCard: {
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    marginBottom: 12,
    gap: 11,
  },
  noteTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingBottom: 9,
    borderBottomWidth: 1,
  },
  authorChipText: {
    fontFamily: MonoFontBold,
    fontSize: 10,
    letterSpacing: 0.5,
    flexShrink: 1,
  },
  noteActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 7,
    borderWidth: 1,
    backgroundColor: 'rgba(252,251,248,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteBodyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
  },
  noteSticker: {
    fontSize: 24,
    marginTop: 1,
  },
  noteMessage: {
    flex: 1,
    fontFamily: SerifFont,
    fontSize: 16.5,
    color: Pastel.text,
    lineHeight: 24,
  },
  reactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reactBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(252,251,248,0.65)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactEmoji: {
    fontSize: 14,
  },
  pinnedBadge: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pinnedFlag: {
    fontFamily: MonoFontBold,
    fontSize: 9.5,
    letterSpacing: 0.5,
  },
  emptyBox: {
    backgroundColor: Pastel.bgElevated,
    borderRadius: 12,
    padding: 26,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: Pastel.borderStrong,
    marginTop: 18,
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
  textArea: {
    minHeight: 92,
    textAlignVertical: 'top',
  },
  paletteRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  paletteSwatch: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  paletteLabel: {
    fontFamily: BodyFontBold,
    fontSize: 12,
  },
  stickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  stickerBtn: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: Pastel.bg,
    borderWidth: 1,
    borderColor: Pastel.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stickerBtnActive: {
    backgroundColor: Pastel.coralSoft,
    borderColor: Pastel.coral,
  },
  stickerText: {
    fontSize: 19,
  },
  pinToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Pastel.bg,
    borderWidth: 1,
    borderColor: Pastel.borderStrong,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 4,
  },
  pinToggleText: {
    fontFamily: BodyFontSemi,
    fontSize: 13.5,
    color: Pastel.textMuted,
  },
  saveBtn: {
    backgroundColor: Pastel.coral,
    borderRadius: 10,
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
