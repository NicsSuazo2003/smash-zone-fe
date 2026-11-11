import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  Calendar,
  Clock,
  MapPin,
  Search,
  Home,
} from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useBookingStore } from '@/stores/bookingStore';
import {
  formatTimeRange,
  formatCurrency,
  formatDateLong,
} from '@/utils/format';

export function Success() {
  const navigate = useNavigate();
  const { currentBooking } = useBookingStore();
  const courts = useBookingStore((state) => state.courts);

  useEffect(() => {
    if (!currentBooking) {
      navigate('/');
    }
  }, [currentBooking, navigate]);

  const groupedSlots = useMemo(() => {
    if (!currentBooking || !currentBooking.slots) return [];
    const map = new Map<string, { start_time: string; end_time: string; court_name: string }[]>();

    currentBooking.slots.forEach((s) => {
      const cid = s.court_id || 'unknown';
      if (!map.has(cid)) map.set(cid, []);

      map.get(cid)!.push({
        start_time: s.start_time || '',
        end_time: s.end_time || '',
        court_name: s.court_name || '',
      });
    });

    let unknownIndex = 1;
    return Array.from(map.entries()).map(([cid, times]) => {
      let courtName: string | undefined = times[0]?.court_name;

      if (!courtName) {
        courtName = courts.find((c) => c.id === cid)?.name;
      }

      if (!courtName) {
        if (cid === 'unknown') {
          courtName = `Court ${unknownIndex++}`;
        } else {
          courtName = currentBooking.court_name || 'Court';
        }
      }

      return {
        courtName,
        times: times.sort((a, b) => a.start_time.localeCompare(b.start_time)),
      };
    });
  }, [currentBooking, courts]);

  const displayCourtNames = useMemo(() => {
    if (groupedSlots.length === 0) return currentBooking?.court_name || '';
    const uniqueNames = Array.from(new Set(groupedSlots.map((g) => g.courtName)));
    return uniqueNames.join(', ');
  }, [groupedSlots, currentBooking]);

  if (!currentBooking) return null;

  const totalAmount =
    typeof currentBooking.total_amount === 'number'
      ? currentBooking.total_amount
      : 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />

      <div className="container-page pt-24 pb-14 sm:pt-28 sm:pb-20">
        <div className="mx-auto max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 15, delay: 0.2 }}
              className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-600 shadow-md sm:h-20 sm:w-20"
            >
              <CheckCircle2 className="h-8 w-8 sm:h-11 sm:w-11" />
            </motion.div>
            <h1 className="mt-4 text-2xl font-black text-slate-900 sm:mt-6 sm:text-4xl">
              Payment Submitted!
            </h1>
            <p className="mt-2 text-xs text-slate-500 sm:mt-3 sm:text-base">
              Your booking is now being reviewed. We&apos;ll confirm it shortly.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:mt-8 sm:p-8"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Reference Code
                </p>
                <p className="font-mono text-xl font-black tracking-wider text-[#3D1164] sm:text-2xl">
                  {currentBooking.reference_code}
                </p>
              </div>
              <StatusBadge status={currentBooking.status} />
            </div>

            <div className="mt-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-[#3D1164]">
                  <MapPin className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Court(s)</p>
                  <p className="text-sm font-bold text-slate-900 sm:text-base">{displayCourtNames}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#FF7A00]">
                  <Calendar className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Date</p>
                  <p className="text-sm font-bold text-slate-900 sm:text-base">{formatDateLong(currentBooking.date)}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-[#3D1164] mt-1">
                  <Clock className="h-4 w-4" />
                </div>
                <div className="w-full">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Time Slots</p>
                  <div className="space-y-2">
                    {groupedSlots.map((group, idx) => (
                      <div key={idx} className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
                        <p className="text-xs font-bold text-slate-900 mb-1">{group.courtName}</p>
                        <div className="space-y-1">
                          {group.times.map((t, i) => (
                            <div key={i} className="text-xs text-slate-600 font-medium">
                              {formatTimeRange(t.start_time, t.end_time)}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-5">
              <span className="text-xs font-semibold text-slate-500 sm:text-sm">Total Paid</span>
              <span className="font-display text-2xl font-black text-[#FF7A00] sm:text-3xl">
                {formatCurrency(totalAmount)}
              </span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-6 rounded-3xl border border-purple-200 bg-purple-50/70 p-5 sm:p-6"
          >
            <h3 className="text-sm font-bold text-[#3D1164] sm:text-base">
              What happens next?
            </h3>
            <ul className="mt-3 space-y-2.5 text-xs text-slate-700 sm:text-sm">
              <li className="flex items-start gap-2.5">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#FF7A00]" />
                <span>Our team will verify your payment reference and receipt.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#FF7A00]" />
                <span>Approval is typically confirmed within 30 minutes.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#FF7A00]" />
                <span>Save your booking code to view your reservation status anytime.</span>
              </li>
            </ul>
          </motion.div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button
              size="lg"
              fullWidth
              to="/track"
              leftIcon={<Search className="h-5 w-5" />}
              className="bg-[#FF7A00] hover:bg-[#E56600] text-white font-bold"
            >
              Track This Booking
            </Button>
            <Button
              size="lg"
              variant="secondary"
              fullWidth
              to="/"
              leftIcon={<Home className="h-5 w-5" />}
              className="bg-white border-slate-300 text-slate-800 hover:bg-slate-50"
            >
              Back to Home
            </Button>
          </div>

          <p className="mt-6 text-center text-xs text-slate-400">
            Booking code:{' '}
            <span className="font-mono font-bold text-[#3D1164]">
              {currentBooking.reference_code}
            </span>
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
}