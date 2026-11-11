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
    chip: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
    dot: 'bg-emerald-500',
    label: 'Confirmed',
  },
  pending_payment: {
    chip: 'bg-amber-50 text-amber-800 border border-amber-200',
    dot: 'bg-amber-500',
    label: 'Pending payment',
  },
  cancelled: {
    chip: 'bg-slate-100 text-slate-500 border border-slate-200 line-through',
    dot: 'bg-slate-400',
    label: 'Cancelled',
  },
};
const DEFAULT_STATUS_STYLE = {
  chip: 'bg-purple-50 text-[#3D1164] border border-purple-200',
  dot: 'bg-[#3D1164]',
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
      color: 'text-[#3D1164]',
      bg: 'bg-purple-50 border border-purple-200',
    },
    {
      label: 'Total Revenue',
      value: formatCurrency(analytics?.total_revenue ?? 0),
      icon: PhilippinePeso,
      color: 'text-[#FF7A00]',
      bg: 'bg-orange-50 border border-orange-200',
    },
    {
      label: 'Completed Bookings',
      value: analytics?.completed_bookings ?? 0,
      icon: CheckCircle2,
      color: 'text-emerald-700',
      bg: 'bg-emerald-50 border border-emerald-200',
    },
    {
      label: 'Pending Payments',
      value: pendingCount,
      icon: Clock,
      color: 'text-amber-800',
      bg: 'bg-amber-50 border border-amber-200',
      needsAction: pendingCount > 0,
    },
  ];

  const revenueDays = analytics?.revenue_by_day ?? [];
  const maxRevenue = Math.max(...revenueDays.map((d) => d.revenue), 1);
  const periodTotal = revenueDays.reduce((sum, d) => sum + d.revenue, 0);
  const activeDay = revenueDays.find((d) => d.date === activeBar);

  return (
    <AdminLayout>
      <div className="container-page py-6 sm:py-8 text-slate-900">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:mb-8 sm:flex-row sm:items-center">
          <div>
            <h1 className="font-display text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              Dashboard
            </h1>
            <p className="mt-1 text-xs text-slate-500 sm:text-sm">
              Overview of court bookings and facility revenue at Smash Zone
            </p>
          </div>

          {/* Date Range Filter */}
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xs">
            <CalendarIcon className="ml-2 h-4 w-4 text-slate-400 hidden sm:block" />
            <button
              onClick={() => handleApplyRange('last7')}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                range === 'last7'
                  ? 'bg-[#3D1164] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => handleApplyRange('thisMonth')}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                range === 'thisMonth'
                  ? 'bg-[#3D1164] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              This Month
            </button>
            <div className="flex items-center gap-1 sm:gap-2">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 outline-none focus:border-[#3D1164]"
              />
              <span className="text-slate-400 text-xs">-</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 outline-none focus:border-[#3D1164]"
              />
              <button
                onClick={() => handleApplyRange('custom', customStart, customEnd)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                  range === 'custom'
                    ? 'bg-[#FF7A00] text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Apply
              </button>
            </div>
          </div>
        </div>

        {pendingCount > 0 && (
          <Link
            to={ADMIN_BOOKINGS_PATH}
            className="mb-6 flex items-center gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 transition hover:bg-amber-100/70 sm:mb-8 shadow-xs"
          >
            <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-amber-950">
                {pendingCount} booking{pendingCount !== 1 ? 's' : ''} waiting for payment verification
              </p>
              <p className="text-xs text-amber-800">
                Review and approve receipts to finalize court slots.
              </p>
            </div>
            <span className="flex shrink-0 items-center gap-1 text-xs font-black text-[#FF7A00]">
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
                className={`rounded-3xl border bg-white p-5 shadow-xs transition hover:shadow-md ${
                  stat.needsAction ? 'border-amber-300' : 'border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-2xl ${stat.bg}`}
                  >
                    <Icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </div>
                <p className="mt-4 text-2xl font-black text-slate-900 sm:text-3xl tracking-tight">
                  {statsLoading ? '—' : stat.value}
                </p>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  {stat.label}
                </p>
              </motion.div>
            );
          })}
        </div>

        {revenueDays.length > 0 && (
          <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-xs sm:mb-8 sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-[#FF7A00]" />
                <h2 className="font-display text-base font-bold text-slate-900 sm:text-lg">
                  Revenue Trend
                  <span className="ml-1.5 text-xs font-semibold text-slate-400 sm:text-sm">
                    ({revenueDays.length} day{revenueDays.length !== 1 ? 's' : ''})
                  </span>
                </h2>
              </div>
              <p className="text-xs text-slate-500 sm:text-sm" aria-live="polite">
                {activeDay ? (
                  <>
                    {new Date(activeDay.date + 'T00:00:00').toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                    :{' '}
                    <span className="font-black text-[#FF7A00]">
                      {formatCurrency(activeDay.revenue)}
                    </span>
                  </>
                ) : (
                  <>
                    Period total:{' '}
                    <span className="font-black text-[#3D1164]">{formatCurrency(periodTotal)}</span>
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
                      <span className="hidden text-[11px] font-bold text-slate-700 whitespace-nowrap sm:block">
                        {day.revenue > 0 ? formatCurrency(day.revenue) : '—'}
                      </span>
                      <div className="flex w-full flex-1 items-end">
                        <div
                          className={`w-full rounded-t-xl bg-gradient-to-t from-[#3D1164] via-[#5A1B91] to-[#FF7A00] transition-all shadow-xs ${
                            isActive ? 'ring-2 ring-[#FF7A00]' : 'opacity-85 hover:opacity-100'
                          }`}
                          style={{ height: `${Math.max(heightPct, 4)}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-semibold text-slate-500 whitespace-nowrap sm:text-[11px]">
                        {dayLabel}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
          <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-display text-base font-bold text-slate-900 sm:text-lg">
              Bookings {view === 'calendar' ? 'Calendar' : 'List'}
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              {view === 'calendar' && (
                <div className="mr-1 flex items-center gap-1 sm:mr-2">
                  <button
                    onClick={() => setCalendarDate(new Date(year, month - 1, 1))}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-600 transition hover:bg-slate-100"
                    aria-label="Previous month"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="min-w-[110px] text-center text-xs font-bold text-slate-900 sm:min-w-32 sm:text-sm">
                    {monthNames[month]} {year}
                  </span>
                  <button
                    onClick={() => setCalendarDate(new Date(year, month + 1, 1))}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-600 transition hover:bg-slate-100"
                    aria-label="Next month"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <button
                    onClick={goToToday}
                    className="ml-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-100"
                  >
                    Today
                  </button>
                </div>
              )}
              <div className="flex rounded-2xl border border-slate-200 bg-slate-50 p-1" role="group" aria-label="Switch view">
                <button
                  onClick={() => setView('calendar')}
                  aria-pressed={view === 'calendar'}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                    view === 'calendar'
                      ? 'bg-[#3D1164] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Calendar</span>
                </button>
                <button
                  onClick={() => setView('list')}
                  aria-pressed={view === 'list'}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                    view === 'list'
                      ? 'bg-[#3D1164] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
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
              <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-medium">
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
                    className="py-1 text-center text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:py-2 sm:text-xs"
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
                      className={`min-h-[56px] rounded-2xl border p-1 text-left transition sm:min-h-24 sm:p-2 ${
                        isSelected
                          ? 'border-[#3D1164] bg-purple-50 shadow-xs'
                          : isCurrentMonth
                            ? hasPending
                              ? 'border-amber-300 bg-amber-50/50 hover:bg-amber-50'
                              : 'border-slate-200 bg-white hover:bg-slate-50'
                            : 'border-slate-100 bg-slate-50/50 opacity-40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-bold ${
                            isToday
                              ? 'flex h-5 w-5 items-center justify-center rounded-full bg-[#FF7A00] text-white font-black'
                              : 'text-slate-800'
                          }`}
                        >
                          {day.getDate()}
                        </span>
                        {activeBookings.length > 0 && (
                          <span className="rounded-full border border-purple-200 bg-purple-100 px-1.5 text-[10px] font-black text-[#3D1164]">
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
                              className={`truncate rounded-md px-1.5 py-0.5 text-[10px] font-bold ${statusStyle(b.status).chip}`}
                            >
                              {start} {first}
                            </div>
                          );
                        })}
                        {dayBookings.length > 2 && (
                          <div className="pl-0.5 text-[10px] font-bold text-[#FF7A00]">
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
                  className="mt-6 scroll-mt-20 border-t border-slate-200 pt-5"
                >
                  <h3 className="mb-3 text-sm font-bold text-slate-900">
                    {formatDate(selectedDate)}
                    <span className="ml-2 font-normal text-slate-500">
                      {selectedDateBookings.length} booking
                      {selectedDateBookings.length !== 1 ? 's' : ''}
                    </span>
                  </h3>
                  {selectedDateBookings.length === 0 ? (
                    <p className="py-6 text-center text-xs font-medium text-slate-400 sm:text-sm">
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
                      className={`shrink-0 rounded-2xl border px-3.5 py-1.5 text-xs font-bold transition ${
                        active
                          ? 'border-[#3D1164] bg-[#3D1164] text-white'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {f.label} <span className="opacity-70">({count})</span>
                    </button>
                  );
                })}
              </div>

              <div className="space-y-2.5">
                {filteredList.length === 0 ? (
                  <p className="py-8 text-center text-sm font-medium text-slate-400">
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
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-50"
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
    <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 sm:flex-row sm:items-center sm:justify-between shadow-xs">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 min-w-[3.5rem] shrink-0 items-center justify-center rounded-xl bg-purple-100 text-xs font-black text-[#3D1164]">
          {firstStart(b) ? formatTimeShort(firstStart(b)) : 'N/A'}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-900">{customerName(b)}</p>
          <p className="truncate text-xs text-slate-500 font-medium">
            {showReference && (
              <>
                <span className="font-mono font-bold text-[#3D1164]">{b.reference_code || 'No ref'}</span> ·{' '}
              </>
            )}
            {showDate && <>{formatDate(b.date)} · </>}
            {courtNames} · {slotDisplay}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <span className="text-sm font-black text-[#FF7A00]">
          {formatCurrency(b.total_amount || 0)}
        </span>
        <StatusBadge status={b.status} size="sm" />
      </div>
    </div>
  );
}