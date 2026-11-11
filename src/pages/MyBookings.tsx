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
    const ids = Array.from(new Set(booking.slots.map((s) => s.court_id).filter(Boolean)));
    if (ids.length === 0) return booking.court_name;
    const names = ids.map((id) => courts.find((c) => c.id === id)?.name).filter(Boolean);
    return names.length > 0 ? names.join(', ') : booking.court_name;
  }, [booking, courts]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />

      <div className="container-page pt-24 pb-16 sm:pb-20">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3 sm:mb-8">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              My Bookings
            </h1>
            <p className="mt-1 text-xs text-slate-500 sm:text-sm">
              Your pending and recent bookings on this device
            </p>
          </div>
          <Button
            size="sm"
            to="/"
            leftIcon={<CalendarDays className="h-4 w-4" />}
            className="bg-[#FF7A00] hover:bg-[#E56600] text-white font-bold"
          >
            Book a court
          </Button>
        </div>

        {loading ? (
          <LoadingSpinner className="py-16" />
        ) : booking ? (
          <div className="space-y-5">
            {/* Unpaid Warning Banner */}
            <div className="rounded-3xl border border-amber-300 bg-amber-50 p-5 shadow-xs">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-xs">
                    <AlertCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-base font-bold text-amber-950">
                      You have an unpaid booking
                    </p>
                    <p className="mt-0.5 text-xs text-amber-800 sm:text-sm">
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
                  className="bg-[#FF7A00] hover:bg-[#E56600] text-white font-bold shadow-xs"
                >
                  Pay now
                </Button>
              </div>
            </div>

            {/* Booking Card */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Reference
                  </p>
                  <p className="font-mono text-base font-black text-[#3D1164]">
                    {booking.reference_code}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-800">
                    Upload receipt
                  </span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-bold text-slate-600">
                    {booking.slots.length} slot{booking.slots.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <p className="text-sm font-bold text-slate-900">{courtNames}</p>
                    <p className="text-xs text-slate-500 font-medium">
                      {formatDateLong(booking.date)}
                    </p>
                  </div>
                  <p className="text-base font-black text-[#FF7A00]">
                    {formatCurrency(booking.total_amount)}
                  </p>
                </div>

                <div className="space-y-2">
                  {booking.slots.map((slot) => (
                    <div
                      key={slot.id}
                      className="flex items-center justify-between rounded-xl bg-slate-50 px-3.5 py-2.5 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-[#3D1164]" />
                        <span className="font-semibold text-slate-800">
                          {formatTimeRange(slot.start_time, slot.end_time)}
                        </span>
                      </div>
                      <span className="font-bold text-slate-900">
                        {formatCurrency(slot.price)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <p className="text-center text-xs text-slate-500">
              Booking on a different device?{' '}
              <Link to="/track" className="font-bold text-[#FF7A00] underline hover:text-[#E56600]">
                Look it up with your reference code
              </Link>
              .
            </p>
          </div>
        ) : (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <Wallet className="mx-auto h-12 w-12 text-slate-300" />
            <p className="mt-4 text-base font-bold text-slate-900">
              No pending bookings on this device
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Start a new booking, or look up an existing one with your reference code.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-2.5 sm:flex-row">
              <Button
                size="md"
                to="/"
                className="bg-[#FF7A00] hover:bg-[#E56600] text-white font-bold"
              >
                Book a court
              </Button>
              <Button
                size="md"
                variant="secondary"
                to="/track"
                className="bg-white border-slate-300 text-slate-800"
              >
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