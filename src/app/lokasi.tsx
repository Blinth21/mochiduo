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
import {
  BodyFontBold,
  BodyFontSemi,
  MonoFont,
  MonoFontBold,
  Pastel,
  RoundedFont,
  SerifFontSemi,
} from '@/constants/pastelTheme';
import { useCoupleStore } from '@/store/useCoupleStore';
import { formatRelativeTime } from '@/utils/dateCalc';
import { buildMapsUrl, formatDistanceId, getDistanceMeters } from '@/utils/geoCalc';
import { triggerMediumHaptic, triggerSuccessHaptic } from '@/utils/haptics';

const QUICK_SPOTS = [
  'Di Rumah',
  'Lagi di Jalan',
  'Kampus/Kantor',
  'Ngopi',
  'Belanja',
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
          {/* Editorial Header */}
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.pageTitle}>Peta & Radar Lokasi</Text>
              <View style={styles.statusSubRow}>
                <View
                  style={[
                    styles.statusSubDot,
                    {
                      backgroundColor:
                        liveWatchEnabled && myLoc.isSharing
                          ? Pastel.matcha
                          : Pastel.textSoft,
                    },
                  ]}
                />
                <Text style={styles.pageSub}>
                  {liveWatchEnabled && myLoc.isSharing
                    ? 'GPS REAL-TIME AKTIF • TIAP 5 DTK / 10M'
                    : 'MODE HEMAT • UPDATE MANUAL'}
                </Text>
              </View>
            </View>

            <BouncyPressable onPress={handleSwitchPartner} style={styles.switchPill}>
              <ArrowLeftRight size={13} color={Pastel.text} />
              <Text style={styles.switchPillText}>{me.name}</Text>
            </BouncyPressable>
          </View>

          {/* View Mode Switcher: Peta Maps vs Radar Kompas */}
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
                size={14}
                color={viewMode === 'map' ? Pastel.pureWhite : Pastel.textMuted}
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
                size={14}
                color={viewMode === 'radar' ? Pastel.pureWhite : Pastel.textMuted}
              />
              <Text
                style={[
                  styles.viewSwitchText,
                  viewMode === 'radar' && styles.viewSwitchTextActive,
                ]}>
                Radar Kompas
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
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Kontrol Lokasi {me.name}</Text>
              <Text style={styles.sectionMonoTag}>PERANGKAT SAYA</Text>
            </View>

            <BouncyPressable
              onPress={handleUpdateGpsNow}
              disabled={isLocating}
              style={[styles.gpsButton, isLocating && { opacity: 0.7 }]}>
              {isLocating ? (
                <ActivityIndicator size="small" color={Pastel.pureWhite} />
              ) : (
                <LocateFixed size={17} color={Pastel.pureWhite} />
              )}
              <Text style={styles.gpsButtonText}>
                {isLocating ? 'Mengambil GPS...' : 'Update Lokasi GPS Sekarang'}
              </Text>
            </BouncyPressable>

            {feedbackMsg ? (
              <Text style={styles.feedbackText}>{feedbackMsg}</Text>
            ) : null}

            {/* Quick Spot Check-in */}
            <Text style={styles.subLabel}>CHECK-IN CEPAT</Text>
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

            <View style={styles.hairline} />

            {/* Toggles */}
            <View style={styles.toggleRow}>
              <View style={styles.toggleLeft}>
                <View style={[styles.toggleIcon, { backgroundColor: Pastel.matchaSoft }]}>
                  <Radio size={15} color={Pastel.matcha} />
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
                trackColor={{ false: Pastel.borderStrong, true: Pastel.matcha }}
                thumbColor={Pastel.pureWhite}
              />
            </View>

            <View style={styles.hairline} />

            <View style={styles.toggleRow}>
              <View style={styles.toggleLeft}>
                <View style={[styles.toggleIcon, { backgroundColor: Pastel.taroSoft }]}>
                  {myLoc.isSharing ? (
                    <Eye size={15} color={Pastel.taro} />
                  ) : (
                    <EyeOff size={15} color={Pastel.textMuted} />
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
                trackColor={{ false: Pastel.borderStrong, true: Pastel.coral }}
                thumbColor={Pastel.pureWhite}
              />
            </View>
          </View>

          {/* Partner Location Card */}
          <View style={styles.partnerCard}>
            <View style={styles.partnerTop}>
              <View style={styles.partnerTitleWrap}>
                <MapPin size={15} color={Pastel.coralDark} />
                <Text style={styles.partnerTitle}>POSISI {partner.name.toUpperCase()}</Text>
              </View>
              <Text style={styles.partnerTime}>
                {formatRelativeTime(partnerLoc.updatedAt).toUpperCase()}
              </Text>
            </View>

            {partnerLoc.isSharing ? (
              <>
                <Text style={styles.partnerArea}>{partnerLoc.areaName}</Text>
                <Text style={styles.partnerMeta}>
                  {partnerLoc.spotTag ? `${partnerLoc.spotTag}  •  ` : ''}
                  {distanceText}  •  {partnerLoc.latitude.toFixed(4)},{' '}
                  {partnerLoc.longitude.toFixed(4)}
                </Text>

                <BouncyPressable
                  onPress={handleOpenPartnerMaps}
                  style={styles.mapsButton}>
                  <ExternalLink size={14} color={Pastel.text} />
                  <Text style={styles.mapsButtonText}>
                    Buka Lokasi {partner.name} di Google Maps
                  </Text>
                </BouncyPressable>
              </>
            ) : (
              <Text style={styles.partnerHidden}>
                {partner.name} sedang mengaktifkan Mode Privasi.
              </Text>
            )}
          </View>

          {/* Sync Status & Setup Trigger */}
          <BouncyPressable
            onPress={() => setSyncModalVisible(true)}
            style={styles.infoBanner}>
            <ShieldCheck size={16} color={Pastel.matcha} />
            <Text style={styles.infoBannerText}>
              {syncConfig.enabled && syncStatus === 'connected'
                ? `GPS Real-Time & Live Sync 2 HP aktif (Room ${syncConfig.roomCode}). Posisi otomatis terkirim ke HP pasangan setiap pindah ≥10m.`
                : 'GPS Real-Time aktif lokal. Tap di sini untuk hubungkan Live Sync antar 2 HP supaya posisi langsung muncul di HP pasangan.'}
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
    fontFamily: SerifFontSemi,
    fontSize: 25,
    color: Pastel.text,
  },
  statusSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  statusSubDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pageSub: {
    fontFamily: MonoFont,
    fontSize: 10,
    color: Pastel.textMuted,
    letterSpacing: 0.5,
  },
  viewSwitchRow: {
    flexDirection: 'row',
    backgroundColor: Pastel.bgMuted,
    borderRadius: 10,
    padding: 4,
    borderWidth: 1,
    borderColor: Pastel.borderStrong,
    gap: 4,
  },
  viewSwitchBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 7,
  },
  viewSwitchBtnActive: {
    backgroundColor: Pastel.text,
  },
  viewSwitchText: {
    fontFamily: BodyFontSemi,
    fontSize: 13,
    color: Pastel.textMuted,
  },
  viewSwitchTextActive: {
    fontFamily: BodyFontBold,
    color: Pastel.pureWhite,
  },
  switchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Pastel.bgElevated,
    borderWidth: 1,
    borderColor: Pastel.borderStrong,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 8,
  },
  switchPillText: {
    fontFamily: BodyFontSemi,
    fontSize: 12.5,
    color: Pastel.text,
  },
  card: {
    backgroundColor: Pastel.bgElevated,
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: Pastel.borderStrong,
    gap: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontFamily: SerifFontSemi,
    fontSize: 17,
    color: Pastel.text,
  },
  sectionMonoTag: {
    fontFamily: MonoFontBold,
    fontSize: 9.5,
    color: Pastel.textSoft,
    letterSpacing: 0.8,
  },
  gpsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Pastel.text,
    paddingVertical: 13,
    borderRadius: 10,
  },
  gpsButtonText: {
    fontFamily: BodyFontBold,
    fontSize: 13.5,
    color: Pastel.pureWhite,
  },
  feedbackText: {
    fontFamily: BodyFontSemi,
    fontSize: 12.5,
    color: Pastel.matcha,
    textAlign: 'center',
  },
  subLabel: {
    fontFamily: MonoFontBold,
    fontSize: 10,
    color: Pastel.textMuted,
    letterSpacing: 0.7,
    marginTop: 2,
  },
  spotScroll: {
    gap: 7,
  },
  spotChip: {
    backgroundColor: Pastel.bg,
    borderWidth: 1,
    borderColor: Pastel.borderStrong,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  spotChipActive: {
    backgroundColor: Pastel.matchaSoft,
    borderColor: Pastel.matcha,
  },
  spotChipText: {
    fontFamily: RoundedFont,
    fontSize: 12.5,
    color: Pastel.textMuted,
  },
  spotChipTextActive: {
    fontFamily: BodyFontBold,
    color: Pastel.matcha,
  },
  hairline: {
    height: 1,
    backgroundColor: Pastel.border,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
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
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Pastel.border,
  },
  toggleCopy: {
    flex: 1,
  },
  toggleTitle: {
    fontFamily: BodyFontSemi,
    fontSize: 13.5,
    color: Pastel.text,
  },
  toggleSub: {
    fontFamily: RoundedFont,
    fontSize: 11.5,
    color: Pastel.textMuted,
  },
  partnerCard: {
    backgroundColor: Pastel.coralSoft,
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: '#E5C3B9',
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
    fontFamily: MonoFontBold,
    fontSize: 10.5,
    color: Pastel.coralDark,
    letterSpacing: 0.7,
  },
  partnerTime: {
    fontFamily: MonoFont,
    fontSize: 10,
    color: Pastel.textMuted,
  },
  partnerArea: {
    fontFamily: SerifFontSemi,
    fontSize: 19,
    color: Pastel.text,
  },
  partnerMeta: {
    fontFamily: MonoFont,
    fontSize: 11.5,
    color: Pastel.textMuted,
    lineHeight: 17,
  },
  mapsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: Pastel.bgElevated,
    paddingVertical: 11,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Pastel.borderStrong,
    marginTop: 4,
  },
  mapsButtonText: {
    fontFamily: BodyFontSemi,
    fontSize: 13,
    color: Pastel.text,
  },
  partnerHidden: {
    fontFamily: RoundedFont,
    fontSize: 13.5,
    color: Pastel.textMuted,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    backgroundColor: Pastel.matchaSoft,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#C2D5C7',
  },
  infoBannerText: {
    flex: 1,
    fontFamily: RoundedFont,
    fontSize: 11.5,
    color: Pastel.matcha,
    lineHeight: 17,
  },
});
