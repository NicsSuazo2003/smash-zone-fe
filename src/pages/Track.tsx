import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Calendar,
  Clock,
  MapPin,
  User,
  Mail,
  Phone,
  Upload,
  AlertCircle,
  Wallet,
  ImageIcon,
  CheckCircle2,
} from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { bookingService } from '@/services/bookingService';
import { useClientStore } from '@/stores/clientStore';
import { useBookingStore } from '@/stores/bookingStore';
import {
  formatTimeRange,
  formatCurrency,
  formatDateLong,
  formatDateTime,
} from '@/utils/format';
import { APP_CONFIG } from '@/utils/constants';
import { isInAppBrowser, getInAppBrowserName } from '@/utils/browser';
import type { Booking, BookingSummary } from '@/types';

export function Track() {
  const settings = useClientStore((state) => state.settings);
  const loadSettings = useClientStore((state) => state.loadSettings);
  const courts = useBookingStore((state) => state.courts);
  const loadCourts = useBookingStore((state) => state.loadCourts);

  const displayNumber = settings?.gcash_number || APP_CONFIG.paymentNumber;

  const [reference, setReference] = useState(() => localStorage.getItem('pendingBookingRef') || '');
  const [email, setEmail] = useState('');
  const [booking, setBooking] = useState<Booking | null>(null);
  const [summaries, setSummaries] = useState<BookingSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [paymentRef, setPaymentRef] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  useEffect(() => {
    loadSettings();
    if (courts.length === 0) {
      loadCourts();
    }
  }, [loadSettings, loadCourts, courts.length]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const ref = reference.trim();
    const mail = email.trim();
    if (!ref && !mail) {
      setError('Enter a reference code or your email to search.');
      return;
    }
    setLoading(true);
    setError(null);
    setBooking(null);
    setSummaries([]);
    setUploadSuccess(false);

    try {
      if (ref) {
        const result = await bookingService.trackBooking(ref, mail || undefined);
        setBooking(result);
      } else {
        const list = await bookingService.trackBookingSummariesByEmail(mail);
        if (list.length === 0) {
          setError('No pending payments found for this email. If your booking is already confirmed, look it up with your reference code.');
        } else {
          setSummaries(list);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSummaryClick = async (summary: BookingSummary) => {
    setLoading(true);
    setError(null);
    try {
      const detail = await bookingService.trackBooking(summary.reference_code, email.trim());
      setBooking(detail);
      setSummaries([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open booking');
    } finally {
      setLoading(false);
    }
  };

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => setScreenshot(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!booking || !screenshot || !paymentRef.trim()) return;
    setUploading(true);
    try {
      const updated = await bookingService.uploadPayment(booking.id, screenshot, paymentRef.trim());
      setBooking(updated);
      setUploadSuccess(true);
      setScreenshot(null);
      setPaymentRef('');
      localStorage.removeItem('pendingBookingRef');
    } catch {
      setError('Failed to upload payment. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const canUploadPayment = booking && (booking.status === 'pending_payment' || booking.status === 'payment_submitted');
  const hasPaymentScreenshot = booking?.payment_screenshot_url;
  const canSearch = reference.trim().length > 0 || email.trim().length > 0;

  const groupedSlots = useMemo(() => {
    if (!booking || !booking.slots) return [];
    const map = new Map<string, { start_time: string; end_time: string; court_name: string }[]>();

    booking.slots.forEach((s) => {
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
          courtName = booking.court_name || 'Court';
        }
      }

      return {
        courtName,
        times: times.sort((a, b) => a.start_time.localeCompare(b.start_time)),
      };
    });
  }, [booking, courts]);

  const displayCourtNames = useMemo(() => {
    if (groupedSlots.length === 0) return booking?.court_name || '';
    const uniqueNames = Array.from(new Set(groupedSlots.map((g) => g.courtName)));
    return uniqueNames.join(', ');
  }, [groupedSlots, booking]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />

      <div className="container-page pt-24 pb-14 sm:pt-28 sm:pb-16">
        {isInAppBrowser() && (
          <div className="mx-auto mb-4 flex max-w-3xl items-start gap-2.5 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-800">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
            <span>
              You&apos;re viewing this in {getInAppBrowserName() ?? 'an in-app'} browser. If uploading doesn&apos;t work, choose <strong>&quot;Open in Browser.&quot;</strong>
            </span>
          </div>
        )}

        <div className="mx-auto max-w-3xl">
          <div className="mb-6 text-center sm:mb-8">
            <h1 className="font-display text-2xl font-black text-slate-900 sm:text-3xl lg:text-4xl uppercase tracking-tight">
              Track Your Booking
            </h1>
            <p className="mt-1.5 text-xs text-slate-500 sm:mt-2 sm:text-sm">
              Search by reference code (SZ...) for one booking, or by email to see pending bookings.
            </p>
          </div>

          <form onSubmit={handleSearch} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Reference Code"
                placeholder="e.g. SZAB12CD"
                leftIcon={<Search className="h-4 w-4 text-slate-400" />}
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                hint="Optional if you provide email"
              />
              <Input
                label="Email"
                type="email"
                placeholder="your@email.com"
                leftIcon={<Mail className="h-4 w-4 text-slate-400" />}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                hint="Shows only bookings needing payment"
              />
            </div>
            <Button
              type="submit"
              size="lg"
              fullWidth
              className="mt-4 sm:w-auto bg-[#FF7A00] hover:bg-[#E56600] text-white font-bold"
              isLoading={loading}
              disabled={!canSearch}
              leftIcon={<Search className="h-5 w-5" />}
            >
              Search Booking
            </Button>
            {!canSearch && (
              <p className="mt-2 text-[11px] text-slate-400">
                Enter a reference code or email to enable search.
              </p>
            )}
          </form>

          {error && (
            <div className="mt-4 flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700 font-semibold">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {loading && <LoadingSpinner className="py-12" />}

          {!loading && summaries.length > 0 && (
            <div className="mt-6 space-y-3 sm:mt-8">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 sm:text-base">
                    Bookings Needing Action ({summaries.length})
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Confirmed bookings won&apos;t appear here. Use your reference code to view them.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSummaries([]);
                    setEmail('');
                  }}
                  className="shrink-0 text-[11px] font-bold text-slate-500 underline hover:text-slate-800"
                >
                  Clear
                </button>
              </div>

              {summaries.map((s) => (
                <motion.button
                  key={s.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => handleSummaryClick(s)}
                  className="w-full cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-xs transition hover:border-[#FF7A00]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-mono text-sm font-black text-[#3D1164]">
                        {s.reference_code}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-600 font-medium">
                        {s.court_name} · {formatDateLong(s.date)}
                        {s.start_time && s.end_time && (
                          <> · {formatTimeRange(s.start_time, s.end_time)}</>
                        )}
                      </p>
                    </div>
                    <StatusBadge status={s.status} />
                  </div>
                  <p className="mt-2 text-[11px] font-semibold text-[#FF7A00]">
                    Booked {formatDateTime(s.created_at)} · {formatCurrency(s.total_amount)}
                  </p>
                </motion.button>
              ))}
            </div>
          )}

          <AnimatePresence>
            {booking && !loading && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-6 space-y-4 sm:mt-8 sm:space-y-6"
              >
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Reference Code
                      </p>
                      <p className="font-mono text-xl font-black text-[#3D1164] sm:text-2xl">
                        {booking.reference_code}
                      </p>
                    </div>
                    <StatusBadge status={booking.status} size="md" />
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 sm:gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-[#3D1164]">
                        <MapPin className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Court</p>
                        <p className="text-sm font-bold text-slate-900 sm:text-base">{displayCourtNames}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#FF7A00]">
                        <Calendar className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Date</p>
                        <p className="text-sm font-bold text-slate-900 sm:text-base">{formatDateLong(booking.date)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Time Slots</p>
                    <div className="space-y-2">
                      {groupedSlots.map((group, idx) => (
                        <div key={idx} className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
                          <p className="mb-1 text-xs font-bold text-slate-900">{group.courtName}</p>
                          <div className="space-y-1">
                            {group.times.map((t, i) => (
                              <div key={i} className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                                <Clock className="h-3.5 w-3.5 text-slate-400" />
                                <span>{formatTimeRange(t.start_time, t.end_time)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-slate-200 pt-4">
                    <span className="text-xs font-semibold text-slate-500 sm:text-sm">Total Amount</span>
                    <span className="font-display text-2xl font-black text-[#FF7A00]">
                      {formatCurrency(booking.total_amount)}
                    </span>
                  </div>
                </div>

                {/* Customer Details */}
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="mb-3.5 font-display text-base font-bold text-slate-900">
                    Customer Details
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="flex items-center gap-2 text-xs sm:text-sm">
                      <User className="h-4 w-4 shrink-0 text-slate-400" />
                      <span className="text-slate-500">Name:</span>
                      <span className="truncate font-semibold text-slate-900">{booking.customer.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs sm:text-sm">
                      <Mail className="h-4 w-4 shrink-0 text-slate-400" />
                      <span className="text-slate-500">Email:</span>
                      <span className="truncate font-semibold text-slate-900">{booking.customer.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs sm:text-sm">
                      <Phone className="h-4 w-4 shrink-0 text-slate-400" />
                      <span className="text-slate-500">Phone:</span>
                      <span className="font-semibold text-slate-900">{booking.customer.phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs sm:text-sm">
                      <Calendar className="h-4 w-4 shrink-0 text-slate-400" />
                      <span className="text-slate-500">Booked:</span>
                      <span className="font-semibold text-slate-900">{formatDateTime(booking.created_at)}</span>
                    </div>
                  </div>
                  {booking.customer.notes && (
                    <div className="mt-3.5 rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-600 leading-relaxed">
                      <span className="font-bold text-slate-800">Notes: </span>
                      {booking.customer.notes}
                    </div>
                  )}
                </div>

                {/* Payment Upload Section if pending */}
                {canUploadPayment && !hasPaymentScreenshot && (
                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h3 className="mb-2 flex items-center gap-2 font-display text-base font-bold text-slate-900">
                      <Wallet className="h-5 w-5 text-[#FF7A00]" />
                      Complete Payment
                    </h3>
                    <p className="mb-3.5 text-xs text-slate-500 sm:text-sm">
                      Send {formatCurrency(booking.total_amount)} to our account{' '}
                      <span className="font-bold text-slate-900">{displayNumber}</span> and
                      upload your receipt below.
                    </p>

                    {uploadSuccess ? (
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center text-xs font-bold text-emerald-800 sm:text-sm">
                        Payment screenshot uploaded! Your booking is being reviewed.
                      </div>
                    ) : (
                      <>
                        <div
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            const file = e.dataTransfer.files[0];
                            if (file) handleFile(file);
                          }}
                          className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/50 p-5 text-center transition-all hover:bg-slate-50 sm:p-6"
                        >
                          {screenshot ? (
                            <div className="space-y-2">
                              <img
                                src={screenshot}
                                alt="Screenshot"
                                className="mx-auto max-h-40 rounded-xl object-contain border border-slate-200 bg-white"
                              />
                              <button
                                onClick={() => setScreenshot(null)}
                                className="text-xs font-semibold text-slate-500 underline hover:text-rose-600 transition"
                              >
                                Change image
                              </button>
                            </div>
                          ) : (
                            <>
                              <ImageIcon className="mx-auto h-8 w-8 text-slate-400" />
                              <p className="mt-2 text-xs text-slate-600">
                                Drag receipt screenshot or{' '}
                                <label className="cursor-pointer font-bold text-[#FF7A00] underline">
                                  browse
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) handleFile(file);
                                    }}
                                  />
                                </label>
                              </p>
                            </>
                          )}
                        </div>

                        {screenshot && (
                          <>
                            <div className="mt-3.5">
                              <input
                                type="text"
                                value={paymentRef}
                                onChange={(e) => setPaymentRef(e.target.value)}
                                placeholder="Payment reference number"
                                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 placeholder-slate-400 focus:border-[#3D1164] focus:outline-none focus:ring-2 focus:ring-[#3D1164]/20"
                              />
                            </div>
                            <Button
                              className="mt-3.5 bg-[#FF7A00] hover:bg-[#E56600] text-white font-bold"
                              fullWidth
                              isLoading={uploading}
                              disabled={!paymentRef.trim()}
                              onClick={handleUpload}
                              leftIcon={<Upload className="h-4 w-4" />}
                            >
                              Upload Payment
                            </Button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Screenshot Verified Badge */}
                {hasPaymentScreenshot && (
                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h3 className="mb-2 flex items-center gap-2 font-display text-base font-bold text-slate-900">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      Payment Screenshot
                    </h3>
                    <p className="mb-3.5 text-xs text-slate-500">
                      Your payment screenshot has been submitted and is currently being verified.
                    </p>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <img
                        src={booking.payment_screenshot_url || undefined}
                        alt="Payment Screenshot"
                        className="mx-auto max-h-64 rounded-xl object-contain"
                      />
                    </div>
                    {booking.payment_reference && (
                      <p className="mt-3 text-xs text-slate-600 font-medium">
                        Reference Number:{' '}
                        <span className="font-mono font-bold text-[#3D1164]">
                          {booking.payment_reference}
                        </span>
                      </p>
                    )}
                  </div>
                )}

                {/* Status Banners */}
                {booking.status === 'confirmed' && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center text-xs font-bold text-emerald-800 sm:text-sm">
                    Your booking is confirmed! See you at Smash Zone.
                  </div>
                )}
                {booking.status === 'completed' && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-100 p-4 text-center text-xs font-bold text-slate-700 sm:text-sm">
                    Thanks for playing with us at Smash Zone! See you next time.
                  </div>
                )}
                {booking.status === 'cancelled' && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-100 p-4 text-center text-xs font-bold text-slate-500 sm:text-sm">
                    This booking has been cancelled.
                  </div>
                )}
                {booking.status === 'rejected' && (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-center text-xs font-bold text-rose-700 sm:text-sm">
                    Your payment could not be verified. Please contact Smash Zone administration.
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <Footer />
    </div>
  );
}