import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  Search,
  CheckCircle2,
  XCircle,
  Eye,
  Plus,
  RotateCcw,
  Clock,
  Copy,
  Check,
  Phone,
  Mail,
  ZoomIn,
  X,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  CalendarClock,
} from 'lucide-react';
import { StaffCreateBookingModal } from './StaffCreateBookingModal';
import { RescheduleBookingModal } from './RescheduleBookingModal';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { StaffLayout } from '@/components/layout/StaffLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import { useAdminStore } from '@/stores/adminStore';
import { useAuthStore } from '@/stores/authStore';
import {
  formatTimeRange,
  formatCurrency,
  formatDateLong,
  formatDateTime,
} from '@/utils/format';
import type { Booking, BookingStatus, RescheduleBookingResult } from '@/types';

const PAGE_SIZE = 15;

type TabKey = 'review' | 'unpaid' | 'confirmed' | 'history' | 'all';

const TABS: { key: TabKey; label: string; statuses: BookingStatus[] | null }[] = [
  { key: 'review', label: 'Needs review', statuses: ['payment_submitted'] },
  { key: 'unpaid', label: 'Unpaid', statuses: ['pending_payment'] },
  { key: 'confirmed', label: 'Confirmed', statuses: ['confirmed'] },
  {
    key: 'history',
    label: 'History',
    statuses: ['completed', 'cancelled', 'rejected', 'expired', 'refunded'],
  },
  { key: 'all', label: 'All', statuses: null },
];

type DateFilter = 'all' | 'today' | 'week' | 'upcoming';

const DATE_FILTERS: { value: DateFilter; label: string }[] = [
  { value: 'all', label: 'All dates' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'Next 7 days' },
  { value: 'upcoming', label: 'Upcoming' },
];

type ButtonVariant = 'primary' | 'secondary' | 'success' | 'danger';

interface ActionDef {
  to: BookingStatus;
  label: string;
  helper: string;
  variant: ButtonVariant;
  icon?: ReactNode;
  confirm?: {
    title: string;
    message: string;
    confirmLabel: string;
    askReason?: boolean;
  };
  adminOnly?: boolean;
  requiresStarted?: boolean;
}

const ACTIONS: Partial<Record<BookingStatus, ActionDef[]>> = {
  pending_payment: [
    {
      to: 'confirmed',
      label: 'Mark paid & confirm',
      helper: 'Use only if payment was already received directly.',
      variant: 'success',
      icon: <CheckCircle2 className="h-4 w-4" />,
      confirm: {
        title: 'Confirm without payment proof?',
        message: 'This confirms the court slot directly. Only continue if money was received.',
        confirmLabel: 'Mark paid & confirm',
      },
    },
    {
      to: 'expired',
      label: 'Mark expired',
      helper: 'Customer never paid in time. The slot becomes available again.',
      variant: 'secondary',
      icon: <Clock className="h-4 w-4" />,
      confirm: {
        title: 'Mark as expired?',
        message: 'The court slot will be released for others.',
        confirmLabel: 'Mark expired',
      },
    },
    {
      to: 'cancelled',
      label: 'Cancel booking',
      helper: 'Booking is called off before any payment.',
      variant: 'danger',
      icon: <XCircle className="h-4 w-4" />,
      confirm: {
        title: 'Cancel this booking?',
        message: 'The slot will be released immediately.',
        confirmLabel: 'Cancel booking',
        askReason: true,
      },
    },
  ],
  payment_submitted: [
    {
      to: 'confirmed',
      label: 'Approve payment',
      helper: 'Payment reference and receipt match. Confirms the court.',
      variant: 'success',
      icon: <CheckCircle2 className="h-4 w-4" />,
      confirm: {
        title: 'Approve this payment?',
        message: 'Make sure the amount and reference number match your GCash/Bank records.',
        confirmLabel: 'Approve & confirm',
      },
    },
    {
      to: 'rejected',
      label: 'Reject payment',
      helper: 'Proof is invalid or amount is incorrect. Slot is released.',
      variant: 'danger',
      icon: <XCircle className="h-4 w-4" />,
      confirm: {
        title: 'Reject this payment?',
        message: 'The reservation will be rejected and the court released.',
        confirmLabel: 'Reject payment',
        askReason: true,
      },
    },
  ],
  confirmed: [
    {
      to: 'completed',
      label: 'Mark completed',
      helper: 'The customer has finished playing.',
      variant: 'primary',
      icon: <CheckCircle2 className="h-4 w-4" />,
      requiresStarted: true,
      confirm: {
        title: 'Mark as completed?',
        message: 'The court booking will be closed as completed.',
        confirmLabel: 'Mark completed',
      },
    },
    {
      to: 'refunded',
      label: 'Mark as refunded',
      helper: 'Records that money was returned. Send refund via GCash first.',
      variant: 'secondary',
      icon: <RotateCcw className="h-4 w-4" />,
      adminOnly: true,
      confirm: {
        title: 'Mark as refunded?',
        message: 'This only updates the system status. Return payment via GCash/cash directly.',
        confirmLabel: 'Mark as refunded',
        askReason: true,
      },
    },
    {
      to: 'cancelled',
      label: 'Cancel booking',
      helper: 'Calls off a paid booking.',
      variant: 'danger',
      icon: <XCircle className="h-4 w-4" />,
      confirm: {
        title: 'Cancel this paid booking?',
        message: 'This booking is confirmed. If money was returned, mark as refunded instead.',
        confirmLabel: 'Cancel booking',
        askReason: true,
      },
    },
  ],
  completed: [
    {
      to: 'refunded',
      label: 'Mark as refunded',
      helper: 'Records that money was returned after completion.',
      variant: 'secondary',
      icon: <RotateCcw className="h-4 w-4" />,
      adminOnly: true,
      confirm: {
        title: 'Mark as refunded?',
        message: 'Return funds to the customer before recording this status.',
        confirmLabel: 'Mark as refunded',
        askReason: true,
      },
    },
  ],
};

const TERMINAL_STATUSES: BookingStatus[] = ['cancelled', 'rejected', 'expired', 'refunded'];

type BookingExtras = {
  payment_deadline?: string | null;
  expires_at?: string | null;
  status_updated_by?: string | null;
  status_updated_at?: string | null;
  status_reason?: string | null;
};

const toDay = (d: string | undefined | null) => (d ? d.slice(0, 10) : '');
const normId = (id: unknown): string => (id == null ? '' : String(id).trim().toLowerCase());
const trimTime = (t: string | undefined | null): string => (t ? t.slice(0, 5) : '');

function localDayString(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function timeLeft(deadline?: string | null) {
  if (!deadline) return null;
  const ms = new Date(deadline).getTime() - Date.now();
  if (Number.isNaN(ms)) return null;
  if (ms <= 0) return 'Deadline passed';
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins} min left`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m left`;
}

type SlotLike = {
  court_id?: string | null;
  start_time: string;
  end_time: string;
};

function slotsSummary(
  slots: SlotLike[] | null | undefined,
  courtsList: { id: string; name: string }[] | null | undefined,
  fallbackCourtName?: string | null
): string {
  if (!Array.isArray(slots) || slots.length === 0) return 'No slots';

  const nameById = new Map<string, string>();
  (courtsList ?? []).forEach((c) => {
    if (c?.id) nameById.set(normId(c.id), c.name || 'Unnamed Court');
  });

  const byCourt = new Map<string, Map<string, { start: string; end: string }>>();

  for (const s of slots) {
    if (!s || !s.start_time || !s.end_time) continue;
    const courtKey = normId(s.court_id) || 'unknown';
    const timeKey = `${trimTime(s.start_time)}-${trimTime(s.end_time)}`;

    let times = byCourt.get(courtKey);
    if (!times) {
      times = new Map();
      byCourt.set(courtKey, times);
    }
    if (!times.has(timeKey)) times.set(timeKey, { start: s.start_time, end: s.end_time });
  }

  if (byCourt.size === 0) return 'No slots';

  const mergeRanges = (times: Map<string, { start: string; end: string }>) => {
    const sorted = Array.from(times.values()).sort((a, b) =>
      trimTime(a.start).localeCompare(trimTime(b.start))
    );

    const merged: { start: string; end: string }[] = [];
    for (const t of sorted) {
      const last = merged[merged.length - 1];
      if (last && trimTime(last.end) === trimTime(t.start)) {
        last.end = t.end;
      } else {
        merged.push({ ...t });
      }
    }
    return merged;
  };

  const bySignature = new Map<string, { labels: string[]; text: string }>();

  byCourt.forEach((times, courtKey) => {
    const text = mergeRanges(times)
      .map((r) => formatTimeRange(r.start, r.end))
      .join(', ');

    const label =
      nameById.get(courtKey) ??
      (byCourt.size === 1 && fallbackCourtName ? fallbackCourtName : 'Unknown court');

    const group = bySignature.get(text);
    if (group) group.labels.push(label);
    else bySignature.set(text, { labels: [label], text });
  });

  const groups = Array.from(bySignature.values());

  if (groups.length === 1) {
    return byCourt.size > 1 ? `${groups[0].text} (each court)` : groups[0].text;
  }

  return groups
    .map((g) => {
      const names = g.labels
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
        .join(', ');
      return `${names}: ${g.text}`;
    })
    .join(' | ');
}

const selectClass =
  'w-full rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition focus:border-[#3D1164] focus:outline-none focus:ring-2 focus:ring-[#3D1164]/20 shadow-xs';

export function Bookings() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const isStaff = user?.role === 'staff';

  const bookings = useAdminStore((state) => state.bookings);
  const courts = useAdminStore((state) => state.courts);
  const loadingBookings = useAdminStore((state) => state.loadingBookings);
  const loadBookings = useAdminStore((state) => state.loadBookings);
  const loadCourts = useAdminStore((state) => state.loadCourts);
  const updateBookingStatus = useAdminStore((state) => state.updateBookingStatus);
  const loadAnalytics = useAdminStore((state) => state.loadAnalytics);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<TabKey>('all');
  const [courtFilter, setCourtFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);

  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<BookingStatus | null>(null);

  const [rescheduleTarget, setRescheduleTarget] = useState<Booking | null>(null);
  const [pendingAdjustments, setPendingAdjustments] = useState<
    Record<string, { balance_due: number; refund_due: number }>
  >({});

  const [pendingAction, setPendingAction] = useState<{ booking: Booking; action: ActionDef } | null>(
    null
  );
  const [reason, setReason] = useState('');

  const [copied, setCopied] = useState(false);
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const defaultTabApplied = useRef(false);

  const fetchBookings = useCallback(async () => {
    setLoadError(null);
    try {
      await loadBookings();
    } catch {
      setLoadError('Could not load bookings. Check your connection and try again.');
    }
  }, [loadBookings]);

  useEffect(() => {
    fetchBookings();
    if (isAdmin || isStaff) loadCourts();
  }, [fetchBookings, loadCourts, isAdmin, isStaff]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const tabCounts = useMemo(() => {
    const counts: Record<TabKey, number> = { review: 0, unpaid: 0, confirmed: 0, history: 0, all: 0 };
    for (const b of bookings) {
      counts.all += 1;
      for (const t of TABS) {
        if (t.statuses && t.statuses.includes(b.status)) counts[t.key] += 1;
      }
    }
    return counts;
  }, [bookings]);

  useEffect(() => {
    if (defaultTabApplied.current || loadingBookings || bookings.length === 0) return;
    defaultTabApplied.current = true;
    if (tabCounts.review > 0) setTab('review');
  }, [loadingBookings, bookings.length, tabCounts.review]);

  const courtNameById = useMemo(() => {
    const map = new Map<string, string>();
    (courts ?? []).forEach((c) => {
      if (c?.id) map.set(normId(c.id), c.name || 'Unnamed Court');
    });
    return map;
  }, [courts]);

  const getCourtNamesForBooking = useCallback(
    (booking: Booking): string => {
      const ids = Array.from(
        new Set((booking.slots ?? []).map((s) => normId(s.court_id)).filter(Boolean))
      );

      const names = Array.from(
        new Set(ids.map((id) => courtNameById.get(id)).filter((n): n is string => !!n))
      ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

      if (names.length > 0) return names.join(', ');
      return booking.court_name || 'Unknown Court';
    },
    [courtNameById]
  );

  const filtered = useMemo(() => {
    const activeTab = TABS.find((t) => t.key === tab);
    const today = localDayString(0);
    const weekEnd = localDayString(6);
    const q = search.trim().toLowerCase();
    const courtFilterId = normId(courtFilter);

    const list = bookings.filter((b) => {
      if (activeTab?.statuses && !activeTab.statuses.includes(b.status)) return false;

      if (courtFilter !== 'all') {
        const matchesMain = normId(b.court_id) === courtFilterId;
        const matchesSlot = (b.slots ?? []).some((s) => normId(s.court_id) === courtFilterId);
        if (!matchesMain && !matchesSlot) return false;
      }

      const day = toDay(b.date);
      if (dateFilter === 'today' && day !== today) return false;
      if (dateFilter === 'week' && (day < today || day > weekEnd)) return false;
      if (dateFilter === 'upcoming' && day < today) return false;

      if (q) {
        return (
          b.reference_code?.toLowerCase().includes(q) ||
          b.payment_reference?.toLowerCase().includes(q) ||
          b.customer?.name?.toLowerCase().includes(q) ||
          b.customer?.email?.toLowerCase().includes(q) ||
          b.customer?.phone?.toLowerCase().includes(q) ||
          b.court_name?.toLowerCase().includes(q) ||
          getCourtNamesForBooking(b).toLowerCase().includes(q)
        );
      }
      return true;
    });

    return [...list].sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortDir === 'asc' ? dateA - dateB : dateB - dateA;
    });
  }, [bookings, tab, courtFilter, dateFilter, search, sortDir, getCourtNamesForBooking]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [tab, courtFilter, dateFilter, search, sortDir]);

  const hasActiveFilters =
    search.trim() !== '' || courtFilter !== 'all' || dateFilter !== 'all' || tab !== 'all';

  const clearFilters = () => {
    setSearch('');
    setCourtFilter('all');
    setDateFilter('all');
    setTab('all');
  };

  const handleStatusUpdate = async (booking: Booking, status: BookingStatus, why?: string) => {
    setUpdatingStatus(status);
    try {
      await (
        updateBookingStatus as unknown as (
          id: string,
          s: BookingStatus,
          reason?: string
        ) => Promise<void>
      )(booking.id, status, why || undefined);

      if (isAdmin) await loadAnalytics();

      setSelectedBooking(null);
      setToast({
        type: 'success',
        message: `Booking ${booking.reference_code || ''} marked as ${status.replace(/_/g, ' ')}.`,
      });
    } catch (err) {
      const msg = err instanceof Error && err.message ? err.message : '';
      setToast({
        type: 'error',
        message: msg
          ? `Couldn't update booking: ${msg}`
          : "Couldn't update booking. Refreshing list.",
      });
      fetchBookings();
    } finally {
      setUpdatingStatus(null);
    }
  };

  const runAction = (booking: Booking, action: ActionDef) => {
    if (action.confirm) {
      setReason('');
      setPendingAction({ booking, action });
    } else {
      handleStatusUpdate(booking, action.to);
    }
  };

  const confirmPending = async () => {
    if (!pendingAction) return;
    const { booking, action } = pendingAction;
    const why = reason.trim();
    setPendingAction(null);
    setReason('');
    await handleStatusUpdate(booking, action.to, why);
  };

  const copyReference = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setToast({ type: 'error', message: 'Could not copy. Select the number and copy manually.' });
    }
  };

  const openDetails = (b: Booking) => {
    setCopied(false);
    setSelectedBooking(b);
  };

  const openReschedule = (b: Booking) => {
    setSelectedBooking(null);
    setRescheduleTarget(b);
  };

  const handleRescheduled = async (result: RescheduleBookingResult) => {
    if (result.balance_due > 0 || result.refund_due > 0) {
      setPendingAdjustments((prev) => ({
        ...prev,
        [result.booking.id]: {
          balance_due: result.balance_due,
          refund_due: result.refund_due,
        },
      }));
    }

    setToast({
      type: 'success',
      message: `Booking ${result.booking.reference_code} rescheduled.`,
    });

    await fetchBookings();
  };

  const todayStr = localDayString(0);
  const modalActions = selectedBooking
    ? (ACTIONS[selectedBooking.status] ?? []).filter((a) => !(a.adminOnly && !isAdmin))
    : [];
  const hiddenAdminOnly = selectedBooking
    ? (ACTIONS[selectedBooking.status] ?? []).some((a) => a.adminOnly && !isAdmin)
    : false;
  const extra = selectedBooking as (Booking & BookingExtras) | null;
  const deadline = extra?.payment_deadline ?? extra?.expires_at ?? null;

  const Layout = isStaff ? StaffLayout : AdminLayout;

  const SortHeader = (
    <button
      type="button"
      onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
      className="inline-flex items-center gap-1 font-bold uppercase tracking-wider text-slate-700 hover:text-slate-900"
    >
      Date
      <ArrowUpDown className="h-3 w-3" />
    </button>
  );

  return (
    <Layout>
      <div className="container-page py-6 sm:py-8 text-slate-900">
        {/* Header */}
        <div className="mb-6 sm:mb-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              Bookings
            </h1>
            <p className="mt-1 text-xs text-slate-500 sm:text-sm">
              Review receipts, confirm reservations, and manage court schedules
            </p>
          </div>
          <Button
            size="md"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setShowCreateModal(true)}
            className="bg-[#FF7A00] hover:bg-[#E56600] text-white font-bold"
          >
            New Booking
          </Button>
        </div>

        {/* Status tabs */}
        <div
          role="tablist"
          aria-label="Booking status"
          className="mb-4 flex gap-2 overflow-x-auto pb-1"
        >
          {TABS.map((t) => {
            const active = tab === t.key;
            const urgent = t.key === 'review' && tabCounts.review > 0;
            return (
              <button
                key={t.key}
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.key)}
                className={`flex shrink-0 items-center gap-2 rounded-2xl border px-4 py-2 text-xs font-bold transition shadow-xs ${
                  active
                    ? 'border-[#3D1164] bg-[#3D1164] text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {t.label}
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                    urgent
                      ? 'bg-[#FF7A00] text-white'
                      : active
                        ? 'bg-purple-800 text-purple-100'
                        : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {tabCounts[t.key]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Filter controls */}
        <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs">
          <div className={`grid gap-3 ${isAdmin ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
            <Input
              aria-label="Search bookings"
              placeholder="Search customer, email, phone, reference..."
              leftIcon={<Search className="h-4 w-4 text-slate-400" />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              aria-label="Filter by date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as DateFilter)}
              className={selectClass}
            >
              {DATE_FILTERS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {isAdmin && (
              <select
                aria-label="Filter by court"
                value={courtFilter}
                onChange={(e) => setCourtFilter(e.target.value)}
                className={selectClass}
              >
                <option value="all">All Courts</option>
                {courts.map((c) =>
                  c ? (
                    <option key={c.id} value={c.id}>
                      {c.name || 'Unnamed Court'}
                    </option>
                  ) : null
                )}
              </select>
            )}
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-slate-500">
            <span aria-live="polite">
              Showing {filtered.length} of {bookings.length} bookings
            </span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="font-bold text-[#FF7A00] hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* List Content */}
        {loadingBookings ? (
          <LoadingSpinner className="py-16" />
        ) : loadError ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 py-10 text-center shadow-xs">
            <AlertTriangle className="mx-auto mb-2 h-6 w-6 text-rose-600" />
            <p className="text-sm font-bold text-rose-800">{loadError}</p>
            <Button size="sm" variant="secondary" className="mt-4 bg-white" onClick={fetchBookings}>
              Try again
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white px-4 py-12 text-center shadow-xs">
            <p className="text-sm font-bold text-slate-900">No bookings match these filters</p>
            <p className="mt-1 text-sm text-slate-500">
              Try adjusting your query or reset filters.
            </p>
            {hasActiveFilters && (
              <Button size="sm" variant="secondary" className="mt-4 bg-white" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
          </div>
        ) : (
          <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-xs">
            {/* Desktop Table View */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-3.5 font-bold">Reference</th>
                    <th className="px-4 py-3.5 font-bold">Customer</th>
                    <th className="px-4 py-3.5 font-bold">Court(s)</th>
                    <th className="px-4 py-3.5">{SortHeader}</th>
                    <th className="px-4 py-3.5 font-bold">Slots</th>
                    <th className="px-4 py-3.5 font-bold">Total</th>
                    <th className="px-4 py-3.5 font-bold">Status</th>
                    <th className="px-4 py-3.5 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pageItems.map((b) => {
                    const needsReview = b.status === 'payment_submitted';
                    const adjust = pendingAdjustments[b.id];
                    const refundDue = adjust?.refund_due ?? 0;
                    const balanceDue = adjust?.balance_due ?? 0;
                    const courtNames = getCourtNamesForBooking(b);
                    return (
                      <tr
                        key={b.id}
                        onClick={() => openDetails(b)}
                        className={`cursor-pointer transition hover:bg-slate-50/80 ${
                          needsReview ? 'border-l-4 border-l-[#FF7A00] bg-orange-50/30' : ''
                        }`}
                      >
                        <td className="px-4 py-3.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-mono font-bold text-[#3D1164]">
                              {b.reference_code || 'N/A'}
                            </span>
                            {refundDue > 0 && (
                              <span className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-[#3D1164]">
                                <RotateCcw className="h-3 w-3" />
                                Refund {formatCurrency(refundDue)}
                              </span>
                            )}
                            {balanceDue > 0 && (
                              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                                <AlertTriangle className="h-3 w-3" />
                                Balance {formatCurrency(balanceDue)}
                              </span>
                            )}
                          </div>
                          {b.payment_reference && (
                            <p className="mt-0.5 text-[11px] text-slate-500 font-medium">
                              Pay ref: <span className="font-mono text-slate-800">{b.payment_reference}</span>
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-bold text-slate-900">{b.customer?.name || 'Unknown'}</p>
                          <p className="text-xs text-slate-500 font-medium">{b.customer?.email || 'No email'}</p>
                        </td>
                        <td className="px-4 py-3.5 font-semibold text-slate-800">{courtNames}</td>
                        <td className="px-4 py-3.5 text-xs text-slate-600 font-medium">
                          {formatDateLong(b.date)}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-500 max-w-[280px]">
                          {slotsSummary(b.slots, courts, b.court_name)}
                        </td>
                        <td className="px-4 py-3.5 font-black text-[#FF7A00]">
                          {formatCurrency(b.total_amount || 0)}
                        </td>
                        <td className="px-4 py-3.5">
                          <StatusBadge status={b.status} size="sm" />
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          {needsReview ? (
                            <Button
                              size="sm"
                              variant="success"
                              onClick={(e) => {
                                e.stopPropagation();
                                openDetails(b);
                              }}
                            >
                              Review payment
                            </Button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openDetails(b);
                              }}
                              className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-600 transition hover:bg-slate-100 shadow-xs"
                              title="View details"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="space-y-3 p-4 md:hidden">
              <button
                type="button"
                onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
                className="inline-flex items-center gap-1 text-xs font-bold text-slate-500"
              >
                <ArrowUpDown className="h-3 w-3" />
                Date: {sortDir === 'asc' ? 'oldest first' : 'newest first'}
              </button>
              {pageItems.map((b) => {
                const needsReview = b.status === 'payment_submitted';
                const courtNames = getCourtNamesForBooking(b);
                return (
                  <div
                    key={b.id}
                    className={`rounded-2xl border bg-white p-4 space-y-2 shadow-xs ${
                      needsReview ? 'border-orange-300 bg-orange-50/20' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-[#3D1164]">
                        {b.reference_code || 'N/A'}
                      </span>
                      <StatusBadge status={b.status} size="sm" />
                    </div>

                    <div>
                      <p className="text-sm font-bold text-slate-900">{b.customer?.name || 'Unknown'}</p>
                      <p className="text-xs text-slate-500">{b.customer?.phone || b.customer?.email}</p>
                      <p className="mt-1 text-xs text-slate-600 font-semibold">
                        {courtNames} — {formatDateLong(b.date)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {slotsSummary(b.slots, courts, b.court_name)}
                      </p>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                      <span className="text-base font-black text-[#FF7A00]">
                        {formatCurrency(b.total_amount || 0)}
                      </span>
                      <Button
                        size="sm"
                        variant={needsReview ? 'success' : 'secondary'}
                        onClick={() => openDetails(b)}
                      >
                        {needsReview ? 'Review' : 'View'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
                <span>
                  Page {currentPage} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={currentPage === 1}
                    leftIcon={<ChevronLeft className="h-4 w-4" />}
                    onClick={() => setPage(currentPage - 1)}
                    className="bg-white border-slate-300 text-slate-800"
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={currentPage === totalPages}
                    onClick={() => setPage(currentPage + 1)}
                    className="bg-white border-slate-300 text-slate-800"
                  >
                    Next
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Booking Details Modal */}
      <AnimatePresence>
        {selectedBooking && (
          <Modal
            isOpen={!!selectedBooking}
            onClose={() => (updatingStatus ? undefined : setSelectedBooking(null))}
            title={`Booking ${selectedBooking.reference_code || 'N/A'}`}
            size="lg"
          >
            <div className="flex max-h-[80vh] flex-col text-slate-900">
              <div className="flex-1 overflow-y-auto pr-1 pb-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                  <StatusBadge status={selectedBooking.status} />
                  <span className="text-xs text-slate-500 font-medium">
                    Created {formatDateTime(selectedBooking.created_at)}
                  </span>
                </div>

                <div className="grid gap-3.5 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#3D1164]">
                      Customer
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-900">
                      {selectedBooking.customer?.name || 'Unknown'}
                    </p>
                    {selectedBooking.customer?.email && (
                      <a
                        href={`mailto:${selectedBooking.customer.email}`}
                        className="mt-1 flex items-center gap-1.5 text-xs text-slate-600 hover:text-[#3D1164]"
                      >
                        <Mail className="h-3.5 w-3.5 text-slate-400" />
                        {selectedBooking.customer.email}
                      </a>
                    )}
                    {selectedBooking.customer?.phone && (
                      <a
                        href={`tel:${selectedBooking.customer.phone}`}
                        className="mt-1 flex items-center gap-1.5 text-xs text-slate-600 hover:text-[#3D1164]"
                      >
                        <Phone className="h-3.5 w-3.5 text-slate-400" />
                        {selectedBooking.customer.phone}
                      </a>
                    )}
                    {selectedBooking.customer?.notes && (
                      <p className="mt-2.5 rounded-xl border border-slate-200 bg-white p-2 text-xs italic text-slate-600">
                        &quot;{selectedBooking.customer.notes}&quot;
                      </p>
                    )}
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#3D1164]">
                      Court Booking
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-900">
                      {getCourtNamesForBooking(selectedBooking)}
                    </p>
                    <p className="text-xs text-slate-500 font-medium">
                      {formatDateLong(selectedBooking.date)}
                    </p>
                    <p className="mt-1.5 text-xs text-slate-600">
                      {slotsSummary(selectedBooking.slots, courts)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {selectedBooking.status === 'payment_submitted'
                      ? 'Amount to verify'
                      : 'Total Amount'}
                  </span>
                  <span className="font-display text-2xl font-black text-[#FF7A00]">
                    {formatCurrency(selectedBooking.total_amount || 0)}
                  </span>
                </div>

                {/* Payment Review Details */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="mb-2.5 text-xs font-bold uppercase tracking-wider text-[#3D1164]">
                    Payment Details
                  </p>

                  {selectedBooking.payment_screenshot_url || selectedBooking.payment_reference ? (
                    <>
                      {selectedBooking.payment_reference && (
                        <div className="mb-3 flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
                          <div>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                              Reference Number
                            </p>
                            <p className="mt-0.5 font-mono text-base font-black text-[#3D1164]">
                              {selectedBooking.payment_reference}
                            </p>
                          </div>
                          <button
                            onClick={() => copyReference(selectedBooking.payment_reference || '')}
                            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-100"
                          >
                            {copied ? (
                              <>
                                <Check className="h-3.5 w-3.5 text-emerald-600" /> Copied
                              </>
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5" /> Copy
                              </>
                            )}
                          </button>
                        </div>
                      )}

                      {selectedBooking.payment_screenshot_url ? (
                        <button
                          type="button"
                          onClick={() => setZoomImage(selectedBooking.payment_screenshot_url!)}
                          className="group relative block w-full text-center"
                        >
                          <img
                            src={selectedBooking.payment_screenshot_url}
                            alt="Payment screenshot"
                            className="mx-auto max-h-72 rounded-xl object-contain border border-slate-200 bg-white shadow-xs"
                          />
                          <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-lg bg-black/70 px-2.5 py-1 text-[11px] font-bold text-white">
                            <ZoomIn className="h-3 w-3" /> Enlarge
                          </span>
                        </button>
                      ) : (
                        <p className="rounded-xl border border-dashed border-slate-300 bg-white p-3 text-center text-xs text-slate-500">
                          No screenshot uploaded. Reference number provided only.
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-center text-xs text-slate-500">
                      <p className="font-bold text-slate-800">Awaiting payment</p>
                      <p className="mt-0.5">The customer has not submitted payment proof yet.</p>
                      {selectedBooking.status === 'pending_payment' && deadline && (
                        <p className="mt-1 text-amber-700 font-semibold">
                          Pay by {formatDateTime(deadline)} · {timeLeft(deadline)}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="shrink-0 border-t border-slate-200 bg-white pt-4">
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                  Actions
                </p>

                {!TERMINAL_STATUSES.includes(selectedBooking.status) && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="mb-3 w-full sm:w-auto bg-white border-slate-300 text-slate-800"
                    leftIcon={<CalendarClock className="h-4 w-4" />}
                    onClick={() => openReschedule(selectedBooking)}
                    disabled={updatingStatus !== null}
                  >
                    Reschedule booking
                  </Button>
                )}

                {modalActions.length > 0 && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {modalActions.map((action) => {
                      const notYet = action.requiresStarted && toDay(selectedBooking.date) > todayStr;
                      return (
                        <div key={action.to + action.label} className="flex flex-col gap-1">
                          <Button
                            size="sm"
                            variant={action.variant}
                            isLoading={updatingStatus === action.to}
                            disabled={updatingStatus !== null || !!notYet}
                            leftIcon={action.icon}
                            onClick={() => runAction(selectedBooking, action)}
                          >
                            {action.label}
                          </Button>
                          <p className="text-[11px] leading-snug text-slate-500">
                            {notYet ? 'Available once booking date arrives.' : action.helper}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* Confirm Action Dialog */}
      <AnimatePresence>
        {pendingAction && (
          <Modal
            isOpen={!!pendingAction}
            onClose={() => setPendingAction(null)}
            title={pendingAction.action.confirm?.title || 'Are you sure?'}
            size="sm"
          >
            <div className="space-y-4 text-slate-800">
              <p className="text-sm text-slate-600">{pendingAction.action.confirm?.message}</p>
              <p className="text-xs text-slate-500">
                Booking{' '}
                <span className="font-mono font-bold text-[#3D1164]">
                  {pendingAction.booking.reference_code}
                </span>{' '}
                · {pendingAction.booking.customer?.name || 'Unknown'}
              </p>

              {pendingAction.action.confirm?.askReason && (
                <div>
                  <label htmlFor="action-reason" className="mb-1 block text-xs font-bold text-slate-700">
                    Reason (optional)
                  </label>
                  <textarea
                    id="action-reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    maxLength={300}
                    placeholder="Note for booking history..."
                    className={selectClass}
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button size="sm" variant="secondary" onClick={() => setPendingAction(null)} className="bg-white">
                  Cancel
                </Button>
                <Button size="sm" variant={pendingAction.action.variant} onClick={confirmPending}>
                  {pendingAction.action.confirm?.confirmLabel || 'Confirm'}
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* Screenshot Lightbox */}
      {zoomImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-xs"
          role="dialog"
          onClick={() => setZoomImage(null)}
        >
          <button
            type="button"
            onClick={() => setZoomImage(null)}
            className="absolute right-4 top-4 rounded-full bg-white/20 p-2 text-white hover:bg-white/30"
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={zoomImage}
            alt="Payment screenshot enlarged"
            className="max-h-[90vh] max-w-full rounded-2xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[90] flex justify-center px-4">
          <div
            className={`pointer-events-auto flex max-w-md items-start gap-2 rounded-2xl border p-4 text-xs font-bold shadow-xl ${
              toast.type === 'success'
                ? 'border-emerald-300 bg-white text-emerald-800'
                : 'border-rose-300 bg-white text-rose-800'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
            )}
            <span className="flex-1">{toast.message}</span>
            <button type="button" onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-700">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <StaffCreateBookingModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={() => fetchBookings()}
      />

      <RescheduleBookingModal
        isOpen={!!rescheduleTarget}
        booking={rescheduleTarget}
        onClose={() => setRescheduleTarget(null)}
        onRescheduled={handleRescheduled}
      />
    </Layout>
  );
}