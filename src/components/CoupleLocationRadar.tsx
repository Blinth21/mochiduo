import { useIsFocused } from 'expo-router';
import { Compass, Lock, Navigation } from 'lucide-react-native';
import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Line } from 'react-native-svg';

import {
  BodyFontBold,
  BodyFontSemi,
  Pastel,
  RoundedFont,
  SoftShadow,
} from '@/constants/pastelTheme';
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

const RADAR_SIZE = 220;
const CENTER = RADAR_SIZE / 2;

function normalizePinColor(hex: string): string {
  const upper = hex.toUpperCase();
  if (upper === '#C84B31' || upper === '#FF6B8B' || upper === '#E64D70') return Pastel.coral;
  if (upper === '#3A6B54' || upper === '#8B74FF') return Pastel.matcha;
  return hex;
}

export const CoupleLocationRadar = React.memo(function CoupleLocationRadar({
  me,
  myLoc,
  partner,
  partnerLoc,
}: CoupleLocationRadarProps) {
  const isFocused = useIsFocused();
  const pulse = useSharedValue(0);

  const myColor = normalizePinColor(me.auraColor);
  const partnerColor = normalizePinColor(partner.auraColor);

  useEffect(() => {
    if (!isFocused) {
      cancelAnimation(pulse);
      pulse.value = 0;
      return;
    }

    pulse.set(
      withRepeat(
        withTiming(1, { duration: 2400, easing: Easing.out(Easing.quad) }),
        -1,
        false
      )
    );

    return () => {
      cancelAnimation(pulse);
    };
  }, [isFocused, pulse]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: (1 - pulse.value) * 0.4,
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

      const normalized =
        dist < 30 ? 0.14 : Math.min(0.82, 0.22 + Math.log10(dist / 50 + 1) * 0.22);
      const radiusPx = normalized * (CENTER - 28);
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
    <View style={[styles.card, SoftShadow]}>
      <View style={styles.topRow}>
        <View style={styles.distancePill}>
          <Navigation size={13} color={Pastel.coralDark} />
          <Text style={styles.distancePillText}>
            {bothSharing ? `Jarak ${distanceText}` : 'Mode Privasi'}
          </Text>
        </View>

        {bothSharing ? (
          <View style={styles.compassPill}>
            <Compass size={13} color={Pastel.taro} />
            <Text style={styles.compassText}>
              {compassDir} · {Math.round(bearingDeg)}°
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.radarStage}>
        <View style={styles.radarContainer}>
          <Animated.View style={[styles.pulseRing, pulseStyle]} />

          <Svg width={RADAR_SIZE} height={RADAR_SIZE}>
            {/* Soft concentric pastel rings (zero harsh wireframe outlines!) */}
            <Circle cx={CENTER} cy={CENTER} r={CENTER - 8} fill="#F4F6FA" />
            <Circle cx={CENTER} cy={CENTER} r={CENTER * 0.68} fill="#FFF3F5" />
            <Circle cx={CENTER} cy={CENTER} r={CENTER * 0.36} fill="#FFE5EB" />

            {bothSharing ? (
              <Line
                x1={CENTER}
                y1={CENTER}
                x2={partnerPoint.x}
                y2={partnerPoint.y}
                stroke={Pastel.coral}
                strokeWidth={2.2}
                strokeDasharray="5 5"
                opacity={0.75}
              />
            ) : null}
          </Svg>

          <View style={[styles.centerPin, { backgroundColor: myColor }]}>
            <Text style={styles.pinLetter}>{me.name.slice(0, 1).toUpperCase()}</Text>
          </View>

          {bothSharing ? (
            <View
              style={[
                styles.partnerPin,
                {
                  left: partnerPoint.x - 19,
                  top: partnerPoint.y - 19,
                  backgroundColor: partnerColor,
                },
              ]}>
              <Text style={styles.pinLetter}>
                {partner.name.slice(0, 1).toUpperCase()}
              </Text>
            </View>
          ) : (
            <View style={styles.hiddenOverlay}>
              <Lock size={14} color={Pastel.textMuted} />
              <Text style={styles.hiddenText}>Lokasi disembunyikan</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: myColor }]} />
          <Text style={styles.legendText}>
            {me.name} (Kamu){myLoc.spotTag ? ` · ${myLoc.spotTag}` : ''}
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: partnerColor }]} />
          <Text style={styles.legendText}>
            {partner.name}
            {partnerLoc.isSharing
              ? distanceMeters < 50
                ? ' · Dekat banget!'
                : ` · ${partnerLoc.spotTag ?? partnerLoc.areaName}`
              : ' · Privasi'}
          </Text>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: Pastel.white,
    borderRadius: 24,
    padding: 16,
    gap: 14,
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
    gap: 6,
    backgroundColor: Pastel.coralSoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  distancePillText: {
    fontFamily: BodyFontBold,
    fontSize: 12.5,
    lineHeight: 17,
    color: Pastel.coralDark,
  },
  compassPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Pastel.taroSoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  compassText: {
    fontFamily: BodyFontBold,
    fontSize: 12,
    lineHeight: 17,
    color: Pastel.taro,
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
    backgroundColor: Pastel.coral,
  },
  centerPin: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 3,
    borderColor: Pastel.pureWhite,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  partnerPin: {
    position: 'absolute',
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 3,
    borderColor: Pastel.pureWhite,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
  },
  pinLetter: {
    fontFamily: BodyFontBold,
    fontSize: 14,
    lineHeight: 19,
    color: Pastel.pureWhite,
  },
  hiddenOverlay: {
    position: 'absolute',
    bottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Pastel.white,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 999,
    elevation: 2,
  },
  hiddenText: {
    fontFamily: BodyFontSemi,
    fontSize: 12,
    lineHeight: 17,
    color: Pastel.textMuted,
  },
  legendRow: {
    gap: 8,
    backgroundColor: Pastel.bg,
    borderRadius: 16,
    padding: 13,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontFamily: RoundedFont,
    fontSize: 13,
    lineHeight: 18,
    color: Pastel.text,
    flexShrink: 1,
  },
});
