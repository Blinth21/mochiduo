import { Compass, Lock, Navigation } from 'lucide-react-native';
import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Line } from 'react-native-svg';

import { Pastel, RoundedFont } from '@/constants/pastelTheme';
import type { LocationSnapshot, PartnerProfile } from '@/types/couple';
import {
  formatDistanceId,
  getBearingDegrees,
  getCompassDirectionId,
  getDistanceMeters,
} from '@/utils/geoCalc';

interface CoupleLocationRadarProps {
  me: PartnerProfile;
  myLoc: LocationSnapshot;
  partner: PartnerProfile;
  partnerLoc: LocationSnapshot;
}

const RADAR_SIZE = 216;
const CENTER = RADAR_SIZE / 2;

export const CoupleLocationRadar = React.memo(function CoupleLocationRadar({
  me,
  myLoc,
  partner,
  partnerLoc,
}: CoupleLocationRadarProps) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.set(
      withRepeat(
        withTiming(1, { duration: 2400, easing: Easing.out(Easing.quad) }),
        -1,
        false
      )
    );
  }, [pulse]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: (1 - pulse.value) * 0.45,
    transform: [{ scale: 0.35 + pulse.value * 0.65 }],
  }));

  const { distanceMeters, distanceText, bearingDeg, compassDir, partnerPoint } =
    useMemo(() => {
      const dist = getDistanceMeters(
        myLoc.latitude,
        myLoc.longitude,
        partnerLoc.latitude,
        partnerLoc.longitude
      );
      const bearing = getBearingDegrees(
        myLoc.latitude,
        myLoc.longitude,
        partnerLoc.latitude,
        partnerLoc.longitude
      );

      // Logarithmic radial mapping so both 100m and 30km remain clearly visible inside radar
      const normalized =
        dist < 30 ? 0.14 : Math.min(0.84, 0.22 + Math.log10(dist / 50 + 1) * 0.22);
      const radiusPx = normalized * (CENTER - 26);
      const rad = ((bearing - 90) * Math.PI) / 180;

      return {
        distanceMeters: dist,
        distanceText: formatDistanceId(dist),
        bearingDeg: bearing,
        compassDir: getCompassDirectionId(bearing),
        partnerPoint: {
          x: CENTER + Math.cos(rad) * radiusPx,
          y: CENTER + Math.sin(rad) * radiusPx,
        },
      };
    }, [myLoc.latitude, myLoc.longitude, partnerLoc.latitude, partnerLoc.longitude]);

  const bothSharing = myLoc.isSharing && partnerLoc.isSharing;

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.distancePill}>
          <Navigation size={13} color={Pastel.coralDark} />
          <Text style={styles.distancePillText}>
            {bothSharing
              ? `Jarak kalian: ${distanceText}`
              : 'Mode Privasi Aktif'}
          </Text>
        </View>

        {bothSharing ? (
          <View style={styles.compassPill}>
            <Compass size={13} color="#5B43D6" />
            <Text style={styles.compassText}>
              Arah {compassDir} ({Math.round(bearingDeg)}°)
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.radarStage}>
        <View style={styles.radarContainer}>
          {/* Animated pulse ring */}
          <Animated.View style={[styles.pulseRing, pulseStyle]} />

          <Svg width={RADAR_SIZE} height={RADAR_SIZE}>
            {/* Concentric Pastel Radar Rings */}
            <Circle
              cx={CENTER}
              cy={CENTER}
              r={CENTER - 8}
              fill={Pastel.bg}
              stroke={Pastel.border}
              strokeWidth={2}
            />
            <Circle
              cx={CENTER}
              cy={CENTER}
              r={CENTER * 0.66}
              fill={Pastel.skySoft + '55'}
              stroke="#D2EAFF"
              strokeWidth={1.5}
              strokeDasharray="5 5"
            />
            <Circle
              cx={CENTER}
              cy={CENTER}
              r={CENTER * 0.34}
              fill={Pastel.coralSoft + '77'}
              stroke="#FFC7D6"
              strokeWidth={1.5}
            />

            {/* Connecting Line */}
            {bothSharing ? (
              <Line
                x1={CENTER}
                y1={CENTER}
                x2={partnerPoint.x}
                y2={partnerPoint.y}
                stroke={Pastel.coral}
                strokeWidth={2.2}
                strokeDasharray="4 4"
              />
            ) : null}
          </Svg>

          {/* My Beacon at Center */}
          <View style={[styles.centerPin, { backgroundColor: me.auraColor }]}>
            <Text style={styles.pinLetter}>{me.name.slice(0, 1).toUpperCase()}</Text>
          </View>

          {/* Partner Beacon */}
          {bothSharing ? (
            <View
              style={[
                styles.partnerPin,
                {
                  left: partnerPoint.x - 19,
                  top: partnerPoint.y - 19,
                  backgroundColor: partner.auraColor,
                },
              ]}>
              <Text style={styles.pinLetter}>
                {partner.name.slice(0, 1).toUpperCase()}
              </Text>
            </View>
          ) : (
            <View style={styles.hiddenOverlay}>
              <Lock size={16} color={Pastel.textMuted} />
              <Text style={styles.hiddenText}>Lokasi disembunyikan</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: me.auraColor }]} />
          <Text style={styles.legendText}>
            {me.name} (Kamu){myLoc.spotTag ? ` • ${myLoc.spotTag}` : ''}
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: partner.auraColor }]} />
          <Text style={styles.legendText}>
            {partner.name}
            {partnerLoc.isSharing
              ? distanceMeters < 50
                ? ' • Dekat banget!'
                : ` • ${partnerLoc.spotTag ?? partnerLoc.areaName}`
              : ' • Privasi'}
          </Text>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: Pastel.white,
    borderRadius: 28,
    padding: 16,
    borderWidth: 2,
    borderColor: Pastel.border,
    shadowColor: '#D9A7B8',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 3,
    gap: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  distancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Pastel.coralSoft,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
  },
  distancePillText: {
    fontFamily: RoundedFont,
    fontSize: 12.5,
    fontWeight: '800',
    color: Pastel.coralDark,
  },
  compassPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Pastel.taroSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  compassText: {
    fontFamily: RoundedFont,
    fontSize: 12,
    fontWeight: '700',
    color: '#5B43D6',
  },
  radarStage: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  radarContainer: {
    width: RADAR_SIZE,
    height: RADAR_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: RADAR_SIZE - 16,
    height: RADAR_SIZE - 16,
    borderRadius: (RADAR_SIZE - 16) / 2,
    backgroundColor: Pastel.coralSoft,
  },
  centerPin: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 3,
    borderColor: Pastel.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 4,
  },
  partnerPin: {
    position: 'absolute',
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 3,
    borderColor: Pastel.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 5,
    elevation: 5,
  },
  pinLetter: {
    fontFamily: RoundedFont,
    fontSize: 14,
    fontWeight: '800',
    color: Pastel.white,
  },
  hiddenOverlay: {
    position: 'absolute',
    bottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: Pastel.border,
  },
  hiddenText: {
    fontFamily: RoundedFont,
    fontSize: 12,
    fontWeight: '700',
    color: Pastel.textMuted,
  },
  legendRow: {
    gap: 6,
    backgroundColor: Pastel.bg,
    borderRadius: 16,
    padding: 11,
    borderWidth: 1.5,
    borderColor: Pastel.border,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontFamily: RoundedFont,
    fontSize: 12.5,
    fontWeight: '700',
    color: Pastel.text,
    flexShrink: 1,
  },
});
