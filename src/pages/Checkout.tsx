import { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Wallet,
  Clock,
  Upload,
  AlertCircle,
  CheckCircle2,
  Copy,
  ImageIcon,
  ChevronDown,
  ChevronUp,
  Smartphone,
  QrCode,
  Banknote,
  CreditCard,
  Building2,
  ShieldCheck,
} from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useBookingStore } from '@/stores/bookingStore';
import { useClientStore } from '@/stores/clientStore';
import { bookingService } from '@/services/bookingService';
import {
  formatTimeRange,
  formatCurrency,
  formatDateLong,
  formatCountdown,
} from '@/utils/format';
import { APP_CONFIG } from '@/utils/constants';
import { isInAppBrowser } from '@/utils/browser';
import type { PaymentMethod } from '@/types';

const ICON_MAP: Record<string, any> = {
  Smartphone,
  QrCode,
  Banknote,
  CreditCard,
  Wallet,
  Building2,
};

const HOLD_MINUTES = Math.round(APP_CONFIG.paymentTimerSeconds / 60);

type CopyKey = 'account' | 'amount' | 'ref';

export function Checkout() {
  const navigate = useNavigate();
  const { currentBooking, reset } = useBookingStore();
  const settings = useClientStore((state) => state.settings);
  const loadSettings = useClientStore((state) => state.loadSettings);

  const bookingsEnabled = useClientStore(
    (state) => state.settings?.bookings_enabled ?? true
  );

  const paymentMethods = settings?.payment_methods ?? [];
  const [restoring, setRestoring] = useState(true);

  const [timeLeft, setTimeLeft] = useState<number>(() => {
    if (!currentBooking?.payment_expires_at) {
      return APP_CONFIG.paymentTimerSeconds;
    }
    const expiresAt = new Date(currentBooking.payment_expires_at).getTime();
    const secondsLeft = Math.floor((expiresAt - Date.now()) / 1000);
    return Math.max(0, secondsLeft);
  });

  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [paymentRef, setPaymentRef] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [copied, setCopied] = useState<CopyKey | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [confirmRelease, setConfirmRelease] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (currentBooking) {
      setRestoring(false);
      return;
    }

    const savedRef = localStorage.getItem('pendingBookingRef');
    if (!savedRef) {
      setRestoring(false);
      navigate('/booking');
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const booking = await bookingService.trackBooking(savedRef);
        if (cancelled) return;

        if (booking.status !== 'pending_payment') {
          localStorage.removeItem('pendingBookingRef');
          setRestoring(false);
          navigate('/booking');
          return;
        }

        useBookingStore.setState({ currentBooking: booking });
        setRestoring(false);
      } catch (err) {
        if (cancelled) return;
        console.error('Failed to restore pending booking:', err);
        localStorage.removeItem('pendingBookingRef');
        setRestoring(false);
        navigate('/booking');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentBooking, navigate]);

  useEffect(() => {
    if (currentBooking?.status === 'expired') {
      localStorage.removeItem('pendingBookingRef');
      navigate('/booking');
    }
  }, [currentBooking?.status, navigate]);

  useEffect(() => {
    if (!currentBooking?.payment_expires_at) {
      if (timeLeft <= 0) return;
      const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
      return () => clearInterval(timer);
    }

    const tick = () => {
      const expiresAt = new Date(currentBooking.payment_expires_at!).getTime();
      const secondsLeft = Math.floor((expiresAt - Date.now()) / 1000);
      setTimeLeft(Math.max(0, secondsLeft));
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [currentBooking?.payment_expires_at]);

  const enabledMethods = useMemo(
    () => paymentMethods.filter((m: PaymentMethod) => m.enabled),
    [paymentMethods]
  );

  useEffect(() => {
    if (enabledMethods.length > 0 && !selectedMethod) {
      setSelectedMethod(enabledMethods[0]);
    }
  }, [enabledMethods, selectedMethod]);

  if (restoring && !currentBooking) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <Navbar />
        <LoadingSpinner className="pt-32" />
        <Footer />
      </div>
    );
  }

  if (!currentBooking) {
    return null;
  }

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setUploadError('Please upload an image file (PNG, JPG)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image must be under 5MB');
      return;
    }
    setUploadError(null);
    const reader = new FileReader();
    reader.onload = () => setScreenshot(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (uploading) return;
    if (!paymentRef.trim()) {
      setUploadError('Reference number is required');
      return;
    }
    if (!agreedToTerms) {
      setUploadError('Please agree to the Terms to continue.');
      return;
    }

    setUploading(true);
    setUploadError(null);
    try {
      await bookingService.uploadPayment(
        currentBooking.id,
        screenshot,
        paymentRef.trim(),
        selectedMethod?.name
      );
      localStorage.removeItem('pendingBookingRef');
      window.dispatchEvent(new Event('pendingBookingUpdated'));
      navigate('/success');
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const copyText = async (text: string, key: CopyKey) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 2000);
    } catch {
      setUploadError('Could not copy automatically. Please copy manually.');
    }
  };

  const releaseAndRestart = () => {
    localStorage.removeItem('pendingBookingRef');
    window.dispatchEvent(new Event('pendingBookingUpdated'));
    reset();
    navigate('/');
  };

  const isExpired = timeLeft <= 0;
  const canSubmit = !!paymentRef.trim() && !isExpired && agreedToTerms;

  const displayNumber = selectedMethod?.config?.account_number || '';
  const displayAccountName = selectedMethod?.config?.account_name || '';
  const methodName = selectedMethod?.name || 'Payment Method';
  const methodIcon = selectedMethod?.icon || 'Smartphone';
  const IconComponent = ICON_MAP[methodIcon] || Smartphone;

  const hasMultipleMethods = enabledMethods.length > 1;
  const offset = hasMultipleMethods ? 1 : 0;

  const submitHint = isExpired
    ? 'Time expired. Start over to book again.'
    : !paymentRef.trim()
      ? 'Enter your payment reference number to continue.'
      : !agreedToTerms
        ? 'Please agree to the Terms to continue.'
        : null;

  const CopyButton = ({
    k,
    onClick,
    label,
  }: {
    k: CopyKey;
    onClick: () => void;
    label: string;
  }) => (
    <button
      onClick={onClick}
      aria-label={label}
      className="flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-xs transition hover:border-[#FF7A00] hover:text-[#FF7A00] active:scale-95"
    >
      {copied === k ? (
        <>
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          Copied
        </>
      ) : (
        <>
          <Copy className="h-4 w-4" />
          Copy
        </>
      )}
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />

      <div className="container-page pt-24 pb-36 sm:pb-16">
        <Link
          to="/booking"
          className="mb-4 inline-flex items-center gap-1.5 text-xs font-bold text-[#FF7A00] transition hover:text-[#E56600]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Booking
        </Link>

        <div className="mb-5">
          <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Checkout</h1>
          <p className="text-xs text-slate-500 sm:text-sm">
            Step 2 of 2: pay, then submit your reference number to secure your court.
          </p>
        </div>

        <div className="grid gap-5 md:gap-6 lg:grid-cols-5">
          {/* Main Action Side */}
          <div className="space-y-4 lg:col-span-3">
            {isInAppBrowser() && (
              <div className="flex items-start gap-2.5 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-800">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <span>
                  For easier payment and upload, tap <strong>⋯</strong> and choose{' '}
                  <strong>&quot;Open in Browser&quot;</strong>.
                </span>
              </div>
            )}

            {!bookingsEnabled && (
              <div className="flex items-start gap-2.5 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-800">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <span>
                  New bookings are closed, but your existing hold is still valid — pay before the
                  timer ends.
                </span>
              </div>
            )}

            {/* Timer Card */}
            <div
              className={`rounded-3xl border bg-white p-5 shadow-sm ${
                isExpired ? 'border-rose-300' : 'border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
                      isExpired ? 'bg-rose-100 text-rose-700' : 'bg-orange-100 text-[#FF7A00]'
                    }`}
                  >
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">
                      {isExpired ? 'Payment window expired' : 'Time left to submit payment'}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Slots held for {HOLD_MINUTES} minutes
                    </p>
                  </div>
                </div>
                <div
                  role="timer"
                  className={`font-display text-2xl font-black tabular-nums sm:text-3xl ${
                    isExpired
                      ? 'text-rose-600'
                      : timeLeft < 120
                        ? 'text-rose-500 animate-pulse'
                        : 'text-[#3D1164]'
                  }`}
                >
                  {formatCountdown(Math.max(timeLeft, 0))}
                </div>
              </div>
            </div>

            {isExpired && (
              <div className="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-sm">
                <p className="font-bold text-rose-800">Your reservation hold has ended.</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  Don&apos;t pay twice if you already sent payment. Keep your code{' '}
                  <span className="font-mono font-bold text-[#3D1164]">
                    {currentBooking.reference_code}
                  </span>{' '}
                  and check{' '}
                  <Link to="/track" className="font-bold text-[#FF7A00] underline">
                    Track My Booking
                  </Link>
                  .
                </p>
                <Button size="sm" className="mt-3 bg-[#FF7A00] text-white" onClick={releaseAndRestart}>
                  Start a new booking
                </Button>
              </div>
            )}

            {/* Payment Method Selector */}
            {hasMultipleMethods && (
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Step 1 · Choose payment method
                </p>
                <div
                  className="flex flex-wrap gap-2"
                  role="radiogroup"
                  aria-label="Payment method"
                >
                  {enabledMethods.map((method: PaymentMethod) => {
                    const Icon = ICON_MAP[method.icon] || Smartphone;
                    const isSelected = selectedMethod?.id === method.id;
                    return (
                      <button
                        key={method.id}
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() => setSelectedMethod(method)}
                        className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-bold transition ${
                          isSelected
                            ? 'border-[#3D1164] bg-[#3D1164] text-white shadow-xs'
                            : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {method.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Payment Details Card */}
            {selectedMethod && (
              <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#3D1164]">
                  <IconComponent className="h-4 w-4 text-[#FF7A00]" />
                  Step {1 + offset} · Pay via {methodName}
                </h2>

                <div className="flex items-center justify-between gap-3 rounded-2xl border border-purple-200 bg-purple-50/70 px-4 py-3.5">
                  <div>
                    <span className="text-xs font-semibold text-slate-500">
                      Exact amount to send
                    </span>
                    <p className="font-display text-2xl font-black text-[#FF7A00]">
                      {formatCurrency(currentBooking.total_amount)}
                    </p>
                  </div>
                  <CopyButton
                    k="amount"
                    label="Copy exact amount"
                    onClick={() => copyText(String(currentBooking.total_amount), 'amount')}
                  />
                </div>

                {displayNumber && (
                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Send to account
                      </p>
                      <p className="break-all font-display text-lg font-black tracking-wide text-slate-900">
                        {displayNumber}
                      </p>
                      {displayAccountName && (
                        <p className="text-xs font-bold text-[#3D1164]">
                          {displayAccountName}
                        </p>
                      )}
                    </div>
                    <CopyButton
                      k="account"
                      label="Copy account number"
                      onClick={() => copyText(displayNumber.replace(/\s/g, ''), 'account')}
                    />
                  </div>
                )}

                {selectedMethod.config?.qr_image_url && (
                  <div className="flex justify-center py-2">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-md">
                      <img
                        src={selectedMethod.config.qr_image_url}
                        alt={`${methodName} QR code`}
                        className="mx-auto h-44 w-44 rounded-xl object-contain"
                      />
                      <p className="mt-2 text-xs font-bold text-slate-600">
                        Scan with GCash or any QR Ph app
                      </p>
                    </div>
                  </div>
                )}

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-semibold text-slate-500">Your booking code</span>
                      <p className="font-mono text-base font-black text-[#3D1164]">
                        {currentBooking.reference_code}
                      </p>
                    </div>
                    <CopyButton
                      k="ref"
                      label="Copy booking code"
                      onClick={() => copyText(currentBooking.reference_code, 'ref')}
                    />
                  </div>
                </div>

                <details className="group rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
                  <summary className="flex cursor-pointer list-none items-center justify-between font-bold text-slate-800">
                    <span>How to pay</span>
                    <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
                  </summary>
                  <ol className="mt-3 list-inside list-decimal space-y-1.5 leading-relaxed">
                    <li>Open <strong>{methodName}</strong> and select <strong>Send Money</strong> or <strong>Scan QR</strong>.</li>
                    <li>Send the <strong>exact amount</strong> to the account number above.</li>
                    <li>Copy the <strong>Reference No.</strong> from your transaction receipt.</li>
                    <li>Paste it below and tap <strong>Submit payment</strong>.</li>
                  </ol>
                  <p className="mt-3 border-t border-slate-200 pt-2 text-slate-500 font-medium">
                    These account details belong to <strong>Smash Zone by Jerjen</strong>. Verify before sending.
                  </p>
                </details>
              </div>
            )}

            {/* Reference Input */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <label
                htmlFor="paymentRef"
                className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-800"
              >
                Step {2 + offset} · Payment reference number <span className="text-rose-500">*</span>
              </label>

              <input
                id="paymentRef"
                type="text"
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
                placeholder="e.g. 1234 5678 9012"
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 placeholder-slate-400 focus:border-[#3D1164] focus:outline-none focus:ring-2 focus:ring-[#3D1164]/20 shadow-xs"
              />
              <p className="mt-2 text-xs text-slate-500">
                Find it on your GCash/bank receipt after sending payment.
              </p>

              {uploadError && uploadError.includes('Reference number') && (
                <div className="mt-3 flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs font-semibold text-rose-700">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {uploadError}
                </div>
              )}
            </div>

            {/* Screenshot Upload */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="mb-2.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-800">
                <Upload className="h-4 w-4 text-[#FF7A00]" />
                Step {3 + offset} · Receipt screenshot (optional)
              </h2>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const file = e.dataTransfer.files[0];
                  if (file) handleFile(file);
                }}
                className={`rounded-2xl border-2 border-dashed p-5 text-center transition-all ${
                  dragOver
                    ? 'border-[#3D1164] bg-purple-50'
                    : screenshot
                      ? 'border-orange-300 bg-orange-50/50'
                      : 'border-slate-300 bg-slate-50/50 hover:bg-slate-50'
                }`}
              >
                {screenshot ? (
                  <div className="flex items-center gap-4">
                    <img
                      src={screenshot}
                      alt="Payment screenshot"
                      className="h-16 w-16 rounded-xl border border-slate-200 bg-white object-contain shadow-xs"
                    />
                    <div className="flex-1 text-left">
                      <p className="text-xs font-bold text-[#FF7A00]">Receipt attached ✓</p>
                      <button
                        onClick={() => setScreenshot(null)}
                        className="mt-1 text-xs font-semibold text-slate-500 underline hover:text-rose-600"
                      >
                        Remove file
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-2">
                    <ImageIcon className="h-8 w-8 text-slate-400" />
                    <p className="mt-1 text-xs text-slate-600 font-medium">
                      Drag receipt here or browse from device
                    </p>
                    <label className="mt-3 inline-block cursor-pointer">
                      <span className="block rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-800 shadow-xs hover:bg-slate-50">
                        Browse files
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFile(file);
                        }}
                      />
                    </label>
                  </div>
                )}
              </div>

              {uploadError && !uploadError.includes('Reference number') && (
                <div className="mt-3 flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs font-semibold text-rose-700">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {uploadError}
                </div>
              )}

              {/* Policy checkbox */}
              <div className="mt-4 flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <input
                  type="checkbox"
                  id="agree-terms"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 accent-[#FF7A00] focus:ring-2 focus:ring-[#FF7A00]/40"
                />
                <label
                  htmlFor="agree-terms"
                  className="cursor-pointer text-xs leading-relaxed text-slate-700"
                >
                  <span className="inline-flex items-center gap-1 font-bold text-slate-900">
                    <ShieldCheck className="h-3.5 w-3.5 text-[#3D1164]" />
                    I agree to the
                  </span>{' '}
                  <Link to="/terms" target="_blank" className="font-bold text-[#3D1164] underline">
                    Terms
                  </Link>
                  ,{' '}
                  <Link to="/privacy" target="_blank" className="font-bold text-[#3D1164] underline">
                    Privacy Policy
                  </Link>
                  , and{' '}
                  <Link to="/refund-policy" target="_blank" className="font-bold text-[#3D1164] underline">
                    No Refund Policy
                  </Link>
                  . All bookings are final.
                </label>
              </div>

              <Button
                size="lg"
                fullWidth
                className="mt-5 hidden sm:flex bg-[#FF7A00] hover:bg-[#E56600] text-white font-black"
                isLoading={uploading}
                disabled={!canSubmit}
                onClick={handleUpload}
                leftIcon={<CheckCircle2 className="h-4 w-4" />}
              >
                Submit payment
              </Button>

              {submitHint && (
                <p className="mt-2.5 hidden text-center text-xs text-slate-500 font-medium sm:block">
                  {submitHint}
                </p>
              )}
            </div>
          </div>

          {/* Right Summary Column */}
          <div className="lg:col-span-2">
            <div className="sticky top-24 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <button
                onClick={() => setShowDetails(!showDetails)}
                aria-expanded={showDetails}
                className="flex w-full items-center justify-between lg:hidden"
              >
                <h2 className="font-display text-base font-black text-slate-900">Order Summary</h2>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-[#FF7A00]">
                    {formatCurrency(currentBooking.total_amount)}
                  </span>
                  {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </button>

              <h2 className="hidden font-display text-base font-black text-slate-900 lg:block">
                Order Summary
              </h2>

              <div className={`mt-4 space-y-3 ${showDetails ? 'block' : 'hidden lg:block'}`}>
                <div className="space-y-1.5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Court</span>
                    <span className="font-bold text-slate-900">{currentBooking.court_name}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Date</span>
                    <span className="font-bold text-slate-900">
                      {formatDateLong(currentBooking.date)}
                    </span>
                  </div>
                  {selectedMethod && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Payment</span>
                      <span className="font-bold text-[#3D1164]">{methodName}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Time slots
                  </p>
                  {currentBooking.slots.map((slot) => (
                    <div
                      key={slot.id}
                      className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs"
                    >
                      <span className="font-semibold text-slate-800">
                        {formatTimeRange(slot.start_time, slot.end_time)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-slate-200 pt-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Total due</span>
                    <span className="font-display text-2xl font-black text-[#FF7A00]">
                      {formatCurrency(currentBooking.total_amount)}
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-xs">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Booker
                  </p>
                  <p className="font-bold text-slate-900">{currentBooking.customer.name}</p>
                  <p className="text-[11px] text-slate-500">{currentBooking.customer.email}</p>
                </div>

                {!confirmRelease ? (
                  <button
                    onClick={() => setConfirmRelease(true)}
                    className="mt-2 w-full text-center text-xs font-semibold text-slate-400 underline hover:text-rose-600"
                  >
                    Start over and release these slots
                  </button>
                ) : (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs">
                    <p className="font-bold text-rose-800">Release these slots?</p>
                    <p className="mt-1 text-slate-600">Only if you have not sent payment yet.</p>
                    <div className="mt-2.5 flex gap-2">
                      <button
                        onClick={releaseAndRestart}
                        className="flex-1 rounded-xl bg-rose-600 px-3 py-2 font-bold text-white shadow-xs"
                      >
                        Yes, release
                      </button>
                      <button
                        onClick={() => setConfirmRelease(false)}
                        className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 font-bold text-slate-700 shadow-xs"
                      >
                        Keep booking
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-3.5 backdrop-blur-md sm:hidden shadow-lg">
        {uploadError && (
          <p className="mb-2 rounded-xl border border-rose-200 bg-rose-50 p-2 text-xs font-semibold text-rose-700">
            {uploadError}
          </p>
        )}
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-slate-500 truncate">{submitHint ?? `via ${methodName}`}</p>
            <p className="text-lg font-black text-[#FF7A00]">
              {formatCurrency(currentBooking.total_amount)}
            </p>
          </div>
          <Button
            size="md"
            isLoading={uploading}
            disabled={!canSubmit}
            onClick={handleUpload}
            leftIcon={<CheckCircle2 className="h-4 w-4" />}
            className="shrink-0 bg-[#FF7A00] hover:bg-[#E56600] text-white font-bold"
          >
            Submit
          </Button>
        </div>
      </div>

      <Footer />
    </div>
  );
}