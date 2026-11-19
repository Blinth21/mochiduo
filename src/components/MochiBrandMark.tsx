import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';

import { MonoFont, Pastel, SerifFontSemi } from '@/constants/pastelTheme';

interface MochiBrandMarkProps {
  size?: number;
  showWordmark?: boolean;
  subtitle?: string;
}

/**
 * Custom vector emblem of MochiDuo: two nestled wagashi mochi silhouettes
 * (warm cream + Uji matcha) joined by a small vermilion hanko heart mark.
 */
export const MochiBrandMark = React.memo(function MochiBrandMark({
  size = 34,
  showWordmark = true,
  subtitle,
}: MochiBrandMarkProps) {
  const svgHeight = Math.round(size * 0.72);

  return (
    <View style={styles.row}>
      <View style={styles.sealFrame}>
        <Svg width={size} height={svgHeight} viewBox="0 0 64 46">
          {/* Left cream mochi */}
          <Path
            d="M4 27 C4 14, 11 8, 19.5 8 C27.5 8, 32.5 14, 32.5 27 C32.5 36.5, 27 40, 19 40 C10.5 40, 4 36.5, 4 27 Z"
            fill="#F9F4E8"
            stroke={Pastel.text}
            strokeWidth={2.6}
          />
          {/* Left blush cheek */}
          <Ellipse cx={15} cy={27} rx={3.3} ry={2} fill="#C84B31" opacity={0.45} />
          {/* Left serene wink eye */}
          <Path
            d="M21 22 Q24 19.5 26.5 22"
            stroke={Pastel.text}
            strokeWidth={2.2}
            strokeLinecap="round"
            fill="none"
          />

          {/* Right matcha mochi */}
          <Path
            d="M31.5 27 C31.5 14, 36.5 8, 44.5 8 C53 8, 60 14, 60 27 C60 36.5, 53.5 40, 45 40 C37 40, 31.5 36.5, 31.5 27 Z"
            fill="#C7D3AF"
            stroke={Pastel.text}
            strokeWidth={2.6}
          />
          {/* Right minimalist dot eyes */}
          <Circle cx={39.5} cy={22.5} r={1.8} fill={Pastel.text} />
          <Circle cx={48.5} cy={23.2} r={1.8} fill={Pastel.text} />

          {/* Tiny Vermilion Hanko Heart Seal between them */}
          <Path
            d="M32 23.5 C32 21.4, 29.4 21.2, 29.4 23.4 C29.4 25.5, 32 27.2, 32 27.2 C32 27.2, 34.6 25.5, 34.6 23.4 C34.6 21.2, 32 21.4, 32 23.5 Z"
            fill={Pastel.coral}
          />
        </Svg>
      </View>

      {showWordmark ? (
        <View style={styles.wordmarkCol}>
          <View style={styles.wordmarkRow}>
            <Text style={styles.wordmark}>MochiDuo</Text>
            <View style={styles.hankoDot} />
          </View>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sealFrame: {
    backgroundColor: Pastel.bgElevated,
    borderWidth: 1,
    borderColor: Pastel.borderStrong,
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 5,
  },
  wordmarkCol: {
    gap: 1,
  },
  wordmarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  wordmark: {
    fontFamily: SerifFontSemi,
    fontSize: 20,
    color: Pastel.text,
    letterSpacing: -0.3,
    lineHeight: 23,
  },
  hankoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Pastel.coral,
    marginTop: -6,
  },
  subtitle: {
    fontFamily: MonoFont,
    fontSize: 10.5,
    color: Pastel.textMuted,
    letterSpacing: 0.2,
  },
});
