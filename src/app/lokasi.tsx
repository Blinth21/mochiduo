import * as Location from 'expo-location';
import {
  ArrowLeftRight,
  ExternalLink,
  Eye,
  EyeOff,
  LocateFixed,
  Map as MapIcon,
  MapPin,
  Radar,
  Radio,
  ShieldCheck,
} from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BouncyPressable } from '@/components/BouncyPressable';
import { CoupleLocationMap } from '@/components/CoupleLocationMap';
import { CoupleLocationRadar } from '@/components/CoupleLocationRadar';
import { LiveSyncModal } from '@/components/LiveSyncModal';
import { Pastel, RoundedFont } from '@/constants/pastelTheme';
import { useCoupleStore } from '@/store/useCoupleStore';
import { formatRelativeTime } from '@/utils/dateCalc';
import { buildMapsUrl, formatDistanceId, getDistanceMeters } from '@/utils/geoCalc';
import { triggerMediumHaptic, triggerSuccessHaptic } from '@/utils/haptics';

const QUICK_SPOTS = [
  'Di Rumah 🏠',
  'Lagi di Jalan 🛵',
  'Kampus/Kantor 💼',
  'Ngopi ☕',
  'Belanja 🛍️',
];

async function resolveReadableArea(lat: number, lon: number): Promise<string> {
  try {
    const places = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
    const first = places[0];
    if (first) {
      const parts = [first.district || first.street || first.name, first.city || first.subregion]
        .filter(Boolean);
      if (parts.length > 0) return parts.join(', ');
    }
  } catch {
    // Web or offline reverse-geocode fallback
  }
  return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
}

export default function LokasiScreen() {
  const activePartnerId = useCoupleStore((s) => s.activePartnerId);
  const setActivePartner = useCoupleStore((s) => s.setActivePartner);
  const p1 = useCoupleStore((s) => s.partners.p1);
  const p2 = useCoupleStore((s) => s.partners.p2);
  const loc1 = useCoupleStore((s) => s.locations.p1);
  const loc2 = useCoupleStore((s) => s.locations.p2);
  const liveWatchEnabled = useCoupleStore((s) => s.liveWatchEnabled);
  const syncConfig = useCoupleStore((s) => s.syncConfig);
  const syncStatus = useCoupleStore((s) => s.syncStatus);

  const updatePartnerLocation = useCoupleStore((s) => s.updatePartnerLocation);
  const checkInSpot = useCoupleStore((s) => s.checkInSpot);
  const toggleLocationSharing = useCoupleStore((s) => s.toggleLocationSharing);
  const setLiveWatchEnabled = useCoupleStore((s) => s.setLiveWatchEnabled);

  const me = activePartnerId === 'p1' ? p1 : p2;
  const partner = activePartnerId === 'p1' ? p2 : p1;
  const myLoc = activePartnerId === 'p1' ? loc1 : loc2;
  const partnerLoc = activePartnerId === 'p1' ? loc2 : loc1;

  const [viewMode, setViewMode] = useState<'map' | 'radar'>('map');
  const [isLocating, setIsLocating] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [syncModalVisible, setSyncModalVisible] = useState(false);

  const handleSwitchPartner = useCallback(() => {
    setActivePartner(activePartnerId === 'p1' ? 'p2' : 'p1');
  }, [activePartnerId, setActivePartner]);

  const handleUpdateGpsNow = useCallback(async () => {
    setIsLocating(true);
    setFeedbackMsg(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setFeedbackMsg('Izin lokasi belum diizinkan. Aktifkan di pengaturan HP ya.');
        return;
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const areaName = await resolveReadableArea(
        pos.coords.latitude,
        pos.coords.longitude
      );

      updatePartnerLocation(activePartnerId, {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        areaName,
        accuracyMeters: pos.coords.accuracy ?? undefined,
      });
      triggerSuccessHaptic();
      setFeedbackMsg(`Lokasi ${me.name} diperbarui ke ${areaName}`);
    } catch {
      setFeedbackMsg('Gagal membaca GPS saat ini. Coba nyalakan GPS atau cek sinyal.');
    } finally {
      setIsLocating(false);
    }
  }, [activePartnerId, me.name, updatePartnerLocation]);

  const handleToggleLiveWatch = useCallback(
    async (enabled: boolean) => {
      if (enabled) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setFeedbackMsg('Izin lokasi ditolak. Aktifkan izin lokasi di Pengaturan HP.');
          setLiveWatchEnabled(false);
          return;
        }
        // Cycle false->true only if needed? No, if already false it becomes true and triggers watcher
      }
      setLiveWatchEnabled(enabled);
    },
    [setLiveWatchEnabled]
  );

  const handleOpenPartnerMaps = useCallback(() => {
    if (!partnerLoc.isSharing) return;
    triggerMediumHaptic();
    const url = buildMapsUrl(
      partnerLoc.latitude,
      partnerLoc.longitude,
      `${partner.name} (${partnerLoc.areaName})`
    );
    Linking.openURL(url).catch(() => {});
  }, [partner.name, partnerLoc.areaName, partnerLoc.isSharing, partnerLoc.latitude, partnerLoc.longitude]);

  const distanceText = formatDistanceId(
    getDistanceMeters(
      myLoc.latitude,
      myLoc.longitude,
      partnerLoc.latitude,
      partnerLoc.longitude
    )
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.centerColumn}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.pageTitle}>Maps & Radar Lokasi 📍</Text>
              <Text style={styles.pageSub}>
                {liveWatchEnabled && myLoc.isSharing
                  ? '🟢 GPS Real-Time aktif (update tiap 5 dtk / ≥10m)'
                  : 'Mode hemat / update manual'}
              </Text>
            </View>

            <BouncyPressable onPress={handleSwitchPartner} style={styles.switchPill}>
              <ArrowLeftRight size={14} color={Pastel.taro} />
              <Text style={styles.switchPillText}>{me.name}</Text>
            </BouncyPressable>
          </View>

          {/* View Mode Switcher: Peta Maps vs Radar Mochi */}
          <View style={styles.viewSwitchRow}>
            <BouncyPressable
              onPress={() => {
                triggerMediumHaptic();
                setViewMode('map');
              }}
              style={[
                styles.viewSwitchBtn,
                viewMode === 'map' && styles.viewSwitchBtnActive,
              ]}>
              <MapIcon
                size={15}
                color={viewMode === 'map' ? Pastel.white : Pastel.textMuted}
              />
              <Text
                style={[
                  styles.viewSwitchText,
                  viewMode === 'map' && styles.viewSwitchTextActive,
                ]}>
                Peta Maps
              </Text>
            </BouncyPressable>

            <BouncyPressable
              onPress={() => {
                triggerMediumHaptic();
                setViewMode('radar');
              }}
              style={[
                styles.viewSwitchBtn,
                viewMode === 'radar' && styles.viewSwitchBtnActive,
              ]}>
              <Radar
                size={15}
                color={viewMode === 'radar' ? Pastel.white : Pastel.textMuted}
              />
              <Text
                style={[
                  styles.viewSwitchText,
                  viewMode === 'radar' && styles.viewSwitchTextActive,
                ]}>
                Radar Mochi
              </Text>
            </BouncyPressable>
          </View>

          {/* Interactive Map or Radar Visualization */}
          {viewMode === 'map' ? (
            <CoupleLocationMap
              me={me}
              myLoc={myLoc}
              partner={partner}
              partnerLoc={partnerLoc}
            />
          ) : (
            <CoupleLocationRadar
              me={me}
              myLoc={myLoc}
              partner={partner}
              partnerLoc={partnerLoc}
            />
          )}

          {/* GPS Update & Controls Card */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Kontrol Lokasi {me.name}</Text>

            <BouncyPressable
              onPress={handleUpdateGpsNow}
              disabled={isLocating}
              style={[styles.gpsButton, isLocating && { opacity: 0.7 }]}>
              {isLocating ? (
                <ActivityIndicator size="small" color={Pastel.white} />
              ) : (
                <LocateFixed size={18} color={Pastel.white} />
              )}
              <Text style={styles.gpsButtonText}>
                {isLocating ? 'Mengambil GPS...' : 'Update Lokasi GPS Sekarang'}
              </Text>
            </BouncyPressable>

            {feedbackMsg ? (
              <Text style={styles.feedbackText}>{feedbackMsg}</Text>
            ) : null}

            {/* Quick Spot Check-in */}
            <Text style={styles.subLabel}>Check-in Cepat</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.spotScroll}>
              {QUICK_SPOTS.map((spot) => {
                const selected = myLoc.spotTag === spot;
                return (
                  <BouncyPressable
                    key={spot}
                    onPress={() => {
                      triggerMediumHaptic();
                      checkInSpot(activePartnerId, spot);
                    }}
                    style={[
                      styles.spotChip,
                      selected && styles.spotChipActive,
                    ]}>
                    <Text
                      style={[
                        styles.spotChipText,
                        selected && styles.spotChipTextActive,
                      ]}>
                      {spot}
                    </Text>
                  </BouncyPressable>
                );
              })}
            </ScrollView>

            {/* Toggles */}
            <View style={styles.toggleRow}>
              <View style={styles.toggleLeft}>
                <View style={[styles.toggleIcon, { backgroundColor: Pastel.matchaSoft }]}>
                  <Radio size={16} color={Pastel.matcha} />
                </View>
                <View style={styles.toggleCopy}>
                  <Text style={styles.toggleTitle}>GPS Real-Time Otomatis</Text>
                  <Text style={styles.toggleSub}>
                    Aktif di semua tab (update tiap 5 dtk / pindah ≥10m)
                  </Text>
                </View>
              </View>
              <Switch
                value={liveWatchEnabled}
                onValueChange={handleToggleLiveWatch}
                trackColor={{ false: Pastel.border, true: Pastel.matcha }}
                thumbColor={Pastel.white}
              />
            </View>

            <View style={styles.toggleRow}>
              <View style={styles.toggleLeft}>
                <View style={[styles.toggleIcon, { backgroundColor: Pastel.taroSoft }]}>
                  {myLoc.isSharing ? (
                    <Eye size={16} color={Pastel.taro} />
                  ) : (
                    <EyeOff size={16} color={Pastel.textMuted} />
                  )}
                </View>
                <View style={styles.toggleCopy}>
                  <Text style={styles.toggleTitle}>Bagikan Lokasiku</Text>
                  <Text style={styles.toggleSub}>
                    {myLoc.isSharing
                      ? `Terlihat oleh ${partner.name}`
                      : 'Disembunyikan (Mode Privasi)'}
                  </Text>
                </View>
              </View>
              <Switch
                value={myLoc.isSharing}
                onValueChange={() => toggleLocationSharing(activePartnerId)}
                trackColor={{ false: Pastel.border, true: Pastel.taro }}
                thumbColor={Pastel.white}
              />
            </View>
          </View>

          {/* Partner Location Card */}
          <View style={styles.partnerCard}>
            <View style={styles.partnerTop}>
              <View style={styles.partnerTitleWrap}>
                <MapPin size={17} color={Pastel.coralDark} />
                <Text style={styles.partnerTitle}>Posisi {partner.name}</Text>
              </View>
              <Text style={styles.partnerTime}>
                {formatRelativeTime(partnerLoc.updatedAt)}
              </Text>
            </View>

            {partnerLoc.isSharing ? (
              <>
                <Text style={styles.partnerArea}>{partnerLoc.areaName}</Text>
                <Text style={styles.partnerMeta}>
                  {partnerLoc.spotTag ? `${partnerLoc.spotTag} • ` : ''}
                  Jarak {distanceText} • Koordinat {partnerLoc.latitude.toFixed(4)},{' '}
                  {partnerLoc.longitude.toFixed(4)}
                </Text>

                <BouncyPressable
                  onPress={handleOpenPartnerMaps}
                  style={styles.mapsButton}>
                  <ExternalLink size={15} color="#1B82D6" />
                  <Text style={styles.mapsButtonText}>
                    Buka Lokasi {partner.name} di Maps
                  </Text>
                </BouncyPressable>
              </>
            ) : (
              <Text style={styles.partnerHidden}>
                {partner.name} sedang mengaktifkan Mode Privasi 🙈
              </Text>
            )}
          </View>

          {/* Sync Status & Setup Trigger */}
          <BouncyPressable
            onPress={() => setSyncModalVisible(true)}
            style={styles.infoBanner}>
            <ShieldCheck size={16} color="#199E74" />
            <Text style={styles.infoBannerText}>
              {syncConfig.enabled && syncStatus === 'connected'
                ? `GPS Real-Time & Live Sync 2 HP aktif (Room ${syncConfig.roomCode}). Posisi otomatis terkirim ke HP pasangan setiap pindah ≥10m di semua tab.`
                : 'GPS Real-Time aktif lokal. Tap di sini untuk hubungkan Live Sync Gratis antar 2 HP supaya posisi langsung muncul di HP pasangan!'}
            </Text>
          </BouncyPressable>
        </View>
      </ScrollView>

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
    backgroundColor: Pastel.bg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 112,
    alignItems: 'center',
  },
  centerColumn: {
    width: '100%',
    maxWidth: 520,
    gap: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  pageTitle: {
    fontFamily: RoundedFont,
    fontSize: 22,
    fontWeight: '800',
    color: Pastel.text,
  },
  pageSub: {
    fontFamily: RoundedFont,
    fontSize: 12.5,
    fontWeight: '600',
    color: Pastel.textMuted,
  },
  viewSwitchRow: {
    flexDirection: 'row',
    backgroundColor: Pastel.white,
    borderRadius: 18,
    padding: 4,
    borderWidth: 2,
    borderColor: Pastel.border,
    gap: 6,
  },
  viewSwitchBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 13,
  },
  viewSwitchBtnActive: {
    backgroundColor: Pastel.sky,
  },
  viewSwitchText: {
    fontFamily: RoundedFont,
    fontSize: 13,
    fontWeight: '700',
    color: Pastel.textMuted,
  },
  viewSwitchTextActive: {
    color: Pastel.white,
    fontWeight: '800',
  },
  switchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Pastel.taroSoft,
    borderWidth: 1.5,
    borderColor: '#D6CCFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  switchPillText: {
    fontFamily: RoundedFont,
    fontSize: 12.5,
    fontWeight: '700',
    color: '#5B43D6',
  },
  card: {
    backgroundColor: Pastel.white,
    borderRadius: 26,
    padding: 16,
    borderWidth: 2,
    borderColor: Pastel.border,
    gap: 12,
  },
  sectionTitle: {
    fontFamily: RoundedFont,
    fontSize: 16,
    fontWeight: '800',
    color: Pastel.text,
  },
  gpsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Pastel.sky,
    paddingVertical: 13,
    borderRadius: 18,
    shadowColor: Pastel.sky,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  gpsButtonText: {
    fontFamily: RoundedFont,
    fontSize: 14,
    fontWeight: '800',
    color: Pastel.white,
  },
  feedbackText: {
    fontFamily: RoundedFont,
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1B82D6',
    textAlign: 'center',
  },
  subLabel: {
    fontFamily: RoundedFont,
    fontSize: 12.5,
    fontWeight: '700',
    color: Pastel.textMuted,
    marginTop: 2,
  },
  spotScroll: {
    gap: 8,
  },
  spotChip: {
    backgroundColor: Pastel.bg,
    borderWidth: 1.5,
    borderColor: Pastel.border,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  spotChipActive: {
    backgroundColor: Pastel.matchaSoft,
    borderColor: Pastel.matcha,
  },
  spotChipText: {
    fontFamily: RoundedFont,
    fontSize: 12.5,
    fontWeight: '600',
    color: Pastel.textMuted,
  },
  spotChipTextActive: {
    color: '#178C68',
    fontWeight: '800',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingTop: 4,
  },
  toggleLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  toggleIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleCopy: {
    flex: 1,
  },
  toggleTitle: {
    fontFamily: RoundedFont,
    fontSize: 13.5,
    fontWeight: '700',
    color: Pastel.text,
  },
  toggleSub: {
    fontFamily: RoundedFont,
    fontSize: 11.5,
    fontWeight: '500',
    color: Pastel.textMuted,
  },
  partnerCard: {
    backgroundColor: Pastel.coralSoft,
    borderRadius: 24,
    padding: 16,
    borderWidth: 2,
    borderColor: '#FFC7D6',
    gap: 8,
  },
  partnerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  partnerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  partnerTitle: {
    fontFamily: RoundedFont,
    fontSize: 15,
    fontWeight: '800',
    color: Pastel.coralDark,
  },
  partnerTime: {
    fontFamily: RoundedFont,
    fontSize: 11.5,
    fontWeight: '700',
    color: Pastel.textMuted,
  },
  partnerArea: {
    fontFamily: RoundedFont,
    fontSize: 17,
    fontWeight: '800',
    color: Pastel.text,
  },
  partnerMeta: {
    fontFamily: RoundedFont,
    fontSize: 12.5,
    fontWeight: '600',
    color: Pastel.textMuted,
  },
  mapsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Pastel.white,
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#C5E4FF',
    marginTop: 4,
  },
  mapsButtonText: {
    fontFamily: RoundedFont,
    fontSize: 13,
    fontWeight: '800',
    color: '#1B82D6',
  },
  partnerHidden: {
    fontFamily: RoundedFont,
    fontSize: 13.5,
    fontWeight: '600',
    color: Pastel.textMuted,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: Pastel.matchaSoft,
    borderRadius: 18,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#B5EED9',
  },
  infoBannerText: {
    flex: 1,
    fontFamily: RoundedFont,
    fontSize: 11.5,
    fontWeight: '600',
    color: '#167E5D',
    lineHeight: 16.5,
  },
});
