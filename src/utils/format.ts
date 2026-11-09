export function formatTime(time?: string | null): string {
  if (!time) return '?';
  const [h, m] = time.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return '?';
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

export function formatTimeRange(start?: string | null, end?: string | null): string {
  if (!start || !end) return 'Time TBD';
  return `${formatTime(start)} - ${formatTime(end)}`;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateLong(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function isSameDate(a: string, b: string): boolean {
  return a === b;
}

export function getMaxSelectableDate(maxAdvanceDays: number): string | null {
  if (!maxAdvanceDays || maxAdvanceDays <= 0) return null;
  return toISODate(addDays(new Date(), maxAdvanceDays));
}

export function describeAdvanceWindow(maxAdvanceDays: number): string {
  if (!maxAdvanceDays || maxAdvanceDays <= 0) return 'Any future date';
  if (maxAdvanceDays === 1) return 'Up to 1 day ahead';
  if (maxAdvanceDays < 30) return `Up to ${maxAdvanceDays} days ahead`;
  if (maxAdvanceDays < 60) return 'Up to about 1 month ahead';
  if (maxAdvanceDays < 120) return 'Up to about 3 months ahead';
  if (maxAdvanceDays < 365) return 'Up to about 6 months ahead';
  return 'Up to 1 year ahead';
}

/**
 * ⭐ Booking reference prefix — changed from `PJ` (PickleJoe) to `SP` (Smash Point).
 * Example output: SPK7M2XQ
 */
export function generateReferenceCode(): string {
  const prefix = 'SP';
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${prefix}${code}`;
}

export function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function getMonthMatrix(year: number, month: number): Date[][] {
  const firstDay = new Date(year, month, 1);
  const startDay = firstDay.getDay();
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - startDay);

  const weeks: Date[][] = [];
  let current = new Date(startDate);
  for (let w = 0; w < 6; w++) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(new Date(current));
      current = addDays(current, 1);
    }
    weeks.push(week);
    if (week[6].getMonth() !== month && week[0].getMonth() !== month) break;
  }
  return weeks;
}