import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from 'expo-router';
import {
  ArrowLeftRight,
  Check,
  CheckCheck,
  Cloud,
  ImagePlus,
  Reply,
  Send,
  Smile,
  Trash2,
  X,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Keyboard,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { BouncyPressable } from '@/components/BouncyPressable';
import { LiveSyncModal } from '@/components/LiveSyncModal';
import {
  BodyFontBold,
  BodyFontSemi,
  MonoFont,
  MonoFontBold,
  Pastel,
  RoundedFont,
  SerifFontSemi,
} from '@/constants/pastelTheme';
import { broadcastTyping } from '@/services/coupleSync';
import { useCoupleStore } from '@/store/useCoupleStore';
import type { ChatMessage, PartnerId } from '@/types/couple';
import { formatRelativeTime } from '@/utils/dateCalc';
import { triggerLightHaptic, triggerMediumHaptic, triggerSuccessHaptic } from '@/utils/haptics';

const CHAT_STICKERS = ['😘', '🥰', '🫂', '💕', '🥺', '😂', '🍦', '☕', '🍓', '✨'];
const BUBBLE_REACTIONS = ['❤️', '😂', '🥺', '🫂', '👍', '🔥'];

type ChatRow =
  | { type: 'date'; id: string; label: string }
  | { type: 'msg'; id: string; msg: ChatMessage };

function formatTimeHHMM(ts: number): string {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function formatDateSeparator(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return 'Hari Ini';
  if (d.toDateString() === yesterday.toDateString()) return 'Kemarin';
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

interface MessageBubbleProps {
  msg: ChatMessage;
  isMine: boolean;
  senderName: string;
  p1Name: string;
  p2Name: string;
  onLongPress: (msg: ChatMessage) => void;
  onReplyTap: (msg: ChatMessage) => void;
}

const MessageBubble = React.memo(function MessageBubble({
  msg,
  isMine,
  senderName,
  p1Name,
  p2Name,
  onLongPress,
  onReplyTap,
}: MessageBubbleProps) {
  const replyAuthor =
    msg.replyToSender === 'p1' ? p1Name : msg.replyToSender === 'p2' ? p2Name : senderName;

  return (
    <View style={[styles.bubbleRow, isMine ? styles.bubbleRowMine : styles.bubbleRowPartner]}>
      <Pressable
        onLongPress={() => onLongPress(msg)}
        delayLongPress={240}
        style={({ pressed }) => [
          styles.bubble,
          isMine ? styles.bubbleMine : styles.bubblePartner,
          pressed && { opacity: 0.92 },
        ]}>
        {/* Reply quote block */}
        {msg.replyToPreview ? (
          <View
            style={[
              styles.replyQuote,
              isMine ? styles.replyQuoteMine : styles.replyQuotePartner,
            ]}>
            <Text
              style={[styles.replyQuoteAuthor, isMine && { color: Pastel.pureWhite }]}
              numberOfLines={1}>
              {replyAuthor}
            </Text>
            <Text
              style={[styles.replyQuoteText, isMine && { color: 'rgba(255,255,255,0.8)' }]}
              numberOfLines={2}>
              {msg.replyToPreview}
            </Text>
          </View>
        ) : null}

        {/* Photo attachment */}
        {msg.imageUri ? (
          <Image
            source={{ uri: msg.imageUri }}
            style={styles.chatImage}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        ) : null}

        {/* Sticker */}
        {msg.sticker ? <Text style={styles.stickerMsg}>{msg.sticker}</Text> : null}

        {/* Text body */}
        {msg.text ? (
          <Text style={[styles.msgText, isMine && styles.msgTextMine]}>{msg.text}</Text>
        ) : null}

        {/* Footer: time + WA ticks */}
        <View style={styles.bubbleFooter}>
          <BouncyPressable
            onPress={() => onReplyTap(msg)}
            hitSlop={8}
            withHaptic={false}
            style={styles.quickReplyIcon}>
            <Reply size={11} color={isMine ? 'rgba(255,255,255,0.72)' : Pastel.textSoft} />
          </BouncyPressable>
          <Text style={[styles.timeText, isMine && styles.timeTextMine]}>
            {formatTimeHHMM(msg.createdAt)}
          </Text>
          {isMine ? (
            msg.status === 'sent' ? (
              <Check size={13} color="rgba(255,255,255,0.78)" />
            ) : (
              <CheckCheck
                size={13}
                color={msg.status === 'read' ? '#A7E6C5' : 'rgba(255,255,255,0.85)'}
              />
            )
          ) : null}
        </View>

        {/* Reaction badge */}
        {msg.reaction ? (
          <View style={[styles.reactionBadge, isMine ? { left: 8 } : { right: 8 }]}>
            <Text style={styles.reactionEmoji}>{msg.reaction}</Text>
          </View>
        ) : null}
      </Pressable>
    </View>
  );
});

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const listRef = useRef<any>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activePartnerId = useCoupleStore((s) => s.activePartnerId);
  const setActivePartner = useCoupleStore((s) => s.setActivePartner);
  const p1 = useCoupleStore((s) => s.partners.p1);
  const p2 = useCoupleStore((s) => s.partners.p2);
  const chatMessages = useCoupleStore((s) => s.chatMessages);
  const partnerTyping = useCoupleStore((s) => s.partnerTyping);
  const onlinePartners = useCoupleStore((s) => s.onlinePartners);
  const syncConfig = useCoupleStore((s) => s.syncConfig);
  const syncStatus = useCoupleStore((s) => s.syncStatus);

  const sendChatMessage = useCoupleStore((s) => s.sendChatMessage);
  const reactToChatMessage = useCoupleStore((s) => s.reactToChatMessage);
  const deleteChatMessage = useCoupleStore((s) => s.deleteChatMessage);
  const markPartnerMessagesRead = useCoupleStore((s) => s.markPartnerMessagesRead);
  const setIsChatFocused = useCoupleStore((s) => s.setIsChatFocused);

  const partnerId: PartnerId = activePartnerId === 'p1' ? 'p2' : 'p1';
  const me = activePartnerId === 'p1' ? p1 : p2;
  const partner = activePartnerId === 'p1' ? p2 : p1;
  const isPartnerTyping = partnerTyping[partnerId];
  const isPartnerOnline = onlinePartners[partnerId];
  const isLive = syncConfig.enabled && syncStatus === 'connected';
  const partnerInitialBg = partnerId === 'p1' ? Pastel.coral : Pastel.matcha;

  const [inputText, setInputText] = useState('');
  const [showStickers, setShowStickers] = useState(false);
  const [replyTarget, setReplyTarget] = useState<ChatMessage | null>(null);
  const [selectedMsg, setSelectedMsg] = useState<ChatMessage | null>(null);
  const [syncModalVisible, setSyncModalVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useFocusEffect(
    useCallback(() => {
      setIsChatFocused(true);
      markPartnerMessagesRead(activePartnerId);
      return () => {
        setIsChatFocused(false);
      };
    }, [activePartnerId, markPartnerMessagesRead, setIsChatFocused])
  );

  useEffect(() => {
    markPartnerMessagesRead(activePartnerId);
  }, [activePartnerId, chatMessages.length, markPartnerMessagesRead]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const showEv = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEv = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const s1 = Keyboard.addListener(showEv, (e) => {
      setKeyboardHeight(e.endCoordinates?.height ?? 0);
      setTimeout(() => listRef.current?.scrollToEnd?.({ animated: true }), 80);
    });
    const s2 = Keyboard.addListener(hideEv, () => {
      setKeyboardHeight(0);
    });
    return () => {
      s1.remove();
      s2.remove();
    };
  }, []);

  const rows: ChatRow[] = useMemo(() => {
    const out: ChatRow[] = [];
    let lastDateLabel = '';
    for (const m of chatMessages) {
      const dateLabel = formatDateSeparator(m.createdAt);
      if (dateLabel !== lastDateLabel) {
        out.push({ type: 'date', id: `date-${dateLabel}-${m.id}`, label: dateLabel });
        lastDateLabel = dateLabel;
      }
      out.push({ type: 'msg', id: m.id, msg: m });
    }
    return out;
  }, [chatMessages]);

  const handleTextChange = useCallback(
    (txt: string) => {
      setInputText(txt);
      if (!isLive) return;
      broadcastTyping(syncConfig.roomCode, activePartnerId, txt.trim().length > 0);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        broadcastTyping(syncConfig.roomCode, activePartnerId, false);
      }, 2400);
    },
    [activePartnerId, isLive, syncConfig.roomCode]
  );

  const handleSendText = useCallback(() => {
    const trimmed = inputText.trim();
    if (!trimmed) return;
    triggerSuccessHaptic();
    if (isLive) {
      broadcastTyping(syncConfig.roomCode, activePartnerId, false);
    }
    sendChatMessage({
      senderId: activePartnerId,
      text: trimmed,
      replyTo: replyTarget
        ? {
            id: replyTarget.id,
            senderId: replyTarget.senderId,
            preview:
              replyTarget.text ||
              (replyTarget.sticker ? `${replyTarget.sticker} Stiker` : 'Foto'),
          }
        : undefined,
    });
    setInputText('');
    setReplyTarget(null);
    setTimeout(() => listRef.current?.scrollToEnd?.({ animated: true }), 70);
  }, [activePartnerId, inputText, isLive, replyTarget, sendChatMessage, syncConfig.roomCode]);

  const handleSendSticker = useCallback(
    (sticker: string) => {
      triggerMediumHaptic();
      sendChatMessage({
        senderId: activePartnerId,
        text: '',
        sticker,
        replyTo: replyTarget
          ? {
              id: replyTarget.id,
              senderId: replyTarget.senderId,
              preview: replyTarget.text || replyTarget.sticker || 'Foto',
            }
          : undefined,
      });
      setShowStickers(false);
      setReplyTarget(null);
      setTimeout(() => listRef.current?.scrollToEnd?.({ animated: true }), 70);
    },
    [activePartnerId, replyTarget, sendChatMessage]
  );

  const handlePickPhoto = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.4,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const uri = asset.base64
        ? `data:image/jpeg;base64,${asset.base64}`
        : asset.uri;
      if (!uri) return;
      triggerSuccessHaptic();
      sendChatMessage({
        senderId: activePartnerId,
        text: inputText.trim(),
        imageUri: uri,
        replyTo: replyTarget
          ? {
              id: replyTarget.id,
              senderId: replyTarget.senderId,
              preview: replyTarget.text || replyTarget.sticker || 'Foto',
            }
          : undefined,
      });
      setInputText('');
      setReplyTarget(null);
      setTimeout(() => listRef.current?.scrollToEnd?.({ animated: true }), 80);
    }
  }, [activePartnerId, inputText, replyTarget, sendChatMessage]);

  const handleLongPressMsg = useCallback((msg: ChatMessage) => {
    triggerLightHaptic();
    setSelectedMsg(msg);
  }, []);

  const handleReplyTap = useCallback((msg: ChatMessage) => {
    triggerLightHaptic();
    setReplyTarget(msg);
  }, []);

  const renderRow = useCallback(
    ({ item }: { item: ChatRow }) => {
      if (item.type === 'date') {
        return (
          <View style={styles.dateDividerWrap}>
            <View style={styles.dateRule} />
            <View style={styles.dateDividerPill}>
              <Text style={styles.dateDividerText}>{item.label.toUpperCase()}</Text>
            </View>
            <View style={styles.dateRule} />
          </View>
        );
      }
      return (
        <MessageBubble
          msg={item.msg}
          isMine={item.msg.senderId === activePartnerId}
          senderName={item.msg.senderId === 'p1' ? p1.name : p2.name}
          p1Name={p1.name}
          p2Name={p2.name}
          onLongPress={handleLongPressMsg}
          onReplyTap={handleReplyTap}
        />
      );
    },
    [activePartnerId, handleLongPressMsg, handleReplyTap, p1.name, p2.name]
  );

  const bottomSpacer =
    keyboardHeight > 0
      ? keyboardHeight + 8
      : Math.max(insets.bottom, 10) + 70;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* Editorial Messenger Header */}
        <View style={styles.header}>
          <View style={styles.partnerHead}>
            <View style={[styles.avatar, { backgroundColor: partnerInitialBg }]}>
              <Text style={styles.avatarText}>
                {partner.name.slice(0, 1).toUpperCase()}
              </Text>
              {isPartnerOnline ? <View style={styles.onlineDot} /> : null}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.partnerName} numberOfLines={1}>
                {partner.name} · {partner.nickname}
              </Text>
              <Text
                style={[
                  styles.partnerSub,
                  isPartnerTyping && { color: Pastel.matcha, fontFamily: BodyFontBold },
                ]}
                numberOfLines={1}>
                {isPartnerTyping
                  ? 'sedang mengetik...'
                  : isPartnerOnline
                    ? 'Online · Live 2 HP'
                    : isLive
                      ? `Aktif ${formatRelativeTime(partner.updatedAt)}`
                      : 'Mode Lokal · Tap ikon awan untuk Live'}
              </Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            <BouncyPressable
              onPress={() => setSyncModalVisible(true)}
              style={[styles.iconPill, isLive && styles.iconPillLive]}>
              <Cloud size={14} color={isLive ? Pastel.matcha : Pastel.textMuted} />
            </BouncyPressable>
            <BouncyPressable
              onPress={() => setActivePartner(activePartnerId === 'p1' ? 'p2' : 'p1')}
              style={styles.switchPill}>
              <ArrowLeftRight size={12} color={Pastel.text} />
              <Text style={styles.switchText}>{me.name}</Text>
            </BouncyPressable>
          </View>
        </View>

        {/* Chat Messages Canvas */}
        <View style={styles.listWrap}>
          <FlashList
            ref={listRef}
            data={rows}
            renderItem={renderRow}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => {
              if (rows.length > 0) {
                listRef.current?.scrollToEnd?.({ animated: false });
              }
            }}
          />
        </View>

        {/* Composer Area */}
        <View style={[styles.composerOuter, { paddingBottom: bottomSpacer }]}>
          {replyTarget ? (
            <View style={styles.replyBanner}>
              <View style={styles.replyStripe} />
              <View style={{ flex: 1 }}>
                <Text style={styles.replyBannerAuthor}>
                  Membalas {replyTarget.senderId === 'p1' ? p1.name : p2.name}
                </Text>
                <Text style={styles.replyBannerPreview} numberOfLines={1}>
                  {replyTarget.text || replyTarget.sticker || 'Foto'}
                </Text>
              </View>
              <BouncyPressable onPress={() => setReplyTarget(null)} style={styles.replyClose}>
                <X size={14} color={Pastel.textMuted} />
              </BouncyPressable>
            </View>
          ) : null}

          {showStickers ? (
            <View style={styles.stickerTray}>
              {CHAT_STICKERS.map((st) => (
                <BouncyPressable
                  key={st}
                  onPress={() => handleSendSticker(st)}
                  style={styles.stickerItem}>
                  <Text style={styles.stickerEmoji}>{st}</Text>
                </BouncyPressable>
              ))}
            </View>
          ) : null}

          <View style={styles.composerRow}>
            <BouncyPressable
              onPress={() => setShowStickers((v) => !v)}
              style={[styles.mediaBtn, showStickers && styles.mediaBtnActive]}>
              <Smile size={18} color={showStickers ? Pastel.coral : Pastel.textMuted} />
            </BouncyPressable>

            <BouncyPressable onPress={handlePickPhoto} style={styles.mediaBtn}>
              <ImagePlus size={18} color={Pastel.textMuted} />
            </BouncyPressable>

            <TextInput
              value={inputText}
              onChangeText={handleTextChange}
              placeholder={`Tulis pesan untuk ${partner.name}...`}
              placeholderTextColor={Pastel.textSoft}
              style={styles.input}
              multiline
              maxLength={800}
            />

            <BouncyPressable
              onPress={handleSendText}
              disabled={!inputText.trim()}
              style={[styles.sendBtn, !inputText.trim() && { opacity: 0.4 }]}>
              <Send size={16} color={Pastel.pureWhite} />
            </BouncyPressable>
          </View>
        </View>
      </View>

      {/* Long-Press Message Action Sheet */}
      <Modal
        visible={Boolean(selectedMsg)}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedMsg(null)}>
        <Pressable style={styles.actionOverlay} onPress={() => setSelectedMsg(null)}>
          {selectedMsg ? (
            <View style={styles.actionSheet}>
              <View style={styles.emojiBar}>
                {BUBBLE_REACTIONS.map((em) => (
                  <BouncyPressable
                    key={em}
                    onPress={() => {
                      triggerMediumHaptic();
                      reactToChatMessage(selectedMsg.id, em);
                      setSelectedMsg(null);
                    }}
                    style={[
                      styles.emojiChoice,
                      selectedMsg.reaction === em && styles.emojiChoiceActive,
                    ]}>
                    <Text style={{ fontSize: 21 }}>{em}</Text>
                  </BouncyPressable>
                ))}
              </View>

              <BouncyPressable
                onPress={() => {
                  setReplyTarget(selectedMsg);
                  setSelectedMsg(null);
                }}
                style={styles.actionRow}>
                <Reply size={16} color={Pastel.text} />
                <Text style={styles.actionRowText}>Balas Pesan Ini</Text>
              </BouncyPressable>

              <BouncyPressable
                onPress={() => {
                  triggerMediumHaptic();
                  deleteChatMessage(selectedMsg.id);
                  setSelectedMsg(null);
                }}
                style={styles.actionRow}>
                <Trash2 size={16} color={Pastel.coralDark} />
                <Text style={[styles.actionRowText, { color: Pastel.coralDark }]}>
                  Hapus Pesan
                </Text>
              </BouncyPressable>
            </View>
          ) : null}
        </Pressable>
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
    backgroundColor: Pastel.bgElevated,
    alignItems: 'center',
  },
  container: {
    flex: 1,
    width: '100%',
    maxWidth: 540,
    backgroundColor: Pastel.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: Pastel.bgElevated,
    borderBottomWidth: 1,
    borderBottomColor: Pastel.borderStrong,
  },
  partnerHead: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarText: {
    fontFamily: SerifFontSemi,
    fontSize: 18,
    color: Pastel.pureWhite,
  },
  onlineDot: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: Pastel.matcha,
    borderWidth: 2,
    borderColor: Pastel.bgElevated,
  },
  partnerName: {
    fontFamily: SerifFontSemi,
    fontSize: 17.5,
    color: Pastel.text,
  },
  partnerSub: {
    fontFamily: RoundedFont,
    fontSize: 11.5,
    color: Pastel.textMuted,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconPill: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: Pastel.bg,
    borderWidth: 1,
    borderColor: Pastel.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPillLive: {
    backgroundColor: Pastel.matchaSoft,
    borderColor: Pastel.matcha + '66',
  },
  switchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Pastel.bgMuted,
    borderWidth: 1,
    borderColor: Pastel.borderStrong,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
  },
  switchText: {
    fontFamily: BodyFontBold,
    fontSize: 12,
    color: Pastel.text,
  },
  listWrap: {
    flex: 1,
    backgroundColor: Pastel.bg,
  },
  listContent: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  dateDividerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 12,
  },
  dateRule: {
    flex: 1,
    height: 1,
    backgroundColor: Pastel.border,
  },
  dateDividerPill: {
    backgroundColor: Pastel.bgMuted,
    borderWidth: 1,
    borderColor: Pastel.borderStrong,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  dateDividerText: {
    fontFamily: MonoFontBold,
    fontSize: 9.5,
    color: Pastel.textMuted,
    letterSpacing: 0.7,
  },
  bubbleRow: {
    marginVertical: 4,
    flexDirection: 'row',
  },
  bubbleRowMine: {
    justifyContent: 'flex-end',
  },
  bubbleRowPartner: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 4,
    position: 'relative',
    marginBottom: 4,
  },
  bubbleMine: {
    backgroundColor: Pastel.matcha,
    borderBottomRightRadius: 4,
  },
  bubblePartner: {
    backgroundColor: Pastel.bgElevated,
    borderWidth: 1,
    borderColor: Pastel.borderStrong,
    borderBottomLeftRadius: 4,
  },
  replyQuote: {
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderLeftWidth: 2.5,
    marginBottom: 2,
  },
  replyQuoteMine: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderLeftColor: Pastel.pureWhite,
  },
  replyQuotePartner: {
    backgroundColor: Pastel.bg,
    borderLeftColor: Pastel.coral,
  },
  replyQuoteAuthor: {
    fontFamily: BodyFontBold,
    fontSize: 11,
    color: Pastel.text,
  },
  replyQuoteText: {
    fontFamily: RoundedFont,
    fontSize: 11.5,
    color: Pastel.textMuted,
  },
  chatImage: {
    width: 210,
    height: 165,
    borderRadius: 10,
  },
  stickerMsg: {
    fontSize: 40,
    textAlign: 'center',
    paddingVertical: 2,
  },
  msgText: {
    fontFamily: RoundedFont,
    fontSize: 14.5,
    color: Pastel.text,
    lineHeight: 20,
  },
  msgTextMine: {
    color: Pastel.pureWhite,
  },
  bubbleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 1,
  },
  quickReplyIcon: {
    marginRight: 4,
    opacity: 0.72,
  },
  timeText: {
    fontFamily: MonoFont,
    fontSize: 10,
    color: Pastel.textSoft,
  },
  timeTextMine: {
    color: 'rgba(255,255,255,0.82)',
  },
  reactionBadge: {
    position: 'absolute',
    bottom: -10,
    backgroundColor: Pastel.bgElevated,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: Pastel.borderStrong,
  },
  reactionEmoji: {
    fontSize: 12,
  },
  composerOuter: {
    backgroundColor: Pastel.bgElevated,
    borderTopWidth: 1,
    borderTopColor: Pastel.borderStrong,
    paddingHorizontal: 10,
    paddingTop: 9,
    gap: 8,
  },
  replyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Pastel.bg,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: Pastel.borderStrong,
  },
  replyStripe: {
    width: 3,
    height: '100%',
    borderRadius: 2,
    backgroundColor: Pastel.coral,
  },
  replyBannerAuthor: {
    fontFamily: BodyFontBold,
    fontSize: 11.5,
    color: Pastel.coralDark,
  },
  replyBannerPreview: {
    fontFamily: RoundedFont,
    fontSize: 12,
    color: Pastel.textMuted,
  },
  replyClose: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: Pastel.bgMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stickerTray: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 4,
    justifyContent: 'center',
  },
  stickerItem: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: Pastel.bg,
    borderWidth: 1,
    borderColor: Pastel.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stickerEmoji: {
    fontSize: 21,
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  mediaBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Pastel.bg,
    borderWidth: 1,
    borderColor: Pastel.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaBtnActive: {
    backgroundColor: Pastel.coralSoft,
    borderColor: Pastel.coral,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 110,
    backgroundColor: Pastel.bg,
    borderWidth: 1,
    borderColor: Pastel.borderStrong,
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 9,
    fontFamily: RoundedFont,
    fontSize: 14,
    color: Pastel.text,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: Pastel.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionOverlay: {
    flex: 1,
    backgroundColor: 'rgba(31, 27, 24, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  actionSheet: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: Pastel.bgElevated,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Pastel.borderStrong,
    gap: 10,
  },
  emojiBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Pastel.border,
  },
  emojiChoice: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Pastel.bg,
    borderWidth: 1,
    borderColor: Pastel.border,
  },
  emojiChoiceActive: {
    backgroundColor: Pastel.coralSoft,
    borderColor: Pastel.coral,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    paddingHorizontal: 6,
  },
  actionRowText: {
    fontFamily: BodyFontSemi,
    fontSize: 14,
    color: Pastel.text,
  },
});
