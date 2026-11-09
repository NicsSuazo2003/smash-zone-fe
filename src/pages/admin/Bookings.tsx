// src/pages/admin/Bookings.tsx
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

/* ────────────────────────────────────────────────────────────────────────── */
/* Config                                                                     */
/* ────────────────────────────────────────────────────────────────────────── */

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
      helper: 'Use only if you already received payment (cash on-site or GCash outside the app).',
      variant: 'success',
      icon: <CheckCircle2 className="h-4 w-4" />,
      confirm: {
        title: 'Confirm without payment proof?',
        message:
          'This confirms the booking without verifying a payment in the app. Only continue if you have already received the money.',
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
        message: 'The time slot will be released for other customers. This cannot be undone.',
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
        message: 'The slot will be released. This cannot be undone.',
        confirmLabel: 'Cancel booking',
        askReason: true,
      },
    },
  ],
  payment_submitted: [
    {
      to: 'confirmed',
      label: 'Approve payment',
      helper: 'Payment proof looks valid. Confirms the booking.',
      variant: 'success',
      icon: <CheckCircle2 className="h-4 w-4" />,
      confirm: {
        title: 'Approve this payment?',
        message: 'Make sure the amount and reference number match what you received.',
        confirmLabel: 'Approve & confirm',
      },
    },
    {
      to: 'rejected',
      label: 'Reject payment',
      helper: 'Proof is invalid or the amount is wrong. The slot is released.',
      variant: 'danger',
      icon: <XCircle className="h-4 w-4" />,
      confirm: {
        title: 'Reject this payment?',
        message: 'The booking will be rejected and the slot released. This cannot be undone.',
        confirmLabel: 'Reject payment',
        askReason: true,
      },
    },
  ],
  confirmed: [
    {
      to: 'completed',
      label: 'Mark completed',
      helper: 'The customer has played. Available once the booking date arrives.',
      variant: 'primary',
      icon: <CheckCircle2 className="h-4 w-4" />,
      requiresStarted: true,
      confirm: {
        title: 'Mark as completed?',
        message: 'The booking will be closed as completed.',
        confirmLabel: 'Mark completed',
      },
    },
    {
      to: 'refunded',
      label: 'Mark as refunded',
      helper: 'Records that money was returned. Send the refund via GCash/cash first.',
      variant: 'secondary',
      icon: <RotateCcw className="h-4 w-4" />,
      adminOnly: true,
      confirm: {
        title: 'Mark as refunded?',
        message:
          'This only updates the status – it does NOT send money. Return the payment to the customer first.',
        confirmLabel: 'Mark as refunded',
        askReason: true,
      },
    },
    {
      to: 'cancelled',
      label: 'Cancel booking',
      helper: 'Calls off a paid booking. If the customer paid, mark it as refunded instead.',
      variant: 'danger',
      icon: <XCircle className="h-4 w-4" />,
      confirm: {
        title: 'Cancel this paid booking?',
        message:
          'This booking is already confirmed. If the customer paid and should get their money back, use "Mark as refunded" instead.',
        confirmLabel: 'Cancel booking',
        askReason: true,
      },
    },
  ],
  completed: [
    {
      to: 'refunded',
      label: 'Mark as refunded',
      helper: 'Records that money was returned. Send the refund via GCash/cash first.',
      variant: 'secondary',
      icon: <RotateCcw className="h-4 w-4" />,
      adminOnly: true,
      confirm: {
        title: 'Mark as refunded?',
        message:
          'This only updates the status – it does NOT send money. Return the payment to the customer first.',
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

/* ────────────────────────────────────────────────────────────────────────── */
/* Helpers                                                                    */
/* ────────────────────────────────────────────────────────────────────────── */

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
  'w-full rounded-xl border border-neutral-700 bg-neutral-950/70 px-3.5 py-2.5 text-sm text-cream transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20';

/* ────────────────────────────────────────────────────────────────────────── */
/* Page                                                                       */
/* ────────────────────────────────────────────────────────────────────────── */

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

  /* ── Data loading ─────────────────────────────────────────────────────── */

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

  /* ── Toast auto-dismiss ───────────────────────────────────────────────── */

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  /* ── Counts for tabs ──────────────────────────────────────────────────── */

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

  /* ── Court lookup ─────────────────────────────────────────────────────── */

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

  /* ── Filtering / sorting / paging ─────────────────────────────────────── */

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
      // ✅ FIX: Sort by created_at instead of booking date so manual inserts show at the top
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

  /* ── Actions ──────────────────────────────────────────────────────────── */

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
          : "Couldn't update booking. It may have been changed by someone else — refreshing the list.",
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
      setToast({ type: 'error', message: 'Could not copy. Select the number and copy it manually.' });
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

  /* ── Derived for modal ────────────────────────────────────────────────── */

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
      className="inline-flex items-center gap-1 font-semibold uppercase tracking-wider hover:text-cream"
      aria-label={`Sort by date, currently ${sortDir === 'asc' ? 'oldest first' : 'newest first'}`}
    >
      Date
      <ArrowUpDown className="h-3 w-3" />
    </button>
  );

  return (
    <Layout>
      <div className="container-page py-6 sm:py-8 text-cream">
        {/* Header */}
        <div className="mb-6 sm:mb-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-cream sm:text-3xl">
              Bookings
            </h1>
            <p className="mt-1 text-xs text-cream-muted sm:text-sm">
              Review payments, confirm reservations, and manage court bookings
            </p>
          </div>
          <Button
            size="md"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setShowCreateModal(true)}
          >
            New Booking
          </Button>
        </div>

        {/* Status tabs with counts */}
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
                className={`flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold transition ${
                  active
                    ? 'border-primary-400 bg-primary-500/20 text-cream'
                    : 'border-neutral-700 bg-neutral-900/60 text-cream-muted hover:text-cream'
                }`}
              >
                {t.label}
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                    urgent ? 'bg-amber-400 text-neutral-950' : 'bg-neutral-950/70 text-cream-muted'
                  }`}
                >
                  {tabCounts[t.key]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Filter controls */}
        <div className="mb-6 card rounded-2xl border border-neutral-700 bg-neutral-900/80 p-4 sm:p-5 shadow-xl backdrop-blur-sm">
          <div className={`grid gap-3 ${isAdmin ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
            <Input
              aria-label="Search bookings"
              placeholder="Search name, email, phone, booking or payment ref..."
              leftIcon={<Search className="h-4 w-4 text-cream-muted" />}
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
                <option key={opt.value} value={opt.value} className="bg-neutral-900">
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
                <option value="all" className="bg-neutral-900">
                  All Courts
                </option>
                {courts.map((c) =>
                  c ? (
                    <option key={c.id} value={c.id} className="bg-neutral-900">
                      {c.name || 'Unnamed Court'}
                    </option>
                  ) : null
                )}
              </select>
            )}
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs font-medium text-cream-muted">
            <span aria-live="polite">
              Showing {filtered.length} of {bookings.length} bookings
            </span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="font-semibold text-primary-300 hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        {loadingBookings ? (
          <LoadingSpinner className="py-16" />
        ) : loadError ? (
          <div className="card rounded-2xl border border-red-500/40 bg-red-500/10 py-10 text-center shadow-xl">
            <AlertTriangle className="mx-auto mb-2 h-6 w-6 text-red-300" />
            <p className="text-sm font-medium text-cream">{loadError}</p>
            <Button size="sm" variant="secondary" className="mt-4" onClick={fetchBookings}>
              Try again
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="card rounded-2xl border border-neutral-700 bg-neutral-900/60 px-4 py-12 text-center shadow-xl">
            {bookings.length === 0 ? (
              <>
                <p className="text-sm font-semibold text-cream">No bookings yet</p>
                <p className="mt-1 text-sm text-cream-muted">
                  Bookings will appear here as customers reserve courts. You can also add one
                  yourself.
                </p>
                <Button
                  size="sm"
                  className="mt-4"
                  leftIcon={<Plus className="h-4 w-4" />}
                  onClick={() => setShowCreateModal(true)}
                >
                  New Booking
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-cream">No bookings match these filters</p>
                <p className="mt-1 text-sm text-cream-muted">
                  Try a different search or clear the filters.
                </p>
                <Button size="sm" variant="secondary" className="mt-4" onClick={clearFilters}>
                  Clear filters
                </Button>
              </>
            )}
          </div>
        ) : (
          <div className="card rounded-2xl border border-neutral-700 bg-neutral-900/80 overflow-hidden shadow-xl">
            {/* Desktop table view */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-neutral-700 bg-neutral-950/70 text-xs uppercase tracking-wider text-cream-muted">
                    <th className="px-4 py-3 font-semibold">Reference</th>
                    <th className="px-4 py-3 font-semibold">Customer</th>
                    <th className="px-4 py-3 font-semibold">Court(s)</th>
                    <th className="px-4 py-3">{SortHeader}</th>
                    <th className="px-4 py-3 font-semibold">Slots</th>
                    <th className="px-4 py-3 font-semibold">Total</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/80">
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
                        className={`cursor-pointer transition hover:bg-neutral-800/40 ${
                          needsReview ? 'border-l-4 border-l-amber-400 bg-amber-400/5' : ''
                        }`}
                      >
                        <td className="px-4 py-3.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-mono font-bold text-primary-300 tracking-wide">
                              {b.reference_code || 'N/A'}
                            </span>
                            {refundDue > 0 && (
                              <span className="inline-flex items-center gap-1 rounded-full border border-purple-500/40 bg-purple-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-purple-200">
                                <RotateCcw className="h-3 w-3" />
                                Refund {formatCurrency(refundDue)}
                              </span>
                            )}
                            {balanceDue > 0 && (
                              <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-200">
                                <AlertTriangle className="h-3 w-3" />
                                Balance {formatCurrency(balanceDue)}
                              </span>
                            )}
                          </div>
                          {b.payment_reference && (
                            <p className="mt-0.5 text-[11px] text-cream-muted">
                              Pay ref:{' '}
                              <span className="font-mono text-cream">{b.payment_reference}</span>
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-medium text-cream">{b.customer?.name || 'Unknown'}</p>
                          <p className="text-xs text-cream-muted">
                            {b.customer?.email || 'No email'}
                          </p>
                        </td>
                        <td className="px-4 py-3.5 font-medium text-cream">{courtNames}</td>
                        <td className="px-4 py-3.5 text-xs text-cream-muted">
                          {formatDateLong(b.date)}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-cream-muted max-w-[280px]">
                          {slotsSummary(b.slots, courts, b.court_name)}
                        </td>
                        <td className="px-4 py-3.5 font-bold text-accent-400">
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
                              className="rounded-lg border border-neutral-600 bg-neutral-800/60 p-1.5 text-cream-muted transition hover:border-primary-400 hover:text-primary-300 active:scale-95"
                              title="View details"
                              aria-label={`View details for booking ${b.reference_code || ''}`}
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

            {/* Mobile list view */}
            <div className="space-y-3 p-4 md:hidden">
              <button
                type="button"
                onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
                className="inline-flex items-center gap-1 text-xs font-semibold text-cream-muted"
              >
                <ArrowUpDown className="h-3 w-3" />
                Date: {sortDir === 'asc' ? 'oldest first' : 'newest first'}
              </button>
              {pageItems.map((b) => {
                const needsReview = b.status === 'payment_submitted';
                const adjust = pendingAdjustments[b.id];
                const refundDue = adjust?.refund_due ?? 0;
                const balanceDue = adjust?.balance_due ?? 0;
                const courtNames = getCourtNamesForBooking(b);
                return (
                  <div
                    key={b.id}
                    className={`rounded-xl border bg-neutral-950/70 p-4 space-y-2 ${
                      needsReview ? 'border-amber-400/60' : 'border-neutral-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-primary-300 tracking-wide">
                        {b.reference_code || 'N/A'}
                      </span>
                      <StatusBadge status={b.status} size="sm" />
                    </div>

                    {(refundDue > 0 || balanceDue > 0) && (
                      <div className="flex flex-wrap gap-1.5">
                        {refundDue > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-purple-500/40 bg-purple-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-purple-200">
                            <RotateCcw className="h-3 w-3" />
                            Refund {formatCurrency(refundDue)}
                          </span>
                        )}
                        {balanceDue > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-200">
                            <AlertTriangle className="h-3 w-3" />
                            Balance {formatCurrency(balanceDue)}
                          </span>
                        )}
                      </div>
                    )}

                    <div>
                      <p className="text-sm font-bold text-cream">{b.customer?.name || 'Unknown'}</p>
                      {b.customer?.email && (
                        <p className="text-xs text-cream-muted">{b.customer.email}</p>
                      )}
                      {b.customer?.phone && (
                        <a
                          href={`tel:${b.customer.phone}`}
                          className="text-xs text-primary-300 underline"
                        >
                          {b.customer.phone}
                        </a>
                      )}
                      <p className="mt-1 text-xs text-cream-muted">
                        {courtNames} — {formatDateLong(b.date)}
                      </p>
                      <p className="mt-1 text-xs text-cream-muted/90">
                        {slotsSummary(b.slots, courts, b.court_name)}
                      </p>
                    </div>
                    {b.payment_reference && (
                      <p className="text-xs text-cream-muted">
                        Pay ref: <span className="font-mono text-cream">{b.payment_reference}</span>
                      </p>
                    )}
                    <div className="flex items-center justify-between border-t border-neutral-800 pt-3">
                      <span className="text-sm font-extrabold text-accent-400">
                        {formatCurrency(b.total_amount || 0)}
                      </span>
                      <Button
                        size="sm"
                        variant={needsReview ? 'success' : 'secondary'}
                        onClick={() => openDetails(b)}
                      >
                        {needsReview ? 'Review payment' : 'View Details'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-neutral-800 px-4 py-3 text-xs text-cream-muted">
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
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={currentPage === totalPages}
                    onClick={() => setPage(currentPage + 1)}
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

      {/* ─────────────────────── Booking Details Modal ─────────────────────── */}
      <AnimatePresence>
        {selectedBooking && (
          <Modal
            isOpen={!!selectedBooking}
            onClose={() => (updatingStatus ? undefined : setSelectedBooking(null))}
            title={`Booking ${selectedBooking.reference_code || 'N/A'}`}
            size="lg"
          >
            <div className="flex max-h-[80vh] flex-col">
              {/* Scrollable content area */}
              <div className="flex-1 overflow-y-auto pr-1 pb-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-700 pb-3">
                  <StatusBadge status={selectedBooking.status} />
                  <span className="text-xs text-cream-muted font-medium">
                    Created {formatDateTime(selectedBooking.created_at)}
                  </span>
                </div>

                {extra?.status_updated_at && (
                  <p className="rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-xs text-cream-muted">
                    Last changed {extra.status_updated_by ? `by ${extra.status_updated_by} ` : ''}
                    on {formatDateTime(extra.status_updated_at)}
                    {extra.status_reason ? ` — "{extra.status_reason}"` : ''}
                  </p>
                )}

                <div className="grid gap-3.5 sm:grid-cols-2">
                  <div className="rounded-xl border border-neutral-700 bg-neutral-950/70 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-primary-300">
                      Customer
                    </p>
                    <p className="mt-1 text-sm font-bold text-cream">
                      {selectedBooking.customer?.name || 'Unknown'}
                    </p>
                    {selectedBooking.customer?.email ? (
                      <a
                        href={`mailto:${selectedBooking.customer.email}`}
                        className="mt-1 flex items-center gap-1.5 text-xs text-cream-muted hover:text-primary-300"
                      >
                        <Mail className="h-3.5 w-3.5" />
                        {selectedBooking.customer.email}
                      </a>
                    ) : (
                      <p className="mt-1 text-xs text-cream-muted">No email</p>
                    )}
                    {selectedBooking.customer?.phone ? (
                      <a
                        href={`tel:${selectedBooking.customer.phone}`}
                        className="mt-1 flex items-center gap-1.5 text-xs text-cream-muted hover:text-primary-300"
                      >
                        <Phone className="h-3.5 w-3.5" />
                        {selectedBooking.customer.phone}
                      </a>
                    ) : (
                      <p className="mt-1 text-xs text-cream-muted">No phone</p>
                    )}
                    {selectedBooking.customer?.notes && (
                      <p className="mt-2.5 rounded-lg border border-neutral-800 bg-neutral-900/60 p-2 text-xs italic text-cream-muted">
                        "{selectedBooking.customer.notes}"
                      </p>
                    )}
                  </div>

                  <div className="rounded-xl border border-neutral-700 bg-neutral-950/70 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-primary-300">
                      Court Booking
                    </p>
                    <p className="mt-1 text-sm font-bold text-cream">
                      {getCourtNamesForBooking(selectedBooking)}
                    </p>
                    <p className="text-xs text-cream-muted">{formatDateLong(selectedBooking.date)}</p>
                    <p className="mt-1.5 text-xs text-cream-muted">
                      {slotsSummary(selectedBooking.slots, courts)}
                    </p>
                  </div>
                </div>

                {/* Total Summary */}
                <div className="flex items-center justify-between rounded-xl border border-primary-500/40 bg-primary-500/15 p-4">
                  <span className="text-xs font-semibold uppercase tracking-wider text-cream-muted">
                    {selectedBooking.status === 'payment_submitted'
                      ? 'Amount to verify'
                      : 'Total Amount'}
                  </span>
                  <span className="font-display text-2xl font-extrabold text-accent-400">
                    {formatCurrency(selectedBooking.total_amount || 0)}
                  </span>
                </div>

                {/* Payment Details */}
                <div className="rounded-xl border border-neutral-700 bg-neutral-950/70 p-4">
                  <p className="mb-2.5 text-xs font-bold uppercase tracking-wider text-primary-300">
                    Payment Details
                  </p>

                  {selectedBooking.payment_screenshot_url || selectedBooking.payment_reference ? (
                    <>
                      {selectedBooking.payment_reference && (
                        <div className="mb-3 flex items-center justify-between rounded-xl border border-neutral-700 bg-neutral-900/70 p-3">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-cream-muted">
                              Reference Number
                            </p>
                            <p className="mt-0.5 font-mono text-sm font-bold tracking-wider text-primary-300">
                              {selectedBooking.payment_reference}
                            </p>
                          </div>
                          <button
                            onClick={() => copyReference(selectedBooking.payment_reference || '')}
                            className="flex items-center gap-1.5 rounded-lg border border-neutral-600 bg-neutral-800 px-2.5 py-1.5 text-xs text-cream-muted transition hover:border-primary-400 hover:text-primary-300 active:scale-95"
                            title="Copy reference"
                            aria-label="Copy payment reference number"
                          >
                            {copied ? (
                              <>
                                <Check className="h-3.5 w-3.5 text-accent-400" /> Copied
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
                          className="group relative block w-full"
                          aria-label="Enlarge payment screenshot"
                        >
                          <img
                            src={selectedBooking.payment_screenshot_url}
                            alt="Payment screenshot"
                            className="max-h-72 w-full rounded-lg object-contain bg-neutral-950 border border-neutral-800"
                          />
                          <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-black/60 px-2 py-1 text-[11px] font-medium text-white opacity-90">
                            <ZoomIn className="h-3 w-3" /> Click to enlarge
                          </span>
                        </button>
                      ) : (
                        <p className="rounded-lg border border-dashed border-neutral-700 bg-neutral-950/60 p-3 text-center text-xs text-cream-muted">
                          No screenshot uploaded — customer submitted a reference number only.
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="rounded-lg border border-dashed border-neutral-700 bg-neutral-950/60 p-3 text-center text-xs text-cream-muted">
                      <p className="font-semibold text-cream">Awaiting payment</p>
                      <p className="mt-0.5">The customer hasn't submitted payment proof yet.</p>
                      {selectedBooking.status === 'pending_payment' && deadline && (
                        <p className="mt-1.5">
                          Pay by {formatDateTime(deadline)} ·{' '}
                          <span className="font-semibold text-amber-300">{timeLeft(deadline)}</span>
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Fixed bottom actions bar */}
              <div className="shrink-0 border-t border-neutral-700 bg-neutral-900 px-1 pt-4 pb-1 mt-2">
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-cream-muted">
                  Actions
                </p>

                {!TERMINAL_STATUSES.includes(selectedBooking.status) && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="mb-3 w-full sm:w-auto"
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
                          <p className="text-[11px] leading-snug text-cream-muted">
                            {notYet
                              ? 'Not available yet — this booking is in the future.'
                              : action.helper}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {hiddenAdminOnly && (
                  <p className="mt-3 text-xs text-cream-muted">
                    Refunds can only be recorded by an admin.
                  </p>
                )}

                {TERMINAL_STATUSES.includes(selectedBooking.status) && (
                  <p className="text-xs text-cream-muted">
                    This booking is{' '}
                    <span className="font-semibold text-cream">
                      {selectedBooking.status.replace(/_/g, ' ')}
                    </span>{' '}
                    and can't be changed.
                  </p>
                )}
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* ─────────────────────── Confirm action dialog ─────────────────────── */}
      <AnimatePresence>
        {pendingAction && (
          <Modal
            isOpen={!!pendingAction}
            onClose={() => setPendingAction(null)}
            title={pendingAction.action.confirm?.title || 'Are you sure?'}
            size="sm"
          >
            <div className="space-y-4">
              <p className="text-sm text-cream-muted">{pendingAction.action.confirm?.message}</p>
              <p className="text-xs text-cream-muted">
                Booking{' '}
                <span className="font-mono font-bold text-primary-300">
                  {pendingAction.booking.reference_code}
                </span>{' '}
                · {pendingAction.booking.customer?.name || 'Unknown'}
              </p>

              {pendingAction.action.confirm?.askReason && (
                <div>
                  <label
                    htmlFor="action-reason"
                    className="mb-1 block text-xs font-semibold text-cream-muted"
                  >
                    Reason (optional)
                  </label>
                  <textarea
                    id="action-reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    maxLength={300}
                    placeholder="Shown in the booking history"
                    className={selectClass}
                  />
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button size="sm" variant="secondary" onClick={() => setPendingAction(null)}>
                  Go back
                </Button>
                <Button size="sm" variant={pendingAction.action.variant} onClick={confirmPending}>
                  {pendingAction.action.confirm?.confirmLabel || 'Confirm'}
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* ─────────────────────── Screenshot lightbox ─────────────────────── */}
      {zoomImage && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-4"
          role="dialog"
          aria-label="Payment screenshot enlarged"
          onClick={() => setZoomImage(null)}
        >
          <button
            type="button"
            onClick={() => setZoomImage(null)}
            className="absolute right-4 top-4 rounded-full bg-black/60 p-2 text-white"
            aria-label="Close enlarged image"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={zoomImage}
            alt="Payment screenshot enlarged"
            className="max-h-full max-w-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <a
            href={zoomImage}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-4 rounded-lg bg-black/60 px-3 py-1.5 text-xs font-medium text-white underline"
          >
            Open in new tab
          </a>
        </div>
      )}

      {/* ─────────────────────── Toast ─────────────────────── */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[90] flex justify-center px-4"
      >
        {toast && (
          <div
            role="status"
            className={`pointer-events-auto flex max-w-md items-start gap-2 rounded-xl border px-4 py-3 text-sm font-medium shadow-2xl ${
              toast.type === 'success'
                ? 'border-accent-500/50 bg-neutral-900/95 text-accent-200'
                : 'border-red-500/50 bg-neutral-900/95 text-red-200'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <span>{toast.message}</span>
            <button
              type="button"
              onClick={() => setToast(null)}
              aria-label="Dismiss notification"
              className="ml-2 opacity-70 hover:opacity-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

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