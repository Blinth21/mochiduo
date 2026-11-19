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
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg';

import {
  BodyFontBold,
  BodyFontSemi,
  MonoFont,
  MonoFontBold,
  Pastel,
  RoundedFont,
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

const RADAR_SIZE = 224;
const CENTER = RADAR_SIZE / 2;

function normalizePinColor(hex: string): string {
  const upper = hex.toUpperCase();
  if (upper === '#FF6B8B' || upper === '#E64D70') return Pastel.coral;
  if (upper === '#8B74FF') return Pastel.matcha;
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
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.distancePill}>
          <Navigation size={12} color={Pastel.coralDark} />
          <Text style={styles.distancePillText}>
            {bothSharing
              ? `JARAK ${distanceText.toUpperCase()}`
              : 'MODE PRIVASI AKTIF'}
          </Text>
        </View>

        {bothSharing ? (
          <View style={styles.compassPill}>
            <Compass size={12} color={Pastel.taro} />
            <Text style={styles.compassText}>
              {compassDir.toUpperCase()} • {Math.round(bearingDeg)}°
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.radarStage}>
        <View style={styles.radarContainer}>
          {/* Animated pulse ring */}
          <Animated.View style={[styles.pulseRing, pulseStyle]} />

          <Svg width={RADAR_SIZE} height={RADAR_SIZE}>
            {/* Outer Compass Dial */}
            <Circle
              cx={CENTER}
              cy={CENTER}
              r={CENTER - 10}
              fill={Pastel.bg}
              stroke={Pastel.borderStrong}
              strokeWidth={1.5}
            />
            <Circle
              cx={CENTER}
              cy={CENTER}
              r={CENTER * 0.66}
              fill="none"
              stroke={Pastel.borderStrong}
              strokeWidth={1}
              strokeDasharray="4 4"
            />
            <Circle
              cx={CENTER}
              cy={CENTER}
              r={CENTER * 0.34}
              fill={Pastel.coralSoft + '55'}
              stroke="#E2B9AD"
              strokeWidth={1}
            />

            {/* Cartographic Crosshair Axes */}
            <Line
              x1={CENTER}
              y1={14}
              x2={CENTER}
              y2={RADAR_SIZE - 14}
              stroke={Pastel.border}
              strokeWidth={1}
            />
            <Line
              x1={14}
              y1={CENTER}
              x2={RADAR_SIZE - 14}
              y2={CENTER}
              stroke={Pastel.border}
              strokeWidth={1}
            />

            {/* Cardinal Initials */}
            <SvgText
              x={CENTER}
              y={23}
              textAnchor="middle"
              fontSize="9"
              fontWeight="700"
              fill={Pastel.textMuted}>
              U
            </SvgText>
            <SvgText
              x={RADAR_SIZE - 18}
              y={CENTER + 3}
              textAnchor="middle"
              fontSize="9"
              fontWeight="700"
              fill={Pastel.textMuted}>
              T
            </SvgText>
            <SvgText
              x={CENTER}
              y={RADAR_SIZE - 16}
              textAnchor="middle"
              fontSize="9"
              fontWeight="700"
              fill={Pastel.textMuted}>
              S
            </SvgText>
            <SvgText
              x={19}
              y={CENTER + 3}
              textAnchor="middle"
              fontSize="9"
              fontWeight="700"
              fill={Pastel.textMuted}>
              B
            </SvgText>

            {/* Connecting Bearing Vector */}
            {bothSharing ? (
              <Line
                x1={CENTER}
                y1={CENTER}
                x2={partnerPoint.x}
                y2={partnerPoint.y}
                stroke={Pastel.coral}
                strokeWidth={2}
                strokeDasharray="4 4"
              />
            ) : null}
          </Svg>

          {/* My Beacon at Center */}
          <View style={[styles.centerPin, { backgroundColor: myColor }]}>
            <Text style={styles.pinLetter}>{me.name.slice(0, 1).toUpperCase()}</Text>
          </View>

          {/* Partner Beacon */}
          {bothSharing ? (
            <View
              style={[
                styles.partnerPin,
                {
                  left: partnerPoint.x - 18,
                  top: partnerPoint.y - 18,
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
            {me.name} (Kamu){myLoc.spotTag ? ` — ${myLoc.spotTag}` : ''}
          </Text>
        </View>
        <View style={styles.legendDivider} />
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: partnerColor }]} />
          <Text style={styles.legendText}>
            {partner.name}
            {partnerLoc.isSharing
              ? distanceMeters < 50
                ? ' — Sangat dekat'
                : ` — ${partnerLoc.spotTag ?? partnerLoc.areaName}`
              : ' — Privasi'}
          </Text>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: Pastel.bgElevated,
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: Pastel.borderStrong,
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
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E8C5BB',
  },
  distancePillText: {
    fontFamily: MonoFontBold,
    fontSize: 10.5,
    color: Pastel.coralDark,
    letterSpacing: 0.4,
  },
  compassPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Pastel.taroSoft,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#C7D0DC',
  },
  compassText: {
    fontFamily: MonoFontBold,
    fontSize: 10.5,
    color: Pastel.taro,
    letterSpacing: 0.4,
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
    width: RADAR_SIZE - 20,
    height: RADAR_SIZE - 20,
    borderRadius: (RADAR_SIZE - 20) / 2,
    borderWidth: 1.5,
    borderColor: Pastel.coral,
    backgroundColor: Pastel.coralSoft,
  },
  centerPin: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2.5,
    borderColor: Pastel.pureWhite,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partnerPin: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2.5,
    borderColor: Pastel.pureWhite,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinLetter: {
    fontFamily: BodyFontBold,
    fontSize: 13.5,
    color: Pastel.pureWhite,
  },
  hiddenOverlay: {
    position: 'absolute',
    bottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Pastel.bgElevated,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Pastel.borderStrong,
  },
  hiddenText: {
    fontFamily: BodyFontSemi,
    fontSize: 12,
    color: Pastel.textMuted,
  },
  legendRow: {
    gap: 8,
    backgroundColor: Pastel.bg,
    borderRadius: 8,
    padding: 11,
    borderWidth: 1,
    borderColor: Pastel.border,
  },
  legendDivider: {
    height: 1,
    backgroundColor: Pastel.border,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  legendText: {
    fontFamily: RoundedFont,
    fontSize: 12.5,
    color: Pastel.text,
    flexShrink: 1,
  },
  monoMeta: {
    fontFamily: MonoFont,
  },
});
