import { Calendar, ChevronLeft, ChevronRight, Keyboard as KeyboardIcon, X } from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { BouncyPressable } from '@/components/BouncyPressable';
import { KeyboardModalSheet } from '@/components/KeyboardModalSheet';
import {
  BodyFontBold,
  BodyFontSemi,
  Pastel,
  RoundedFont,
} from '@/constants/pastelTheme';
import { formatIndonesianDate } from '@/utils/dateCalc';
import { triggerMediumHaptic } from '@/utils/haptics';

const MONTHS_FULL = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
];

const WEEKDAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

function toIsoDate(year: number, monthIdx: number, day: number): string {
  const m = String(monthIdx + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

function parseIsoOrFallback(val: string): { year: number; month: number; day: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(val.trim());
  if (match) {
    const year = parseInt(match[1], 10);
    const month = Math.min(11, Math.max(0, parseInt(match[2], 10) - 1));
    const day = Math.min(31, Math.max(1, parseInt(match[3], 10)));
    return { year, month, day };
  }
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth(), day: now.getDate() };
}

interface DatePickerFieldProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  allowFreeText?: boolean;
  quickPresets?: { label: string; value: string }[];
  compact?: boolean;
}

export const DatePickerField = React.memo(function DatePickerField({
  value,
  onChange,
  placeholder = 'Pilih atau ketik tanggal...',
  allowFreeText = false,
  quickPresets,
  compact = false,
}: DatePickerFieldProps) {
  const [pickerVisible, setPickerVisible] = useState(false);
  const [typingMode, setTypingMode] = useState(false);

  const initialParsed = useMemo(() => parseIsoOrFallback(value), [value]);
  const [viewYear, setViewYear] = useState(initialParsed.year);
  const [viewMonth, setViewMonth] = useState(initialParsed.month);
  const [showYearGrid, setShowYearGrid] = useState(false);
  const [draftText, setDraftText] = useState(value);

  const openPicker = useCallback(() => {
    triggerMediumHaptic();
    const parsed = parseIsoOrFallback(value);
    setViewYear(parsed.year);
    setViewMonth(parsed.month);
    setDraftText(value);
    setShowYearGrid(false);
    setPickerVisible(true);
  }, [value]);

  const isIsoDate = /^\d{4}-\d{2}-\d{2}$/.test(value.trim());

  const displayLabel = useMemo(() => {
    const trimmed = value.trim();
    if (!trimmed) return placeholder;
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return `${formatIndonesianDate(trimmed)} (${trimmed})`;
    }
    return trimmed;
  }, [placeholder, value]);

  const daysMatrix = useMemo(() => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
    const totalDays = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDayOfMonth; i++) cells.push(null);
    for (let d = 1; d <= totalDays; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [viewMonth, viewYear]);

  const yearsList = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const list: number[] = [];
    for (let y = currentYear + 3; y >= currentYear - 25; y--) {
      list.push(y);
    }
    return list;
  }, []);

  const handlePrevMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m === 0) {
        setViewYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
  }, []);

  const handleNextMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m === 11) {
        setViewYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
  }, []);

  const handleSelectDay = useCallback(
    (day: number) => {
      triggerMediumHaptic();
      const iso = toIsoDate(viewYear, viewMonth, day);
      onChange(iso);
      setDraftText(iso);
      setPickerVisible(false);
    },
    [onChange, viewMonth, viewYear]
  );

  const handleApplyTyped = useCallback(() => {
    onChange(draftText.trim());
    setPickerVisible(false);
  }, [draftText, onChange]);

  return (
    <View style={styles.wrap}>
      {typingMode ? (
        <View style={styles.inlineInputRow}>
          <TextInput
            value={value}
            onChangeText={onChange}
            placeholder={allowFreeText ? 'Contoh: Sabtu Sore / 2026-08-17' : 'YYYY-MM-DD'}
            placeholderTextColor={Pastel.textSoft}
            style={[styles.inlineInput, compact && { paddingVertical: 10 }]}
            autoFocus
          />
          <BouncyPressable onPress={openPicker} style={styles.modeIconBtn}>
            <Calendar size={17} color={Pastel.coral} />
          </BouncyPressable>
        </View>
      ) : (
        <View style={styles.inlineInputRow}>
          <BouncyPressable
            onPress={openPicker}
            style={[styles.pickerBtn, compact && { paddingVertical: 11 }]}>
            <Calendar size={16} color={Pastel.coral} />
            <Text
              numberOfLines={1}
              style={[
                styles.pickerBtnText,
                !value.trim() && { color: Pastel.textSoft, fontFamily: RoundedFont },
              ]}>
              {displayLabel}
            </Text>
          </BouncyPressable>

          <BouncyPressable
            onPress={() => setTypingMode(true)}
            style={styles.modeIconBtn}
            accessibilityLabel="Ketik tanggal manual">
            <KeyboardIcon size={17} color={Pastel.textMuted} />
          </BouncyPressable>
        </View>
      )}

      <KeyboardModalSheet
        visible={pickerVisible}
        onRequestClose={() => setPickerVisible(false)}
        maxHeightRatio={0.86}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Pilih Tanggal</Text>
          <BouncyPressable
            onPress={() => setPickerVisible(false)}
            style={styles.closeBtn}>
            <X size={18} color={Pastel.textMuted} />
          </BouncyPressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.modalScroll}>
          <View style={styles.manualBox}>
            <Text style={styles.manualLabel}>Ketik langsung atau klik kalender:</Text>
            <View style={styles.manualRow}>
              <TextInput
                value={draftText}
                onChangeText={setDraftText}
                placeholder={allowFreeText ? 'YYYY-MM-DD atau Sabtu Sore' : 'YYYY-MM-DD'}
                placeholderTextColor={Pastel.textSoft}
                style={styles.manualInput}
              />
              <BouncyPressable onPress={handleApplyTyped} style={styles.applyBtn}>
                <Text style={styles.applyBtnText}>Pakai</Text>
              </BouncyPressable>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.presetRow}>
            <BouncyPressable
              onPress={() => {
                const t = new Date();
                const iso = toIsoDate(t.getFullYear(), t.getMonth(), t.getDate());
                onChange(iso);
                setPickerVisible(false);
              }}
              style={styles.presetChip}>
              <Text style={styles.presetText}>Hari Ini</Text>
            </BouncyPressable>

            {quickPresets?.map((preset) => (
              <BouncyPressable
                key={preset.label}
                onPress={() => {
                  onChange(preset.value);
                  setPickerVisible(false);
                }}
                style={styles.presetChip}>
                <Text style={styles.presetText}>{preset.label}</Text>
              </BouncyPressable>
            ))}
          </ScrollView>

          <View style={styles.calNav}>
            <BouncyPressable onPress={handlePrevMonth} style={styles.navArrow}>
              <ChevronLeft size={18} color={Pastel.text} />
            </BouncyPressable>

            <BouncyPressable
              onPress={() => setShowYearGrid((v) => !v)}
              style={styles.monthYearBtn}>
              <Text style={styles.monthYearText}>
                {MONTHS_FULL[viewMonth]} {viewYear} {showYearGrid ? '▲' : '▼'}
              </Text>
            </BouncyPressable>

            <BouncyPressable onPress={handleNextMonth} style={styles.navArrow}>
              <ChevronRight size={18} color={Pastel.text} />
            </BouncyPressable>
          </View>

          {showYearGrid ? (
            <View style={styles.yearMonthContainer}>
              <Text style={styles.subTitle}>Pilih Tahun</Text>
              <View style={styles.yearGrid}>
                {yearsList.map((yr) => {
                  const active = yr === viewYear;
                  return (
                    <BouncyPressable
                      key={yr}
                      onPress={() => setViewYear(yr)}
                      style={[styles.yearCell, active && styles.yearCellActive]}>
                      <Text
                        style={[
                          styles.yearCellText,
                          active && styles.yearCellTextActive,
                        ]}>
                        {yr}
                      </Text>
                    </BouncyPressable>
                  );
                })}
              </View>

              <Text style={styles.subTitle}>Pilih Bulan</Text>
              <View style={styles.monthGrid}>
                {MONTHS_SHORT.map((mName, idx) => {
                  const active = idx === viewMonth;
                  return (
                    <BouncyPressable
                      key={mName}
                      onPress={() => {
                        setViewMonth(idx);
                        setShowYearGrid(false);
                      }}
                      style={[styles.monthCell, active && styles.yearCellActive]}>
                      <Text
                        style={[
                          styles.yearCellText,
                          active && styles.yearCellTextActive,
                        ]}>
                        {mName}
                      </Text>
                    </BouncyPressable>
                  );
                })}
              </View>
            </View>
          ) : (
            <View style={styles.calendarBox}>
              <View style={styles.weekdayRow}>
                {WEEKDAYS.map((wd) => (
                  <Text key={wd} style={styles.weekdayText}>
                    {wd}
                  </Text>
                ))}
              </View>

              <View style={styles.daysGrid}>
                {daysMatrix.map((day, idx) => {
                  if (!day) {
                    return <View key={`empty-${idx}`} style={styles.dayCell} />;
                  }
                  const iso = toIsoDate(viewYear, viewMonth, day);
                  const selected = isIsoDate && value.trim() === iso;
                  return (
                    <BouncyPressable
                      key={iso}
                      onPress={() => handleSelectDay(day)}
                      style={[styles.dayCell, selected && styles.dayCellSelected]}>
                      <Text
                        style={[
                          styles.dayText,
                          selected && styles.dayTextSelected,
                        ]}>
                        {day}
                      </Text>
                    </BouncyPressable>
                  );
                })}
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardModalSheet>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
  },
  inlineInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pickerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Pastel.bgMuted,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  pickerBtnText: {
    flex: 1,
    fontFamily: BodyFontSemi,
    fontSize: 13.5,
    lineHeight: 19,
    color: Pastel.text,
  },
  inlineInput: {
    flex: 1,
    backgroundColor: Pastel.bgMuted,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontFamily: RoundedFont,
    fontSize: 13.5,
    lineHeight: 19,
    color: Pastel.text,
  },
  modeIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: Pastel.bgMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    fontFamily: BodyFontBold,
    fontSize: 18,
    lineHeight: 25,
    color: Pastel.text,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Pastel.bgMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: {
    gap: 12,
    paddingBottom: 14,
  },
  manualBox: {
    gap: 8,
    backgroundColor: Pastel.bg,
    borderRadius: 18,
    padding: 12,
  },
  manualLabel: {
    fontFamily: BodyFontSemi,
    fontSize: 12,
    lineHeight: 17,
    color: Pastel.textMuted,
  },
  manualRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  manualInput: {
    flex: 1,
    backgroundColor: Pastel.white,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontFamily: RoundedFont,
    fontSize: 13.5,
    lineHeight: 19,
    color: Pastel.text,
  },
  applyBtn: {
    backgroundColor: Pastel.coral,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
  },
  applyBtnText: {
    fontFamily: BodyFontBold,
    fontSize: 13,
    lineHeight: 18,
    color: Pastel.pureWhite,
  },
  presetRow: {
    gap: 8,
    paddingVertical: 2,
  },
  presetChip: {
    backgroundColor: Pastel.coralSoft,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  presetText: {
    fontFamily: BodyFontSemi,
    fontSize: 12.5,
    lineHeight: 17,
    color: Pastel.coralDark,
  },
  calNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navArrow: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Pastel.bgMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthYearBtn: {
    backgroundColor: Pastel.bgMuted,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
  },
  monthYearText: {
    fontFamily: BodyFontBold,
    fontSize: 14,
    lineHeight: 19,
    color: Pastel.text,
  },
  calendarBox: {
    backgroundColor: Pastel.bg,
    borderRadius: 20,
    padding: 12,
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    fontFamily: BodyFontSemi,
    fontSize: 11.5,
    lineHeight: 16,
    color: Pastel.textMuted,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.285%',
    aspectRatio: 1.12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  dayCellSelected: {
    backgroundColor: Pastel.coral,
  },
  dayText: {
    fontFamily: BodyFontSemi,
    fontSize: 13.5,
    lineHeight: 19,
    color: Pastel.text,
  },
  dayTextSelected: {
    color: Pastel.pureWhite,
    fontFamily: BodyFontBold,
  },
  yearMonthContainer: {
    backgroundColor: Pastel.bg,
    borderRadius: 20,
    padding: 14,
    gap: 10,
  },
  subTitle: {
    fontFamily: BodyFontBold,
    fontSize: 12.5,
    lineHeight: 17,
    color: Pastel.textMuted,
  },
  yearGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  yearCell: {
    width: '23%',
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: Pastel.white,
    alignItems: 'center',
  },
  monthCell: {
    width: '23%',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Pastel.white,
    alignItems: 'center',
  },
  yearCellActive: {
    backgroundColor: Pastel.coral,
  },
  yearCellText: {
    fontFamily: BodyFontSemi,
    fontSize: 12.5,
    lineHeight: 17,
    color: Pastel.text,
  },
  yearCellTextActive: {
    color: Pastel.pureWhite,
    fontFamily: BodyFontBold,
  },
});
