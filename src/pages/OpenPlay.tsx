// src/pages/OpenPlay.tsx
import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Users,
  Clock,
  CalendarDays,
  UserCircle2,
  ArrowRight,
  Eye,
  User,
  Mail,
  Phone,
  ScrollText,
  X,
  BadgeCheck,
  ShieldAlert,
} from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { useOpenPlayStore } from '@/stores/openPlayStore';
import { useBookingStore } from '@/stores/bookingStore';
import { formatDateLong, formatTimeRange, formatCurrency } from '@/utils/format';
import type { OpenPlaySession } from '@/types';
import { openPlayService } from '@/services/openPlayService';
import type { PublicOpenPlayPlayer } from '@/services/openPlayService';

// ── Local form schema (mirrors Booking.tsx) ──────────────────
const normalizePhone = (value: string) =>
  value.replace(/[\s\-()]/g, '').replace(/^\+?63/, '0');

const customerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name is required')
    .max(80, 'Name is too long')
    .regex(/^[A-Za-zÀ-ÿ.'\-\s]+$/, "Name can only contain letters, spaces, and . ' -"),

  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'Email is required')
    .email('Enter a valid email address')
    .max(120, 'Email is too long'),

  phone: z
    .string()
    .trim()
    .min(1, 'Mobile number is required')
    .transform(normalizePhone)
    .refine((v) => /^09\d{9}$/.test(v), {
      message: 'Enter a valid PH mobile number (e.g. 0917 123 4567)',
    }),

  notes: z.string().max(500, 'Notes are too long').optional(),
});

type CustomerForm = z.infer<typeof customerSchema>;

const SKILL_BADGE: Record<string, string> = {
  Beginner: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
  Intermediate: 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
  Advanced: 'bg-purple-500/15 text-purple-300 border border-purple-500/30',
  'All Levels': 'bg-primary-500/20 text-primary-200 border border-primary-400/40',
};

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  upcoming: {
    label: 'Upcoming',
    className: 'bg-neutral-800 text-cream-muted border border-neutral-600',
  },
  active: {
    label: 'Active Now',
    className:
      'bg-accent-500/20 text-accent-300 border border-accent-400/40',
  },
  full: { label: 'Full', className: 'bg-red-500/15 text-red-400 border border-red-500/30' },
  past: {
    label: 'Past',
    className: 'bg-neutral-900/60 text-cream-muted/50 border border-neutral-800',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-neutral-900/60 text-cream-muted/50 border border-neutral-800',
  },
};

export function OpenPlay() {
  const navigate = useNavigate();
  const location = useLocation();
  const { sessions, loadingSessions, error, loadUpcomingSessions } = useOpenPlayStore();

  // ── Join modal state ─────────────────────────────────────
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState<OpenPlaySession | null>(null);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  // ── Session terms modal state ────────────────────────────
  const [showTermsModal, setShowTermsModal] = useState(false);

  const {
    register,
    handleSubmit,
    reset: resetCustomerForm,
    formState: { errors: customerErrors },
  } = useForm<CustomerForm>({
    resolver: zodResolver(customerSchema),
    mode: 'onBlur',
    defaultValues: { name: '', email: '', phone: '', notes: '' },
  });

  // ── Details modal state ──────────────────────────────────
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsSession, setDetailsSession] = useState<OpenPlaySession | null>(null);
  const [detailsPlayers, setDetailsPlayers] = useState<PublicOpenPlayPlayer[]>([]);
  const [loadingDetailsPlayers, setLoadingDetailsPlayers] = useState(false);
  const [rosterUnavailable, setRosterUnavailable] = useState(false);

  useEffect(() => {
    loadUpcomingSessions();
  }, []);

  // Auto-open details modal if session ID is passed via state
  useEffect(() => {
    const state = location.state as { selectedSessionId?: string } | null;
    const sessionId = state?.selectedSessionId;

    if (sessionId && sessions.length > 0) {
      const session = sessions.find((s) => s.id === sessionId);
      if (!session) return;
      if (
        session.status === 'full' ||
        session.status === 'past' ||
        session.status === 'cancelled'
      ) {
        return;
      }
      handleViewDetails(session);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions, location.state]);

  // ── Details handlers ─────────────────────────────────────
  const handleViewDetails = async (session: OpenPlaySession) => {
    setDetailsSession(session);
    setShowDetailsModal(true);
    setRosterUnavailable(false);
    setDetailsPlayers([]);
    setLoadingDetailsPlayers(true);

    try {
      const players = await openPlayService.getSessionPlayers(session.id);
      setDetailsPlayers(players);
    } catch (err) {
      console.warn('Roster unavailable:', err);
      setRosterUnavailable(true);
    } finally {
      setLoadingDetailsPlayers(false);
    }
  };

  const handleDetailsClose = () => {
    setShowDetailsModal(false);
    setDetailsSession(null);
    setDetailsPlayers([]);
    setRosterUnavailable(false);
    navigate('/open-play', { replace: true, state: {} });
  };

  // ── Join handlers ────────────────────────────────────────
  const handleJoinClick = (session: OpenPlaySession) => {
    setSelectedSession(session);
    setShowJoinModal(true);
    setJoinError(null);
    resetCustomerForm({ name: '', email: '', phone: '', notes: '' });
  };

  const handleJoinFromDetails = () => {
    if (!detailsSession) return;
    const session = detailsSession;
    handleDetailsClose();
    handleJoinClick(session);
  };

  const handleJoinConfirm = async (data: CustomerForm) => {
    if (!selectedSession) return;

    setJoining(true);
    setJoinError(null);

    try {
      const booking = await openPlayService.joinSession(selectedSession.id, data);

      const store = useBookingStore.getState();
      store.reset();
      useBookingStore.setState({ currentBooking: booking });

      setShowJoinModal(false);
      resetCustomerForm();

      if (booking.status === 'confirmed' && booking.total_amount === 0) {
        navigate('/success');
      } else {
        navigate('/checkout');
      }
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : 'Failed to join session');
    } finally {
      setJoining(false);
    }
  };

  const handleModalClose = () => {
    setShowJoinModal(false);
    setSelectedSession(null);
    navigate('/open-play', { replace: true, state: {} });
  };

  return (
    <div className="min-h-screen bg-charcoal text-cream">
      <Navbar />

      <div className="container-page pt-24 pb-16 sm:pt-28">
        <div className="mb-8 text-center sm:mb-10">
          <span className="mb-2.5 inline-flex items-center gap-1.5 rounded-full border border-primary-400/40 bg-primary-500/20 px-3.5 py-1 text-xs font-bold text-primary-300">
            <Users className="h-3.5 w-3.5" />
            Social Open Play
          </span>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-cream sm:text-4xl lg:text-5xl">
            Join a Social Session
          </h1>
          <p className="mx-auto mt-2.5 max-w-xl text-xs leading-relaxed text-cream-muted sm:text-sm">
            Drop into a group game, meet other players, and split the court. Pick a session
            below and reserve your spot.
          </p>
        </div>

        {/* Session terms trigger */}
        <div className="mb-6 flex justify-center sm:mb-8">
          <button
            type="button"
            onClick={() => setShowTermsModal(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-neutral-700 bg-neutral-900/60 px-3.5 py-2 text-xs font-semibold text-cream-muted transition hover:border-primary-400 hover:text-primary-300"
          >
            <ScrollText className="h-3.5 w-3.5" />
            Read Session Terms
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-error/30 bg-error/10 p-3 text-center text-xs font-semibold text-error">
            {error}
          </div>
        )}

        {loadingSessions ? (
          <LoadingSpinner className="py-20" />
        ) : sessions.length === 0 ? (
          <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-2xl border border-neutral-700 bg-neutral-900/60 p-8 text-center shadow-xl backdrop-blur-sm">
            <CalendarDays className="h-10 w-10 text-cream-muted/40" />
            <div>
              <h2 className="text-sm font-bold text-cream">No sessions scheduled yet</h2>
              <p className="mt-1 text-xs text-cream-muted">
                Check back soon, or book a private court in the meantime.
              </p>
            </div>
            <Button size="md" to="/booking">
              Book a Court
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sessions.map((session, i) => {
              const isFull = session.status === 'full';
              const status = STATUS_BADGE[session.status] ?? STATUS_BADGE.upcoming;
              return (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => handleViewDetails(session)}
                  className="card rounded-2xl border border-neutral-700 bg-neutral-900/80 p-5 shadow-xl transition-all hover:border-primary-400/60 hover:shadow-glow-blue cursor-pointer flex flex-col justify-between"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleViewDetails(session);
                    }
                  }}
                >
                  <div>
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${status.className}`}
                      >
                        {status.label}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          SKILL_BADGE[session.skill_level] ?? SKILL_BADGE['All Levels']
                        }`}
                      >
                        {session.skill_level}
                      </span>
                    </div>

                    <h3 className="font-display text-base font-bold text-cream">
                      {session.title || session.host_name || 'Open Play Session'}
                    </h3>

                    <div className="mt-3 space-y-2 text-xs text-cream-muted">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-3.5 w-3.5 text-primary-300" />
                        <span>{formatDateLong(session.date)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-primary-300" />
                        <span>{formatTimeRange(session.start_time, session.end_time)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-3.5 w-3.5 text-primary-300" />
                        <span>
                          {session.current_players}/{session.max_players} players ·{' '}
                          {session.spots_left} spot{session.spots_left === 1 ? '' : 's'} left
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <UserCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary-300" />
                        <div className="flex flex-wrap gap-1">
                          {session.courts && session.courts.length > 0 ? (
                            session.courts.map((c) => (
                              <span
                                key={c.id}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 border border-neutral-600"
                              >
                                {c.name}
                              </span>
                            ))
                          ) : (
                            <span>{session.court_name}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {session.description && (
                      <p className="mt-3 line-clamp-2 text-xs text-cream-muted/80 leading-relaxed">
                        {session.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-neutral-700 pt-3.5">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-cream-muted font-semibold">
                        Per player
                      </p>
                      <p className="font-display text-lg font-extrabold text-accent-400">
                        {session.price_per_player === 0
                          ? 'Free'
                          : formatCurrency(session.price_per_player)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewDetails(session);
                        }}
                        leftIcon={<Eye className="h-3.5 w-3.5" />}
                      >
                        View
                      </Button>
                      <Button
                        size="sm"
                        disabled={isFull}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleJoinClick(session);
                        }}
                        rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
                      >
                        {isFull ? 'Full' : 'Join'}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        <p className="mt-8 text-center text-xs text-cream-muted">
          Sessions may be cancelled if minimum players are not met.{' '}
          <button
            type="button"
            onClick={() => setShowTermsModal(true)}
            className="font-semibold text-primary-300 underline hover:text-primary-200"
          >
            Read session terms
          </button>
        </p>
      </div>

      {/* ─────────────────────── Details Modal ─────────────────────── */}
      <Modal
        isOpen={showDetailsModal}
        onClose={handleDetailsClose}
        title="Session Details"
        size="md"
      >
        {detailsSession && (
          <div className="space-y-4">
            <div>
              <div className="mb-2.5 flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                    (STATUS_BADGE[detailsSession.status] ?? STATUS_BADGE.upcoming).className
                  }`}
                >
                  {(STATUS_BADGE[detailsSession.status] ?? STATUS_BADGE.upcoming).label}
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                    SKILL_BADGE[detailsSession.skill_level] ?? SKILL_BADGE['All Levels']
                  }`}
                >
                  {detailsSession.skill_level}
                </span>
              </div>
              <h3 className="font-display text-lg font-bold text-cream">
                {detailsSession.title || detailsSession.host_name || 'Open Play Session'}
              </h3>
            </div>

            <div className="space-y-2 rounded-xl border border-neutral-700 bg-neutral-950/70 p-3.5 text-xs text-cream-muted">
              <div className="flex items-center gap-2.5">
                <CalendarDays className="h-4 w-4 text-primary-300" />
                <span>{formatDateLong(detailsSession.date)}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Clock className="h-4 w-4 text-primary-300" />
                <span>
                  {formatTimeRange(detailsSession.start_time, detailsSession.end_time)}
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <UserCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary-300" />
                <div className="flex flex-wrap gap-1.5">
                  {detailsSession.courts && detailsSession.courts.length > 0 ? (
                    detailsSession.courts.map((c) => (
                      <span
                        key={c.id}
                        className="text-[10px] px-2 py-0.5 rounded bg-neutral-800 border border-neutral-600"
                      >
                        {c.name}
                      </span>
                    ))
                  ) : (
                    <span>{detailsSession.court_name}</span>
                  )}
                </div>
              </div>
            </div>

            {detailsSession.description && (
              <div>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-primary-300">
                  About this session
                </p>
                <p className="whitespace-pre-wrap text-xs text-cream-muted leading-relaxed">
                  {detailsSession.description}
                </p>
              </div>
            )}

            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-primary-300">
                Players ({detailsSession.current_players}/{detailsSession.max_players})
              </p>

              <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-neutral-800 border border-neutral-700">
                <div
                  className="h-full bg-primary-400 transition-all duration-300"
                  style={{
                    width: `${Math.min(
                      100,
                      (detailsSession.current_players / detailsSession.max_players) * 100
                    )}%`,
                  }}
                />
              </div>

              {loadingDetailsPlayers ? (
                <div className="py-3">
                  <LoadingSpinner className="py-2" />
                </div>
              ) : rosterUnavailable ? (
                <p className="text-xs text-cream-muted">
                  {detailsSession.current_players} player
                  {detailsSession.current_players === 1 ? '' : 's'} joined ·{' '}
                  {detailsSession.spots_left} spot
                  {detailsSession.spots_left === 1 ? '' : 's'} left
                </p>
              ) : detailsPlayers.length === 0 ? (
                <p className="text-xs text-cream-muted">
                  No one has joined yet — be the first!
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {detailsPlayers.map((player) => (
                    <span
                      key={player.booking_id}
                      className="rounded-lg border border-neutral-600 bg-neutral-800/90 px-2.5 py-1 text-[11px] font-medium text-cream"
                    >
                      {player.display_name}
                    </span>
                  ))}
                  {detailsSession.spots_left > 0 && (
                    <span className="rounded-lg border border-dashed border-neutral-600 px-2.5 py-1 text-[11px] text-cream-muted">
                      +{detailsSession.spots_left} spot
                      {detailsSession.spots_left === 1 ? '' : 's'} open
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between rounded-xl border border-primary-500/40 bg-primary-500/15 p-3.5">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-cream-muted">
                  Price per player
                </p>
                <p className="font-display text-xl font-extrabold text-accent-400">
                  {detailsSession.price_per_player === 0
                    ? 'Free'
                    : formatCurrency(detailsSession.price_per_player)}
                </p>
              </div>
              <Button
                size="md"
                disabled={detailsSession.status === 'full'}
                onClick={handleJoinFromDetails}
                rightIcon={<ArrowRight className="h-4 w-4" />}
              >
                {detailsSession.status === 'full' ? 'Full' : 'Join This Session'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ─────────────────────── Join Modal ─────────────────────── */}
      <Modal
        isOpen={showJoinModal}
        onClose={handleModalClose}
        title="Join Open Play Session"
        size="md"
      >
        {selectedSession && (
          <form onSubmit={handleSubmit(handleJoinConfirm)} className="space-y-4">
            <div className="rounded-xl border border-neutral-700 bg-neutral-950/70 p-3.5">
              <p className="text-sm font-bold text-cream">
                {selectedSession.title || selectedSession.host_name || 'Open Play Session'}
              </p>
              <div className="mt-0.5 flex flex-wrap gap-1">
                {selectedSession.courts && selectedSession.courts.length > 0 ? (
                  selectedSession.courts.map((c) => (
                    <span
                      key={c.id}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 border border-neutral-600 text-cream-muted"
                    >
                      {c.name}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-cream-muted">
                    {selectedSession.court_name}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-cream-muted">
                {formatDateLong(selectedSession.date)} ·{' '}
                {formatTimeRange(selectedSession.start_time, selectedSession.end_time)}
              </p>
              <p className="mt-1 text-xs font-semibold text-primary-300">
                {selectedSession.current_players}/{selectedSession.max_players} players ·{' '}
                {selectedSession.price_per_player === 0
                  ? 'Free'
                  : `${formatCurrency(selectedSession.price_per_player)} / player`}
              </p>
            </div>

            <Input
              id="op-name"
              label="Full Name"
              placeholder="Juan Dela Cruz"
              leftIcon={<User className="h-4 w-4" />}
              error={customerErrors.name?.message}
              {...register('name')}
            />

            <Input
              id="op-email"
              label="Email Address"
              type="email"
              inputMode="email"
              placeholder="juan@email.com"
              leftIcon={<Mail className="h-4 w-4" />}
              error={customerErrors.email?.message}
              {...register('email')}
            />

            <Input
              id="op-phone"
              label="Phone Number"
              type="tel"
              inputMode="numeric"
              placeholder="0917 123 4567"
              leftIcon={<Phone className="h-4 w-4" />}
              error={customerErrors.phone?.message}
              {...register('phone')}
            />

            <Input
              id="op-notes"
              label="Notes (optional)"
              placeholder="Any special requests or paddle rental?"
              error={customerErrors.notes?.message}
              {...register('notes')}
            />

            <p className="text-[11px] leading-relaxed text-cream-muted">
              By joining, you agree to our{' '}
              <button
                type="button"
                onClick={() => setShowTermsModal(true)}
                className="font-semibold text-primary-300 underline"
              >
                session terms
              </button>{' '}
              and our{' '}
              <Link
                to="/terms"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-primary-300 underline"
              >
                Terms & Conditions
              </Link>
              .
            </p>

            {joinError && (
              <div className="rounded-xl border border-error/30 bg-error/10 p-2.5 text-xs font-medium text-error">
                {joinError}
              </div>
            )}

            <div className="flex flex-col gap-2.5 pt-2 sm:flex-row sm:gap-3">
              <Button type="submit" fullWidth isLoading={joining}>
                {selectedSession.price_per_player === 0 ? 'Confirm & Join' : 'Confirm & Pay'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                fullWidth
                className="sm:w-auto"
                onClick={handleModalClose}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ─────────────────────── Session Terms Modal ─────────────────────── */}
      {showTermsModal && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setShowTermsModal(false)}
          role="dialog"
          aria-label="Open Play session terms"
        >
          <div
            className="w-full max-w-md rounded-2xl border border-neutral-700 bg-neutral-900 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ScrollText className="h-5 w-5 text-primary-300" />
                <h3 className="text-lg font-bold text-cream">Open Play Session Terms</h3>
              </div>
              <button
                onClick={() => setShowTermsModal(false)}
                aria-label="Close"
                className="rounded-lg border border-neutral-700 bg-neutral-900/60 p-1.5 text-cream-muted transition hover:border-primary-400 hover:text-primary-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <ul className="space-y-2.5 text-sm text-cream-muted">
              <li className="flex items-start gap-2.5">
                <Users className="mt-0.5 h-4 w-4 shrink-0 text-primary-300" />
                <span>Sessions may be cancelled if fewer than 4 players sign up.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary-300" />
                <span>
                  You&apos;ll be notified at least 2 hours before if a session is cancelled.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary-300" />
                <span>Full refund if we cancel the session.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-primary-300" />
                <span>Skill levels are self-reported, not verified.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-primary-300" />
                <span>Hosts may remove disruptive players.</span>
              </li>
            </ul>

            <div className="mt-4 flex items-center justify-between gap-3">
              <Link
                to="/terms"
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold text-primary-300 underline"
              >
                Full Terms
              </Link>
              <button
                onClick={() => setShowTermsModal(false)}
                className="rounded-xl bg-primary-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-600"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}