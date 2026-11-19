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
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, Stop } from 'react-native-svg';

import type { MoodId } from '@/types/couple';

interface MochiMascotProps {
  bodyColor: string;
  auraColor: string;
  mood: MoodId;
  size?: number;
  delayMs?: number;
}

function resolveSoftPalette(bodyHex: string): { top: string; bottom: string; shadow: string } {
  const upper = bodyHex.toUpperCase();
  // Matcha / mint / lavender partner -> soft mint clay
  if (
    upper === '#DCE5D1' ||
    upper === '#EFEAFF' ||
    upper === '#E1F5EC' ||
    upper === '#D8F0E3'
  ) {
    return { top: '#E8F7ED', bottom: '#C2E5CE', shadow: '#BBDAC7' };
  }
  // Cream / rose / peach partner -> warm milky peach clay
  return { top: '#FFF5EB', bottom: '#FFE0C7', shadow: '#EDD3C6' };
}

export const MochiMascot = React.memo(function MochiMascot({
  bodyColor,
  mood,
  size = 76,
  delayMs = 0,
}: MochiMascotProps) {
  const isFocused = useIsFocused();
  const translateY = useSharedValue(0);
  const gradId = `mochiBody_${bodyColor.replace('#', '')}_${mood}`;
  const palette = resolveSoftPalette(bodyColor);

  useEffect(() => {
    if (!isFocused) {
      cancelAnimation(translateY);
      translateY.value = 0;
      return;
    }

    const timer = setTimeout(() => {
      translateY.value = withRepeat(
        withSequence(
          withTiming(-4, { duration: 1700, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 1700, easing: Easing.inOut(Easing.sin) })
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
    <View style={[styles.wrapper, { width: size + 8, height: size + 8 }]}>
      <View
        style={[
          styles.groundShadow,
          {
            width: size * 0.64,
            backgroundColor: palette.shadow + '66',
          },
        ]}
      />
      <Animated.View
        style={floatStyle}
        renderToHardwareTextureAndroid
        shouldRasterizeIOS>
        <Svg width={size} height={size} viewBox="0 0 100 100">
          <Defs>
            <LinearGradient id={gradId} x1="0.2" y1="0" x2="0.6" y2="1">
              <Stop offset="0" stopColor={palette.top} />
              <Stop offset="1" stopColor={palette.bottom} />
            </LinearGradient>
          </Defs>

          {/* Soft borderless squishy mochi silhouette (zero dark stroke!) */}
          <Path
            d="M12 64 C12 31, 29 18, 50 18 C71 18, 88 31, 88 64 C88 83, 73 88, 50 88 C27 88, 12 83, 12 64 Z"
            fill={`url(#${gradId})`}
          />

          {/* Glossy top-left soft specular reflection */}
          <Ellipse
            cx={34}
            cy={33}
            rx={13}
            ry={6.5}
            fill="#FFFFFF"
            opacity={0.55}
            transform="rotate(-18 34 33)"
          />

          {/* Soft airbrushed rosy cheeks */}
          <Ellipse cx={27} cy={62} rx={8} ry={4.6} fill="#FF8DA1" opacity={0.42} />
          <Ellipse cx={73} cy={62} rx={8} ry={4.6} fill="#FF8DA1" opacity={0.42} />

          {/* Mood Facial Expressions (warm espresso, delicate & clean) */}
          {mood === 'in_love' ? (
            <>
              <Path
                d="M35 52 C35 48.5, 30 48.5, 30 52 C30 55.2, 35 58.2, 35 58.2 C35 58.2, 40 55.2, 40 52 C40 48.5, 35 48.5, 35 52 Z"
                fill="#FF5C7A"
              />
              <Path
                d="M65 52 C65 48.5, 60 48.5, 60 52 C60 55.2, 65 58.2, 65 58.2 C65 58.2, 70 55.2, 70 52 C70 48.5, 65 48.5, 65 52 Z"
                fill="#FF5C7A"
              />
              <Path
                d="M44 63 Q50 69 56 63"
                stroke="#5A423C"
                strokeWidth={3.2}
                strokeLinecap="round"
                fill="none"
              />
            </>
          ) : mood === 'sleepy' ? (
            <>
              <Path
                d="M31 55 Q37 59.5 43 55"
                stroke="#5A423C"
                strokeWidth={3.2}
                strokeLinecap="round"
                fill="none"
              />
              <Path
                d="M57 55 Q63 59.5 69 55"
                stroke="#5A423C"
                strokeWidth={3.2}
                strokeLinecap="round"
                fill="none"
              />
              <Circle cx={50} cy={65} r={3.2} fill="#5A423C" opacity={0.75} />
            </>
          ) : mood === 'miss_you' ? (
            <>
              <Circle cx={37} cy={53} r={4.8} fill="#5A423C" />
              <Circle cx={38.5} cy={51.3} r={1.6} fill="#FFFFFF" />
              <Circle cx={63} cy={53} r={4.8} fill="#5A423C" />
              <Circle cx={64.5} cy={51.3} r={1.6} fill="#FFFFFF" />
              <Path
                d="M46 66 Q50 63 54 66"
                stroke="#5A423C"
                strokeWidth={3}
                strokeLinecap="round"
                fill="none"
              />
            </>
          ) : mood === 'hungry' ? (
            <>
              <Circle cx={37} cy={53} r={4.4} fill="#5A423C" />
              <Circle cx={38.5} cy={51.5} r={1.4} fill="#FFFFFF" />
              <Circle cx={63} cy={53} r={4.4} fill="#5A423C" />
              <Circle cx={64.5} cy={51.5} r={1.4} fill="#FFFFFF" />
              <Path
                d="M44 62 Q50 72 56 62 Z"
                fill="#FF6F88"
              />
            </>
          ) : mood === 'chaotic' ? (
            <>
              <Path
                d="M32 50 L41 54 L32 58"
                stroke="#5A423C"
                strokeWidth={3.2}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              <Path
                d="M68 50 L59 54 L68 58"
                stroke="#5A423C"
                strokeWidth={3.2}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              <Path
                d="M44 64 Q47 67.5 50 64 Q53 67.5 56 64"
                stroke="#5A423C"
                strokeWidth={2.8}
                strokeLinecap="round"
                fill="none"
              />
            </>
          ) : (
            <>
              <Circle cx={37} cy={53} r={4.4} fill="#5A423C" />
              <Circle cx={38.5} cy={51.5} r={1.5} fill="#FFFFFF" />
              <Path
                d="M58 54 Q63 49 68 54"
                stroke="#5A423C"
                strokeWidth={3.2}
                strokeLinecap="round"
                fill="none"
              />
              <Path
                d="M45 62 Q50 67.5 55 62"
                stroke="#5A423C"
                strokeWidth={3.2}
                strokeLinecap="round"
                fill="none"
              />
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
    bottom: 2,
    height: 8,
    borderRadius: 999,
  },
});
