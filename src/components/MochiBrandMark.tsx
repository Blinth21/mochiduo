import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, Stop } from 'react-native-svg';

import { BodyFontBold, Pastel, RoundedFont } from '@/constants/pastelTheme';

interface MochiBrandMarkProps {
  size?: number;
  showWordmark?: boolean;
  subtitle?: string;
}

/**
 * Clean, stroke-free soft clay twin mochi brand mark matching the MochiDuo app icon.
 */
export const MochiBrandMark = React.memo(function MochiBrandMark({
  size = 38,
  showWordmark = true,
  subtitle,
}: MochiBrandMarkProps) {
  const svgHeight = Math.round(size * 0.78);

  return (
    <View style={styles.row}>
      <View style={styles.iconPill}>
        <Svg width={size} height={svgHeight} viewBox="0 0 68 52">
          <Defs>
            <LinearGradient id="mochiPeachGrad" x1="0" y1="0" x2="0.4" y2="1">
              <Stop offset="0" stopColor="#FFF5EB" />
              <Stop offset="1" stopColor="#FFE1C8" />
            </LinearGradient>
            <LinearGradient id="mochiMintGrad" x1="0" y1="0" x2="0.4" y2="1">
              <Stop offset="0" stopColor="#E4F5E8" />
              <Stop offset="1" stopColor="#C1E4CC" />
            </LinearGradient>
          </Defs>

          {/* Soft ground shadows */}
          <Ellipse cx={20} cy={46} rx={13} ry={3} fill="#E9D7D0" opacity={0.45} />
          <Ellipse cx={48} cy={46} rx={13} ry={3} fill="#C6DCD0" opacity={0.45} />

          {/* Left creamy-peach mochi (zero outline stroke) */}
          <Path
            d="M4 33 C4 20, 11 14, 19.5 14 C28 14, 34 20, 34 33 C34 42, 28 45, 19.5 45 C11 45, 4 42, 4 33 Z"
            fill="url(#mochiPeachGrad)"
          />
          <Ellipse cx={13} cy={22} rx={4.5} ry={2.4} fill="#FFFFFF" opacity={0.55} />
          <Ellipse cx={12.5} cy={34} rx={3.4} ry={2} fill="#FF8FA3" opacity={0.45} />
          <Ellipse cx={27} cy={34} rx={3.1} ry={1.8} fill="#FF8FA3" opacity={0.38} />
          <Circle cx={15.5} cy={30.5} r={2} fill="#5C3D34" />
          <Path
            d="M22.5 29.5 Q25 27.5 27.2 29.5"
            stroke="#5C3D34"
            strokeWidth={2}
            strokeLinecap="round"
            fill="none"
          />
          <Path
            d="M18.3 32 Q20 33.8 21.7 32"
            stroke="#5C3D34"
            strokeWidth={1.7}
            strokeLinecap="round"
            fill="none"
          />

          {/* Right pastel mint mochi (zero outline stroke) */}
          <Path
            d="M34 33 C34 20, 40 14, 48.5 14 C57 14, 64 20, 64 33 C64 42, 57 45, 48.5 45 C40 45, 34 42, 34 33 Z"
            fill="url(#mochiMintGrad)"
          />
          <Ellipse cx={43} cy={22} rx={4.5} ry={2.4} fill="#FFFFFF" opacity={0.5} />
          <Ellipse cx={41} cy={34} rx={3.2} ry={1.8} fill="#FF8FA3" opacity={0.38} />
          <Ellipse cx={55.5} cy={34} rx={3.4} ry={2} fill="#FF8FA3" opacity={0.42} />
          <Circle cx={43.5} cy={30.2} r={2} fill="#463B3D" />
          <Circle cx={53} cy={30.8} r={2} fill="#463B3D" />
          <Circle cx={48.3} cy={32.2} r={1.2} fill="#463B3D" />

          {/* Floating glossy strawberry heart above */}
          <Path
            d="M34 7.5 C34 4.2, 29.5 3.6, 29.5 7.4 C29.5 10.6, 34 13.6, 34 13.6 C34 13.6, 38.5 10.6, 38.5 7.4 C38.5 3.6, 34 4.2, 34 7.5 Z"
            fill={Pastel.coral}
          />
          <Circle cx={32} cy={6.6} r={1} fill="#FFFFFF" opacity={0.55} />
        </Svg>
      </View>

      {showWordmark ? (
        <View style={styles.wordmarkCol}>
          <Text style={styles.wordmark} numberOfLines={1}>
            MochiDuo
          </Text>
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
    flexShrink: 1,
  },
  iconPill: {
    backgroundColor: '#FFF6F4',
    borderRadius: 14,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  wordmarkCol: {
    flexShrink: 1,
    justifyContent: 'center',
  },
  wordmark: {
    fontFamily: BodyFontBold,
    fontSize: 18,
    lineHeight: 24,
    color: Pastel.text,
  },
  subtitle: {
    fontFamily: RoundedFont,
    fontSize: 12,
    lineHeight: 16,
    color: Pastel.textMuted,
  },
});
