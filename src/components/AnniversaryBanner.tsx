import { SlidersHorizontal } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BouncyPressable } from '@/components/BouncyPressable';
import {
  BodyFontSemi,
  MonoFont,
  MonoFontBold,
  Pastel,
  RoundedFont,
  SerifFontSemi,
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
    <View style={styles.counterLedger}>
      <View style={styles.daysBlock}>
        <Text style={styles.bigDaysNumber}>{days}</Text>
        <View style={styles.daysLabelCol}>
          <Text style={styles.daysUnitKicker}>HARI BERSAMA</Text>
          <Text style={styles.daysSinceSub}>
            Sejak {formatIndonesianDate(startDate)}
          </Text>
        </View>
      </View>

      <View style={styles.clockStrip}>
        <View style={styles.clockUnit}>
          <Text style={styles.clockValue}>{pad(hours)}</Text>
          <Text style={styles.clockLabel}>JAM</Text>
        </View>
        <Text style={styles.clockSep}>:</Text>
        <View style={styles.clockUnit}>
          <Text style={styles.clockValue}>{pad(minutes)}</Text>
          <Text style={styles.clockLabel}>MNT</Text>
        </View>
        <Text style={styles.clockSep}>:</Text>
        <View style={[styles.clockUnit, styles.clockUnitLive]}>
          <Text style={[styles.clockValue, { color: Pastel.coral }]}>{pad(seconds)}</Text>
          <Text style={[styles.clockLabel, { color: Pastel.coral }]}>DTK</Text>
        </View>
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
    <View style={styles.ledgerCard}>
      {/* Editorial Issue Top Rule */}
      <View style={styles.topRow}>
        <View style={styles.editionCol}>
          <View style={styles.sealSquare}>
            <Text style={styles.sealSquareText}>NO.01</Text>
          </View>
          <View>
            <Text style={styles.coupleHeadline} numberOfLines={1}>
              {coupleTitle}
            </Text>
            <Text style={styles.partnersLine} numberOfLines={1}>
              {p1Name} &amp; {p2Name}
            </Text>
          </View>
        </View>

        <BouncyPressable
          onPress={onPressEdit}
          style={styles.editButton}
          accessibilityLabel="Edit Profil Pasangan">
          <SlidersHorizontal size={15} color={Pastel.textMuted} />
        </BouncyPressable>
      </View>

      <View style={styles.hairline} />

      <LiveClockRow startDate={anniversaryDate} />

      {/* Bottom Milestone Rule */}
      <View style={styles.milestonePanel}>
        <View style={styles.milestoneHeader}>
          <Text style={styles.annivCaption}>
            {info.isTodayAnniversary
              ? `Anniversary ke-${info.annivNumber} hari ini`
              : `Menuju Anniv ke-${info.annivNumber} · ${info.daysLeft} hari lagi`}
          </Text>
          <Text style={styles.nextDateMono}>{info.nextDateFormatted}</Text>
        </View>

        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.max(6, Math.round(info.progressRatio * 100))}%` },
            ]}
          />
        </View>

        <View style={styles.milestoneFooter}>
          <Text style={styles.milestoneDetail}>
            Target {info.nextMilestoneDays} hari · sisa {info.daysToMilestone} hari
          </Text>
          <Text style={styles.milestonePct}>
            {Math.round(info.progressRatio * 100)}%
          </Text>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  ledgerCard: {
    backgroundColor: Pastel.bgElevated,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: Pastel.borderStrong,
    gap: 14,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  editionCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  sealSquare: {
    borderWidth: 1.5,
    borderColor: Pastel.coral,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 4,
    backgroundColor: Pastel.coralSoft,
  },
  sealSquareText: {
    fontFamily: MonoFontBold,
    fontSize: 10,
    color: Pastel.coral,
    letterSpacing: 0.6,
  },
  coupleHeadline: {
    fontFamily: SerifFontSemi,
    fontSize: 19,
    color: Pastel.text,
    lineHeight: 22,
  },
  partnersLine: {
    fontFamily: RoundedFont,
    fontSize: 12,
    color: Pastel.textMuted,
  },
  editButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: Pastel.bg,
    borderWidth: 1,
    borderColor: Pastel.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hairline: {
    height: 1,
    backgroundColor: Pastel.border,
  },
  counterLedger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  daysBlock: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
  },
  bigDaysNumber: {
    fontFamily: SerifFontSemi,
    fontSize: 48,
    color: Pastel.text,
    letterSpacing: -1.5,
    lineHeight: 50,
    fontVariant: ['tabular-nums'],
  },
  daysLabelCol: {
    gap: 2,
  },
  daysUnitKicker: {
    fontFamily: MonoFontBold,
    fontSize: 10.5,
    color: Pastel.coral,
    letterSpacing: 1,
  },
  daysSinceSub: {
    fontFamily: RoundedFont,
    fontSize: 11.5,
    color: Pastel.textMuted,
  },
  clockStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Pastel.bg,
    borderWidth: 1,
    borderColor: Pastel.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 6,
  },
  clockUnit: {
    alignItems: 'center',
    minWidth: 26,
  },
  clockUnitLive: {},
  clockValue: {
    fontFamily: MonoFontBold,
    fontSize: 14,
    color: Pastel.text,
    fontVariant: ['tabular-nums'],
  },
  clockLabel: {
    fontFamily: MonoFont,
    fontSize: 8.5,
    color: Pastel.textSoft,
    letterSpacing: 0.4,
  },
  clockSep: {
    fontFamily: MonoFont,
    fontSize: 13,
    color: Pastel.borderStrong,
    marginBottom: 8,
  },
  milestonePanel: {
    backgroundColor: Pastel.bgMuted,
    borderRadius: 12,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: Pastel.border,
  },
  milestoneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  annivCaption: {
    fontFamily: BodyFontSemi,
    fontSize: 12.5,
    color: Pastel.text,
  },
  nextDateMono: {
    fontFamily: MonoFont,
    fontSize: 11,
    color: Pastel.textMuted,
  },
  progressTrack: {
    height: 5,
    borderRadius: 999,
    backgroundColor: Pastel.bgElevated,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: Pastel.coral,
  },
  milestoneFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  milestoneDetail: {
    fontFamily: RoundedFont,
    fontSize: 11,
    color: Pastel.textMuted,
  },
  milestonePct: {
    fontFamily: MonoFont,
    fontSize: 11,
    color: Pastel.coral,
  },
});
