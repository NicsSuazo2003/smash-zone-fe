export const APP_CONFIG = {
  name: import.meta.env.VITE_APP_NAME ?? 'Smash Point',
  demoMode: (import.meta.env.VITE_DEMO_MODE ?? 'false') === 'true',
  
  // ✅ FIXED: Defaults to YOUR Smash Point backend, not the old client's
  apiUrl: import.meta.env.VITE_API_BASE_URL ?? 'https://smashpoint-booking-api.onrender.com',
  
  tagline: 'Dink Fast. Smash Hard.',
  established: '2026',
  paymentNumber: '09XX XXX XXXX', // TODO: real GCash number
  paymentAccountName: 'Smash Point Pickle Sports Center',
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
  email: 'admin@smashpoint.com',
  password: 'Admin123!',
};

export const BOOKING_STATUS_META: Record<
  string,
  { label: string; color: string; bg: string; border: string; dot: string }
> = {
  // Pending payment: Amber / Gold
  pending_payment: {
    label: 'Pending Payment',
    color: 'text-amber-300',
    bg: 'bg-amber-950/40',
    border: 'border-amber-500/40',
    dot: 'bg-amber-400',
  },
  // Payment submitted: Electric Sky Blue
  payment_submitted: {
    label: 'Payment Submitted',
    color: 'text-sky-300',
    bg: 'bg-sky-950/40',
    border: 'border-sky-500/40',
    dot: 'bg-sky-400',
  },
  // Confirmed: Emerald Green
  confirmed: {
    label: 'Confirmed',
    color: 'text-emerald-300',
    bg: 'bg-emerald-950/40',
    border: 'border-emerald-500/40',
    dot: 'bg-emerald-400',
  },
  // Completed: Cool Slate Navy
  completed: {
    label: 'Completed',
    color: 'text-slate-300',
    bg: 'bg-slate-900/60',
    border: 'border-slate-700/80',
    dot: 'bg-slate-400',
  },
  // Cancelled: Neutral Slate / Charcoal (No red)
  cancelled: {
    label: 'Cancelled',
    color: 'text-neutral-400',
    bg: 'bg-neutral-900/60',
    border: 'border-neutral-800',
    dot: 'bg-neutral-500',
  },
  // Rejected: Calm Zinc (No red)
  rejected: {
    label: 'Declined',
    color: 'text-zinc-300',
    bg: 'bg-zinc-900/70',
    border: 'border-zinc-700',
    dot: 'bg-zinc-400',
  },
  // Expired: Quiet Muted Neutral
  expired: {
    label: 'Expired',
    color: 'text-neutral-400',
    bg: 'bg-neutral-900/50',
    border: 'border-neutral-800/80',
    dot: 'bg-neutral-600',
  },
  // Refunded: Purple
  refunded: {
    label: 'Refunded',
    color: 'text-purple-300',
    bg: 'bg-purple-950/40',
    border: 'border-purple-500/40',
    dot: 'bg-purple-400',
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
 * Booking reference prefix: SP (Smash Point).
 * Example: SPK7M2XQ
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