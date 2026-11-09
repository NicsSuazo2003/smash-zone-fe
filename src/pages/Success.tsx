  // src/pages/Success.tsx
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

    const courtNames = useMemo(() => {
      if (!currentBooking || !currentBooking.slots) return currentBooking?.court_name || '';
      const ids = Array.from(new Set(currentBooking.slots.map(s => s.court_id).filter(Boolean)));
      if (ids.length === 0) return currentBooking.court_name;
      const names = ids.map(id => courts.find(c => c.id === id)?.name).filter(Boolean);
      return names.length > 0 ? names.join(', ') : currentBooking.court_name;
    }, [currentBooking, courts]);

    // Group slots by court to ensure multiple courts display correctly
    // Group slots by court to ensure multiple courts display correctly
    const groupedSlots = useMemo(() => {
      if (!currentBooking || !currentBooking.slots) return [];
      const map = new Map<string, { start_time: string; end_time: string; court_name: string }[]>();
      
      currentBooking.slots.forEach((s) => {
        const cid = s.court_id || 'unknown';
        if (!map.has(cid)) map.set(cid, []);
        
        map.get(cid)!.push({ 
          start_time: s.start_time || '', 
          end_time: s.end_time || '',
          court_name: s.court_name || '' // ✅ Read from API
        });
      });

      let unknownIndex = 1;
      return Array.from(map.entries()).map(([cid, times]) => {
        // ✅ FIX: Use string | undefined to satisfy TypeScript
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

    // Derive the display names directly from groupedSlots
    const displayCourtNames = useMemo(() => {
      if (groupedSlots.length === 0) return currentBooking?.court_name || '';
      const uniqueNames = Array.from(new Set(groupedSlots.map(g => g.courtName)));
      return uniqueNames.join(', ');
    }, [groupedSlots, currentBooking]);

    if (!currentBooking) return null;

    const totalAmount = typeof currentBooking.total_amount === 'number'
      ? currentBooking.total_amount
      : 0;

    return (
      <div className="min-h-screen bg-charcoal text-cream">
        <Navbar />

        <div className="container-page pt-24 pb-14 sm:pt-28 sm:pb-16">
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
                className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-accent-400/40 bg-accent-500/20 shadow-glow-green sm:h-20 sm:w-20"
              >
                <CheckCircle2 className="h-8 w-8 text-accent-300 sm:h-11 sm:w-11" />
              </motion.div>
              <h1 className="mt-4 text-2xl font-bold text-cream sm:mt-6 sm:text-4xl">
                Payment Submitted!
              </h1>
              <p className="mt-2 text-xs text-cream-muted sm:mt-3 sm:text-base">
                Your booking is now being reviewed. We'll confirm it shortly.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="card mt-6 rounded-2xl border border-neutral-700 bg-neutral-900/80 p-5 shadow-xl backdrop-blur-sm sm:mt-8 sm:p-6"
            >
              <div className="flex items-center justify-between border-b border-neutral-700 pb-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-cream-muted">
                    Reference Code
                  </p>
                  <p className="font-mono text-xl font-extrabold tracking-wider text-primary-300 sm:text-2xl">
                    {currentBooking.reference_code}
                  </p>
                </div>
                <StatusBadge status={currentBooking.status} />
              </div>

              <div className="mt-4 space-y-3 sm:mt-5 sm:space-y-3.5">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-neutral-700 bg-neutral-950/70 text-primary-300">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-cream-muted">Court(s)</p>
                    <p className="text-sm font-bold text-cream sm:text-base">{displayCourtNames}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-neutral-700 bg-neutral-950/70 text-primary-300">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-cream-muted">Date</p>
                    <p className="text-sm font-bold text-cream sm:text-base">{formatDateLong(currentBooking.date)}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-neutral-700 bg-neutral-950/70 text-primary-300 mt-1">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div className="w-full">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-cream-muted mb-1.5">Time Slots</p>
                    <div className="space-y-2">
                      {groupedSlots.map((group, idx) => (
                        <div key={idx} className="rounded-lg border border-neutral-700 bg-neutral-950/50 p-2.5">
                          <p className="text-xs font-bold text-cream mb-1">{group.courtName}</p>
                          <div className="space-y-1">
                            {group.times.map((t, i) => (
                              <div key={i} className="text-xs text-cream-muted">
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

              <div className="mt-5 flex items-center justify-between border-t border-neutral-700 pt-4">
                <span className="text-xs text-cream-muted sm:text-sm">Total Paid</span>
                <span className="font-display text-2xl font-extrabold text-accent-400 sm:text-3xl">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-5 rounded-2xl border border-primary-500/40 bg-primary-500/10 p-4 sm:mt-6 sm:p-5"
            >
              <h3 className="text-sm font-bold text-primary-200 sm:text-base">
                What happens next?
              </h3>
              <ul className="mt-2.5 space-y-2 text-xs text-cream-muted sm:mt-3 sm:text-sm">
                <li className="flex items-start gap-2.5">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-300" />
                  <span>Our team will verify your payment reference number and screenshot.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-300" />
                  <span>You will receive approval and confirmation usually within 30 minutes.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-300" />
                  <span>Save your reference code to check your live court reservation status anytime.</span>
                </li>
              </ul>
            </motion.div>

            <div className="mt-6 flex flex-col gap-2.5 sm:mt-8 sm:flex-row sm:gap-3">
              <Button
                size="lg"
                fullWidth
                to="/track"
                leftIcon={<Search className="h-5 w-5" />}
              >
                Track This Booking
              </Button>
              <Button
                size="lg"
                variant="secondary"
                fullWidth
                to="/"
                leftIcon={<Home className="h-5 w-5" />}
              >
                Back to Home
              </Button>
            </div>

            <p className="mt-5 text-center text-xs text-cream-muted sm:mt-6">
              Bookmark this page or save your reference code:{' '}
              <span className="font-mono font-bold text-primary-300">
                {currentBooking.reference_code}
              </span>
            </p>
          </div>
        </div>

        <Footer />
      </div>
    );
  }