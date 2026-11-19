import {
  CheckCircle2,
  Cloud,
  CloudOff,
  RefreshCw,
  Smartphone,
  Sparkles,
  X,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { BouncyPressable } from '@/components/BouncyPressable';
import { KeyboardModalSheet } from '@/components/KeyboardModalSheet';
import { Pastel, RoundedFont } from '@/constants/pastelTheme';
import { useCoupleStore } from '@/store/useCoupleStore';
import type { PartnerId } from '@/types/couple';
import { triggerMediumHaptic, triggerSuccessHaptic } from '@/utils/haptics';

interface LiveSyncModalProps {
  visible: boolean;
  onClose: () => void;
}

function generateRoomCode(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `MOCHI-${num}`;
}

export const LiveSyncModal = React.memo(function LiveSyncModal({
  visible,
  onClose,
}: LiveSyncModalProps) {
  const syncConfig = useCoupleStore((s) => s.syncConfig);
  const syncStatus = useCoupleStore((s) => s.syncStatus);
  const syncError = useCoupleStore((s) => s.syncError);
  const activePartnerId = useCoupleStore((s) => s.activePartnerId);
  const p1Name = useCoupleStore((s) => s.partners.p1.name);
  const p2Name = useCoupleStore((s) => s.partners.p2.name);

  const connectLiveSync = useCoupleStore((s) => s.connectLiveSync);
  const disconnectLiveSync = useCoupleStore((s) => s.disconnectLiveSync);

  const [role, setRole] = useState<PartnerId>(activePartnerId);
  const [roomCode, setRoomCode] = useState(syncConfig.roomCode || 'MOCHI-2026');
  const [supabaseUrl, setSupabaseUrl] = useState(syncConfig.supabaseUrl);
  const [anonKey, setAnonKey] = useState(syncConfig.supabaseAnonKey);
  const [localMsg, setLocalMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      setRole(activePartnerId);
      setRoomCode(syncConfig.roomCode || 'MOCHI-2026');
      setSupabaseUrl(syncConfig.supabaseUrl);
      setAnonKey(syncConfig.supabaseAnonKey);
      setLocalMsg(null);
    }
  }, [
    activePartnerId,
    syncConfig.roomCode,
    syncConfig.supabaseAnonKey,
    syncConfig.supabaseUrl,
    visible,
  ]);

  const handleGenerateCode = useCallback(() => {
    triggerMediumHaptic();
    setRoomCode(generateRoomCode());
  }, []);

  const handleConnect = useCallback(async () => {
    setLocalMsg(null);
    if (!supabaseUrl.trim() || !anonKey.trim() || !roomCode.trim()) {
      setLocalMsg('Isi Supabase URL, Anon Key, dan Kode Pasangan dulu ya.');
      return;
    }

    setLoading(true);
    const res = await connectLiveSync(
      {
        supabaseUrl,
        supabaseAnonKey: anonKey,
        roomCode,
      },
      role
    );
    setLoading(false);

    if (res.ok) {
      triggerSuccessHaptic();
      setLocalMsg(
        res.created
          ? `Room ${roomCode.trim().toUpperCase()} dibuat & tersinkron! Bagikan kode & key ini ke HP pasanganmu.`
          : `Berhasil gabung ke room ${roomCode.trim().toUpperCase()}! Semua fitur sudah live.`
      );
    } else {
      setLocalMsg(res.error ?? 'Gagal menyambungkan. Cek URL/Key & pastikan schema SQL sudah dijalankan.');
    }
  }, [anonKey, connectLiveSync, role, roomCode, supabaseUrl]);

  const handleDisconnect = useCallback(() => {
    triggerMediumHaptic();
    disconnectLiveSync();
    setLocalMsg('Mode sinkronisasi dimatikan (kembali ke penyimpanan lokal).');
  }, [disconnectLiveSync]);

  const isConnected = syncConfig.enabled && syncStatus === 'connected';

  return (
    <KeyboardModalSheet visible={visible} onRequestClose={onClose} maxHeightRatio={0.9}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Cloud size={20} color={Pastel.taro} />
          <Text style={styles.title}>Sinkronisasi Live 2 HP</Text>
        </View>
        <BouncyPressable onPress={onClose} style={styles.closeBtn}>
          <X size={18} color={Pastel.textMuted} />
        </BouncyPressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.body}>
            {/* Status Banner */}
            <View
              style={[
                styles.statusBanner,
                isConnected ? styles.statusConnected : styles.statusOffline,
              ]}>
              {isConnected ? (
                <CheckCircle2 size={16} color="#178C68" />
              ) : (
                <CloudOff size={16} color={Pastel.textMuted} />
              )}
              <Text
                style={[
                  styles.statusText,
                  isConnected && { color: '#178C68' },
                ]}>
                {isConnected
                  ? `Live Aktif • Room ${syncConfig.roomCode} (Semua fitur sinkron)`
                  : 'Belum terhubung (masih mode lokal 1 HP)'}
              </Text>
            </View>

            {/* Role Selector */}
            <Text style={styles.label}>HP ini dipakai sebagai siapa?</Text>
            <View style={styles.roleRow}>
              <BouncyPressable
                onPress={() => setRole('p1')}
                style={[styles.roleChip, role === 'p1' && styles.roleChipActive]}>
                <Smartphone size={14} color={role === 'p1' ? Pastel.coralDark : Pastel.textMuted} />
                <Text
                  style={[
                    styles.roleText,
                    role === 'p1' && { color: Pastel.coralDark, fontWeight: '800' },
                  ]}>
                  HP 1 ({p1Name})
                </Text>
              </BouncyPressable>

              <BouncyPressable
                onPress={() => setRole('p2')}
                style={[styles.roleChip, role === 'p2' && styles.roleChipActive]}>
                <Smartphone size={14} color={role === 'p2' ? Pastel.coralDark : Pastel.textMuted} />
                <Text
                  style={[
                    styles.roleText,
                    role === 'p2' && { color: Pastel.coralDark, fontWeight: '800' },
                  ]}>
                  HP 2 ({p2Name})
                </Text>
              </BouncyPressable>
            </View>

            {/* Room Code */}
            <Text style={styles.label}>Kode Pasangan (samakan di ke-2 HP)</Text>
            <View style={styles.codeRow}>
              <TextInput
                value={roomCode}
                onChangeText={(t) => setRoomCode(t.toUpperCase())}
                placeholder="MOCHI-2026"
                placeholderTextColor={Pastel.textSoft}
                autoCapitalize="characters"
                style={[styles.input, { flex: 1 }]}
              />
              <BouncyPressable onPress={handleGenerateCode} style={styles.genBtn}>
                <RefreshCw size={15} color={Pastel.text} />
                <Text style={styles.genBtnText}>Acak</Text>
              </BouncyPressable>
            </View>

            {/* Supabase Credentials */}
            <Text style={styles.label}>Supabase Project URL (Gratis)</Text>
            <TextInput
              value={supabaseUrl}
              onChangeText={setSupabaseUrl}
              placeholder="https://xxxx.supabase.co"
              placeholderTextColor={Pastel.textSoft}
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
            />

            <Text style={styles.label}>Supabase Anon Key</Text>
            <TextInput
              value={anonKey}
              onChangeText={setAnonKey}
              placeholder="eyJhbGciOi..."
              placeholderTextColor={Pastel.textSoft}
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
            />

            {localMsg || syncError ? (
              <Text style={styles.feedbackText}>{localMsg ?? syncError}</Text>
            ) : null}

            {/* Primary Actions */}
            <BouncyPressable
              onPress={handleConnect}
              disabled={loading}
              style={[styles.connectBtn, loading && { opacity: 0.7 }]}>
              {loading ? (
                <ActivityIndicator size="small" color={Pastel.pureWhite} />
              ) : (
                <Sparkles size={16} color={Pastel.pureWhite} />
              )}
              <Text style={styles.connectBtnText}>
                {loading
                  ? 'Menyambungkan...'
                  : isConnected
                  ? 'Perbarui Koneksi Live'
                  : 'Hubungkan & Sinkronkan Sekarang'}
              </Text>
            </BouncyPressable>

            {syncConfig.enabled ? (
              <BouncyPressable onPress={handleDisconnect} style={styles.disconnectBtn}>
                <Text style={styles.disconnectBtnText}>Putuskan Sinkronisasi</Text>
              </BouncyPressable>
            ) : null}

            {/* Quick Free Setup Guide */}
            <View style={styles.guideBox}>
              <Text style={styles.guideTitle}>Cara Setup Gratis (1x untuk berdua):</Text>
              <Text style={styles.guideStep}>
                1. Buat project gratis di supabase.com (paket Free selamanya).
              </Text>
              <Text style={styles.guideStep}>
                2. Buka SQL Editor di Supabase → jalankan isi file supabase/schema.sql.
              </Text>
              <Text style={styles.guideStep}>
                3. Copy Project URL &amp; Anon Key di Project Settings → API, lalu masukkan Kode Pasangan yang sama di HP 1 &amp; HP 2.
              </Text>
            </View>
          </ScrollView>
    </KeyboardModalSheet>
  );
});

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontFamily: RoundedFont,
    fontSize: 18,
    fontWeight: '700',
    color: Pastel.text,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: Pastel.bgMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    gap: 10,
    paddingBottom: 20,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 11,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusConnected: {
    backgroundColor: Pastel.matchaSoft,
    borderColor: Pastel.matcha + '44',
  },
  statusOffline: {
    backgroundColor: Pastel.bg,
    borderColor: Pastel.borderStrong,
  },
  statusText: {
    flex: 1,
    fontFamily: RoundedFont,
    fontSize: 12.5,
    fontWeight: '600',
    color: Pastel.textMuted,
  },
  label: {
    fontFamily: RoundedFont,
    fontSize: 12,
    fontWeight: '600',
    color: Pastel.textMuted,
    marginTop: 2,
  },
  roleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  roleChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Pastel.bg,
    borderWidth: 1,
    borderColor: Pastel.borderStrong,
    borderRadius: 12,
    paddingVertical: 10,
  },
  roleChipActive: {
    backgroundColor: Pastel.coralSoft,
    borderColor: Pastel.coral,
  },
  roleText: {
    fontFamily: RoundedFont,
    fontSize: 12.5,
    fontWeight: '600',
    color: Pastel.textMuted,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    backgroundColor: Pastel.bg,
    borderWidth: 1,
    borderColor: Pastel.borderStrong,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontFamily: RoundedFont,
    fontSize: 13.5,
    color: Pastel.text,
  },
  genBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Pastel.bgMuted,
    borderWidth: 1,
    borderColor: Pastel.borderStrong,
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderRadius: 12,
  },
  genBtnText: {
    fontFamily: RoundedFont,
    fontSize: 13,
    fontWeight: '700',
    color: Pastel.text,
  },
  feedbackText: {
    fontFamily: RoundedFont,
    fontSize: 12.5,
    fontWeight: '600',
    color: Pastel.coralDark,
    textAlign: 'center',
  },
  connectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: Pastel.text,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 4,
  },
  connectBtnText: {
    fontFamily: RoundedFont,
    fontSize: 14,
    fontWeight: '700',
    color: Pastel.pureWhite,
  },
  disconnectBtn: {
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Pastel.bg,
    borderWidth: 1,
    borderColor: Pastel.borderStrong,
  },
  disconnectBtnText: {
    fontFamily: RoundedFont,
    fontSize: 13,
    fontWeight: '600',
    color: Pastel.textMuted,
  },
  guideBox: {
    backgroundColor: Pastel.lemonSoft,
    borderRadius: 12,
    padding: 13,
    borderWidth: 1,
    borderColor: '#E3D5A9',
    gap: 4,
    marginTop: 4,
  },
  guideTitle: {
    fontFamily: RoundedFont,
    fontSize: 12.5,
    fontWeight: '700',
    color: '#8C621B',
  },
  guideStep: {
    fontFamily: RoundedFont,
    fontSize: 11.5,
    color: Pastel.text,
    lineHeight: 16.5,
  },
});
