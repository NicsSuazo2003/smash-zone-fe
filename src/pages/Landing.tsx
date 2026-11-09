import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CalendarPlus,
  Clock,
  ArrowRight,
  MapPin,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  CloudSun,
  Users,
  UserCircle2,
  X,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useBookingStore } from '@/stores/bookingStore';
import { useOpenPlayStore } from '@/stores/openPlayStore';
import { useClientStore } from '@/stores/clientStore';
import { bookingService } from '@/services/bookingService';
import { APP_CONFIG, BOOKING_COPY } from '@/utils/constants';
import type { AmenityItem } from '@/types';
import {
  formatCurrency,
  todayISO,
  formatDateLong,
  toISODate,
  addDays,
  getMaxSelectableDate,
} from '@/utils/format';
import type { TimeSlot, Court, OpenPlaySession, Booking } from '@/types';

const EMPTY_AMENITIES: AmenityItem[] = [];

const COURT_ACCENTS = [
  {
    header: 'text-[#ED1C24]',
    dot: 'bg-[#ED1C24]',
    border: 'border-[#ED1C24]',
    bg: 'bg-[#2A0B0D]',
    text: 'text-white',
    hoverBorder: 'hover:border-[#FF3B41]',
    hoverBg: 'hover:bg-[#3D1114]',
  },
  {
    header: 'text-[#FFB703]',
    dot: 'bg-[#FFB703]',
    border: 'border-[#FFB703]',
    bg: 'bg-[#2A1F0B]',
    text: 'text-white',
    hoverBorder: 'hover:border-[#FFC533]',
    hoverBg: 'hover:bg-[#3D2D11]',
  },
  {
    header: 'text-[#ED1C24]',
    dot: 'bg-[#ED1C24]',
    border: 'border-[#ED1C24]',
    bg: 'bg-[#2A0B0D]',
    text: 'text-white',
    hoverBorder: 'hover:border-[#FF3B41]',
    hoverBg: 'hover:bg-[#3D1114]',
  },
  {
    header: 'text-[#FFB703]',
    dot: 'bg-[#FFB703]',
    border: 'border-[#FFB703]',
    bg: 'bg-[#2A1F0B]',
    text: 'text-white',
    hoverBorder: 'hover:border-[#FFC533]',
    hoverBg: 'hover:bg-[#3D2D11]',
  },
];

function getCourtAccent(index: number) {
  return COURT_ACCENTS[index % COURT_ACCENTS.length];
}

type CourtAccent = ReturnType<typeof getCourtAccent>;

function formatTimeShort(time: string): string {
  if (!time) return '';
  const [hour, minute] = time.split(':').map(Number);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return minute === 0 ? `${hour12}${ampm}` : `${hour12}:${String(minute).padStart(2, '0')}${ampm}`;
}

function formatTimeRangeShort(start: string, end: string): string {
  return `${formatTimeShort(start)}-${formatTimeShort(end)}`;
}

function isWithinHours(session: OpenPlaySession, hours: number): boolean {
  try {
    const sessionStart = new Date(`${session.date}T${session.start_time}`);
    const now = new Date();
    const diffHours = (sessionStart.getTime() - now.getTime()) / (1000 * 60 * 60);
    return diffHours >= -1 && diffHours <= hours;
  } catch {
    return false;
  }
}

function isWithinNextWeek(session: OpenPlaySession): boolean {
  try {
    const sessionDate = new Date(session.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekFromNow = new Date(today);
    weekFromNow.setDate(weekFromNow.getDate() + 7);
    return sessionDate >= today && sessionDate <= weekFromNow;
  } catch {
    return false;
  }
}

function weeksBetweenToday(isoDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${isoDate}T00:00:00`);
  target.setHours(0, 0, 0, 0);

  const todayWeekStart = new Date(today);
  todayWeekStart.setDate(today.getDate() - today.getDay());

  const targetWeekStart = new Date(target);
  targetWeekStart.setDate(target.getDate() - target.getDay());

  const diffMs = targetWeekStart.getTime() - todayWeekStart.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24 * 7));
}

function getCurrentHourDecimal(): number {
  const now = new Date();
  return now.getHours() + now.getMinutes() / 60;
}

function isSlotPast(slotStartTime: string, isViewingToday: boolean): boolean {
  if (!isViewingToday) return false;
  const [hour, minute] = slotStartTime.split(':').map(Number);
  const slotStart = hour + minute / 60;
  return slotStart < getCurrentHourDecimal();
}

const SKILL_BADGE: Record<string, string> = {
  Beginner: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
  Intermediate: 'bg-sky-500/20 text-sky-300 border border-sky-500/40',
  Advanced: 'bg-purple-500/20 text-purple-300 border border-purple-500/40',
  'All Levels': 'bg-blue-500/20 text-blue-200 border border-blue-500/30',
};

export function Landing() {
  const navigate = useNavigate();
  const bookingSectionRef = useRef<HTMLDivElement>(null);

  const [pendingBooking, setPendingBooking] = useState<Booking | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const {
    courts,
    selectedDate,
    slots,
    selectedSlotIds,
    loadingCourts,
    loadingSlots,
    error,
    loadCourts,
    setDate,
    toggleSlot,
    loadAllCourtsSlots,
  } = useBookingStore();

  const {
    sessions: openPlaySessions,
    loadingSessions: loadingOpenPlay,
    loadUpcomingSessions,
  } = useOpenPlayStore();

  const availableAmenities: AmenityItem[] =
    useClientStore((state) => state.settings?.available_amenities) ?? EMPTY_AMENITIES;

  const bookingsEnabled = useClientStore(
    (state) => state.settings?.bookings_enabled ?? true
  );

  const maxAdvanceDays = useClientStore(
    (state) => state.settings?.max_advance_booking_days ?? APP_CONFIG.defaultMaxAdvanceBookingDays
  );
  const maxSelectableDate = getMaxSelectableDate(maxAdvanceDays);

  const [weekOffset, setWeekOffset] = useState(0);
  const weekStart = addDays(new Date(), weekOffset * 7);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getOperatingHours = () => {
    if (!courts || courts.length === 0) return '7AM - 12AM';
    const earliestOpen = courts.reduce((earliest, court) =>
      court.open_time < earliest ? court.open_time : earliest
      , courts[0].open_time);
    const latestClose = courts.reduce((latest, court) =>
      court.close_time > latest ? court.close_time : latest
      , courts[0].close_time);
    const formatTime = (timeStr: string) => {
      const [hour, minute] = timeStr.split(':').map(Number);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      return minute === 0 ? `${hour12}${ampm}` : `${hour12}:${String(minute).padStart(2, '0')}${ampm}`;
    };
    return `${formatTime(earliestOpen)} - ${formatTime(latestClose)}`;
  };

  const isNextWeekDisabled = (() => {
    if (!maxSelectableDate) return false;
    const nextWeekStart = addDays(new Date(), (weekOffset + 1) * 7);
    return toISODate(nextWeekStart) > maxSelectableDate;
  })();

  useEffect(() => {
    const savedRef = localStorage.getItem('pendingBookingRef');
    if (!savedRef) return;

    const dismissed = sessionStorage.getItem('pendingBannerDismissed');
    if (dismissed === savedRef) {
      setBannerDismissed(true);
    }

    let cancelled = false;

    (async () => {
      try {
        const booking = await bookingService.trackBooking(savedRef);
        if (cancelled) return;

        if (booking.status === 'pending_payment') {
          setPendingBooking(booking);
        } else {
          localStorage.removeItem('pendingBookingRef');
        }
      } catch (err) {
        if (cancelled) return;
        console.error('Failed to load pending booking for banner:', err);
        localStorage.removeItem('pendingBookingRef');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const dismissBanner = () => {
    setBannerDismissed(true);
    const ref = localStorage.getItem('pendingBookingRef');
    if (ref) sessionStorage.setItem('pendingBannerDismissed', ref);
  };

  useEffect(() => {
    if (courts.length === 0) {
      loadCourts();
    }
    loadUpcomingSessions();
  }, [courts.length, loadCourts, loadUpcomingSessions]);

  useEffect(() => {
    if (courts.length > 0) {
      loadAllCourtsSlots();
    }

    const interval = setInterval(() => {
      const selectedCount = useBookingStore.getState().selectedSlotIds.length;
      if (selectedCount === 0) {
        loadAllCourtsSlots();
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [selectedDate, courts.length, loadAllCourtsSlots]);

  const scrollToBooking = () => {
    bookingSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCalendarPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    let iso = e.target.value;
    if (!iso) return;

    const today = todayISO();
    if (iso < today) iso = today;

    if (maxSelectableDate && iso > maxSelectableDate) {
      iso = maxSelectableDate;
    }

    setDate(iso);
    setWeekOffset(Math.max(0, weeksBetweenToday(iso)));
  };

  const isDayBeyondLimit = (iso: string) =>
    !!maxSelectableDate && iso > maxSelectableDate;

  const nextSession = openPlaySessions
    .filter(
      (s) =>
        s.is_active &&
        s.status !== 'cancelled' &&
        s.status !== 'past' &&
        isWithinHours(s, 48)
    )
    .sort((a, b) => {
      const aStart = new Date(`${a.date}T${a.start_time}`).getTime();
      const bStart = new Date(`${b.date}T${b.start_time}`).getTime();
      return aStart - bStart;
    })[0];

  const weekSessions = openPlaySessions
    .filter(
      (s) =>
        s.is_active &&
        s.status !== 'cancelled' &&
        s.status !== 'past' &&
        isWithinNextWeek(s)
    )
    .sort((a, b) => {
      const aStart = new Date(`${a.date}T${a.start_time}`).getTime();
      const bStart = new Date(`${b.date}T${b.start_time}`).getTime();
      return aStart - bStart;
    })
    .slice(0, 6);

  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const getOpenPlaySessionForSlot = (
    courtId: string,
    startTime: string,
    endTime: string
  ): OpenPlaySession | undefined => {
    const slotStart = timeToMinutes(startTime);
    const slotEnd = timeToMinutes(endTime);

    return openPlaySessions.find((session) => {
      const sessionCourts =
        session.courts && session.courts.length > 0
          ? session.courts.map((c) => c.id)
          : [session.court_id];

      return (
        sessionCourts.includes(courtId) &&
        session.date === selectedDate &&
        session.is_active === true &&
        timeToMinutes(session.start_time) <= slotStart &&
        timeToMinutes(session.end_time) >= slotEnd
      );
    });
  };

  const handleOpenPlayClick = (session: OpenPlaySession) => {
    navigate('/open-play', { state: { selectedSessionId: session.id } });
  };

  const getTimeIntervalsByPeriod = (slotsList: TimeSlot[]) => {
    const morningMap = new Map<string, { start_time: string; end_time: string }>();
    const afternoonMap = new Map<string, { start_time: string; end_time: string }>();
    const eveningMap = new Map<string, { start_time: string; end_time: string }>();

    const isToday = selectedDate === todayISO();

    slotsList.forEach((slot) => {
      if (isSlotPast(slot.start_time, isToday)) return;

      const hour = parseInt(slot.start_time.split(':')[0], 10);
      const key = `${slot.start_time}-${slot.end_time}`;
      const timeObj = { start_time: slot.start_time, end_time: slot.end_time };

      if (hour < 12) {
        morningMap.set(key, timeObj);
      } else if (hour < 17) {
        afternoonMap.set(key, timeObj);
      } else {
        eveningMap.set(key, timeObj);
      }
    });

    const sortFn = (a: { start_time: string }, b: { start_time: string }) =>
      a.start_time.localeCompare(b.start_time);

    return {
      morningTimes: Array.from(morningMap.values()).sort(sortFn),
      afternoonTimes: Array.from(afternoonMap.values()).sort(sortFn),
      eveningTimes: Array.from(eveningMap.values()).sort(sortFn),
    };
  };

  const { morningTimes, afternoonTimes, eveningTimes } = getTimeIntervalsByPeriod(slots);

  const totalSelected = slots
    .filter((s) => selectedSlotIds.includes(s.id))
    .reduce((sum, s) => sum + s.price, 0);

  const getSlotForCourtAndTime = (courtId: string, startTime: string, endTime: string) => {
    return slots.find(
      (s) =>
        s.court_id === courtId &&
        s.start_time === startTime &&
        s.end_time === endTime
    );
  };

  const allPeriodsEmpty =
    morningTimes.length === 0 && afternoonTimes.length === 0 && eveningTimes.length === 0;

  const showPendingBanner = !!pendingBooking && !bannerDismissed;

  return (
    <div className="min-h-screen bg-charcoal text-cream">
      <Navbar />

      {showPendingBanner && pendingBooking && (
        <div className="fixed inset-x-0 top-16 z-40 px-3 sm:top-20 sm:px-4">
          <div className="container-page">
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-500/50 bg-amber-950/95 p-3 shadow-2xl backdrop-blur-md sm:gap-4 sm:p-4"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-500/40 bg-amber-500/20 text-amber-300">
                <AlertCircle className="h-5 w-5" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-amber-200">
                  You have an unpaid booking
                </p>
                <p className="mt-0.5 text-xs text-cream-muted">
                  {pendingBooking.court_name} ·{' '}
                  {formatDateLong(pendingBooking.date)} ·{' '}
                  {formatCurrency(pendingBooking.total_amount)}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => navigate('/checkout')}
                  rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
                >
                  Pay now
                </Button>
                <button
                  onClick={dismissBanner}
                  aria-label="Dismiss"
                  className="rounded-lg border border-neutral-700 bg-neutral-900/80 p-2 text-cream-muted transition hover:border-amber-500/50 hover:text-amber-300"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative flex min-h-[85vh] items-start pt-28 sm:min-h-screen sm:items-center sm:pt-20 overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://plus.unsplash.com/premium_photo-1709048991125-7d01a4666f79?q=80&w=2400&auto=format&fit=crop&ixlib=rb-4.1.0"
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-right md:object-[75%_center] scale-x-[-1]"
            aria-hidden
            referrerPolicy="no-referrer"
          />

          <img
            src="/images/bg.jpg"
            alt="Smash Point"
            className="absolute inset-0 h-full w-full object-cover object-right md:object-[75%_center]"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />

          <div className="absolute inset-0 bg-gradient-to-r from-neutral-950 via-neutral-950/95 sm:via-neutral-950/85 to-neutral-950/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-transparent to-transparent" />
          <div className="absolute inset-0 bg-grid opacity-20" />
        </div>

        <div className="container-page relative z-10 py-8 sm:py-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="max-w-2xl"
          >
            {nextSession && (
              <motion.button
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.5 }}
                onClick={() => navigate('/open-play')}
                className="mb-4 flex w-full items-center gap-2 rounded-full border border-sky-400/40 bg-sky-950/60 px-3 py-2 backdrop-blur-md transition hover:border-sky-300 hover:bg-sky-900/50 sm:mb-5 sm:w-auto sm:px-4 shadow-sm"
              >
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-sky-300"></span>
                </span>
                <Users className="h-4 w-4 shrink-0 text-sky-300" />
                <span className="truncate text-xs font-semibold text-sky-100 sm:text-sm">
                  Open Play{' '}
                  {nextSession.status === 'active'
                    ? 'happening now'
                    : nextSession.date === todayISO()
                      ? 'today'
                      : 'soon'}{' '}
                  · {nextSession.current_players}/{nextSession.max_players} joined
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-sky-300" />
              </motion.button>
            )}

            {/* Hero Gradient Title */}
            <h1 className="text-4xl font-black leading-[1.1] tracking-tight sm:text-6xl lg:text-7xl">
              Smash{' '}
              <span className="bg-gradient-to-r from-rose-500 via-orange-400 to-amber-400 bg-clip-text text-transparent">
                Point
              </span>
            </h1>

            <p className="mt-3 text-xl font-medium text-cream-dark sm:mt-4 sm:text-3xl">
              {APP_CONFIG.tagline}
            </p>

            <p className="mt-4 max-w-lg text-sm leading-relaxed text-cream-muted sm:mt-6 sm:text-lg">
              Book premium pickleball courts at Smash Point Pickle Sports Center in Tandag City.
              Beginner-friendly, tournament-ready, and made for everyone who loves the game.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row">
              <Button
                size="lg"
                onClick={scrollToBooking}
                leftIcon={<CalendarPlus className="h-5 w-5" />}
                disabled={!bookingsEnabled}
              >
                {bookingsEnabled ? 'Book a Court' : 'Bookings Closed'}
              </Button>
              <Button
                size="lg"
                variant="secondary"
                to="/track"
                leftIcon={<CalendarDays className="h-5 w-5" />}
              >
                Track My Booking
              </Button>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-4 text-xs text-cream-muted sm:mt-10 sm:gap-6 sm:text-sm">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-accent-400" />
                <span>National Highway, Rosario, Tandag City</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-accent-400" />
                <span>Open {getOperatingHours()}</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Open Play This Week Section */}
      {weekSessions.length > 0 && (
        <section className="relative border-b border-neutral-800 bg-neutral-900 py-10 sm:py-14">
          <div className="container-page">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3 sm:mb-6">
              <div>
                <span className="mb-1.5 inline-flex items-center gap-1.5 rounded-full border border-sky-400/30 bg-sky-950/60 px-3 py-1 text-xs font-semibold text-sky-200">
                  <Users className="h-3.5 w-3.5 text-sky-300" />
                  Open Play
                </span>
                <h2 className="text-xl font-bold tracking-tight text-cream sm:text-2xl md:text-3xl">
                  Join a Session This Week
                </h2>
                <p className="text-xs text-cream-muted sm:text-sm">
                  Meet other players and split the court — spots fill fast
                </p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => navigate('/open-play')}
                rightIcon={<ArrowRight className="h-4 w-4" />}
              >
                See all
              </Button>
            </div>

            <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-3">
              {weekSessions.map((session, i) => {
                const isFull =
                  session.status === 'full' ||
                  session.current_players >= session.max_players;
                const spotsLeft = Math.max(0, session.max_players - session.current_players);
                const isToday = session.date === todayISO();
                return (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05 }}
                    className="w-[280px] shrink-0 sm:w-auto"
                  >
                    <div className="card flex h-full flex-col p-4">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="inline-flex items-center rounded-full border border-sky-400/30 bg-sky-950/50 px-2.5 py-0.5 text-xs font-bold text-sky-200">
                          {isToday
                            ? 'TODAY'
                            : formatDateLong(session.date).split(',')[0].toUpperCase()}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            SKILL_BADGE[session.skill_level] ?? SKILL_BADGE['All Levels']
                          }`}
                        >
                          {session.skill_level}
                        </span>
                      </div>

                      <h3 className="truncate font-display text-base font-bold text-cream">
                        {session.title || session.host_name || session.court_name}
                      </h3>

                      <div className="mt-2 space-y-1.5 text-xs text-cream-muted">
                        <div className="flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5 text-sky-300" />
                          {formatTimeRangeShort(session.start_time, session.end_time)}
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-3.5 w-3.5 text-sky-300" />
                          {session.current_players}/{session.max_players} · {spotsLeft}{' '}
                          spot{spotsLeft === 1 ? '' : 's'} left
                        </div>
                        {session.host_name && (
                          <div className="flex items-center gap-2">
                            <UserCircle2 className="h-3.5 w-3.5 text-sky-300" />
                            <span className="truncate">Hosted by {session.host_name}</span>
                          </div>
                        )}
                        {session.courts && session.courts.length > 1 && (
                          <div className="flex flex-wrap gap-1 pt-0.5">
                            {session.courts.map((c) => (
                              <span
                                key={c.id}
                                className="rounded border border-neutral-700 bg-neutral-800 px-1.5 py-0.5 text-[10px] text-cream-muted"
                              >
                                {c.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="mt-4 flex items-center justify-between border-t border-neutral-800 pt-3">
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-cream-muted">Per player</p>
                          <p className="font-display text-base font-bold text-accent-400 sm:text-lg">
                            {formatCurrency(session.price_per_player)}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          disabled={isFull}
                          onClick={() => handleOpenPlayClick(session)}
                          rightIcon={<ArrowRight className="h-4 w-4" />}
                        >
                          {isFull ? 'Full' : 'Join'}
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Bookings Closed Banner */}
      {!bookingsEnabled && (
        <section className="border-y border-amber-500/40 bg-amber-950/40 py-4">
          <div className="container-page flex items-start gap-3 text-amber-200">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
            <div>
              <p className="text-sm font-bold">Online bookings are temporarily closed</p>
              <p className="mt-0.5 text-xs text-amber-200/80">
                Please check back soon or contact the venue directly. Existing bookings are unaffected.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Booking Section */}
      <div ref={bookingSectionRef}>
        <section className="relative z-20 border-y border-neutral-800 bg-neutral-950 py-8 md:py-16">
          <div className="container-page max-w-7xl">
            <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900 shadow-2xl md:rounded-3xl">

              {/* Booking Section Header */}
              <div className="border-b border-neutral-800 bg-neutral-950/70 px-4 py-4 sm:px-6 sm:py-5 md:px-8 md:py-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold tracking-tight text-cream sm:text-2xl md:text-3xl">
                      Book a <span className="bg-gradient-to-r from-rose-500 to-amber-400 bg-clip-text text-transparent">Court</span>
                    </h2>
                    <p className="mt-0.5 text-xs text-cream-muted sm:text-sm">
                      {BOOKING_COPY.bookingInstructions}
                    </p>
                  </div>
                  <div className="hidden rounded-xl border border-neutral-800 bg-neutral-900 p-2.5 text-neutral-300 sm:block md:p-3">
                    <CalendarDays className="h-5 w-5 md:h-6 md:w-6" />
                  </div>
                </div>
              </div>

              <div className="p-4 pb-24 sm:p-6 sm:pb-24 md:p-8 md:pb-8">
                {!bookingsEnabled ? (
                  <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-8 text-center">
                    <AlertCircle className="mx-auto h-10 w-10 text-amber-400" />
                    <p className="mt-3 text-sm font-semibold text-cream">
                      Online bookings are temporarily closed
                    </p>
                    <p className="mt-1 text-xs text-cream-muted">
                      Please check back soon, or contact the venue directly to book.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* ─── REDESIGNED DATE PICKER ─── */}
                    <div className="mb-6 rounded-2xl border border-neutral-800 bg-neutral-950/60 p-3 sm:p-5 md:mb-8 shadow-inner">
                      {/* Date Header Strip */}
                      <div className="mb-3 flex items-center justify-between gap-2 border-b border-neutral-800/80 pb-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white shrink-0">
                            1
                          </span>
                          <span className="text-xs sm:text-sm font-bold text-cream truncate">
                            {formatDateLong(selectedDate)}
                          </span>
                        </div>

                        {/* Controls (Jump to Calendar + Prev/Next Week) */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <div className="relative flex h-8 items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-800/80 px-2.5 text-xs font-semibold text-cream transition hover:border-neutral-500">
                            <CalendarDays className="h-3.5 w-3.5 text-rose-400" />
                            <span className="hidden sm:inline">Pick Date</span>
                            <input
                              type="date"
                              value={selectedDate}
                              min={todayISO()}
                              max={maxSelectableDate ?? undefined}
                              onChange={handleCalendarPick}
                              aria-label="Pick a date from calendar"
                              className="absolute inset-0 h-full w-full cursor-pointer opacity-0 [color-scheme:dark]"
                            />
                          </div>

                          <button
                            onClick={() => setWeekOffset((w) => Math.max(0, w - 1))}
                            disabled={weekOffset === 0}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-700 bg-neutral-800 text-cream-muted transition hover:text-white disabled:opacity-30 active:scale-95"
                            aria-label="Previous week"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setWeekOffset((w) => w + 1)}
                            disabled={isNextWeekDisabled}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-700 bg-neutral-800 text-cream-muted transition hover:text-white disabled:opacity-30 active:scale-95"
                            aria-label="Next week"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Horizontal 7-Day Ribbon */}
                      <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 sm:mx-0 sm:grid sm:grid-cols-7 sm:gap-2">
                        {weekDays.map((day) => {
                          const iso = toISODate(day);
                          const isSelected = selectedDate === iso;
                          const isToday = iso === todayISO();
                          const dayName = day.toLocaleDateString('en-US', { weekday: 'short' });
                          const dayNumber = day.getDate();
                          const monthName = day.toLocaleDateString('en-US', { month: 'short' });
                          const hasOpenPlay = openPlaySessions.some(
                            (s) => s.date === iso && s.is_active && s.status !== 'cancelled'
                          );
                          const beyondLimit = isDayBeyondLimit(iso);

                          return (
                            <button
                              key={iso}
                              onClick={() => setDate(iso)}
                              disabled={beyondLimit}
                              title={beyondLimit ? `Bookings open up to ${maxAdvanceDays} days ahead` : undefined}
                              className={`group relative flex min-w-[54px] flex-1 shrink-0 snap-start flex-col items-center justify-center rounded-xl py-2 transition-all sm:min-w-0 ${
                                beyondLimit
                                  ? 'cursor-not-allowed border border-neutral-800/40 bg-neutral-900/40 opacity-40 text-neutral-600'
                                  : isSelected
                                    ? 'border border-rose-500 bg-rose-600 text-white font-bold shadow-[0_0_16px_rgba(244,63,94,0.35)]'
                                    : 'border border-neutral-800 bg-neutral-900 text-cream-muted hover:border-neutral-700 hover:bg-neutral-850 hover:text-white'
                              }`}
                            >
                              {isToday && (
                                <span
                                  className={`mb-0.5 rounded-full px-1.5 py-[1px] text-[8px] font-black uppercase tracking-wider ${
                                    isSelected
                                      ? 'bg-black text-rose-300'
                                      : 'bg-rose-500/20 text-rose-400'
                                  }`}
                                >
                                  TODAY
                                </span>
                              )}

                              <span className={`text-[10px] font-semibold uppercase ${isSelected ? 'text-white' : 'text-cream-muted'}`}>
                                {dayName}
                              </span>

                              <span className="text-base font-extrabold leading-tight text-cream">
                                {dayNumber}
                              </span>

                              <span className={`text-[9px] uppercase font-medium ${isSelected ? 'text-white/80' : 'text-cream-muted/60'}`}>
                                {monthName}
                              </span>

                              {hasOpenPlay && !beyondLimit && (
                                <span
                                  className={`mt-1 h-1.5 w-1.5 rounded-full ${
                                    isSelected ? 'bg-white' : 'bg-accent-400'
                                  }`}
                                />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Step 2: Time Slots Matrix (Preserved from original) */}
                    <div>
                      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-600 text-xs font-bold text-white shadow-sm">
                            2
                          </div>
                          <h3 className="text-sm font-bold text-cream sm:text-base">
                            Choose <span className="text-accent-400">Court & Time</span>
                          </h3>
                        </div>

                        <span className="rounded-full border border-neutral-700 bg-neutral-800/80 px-3 py-1 text-xs font-semibold text-cream-muted shadow-sm">
                          <span className="sm:hidden">
                            {new Date(`${selectedDate}T00:00:00`).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                          <span className="hidden sm:inline">{formatDateLong(selectedDate)}</span>
                        </span>
                      </div>

                      {/* Status legend */}
                      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-b border-neutral-800 pb-3 text-[11px] text-cream-muted">
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full border border-[#ED1C24] bg-[#ED1C24]/40" />
                          <span>Available</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-amber-400" />
                          <span>Pending</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-neutral-600" />
                          <span>Booked</span>
                        </div>
                      </div>

                      {loadingSlots || loadingCourts || loadingOpenPlay ? (
                        <LoadingSpinner className="py-12 md:py-20" />
                      ) : error ? (
                        <div className="py-8 text-center font-medium text-amber-400 md:py-16">{error}</div>
                      ) : courts.length === 0 ? (
                        <div className="py-8 text-center text-sm font-medium text-cream-muted md:py-16">
                          No courts found.
                        </div>
                      ) : allPeriodsEmpty ? (
                        <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-8 text-center">
                          <Clock className="mx-auto h-8 w-8 text-neutral-500" />
                          <p className="mt-3 text-sm font-semibold text-cream">
                            {selectedDate === todayISO()
                              ? BOOKING_COPY.emptyState.titleToday
                              : BOOKING_COPY.emptyState.titleFuture}
                          </p>
                          <p className="mt-1 text-xs text-cream-muted">
                            {BOOKING_COPY.emptyState.description}
                          </p>
                        </div>
                      ) : (
                        <div className="block">
                          <div className="max-h-[75vh] overflow-y-auto overflow-x-auto rounded-2xl border border-neutral-800 bg-neutral-950/40">
                            <div className="w-full p-4 sm:min-w-[580px]">
                              {/* Courts Column Header */}
                              <div
                                className="sticky top-0 z-30 -mx-4 -mt-4 mb-4 border-b border-neutral-800 bg-neutral-900 px-4 py-3 text-center text-xs font-extrabold uppercase tracking-wider text-cream shadow-md backdrop-blur-md"
                                style={{
                                  display: 'grid',
                                  gridTemplateColumns: `repeat(${courts.length}, minmax(90px, 1fr))`,
                                  gap: '0.75rem',
                                }}
                              >
                                {courts.map((court, idx) => {
                                  const accent = getCourtAccent(idx);
                                  return (
                                    <div
                                      key={court.id}
                                      className={`flex items-center justify-center gap-2 truncate ${accent.header}`}
                                    >
                                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${accent.dot}`} />
                                      <span className="truncate font-bold">{court.name}</span>
                                    </div>
                                  );
                                })}
                              </div>

                              <div className="space-y-6">
                                {morningTimes.length > 0 && (
                                  <DesktopPeriodSection
                                    title="MORNING"
                                    icon={<CloudSun className="h-4 w-4 text-rose-400" />}
                                    courts={courts}
                                    timeIntervals={morningTimes}
                                    getSlotForCourtAndTime={getSlotForCourtAndTime}
                                    selectedSlotIds={selectedSlotIds}
                                    onToggleSlot={toggleSlot}
                                    getOpenPlaySession={getOpenPlaySessionForSlot}
                                    onOpenPlayClick={handleOpenPlayClick}
                                  />
                                )}
                                {afternoonTimes.length > 0 && (
                                  <DesktopPeriodSection
                                    title="AFTERNOON"
                                    icon={<Sun className="h-4 w-4 text-amber-400" />}
                                    courts={courts}
                                    timeIntervals={afternoonTimes}
                                    getSlotForCourtAndTime={getSlotForCourtAndTime}
                                    selectedSlotIds={selectedSlotIds}
                                    onToggleSlot={toggleSlot}
                                    getOpenPlaySession={getOpenPlaySessionForSlot}
                                    onOpenPlayClick={handleOpenPlayClick}
                                  />
                                )}
                                {eveningTimes.length > 0 && (
                                  <DesktopPeriodSection
                                    title="EVENING"
                                    icon={<Moon className="h-4 w-4 text-sky-400" />}
                                    courts={courts}
                                    timeIntervals={eveningTimes}
                                    getSlotForCourtAndTime={getSlotForCourtAndTime}
                                    selectedSlotIds={selectedSlotIds}
                                    onToggleSlot={toggleSlot}
                                    getOpenPlaySession={getOpenPlaySessionForSlot}
                                    onOpenPlayClick={handleOpenPlayClick}
                                  />
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Desktop Slot Selection Bar */}
                      <div className="mt-8 hidden items-center justify-between gap-4 rounded-xl border border-neutral-800 bg-neutral-850 p-5 sm:flex">
                        <div>
                          <span className="text-xs font-semibold uppercase tracking-wider text-rose-400">
                            Selected Slots
                          </span>
                          <div className="text-lg font-bold text-cream">
                            {selectedSlotIds.length} slot{selectedSlotIds.length !== 1 && 's'} chosen
                            {selectedSlotIds.length > 0 && (
                              <span className="ml-2 text-base font-semibold text-accent-400">
                                ({formatCurrency(totalSelected)})
                              </span>
                            )}
                          </div>
                        </div>

                        <Button
                          size="md"
                          onClick={() => navigate('/booking')}
                          disabled={selectedSlotIds.length === 0 || !bookingsEnabled}
                          rightIcon={<ArrowRight className="h-5 w-5" />}
                        >
                          Proceed to Reservation
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Mobile Sticky Bottom Floating Action Bar */}
      {selectedSlotIds.length > 0 && bookingsEnabled && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-700 bg-charcoal/95 p-3.5 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-md sm:hidden">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-cream-muted">
                {selectedSlotIds.length} Slot{selectedSlotIds.length !== 1 ? 's' : ''} Selected
              </p>
              <p className="text-lg font-bold text-accent-400">{formatCurrency(totalSelected)}</p>
            </div>
            <Button
              size="md"
              onClick={() => navigate('/booking')}
              rightIcon={<ArrowRight className="h-4 w-4" />}
              className="shrink-0"
            >
              Proceed
            </Button>
          </div>
        </div>
      )}

      {/* Find Us Section */}
      <section className="border-b border-neutral-800 bg-neutral-950/60 py-12 sm:py-20">
        <div className="container-page">
          <div className="mb-8 text-center sm:mb-12">
            <span className="text-[11px] font-bold uppercase tracking-wider text-accent-400 sm:text-xs">
              Location
            </span>
            <h2 className="section-title mt-2 text-2xl sm:text-3xl md:text-4xl">
              Find Us
            </h2>
            <p className="mt-2 text-xs text-cream-muted sm:text-sm">
              National Highway, Rosario, Tandag City
            </p>
          </div>

          <div className="mx-auto max-w-5xl overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/80 shadow-xl">
            <div className="relative w-full aspect-[4/3] sm:aspect-auto sm:h-[500px]">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d280.2669586700182!2d126.20822932494922!3d9.053797356959693!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x330237000c13b973%3A0xfc62991506f06131!2sSmash%20Point%20Pickle%20Sports%20Center!5e1!3m2!1sen!2sph!4v1793489693612!5m2!1sen!2sph"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
                title="Smash Point Pickle Sports Center Location"
                className="absolute inset-0 h-full w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-14 sm:py-20 bg-neutral-950/40">
        <div className="container-page">
          <div className="mb-10 text-center sm:mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-accent-400">
              Simple Process
            </span>
            <h2 className="section-title mt-2">How It Works</h2>
          </div>

          <div className="grid gap-6 sm:gap-8 md:grid-cols-4">
            {[
              { step: '01', title: 'Select Court & Time', desc: 'Pick your preferred court, date, and available time slots.' },
              { step: '02', title: 'Enter Details', desc: 'Fill in your name, contact info, and any special requests.' },
              { step: '03', title: BOOKING_COPY.howItWorks.step03Title, desc: BOOKING_COPY.howItWorks.step03Desc },
              { step: '04', title: BOOKING_COPY.howItWorks.step04Title, desc: BOOKING_COPY.howItWorks.step04Desc },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="relative"
              >
                <div className="mb-3 font-display text-4xl font-extrabold tracking-tight text-neutral-700 sm:mb-4 sm:text-5xl">
                  {item.step}
                </div>

                <h3 className="text-base font-bold text-cream sm:text-lg">{item.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-cream-muted sm:text-sm">{item.desc}</p>

                {i < 3 && (
                  <div className="mt-6 hidden h-px bg-gradient-to-r from-neutral-800 via-neutral-700/50 to-transparent md:block" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <div className="h-20 sm:hidden" />
      <Footer />
    </div>
  );
}

// --------------------------------------------------------
// SUB-COMPONENTS (Original Timeslot Table Intact)
// --------------------------------------------------------

function DesktopPeriodSection({
  title,
  icon,
  courts,
  timeIntervals,
  getSlotForCourtAndTime,
  selectedSlotIds,
  onToggleSlot,
  getOpenPlaySession,
  onOpenPlayClick,
}: {
  title: string;
  icon: React.ReactNode;
  courts: Court[];
  timeIntervals: { start_time: string; end_time: string }[];
  getSlotForCourtAndTime: (courtId: string, startTime: string, endTime: string) => TimeSlot | undefined;
  selectedSlotIds: string[];
  onToggleSlot: (slotId: string) => void;
  getOpenPlaySession?: (courtId: string, startTime: string, endTime: string) => OpenPlaySession | undefined;
  onOpenPlayClick?: (session: OpenPlaySession) => void;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <span className="h-4 w-4">{icon}</span>
        <span className="text-xs font-bold uppercase tracking-wider text-cream-muted">
          {title}
        </span>
        <div className="h-px flex-1 bg-neutral-800" />
      </div>

      <div className="space-y-2.5">
        {timeIntervals.map((interval) => (
          <div
            key={`${interval.start_time}-${interval.end_time}`}
            className="grid gap-2.5"
            style={{
              gridTemplateColumns: `repeat(${courts.length}, minmax(90px, 1fr))`,
            }}
          >
            {courts.map((court, idx) => {
              const slot = getSlotForCourtAndTime(court.id, interval.start_time, interval.end_time);
              const accent = getCourtAccent(idx);
              const openPlaySession = getOpenPlaySession?.(court.id, interval.start_time, interval.end_time);

              if (!slot) {
                return (
                  <div
                    key={`${court.id}-${interval.start_time}`}
                    className="flex h-11 select-none items-center justify-center rounded-xl border border-neutral-800/60 bg-neutral-950/60 text-xs text-neutral-700"
                  >
                    —
                  </div>
                );
              }

              if (openPlaySession) {
                return (
                  <div key={slot.id}>
                    <OpenPlayPill
                      session={openPlaySession}
                      onClick={() => onOpenPlayClick?.(openPlaySession)}
                      accent={accent}
                    />
                  </div>
                );
              }

              return (
                <div key={slot.id}>
                  <SlotPill
                    slot={slot}
                    isSelected={selectedSlotIds.includes(slot.id)}
                    onToggle={() => onToggleSlot(slot.id)}
                    accent={accent}
                  />
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function OpenPlayPill({
  session,
  onClick,
  accent: _accent,
}: {
  session: OpenPlaySession;
  onClick: () => void;
  accent: CourtAccent;
}) {
  return (
    <button
      onClick={onClick}
      className="group relative flex h-11 w-full items-center justify-between rounded-xl border-2 border-accent-400 bg-accent-500/15 px-3 font-bold transition-all hover:bg-accent-500/25 hover:shadow-[0_0_20px_-4px_rgba(255,183,3,0.5)] active:scale-95"
      title={`Open Play: ${session.current_players}/${session.max_players} players · ${session.skill_level}`}
    >
      <span className="text-xs font-black text-accent-400">OP</span>
      <span className="text-xs font-semibold text-accent-200">
        {session.current_players}/{session.max_players} joined
      </span>

      <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-xs text-cream shadow-xl group-hover:block">
        <p className="font-semibold text-accent-400">Open Play Session</p>
        <p className="text-[11px] text-cream-muted">
          {session.current_players}/{session.max_players} players · {session.skill_level}
        </p>
        {session.host_name && (
          <p className="text-[11px] text-cream-muted">Host: {session.host_name}</p>
        )}
        <div className="absolute bottom-0 left-1/2 h-2 w-2 -translate-x-1/2 translate-y-1/2 rotate-45 border-b border-r border-neutral-700 bg-neutral-900" />
      </div>
    </button>
  );
}

function SlotPill({
  slot,
  isSelected,
  onToggle,
  accent,
}: {
  slot: TimeSlot;
  isSelected: boolean;
  onToggle: () => void;
  accent: CourtAccent;
}) {
  const isAvailable = slot.is_available;
  const isPending = (slot as unknown as { is_pending?: boolean }).is_pending;

  let styleClasses = `${accent.border} ${accent.bg} ${accent.text} ${accent.hoverBorder} ${accent.hoverBg} cursor-pointer`;

  if (!isAvailable) {
    styleClasses = 'border-neutral-800/80 bg-neutral-900/60 text-neutral-500/70 line-through cursor-not-allowed';
  } else if (isPending) {
    styleClasses = 'border-amber-500/40 bg-amber-500/10 text-amber-300/80 cursor-not-allowed';
  } else if (isSelected) {
    styleClasses = 'border-white bg-[#ED1C24] text-white font-bold shadow-[0_0_16px_rgba(237,28,36,0.35)]';
  }

  return (
    <button
      onClick={isAvailable && !isPending ? onToggle : undefined}
      disabled={!isAvailable || isPending}
      aria-pressed={isSelected}
      className={`flex h-11 w-full items-center justify-center rounded-xl border text-[11px] font-semibold tracking-tight transition-all px-1 active:scale-95 ${styleClasses}`}
    >
      <span className="truncate flex items-center gap-1">
        {formatTimeRangeShort(slot.start_time, slot.end_time)}
      </span>
    </button>
  );
}