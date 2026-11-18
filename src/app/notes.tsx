import { FlashList } from '@shopify/flash-list';
import { Pin, Plus, StickyNote, Trash2, X } from 'lucide-react-native';
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
import { NOTE_PALETTES, Pastel, RoundedFont } from '@/constants/pastelTheme';
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
      <View style={styles.noteTop}>
        <View style={styles.authorChip}>
          <Text style={[styles.authorChipText, { color: palette.accent }]}>
            Dari {authorName} • {formatRelativeTime(item.createdAt)}
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
              color={item.pinned ? Pastel.white : palette.accent}
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
                active && {
                  backgroundColor: Pastel.white,
                  borderColor: palette.accent,
                },
              ]}>
              <Text style={styles.reactEmoji}>{emoji}</Text>
            </BouncyPressable>
          );
        })}

        {item.pinned ? (
          <Text style={[styles.pinnedFlag, { color: palette.accent }]}>
            📌 Di Beranda
          </Text>
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
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.pageTitle}>Papan Love Notes 💌</Text>
            <Text style={styles.pageSub}>
              {loveNotes.length} catatan manis • Nulis sebagai {activePartner.name}
            </Text>
          </View>

          <BouncyPressable
            onPress={() => setModalVisible(true)}
            style={styles.addBtn}>
            <Plus size={16} color={Pastel.white} />
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
            { id: 'pinned', label: '📌 Disematkan' },
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

        {/* FlashList Sticky Notes */}
        <View style={styles.listFlex}>
          <FlashList
            data={filteredNotes}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <StickyNote size={34} color={Pastel.taro} />
                <Text style={styles.emptyTitle}>Belum ada catatan di filter ini</Text>
                <Text style={styles.emptySub}>
                  Tulis pesan gemoy atau semangat buat pasanganmu sekarang!
                </Text>
              </View>
            }
          />
        </View>
      </View>

      {/* Write Love Note Modal */}
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
              <Text style={styles.modalTitle}>Tulis Love Note Baru 💌</Text>
              <BouncyPressable
                onPress={() => setModalVisible(false)}
                style={styles.modalCloseBtn}>
                <X size={18} color={Pastel.textMuted} />
              </BouncyPressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalBody}>
              <Text style={styles.inputLabel}>Pesan Manis ({activePartner.name})</Text>
              <TextInput
                value={message}
                onChangeText={setMessage}
                placeholder="Jangan lupa makan siang ya sayang, semangat! 💕"
                placeholderTextColor={Pastel.textSoft}
                style={[styles.modalInput, styles.textArea]}
                multiline
                maxLength={220}
              />

              <Text style={styles.inputLabel}>Warna Sticky Note</Text>
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
                        selected && { borderWidth: 2.5 },
                      ]}>
                      <Text style={[styles.paletteLabel, { color: p.accent }]}>
                        {p.label}
                      </Text>
                    </BouncyPressable>
                  );
                })}
              </View>

              <Text style={styles.inputLabel}>Pilih Stiker</Text>
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
                    backgroundColor: Pastel.taroSoft,
                    borderColor: Pastel.taro,
                  },
                ]}>
                <Pin size={15} color={pinOnCreate ? Pastel.taro : Pastel.textMuted} />
                <Text
                  style={[
                    styles.pinToggleText,
                    pinOnCreate && { color: '#5B43D6', fontWeight: '800' },
                  ]}>
                  Sematkan di halaman Beranda
                </Text>
              </BouncyPressable>

              <BouncyPressable
                onPress={handleCreateNote}
                style={[styles.saveBtn, !message.trim() && { opacity: 0.5 }]}>
                <Text style={styles.saveBtnText}>Tempel Love Note 📌</Text>
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
    backgroundColor: Pastel.taro,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    shadowColor: Pastel.taro,
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
  filterScrollWrap: {
    maxHeight: 42,
    marginBottom: 10,
  },
  filterScroll: {
    gap: 8,
    alignItems: 'center',
  },
  filterChip: {
    backgroundColor: Pastel.white,
    borderWidth: 1.5,
    borderColor: Pastel.border,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 999,
  },
  filterChipActive: {
    backgroundColor: Pastel.taroSoft,
    borderColor: Pastel.taro,
  },
  filterChipText: {
    fontFamily: RoundedFont,
    fontSize: 12.5,
    fontWeight: '700',
    color: Pastel.textMuted,
  },
  filterChipTextActive: {
    color: '#5B43D6',
    fontWeight: '800',
  },
  listFlex: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 112,
    paddingTop: 4,
  },
  noteCard: {
    borderRadius: 24,
    padding: 15,
    borderWidth: 2,
    marginBottom: 12,
    gap: 10,
  },
  noteTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  authorChip: {
    backgroundColor: 'rgba(255,255,255,0.78)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  authorChipText: {
    fontFamily: RoundedFont,
    fontSize: 11.5,
    fontWeight: '800',
  },
  noteActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteBodyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  noteSticker: {
    fontSize: 28,
    marginTop: 2,
  },
  noteMessage: {
    flex: 1,
    fontFamily: RoundedFont,
    fontSize: 14.5,
    fontWeight: '600',
    color: Pastel.text,
    lineHeight: 21,
  },
  reactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reactBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderWidth: 1.5,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactEmoji: {
    fontSize: 15,
  },
  pinnedFlag: {
    marginLeft: 'auto',
    fontFamily: RoundedFont,
    fontSize: 11.5,
    fontWeight: '800',
  },
  emptyBox: {
    backgroundColor: Pastel.white,
    borderRadius: 24,
    padding: 26,
    alignItems: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: Pastel.border,
    marginTop: 18,
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
    maxHeight: '86%',
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
    borderRadius: 999,
    borderWidth: 1.5,
  },
  paletteLabel: {
    fontFamily: RoundedFont,
    fontSize: 12,
    fontWeight: '800',
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
    backgroundColor: Pastel.taroSoft,
    borderColor: Pastel.taro,
  },
  stickerText: {
    fontSize: 20,
  },
  pinToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Pastel.bg,
    borderWidth: 1.5,
    borderColor: Pastel.border,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 4,
  },
  pinToggleText: {
    fontFamily: RoundedFont,
    fontSize: 13.5,
    fontWeight: '600',
    color: Pastel.textMuted,
  },
  saveBtn: {
    backgroundColor: Pastel.taro,
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
