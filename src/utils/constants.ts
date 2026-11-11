export const APP_CONFIG = {
  name: import.meta.env.VITE_APP_NAME ?? 'Smash Zone',
  fullName: 'Smash Zone by Jerjen',
  subTitle: 'Recreational Hub',
  demoMode: (import.meta.env.VITE_DEMO_MODE ?? 'false') === 'true',

  // Render API default for Smash Zone
  apiUrl:
    import.meta.env.VITE_API_BASE_URL ??
    'https://smashzone-booking-api.onrender.com',

  tagline: 'Smash hard, play smart. Tandag City’s premier pickleball facility.',
  established: '2026',
  paymentNumber: '09XX XXX XXXX', // TODO: real GCash number
  paymentAccountName: 'Smash Zone Recreational Hub',
  developer: 'Astravex Systems',
  paymentTimerSeconds: 15 * 60,
  defaultMaxAdvanceBookingDays: 90,
};

export const FIXED_SLOT = {
  start: '16:00',
  end: '18:00',
  label: '2hr Fixed',
  description: '4:00 PM - 6:00 PM',
  hours: 2,
};

export const ADMIN_CREDENTIALS = {
  email: 'admin@smashzone.com',
  password: 'Admin123!',
};

export const BOOKING_STATUS_META: Record<
  string,
  { label: string; color: string; bg: string; border: string; dot: string }
> = {
  // Pending payment: Warm Gold / Amber
  pending_payment: {
    label: 'Pending Payment',
    color: 'text-amber-800',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
  },
  // Payment submitted: Clear Sky Blue
  payment_submitted: {
    label: 'Payment Submitted',
    color: 'text-sky-800',
    bg: 'bg-sky-50',
    border: 'border-sky-200',
    dot: 'bg-sky-500',
  },
  // Confirmed: Crisp Forest / Emerald Green
  confirmed: {
    label: 'Confirmed',
    color: 'text-emerald-800',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
  },
  // Completed: Neutral Slate Navy
  completed: {
    label: 'Completed',
    color: 'text-slate-700',
    bg: 'bg-slate-100',
    border: 'border-slate-200',
    dot: 'bg-slate-500',
  },
  // Cancelled: Neutral Muted Gray
  cancelled: {
    label: 'Cancelled',
    color: 'text-slate-600',
    bg: 'bg-slate-100',
    border: 'border-slate-200',
    dot: 'bg-slate-400',
  },
  // Rejected: Zinc / Ash
  rejected: {
    label: 'Declined',
    color: 'text-zinc-700',
    bg: 'bg-zinc-100',
    border: 'border-zinc-300',
    dot: 'bg-zinc-500',
  },
  // Expired: Soft Muted Slate
  expired: {
    label: 'Expired',
    color: 'text-slate-500',
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    dot: 'bg-slate-400',
  },
  // Refunded: Brand Purple Accent Tint
  refunded: {
    label: 'Refunded',
    color: 'text-[#3D1164]',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    dot: 'bg-[#5A1B91]',
  },
};

export const COURT_IMAGES = {
  hero: '/images/bg.jpg',
  court1: '/images/bg.jpg',
  court2: '/images/bg.jpg',
  court3: '/images/bg.jpg',
  gallery1: '/images/bg.jpg',
  gallery2: '/images/bg.jpg',
  gallery3: '/images/bg.jpg',
  gallery4: '/images/bg.jpg',
  heroSlideshow: ['/images/bg.jpg'],
};

export const BOOKING_COPY = {
  policyTitle: 'Important Booking Policy',
  policyDesc:
    "All bookings are final and non-refundable. Can't make it? You are welcome to find a replacement player to take your slot and settle payment with them directly.",
  policyLinkText: 'Read our Refund Policy',
  priceDisclaimer: '* Prices may vary based on peak hours, weekends, and court selection.',
  bookingInstructions: 'Select a date, then choose your preferred time slots.',
  howItWorks: {
    step03Title: 'Secure Your Slot',
    step03Desc: 'Complete payment via your preferred method and upload the proof of payment.',
    step04Title: 'Get Confirmed',
    step04Desc:
      "We'll quickly verify your payment and send your booking confirmation. See you on the court!",
  },
  emptyState: {
    titleToday: 'No slots available today',
    titleFuture: 'No slots available for this date',
    description: "Try selecting a different date above. We're open 7 AM to 12 AM daily.",
  },
};

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
  return `${formatTime(start)} – ${formatTime(end)}`;
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
 * Booking reference prefix: SZ (Smash Zone).
 * Example: SZK7M2XQ
 */
export function generateReferenceCode(): string {
  const prefix = 'SZ';
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