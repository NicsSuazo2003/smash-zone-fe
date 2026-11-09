// src/pages/admin/OpenPlayManagement.tsx
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Plus,
  Edit3,
  Trash2,
  CalendarDays,
  Clock,
  UserCircle2,
  Eye,
  X,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  CreditCard,
  XCircle,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useOpenPlayStore } from '@/stores/openPlayStore';
import { useAdminStore } from '@/stores/adminStore';
import { courtService } from '@/services/courtService';
import {
  formatDateLong,
  formatTimeRange,
  formatCurrency,
  todayISO,
  formatDateTime,
} from '@/utils/format';
import type {
  OpenPlaySession,
  CreateOpenPlaySessionPayload,
  UpdateOpenPlaySessionPayload,
  OpenPlaySkillLevel,
  OpenPlayPlayer,
  Booking,
  BookingStatus,
  TimeSlot,
} from '@/types';

const SKILL_LEVELS: OpenPlaySkillLevel[] = ['Beginner', 'Intermediate', 'Advanced', 'All Levels'];

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  upcoming: { label: 'Upcoming', className: 'bg-neutral-800 text-cream-muted border border-neutral-600' },
  active: { label: 'Active Now', className: 'bg-accent-500/20 text-accent-300 border border-accent-400/40' },
  full: { label: 'Full', className: 'bg-red-500/15 text-red-400 border border-red-500/30' },
  past: { label: 'Past', className: 'bg-neutral-900/60 text-cream-muted/50 border border-neutral-800' },
  cancelled: { label: 'Cancelled', className: 'bg-neutral-900/60 text-cream-muted/50 border border-neutral-800' },
};

const PAYMENT_STATUS_BADGE: Record<string, { label: string; className: string }> = {
  pending_payment: { label: 'Pending', className: 'bg-amber-500/15 text-amber-300 border border-amber-500/30' },
  payment_submitted: { label: 'Submitted', className: 'bg-primary-500/20 text-primary-300 border border-primary-400/30' },
  confirmed: { label: 'Confirmed', className: 'bg-accent-500/20 text-accent-300 border border-accent-400/30' },
  completed: { label: 'Completed', className: 'bg-accent-500/20 text-accent-300 border border-accent-400/30' },
  cancelled: { label: 'Cancelled', className: 'bg-red-500/15 text-red-400 border border-red-500/30' },
  expired: { label: 'Expired', className: 'bg-neutral-800 text-cream-muted/60 border border-neutral-700' },
  rejected: { label: 'Rejected', className: 'bg-red-500/15 text-red-400 border border-red-500/30' },
  free: { label: 'Free', className: 'bg-primary-500/20 text-primary-300 border border-primary-400/30' },
};

const EMPTY_FORM: CreateOpenPlaySessionPayload = {
  court_ids: [],
  date: todayISO(),
  start_time: '',
  end_time: '',
  max_players: 12,
  price_per_player: 200,
  skill_level: 'All Levels',
  host_name: '',
  title: '',
  description: '',
};

export function OpenPlayManagement() {
  const {
    adminSessions,
    loadingAdminSessions,
    error,
    adminLoadSessions,
    adminCreateSession,
    adminUpdateSession,
    adminDeleteSession,
    adminLoadPlayers,
    adminLoadStats,
    players,
    loadingPlayers,
    stats,
    clearError,
  } = useOpenPlayStore();

  const { courts, loadCourts, updateBookingStatus } = useAdminStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSession, setEditingSession] = useState<OpenPlaySession | null>(null);
  const [viewingPlayers, setViewingPlayers] = useState<string | null>(null);
  const [selectedPlayerBooking, setSelectedPlayerBooking] = useState<Booking | null>(null);
  const [loadingAction, setLoadingAction] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<BookingStatus | null>(null);

  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlotIds, setSelectedSlotIds] = useState<string[]>([]);
  const [selectedCourtIds, setSelectedCourtIds] = useState<string[]>([]);

  const [showPerCourtGrid, setShowPerCourtGrid] = useState(false);
  const [perCourtSlots, setPerCourtSlots] = useState<Record<string, TimeSlot[]>>({});

  const [formData, setFormData] = useState<CreateOpenPlaySessionPayload>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    loadCourts();
    adminLoadSessions();
  }, []);

  useEffect(() => {
    if (viewingPlayers) {
      adminLoadPlayers(viewingPlayers);
      adminLoadStats(viewingPlayers);
    }
  }, [viewingPlayers, adminLoadPlayers, adminLoadStats]);

  const fetchAndSetSlots = async (
    courtIds: string[],
    date: string,
    match?: { start: string; end: string }
  ) => {
    if (courtIds.length === 0 || !date) {
      setAvailableSlots([]);
      setSelectedSlotIds([]);
      setPerCourtSlots({});
      return;
    }

    setLoadingSlots(true);
    try {
      const results = await Promise.all(
        courtIds.map((id) => courtService.getAvailability(id, date))
      );

      const byCourt: Record<string, TimeSlot[]> = {};
      courtIds.forEach((id, idx) => {
        byCourt[id] = results[idx];
      });
      setPerCourtSlots(byCourt);

      const byTime = new Map<
        string,
        { start: string; end: string; price: number; availableOn: Set<string> }
      >();

      results.forEach((slots, idx) => {
        const courtId = courtIds[idx];
        slots.forEach((s) => {
          const key = `${s.start_time}-${s.end_time}`;
          if (!byTime.has(key)) {
            byTime.set(key, {
              start: s.start_time,
              end: s.end_time,
              price: s.price,
              availableOn: new Set<string>(),
            });
          }
          if (s.is_available) byTime.get(key)!.availableOn.add(courtId);
        });
      });

      const merged = Array.from(byTime.values())
        .filter((m) => m.availableOn.size === courtIds.length)
        .sort((a, b) => a.start.localeCompare(b.start));

      const synthetic: TimeSlot[] = merged.map((m) => ({
        id: `${m.start}-${m.end}`,
        court_id: courtIds[0],
        date,
        start_time: m.start,
        end_time: m.end,
        type: 'standard',
        price: m.price,
        is_available: true,
        is_peak: false,
      }));

      setAvailableSlots(synthetic);

      if (match) {
        const found = synthetic.find(
          (s) => s.start_time === match.start && s.end_time === match.end
        );
        if (found) {
          setSelectedSlotIds([found.id]);
          setFormData((prev) => ({
            ...prev,
            start_time: found.start_time,
            end_time: found.end_time,
          }));
          return;
        }
      }

      if (synthetic.length > 0) {
        setSelectedSlotIds([synthetic[0].id]);
        setFormData((prev) => ({
          ...prev,
          start_time: synthetic[0].start_time,
          end_time: synthetic[0].end_time,
        }));
      } else {
        setSelectedSlotIds([]);
        setFormData((prev) => ({ ...prev, start_time: '', end_time: '' }));
      }
    } catch (err) {
      console.error('Failed to load slots:', err);
      setAvailableSlots([]);
      setSelectedSlotIds([]);
      setPerCourtSlots({});
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleCourtToggle = (courtId: string) => {
    const next = selectedCourtIds.includes(courtId)
      ? selectedCourtIds.filter((id) => id !== courtId)
      : [...selectedCourtIds, courtId];

    setSelectedCourtIds(next);
    setFormData((f) => ({ ...f, court_ids: next, start_time: '', end_time: '' }));
    setSelectedSlotIds([]);
    fetchAndSetSlots(next, formData.date);
  };

  const handleDateChange = (date: string) => {
    setFormData((prev) => ({ ...prev, date, start_time: '', end_time: '' }));
    setSelectedSlotIds([]);
    fetchAndSetSlots(selectedCourtIds, date);
  };

  const isContiguous = (ids: string[]) => {
    if (ids.length <= 1) return true;
    const times = ids
      .map((id) => availableSlots.find((s) => s.id === id))
      .filter(Boolean)
      .map((s) => ({ start: s!.start_time, end: s!.end_time }))
      .sort((a, b) => a.start.localeCompare(b.start));

    for (let i = 1; i < times.length; i++) {
      if (times[i].start !== times[i - 1].end) return false;
    }
    return true;
  };

  const handleSlotSelect = (slotId: string) => {
    const slot = availableSlots.find((s) => s.id === slotId);
    if (!slot) return;

    setSelectedSlotIds((prev) => {
      const isSelected = prev.includes(slotId);
      const next = isSelected ? prev.filter((id) => id !== slotId) : [...prev, slotId];

      if (!isContiguous(next)) {
        return prev;
      }

      const pickedSlots = next
        .map((id) => availableSlots.find((s) => s.id === id))
        .filter(Boolean) as TimeSlot[];

      if (pickedSlots.length === 0) {
        setFormData((f) => ({ ...f, start_time: '', end_time: '' }));
        return [];
      }

      const sorted = pickedSlots.sort((a, b) => a.start_time.localeCompare(b.start_time));
      setFormData((f) => ({
        ...f,
        start_time: sorted[0].start_time,
        end_time: sorted[sorted.length - 1].end_time,
      }));
      return next;
    });
  };

  const resetForm = () => {
    setFormData({ ...EMPTY_FORM, court_ids: [] });
    setSelectedSlotIds([]);
    setSelectedCourtIds([]);
    setAvailableSlots([]);
    setPerCourtSlots({});
    setShowPerCourtGrid(false);
    setFormError(null);
  };

  const validateForm = (): string | null => {
    if (!formData.court_ids || formData.court_ids.length === 0)
      return 'Please select at least one court';
    if (!formData.start_time || !formData.end_time) return 'Please select a time slot';
    if (formData.max_players < 2 || formData.max_players > 20)
      return 'Max players must be between 2 and 20';
    if (formData.price_per_player < 0) return 'Price per player cannot be negative';
    return null;
  };

  const handleCreate = async () => {
    const err = validateForm();
    if (err) {
      setFormError(err);
      return;
    }

    setLoadingAction(true);
    setFormError(null);

    try {
      await adminCreateSession(formData);
      setShowCreateModal(false);
      resetForm();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to create session');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingSession) return;
    const err = validateForm();
    if (err) {
      setFormError(err);
      return;
    }

    setLoadingAction(true);
    setFormError(null);

    try {
      const payload: UpdateOpenPlaySessionPayload = {
        ...formData,
        is_active: editingSession.is_active,
      };
      await adminUpdateSession(editingSession.id, payload);
      setEditingSession(null);
      resetForm();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to update session');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleDelete = async (id: string, session: OpenPlaySession) => {
    if (session.current_players > 0) {
      if (!confirm(`This session has ${session.current_players} player(s). Delete anyway?`)) return;
    } else {
      if (!confirm('Delete this session?')) return;
    }

    try {
      await adminDeleteSession(id);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete session');
    }
  };

  const openEditModal = (session: OpenPlaySession) => {
    const ids = session.courts?.map((c) => c.id) ?? [session.court_id];
    setEditingSession(session);
    setSelectedCourtIds(ids);
    setFormData({
      court_ids: ids,
      date: session.date,
      start_time: session.start_time,
      end_time: session.end_time,
      max_players: session.max_players,
      price_per_player: session.price_per_player,
      skill_level: session.skill_level,
      host_name: session.host_name || '',
      title: session.title || '',
      description: session.description || '',
    });
    setFormError(null);
    setSelectedSlotIds([]);
    setShowPerCourtGrid(false);
    fetchAndSetSlots(ids, session.date, {
      start: session.start_time,
      end: session.end_time,
    });
  };

  const openCreateModal = () => {
    setFormData({ ...EMPTY_FORM });
    setSelectedCourtIds([]);
    setSelectedSlotIds([]);
    setAvailableSlots([]);
    setPerCourtSlots({});
    setShowPerCourtGrid(false);
    setFormError(null);
    setShowCreateModal(true);
  };

  const toggleActive = async (session: OpenPlaySession) => {
    try {
      const payload: UpdateOpenPlaySessionPayload = {
        court_ids: session.courts?.map((c) => c.id) ?? [session.court_id],
        date: session.date,
        start_time: session.start_time,
        end_time: session.end_time,
        max_players: session.max_players,
        price_per_player: session.price_per_player,
        skill_level: session.skill_level,
        host_name: session.host_name || '',
        title: session.title || '',
        description: session.description || '',
        is_active: !session.is_active,
      };
      await adminUpdateSession(session.id, payload);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update session');
    }
  };

  const handlePlayerStatusUpdate = async (bookingId: string, status: BookingStatus) => {
    setUpdatingStatus(status);
    try {
      await updateBookingStatus(bookingId, status);
      if (viewingPlayers) {
        adminLoadPlayers(viewingPlayers);
        adminLoadStats(viewingPlayers);
      }
      setSelectedPlayerBooking((prev) =>
        prev && prev.id === bookingId ? { ...prev, status } : prev
      );
    } finally {
      setUpdatingStatus(null);
    }
  };

  const openPlayerDetails = (player: OpenPlayPlayer) => {
    let dateStr = new Date().toISOString().split('T')[0];
    if (player.joined_at) {
      try {
        const d = new Date(player.joined_at);
        if (!isNaN(d.getTime())) dateStr = d.toISOString().split('T')[0];
      } catch {
        /* fallback */
      }
    }

    const booking: Booking = {
      id: player.booking_id,
      reference_code: player.reference_code,
      court_id: '',
      court_name: 'Open Play Session',
      date: dateStr,
      slots: [],
      customer: {
        name: player.customer_name,
        email: player.customer_email,
        phone: player.customer_phone ?? '',
        notes: '',
      },
      total_amount: player.amount_paid || 0,
      status: player.status as BookingStatus,
      payment_screenshot_url: undefined,
      payment_reference: undefined,
      gcash_number: '',
      created_at: player.joined_at,
      updated_at: player.joined_at,
      open_play_session_id: viewingPlayers || '',
    };
    setSelectedPlayerBooking(booking);
  };

  const handleViewPlayers = (sessionId: string) => setViewingPlayers(sessionId);

  const buildPerCourtGrid = () => {
    const intervals = new Map<string, { start: string; end: string }>();
    Object.values(perCourtSlots).forEach((slots) => {
      slots.forEach((s) => {
        const key = `${s.start_time}-${s.end_time}`;
        if (!intervals.has(key)) {
          intervals.set(key, { start: s.start_time, end: s.end_time });
        }
      });
    });

    const sorted = Array.from(intervals.values()).sort((a, b) =>
      a.start.localeCompare(b.start)
    );

    return sorted.map((interval) => {
      const cells: Record<string, TimeSlot | undefined> = {};
      selectedCourtIds.forEach((courtId) => {
        const slot = perCourtSlots[courtId]?.find(
          (s) => s.start_time === interval.start && s.end_time === interval.end
        );
        cells[courtId] = slot;
      });
      return { ...interval, cells };
    });
  };

  if (loadingAdminSessions) {
    return (
      <div className="py-14 text-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 sm:space-y-6 sm:p-6 text-cream">
      <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold tracking-tight text-cream sm:text-lg">
            <Users className="h-5 w-5 text-primary-300" />
            Open Play Sessions
          </h2>
          <p className="mt-0.5 text-xs text-cream-muted sm:text-sm">
            Create and organize social group play sessions
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            leftIcon={<RefreshCw className="h-4 w-4" />}
            onClick={adminLoadSessions}
          >
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={openCreateModal}>
            New Session
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-error/30 bg-error/10 p-3 text-xs text-error font-medium">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
          <button onClick={clearError} className="ml-auto text-error/70 hover:text-error">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {adminSessions.length === 0 ? (
        <div className="rounded-2xl border border-neutral-700 bg-neutral-900/60 p-8 text-center shadow-xl backdrop-blur-sm">
          <Users className="mx-auto h-10 w-10 text-cream-muted/30" />
          <p className="mt-2 text-sm font-semibold text-cream-muted">
            No Open Play sessions created yet.
          </p>
          <p className="text-xs text-cream-muted/60">
            Create your first session to get players joining.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {adminSessions.map((session) => {
            const status = STATUS_BADGE[session.status] ?? STATUS_BADGE.upcoming;
            const courtNames =
              session.courts && session.courts.length > 0
                ? session.courts.map((c) => c.name).join(', ')
                : session.court_name;

            return (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-700 bg-neutral-900/80 p-4 shadow-xl backdrop-blur-sm transition-all hover:border-primary-400/50"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-bold text-cream sm:text-base">
                      {session.title || session.host_name || courtNames}
                    </h3>
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${status.className}`}>
                      {status.label}
                    </span>
                    <span className="rounded-full border border-primary-400/30 bg-primary-500/20 px-2.5 py-0.5 text-[10px] font-bold text-primary-200">
                      {session.skill_level}
                    </span>
                    {!session.is_active && (
                      <span className="rounded-full border border-red-500/40 bg-red-500/20 px-2.5 py-0.5 text-[10px] font-bold text-red-400">
                        Inactive
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-cream-muted">
                    <span className="flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5 text-primary-300" />
                      {formatDateLong(session.date)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-primary-300" />
                      {formatTimeRange(session.start_time, session.end_time)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-primary-300" />
                      {session.current_players}/{session.max_players} players
                    </span>
                    <span className="font-extrabold text-accent-400">
                      {session.price_per_player === 0
                        ? 'Free'
                        : `${formatCurrency(session.price_per_player)}/player`}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <UserCircle2 className="h-3.5 w-3.5 text-primary-300" />
                      {courtNames}
                    </span>
                    {session.host_name && (
                      <span className="flex items-center gap-1.5">
                        Host: {session.host_name}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleViewPlayers(session.id)}
                    className="rounded-lg border border-neutral-600 bg-neutral-800/60 p-2 text-cream-muted transition hover:border-primary-400 hover:text-primary-300 active:scale-95"
                    title="View players"
                  >
                    <Eye className="h-4 w-4" />
                  </button>

                  <button
                    onClick={() => toggleActive(session)}
                    className={`rounded-lg border p-2 transition active:scale-95 ${
                      session.is_active
                        ? 'border-accent-500/40 bg-accent-500/15 text-accent-300 hover:border-accent-400'
                        : 'border-neutral-600 bg-neutral-800/60 text-cream-muted hover:border-primary-400 hover:text-primary-300'
                    }`}
                    title={session.is_active ? 'Deactivate' : 'Activate'}
                  >
                    {session.is_active ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </button>

                  <button
                    onClick={() => openEditModal(session)}
                    className="rounded-lg border border-neutral-600 bg-neutral-800/60 p-2 text-cream-muted transition hover:border-primary-400 hover:text-primary-300 active:scale-95"
                    title="Edit session"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>

                  <button
                    onClick={() => handleDelete(session.id, session)}
                    className="rounded-lg border border-neutral-600 bg-neutral-800/60 p-2 text-cream-muted transition hover:border-error hover:text-error active:scale-95"
                    title="Delete session"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={showCreateModal || !!editingSession}
        onClose={() => {
          setShowCreateModal(false);
          setEditingSession(null);
          resetForm();
        }}
        title={editingSession ? 'Edit Session' : 'Create Open Play Session'}
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-cream-muted">
              <span>Courts *</span>
              {selectedCourtIds.length > 0 && (
                <span className="text-primary-300">({selectedCourtIds.length} selected)</span>
              )}
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {courts.map((court) => {
                const checked = selectedCourtIds.includes(court.id);
                return (
                  <button
                    key={court.id}
                    type="button"
                    onClick={() => handleCourtToggle(court.id)}
                    className={`rounded-xl border p-2.5 text-left text-xs transition ${
                      checked
                        ? 'border-primary-400 bg-primary-500 text-white font-bold'
                        : 'border-neutral-700 bg-neutral-950/60 text-cream-muted hover:border-primary-400/50 hover:text-cream'
                    }`}
                  >
                    <span className="block">{court.name}</span>
                    <span className="block text-[10px] opacity-75 mt-0.5">
                      {formatCurrency(court.price_per_hour)}/hr
                    </span>
                  </button>
                );
              })}
            </div>
            {courts.length === 0 && (
              <p className="text-xs text-cream-muted">No courts available.</p>
            )}
          </div>

          <div className="grid gap-3.5 sm:grid-cols-2">
            <Input
              label="Date *"
              type="date"
              min={todayISO()}
              value={formData.date}
              onChange={(e) => handleDateChange(e.target.value)}
            />

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-cream-muted">
                Skill Level *
              </label>
              <select
                value={formData.skill_level}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    skill_level: e.target.value as OpenPlaySkillLevel,
                  })
                }
                className="w-full rounded-xl border border-neutral-700 bg-neutral-950/70 px-3.5 py-2.5 text-sm text-cream transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              >
                {SKILL_LEVELS.map((level) => (
                  <option key={level} value={level} className="bg-neutral-900">
                    {level}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1.5 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-cream-muted">
              <span>Time Slot *</span>
              {selectedCourtIds.length > 1 && (
                <span className="text-primary-300 text-[10px] font-normal">
                  Only slots free on all {selectedCourtIds.length} courts shown
                </span>
              )}
            </label>

            {selectedCourtIds.length === 0 || !formData.date ? (
              <p className="text-xs text-cream-muted">Select at least one court and a date first</p>
            ) : loadingSlots ? (
              <div className="flex items-center gap-2 py-3">
                <LoadingSpinner />
                <span className="text-xs text-cream-muted">Loading court availability...</span>
              </div>
            ) : availableSlots.length === 0 ? (
              <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs font-medium text-amber-300">
                No common available slots across the selected courts for this date.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {availableSlots.map((slot) => {
                    const isSelected = selectedSlotIds.includes(slot.id);
                    return (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => handleSlotSelect(slot.id)}
                        className={`rounded-xl border p-2.5 text-center text-xs transition ${
                          isSelected
                            ? 'border-accent-400 bg-accent-500 text-neutral-950 shadow-glow-lime font-bold'
                            : 'border-neutral-700 bg-neutral-950/60 text-cream-muted hover:border-primary-400/50 hover:text-cream'
                        }`}
                      >
                        <span className="font-mono block font-bold">
                          {formatTimeRange(slot.start_time, slot.end_time)}
                        </span>
                        <span className="block text-[10px] opacity-75 mt-0.5">
                          {formatCurrency(slot.price)}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {selectedSlotIds.length > 1 && formData.start_time && formData.end_time && (
                  <div className="mt-2.5 rounded-xl border border-primary-500/30 bg-primary-500/10 p-2.5 text-xs">
                    <p className="font-semibold text-primary-200">
                      Selected range: {formatTimeRange(formData.start_time, formData.end_time)}
                    </p>
                    <p className="text-[11px] text-cream-muted mt-0.5">
                      {selectedSlotIds.length} hour{selectedSlotIds.length > 1 ? 's' : ''} ×{' '}
                      {selectedCourtIds.length} court
                      {selectedCourtIds.length > 1 ? 's' : ''}
                    </p>
                  </div>
                )}
              </>
            )}

            {selectedCourtIds.length > 1 && !loadingSlots && Object.keys(perCourtSlots).length > 0 && (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => setShowPerCourtGrid((v) => !v)}
                  className="flex w-full items-center justify-between rounded-xl border border-neutral-700 bg-neutral-950/60 px-3 py-2 text-xs font-semibold text-cream-muted transition hover:border-primary-400/50 hover:text-cream"
                >
                  <span className="flex items-center gap-2">
                    {showPerCourtGrid ? (
                      <ChevronUp className="h-3.5 w-3.5 text-primary-300" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5 text-primary-300" />
                    )}
                    Check availability per court
                  </span>
                  <span className="text-[10px] font-normal text-cream-muted/70">
                    Why some hours are hidden
                  </span>
                </button>

                {showPerCourtGrid && (
                  <div className="mt-2 overflow-hidden rounded-xl border border-neutral-700 bg-neutral-950/70">
                    <div className="max-h-[320px] overflow-auto">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 z-10 bg-neutral-900 border-b border-neutral-700">
                          <tr>
                            <th className="px-3 py-2 text-left font-bold uppercase tracking-wider text-cream-muted text-[10px]">
                              Hour
                            </th>
                            {selectedCourtIds.map((courtId) => {
                              const court = courts.find((c) => c.id === courtId);
                              return (
                                <th
                                  key={courtId}
                                  className="px-3 py-2 text-center font-bold uppercase tracking-wider text-primary-200 text-[10px]"
                                >
                                  {court?.name || 'Court'}
                                </th>
                              );
                            })}
                          </tr>
                        </thead>
                        <tbody>
                          {buildPerCourtGrid().map((row) => {
                            const allFree = selectedCourtIds.every(
                              (id) => row.cells[id]?.is_available === true
                            );
                            return (
                              <tr
                                key={`${row.start}-${row.end}`}
                                className={`border-b border-neutral-800/60 ${allFree ? 'bg-primary-500/5' : ''}`}
                              >
                                <td className="px-3 py-1.5 font-mono font-bold text-cream whitespace-nowrap">
                                  {formatTimeRange(row.start, row.end)}
                                </td>
                                {selectedCourtIds.map((courtId) => {
                                  const cell = row.cells[courtId];
                                  if (!cell) {
                                    return (
                                      <td
                                        key={courtId}
                                        className="px-3 py-1.5 text-center text-cream-muted/30"
                                      >
                                        —
                                      </td>
                                    );
                                  }
                                  return (
                                    <td key={courtId} className="px-3 py-1.5 text-center">
                                      {cell.is_available ? (
                                        <span className="inline-flex items-center gap-1 text-accent-300">
                                          <Check className="h-3.5 w-3.5" />
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 text-red-400/80">
                                          <X className="h-3.5 w-3.5" />
                                        </span>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className="border-t border-neutral-700 bg-neutral-900/60 px-3 py-2 text-[10px] text-cream-muted">
                      <Check className="mr-1 inline h-3 w-3 text-accent-300" /> = free ·
                      <X className="mx-1 inline h-3 w-3 text-red-400/80" /> = booked/blocked ·
                      Hours free on <strong className="text-primary-200">all courts</strong> appear in the picker above.
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid gap-3.5 sm:grid-cols-2">
            <Input
              label="Max Players *"
              type="number"
              min={2}
              max={20}
              value={formData.max_players}
              onChange={(e) =>
                setFormData({ ...formData, max_players: parseInt(e.target.value) || 2 })
              }
              hint="2-20 players (total across all courts)"
            />

            <Input
              label="Price Per Player (₱) *"
              type="number"
              min={0}
              step={50}
              value={formData.price_per_player}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  price_per_player: parseFloat(e.target.value) || 0,
                })
              }
              hint="Set to 0 for a free session"
            />
          </div>

          <Input
            label="Session Title (optional)"
            placeholder="e.g. Friday Night Socials"
            value={formData.title || ''}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />

          <Input
            label="Host Name (optional)"
            placeholder="e.g. Coach Nicole"
            value={formData.host_name || ''}
            onChange={(e) => setFormData({ ...formData, host_name: e.target.value })}
          />

          <Input
            label="Description (optional)"
            placeholder="e.g. Social open play games for all levels"
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />

          {formError && (
            <div className="flex items-center gap-2 rounded-xl border border-error/30 bg-error/10 p-3 text-xs text-error font-medium">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {formError}
            </div>
          )}

          <div className="flex flex-col gap-2.5 border-t border-neutral-700 pt-4 sm:flex-row sm:gap-3">
            <Button
              fullWidth
              isLoading={loadingAction}
              onClick={editingSession ? handleUpdate : handleCreate}
            >
              {editingSession ? 'Update Session' : 'Create Session'}
            </Button>
            <Button
              variant="ghost"
              fullWidth
              className="sm:w-auto"
              onClick={() => {
                setShowCreateModal(false);
                setEditingSession(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!viewingPlayers}
        onClose={() => setViewingPlayers(null)}
        title="Session Roster"
        size="lg"
      >
        {loadingPlayers ? (
          <div className="py-10 text-center">
            <LoadingSpinner />
          </div>
        ) : (
          <>
            {stats && (
              <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
                <div className="rounded-xl border border-neutral-700 bg-neutral-950/70 p-3 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-cream-muted">Players</p>
                  <p className="mt-1 text-xl font-extrabold text-cream">
                    {stats.total_players}/{stats.max_players}
                  </p>
                </div>
                <div className="rounded-xl border border-neutral-700 bg-neutral-950/70 p-3 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-cream-muted">Confirmed</p>
                  <p className="mt-1 text-xl font-extrabold text-accent-300">
                    {stats.confirmed_count}
                  </p>
                  {stats.total_revenue > 0 && (
                    <p className="text-[10px] text-accent-400 font-semibold">
                      {formatCurrency(stats.total_revenue)}
                    </p>
                  )}
                </div>
                <div className="rounded-xl border border-neutral-700 bg-neutral-950/70 p-3 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-cream-muted">Pending</p>
                  <p className="mt-1 text-xl font-extrabold text-amber-300">
                    {stats.pending_count}
                  </p>
                  {stats.pending_revenue > 0 && (
                    <p className="text-[10px] text-amber-300 font-semibold">
                      {formatCurrency(stats.pending_revenue)}
                    </p>
                  )}
                </div>
                <div className="rounded-xl border border-neutral-700 bg-neutral-950/70 p-3 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-cream-muted">Est. Revenue</p>
                  <p className="mt-1 text-xl font-extrabold text-accent-400">
                    {formatCurrency((stats.total_revenue || 0) + (stats.pending_revenue || 0))}
                  </p>
                </div>
              </div>
            )}

            {players.length === 0 ? (
              <div className="py-8 text-center text-xs text-cream-muted">
                No players have registered for this session yet.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
                {players.map((player) => {
                  const status =
                    PAYMENT_STATUS_BADGE[player.status] ?? PAYMENT_STATUS_BADGE.pending_payment;
                  return (
                    <div
                      key={player.booking_id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-700 bg-neutral-950/70 p-3.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-cream">
                          {player.customer_name}
                        </p>
                        <p className="truncate text-xs text-cream-muted">
                          {player.customer_email}
                        </p>
                        {player.customer_phone && (
                          <p className="text-xs text-cream-muted/70">{player.customer_phone}</p>
                        )}
                        <p className="font-mono text-xs font-semibold text-primary-300 mt-1">
                          {player.reference_code}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${status.className}`}
                          >
                            {status.label}
                          </span>
                          <p className="mt-1 text-xs font-semibold text-cream">
                            {player.amount_paid === 0
                              ? 'Free'
                              : formatCurrency(player.amount_paid)}{' '}
                            <span className="text-[10px] text-cream-muted font-normal">
                              {player.amount_paid === 0
                                ? ''
                                : player.status === 'confirmed' || player.status === 'completed'
                                ? 'paid'
                                : '(pending)'}
                            </span>
                          </p>
                          <p className="text-[10px] text-cream-muted">
                            Joined {new Date(player.joined_at).toLocaleDateString()}
                          </p>
                        </div>
                        <button
                          onClick={() => openPlayerDetails(player)}
                          className="rounded-lg border border-neutral-600 bg-neutral-800/60 p-2 text-cream-muted transition hover:border-primary-400 hover:text-primary-300 active:scale-95"
                          title="Manage player payment"
                        >
                          <CreditCard className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </Modal>

      <Modal
        isOpen={!!selectedPlayerBooking}
        onClose={() => setSelectedPlayerBooking(null)}
        title={`Booking ${selectedPlayerBooking?.reference_code || 'N/A'}`}
        size="lg"
      >
        {selectedPlayerBooking && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-700 pb-3">
              <StatusBadge status={selectedPlayerBooking.status} />
              <span className="text-xs text-cream-muted font-medium">
                Joined {formatDateTime(selectedPlayerBooking.created_at)}
              </span>
            </div>

            <div className="grid gap-3.5 sm:grid-cols-2">
              <div className="rounded-xl border border-neutral-700 bg-neutral-950/70 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-primary-300">
                  Customer
                </p>
                <p className="mt-1 text-sm font-bold text-cream">
                  {selectedPlayerBooking.customer?.name || 'Unknown'}
                </p>
                <p className="text-xs text-cream-muted">
                  {selectedPlayerBooking.customer?.email || 'No email'}
                </p>
                <p className="text-xs text-cream-muted">
                  {selectedPlayerBooking.customer?.phone || 'No phone'}
                </p>
                {selectedPlayerBooking.customer?.notes && (
                  <p className="mt-2 text-xs italic text-cream-muted">
                    "{selectedPlayerBooking.customer.notes}"
                  </p>
                )}
              </div>
              <div className="rounded-xl border border-neutral-700 bg-neutral-950/70 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-primary-300">
                  Session Information
                </p>
                <p className="mt-1 text-sm font-bold text-cream">Social Open Play</p>
                <p className="text-xs text-cream-muted">
                  {formatDateLong(selectedPlayerBooking.date)}
                </p>
                <p className="mt-1 font-mono text-xs text-primary-300">
                  Ref: {selectedPlayerBooking.reference_code}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-primary-500/40 bg-primary-500/15 p-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-cream-muted">
                Total Amount
              </span>
              <span className="font-display text-2xl font-extrabold text-accent-400">
                {selectedPlayerBooking.total_amount === 0
                  ? 'Free'
                  : formatCurrency(selectedPlayerBooking.total_amount || 0)}
              </span>
            </div>

            <div className="border-t border-neutral-700 pt-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-cream-muted">
                Update Payment Status
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedPlayerBooking.status !== 'confirmed' && (
                  <Button
                    size="sm"
                    variant="success"
                    isLoading={updatingStatus === 'confirmed'}
                    disabled={updatingStatus !== null}
                    leftIcon={<CheckCircle2 className="h-4 w-4" />}
                    onClick={() =>
                      handlePlayerStatusUpdate(selectedPlayerBooking.id, 'confirmed')
                    }
                  >
                    Confirm Payment
                  </Button>
                )}
                {selectedPlayerBooking.status !== 'completed' &&
                  selectedPlayerBooking.status === 'confirmed' && (
                    <Button
                      size="sm"
                      variant="primary"
                      isLoading={updatingStatus === 'completed'}
                      disabled={updatingStatus !== null}
                      onClick={() =>
                        handlePlayerStatusUpdate(selectedPlayerBooking.id, 'completed')
                      }
                    >
                      Mark Completed
                    </Button>
                  )}
                {selectedPlayerBooking.status !== 'cancelled' && (
                  <Button
                    size="sm"
                    variant="danger"
                    isLoading={updatingStatus === 'cancelled'}
                    disabled={updatingStatus !== null}
                    leftIcon={<XCircle className="h-4 w-4" />}
                    onClick={() =>
                      handlePlayerStatusUpdate(selectedPlayerBooking.id, 'cancelled')
                    }
                  >
                    Cancel Registration
                  </Button>
                )}
                {selectedPlayerBooking.status !== 'rejected' && (
                  <Button
                    size="sm"
                    variant="danger"
                    isLoading={updatingStatus === 'rejected'}
                    disabled={updatingStatus !== null}
                    onClick={() =>
                      handlePlayerStatusUpdate(selectedPlayerBooking.id, 'rejected')
                    }
                  >
                    Reject
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}