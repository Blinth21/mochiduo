import { useRouter } from 'expo-router';
import { Bell, BellRing, CheckCheck, Trash2, X } from 'lucide-react-native';
import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { BouncyPressable } from '@/components/BouncyPressable';
import { KeyboardModalSheet } from '@/components/KeyboardModalSheet';
import {
  BodyFontBold,
  BodyFontSemi,
  Pastel,
  RoundedFont,
} from '@/constants/pastelTheme';
import { ensureNotificationPermissions } from '@/services/notifications';
import { useCoupleStore } from '@/store/useCoupleStore';
import type { NotificationPrefs } from '@/types/couple';
import { formatRelativeTime } from '@/utils/dateCalc';
import { triggerSuccessHaptic } from '@/utils/haptics';

interface NotificationCenterModalProps {
  visible: boolean;
  onClose: () => void;
}

const PREF_ITEMS: {
  key: keyof Omit<NotificationPrefs, 'enabled'>;
  label: string;
  sub: string;
  emoji: string;
}[] = [
  { key: 'chat', label: 'Chat Pasangan', sub: 'Pesan masuk ala WA', emoji: '💬' },
  { key: 'hugAndMood', label: 'Peluk & Update Mood', sub: 'Pelukan & perubahan kabar', emoji: '🫂' },
  { key: 'location', label: 'Radar & Maps Lokasi', sub: 'Check-in spot & jarak dekat', emoji: '📍' },
  { key: 'notes', label: 'Papan Love Notes', sub: 'Catatan baru & reaksi emoji', emoji: '💌' },
  { key: 'memories', label: 'Jurnal Kenangan', sub: 'Momen foto baru', emoji: '📸' },
  { key: 'dates', label: 'Kencan & Bucket List', sub: 'Rencana baru & misi selesai', emoji: '🎡' },
  { key: 'play', label: 'MochiPlay, Q&A & Kado', sub: 'Jawaban Q&A, hadiah skin & mini-game', emoji: '🎮' },
  { key: 'anniversary', label: 'Pengingat Anniversary', sub: 'Hari jadian & milestone 100 hari', emoji: '🎉' },
];

export const NotificationCenterModal = React.memo(function NotificationCenterModal({
  visible,
  onClose,
}: NotificationCenterModalProps) {
  const router = useRouter();
  const notifPrefs = useCoupleStore((s) => s.notifPrefs);
  const notifications = useCoupleStore((s) => s.notifications);
  const updateNotifPrefs = useCoupleStore((s) => s.updateNotifPrefs);
  const markAllNotificationsRead = useCoupleStore((s) => s.markAllNotificationsRead);
  const clearNotifications = useCoupleStore((s) => s.clearNotifications);
  const pushFeatureNotification = useCoupleStore((s) => s.pushFeatureNotification);

  const handleTestNotification = useCallback(async () => {
    const granted = await ensureNotificationPermissions();
    triggerSuccessHaptic();
    pushFeatureNotification({
      category: 'hug',
      emoji: '🔔',
      title: granted ? 'Notifikasi MochiDuo Aktif!' : 'Izin Notifikasi Belum Aktif',
      body: granted
        ? 'Semua notifikasi fitur (Chat, Lokasi, Peluk, Catatan, Kenangan, Kencan) siap jalan 💕'
        : 'Aktifkan izin notifikasi di pengaturan HP supaya muncul di bar Android.',
      route: '/',
      systemAlert: granted,
    });
  }, [pushFeatureNotification]);

  return (
    <KeyboardModalSheet visible={visible} onRequestClose={onClose} maxHeightRatio={0.88}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.titleIcon}>
            <Bell size={17} color={Pastel.coralDark} />
          </View>
          <Text style={styles.title}>Pusat Notifikasi</Text>
        </View>
        <BouncyPressable onPress={onClose} style={styles.closeBtn}>
          <X size={18} color={Pastel.textMuted} />
        </BouncyPressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
        <View style={styles.masterCard}>
          <View style={styles.masterRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.masterTitle}>Notifikasi Semua Fitur</Text>
              <Text style={styles.masterSub}>
                Muncul di HP &amp; banner atas saat ada aktivitas pasangan
              </Text>
            </View>
            <Switch
              value={notifPrefs.enabled}
              onValueChange={(v) => updateNotifPrefs({ enabled: v })}
              trackColor={{ false: Pastel.borderStrong, true: Pastel.coral }}
              thumbColor={Pastel.pureWhite}
            />
          </View>

          <BouncyPressable onPress={handleTestNotification} style={styles.testBtn}>
            <BellRing size={15} color={Pastel.pureWhite} />
            <Text style={styles.testBtnText}>Tes Notifikasi Sekarang</Text>
          </BouncyPressable>
        </View>

        <Text style={styles.sectionTitle}>Notifikasi per Fitur</Text>
        <View style={styles.prefsBox}>
          {PREF_ITEMS.map((item, idx) => (
            <View
              key={item.key}
              style={[
                styles.prefRow,
                idx === PREF_ITEMS.length - 1 && { borderBottomWidth: 0 },
              ]}>
              <Text style={styles.prefEmoji}>{item.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.prefLabel}>{item.label}</Text>
                <Text style={styles.prefSub}>{item.sub}</Text>
              </View>
              <Switch
                value={notifPrefs.enabled && notifPrefs[item.key]}
                disabled={!notifPrefs.enabled}
                onValueChange={(v) => updateNotifPrefs({ [item.key]: v })}
                trackColor={{ false: Pastel.borderStrong, true: Pastel.matcha }}
                thumbColor={Pastel.pureWhite}
              />
            </View>
          ))}
        </View>

        <View style={styles.historyHeader}>
          <Text style={styles.sectionTitle}>Riwayat Terbaru</Text>
          {notifications.length > 0 ? (
            <View style={styles.historyActions}>
              <BouncyPressable onPress={markAllNotificationsRead} style={styles.smallAction}>
                <CheckCheck size={13} color={Pastel.matcha} />
                <Text style={styles.smallActionText}>Dibaca</Text>
              </BouncyPressable>
              <BouncyPressable onPress={clearNotifications} style={styles.smallAction}>
                <Trash2 size={13} color={Pastel.textMuted} />
              </BouncyPressable>
            </View>
          ) : null}
        </View>

        {notifications.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>
              Belum ada notifikasi masuk. Saat pasangan kirim chat, peluk, atau update lokasi, notifnya muncul di sini!
            </Text>
          </View>
        ) : (
          <View style={styles.historyList}>
            {notifications.map((n) => (
              <BouncyPressable
                key={n.id}
                onPress={() => {
                  onClose();
                  if (n.route) router.push(n.route as any);
                }}
                style={[styles.historyItem, !n.read && styles.historyItemUnread]}>
                <Text style={styles.historyEmoji}>{n.emoji}</Text>
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={styles.historyTop}>
                    <Text style={styles.historyTitle} numberOfLines={1}>
                      {n.title}
                    </Text>
                    <Text style={styles.historyTime}>{formatRelativeTime(n.createdAt)}</Text>
                  </View>
                  <Text style={styles.historyBody} numberOfLines={2}>
                    {n.body}
                  </Text>
                </View>
              </BouncyPressable>
            ))}
          </View>
        )}
      </ScrollView>
    </KeyboardModalSheet>
  );
});

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  titleIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Pastel.coralSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: BodyFontBold,
    fontSize: 18,
    lineHeight: 25,
    color: Pastel.text,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Pastel.bgMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    gap: 12,
    paddingBottom: 18,
  },
  masterCard: {
    backgroundColor: Pastel.coralSoft,
    borderRadius: 20,
    padding: 15,
    gap: 12,
  },
  masterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  masterTitle: {
    fontFamily: BodyFontBold,
    fontSize: 14.5,
    lineHeight: 20,
    color: Pastel.text,
  },
  masterSub: {
    fontFamily: RoundedFont,
    fontSize: 12,
    lineHeight: 17,
    color: Pastel.textMuted,
  },
  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: Pastel.coral,
    paddingVertical: 11,
    borderRadius: 999,
  },
  testBtnText: {
    fontFamily: BodyFontBold,
    fontSize: 13.5,
    lineHeight: 19,
    color: Pastel.pureWhite,
  },
  sectionTitle: {
    fontFamily: BodyFontBold,
    fontSize: 14,
    lineHeight: 20,
    color: Pastel.text,
  },
  prefsBox: {
    backgroundColor: Pastel.bg,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Pastel.border,
  },
  prefEmoji: {
    fontSize: 18,
  },
  prefLabel: {
    fontFamily: BodyFontSemi,
    fontSize: 13.5,
    lineHeight: 19,
    color: Pastel.text,
  },
  prefSub: {
    fontFamily: RoundedFont,
    fontSize: 11.5,
    lineHeight: 16,
    color: Pastel.textMuted,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  historyActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  smallAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Pastel.bgMuted,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
  },
  smallActionText: {
    fontFamily: BodyFontSemi,
    fontSize: 11.5,
    lineHeight: 16,
    color: Pastel.matcha,
  },
  emptyBox: {
    backgroundColor: Pastel.bg,
    borderRadius: 18,
    padding: 18,
  },
  emptyText: {
    fontFamily: RoundedFont,
    fontSize: 12.5,
    lineHeight: 19,
    color: Pastel.textMuted,
    textAlign: 'center',
  },
  historyList: {
    gap: 8,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: Pastel.bg,
    borderRadius: 16,
    padding: 12,
  },
  historyItemUnread: {
    backgroundColor: Pastel.coralSoft,
  },
  historyEmoji: {
    fontSize: 18,
    marginTop: 2,
  },
  historyTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  historyTitle: {
    flex: 1,
    fontFamily: BodyFontBold,
    fontSize: 13,
    lineHeight: 18,
    color: Pastel.text,
  },
  historyTime: {
    fontFamily: RoundedFont,
    fontSize: 11,
    lineHeight: 15,
    color: Pastel.textMuted,
  },
  historyBody: {
    fontFamily: RoundedFont,
    fontSize: 12.5,
    lineHeight: 17,
    color: Pastel.textMuted,
  },
});
