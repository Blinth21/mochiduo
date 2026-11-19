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
  BodyFontRegular,
  BodyFontSemi,
  Pastel,
  RoundedFont,
  SoftShadow,
  SoftShadowSm,
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
          {/* Airy Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerCopy}>
              <Text style={styles.pageTitle} maxFontSizeMultiplier={1.2}>
                Lokasi Berdua
              </Text>
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
                <Text style={styles.pageSub} numberOfLines={1} maxFontSizeMultiplier={1.15}>
                  {liveWatchEnabled && myLoc.isSharing
                    ? 'GPS Real-Time aktif · tiap 5 dtk'
                    : 'Mode hemat · update manual'}
                </Text>
              </View>
            </View>

            <BouncyPressable
              onPress={handleSwitchPartner}
              style={[styles.switchPill, SoftShadowSm]}>
              <ArrowLeftRight size={12} color={Pastel.coral} />
              <Text style={styles.switchPillText} numberOfLines={1} maxFontSizeMultiplier={1.15}>
                {me.name}
              </Text>
            </BouncyPressable>
          </View>

          {/* Borderless Pill Segmented Switch: Peta vs Radar */}
          <View style={styles.viewSwitchRow}>
            <BouncyPressable
              onPress={() => {
                triggerMediumHaptic();
                setViewMode('map');
              }}
              style={[
                styles.viewSwitchBtn,
                viewMode === 'map' && [styles.viewSwitchBtnActive, SoftShadowSm],
              ]}>
              <MapIcon
                size={15}
                color={viewMode === 'map' ? Pastel.coral : Pastel.textMuted}
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
                viewMode === 'radar' && [styles.viewSwitchBtnActive, SoftShadowSm],
              ]}>
              <Radar
                size={15}
                color={viewMode === 'radar' ? Pastel.coral : Pastel.textMuted}
              />
              <Text
                style={[
                  styles.viewSwitchText,
                  viewMode === 'radar' && styles.viewSwitchTextActive,
                ]}>
                Radar
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

          {/* Soft Borderless Controls Card */}
          <View style={[styles.card, SoftShadow]}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Kontrol Lokasi {me.name}</Text>
              <View style={styles.deviceTagPill}>
                <Text style={styles.deviceTagText}>HP Ini</Text>
              </View>
            </View>

            <BouncyPressable
              onPress={handleUpdateGpsNow}
              disabled={isLocating}
              style={[styles.gpsButton, isLocating && { opacity: 0.7 }]}>
              {isLocating ? (
                <ActivityIndicator size="small" color={Pastel.pureWhite} />
              ) : (
                <LocateFixed size={18} color={Pastel.pureWhite} />
              )}
              <Text style={styles.gpsButtonText}>
                {isLocating ? 'Mengambil GPS...' : 'Update Lokasi GPS Sekarang'}
              </Text>
            </BouncyPressable>

            {feedbackMsg ? (
              <Text style={styles.feedbackText}>{feedbackMsg}</Text>
            ) : null}

            {/* Quick Spot Check-in */}
            <Text style={styles.subLabel}>Check-in cepat</Text>
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
                  <Radio size={17} color={Pastel.matcha} />
                </View>
                <View style={styles.toggleCopy}>
                  <Text style={styles.toggleTitle}>GPS Real-Time Otomatis</Text>
                  <Text style={styles.toggleSub}>
                    Update otomatis tiap 5 detik atau pindah ≥10m
                  </Text>
                </View>
              </View>
              <Switch
                value={liveWatchEnabled}
                onValueChange={handleToggleLiveWatch}
                trackColor={{ false: Pastel.bgMuted, true: Pastel.matcha }}
                thumbColor={Pastel.pureWhite}
              />
            </View>

            <View style={styles.hairline} />

            <View style={styles.toggleRow}>
              <View style={styles.toggleLeft}>
                <View style={[styles.toggleIcon, { backgroundColor: Pastel.taroSoft }]}>
                  {myLoc.isSharing ? (
                    <Eye size={17} color={Pastel.taro} />
                  ) : (
                    <EyeOff size={17} color={Pastel.textMuted} />
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
                trackColor={{ false: Pastel.bgMuted, true: Pastel.coral }}
                thumbColor={Pastel.pureWhite}
              />
            </View>
          </View>

          {/* Soft Blush-Rose Borderless Partner Location Card */}
          <View style={[styles.partnerCard, SoftShadowSm]}>
            <View style={styles.partnerTop}>
              <View style={styles.partnerPill}>
                <MapPin size={13} color={Pastel.coralDark} />
                <Text style={styles.partnerPillText}>Posisi {partner.name}</Text>
              </View>
              <Text style={styles.partnerTime}>
                {formatRelativeTime(partnerLoc.updatedAt)}
              </Text>
            </View>

            {partnerLoc.isSharing ? (
              <>
                <Text style={styles.partnerArea}>{partnerLoc.areaName}</Text>
                <Text style={styles.partnerMeta}>
                  {partnerLoc.spotTag ? `${partnerLoc.spotTag} · ` : ''}
                  Jarak {distanceText}
                </Text>

                <BouncyPressable
                  onPress={handleOpenPartnerMaps}
                  style={[styles.mapsButton, SoftShadowSm]}>
                  <ExternalLink size={15} color={Pastel.coralDark} />
                  <Text style={styles.mapsButtonText}>
                    Buka di Google Maps
                  </Text>
                </BouncyPressable>
              </>
            ) : (
              <Text style={styles.partnerHidden}>
                {partner.name} sedang mengaktifkan Mode Privasi.
              </Text>
            )}
          </View>

          {/* Soft Mint Live Sync Banner */}
          <BouncyPressable
            onPress={() => setSyncModalVisible(true)}
            style={styles.infoBanner}>
            <View style={styles.infoIconCircle}>
              <ShieldCheck size={17} color={Pastel.matcha} />
            </View>
            <Text style={styles.infoBannerText}>
              {syncConfig.enabled && syncStatus === 'connected'
                ? `GPS Real-Time & Live Sync 2 HP aktif (Room ${syncConfig.roomCode}). Posisi otomatis terkirim setiap pindah ≥10m.`
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
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 118,
    alignItems: 'center',
  },
  centerColumn: {
    width: '100%',
    maxWidth: 520,
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
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
  statusSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  statusSubDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  pageSub: {
    fontFamily: BodyFontRegular,
    fontSize: 12.5,
    lineHeight: 18,
    color: Pastel.textMuted,
    flexShrink: 1,
  },
  switchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Pastel.bgElevated,
    paddingHorizontal: 11,
    height: 36,
    borderRadius: 999,
    flexShrink: 0,
  },
  switchPillText: {
    fontFamily: BodyFontBold,
    fontSize: 12.5,
    lineHeight: 18,
    color: Pastel.text,
    paddingRight: 2,
  },
  viewSwitchRow: {
    flexDirection: 'row',
    backgroundColor: Pastel.bgMuted,
    borderRadius: 999,
    padding: 4,
    gap: 4,
  },
  viewSwitchBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 999,
  },
  viewSwitchBtnActive: {
    backgroundColor: Pastel.bgElevated,
  },
  viewSwitchText: {
    fontFamily: BodyFontSemi,
    fontSize: 13.5,
    lineHeight: 19,
    color: Pastel.textMuted,
  },
  viewSwitchTextActive: {
    fontFamily: BodyFontBold,
    color: Pastel.text,
  },
  card: {
    backgroundColor: Pastel.bgElevated,
    borderRadius: 24,
    padding: 18,
    gap: 13,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  sectionTitle: {
    fontFamily: BodyFontBold,
    fontSize: 16.5,
    lineHeight: 23,
    color: Pastel.text,
    flexShrink: 1,
  },
  deviceTagPill: {
    backgroundColor: Pastel.bgMuted,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  deviceTagText: {
    fontFamily: BodyFontSemi,
    fontSize: 11.5,
    lineHeight: 16,
    color: Pastel.textMuted,
  },
  gpsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Pastel.coral,
    paddingVertical: 14,
    borderRadius: 999,
  },
  gpsButtonText: {
    fontFamily: BodyFontBold,
    fontSize: 14.5,
    lineHeight: 20,
    color: Pastel.pureWhite,
  },
  feedbackText: {
    fontFamily: BodyFontSemi,
    fontSize: 12.5,
    lineHeight: 18,
    color: Pastel.matcha,
    textAlign: 'center',
  },
  subLabel: {
    fontFamily: BodyFontSemi,
    fontSize: 13,
    lineHeight: 19,
    color: Pastel.textMuted,
    marginTop: 2,
  },
  spotScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  spotChip: {
    backgroundColor: Pastel.bgMuted,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
  },
  spotChipActive: {
    backgroundColor: Pastel.matchaSoft,
  },
  spotChipText: {
    fontFamily: RoundedFont,
    fontSize: 13,
    lineHeight: 18,
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
    gap: 11,
  },
  toggleIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleCopy: {
    flex: 1,
  },
  toggleTitle: {
    fontFamily: BodyFontSemi,
    fontSize: 14,
    lineHeight: 20,
    color: Pastel.text,
  },
  toggleSub: {
    fontFamily: BodyFontRegular,
    fontSize: 12,
    lineHeight: 17,
    color: Pastel.textMuted,
  },
  partnerCard: {
    backgroundColor: Pastel.coralSoft,
    borderRadius: 24,
    padding: 18,
    gap: 9,
  },
  partnerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  partnerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.82)',
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 999,
  },
  partnerPillText: {
    fontFamily: BodyFontBold,
    fontSize: 12,
    lineHeight: 17,
    color: Pastel.coralDark,
  },
  partnerTime: {
    fontFamily: BodyFontRegular,
    fontSize: 12,
    lineHeight: 17,
    color: Pastel.textMuted,
  },
  partnerArea: {
    fontFamily: BodyFontBold,
    fontSize: 18,
    lineHeight: 25,
    color: Pastel.text,
  },
  partnerMeta: {
    fontFamily: BodyFontRegular,
    fontSize: 13,
    lineHeight: 19,
    color: Pastel.textMuted,
  },
  mapsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Pastel.bgElevated,
    paddingVertical: 12,
    borderRadius: 999,
    marginTop: 4,
  },
  mapsButtonText: {
    fontFamily: BodyFontBold,
    fontSize: 13.5,
    lineHeight: 19,
    color: Pastel.coralDark,
  },
  partnerHidden: {
    fontFamily: BodyFontRegular,
    fontSize: 14,
    lineHeight: 20,
    color: Pastel.textMuted,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    backgroundColor: Pastel.matchaSoft,
    borderRadius: 20,
    padding: 14,
  },
  infoIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoBannerText: {
    flex: 1,
    fontFamily: BodyFontRegular,
    fontSize: 12.5,
    lineHeight: 19,
    color: Pastel.matcha,
  },
});
