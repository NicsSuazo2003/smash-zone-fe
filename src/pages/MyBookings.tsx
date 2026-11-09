import { useEffect, useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  CalendarDays,
  Clock,
  AlertCircle,
  ArrowRight,
  Wallet,
} from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { bookingService } from '@/services/bookingService';
import { useAdminStore } from '@/stores/adminStore';
import {
  formatCurrency,
  formatDateLong,
  formatTimeRange,
} from '@/utils/format';
import type { Booking } from '@/types';

export function MyBookings() {
  const navigate = useNavigate();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const courts = useAdminStore((state) => state.courts);

  useEffect(() => {
    const savedRef = localStorage.getItem('pendingBookingRef');
    if (!savedRef) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const fetched = await bookingService.trackBooking(savedRef);
        if (cancelled) return;

        if (fetched.status === 'pending_payment') {
          setBooking(fetched);
        } else {
          localStorage.removeItem('pendingBookingRef');
        }
      } catch (err) {
        if (cancelled) return;
        console.error('Failed to load pending booking:', err);
        localStorage.removeItem('pendingBookingRef');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const courtNames = useMemo(() => {
    if (!booking || !booking.slots) return booking?.court_name || '';
    const ids = Array.from(new Set(booking.slots.map(s => s.court_id).filter(Boolean)));
    if (ids.length === 0) return booking.court_name;
    const names = ids.map(id => courts.find(c => c.id === id)?.name).filter(Boolean);
    return names.length > 0 ? names.join(', ') : booking.court_name;
  }, [booking, courts]);

  return (
    <div className="min-h-screen bg-charcoal text-cream">
      <Navbar />

      <div className="container-page pt-24 pb-16 sm:pb-20">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3 sm:mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-cream sm:text-3xl">
              My bookings
            </h1>
            <p className="mt-1 text-xs text-cream-muted sm:text-sm">
              Your pending and recent bookings on this device
            </p>
          </div>
          <Button size="sm" to="/" leftIcon={<CalendarDays className="h-4 w-4" />}>
            Book a court
          </Button>
        </div>

        {loading ? (
          <LoadingSpinner className="py-16" />
        ) : booking ? (
          <div className="space-y-5">
            {/* Unpaid Banner: Warm amber / gold notice */}
            <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-amber-500/40 bg-amber-500/20 text-amber-300">
                    <AlertCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-base font-bold text-amber-200">
                      You have an unpaid booking
                    </p>
                    <p className="mt-0.5 text-xs text-cream-muted sm:text-sm">
                      Upload your payment receipt to confirm {booking.slots.length} slot
                      {booking.slots.length !== 1 && 's'} ·{' '}
                      {formatCurrency(booking.total_amount)}
                    </p>
                  </div>
                </div>
                <Button
                  size="md"
                  onClick={() => navigate('/checkout')}
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                >
                  Pay now
                </Button>
              </div>
            </div>

            {/* Booking Details */}
            <div className="card rounded-2xl border border-neutral-700 bg-neutral-900/80 p-5 shadow-xl">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-cream-muted">
                    Reference
                  </p>
                  <p className="font-mono text-sm font-bold text-sky-300">
                    {booking.reference_code}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                    Upload receipt
                  </span>
                  <span className="rounded-full border border-neutral-700 bg-neutral-950/60 px-3 py-0.5 text-[10px] font-bold text-cream-muted">
                    {booking.slots.length} slot{booking.slots.length !== 1 && 's'}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3 border-b border-neutral-700 pb-3">
                  <div>
                    <p className="text-sm font-bold text-cream">{courtNames}</p>
                    <p className="text-xs text-cream-muted">
                      {formatDateLong(booking.date)}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-accent-400">
                    {formatCurrency(booking.total_amount)}
                  </p>
                </div>

                <div className="space-y-2">
                  {booking.slots.map((slot) => (
                    <div
                      key={slot.id}
                      className="flex items-center justify-between rounded-lg bg-neutral-800/70 px-3 py-2 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-sky-300" />
                        <span className="text-cream">
                          {formatTimeRange(slot.start_time, slot.end_time)}
                        </span>
                      </div>
                      <span className="font-bold text-accent-400">
                        {formatCurrency(slot.price)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <p className="text-center text-xs text-cream-muted">
              Booking on a different device?{' '}
              <Link to="/track" className="font-semibold text-sky-300 underline hover:text-sky-200">
                Look it up with your reference code
              </Link>
              .
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-neutral-700 bg-neutral-900/60 p-10 text-center">
            <Wallet className="mx-auto h-10 w-10 text-cream-muted/40" />
            <p className="mt-4 text-sm font-semibold text-cream">
              No pending bookings on this device
            </p>
            <p className="mt-1 text-xs text-cream-muted">
              Start a new booking, or look up an existing one with your reference code.
            </p>
            <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
              <Button size="md" to="/">
                Book a court
              </Button>
              <Button size="md" variant="secondary" to="/track">
                Track a booking
              </Button>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}