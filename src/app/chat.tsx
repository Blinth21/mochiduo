import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { useFocusEffect } from 'expo-router';
import {
  ArrowLeftRight,
  Camera,
  Check,
  CheckCheck,
  Cloud,
  ImagePlus,
  Maximize2,
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
  type PhotoLightboxData,
  PhotoLightboxModal,
} from '@/components/PhotoLightboxModal';
import {
  BodyFontBold,
  BodyFontRegular,
  BodyFontSemi,
  Pastel,
  RoundedFont,
  SoftShadow,
  SoftShadowSm,
} from '@/constants/pastelTheme';
import { broadcastTyping } from '@/services/coupleSync';
import { useCoupleStore } from '@/store/useCoupleStore';
import type { ChatMessage, PartnerId } from '@/types/couple';
import { formatRelativeTime } from '@/utils/dateCalc';
import { triggerLightHaptic, triggerMediumHaptic, triggerSuccessHaptic } from '@/utils/haptics';
import { pickImageFromGallery, takePhotoWithCamera } from '@/utils/mediaPicker';

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
  onImagePress: (msg: ChatMessage, senderName: string) => void;
}

const MessageBubble = React.memo(function MessageBubble({
  msg,
  isMine,
  senderName,
  p1Name,
  p2Name,
  onLongPress,
  onReplyTap,
  onImagePress,
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
          isMine ? styles.bubbleMine : [styles.bubblePartner, SoftShadowSm],
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
              style={[styles.replyQuoteText, isMine && { color: 'rgba(255,255,255,0.86)' }]}
              numberOfLines={2}>
              {msg.replyToPreview}
            </Text>
          </View>
        ) : null}

        {/* Tappable Photo attachment -> Fullscreen Lightbox */}
        {msg.imageUri ? (
          <Pressable
            onPress={() => onImagePress(msg, senderName)}
            onLongPress={() => onLongPress(msg)}
            delayLongPress={240}
            style={styles.chatImageTap}>
            <Image
              source={{ uri: msg.imageUri }}
              style={styles.chatImage}
              contentFit="cover"
              cachePolicy="memory-disk"
              recyclingKey={msg.id}
            />
            <View style={styles.imageExpandPill} pointerEvents="none">
              <Maximize2 size={11} color={Pastel.pureWhite} />
            </View>
          </Pressable>
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
            <Reply size={12} color={isMine ? 'rgba(255,255,255,0.82)' : Pastel.textSoft} />
          </BouncyPressable>
          <Text style={[styles.timeText, isMine && styles.timeTextMine]}>
            {formatTimeHHMM(msg.createdAt)}
          </Text>
          {isMine ? (
            msg.status === 'sent' ? (
              <Check size={13} color="rgba(255,255,255,0.82)" />
            ) : (
              <CheckCheck
                size={13}
                color={msg.status === 'read' ? '#C4FFF0' : 'rgba(255,255,255,0.88)'}
              />
            )
          ) : null}
        </View>

        {/* Reaction badge */}
        {msg.reaction ? (
          <View
            style={[
              styles.reactionBadge,
              SoftShadowSm,
              isMine ? { left: 10 } : { right: 10 },
            ]}>
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
  const prevMsgCountRef = useRef(0);
  const hasInitialScrolledRef = useRef(false);

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
  const updatePartnerAvatar = useCoupleStore((s) => s.updatePartnerAvatar);

  const partnerId: PartnerId = activePartnerId === 'p1' ? 'p2' : 'p1';
  const me = activePartnerId === 'p1' ? p1 : p2;
  const partner = activePartnerId === 'p1' ? p2 : p1;
  const isPartnerTyping = partnerTyping[partnerId];
  const isPartnerOnline = onlinePartners[partnerId];
  const isLive = syncConfig.enabled && syncStatus === 'connected';
  const partnerInitialBg = partnerId === 'p1' ? Pastel.coral : Pastel.matcha;
  const myInitialBg = activePartnerId === 'p1' ? Pastel.coral : Pastel.matcha;

  const [inputText, setInputText] = useState('');
  const [showStickers, setShowStickers] = useState(false);
  const [replyTarget, setReplyTarget] = useState<ChatMessage | null>(null);
  const [selectedMsg, setSelectedMsg] = useState<ChatMessage | null>(null);
  const [syncModalVisible, setSyncModalVisible] = useState(false);
  const [avatarSheetVisible, setAvatarSheetVisible] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<PhotoLightboxData | null>(null);
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

  // Smoothly scroll to bottom ONLY on initial load and when new messages arrive
  // (avoids 120Hz jank from firing scrollToEnd on every image decode / reaction resize)
  useEffect(() => {
    const count = chatMessages.length;
    if (count === 0) {
      prevMsgCountRef.current = 0;
      return;
    }
    if (!hasInitialScrolledRef.current) {
      hasInitialScrolledRef.current = true;
      prevMsgCountRef.current = count;
      const timer = setTimeout(() => {
        listRef.current?.scrollToEnd?.({ animated: false });
      }, 60);
      return () => clearTimeout(timer);
    }
    if (count > prevMsgCountRef.current) {
      const timer = setTimeout(() => {
        listRef.current?.scrollToEnd?.({ animated: true });
      }, 70);
      prevMsgCountRef.current = count;
      return () => clearTimeout(timer);
    }
    prevMsgCountRef.current = count;
  }, [chatMessages.length]);

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
    },
    [activePartnerId, replyTarget, sendChatMessage]
  );

  const sendPhotoUri = useCallback(
    (uri: string) => {
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
    },
    [activePartnerId, inputText, replyTarget, sendChatMessage]
  );

  const handlePickPhoto = useCallback(async () => {
    const uri = await pickImageFromGallery({ quality: 0.38 });
    if (uri) sendPhotoUri(uri);
  }, [sendPhotoUri]);

  const handleTakePhoto = useCallback(async () => {
    const uri = await takePhotoWithCamera({ quality: 0.38 });
    if (uri) sendPhotoUri(uri);
  }, [sendPhotoUri]);

  const handleChangeAvatar = useCallback(
    async (targetId: PartnerId, source: 'camera' | 'gallery') => {
      const uri =
        source === 'camera'
          ? await takePhotoWithCamera({ aspect: [1, 1], quality: 0.28 })
          : await pickImageFromGallery({ aspect: [1, 1], quality: 0.28 });
      if (!uri) return;
      triggerSuccessHaptic();
      updatePartnerAvatar(targetId, uri);
      setAvatarSheetVisible(false);
    },
    [updatePartnerAvatar]
  );

  const handleRemoveAvatar = useCallback(
    (targetId: PartnerId) => {
      triggerMediumHaptic();
      updatePartnerAvatar(targetId, undefined);
      setAvatarSheetVisible(false);
    },
    [updatePartnerAvatar]
  );

  const handleLongPressMsg = useCallback((msg: ChatMessage) => {
    triggerLightHaptic();
    setSelectedMsg(msg);
  }, []);

  const handleReplyTap = useCallback((msg: ChatMessage) => {
    triggerLightHaptic();
    setReplyTarget(msg);
  }, []);

  const handleImagePress = useCallback((msg: ChatMessage, senderName: string) => {
    if (!msg.imageUri) return;
    triggerLightHaptic();
    setLightboxPhoto({
      uri: msg.imageUri,
      title: `Foto dari ${senderName}`,
      subtitle: `${formatDateSeparator(msg.createdAt)} · ${formatTimeHHMM(msg.createdAt)}`,
      caption: msg.text || undefined,
    });
  }, []);

  const renderRow = useCallback(
    ({ item }: { item: ChatRow }) => {
      if (item.type === 'date') {
        return (
          <View style={styles.dateDividerWrap}>
            <View style={styles.dateDividerPill}>
              <Text style={styles.dateDividerText}>{item.label}</Text>
            </View>
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
          onImagePress={handleImagePress}
        />
      );
    },
    [activePartnerId, handleImagePress, handleLongPressMsg, handleReplyTap, p1.name, p2.name]
  );

  const bottomSpacer =
    keyboardHeight > 0
      ? keyboardHeight + 8
      : Math.max(insets.bottom, 10) + 76;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* Clean Pure-White Elevated Header */}
        <View style={[styles.header, SoftShadowSm]}>
          <View style={styles.partnerHead}>
            <BouncyPressable
              onPress={() => setAvatarSheetVisible(true)}
              style={[styles.avatar, { backgroundColor: partnerInitialBg }]}
              accessibilityLabel={`Atur foto profil ${partner.name}`}>
              {partner.avatarUri ? (
                <Image
                  source={{ uri: partner.avatarUri }}
                  style={styles.avatarImage}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
              ) : (
                <Text style={styles.avatarText}>
                  {partner.name.slice(0, 1).toUpperCase()}
                </Text>
              )}
              {isPartnerOnline ? (
                <View style={styles.onlineDot} />
              ) : (
                <View style={styles.avatarCamBadge}>
                  <Camera size={9} color={Pastel.text} />
                </View>
              )}
            </BouncyPressable>
            <View style={styles.partnerInfo}>
              <Text style={styles.partnerName} numberOfLines={1} maxFontSizeMultiplier={1.15}>
                {partner.name} · {partner.nickname}
              </Text>
              <Text
                style={[
                  styles.partnerSub,
                  isPartnerTyping && { color: Pastel.matcha, fontFamily: BodyFontBold },
                ]}
                numberOfLines={1}
                maxFontSizeMultiplier={1.15}>
                {isPartnerTyping
                  ? 'sedang mengetik...'
                  : isPartnerOnline
                    ? 'Online · Live 2 HP'
                    : isLive
                      ? `Aktif ${formatRelativeTime(partner.updatedAt)}`
                      : 'Tap foto untuk ganti profil'}
              </Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            <BouncyPressable
              onPress={() => setSyncModalVisible(true)}
              style={[styles.iconPill, isLive && styles.iconPillLive]}>
              <Cloud size={16} color={isLive ? Pastel.matcha : Pastel.textMuted} />
            </BouncyPressable>
            <BouncyPressable
              onPress={() => setActivePartner(activePartnerId === 'p1' ? 'p2' : 'p1')}
              style={styles.switchPill}>
              <ArrowLeftRight size={12} color={Pastel.coral} />
              <Text style={styles.switchText} numberOfLines={1} maxFontSizeMultiplier={1.15}>
                {me.name}
              </Text>
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
            drawDistance={450}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={styles.emptyChatCard}>
                <Text style={styles.emptyChatEmoji}>💬</Text>
                <Text style={styles.emptyChatTitle}>Belum ada chat di sini</Text>
                <Text style={styles.emptyChatSub}>
                  Kirim sapaan manis, stiker gemas, atau foto pertama ke {partner.name} lewat kolom di bawah!
                </Text>
              </View>
            }
          />
        </View>

        {/* Soft Elevated Composer Area */}
        <View style={[styles.composerOuter, SoftShadow, { paddingBottom: bottomSpacer }]}>
          {replyTarget ? (
            <View style={styles.replyBanner}>
              <View style={styles.replyStripe} />
              <View style={styles.replyBannerCopy}>
                <Text style={styles.replyBannerAuthor} numberOfLines={1}>
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
              style={[styles.mediaBtn, showStickers && styles.mediaBtnActive]}
              accessibilityLabel="Stiker">
              <Smile size={18} color={showStickers ? Pastel.coral : Pastel.textMuted} />
            </BouncyPressable>

            <BouncyPressable
              onPress={() => void handleTakePhoto()}
              style={styles.mediaBtn}
              accessibilityLabel="Buka Kamera">
              <Camera size={18} color={Pastel.textMuted} />
            </BouncyPressable>

            <BouncyPressable
              onPress={() => void handlePickPhoto()}
              style={styles.mediaBtn}
              accessibilityLabel="Pilih Foto Galeri">
              <ImagePlus size={18} color={Pastel.textMuted} />
            </BouncyPressable>

            <TextInput
              value={inputText}
              onChangeText={handleTextChange}
              placeholder={`Tulis pesan buat ${partner.name}...`}
              placeholderTextColor={Pastel.textSoft}
              style={styles.input}
              multiline
              maxLength={800}
            />

            <BouncyPressable
              onPress={handleSendText}
              disabled={!inputText.trim()}
              style={[styles.sendBtn, !inputText.trim() && { opacity: 0.45 }]}>
              <Send size={16} color={Pastel.pureWhite} />
            </BouncyPressable>
          </View>
        </View>
      </View>

      {/* Partner & Self Profile Photo Sheet */}
      <Modal
        visible={avatarSheetVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAvatarSheetVisible(false)}>
        <Pressable
          style={styles.actionOverlay}
          onPress={() => setAvatarSheetVisible(false)}>
          <Pressable style={[styles.profileSheet, SoftShadow]} onPress={() => {}}>
            <View style={styles.profileSheetTop}>
              <Text style={styles.profileSheetTitle}>Foto Profil Berdua</Text>
              <BouncyPressable
                onPress={() => setAvatarSheetVisible(false)}
                style={styles.profileSheetClose}>
                <X size={16} color={Pastel.textMuted} />
              </BouncyPressable>
            </View>

            {/* Partner Row */}
            <View style={styles.profileBlock}>
              <BouncyPressable
                onPress={() => {
                  if (partner.avatarUri) {
                    setAvatarSheetVisible(false);
                    setLightboxPhoto({
                      uri: partner.avatarUri,
                      title: partner.name,
                      subtitle: `Panggilan: ${partner.nickname}`,
                    });
                  }
                }}
                style={[styles.sheetAvatar, { backgroundColor: partnerInitialBg }]}>
                {partner.avatarUri ? (
                  <Image
                    source={{ uri: partner.avatarUri }}
                    style={styles.avatarImage}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />
                ) : (
                  <Text style={styles.sheetAvatarText}>
                    {partner.name.slice(0, 1).toUpperCase()}
                  </Text>
                )}
              </BouncyPressable>

              <View style={styles.profileBlockInfo}>
                <Text style={styles.profileBlockName}>{partner.name}</Text>
                <Text style={styles.profileBlockHint}>
                  {partner.avatarUri ? 'Tap foto untuk lihat penuh' : 'Belum ada foto profil'}
                </Text>
                <View style={styles.profileActionPills}>
                  <BouncyPressable
                    onPress={() => void handleChangeAvatar(partnerId, 'camera')}
                    style={styles.profilePillPrimary}>
                    <Camera size={13} color={Pastel.coralDark} />
                    <Text style={styles.profilePillPrimaryText}>Kamera</Text>
                  </BouncyPressable>
                  <BouncyPressable
                    onPress={() => void handleChangeAvatar(partnerId, 'gallery')}
                    style={styles.profilePillSoft}>
                    <ImagePlus size={13} color={Pastel.text} />
                    <Text style={styles.profilePillSoftText}>Galeri</Text>
                  </BouncyPressable>
                  {partner.avatarUri ? (
                    <BouncyPressable
                      onPress={() => handleRemoveAvatar(partnerId)}
                      style={styles.profilePillIcon}>
                      <Trash2 size={13} color={Pastel.coralDark} />
                    </BouncyPressable>
                  ) : null}
                </View>
              </View>
            </View>

            {/* Own Profile Row */}
            <View style={styles.profileBlock}>
              <BouncyPressable
                onPress={() => {
                  if (me.avatarUri) {
                    setAvatarSheetVisible(false);
                    setLightboxPhoto({
                      uri: me.avatarUri,
                      title: me.name,
                      subtitle: `Profil Kamu · ${me.nickname}`,
                    });
                  }
                }}
                style={[styles.sheetAvatar, { backgroundColor: myInitialBg }]}>
                {me.avatarUri ? (
                  <Image
                    source={{ uri: me.avatarUri }}
                    style={styles.avatarImage}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />
                ) : (
                  <Text style={styles.sheetAvatarText}>
                    {me.name.slice(0, 1).toUpperCase()}
                  </Text>
                )}
              </BouncyPressable>

              <View style={styles.profileBlockInfo}>
                <Text style={styles.profileBlockName}>{me.name} (Kamu)</Text>
                <Text style={styles.profileBlockHint}>
                  {me.avatarUri ? 'Tap foto untuk lihat penuh' : 'Belum ada foto profil'}
                </Text>
                <View style={styles.profileActionPills}>
                  <BouncyPressable
                    onPress={() => void handleChangeAvatar(activePartnerId, 'camera')}
                    style={styles.profilePillPrimary}>
                    <Camera size={13} color={Pastel.coralDark} />
                    <Text style={styles.profilePillPrimaryText}>Kamera</Text>
                  </BouncyPressable>
                  <BouncyPressable
                    onPress={() => void handleChangeAvatar(activePartnerId, 'gallery')}
                    style={styles.profilePillSoft}>
                    <ImagePlus size={13} color={Pastel.text} />
                    <Text style={styles.profilePillSoftText}>Galeri</Text>
                  </BouncyPressable>
                  {me.avatarUri ? (
                    <BouncyPressable
                      onPress={() => handleRemoveAvatar(activePartnerId)}
                      style={styles.profilePillIcon}>
                      <Trash2 size={13} color={Pastel.coralDark} />
                    </BouncyPressable>
                  ) : null}
                </View>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Long-Press Message Action Sheet */}
      <Modal
        visible={Boolean(selectedMsg)}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedMsg(null)}>
        <Pressable style={styles.actionOverlay} onPress={() => setSelectedMsg(null)}>
          {selectedMsg ? (
            <View style={[styles.actionSheet, SoftShadow]}>
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
                    <Text style={styles.emojiChoiceText}>{em}</Text>
                  </BouncyPressable>
                ))}
              </View>

              <BouncyPressable
                onPress={() => {
                  setReplyTarget(selectedMsg);
                  setSelectedMsg(null);
                }}
                style={styles.actionRow}>
                <Reply size={17} color={Pastel.text} />
                <Text style={styles.actionRowText}>Balas Pesan Ini</Text>
              </BouncyPressable>

              <BouncyPressable
                onPress={() => {
                  triggerMediumHaptic();
                  deleteChatMessage(selectedMsg.id);
                  setSelectedMsg(null);
                }}
                style={styles.actionRow}>
                <Trash2 size={17} color={Pastel.coralDark} />
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Pastel.bgElevated,
    zIndex: 2,
  },
  partnerHead: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
  },
  avatarText: {
    fontFamily: BodyFontBold,
    fontSize: 18,
    lineHeight: 24,
    color: Pastel.pureWhite,
  },
  avatarCamBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: Pastel.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineDot: {
    position: 'absolute',
    right: -1,
    bottom: -1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Pastel.matcha,
    borderWidth: 2,
    borderColor: Pastel.bgElevated,
  },
  partnerInfo: {
    flex: 1,
    flexShrink: 1,
  },
  partnerName: {
    fontFamily: BodyFontBold,
    fontSize: 15.5,
    lineHeight: 22,
    color: Pastel.text,
    paddingRight: 2,
  },
  partnerSub: {
    fontFamily: BodyFontRegular,
    fontSize: 12,
    lineHeight: 17,
    color: Pastel.textMuted,
    paddingRight: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  iconPill: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Pastel.bgMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPillLive: {
    backgroundColor: Pastel.matchaSoft,
  },
  switchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Pastel.bgMuted,
    paddingHorizontal: 10,
    height: 36,
    borderRadius: 999,
    flexShrink: 0,
  },
  switchText: {
    fontFamily: BodyFontBold,
    fontSize: 12.5,
    lineHeight: 18,
    color: Pastel.text,
    paddingRight: 2,
  },
  listWrap: {
    flex: 1,
    backgroundColor: Pastel.bg,
  },
  listContent: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  emptyChatCard: {
    marginTop: 44,
    marginHorizontal: 16,
    backgroundColor: Pastel.bgElevated,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  emptyChatEmoji: {
    fontSize: 34,
    lineHeight: 42,
  },
  emptyChatTitle: {
    fontFamily: BodyFontBold,
    fontSize: 16,
    lineHeight: 22,
    color: Pastel.text,
  },
  emptyChatSub: {
    fontFamily: RoundedFont,
    fontSize: 13,
    lineHeight: 19,
    color: Pastel.textMuted,
    textAlign: 'center',
  },
  dateDividerWrap: {
    alignItems: 'center',
    marginVertical: 12,
  },
  dateDividerPill: {
    backgroundColor: Pastel.bgMuted,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  dateDividerText: {
    fontFamily: BodyFontSemi,
    fontSize: 11.5,
    lineHeight: 16,
    color: Pastel.textMuted,
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
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 4,
    position: 'relative',
    marginBottom: 6,
  },
  bubbleMine: {
    backgroundColor: Pastel.coral,
    borderBottomRightRadius: 6,
  },
  bubblePartner: {
    backgroundColor: Pastel.bgElevated,
    borderBottomLeftRadius: 6,
  },
  replyQuote: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderLeftWidth: 3,
    marginBottom: 3,
  },
  replyQuoteMine: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderLeftColor: Pastel.pureWhite,
  },
  replyQuotePartner: {
    backgroundColor: Pastel.bg,
    borderLeftColor: Pastel.coral,
  },
  replyQuoteAuthor: {
    fontFamily: BodyFontBold,
    fontSize: 11.5,
    lineHeight: 16,
    color: Pastel.text,
  },
  replyQuoteText: {
    fontFamily: BodyFontRegular,
    fontSize: 12,
    lineHeight: 17,
    color: Pastel.textMuted,
  },
  chatImageTap: {
    position: 'relative',
    borderRadius: 14,
    overflow: 'hidden',
  },
  chatImage: {
    width: 215,
    height: 168,
    borderRadius: 14,
  },
  imageExpandPill: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(18, 20, 28, 0.56)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stickerMsg: {
    fontSize: 42,
    lineHeight: 50,
    textAlign: 'center',
    paddingVertical: 2,
  },
  msgText: {
    fontFamily: RoundedFont,
    fontSize: 14.5,
    lineHeight: 21,
    color: Pastel.text,
  },
  msgTextMine: {
    color: Pastel.pureWhite,
  },
  bubbleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 5,
    marginTop: 2,
  },
  quickReplyIcon: {
    marginRight: 4,
    opacity: 0.78,
  },
  timeText: {
    fontFamily: BodyFontRegular,
    fontSize: 10.5,
    lineHeight: 15,
    color: Pastel.textSoft,
  },
  timeTextMine: {
    color: 'rgba(255,255,255,0.84)',
  },
  reactionBadge: {
    position: 'absolute',
    bottom: -11,
    backgroundColor: Pastel.bgElevated,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  reactionEmoji: {
    fontSize: 13,
    lineHeight: 17,
  },
  composerOuter: {
    backgroundColor: Pastel.bgElevated,
    paddingHorizontal: 10,
    paddingTop: 10,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    gap: 8,
  },
  replyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: Pastel.bg,
    borderRadius: 14,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  replyStripe: {
    width: 3,
    height: '100%',
    borderRadius: 2,
    backgroundColor: Pastel.coral,
  },
  replyBannerCopy: {
    flex: 1,
  },
  replyBannerAuthor: {
    fontFamily: BodyFontBold,
    fontSize: 12,
    lineHeight: 17,
    color: Pastel.coralDark,
  },
  replyBannerPreview: {
    fontFamily: BodyFontRegular,
    fontSize: 12.5,
    lineHeight: 18,
    color: Pastel.textMuted,
  },
  replyClose: {
    width: 26,
    height: 26,
    borderRadius: 13,
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
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Pastel.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stickerEmoji: {
    fontSize: 22,
    lineHeight: 28,
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  mediaBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Pastel.bgMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaBtnActive: {
    backgroundColor: Pastel.coralSoft,
  },
  input: {
    flex: 1,
    minHeight: 38,
    maxHeight: 112,
    backgroundColor: Pastel.bgMuted,
    borderRadius: 19,
    paddingHorizontal: 14,
    paddingVertical: 9,
    fontFamily: RoundedFont,
    fontSize: 14.5,
    lineHeight: 20,
    color: Pastel.text,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Pastel.coral,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionOverlay: {
    flex: 1,
    backgroundColor: 'rgba(28, 30, 38, 0.36)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  profileSheet: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: Pastel.bgElevated,
    borderRadius: 26,
    padding: 18,
    gap: 14,
  },
  profileSheetTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  profileSheetTitle: {
    fontFamily: BodyFontBold,
    fontSize: 17,
    lineHeight: 24,
    color: Pastel.text,
  },
  profileSheetClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Pastel.bgMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Pastel.bg,
    borderRadius: 20,
    padding: 12,
  },
  sheetAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  sheetAvatarText: {
    fontFamily: BodyFontBold,
    fontSize: 22,
    lineHeight: 28,
    color: Pastel.pureWhite,
  },
  profileBlockInfo: {
    flex: 1,
    gap: 4,
  },
  profileBlockName: {
    fontFamily: BodyFontBold,
    fontSize: 14.5,
    lineHeight: 20,
    color: Pastel.text,
  },
  profileBlockHint: {
    fontFamily: BodyFontRegular,
    fontSize: 11.5,
    lineHeight: 16,
    color: Pastel.textMuted,
  },
  profileActionPills: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  profilePillPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Pastel.coralSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  profilePillPrimaryText: {
    fontFamily: BodyFontBold,
    fontSize: 12,
    lineHeight: 16,
    color: Pastel.coralDark,
  },
  profilePillSoft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Pastel.bgElevated,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  profilePillSoftText: {
    fontFamily: BodyFontSemi,
    fontSize: 12,
    lineHeight: 16,
    color: Pastel.text,
  },
  profilePillIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Pastel.coralSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionSheet: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: Pastel.bgElevated,
    borderRadius: 24,
    padding: 16,
    gap: 8,
  },
  emojiBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Pastel.border,
  },
  emojiChoice: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Pastel.bg,
  },
  emojiChoiceActive: {
    backgroundColor: Pastel.coralSoft,
  },
  emojiChoiceText: {
    fontSize: 21,
    lineHeight: 26,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  actionRowText: {
    fontFamily: BodyFontSemi,
    fontSize: 14.5,
    lineHeight: 20,
    color: Pastel.text,
  },
});
