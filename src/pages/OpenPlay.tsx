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
  Beginner: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  Intermediate: 'bg-orange-50 text-[#FF7A00] border border-orange-200',
  Advanced: 'bg-purple-50 text-[#3D1164] border border-purple-200',
  'All Levels': 'bg-blue-50 text-blue-700 border border-blue-200',
};

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  upcoming: {
    label: 'Upcoming',
    className: 'bg-slate-100 text-slate-700 border border-slate-200',
  },
  active: {
    label: 'Active Now',
    className: 'bg-orange-50 text-[#FF7A00] border border-orange-200',
  },
  full: {
    label: 'Full',
    className: 'bg-rose-50 text-rose-700 border border-rose-200',
  },
  past: {
    label: 'Past',
    className: 'bg-slate-50 text-slate-400 border border-slate-200',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-slate-50 text-slate-400 border border-slate-200',
  },
};

export function OpenPlay() {
  const navigate = useNavigate();
  const location = useLocation();
  const { sessions, loadingSessions, error, loadUpcomingSessions } = useOpenPlayStore();

  const [showJoinModal, setShowJoinModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState<OpenPlaySession | null>(null);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
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

  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsSession, setDetailsSession] = useState<OpenPlaySession | null>(null);
  const [detailsPlayers, setDetailsPlayers] = useState<PublicOpenPlayPlayer[]>([]);
  const [loadingDetailsPlayers, setLoadingDetailsPlayers] = useState(false);
  const [rosterUnavailable, setRosterUnavailable] = useState(false);

  useEffect(() => {
    loadUpcomingSessions();
  }, []);

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
  }, [sessions, location.state]);

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
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />

      <div className="container-page pt-24 pb-16 sm:pt-28">
        <div className="mb-8 text-center sm:mb-10">
          <span className="mb-2.5 inline-flex items-center gap-1.5 rounded-full border border-purple-200 bg-purple-50 px-3.5 py-1 text-xs font-bold text-[#3D1164]">
            <Users className="h-3.5 w-3.5" />
            Social Open Play
          </span>
          <h1 className="font-display text-3xl font-black tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
            Join a Social Session
          </h1>
          <p className="mx-auto mt-2.5 max-w-xl text-xs leading-relaxed text-slate-500 sm:text-sm">
            Drop into a group game, meet other players, and split the court. Pick a session
            below and reserve your spot.
          </p>
        </div>

        {/* Terms trigger */}
        <div className="mb-6 flex justify-center sm:mb-8">
          <button
            type="button"
            onClick={() => setShowTermsModal(true)}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-xs transition hover:border-[#FF7A00] hover:text-[#FF7A00]"
          >
            <ScrollText className="h-3.5 w-3.5 text-[#FF7A00]" />
            Read Session Terms
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-center text-xs font-semibold text-rose-700">
            {error}
          </div>
        )}

        {loadingSessions ? (
          <LoadingSpinner className="py-20" />
        ) : sessions.length === 0 ? (
          <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <CalendarDays className="h-10 w-10 text-slate-300" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">No sessions scheduled yet</h2>
              <p className="mt-1 text-xs text-slate-500">
                Check back soon, or book a regular court in the meantime.
              </p>
            </div>
            <Button size="md" to="/booking" className="bg-[#FF7A00] text-white font-bold">
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
                  className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md cursor-pointer flex flex-col justify-between"
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

                    <h3 className="font-display text-base font-bold text-slate-900">
                      {session.title || session.host_name || 'Open Play Session'}
                    </h3>

                    <div className="mt-3 space-y-2 text-xs text-slate-600">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-3.5 w-3.5 text-[#FF7A00]" />
                        <span>{formatDateLong(session.date)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-[#FF7A00]" />
                        <span>{formatTimeRange(session.start_time, session.end_time)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-3.5 w-3.5 text-[#3D1164]" />
                        <span>
                          {session.current_players}/{session.max_players} players ·{' '}
                          {session.spots_left} spot{session.spots_left === 1 ? '' : 's'} left
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <UserCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <div className="flex flex-wrap gap-1">
                          {session.courts && session.courts.length > 0 ? (
                            session.courts.map((c) => (
                              <span
                                key={c.id}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-slate-50 border border-slate-200 text-slate-600 font-medium"
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
                      <p className="mt-3 line-clamp-2 text-xs text-slate-500 leading-relaxed">
                        {session.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3.5">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                        Per player
                      </p>
                      <p className="font-display text-lg font-black text-[#FF7A00]">
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
                        className="text-slate-600 hover:text-slate-900"
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
                        className={!isFull ? 'bg-[#FF7A00] hover:bg-[#E56600] text-white font-bold' : ''}
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

        <p className="mt-8 text-center text-xs text-slate-500">
          Sessions may be cancelled if minimum players are not met.{' '}
          <button
            type="button"
            onClick={() => setShowTermsModal(true)}
            className="font-bold text-[#3D1164] underline hover:text-[#5A1B91]"
          >
            Read session terms
          </button>
        </p>
      </div>

      {/* Details Modal */}
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
              <h3 className="font-display text-lg font-bold text-slate-900">
                {detailsSession.title || detailsSession.host_name || 'Open Play Session'}
              </h3>
            </div>

            <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
              <div className="flex items-center gap-2.5">
                <CalendarDays className="h-4 w-4 text-[#FF7A00]" />
                <span className="font-medium">{formatDateLong(detailsSession.date)}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Clock className="h-4 w-4 text-[#FF7A00]" />
                <span className="font-medium">
                  {formatTimeRange(detailsSession.start_time, detailsSession.end_time)}
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <UserCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <div className="flex flex-wrap gap-1.5">
                  {detailsSession.courts && detailsSession.courts.length > 0 ? (
                    detailsSession.courts.map((c) => (
                      <span
                        key={c.id}
                        className="text-[10px] px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-slate-700 font-semibold"
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
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  About this session
                </p>
                <p className="whitespace-pre-wrap text-xs text-slate-600 leading-relaxed">
                  {detailsSession.description}
                </p>
              </div>
            )}

            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Players ({detailsSession.current_players}/{detailsSession.max_players})
              </p>

              <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-slate-100 border border-slate-200">
                <div
                  className="h-full bg-[#FF7A00] transition-all duration-300"
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
                <p className="text-xs text-slate-500">
                  {detailsSession.current_players} player
                  {detailsSession.current_players === 1 ? '' : 's'} joined ·{' '}
                  {detailsSession.spots_left} spot
                  {detailsSession.spots_left === 1 ? '' : 's'} left
                </p>
              ) : detailsPlayers.length === 0 ? (
                <p className="text-xs text-slate-500">
                  No one has joined yet — be the first!
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {detailsPlayers.map((player) => (
                    <span
                      key={player.booking_id}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-700"
                    >
                      {player.display_name}
                    </span>
                  ))}
                  {detailsSession.spots_left > 0 && (
                    <span className="rounded-lg border border-dashed border-slate-300 px-2.5 py-1 text-[11px] text-slate-400">
                      +{detailsSession.spots_left} spot
                      {detailsSession.spots_left === 1 ? '' : 's'} open
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-purple-200 bg-purple-50/70 p-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Price per player
                </p>
                <p className="font-display text-xl font-black text-[#FF7A00]">
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
                className={detailsSession.status !== 'full' ? 'bg-[#FF7A00] hover:bg-[#E56600] text-white font-bold' : ''}
              >
                {detailsSession.status === 'full' ? 'Full' : 'Join This Session'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Join Modal */}
      <Modal
        isOpen={showJoinModal}
        onClose={handleModalClose}
        title="Join Open Play Session"
        size="md"
      >
        {selectedSession && (
          <form onSubmit={handleSubmit(handleJoinConfirm)} className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-bold text-slate-900">
                {selectedSession.title || selectedSession.host_name || 'Open Play Session'}
              </p>
              <p className="mt-1 text-xs text-slate-500 font-medium">
                {formatDateLong(selectedSession.date)} ·{' '}
                {formatTimeRange(selectedSession.start_time, selectedSession.end_time)}
              </p>
              <p className="mt-1 text-xs font-bold text-[#3D1164]">
                {selectedSession.current_players}/{selectedSession.max_players} players ·{' '}
                {selectedSession.price_per_player === 0
                  ? 'Free'
                  : `${formatCurrency(selectedSession.price_per_player)} / player`}
              </p>
            </div>

            <Input
              id="op-name"
              label="Full Name"
              placeholder="e.g. Maria Santos"
              leftIcon={<User className="h-4 w-4" />}
              error={customerErrors.name?.message}
              {...register('name')}
            />

            <Input
              id="op-email"
              label="Email Address"
              type="email"
              inputMode="email"
              placeholder="maria@email.com"
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
              placeholder="Paddle rental or special requests?"
              error={customerErrors.notes?.message}
              {...register('notes')}
            />

            <p className="text-[11px] leading-relaxed text-slate-500">
              By joining, you agree to our{' '}
              <button
                type="button"
                onClick={() => setShowTermsModal(true)}
                className="font-bold text-[#3D1164] underline"
              >
                session terms
              </button>{' '}
              and{' '}
              <Link
                to="/terms"
                target="_blank"
                rel="noreferrer"
                className="font-bold text-[#3D1164] underline"
              >
                Terms & Conditions
              </Link>
              .
            </p>

            {joinError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
                {joinError}
              </div>
            )}

            <div className="flex flex-col gap-2.5 pt-2 sm:flex-row sm:gap-3">
              <Button
                type="submit"
                fullWidth
                isLoading={joining}
                className="bg-[#FF7A00] hover:bg-[#E56600] text-white font-bold"
              >
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

      {/* Session Terms Modal */}
      {showTermsModal && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs"
          onClick={() => setShowTermsModal(false)}
          role="dialog"
          aria-label="Open Play session terms"
        >
          <div
            className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ScrollText className="h-5 w-5 text-[#FF7A00]" />
                <h3 className="text-lg font-black text-slate-900">Session Terms</h3>
              </div>
              <button
                onClick={() => setShowTermsModal(false)}
                aria-label="Close"
                className="rounded-xl border border-slate-200 bg-slate-50 p-1.5 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <ul className="space-y-3 text-xs text-slate-600 sm:text-sm">
              <li className="flex items-start gap-2.5">
                <Users className="mt-0.5 h-4 w-4 shrink-0 text-[#FF7A00]" />
                <span>Sessions may be cancelled if fewer than 4 players sign up.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[#FF7A00]" />
                <span>You will be notified at least 2 hours before if a session is cancelled.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#3D1164]" />
                <span>Full refund or reschedule credit if we cancel the session.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-[#3D1164]" />
                <span>Skill levels are self-reported for friendly matchmaking.</span>
              </li>
            </ul>

            <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
              <Link
                to="/terms"
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold text-[#3D1164] underline"
              >
                Full Terms
              </Link>
              <button
                onClick={() => setShowTermsModal(false)}
                className="rounded-xl bg-[#3D1164] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#5A1B91]"
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