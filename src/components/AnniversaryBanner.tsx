import { CalendarHeart, Pencil, Sparkles } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BouncyPressable } from '@/components/BouncyPressable';
import { MonoFont, Pastel, RoundedFont } from '@/constants/pastelTheme';
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
 * Isolated leaf timer so ticking every second NEVER re-renders parent cards or lists.
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
    <View style={styles.liveClockWrapper}>
      <View style={styles.bigDaysRow}>
        <Text style={styles.bigDaysNumber}>{days}</Text>
        <Text style={styles.bigDaysLabel}>Hari Bersama</Text>
      </View>
      <View style={styles.timeChipsRow}>
        <View style={styles.timeChip}>
          <Text style={styles.timeValue}>{pad(hours)}</Text>
          <Text style={styles.timeUnit}>jam</Text>
        </View>
        <Text style={styles.timeColon}>:</Text>
        <View style={styles.timeChip}>
          <Text style={styles.timeValue}>{pad(minutes)}</Text>
          <Text style={styles.timeUnit}>mnt</Text>
        </View>
        <Text style={styles.timeColon}>:</Text>
        <View style={[styles.timeChip, styles.timeChipAccent]}>
          <Text style={[styles.timeValue, { color: Pastel.coralDark }]}>{pad(seconds)}</Text>
          <Text style={[styles.timeUnit, { color: Pastel.coralDark }]}>dtk</Text>
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
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.titlePill}>
          <CalendarHeart size={15} color={Pastel.coralDark} />
          <Text style={styles.titlePillText}>
            {coupleTitle} • {p1Name} & {p2Name}
          </Text>
        </View>

        <BouncyPressable onPress={onPressEdit} style={styles.editButton} accessibilityLabel="Edit Profil Pasangan">
          <Pencil size={15} color={Pastel.textMuted} />
        </BouncyPressable>
      </View>

      <LiveClockRow startDate={anniversaryDate} />

      <View style={styles.countdownBox}>
        <View style={styles.countdownTop}>
          <View style={styles.countdownBadge}>
            <Sparkles size={13} color={Pastel.taro} />
            <Text style={styles.countdownBadgeText}>
              {info.isTodayAnniversary
                ? `Happy ${info.annivNumber}th Anniversary! 🎉`
                : `Menuju Anniv ke-${info.annivNumber} • ${info.daysLeft} hari lagi`}
            </Text>
          </View>
          <Text style={styles.sinceText}>Sejak {formatIndonesianDate(anniversaryDate)}</Text>
        </View>

        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.max(8, Math.round(info.progressRatio * 100))}%` },
            ]}
          />
        </View>

        <View style={styles.milestoneRow}>
          <Text style={styles.milestoneText}>
            🎯 Target {info.nextMilestoneDays} hari: {info.daysToMilestone} hari lagi
          </Text>
          <Text style={styles.milestoneText}>{info.nextDateFormatted}</Text>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: Pastel.white,
    borderRadius: 28,
    padding: 18,
    borderWidth: 2,
    borderColor: Pastel.border,
    shadowColor: '#D9A7B8',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 4,
    gap: 14,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  titlePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Pastel.coralSoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    flexShrink: 1,
  },
  titlePillText: {
    fontFamily: RoundedFont,
    fontSize: 13,
    fontWeight: '700',
    color: Pastel.coralDark,
  },
  editButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Pastel.bg,
    borderWidth: 1.5,
    borderColor: Pastel.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveClockWrapper: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  bigDaysRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  bigDaysNumber: {
    fontFamily: RoundedFont,
    fontSize: 48,
    fontWeight: '800',
    color: Pastel.text,
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
  },
  bigDaysLabel: {
    fontFamily: RoundedFont,
    fontSize: 18,
    fontWeight: '700',
    color: Pastel.coral,
  },
  timeChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeChip: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
    backgroundColor: Pastel.bg,
    borderWidth: 1.5,
    borderColor: Pastel.border,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  timeChipAccent: {
    backgroundColor: Pastel.coralSoft,
    borderColor: '#FFC7D6',
  },
  timeValue: {
    fontFamily: MonoFont,
    fontSize: 15,
    fontWeight: '700',
    color: Pastel.text,
    fontVariant: ['tabular-nums'],
  },
  timeUnit: {
    fontFamily: RoundedFont,
    fontSize: 11,
    fontWeight: '600',
    color: Pastel.textMuted,
  },
  timeColon: {
    fontFamily: MonoFont,
    fontSize: 15,
    fontWeight: '700',
    color: Pastel.textSoft,
  },
  countdownBox: {
    backgroundColor: Pastel.taroSoft,
    borderRadius: 20,
    padding: 13,
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#DFD5FF',
  },
  countdownTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  countdownBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  countdownBadgeText: {
    fontFamily: RoundedFont,
    fontSize: 13,
    fontWeight: '700',
    color: '#5C44D6',
  },
  sinceText: {
    fontFamily: RoundedFont,
    fontSize: 11.5,
    fontWeight: '600',
    color: Pastel.textMuted,
  },
  progressTrack: {
    height: 9,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: Pastel.taro,
  },
  milestoneRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  milestoneText: {
    fontFamily: RoundedFont,
    fontSize: 11.5,
    fontWeight: '600',
    color: '#6E5AA8',
  },
});
