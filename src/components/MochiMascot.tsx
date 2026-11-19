import { useIsFocused } from 'expo-router';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';

import { Pastel } from '@/constants/pastelTheme';
import type { MoodId } from '@/types/couple';

interface MochiMascotProps {
  bodyColor: string;
  auraColor: string;
  mood: MoodId;
  size?: number;
  delayMs?: number;
}

function normalizeMochiColor(hex: string): string {
  const upper = hex.toUpperCase();
  if (upper === '#FFE8F0' || upper === '#FFE8EE') return '#FBF2E6';
  if (upper === '#EFEAFF') return '#DCE5D1';
  return hex;
}

function normalizeAuraColor(hex: string): string {
  const upper = hex.toUpperCase();
  if (upper === '#FF6B8B' || upper === '#E64D70') return Pastel.coral;
  if (upper === '#8B74FF') return Pastel.matcha;
  return hex;
}

export const MochiMascot = React.memo(function MochiMascot({
  bodyColor,
  auraColor,
  mood,
  size = 76,
  delayMs = 0,
}: MochiMascotProps) {
  const isFocused = useIsFocused();
  const translateY = useSharedValue(0);

  const fillHex = normalizeMochiColor(bodyColor);
  const accentHex = normalizeAuraColor(auraColor);

  useEffect(() => {
    if (!isFocused) {
      cancelAnimation(translateY);
      translateY.value = 0;
      return;
    }

    const timer = setTimeout(() => {
      translateY.value = withRepeat(
        withSequence(
          withTiming(-3, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      );
    }, delayMs);

    return () => {
      clearTimeout(timer);
      cancelAnimation(translateY);
    };
  }, [delayMs, isFocused, translateY]);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <View style={[styles.wrapper, { width: size + 12, height: size + 10 }]}>
      {/* Subtle porcelain dish shadow */}
      <View
        style={[
          styles.groundShadow,
          {
            width: size * 0.68,
            backgroundColor: accentHex + '1F',
          },
        ]}
      />
      <Animated.View style={floatStyle}>
        <Svg width={size} height={size} viewBox="0 0 100 100">
          {/* Hand-inked ceramic wagashi mochi silhouette */}
          <Path
            d="M15 64 C15 32, 31 20, 50 20 C69 20, 85 32, 85 64 C85 81, 71 86, 50 86 C29 86, 15 81, 15 64 Z"
            fill={fillHex}
            stroke={Pastel.text}
            strokeWidth={3.2}
            strokeLinejoin="round"
          />
          {/* Subtle inner rim sheen (craft stationery feel, no harsh gloss) */}
          <Path
            d="M27 36 C33 27, 42 25, 48 25"
            stroke="#FFFFFF"
            strokeWidth={2.5}
            strokeLinecap="round"
            fill="none"
            opacity={0.7}
          />

          {/* Soft terracotta ceramic cheeks */}
          <Ellipse cx={30} cy={60} rx={6} ry={3.4} fill={accentHex} opacity={0.34} />
          <Ellipse cx={70} cy={60} rx={6} ry={3.4} fill={accentHex} opacity={0.34} />

          {/* Minimal serene ink expressions */}
          {mood === 'sleepy' ? (
            <>
              <Path
                d="M32 51 Q36.5 55.5 41 51"
                stroke={Pastel.text}
                strokeWidth={2.8}
                strokeLinecap="round"
                fill="none"
              />
              <Path
                d="M59 51 Q63.5 55.5 68 51"
                stroke={Pastel.text}
                strokeWidth={2.8}
                strokeLinecap="round"
                fill="none"
              />
              <Circle cx={50} cy={62} r={2.8} fill={Pastel.text} />
            </>
          ) : mood === 'in_love' ? (
            <>
              <Path
                d="M32 51 Q36.5 46 41 51"
                stroke={Pastel.text}
                strokeWidth={2.8}
                strokeLinecap="round"
                fill="none"
              />
              <Circle cx={63.5} cy={50} r={3.4} fill={Pastel.text} />
              <Path
                d="M50 56 C50 53.5, 46.8 53.5, 46.8 56 C46.8 58.6, 50 61, 50 61 C50 61, 53.2 58.6, 53.2 56 C53.2 53.5, 50 53.5, 50 56 Z"
                fill={Pastel.coral}
              />
            </>
          ) : mood === 'chaotic' ? (
            <>
              <Circle cx={36.5} cy={50} r={3.8} fill={Pastel.text} />
              <Path
                d="M59 47 L67 50.5 L59 54"
                stroke={Pastel.text}
                strokeWidth={2.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              <Path
                d="M43 62 Q46.5 58.5 50 62 Q53.5 65.5 57 62"
                stroke={Pastel.text}
                strokeWidth={2.6}
                strokeLinecap="round"
                fill="none"
              />
            </>
          ) : (
            <>
              <Circle cx={36.5} cy={50} r={3.4} fill={Pastel.text} />
              <Circle cx={63.5} cy={50} r={3.4} fill={Pastel.text} />
              {mood === 'miss_you' ? (
                <Path
                  d="M45.5 63.5 Q50 59.5 54.5 63.5"
                  stroke={Pastel.text}
                  strokeWidth={2.6}
                  strokeLinecap="round"
                  fill="none"
                />
              ) : mood === 'hungry' ? (
                <Path
                  d="M44.5 60 Q50 67.5 55.5 60 Z"
                  fill={Pastel.coral}
                  stroke={Pastel.text}
                  strokeWidth={2.2}
                />
              ) : (
                <Path
                  d="M45 60 Q50 64.5 55 60"
                  stroke={Pastel.text}
                  strokeWidth={2.6}
                  strokeLinecap="round"
                  fill="none"
                />
              )}
            </>
          )}
        </Svg>
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  groundShadow: {
    position: 'absolute',
    bottom: 3,
    height: 8,
    borderRadius: 999,
  },
});
