const MONTHS_ID = [
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

export function parseLocalDate(isoDate: string): Date {
  const parts = isoDate.split('-').map((n) => parseInt(n, 10));
  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    return new Date(2024, 1, 14, 0, 0, 0, 0);
  }
  return new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);
}

export function formatIndonesianDate(isoDate: string): string {
  const d = parseLocalDate(isoDate);
  return `${d.getDate()} ${MONTHS_ID[d.getMonth()]} ${d.getFullYear()}`;
}

export function getTogetherBreakdown(startDateIso: string, nowMs: number) {
  const start = parseLocalDate(startDateIso);
  const diffMs = Math.max(0, nowMs - start.getTime());

  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const years = Math.floor(days / 365);
  const remainingDaysAfterYears = days % 365;
  const months = Math.floor(remainingDaysAfterYears / 30);

  return {
    days,
    hours,
    minutes,
    seconds,
    years,
    months,
  };
}

export function getNextAnniversaryInfo(startDateIso: string, nowMs: number) {
  const start = parseLocalDate(startDateIso);
  const now = new Date(nowMs);

  let nextYear = now.getFullYear();
  let nextAnniv = new Date(nextYear, start.getMonth(), start.getDate(), 0, 0, 0, 0);

  // If today is past this year's anniversary date (strictly past the day), aim for next year
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  if (nextAnniv.getTime() < todayMidnight.getTime()) {
    nextYear += 1;
    nextAnniv = new Date(nextYear, start.getMonth(), start.getDate(), 0, 0, 0, 0);
  }

  const prevAnniv = new Date(nextYear - 1, start.getMonth(), start.getDate(), 0, 0, 0, 0);
  const daysLeft = Math.max(
    0,
    Math.ceil((nextAnniv.getTime() - todayMidnight.getTime()) / 86400000)
  );
  const span = Math.max(1, nextAnniv.getTime() - prevAnniv.getTime());
  const progressRatio = Math.min(1, Math.max(0, (todayMidnight.getTime() - prevAnniv.getTime()) / span));

  const annivNumber = Math.max(1, nextYear - start.getFullYear());
  const nextDateFormatted = `${nextAnniv.getDate()} ${MONTHS_ID[nextAnniv.getMonth()]} ${nextAnniv.getFullYear()}`;

  // Also compute next 100-day milestone
  const currentDays = Math.floor(Math.max(0, nowMs - start.getTime()) / 86400000);
  const nextMilestoneDays = (Math.floor(currentDays / 100) + 1) * 100;
  const daysToMilestone = nextMilestoneDays - currentDays;

  return {
    annivNumber,
    daysLeft,
    isTodayAnniversary: daysLeft === 0,
    nextDateFormatted,
    progressRatio,
    nextMilestoneDays,
    daysToMilestone,
  };
}

export function formatRelativeTime(timestampMs: number, nowMs: number = Date.now()): string {
  const diffMin = Math.floor(Math.max(0, nowMs - timestampMs) / 60000);
  if (diffMin < 1) return 'Baru saja';
  if (diffMin < 60) return `${diffMin} mnt lalu`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} jam lalu`;
  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays} hari lalu`;
}

export function getLocalDateKey(nowMs: number = Date.now()): string {
  const d = new Date(nowMs);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function shiftDateKey(dateKey: string, deltaDays: number): string {
  const d = parseLocalDate(dateKey);
  d.setDate(d.getDate() + deltaDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
