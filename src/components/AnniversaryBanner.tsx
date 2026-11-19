import { Heart, Pencil } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BouncyPressable } from '@/components/BouncyPressable';
import {
  BodyFontBold,
  BodyFontSemi,
  Pastel,
  RoundedFont,
} from '@/constants/pastelTheme';
import { useCoupleStore } from '@/store/useCoupleStore';
import {
  formatIndonesianDate,
  getNextAnniversaryInfo,
  getTogetherBreakdown,
} from '@/utils/dateCalc';

interface AnniversaryBannerProps {
  onPressEdit: () => void;
}

/**
 * Isolated leaf timer so ticking every second never re-renders parent cards or lists.
 */
const LiveClockRow = React.memo(function LiveClockRow({
  startDate,
}: {
  startDate: string;
}) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const { days, hours, minutes, seconds } = getTogetherBreakdown(startDate, nowMs);
  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <View style={styles.heroStats}>
      <View style={styles.daysRow}>
        <Text style={styles.bigDaysNumber} maxFontSizeMultiplier={1.15}>
          {days}
        </Text>
        <View style={styles.daysTextCol}>
          <Text style={styles.daysLabel} maxFontSizeMultiplier={1.2}>
            hari bersama
          </Text>
          <Text style={styles.sinceLabel} maxFontSizeMultiplier={1.2}>
            Sejak {formatIndonesianDate(startDate)}
          </Text>
        </View>
      </View>

      <View style={styles.clockPill}>
        <Text style={styles.clockText} maxFontSizeMultiplier={1.2}>
          {pad(hours)}j : {pad(minutes)}m : {pad(seconds)}d
        </Text>
      </View>
    </View>
  );
});

export const AnniversaryBanner = React.memo(function AnniversaryBanner({
  onPressEdit,
}: AnniversaryBannerProps) {
  const coupleTitle = useCoupleStore((s) => s.coupleTitle);
  const anniversaryDate = useCoupleStore((s) => s.anniversaryDate);
  const p1Name = useCoupleStore((s) => s.partners.p1.name);
  const p2Name = useCoupleStore((s) => s.partners.p2.name);

  const info = useMemo(
    () => getNextAnniversaryInfo(anniversaryDate, Date.now()),
    [anniversaryDate]
  );

  return (
    <View style={styles.heroCard}>
      {/* Soft ambient decorative circles inside hero */}
      <View style={styles.orbTopRight} pointerEvents="none" />
      <View style={styles.orbBottomLeft} pointerEvents="none" />

      <View style={styles.topRow}>
        <View style={styles.titleWrap}>
          <View style={styles.heartPill}>
            <Heart size={13} color={Pastel.pureWhite} fill={Pastel.pureWhite} />
          </View>
          <View style={styles.titleTextCol}>
            <Text style={styles.coupleTitle} numberOfLines={1} maxFontSizeMultiplier={1.2}>
              {coupleTitle}
            </Text>
            <Text style={styles.partnersSub} numberOfLines={1} maxFontSizeMultiplier={1.2}>
              {p1Name} &amp; {p2Name}
            </Text>
          </View>
        </View>

        <BouncyPressable
          onPress={onPressEdit}
          style={styles.editBtn}
          accessibilityLabel="Edit Profil Pasangan">
          <Pencil size={14} color={Pastel.pureWhite} />
        </BouncyPressable>
      </View>

      <LiveClockRow startDate={anniversaryDate} />

      <View style={styles.milestoneBox}>
        <View style={styles.milestoneTop}>
          <Text style={styles.milestoneTitle} maxFontSizeMultiplier={1.2}>
            {info.isTodayAnniversary
              ? `Happy Anniv ke-${info.annivNumber}!`
              : `Anniv ke-${info.annivNumber} · ${info.daysLeft} hari lagi`}
          </Text>
          <Text style={styles.milestoneDate} maxFontSizeMultiplier={1.2}>
            {info.nextDateFormatted}
          </Text>
        </View>

        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.max(8, Math.round(info.progressRatio * 100))}%` },
            ]}
          />
        </View>

        <View style={styles.milestoneBottom}>
          <Text style={styles.milestoneFoot} maxFontSizeMultiplier={1.2}>
            Target {info.nextMilestoneDays} hari · sisa {info.daysToMilestone} hari
          </Text>
          <Text style={styles.milestonePct} maxFontSizeMultiplier={1.2}>
            {Math.round(info.progressRatio * 100)}%
          </Text>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: Pastel.coral,
    borderRadius: 26,
    padding: 20,
    gap: 16,
    overflow: 'hidden',
    shadowColor: '#FF5C7A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 5,
  },
  orbTopRight: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.14)',
    top: -48,
    right: -32,
  },
  orbBottomLeft: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255,255,255,0.09)',
    bottom: -36,
    left: -24,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  heartPill: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.24)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleTextCol: {
    flex: 1,
  },
  coupleTitle: {
    fontFamily: BodyFontBold,
    fontSize: 17,
    lineHeight: 23,
    color: Pastel.pureWhite,
  },
  partnersSub: {
    fontFamily: RoundedFont,
    fontSize: 12.5,
    lineHeight: 17,
    color: 'rgba(255,255,255,0.88)',
  },
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroStats: {
    gap: 10,
  },
  daysRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    flexWrap: 'wrap',
  },
  bigDaysNumber: {
    fontFamily: BodyFontBold,
    fontSize: 44,
    lineHeight: 54,
    color: Pastel.pureWhite,
    fontVariant: ['tabular-nums'],
    flexShrink: 0,
    paddingRight: 2,
  },
  daysTextCol: {
    paddingBottom: 6,
    flexShrink: 1,
  },
  daysLabel: {
    fontFamily: BodyFontBold,
    fontSize: 15,
    lineHeight: 21,
    color: Pastel.pureWhite,
    paddingRight: 2,
  },
  sinceLabel: {
    fontFamily: RoundedFont,
    fontSize: 12,
    lineHeight: 17,
    color: 'rgba(255,255,255,0.86)',
    paddingRight: 2,
  },
  clockPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: 999,
  },
  clockText: {
    fontFamily: BodyFontSemi,
    fontSize: 12.5,
    lineHeight: 18,
    color: Pastel.pureWhite,
    fontVariant: ['tabular-nums'],
    paddingRight: 2,
  },
  milestoneBox: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 18,
    padding: 13,
    gap: 8,
  },
  milestoneTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
  },
  milestoneTitle: {
    fontFamily: BodyFontSemi,
    fontSize: 13,
    lineHeight: 18,
    color: Pastel.pureWhite,
    paddingRight: 2,
  },
  milestoneDate: {
    fontFamily: RoundedFont,
    fontSize: 12,
    lineHeight: 17,
    color: 'rgba(255,255,255,0.88)',
    flexShrink: 0,
    paddingRight: 2,
  },
  progressTrack: {
    height: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.28)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: Pastel.pureWhite,
  },
  milestoneBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  milestoneFoot: {
    fontFamily: RoundedFont,
    fontSize: 11.5,
    lineHeight: 16,
    color: 'rgba(255,255,255,0.88)',
    flexShrink: 1,
    paddingRight: 2,
  },
  milestonePct: {
    fontFamily: BodyFontBold,
    fontSize: 12,
    lineHeight: 16,
    color: Pastel.pureWhite,
    flexShrink: 0,
    paddingRight: 2,
  },
});
