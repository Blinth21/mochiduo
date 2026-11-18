import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
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

export const MochiMascot = React.memo(function MochiMascot({
  bodyColor,
  auraColor,
  mood,
  size = 76,
  delayMs = 0,
}: MochiMascotProps) {
  const translateY = useSharedValue(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      translateY.value = withRepeat(
        withSequence(
          withTiming(-5, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 1400, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      );
    }, delayMs);

    return () => clearTimeout(timer);
  }, [delayMs, translateY]);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <View style={[styles.wrapper, { width: size + 16, height: size + 16 }]}>
      <View
        style={[
          styles.aura,
          {
            width: size + 8,
            height: size + 8,
            borderRadius: (size + 8) / 2,
            backgroundColor: auraColor + '22',
            borderColor: auraColor + '44',
          },
        ]}
      />
      <Animated.View style={floatStyle}>
        <Svg width={size} height={size} viewBox="0 0 100 100">
          {/* Cute Mochi Blob Body */}
          <Path
            d="M16 62 C16 32, 32 18, 50 18 C68 18, 84 32, 84 62 C84 82, 70 88, 50 88 C30 88, 16 82, 16 62 Z"
            fill={bodyColor}
            stroke={Pastel.text}
            strokeWidth={3.5}
          />
          {/* Top Highlight */}
          <Ellipse cx={36} cy={31} rx={7} ry={3.5} fill="#FFFFFF" opacity={0.75} />

          {/* Rosy Cheeks */}
          <Ellipse cx={30} cy={60} rx={6.5} ry={4} fill="#FF8FA8" opacity={0.65} />
          <Ellipse cx={70} cy={60} rx={6.5} ry={4} fill="#FF8FA8" opacity={0.65} />

          {/* Mood Expressions */}
          {mood === 'sleepy' ? (
            <>
              <Path
                d="M31 50 Q36 55 41 50"
                stroke={Pastel.text}
                strokeWidth={3}
                strokeLinecap="round"
                fill="none"
              />
              <Path
                d="M59 50 Q64 55 69 50"
                stroke={Pastel.text}
                strokeWidth={3}
                strokeLinecap="round"
                fill="none"
              />
              <Circle cx={50} cy={62} r={3.5} fill={Pastel.text} />
            </>
          ) : mood === 'in_love' ? (
            <>
              <Path
                d="M32 49 C32 45, 36 45, 36 48 C36 45, 40 45, 40 49 C40 53, 36 55, 36 55 C36 55, 32 53, 32 49 Z"
                fill={Pastel.coral}
              />
              <Path
                d="M60 49 C60 45, 64 45, 64 48 C64 45, 68 45, 68 49 C68 53, 64 55, 64 55 C64 55, 60 53, 60 49 Z"
                fill={Pastel.coral}
              />
              <Path
                d="M44 61 Q50 67 56 61"
                stroke={Pastel.text}
                strokeWidth={3}
                strokeLinecap="round"
                fill="none"
              />
            </>
          ) : mood === 'chaotic' ? (
            <>
              <Circle cx={36} cy={49} r={4.5} fill={Pastel.text} />
              <Circle cx={37.5} cy={47.5} r={1.4} fill="#FFFFFF" />
              <Path
                d="M59 46 L68 50 L59 54"
                stroke={Pastel.text}
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              <Path
                d="M42 62 Q46 58 50 62 Q54 66 58 62"
                stroke={Pastel.text}
                strokeWidth={3}
                strokeLinecap="round"
                fill="none"
              />
            </>
          ) : (
            <>
              <Circle cx={36} cy={50} r={4.2} fill={Pastel.text} />
              <Circle cx={37.5} cy={48.5} r={1.4} fill="#FFFFFF" />
              <Circle cx={64} cy={50} r={4.2} fill={Pastel.text} />
              <Circle cx={65.5} cy={48.5} r={1.4} fill="#FFFFFF" />
              {mood === 'miss_you' ? (
                <Path
                  d="M45 64 Q50 59 55 64"
                  stroke={Pastel.text}
                  strokeWidth={3}
                  strokeLinecap="round"
                  fill="none"
                />
              ) : mood === 'hungry' ? (
                <Path
                  d="M43 60 Q50 69 57 60 Z"
                  fill={Pastel.coral}
                  stroke={Pastel.text}
                  strokeWidth={2.5}
                />
              ) : (
                <Path
                  d="M44 60 Q50 66 56 60"
                  stroke={Pastel.text}
                  strokeWidth={3}
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
  aura: {
    position: 'absolute',
    borderWidth: 2,
  },
});
