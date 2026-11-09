// src/pages/admin/Dashboard.tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CalendarDays,
  PhilippinePeso,
  Clock,
  CheckCircle2,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  AlertCircle,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useAdminStore } from '@/stores/adminStore';
import {
  formatCurrency,
  formatDate,
  toISODate,
  getMonthMatrix,
  todayISO,
} from '@/utils/format';
import type { AdminView, Booking } from '@/types';

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const ADMIN_BOOKINGS_PATH = '/admin/bookings';
const LIST_PAGE_SIZE = 20;

type StatusFilter = 'all' | 'pending_payment' | 'confirmed' | 'cancelled';

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending_payment', label: 'Pending payment' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'cancelled', label: 'Cancelled' },
];

const STATUS_STYLE: Record<string, { chip: string; dot: string; label: string }> = {
  confirmed: {
    chip: 'bg-accent-500/25 text-accent-300 border border-accent-400/30',
    dot: 'bg-accent-400',
    label: 'Confirmed',
  },
  pending_payment: {
    chip: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
    dot: 'bg-amber-400',
    label: 'Pending payment',
  },
  cancelled: {
    chip: 'bg-red-500/20 text-red-300 border border-red-500/30 line-through',
    dot: 'bg-red-400',
    label: 'Cancelled',
  },
};
const DEFAULT_STATUS_STYLE = {
  chip: 'bg-primary-500/25 text-primary-200 border border-primary-400/30',
  dot: 'bg-primary-300',
  label: 'Other',
};
const statusStyle = (status: string) => STATUS_STYLE[status] ?? DEFAULT_STATUS_STYLE;

function formatTimeShort(time: string): string {
  if (!time || time === '?' || time === 'N/A') return time || '?';
  const [hour, minute] = time.split(':').map(Number);
  if (Number.isNaN(hour)) return time;
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return minute === 0 ? `${hour12}${ampm}` : `${hour12}:${String(minute).padStart(2, '0')}${ampm}`;
}

function formatSlotTime(slot: any): string {
  if (!slot) return '?';
  const start = slot.start_time ? formatTimeShort(slot.start_time) : '?';
  const end = slot.end_time ? formatTimeShort(slot.end_time) : '?';
  return `${start}-${end}`;
}

function firstStart(b: any): string {
  return b?.slots?.[0]?.start_time ?? '';
}

function customerName(b: any): string {
  return b?.customer?.name || 'Unknown';
}

function bookingKey(b: any, i: number): string {
  return b?.id ?? `${b?.reference_code ?? 'b'}-${i}`;
}

export function Dashboard() {
  const analytics = useAdminStore((state) => state.analytics);
  const bookings = useAdminStore((state) => state.bookings || []);
  const loadingAnalytics = useAdminStore((state) => state.loadingAnalytics);
  const loadingBookings = useAdminStore((state) => state.loadingBookings);
  const loadAnalytics = useAdminStore((state) => state.loadAnalytics);
  const loadBookings = useAdminStore((state) => state.loadBookings);

  const [view, setView] = useState<AdminView>('calendar');
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(todayISO());
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [visibleCount, setVisibleCount] = useState(LIST_PAGE_SIZE);
  const [activeBar, setActiveBar] = useState<string | null>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Date Range State for Analytics
  const [range, setRange] = useState<'last7' | 'thisMonth' | 'custom'>('last7');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  useEffect(() => {
    loadAnalytics();
    loadBookings();
  }, [loadAnalytics, loadBookings]);

  useEffect(() => {
    setVisibleCount(LIST_PAGE_SIZE);
  }, [statusFilter]);

  const handleApplyRange = (type: 'last7' | 'thisMonth' | 'custom', start?: string, end?: string) => {
    setRange(type);
    if (type === 'custom' && start && end) {
      setCustomStart(start);
      setCustomEnd(end);
      loadAnalytics(start, end);
    } else if (type === 'thisMonth') {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      loadAnalytics(firstDay, lastDay);
    } else {
      loadAnalytics();
    }
  };

  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const weeks = getMonthMatrix(year, month);

  const bookingsByDate = useMemo(() => {
    const map = new Map<string, Booking[]>();
    bookings.forEach((b) => {
      if (!b || !b.date) return;
      const existing = map.get(b.date) ?? [];
      existing.push(b);
      map.set(b.date, existing);
    });
    map.forEach((list) => list.sort((a, b) => firstStart(a).localeCompare(firstStart(b))));
    return map;
  }, [bookings]);

  const selectedDateBookings = selectedDate ? bookingsByDate.get(selectedDate) ?? [] : [];

  const filteredList = useMemo(() => {
    return bookings
      .filter((b) => b && (statusFilter === 'all' || b.status === statusFilter))
      .sort((a, b) => {
        const byDate = (b.date ?? '').localeCompare(a.date ?? '');
        return byDate || firstStart(b).localeCompare(firstStart(a));
      });
  }, [bookings, statusFilter]);

  const pendingCount = analytics?.pending_payments ?? 0;
  const statsLoading = loadingAnalytics && !analytics;

  const selectDate = (iso: string) => {
    setSelectedDate(iso);
    if (typeof window !== 'undefined' && window.innerWidth < 640) {
      setTimeout(() => drawerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    }
  };

  const goToToday = () => {
    setCalendarDate(new Date());
    setSelectedDate(todayISO());
  };

  const statCards = [
    {
      label: 'Total Bookings',
      value: analytics?.total_bookings ?? 0,
      icon: CalendarDays,
      color: 'text-primary-300',
      bg: 'bg-primary-500/20 border border-primary-400/30',
    },
    {
      label: 'Total Revenue',
      value: formatCurrency(analytics?.total_revenue ?? 0),
      icon: PhilippinePeso,
      color: 'text-accent-300',
      bg: 'bg-accent-500/20 border border-accent-400/30',
    },
    {
      label: 'Completed Bookings',
      value: analytics?.completed_bookings ?? 0,
      icon: CheckCircle2,
      color: 'text-sky-300',
      bg: 'bg-sky-500/20 border border-sky-400/30',
    },
    {
      label: 'Pending Payments',
      value: pendingCount,
      icon: Clock,
      color: 'text-amber-300',
      bg: 'bg-amber-500/20 border border-amber-400/30',
      needsAction: pendingCount > 0,
    },
  ];

  const revenueDays = analytics?.revenue_by_day ?? [];
  const maxRevenue = Math.max(...revenueDays.map((d) => d.revenue), 1);
  const periodTotal = revenueDays.reduce((sum, d) => sum + d.revenue, 0);
  const activeDay = revenueDays.find((d) => d.date === activeBar);

  return (
    <AdminLayout>
      <div className="container-page py-6 sm:py-8 text-cream">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:mb-8 sm:flex-row sm:items-center">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-cream sm:text-3xl">
              Dashboard
            </h1>
            <p className="mt-1 text-xs text-cream-muted sm:text-sm">
              Overview of your court bookings and revenue
            </p>
          </div>
          
          {/* Date Range Filter */}
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-neutral-700 bg-neutral-900/80 p-1.5 shadow-sm">
            <CalendarIcon className="ml-2 h-4 w-4 text-primary-300 hidden sm:block" />
            <button
              onClick={() => handleApplyRange('last7')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${range === 'last7' ? 'bg-primary-500 text-white' : 'text-cream-muted hover:text-cream'}`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => handleApplyRange('thisMonth')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${range === 'thisMonth' ? 'bg-primary-500 text-white' : 'text-cream-muted hover:text-cream'}`}
            >
              This Month
            </button>
            <div className="flex items-center gap-1 sm:gap-2">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="rounded-lg border border-neutral-600 bg-neutral-950 px-2 py-1 text-xs text-cream [color-scheme:dark] outline-none focus:border-primary-500"
              />
              <span className="text-cream-muted text-xs">-</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="rounded-lg border border-neutral-600 bg-neutral-950 px-2 py-1 text-xs text-cream [color-scheme:dark] outline-none focus:border-primary-500"
              />
              <button
                onClick={() => handleApplyRange('custom', customStart, customEnd)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${range === 'custom' ? 'bg-accent-500 text-neutral-950' : 'bg-neutral-800 text-cream-muted hover:text-cream'}`}
              >
                Apply
              </button>
            </div>
          </div>
        </div>

        {pendingCount > 0 && (
          <Link
            to={ADMIN_BOOKINGS_PATH}
            className="mb-6 flex items-center gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 transition hover:border-amber-400/70 hover:bg-amber-500/15 sm:mb-8"
          >
            <AlertCircle className="h-5 w-5 shrink-0 text-amber-300" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-amber-200">
                {pendingCount} booking{pendingCount !== 1 ? 's' : ''} waiting for payment verification
              </p>
              <p className="text-xs text-cream-muted">
                Customers can&apos;t get confirmed until you review these.
              </p>
            </div>
            <span className="flex shrink-0 items-center gap-1 text-xs font-bold text-amber-200">
              Review
              <ChevronRight className="h-4 w-4" />
            </span>
          </Link>
        )}

        <div className="mb-6 grid gap-3.5 sm:mb-8 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          {statCards.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`card rounded-2xl border bg-neutral-900/80 p-4 sm:p-5 shadow-xl backdrop-blur-sm ${
                  stat.needsAction ? 'border-amber-500/40' : 'border-neutral-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-xl shadow-inner ${stat.bg}`}
                  >
                    <Icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </div>
                <p className="mt-3 text-2xl font-extrabold text-cream sm:text-3xl tracking-tight">
                  {statsLoading ? '—' : stat.value}
                </p>
                <p className="text-xs font-semibold uppercase tracking-wider text-cream-muted">
                  {stat.label}
                </p>
              </motion.div>
            );
          })}
        </div>

        {revenueDays.length > 0 && (
          <div className="mb-6 card rounded-2xl border border-neutral-700 bg-neutral-900/80 p-5 shadow-xl backdrop-blur-sm sm:mb-8 sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary-300" />
                <h2 className="font-display text-base font-bold text-cream sm:text-lg">
                  Revenue Trend
                  <span className="ml-1.5 text-xs font-medium text-cream-muted sm:text-sm">
                    ({revenueDays.length} day{revenueDays.length !== 1 ? 's' : ''})
                  </span>
                </h2>
              </div>
              <p className="text-xs text-cream-muted sm:text-sm" aria-live="polite">
                {activeDay ? (
                  <>
                    {new Date(activeDay.date + 'T00:00:00').toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                    :{' '}
                    <span className="font-bold text-primary-200">
                      {formatCurrency(activeDay.revenue)}
                    </span>
                  </>
                ) : (
                  <>
                    Period total:{' '}
                    <span className="font-bold text-primary-200">{formatCurrency(periodTotal)}</span>
                    <span className="hidden sm:inline"> · tap a bar for details</span>
                  </>
                )}
              </p>
            </div>

            <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
              <div className="flex h-48 items-stretch gap-2 sm:h-56">
                {revenueDays.map((day) => {
                  const heightPct = (day.revenue / maxRevenue) * 100;
                  const isActive = activeBar === day.date;
                  const dayLabel = new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  });
                  return (
                    <button
                      key={day.date}
                      type="button"
                      onClick={() => setActiveBar(isActive ? null : day.date)}
                      aria-pressed={isActive}
                      aria-label={`${dayLabel}: ${formatCurrency(day.revenue)}`}
                      className="flex min-w-[52px] flex-1 flex-col items-center gap-1.5"
                    >
                      <span className="hidden text-[11px] font-bold text-primary-200 whitespace-nowrap sm:block">
                        {day.revenue > 0 ? formatCurrency(day.revenue) : '—'}
                      </span>
                      <div className="flex w-full flex-1 items-end">
                        <div
                          className={`w-full rounded-t-lg bg-gradient-to-t from-primary-600 via-primary-500 to-primary-400 transition-all shadow-sm ${
                            isActive ? 'ring-2 ring-white/70' : 'hover:from-primary-500 hover:to-primary-300'
                          }`}
                          style={{ height: `${Math.max(heightPct, 3)}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-medium text-cream-muted whitespace-nowrap sm:text-[11px]">
                        {dayLabel}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div className="card rounded-2xl border border-neutral-700 bg-neutral-900/80 p-5 shadow-xl backdrop-blur-sm sm:p-6">
          <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-display text-base font-bold text-cream sm:text-lg">
              Bookings {view === 'calendar' ? 'Calendar' : 'List'}
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              {view === 'calendar' && (
                <div className="mr-1 flex items-center gap-1 sm:mr-2">
                  <button
                    onClick={() => setCalendarDate(new Date(year, month - 1, 1))}
                    className="rounded-lg border border-neutral-700 bg-neutral-800/80 p-1.5 text-cream-muted transition hover:border-primary-400 hover:text-primary-300"
                    aria-label="Previous month"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="min-w-[110px] text-center text-xs font-bold text-cream sm:min-w-32 sm:text-sm">
                    {monthNames[month]} {year}
                  </span>
                  <button
                    onClick={() => setCalendarDate(new Date(year, month + 1, 1))}
                    className="rounded-lg border border-neutral-700 bg-neutral-800/80 p-1.5 text-cream-muted transition hover:border-primary-400 hover:text-primary-300"
                    aria-label="Next month"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <button
                    onClick={goToToday}
                    className="ml-1 rounded-lg border border-neutral-700 bg-neutral-800/80 px-2.5 py-1.5 text-xs font-semibold text-cream-muted transition hover:border-primary-400 hover:text-primary-300"
                  >
                    Today
                  </button>
                </div>
              )}
              <div className="flex rounded-xl border border-neutral-700 bg-neutral-950/60 p-1" role="group" aria-label="Switch view">
                <button
                  onClick={() => setView('calendar')}
                  aria-label="Calendar view"
                  aria-pressed={view === 'calendar'}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    view === 'calendar'
                      ? 'bg-primary-500 text-white shadow-glow-blue'
                      : 'text-cream-muted hover:text-cream'
                  }`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Calendar</span>
                </button>
                <button
                  onClick={() => setView('list')}
                  aria-label="List view"
                  aria-pressed={view === 'list'}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    view === 'list'
                      ? 'bg-primary-500 text-white shadow-glow-blue'
                      : 'text-cream-muted hover:text-cream'
                  }`}
                >
                  <List className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">List</span>
                </button>
              </div>
            </div>
          </div>

          {loadingBookings && bookings.length === 0 ? (
            <LoadingSpinner className="py-14" />
          ) : view === 'calendar' ? (
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-cream-muted">
                {Object.entries(STATUS_STYLE).map(([key, s]) => (
                  <span key={key} className="flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                    {s.label}
                  </span>
                ))}
              </div>

              <div className="mb-2 grid grid-cols-7 gap-1">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                  <div
                    key={d}
                    className="py-1 text-center text-[11px] font-bold uppercase tracking-wider text-cream-muted sm:py-2 sm:text-xs"
                  >
                    <span className="hidden sm:inline">{d}</span>
                    <span className="sm:hidden">{d[0]}</span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                {weeks.flat().map((day) => {
                  const iso = toISODate(day);
                  const dayBookings = bookingsByDate.get(iso) ?? [];
                  const activeBookings = dayBookings.filter((b) => b.status !== 'cancelled');
                  const hasPending = dayBookings.some((b) => b.status === 'pending_payment');
                  const isCurrentMonth = day.getMonth() === month;
                  const isToday = iso === todayISO();
                  const isSelected = iso === selectedDate;
                  const dotStatuses = Array.from(new Set(dayBookings.map((b) => b.status))).slice(0, 3);

                  return (
                    <button
                      key={iso}
                      onClick={() => selectDate(iso)}
                      aria-pressed={isSelected}
                      aria-label={`${formatDate(iso)}: ${activeBookings.length} booking${
                        activeBookings.length !== 1 ? 's' : ''
                      }${hasPending ? ', has pending payments' : ''}`}
                      className={`min-h-[56px] rounded-xl border p-1 text-left transition sm:min-h-24 sm:p-2 ${
                        isSelected
                          ? 'border-primary-400 bg-primary-500/20 shadow-glow-blue'
                          : isCurrentMonth
                            ? hasPending
                              ? 'border-amber-500/40 bg-neutral-950/60 hover:border-amber-400/70'
                              : 'border-neutral-700 bg-neutral-950/60 hover:border-primary-400/50 hover:bg-neutral-800/60'
                            : 'border-neutral-800/50 bg-neutral-950/20 opacity-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-bold ${
                            isToday
                              ? 'flex h-5 w-5 items-center justify-center rounded-full bg-primary-500 text-white font-black'
                              : 'text-cream'
                          }`}
                        >
                          {day.getDate()}
                        </span>
                        {activeBookings.length > 0 && (
                          <span className="rounded-full border border-primary-400/40 bg-primary-500/30 px-1.5 text-[10px] font-black text-primary-200">
                            {activeBookings.length}
                          </span>
                        )}
                      </div>

                      <div className="mt-1.5 flex gap-1 sm:hidden">
                        {dotStatuses.map((s) => (
                          <span key={s} className={`h-1.5 w-1.5 rounded-full ${statusStyle(s).dot}`} />
                        ))}
                      </div>

                      <div className="mt-1 hidden space-y-1 sm:block">
                        {dayBookings.slice(0, 2).map((b, i) => {
                          const start = firstStart(b) ? formatTimeShort(firstStart(b)) : '';
                          const first = customerName(b).split(' ')[0];
                          return (
                            <div
                              key={bookingKey(b, i)}
                              className={`truncate rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${statusStyle(b.status).chip}`}
                            >
                              {start} {first}
                            </div>
                          );
                        })}
                        {dayBookings.length > 2 && (
                          <div className="pl-0.5 text-[10px] font-semibold text-primary-300">
                            +{dayBookings.length - 2} more
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {selectedDate && (
                <div
                  ref={drawerRef}
                  className="mt-5 scroll-mt-20 border-t border-neutral-700 pt-4 sm:mt-6 sm:pt-5"
                >
                  <h3 className="mb-3 text-sm font-bold text-primary-300">
                    {formatDate(selectedDate)}
                    <span className="ml-2 font-medium text-cream-muted">
                      {selectedDateBookings.length} booking
                      {selectedDateBookings.length !== 1 ? 's' : ''}
                    </span>
                  </h3>
                  {selectedDateBookings.length === 0 ? (
                    <p className="py-6 text-center text-xs font-medium text-cream-muted sm:text-sm">
                      No bookings for this date.
                    </p>
                  ) : (
                    <div className="space-y-2.5">
                      {selectedDateBookings.map((b, i) => (
                        <BookingRow key={bookingKey(b, i)} booking={b} showDate={false} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="no-scrollbar -mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1">
                {STATUS_FILTERS.map((f) => {
                  const count =
                    f.key === 'all'
                      ? bookings.length
                      : bookings.filter((b) => b?.status === f.key).length;
                  const active = statusFilter === f.key;
                  return (
                    <button
                      key={f.key}
                      onClick={() => setStatusFilter(f.key)}
                      aria-pressed={active}
                      className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                        active
                          ? 'border-primary-400 bg-primary-500 text-white'
                          : 'border-neutral-600 bg-neutral-800/80 text-cream-muted hover:text-cream'
                      }`}
                    >
                      {f.label} <span className="opacity-70">({count})</span>
                    </button>
                  );
                })}
              </div>

              <div className="space-y-2.5">
                {filteredList.length === 0 ? (
                  <p className="py-8 text-center text-sm font-medium text-cream-muted">
                    {bookings.length === 0
                      ? 'No bookings yet. New reservations will appear here.'
                      : 'No bookings match this filter.'}
                  </p>
                ) : (
                  filteredList.slice(0, visibleCount).map((b, i) => (
                    <BookingRow key={bookingKey(b, i)} booking={b} showDate showReference />
                  ))
                )}
              </div>

              {filteredList.length > visibleCount && (
                <div className="mt-4 text-center">
                  <button
                    onClick={() => setVisibleCount((c) => c + LIST_PAGE_SIZE)}
                    className="rounded-xl border border-neutral-600 bg-neutral-800/80 px-4 py-2 text-xs font-semibold text-cream-muted transition hover:border-primary-400 hover:text-primary-300"
                  >
                    Show more ({filteredList.length - visibleCount} left)
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

function BookingRow({
  booking: b,
  showDate,
  showReference = false,
}: {
  booking: any;
  showDate: boolean;
  showReference?: boolean;
}) {
  const courts = useAdminStore((state) => state.courts);

  const courtNames = useMemo(() => {
    if (!b || !b.slots) return b?.court_name || '';
    const ids = Array.from(new Set(b.slots.map((s: any) => s.court_id).filter(Boolean)));
    if (ids.length === 0) return b.court_name;
    const names = ids
      .map((id) => courts.find((c) => c.id === id)?.name)
      .filter(Boolean);
    return names.length > 0 ? names.join(', ') : b.court_name;
  }, [b, courts]);

  const slotDisplay = b.slots?.map((s: any) => formatSlotTime(s)).join(', ') || 'No slots';

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-neutral-700 bg-neutral-950/70 p-3.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 min-w-[3.5rem] shrink-0 items-center justify-center rounded-xl border border-primary-400/30 bg-primary-500/20 px-2 text-xs font-black text-primary-200">
          {firstStart(b) ? formatTimeShort(firstStart(b)) : 'N/A'}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-cream">{customerName(b)}</p>
          <p className="truncate text-xs text-cream-muted">
            {showReference && (
              <>
                <span className="font-mono text-primary-300">{b.reference_code || 'No ref'}</span> ·{' '}
              </>
            )}
            {showDate && <>{formatDate(b.date)} · </>}
            {courtNames} · {slotDisplay}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <span className="text-sm font-bold text-accent-400">
          {formatCurrency(b.total_amount || 0)}
        </span>
        <StatusBadge status={b.status} size="sm" />
      </div>
    </div>
  );
}