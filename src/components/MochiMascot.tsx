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
import Svg, {
  Circle,
  Defs,
  Ellipse,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';

import { getMochiSkinSpec } from '@/constants/mochiduoPlay';
import type { MochiAccessoryId, MochiSkinId, MoodId } from '@/types/couple';

interface MochiMascotProps {
  bodyColor: string;
  auraColor: string;
  mood: MoodId;
  skinId?: MochiSkinId;
  accessoryId?: MochiAccessoryId;
  size?: number;
  delayMs?: number;
  disableAnimation?: boolean;
}

export const MochiMascot = React.memo(function MochiMascot({
  bodyColor,
  mood,
  skinId,
  accessoryId = 'none',
  size = 76,
  delayMs = 0,
  disableAnimation = false,
}: MochiMascotProps) {
  const isFocused = useIsFocused();
  const translateY = useSharedValue(0);
  const palette = getMochiSkinSpec(skinId, bodyColor);
  const gradId = `mochiBody_${palette.id}_${mood}_${accessoryId}`;

  useEffect(() => {
    if (disableAnimation || !isFocused) {
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
  }, [delayMs, disableAnimation, isFocused, translateY]);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const svgHeight = Math.round(size * 1.08);

  return (
    <View style={[styles.wrapper, { width: size + 8, height: svgHeight + 6 }]}>
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
        <Svg width={size} height={svgHeight} viewBox="0 -14 100 108">
          <Defs>
            <LinearGradient id={gradId} x1="0.2" y1="0" x2="0.6" y2="1">
              <Stop offset="0" stopColor={palette.top} />
              <Stop offset="1" stopColor={palette.bottom} />
            </LinearGradient>
          </Defs>

          {/* Back Accessory: Cat Ears (sit gently behind head curve) */}
          {accessoryId === 'cat_ears' ? (
            <>
              <Path d="M22 36 L26 8 Q32 4 38 14 L43 26 Z" fill={palette.top} />
              <Path d="M26 30 L28 13 L37 22 Z" fill="#FFB3C6" opacity={0.85} />
              <Path d="M78 36 L74 8 Q68 4 62 14 L57 26 Z" fill={palette.top} />
              <Path d="M74 30 L72 13 L63 22 Z" fill="#FFB3C6" opacity={0.85} />
            </>
          ) : null}

          {/* Back Accessory: Headphone Band */}
          {accessoryId === 'headphone' ? (
            <Path
              d="M15 52 C15 16, 85 16, 85 52"
              stroke="#9C84FF"
              strokeWidth={6}
              strokeLinecap="round"
              fill="none"
            />
          ) : null}

          {/* Soft borderless squishy mochi silhouette */}
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

          {/* Mood Facial Expressions */}
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
              <Path d="M44 62 Q50 72 56 62 Z" fill="#FF6F88" />
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

          {/* Front Accessory: Headphone Earcups */}
          {accessoryId === 'headphone' ? (
            <>
              <Rect x={7} y={44} width={11} height={22} rx={5.5} fill="#7B61FF" />
              <Rect x={10} y={48} width={5} height={14} rx={2.5} fill="#D8CBFF" />
              <Rect x={82} y={44} width={11} height={22} rx={5.5} fill="#7B61FF" />
              <Rect x={85} y={48} width={5} height={14} rx={2.5} fill="#D8CBFF" />
            </>
          ) : null}

          {/* Front Accessory: Pastel Shades */}
          {accessoryId === 'shades' ? (
            <>
              <Rect x={24} y={44} width={22} height={14} rx={6} fill="#2B2438" opacity={0.9} />
              <Rect x={54} y={44} width={22} height={14} rx={6} fill="#2B2438" opacity={0.9} />
              <Path d="M46 49 L54 49" stroke="#2B2438" strokeWidth={3.2} strokeLinecap="round" />
              <Path d="M29 47 L34 54" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" opacity={0.55} />
              <Path d="M59 47 L64 54" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" opacity={0.55} />
            </>
          ) : null}

          {/* Top Accessory: Cute Strawberry Bow */}
          {accessoryId === 'bow' ? (
            <>
              <Path d="M68 20 C60 12, 54 20, 62 25 Z" fill="#FF5C7A" />
              <Path d="M71 19 C77 8, 86 15, 76 23 Z" fill="#FF7D96" />
              <Circle cx={69.5} cy={21.5} r={4} fill="#E04260" />
            </>
          ) : null}

          {/* Top Accessory: Paris Beret */}
          {accessoryId === 'beret' ? (
            <>
              <Path
                d="M27 24 C29 6, 70 4, 75 21 C63 26, 38 27, 27 24 Z"
                fill="#FF6B86"
              />
              <Path
                d="M50 7 Q52 2 55 4"
                stroke="#B83B55"
                strokeWidth={3}
                strokeLinecap="round"
                fill="none"
              />
            </>
          ) : null}

          {/* Top Accessory: Golden Mini Crown */}
          {accessoryId === 'crown' ? (
            <>
              <Path
                d="M36 20 L34 4 L44 12 L50 1 L56 12 L66 4 L64 20 Z"
                fill="#FFD166"
              />
              <Circle cx={50} cy={13.5} r={2.2} fill="#FF5C7A" />
              <Circle cx={40} cy={15} r={1.8} fill="#7B61FF" />
              <Circle cx={60} cy={15} r={1.8} fill="#22A87A" />
            </>
          ) : null}
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
