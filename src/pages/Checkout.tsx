// src/pages/Checkout.tsx
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
import { isInAppBrowser, getInAppBrowserName } from '@/utils/browser';
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

  // ⭐ NEW — informational only; do NOT block existing pending payments
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
      <div className="min-h-screen bg-charcoal">
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
      setUploadError('Could not copy automatically. Please select and copy manually.');
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
      className="flex shrink-0 items-center gap-1.5 rounded-lg border border-neutral-600 bg-neutral-800 px-2.5 py-2 text-xs font-semibold text-cream-muted transition hover:border-primary-400 hover:text-primary-300 active:scale-95"
    >
      {copied === k ? (
        <>
          <CheckCircle2 className="h-4 w-4 text-accent-300" />
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
    <div className="min-h-screen bg-charcoal text-cream">
      <Navbar />

      <div className="container-page pt-24 pb-36 sm:pb-12">
        <Link
          to="/booking"
          className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-cream-muted transition hover:text-primary-300"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Booking
        </Link>

        <div className="mb-5">
          <h1 className="text-2xl font-bold tracking-tight text-cream sm:text-3xl">Checkout</h1>
          <p className="text-xs text-cream-muted sm:text-sm">
            Step 2 of 2: pay, then submit your reference number to secure your slot.
          </p>
        </div>

        <div className="grid gap-5 md:gap-6 lg:grid-cols-5">
          {/* Left column */}
          <div className="space-y-4 lg:col-span-3">
            {isInAppBrowser() && (
              <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-200">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                <span>
                  For easier payment and upload, tap <strong>⋯</strong> and choose{' '}
                  <strong>&quot;Open in Browser&quot;</strong>.
                </span>
              </div>
            )}

            {/* ⭐ NEW — informational banner for existing pending bookings */}
            {!bookingsEnabled && (
              <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-200">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                <span>
                  New bookings are closed, but your existing hold is still valid — pay before the
                  timer ends.
                </span>
              </div>
            )}

            {/* Payment Timer */}
            <div
              className={`card rounded-2xl border bg-neutral-900/80 p-4 shadow-xl backdrop-blur-sm ${
                isExpired ? 'border-error/80' : 'border-neutral-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                      isExpired ? 'bg-error/20 text-error' : 'bg-amber-500/20 text-amber-300'
                    }`}
                  >
                    <Clock className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-cream">
                      {isExpired ? 'Payment window expired' : 'Time left to submit payment'}
                    </p>
                    <p className="text-[11px] text-cream-muted">
                      Your slots are held for {HOLD_MINUTES} minutes
                    </p>
                  </div>
                </div>
                <div
                  role="timer"
                  className={`font-display text-2xl font-extrabold tabular-nums sm:text-3xl ${
                    isExpired
                      ? 'text-error'
                      : timeLeft < 120
                        ? 'text-amber-400 animate-pulse'
                        : 'text-primary-300'
                  }`}
                >
                  {formatCountdown(Math.max(timeLeft, 0))}
                </div>
              </div>
            </div>

            {/* Expired */}
            {isExpired && (
              <div className="rounded-2xl border border-error/50 bg-error/10 p-4 text-sm">
                <p className="font-bold text-error">Your reservation hold has ended.</p>
                <p className="mt-1 text-xs leading-relaxed text-cream-muted">
                  Don&apos;t pay twice if you already sent payment. Keep your code{' '}
                  <span className="font-mono font-bold text-primary-300">
                    {currentBooking.reference_code}
                  </span>{' '}
                  and{' '}
                  <Link to="/track" className="font-semibold text-primary-300 underline">
                    Track My Booking
                  </Link>
                  .
                </p>
                <Button size="sm" className="mt-3" onClick={releaseAndRestart}>
                  Start a new booking
                </Button>
              </div>
            )}

            {/* Payment Method Selector */}
            {hasMultipleMethods && (
              <div className="card rounded-2xl border border-neutral-700 bg-neutral-900/80 p-4 shadow-xl backdrop-blur-sm">
                <p className="mb-2.5 text-xs font-bold uppercase tracking-wider text-cream-muted">
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
                        className={`flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-semibold transition ${
                          isSelected
                            ? 'border-primary-400 bg-primary-500 text-white shadow-glow-blue'
                            : 'border-neutral-700 bg-neutral-950/60 text-cream-muted hover:border-primary-400/50 hover:text-cream'
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {method.name}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2.5 text-xs text-cream-muted">
                  Pick the one you&apos;ll pay with. Details below update to match.
                </p>
              </div>
            )}

            {/* No payment methods configured */}
            {enabledMethods.length === 0 && (
              <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-xs text-amber-200">
                Payment details are not available right now. Contact us with your code{' '}
                <span className="font-mono font-bold">{currentBooking.reference_code}</span> before
                sending any money.
              </div>
            )}

            {/* Payment Details */}
            {selectedMethod && (
              <div className="card space-y-3.5 rounded-2xl border border-neutral-700 bg-neutral-900/80 p-4 shadow-xl backdrop-blur-sm sm:p-5">
                <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary-300">
                  <IconComponent className="h-4 w-4" />
                  Step {1 + offset} · Pay via {methodName}
                </h2>

                {/* Amount box */}
                <div className="flex items-center justify-between gap-3 rounded-xl border border-primary-500/40 bg-primary-500/15 px-4 py-3">
                  <div>
                    <span className="text-xs font-medium text-cream-muted">
                      Exact amount to send
                    </span>
                    <p className="font-display text-xl font-extrabold text-accent-400">
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
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-neutral-700 bg-neutral-950/70 p-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-cream-muted">
                        Send to account
                      </p>
                      <p className="break-all font-display text-base font-bold tracking-wide text-cream">
                        {displayNumber}
                      </p>
                      {displayAccountName && (
                        <p className="text-xs font-medium text-primary-200">
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

                {!displayNumber && displayAccountName && (
                  <div className="rounded-xl border border-neutral-700 bg-neutral-950/70 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-cream-muted">
                      Account name
                    </p>
                    <p className="font-display text-base font-bold text-cream">
                      {displayAccountName}
                    </p>
                  </div>
                )}

                {selectedMethod.config?.qr_image_url && (
                  <div className="flex justify-center py-1">
                    <div className="rounded-2xl border border-neutral-700 bg-neutral-950/90 p-4 text-center shadow-lg">
                      <img
                        src={selectedMethod.config.qr_image_url}
                        alt={`${methodName} payment QR code`}
                        className="mx-auto h-40 w-40 rounded-lg object-contain"
                      />
                      <p className="mt-2 text-xs font-medium text-cream-muted">
                        Scan with any banking or e-wallet app
                      </p>
                    </div>
                  </div>
                )}

                {/* Booking code */}
                <div className="rounded-xl border border-neutral-700 bg-neutral-950/70 px-3.5 py-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <span className="text-xs text-cream-muted">Your booking code</span>
                      <p className="font-mono text-sm font-bold text-primary-300">
                        {currentBooking.reference_code}
                      </p>
                    </div>
                    <CopyButton
                      k="ref"
                      label="Copy booking code"
                      onClick={() => copyText(currentBooking.reference_code, 'ref')}
                    />
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-cream-muted">
                    Use this at{' '}
                    <Link to="/track" className="font-semibold text-primary-300 underline">
                      Track My Booking
                    </Link>
                    . It is <strong className="text-cream">not</strong> your payment reference.
                  </p>
                </div>

                {/* How to pay */}
                <details className="group rounded-xl border border-neutral-700 bg-neutral-950/70 p-3.5 text-xs text-cream-muted">
                  <summary className="flex cursor-pointer list-none items-center justify-between text-[13px] font-semibold text-cream">
                    <span>How to pay</span>
                    <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
                  </summary>
                  <ol className="mt-3 list-inside list-decimal space-y-1.5 leading-relaxed">
                    <li>
                      Open <strong className="text-cream">{methodName}</strong> and choose{' '}
                      <strong className="text-cream">Send Money</strong> or{' '}
                      <strong className="text-cream">Scan QR</strong>.
                    </li>
                    <li>
                      Send the <strong className="text-cream">exact amount</strong> to the account
                      above
                      {displayAccountName ? (
                        <>
                          {' '}
                          (name: <strong className="text-cream">{displayAccountName}</strong>)
                        </>
                      ) : null}
                      .
                    </li>
                    <li>
                      Copy the <strong className="text-cream">reference number</strong> from your
                      receipt.
                    </li>
                    <li>
                      Paste it below, attach a screenshot (optional), and tap{' '}
                      <strong className="text-cream">Submit payment</strong>.
                    </li>
                  </ol>
                  <p className="mt-3 border-t border-neutral-700 pt-2.5 leading-relaxed">
                    These account details belong to Smash Point. If anything looks different,
                    contact us before sending money.
                  </p>
                </details>

                {selectedMethod.config?.instructions && (
                  <details className="group rounded-xl border border-neutral-800 bg-neutral-950/50 p-3 text-xs text-cream-muted">
                    <summary className="flex cursor-pointer list-none items-center justify-between font-semibold text-cream">
                      <span>Additional instructions</span>
                      <ChevronDown className="h-3.5 w-3.5 text-cream-muted transition group-open:rotate-180" />
                    </summary>
                    <p className="mt-2 whitespace-pre-wrap leading-relaxed">
                      {selectedMethod.config.instructions}
                    </p>
                  </details>
                )}
              </div>
            )}

            {/* Reference Number Input */}
            <div className="card rounded-2xl border border-neutral-700 bg-neutral-900/80 p-4 shadow-xl backdrop-blur-sm sm:p-5">
              <label
                htmlFor="paymentRef"
                className="mb-2 block text-xs font-bold uppercase tracking-wider text-primary-300"
              >
                Step {2 + offset} · Payment reference number{' '}
                <span className="text-error">*</span>
              </label>

              <input
                id="paymentRef"
                type="text"
                inputMode="text"
                autoComplete="off"
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
                placeholder="e.g. 1234 5678 9012"
                className="w-full rounded-xl border border-neutral-700 bg-neutral-950/60 px-4 py-3 text-sm text-cream placeholder-cream-muted/40 transition-all focus:border-primary-400 focus:bg-neutral-900/60 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
              <p className="mt-1.5 text-xs text-cream-muted">
                Find it on the receipt shown after you send the money.
              </p>

              {uploadError && uploadError.includes('Reference number') && (
                <div className="mt-2.5 flex items-center gap-1.5 rounded-xl border border-error/30 bg-error/10 p-2.5 text-xs font-medium text-error">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {uploadError}
                </div>
              )}
            </div>

            {/* Screenshot Upload */}
            <div className="card rounded-2xl border border-neutral-700 bg-neutral-900/80 p-4 shadow-xl backdrop-blur-sm sm:p-5">
              <h2 className="mb-2.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary-300">
                <Upload className="h-3.5 w-3.5" />
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
                className={`rounded-xl border-2 border-dashed p-4 text-center transition-all ${
                  dragOver
                    ? 'border-primary-400 bg-primary-500/10'
                    : screenshot
                      ? 'border-accent-500/60 bg-accent-500/10'
                      : 'border-neutral-700 hover:border-primary-400/50 hover:bg-neutral-950/40'
                }`}
              >
                {screenshot ? (
                  <div className="flex items-center gap-3.5">
                    <img
                      src={screenshot}
                      alt="Payment screenshot"
                      className="h-16 w-16 rounded-lg border border-neutral-700 bg-neutral-950 object-contain"
                    />
                    <div className="flex-1 text-left">
                      <p className="text-xs font-bold text-accent-300">Receipt attached ✓</p>
                      <button
                        onClick={() => setScreenshot(null)}
                        className="mt-1 text-xs text-cream-muted underline transition hover:text-error"
                      >
                        Remove file
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-2">
                    <ImageIcon className="h-8 w-8 text-cream-muted/40" />
                    <p className="mt-1 text-xs text-cream-muted">
                      <span className="hidden sm:inline">Drag your receipt here or </span>
                      <span className="sm:hidden">Attach your receipt</span>
                    </p>
                    <label className="mt-2.5 inline-block cursor-pointer rounded-xl focus-within:ring-2 focus-within:ring-primary-400">
                      <span className="block rounded-xl border border-primary-400/40 bg-primary-500/20 px-4 py-2 text-xs font-semibold text-primary-300 transition hover:bg-primary-500 hover:text-white">
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
                <div className="mt-2.5 flex items-center gap-1.5 rounded-xl border border-error/30 bg-error/10 p-2.5 text-xs font-medium text-error">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {uploadError}
                </div>
              )}

              {/* Terms agreement checkbox */}
              <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-neutral-700 bg-neutral-950/70 p-3.5">
                <input
                  type="checkbox"
                  id="agree-terms"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-neutral-600 bg-neutral-900 text-primary-500 accent-primary-500 focus:ring-2 focus:ring-primary-500/40"
                />
                <label
                  htmlFor="agree-terms"
                  className="cursor-pointer text-xs leading-relaxed text-cream-muted"
                >
                  <span className="inline-flex items-center gap-1 font-semibold text-cream">
                    <ShieldCheck className="h-3.5 w-3.5 text-primary-300" />
                    I agree to the
                  </span>{' '}
                  <Link
                    to="/terms"
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-primary-300 underline"
                  >
                    Terms
                  </Link>
                  ,{' '}
                  <Link
                    to="/privacy"
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-primary-300 underline"
                  >
                    Privacy Policy
                  </Link>
                  , and{' '}
                  <Link
                    to="/refund-policy"
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-primary-300 underline"
                  >
                    No Refund Policy
                  </Link>
                  . All bookings are final.
                </label>
              </div>

              <Button
                size="lg"
                fullWidth
                className="mt-4 hidden sm:flex"
                isLoading={uploading}
                disabled={!canSubmit}
                onClick={handleUpload}
                leftIcon={<CheckCircle2 className="h-4 w-4" />}
              >
                Submit payment
              </Button>

              {submitHint && (
                <p
                  className={`mt-2.5 hidden text-center text-xs sm:block ${
                    isExpired ? 'font-semibold text-error' : 'text-cream-muted'
                  }`}
                >
                  {submitHint}
                </p>
              )}
            </div>
          </div>

          {/* Right sidebar */}
          <div className="lg:col-span-2">
            <div className="card sticky top-24 rounded-2xl border border-neutral-700 bg-neutral-900/90 p-4 shadow-xl sm:p-5">
              <button
                onClick={() => setShowDetails(!showDetails)}
                aria-expanded={showDetails}
                className="flex w-full items-center justify-between lg:hidden"
              >
                <h2 className="font-display text-base font-bold text-cream">Order Summary</h2>
                <div className="flex items-center gap-2 text-cream-muted">
                  <span className="text-sm font-bold text-accent-400">
                    {formatCurrency(currentBooking.total_amount)}
                  </span>
                  {showDetails ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </button>

              <h2 className="hidden font-display text-base font-bold text-cream lg:block">
                Order Summary
              </h2>

              <div className={`mt-3.5 space-y-3 ${showDetails ? 'block' : 'hidden lg:block'}`}>
                <div className="space-y-1.5 rounded-xl border border-neutral-700 bg-neutral-950/60 p-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-cream-muted">Court</span>
                    <span className="font-semibold text-cream">{currentBooking.court_name}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-cream-muted">Date</span>
                    <span className="font-semibold text-cream">
                      {formatDateLong(currentBooking.date)}
                    </span>
                  </div>
                  {selectedMethod && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-cream-muted">Payment</span>
                      <span className="font-semibold text-primary-300">{methodName}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-cream-muted">
                    Time slots
                  </p>
                  {currentBooking.slots.map((slot) => (
                    <div
                      key={slot.id}
                      className="flex items-center justify-between rounded-lg bg-neutral-800/70 px-3 py-2 text-xs"
                    >
                      <span className="text-cream">
                        {formatTimeRange(slot.start_time, slot.end_time)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-neutral-700 pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-cream-muted">Total due</span>
                    <span className="font-display text-2xl font-extrabold text-accent-400">
                      {formatCurrency(currentBooking.total_amount)}
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-3 text-xs">
                  <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-cream-muted">
                    Booker
                  </p>
                  <p className="font-semibold text-cream">{currentBooking.customer.name}</p>
                  <p className="text-[11px] text-cream-muted">{currentBooking.customer.email}</p>
                </div>

                {/* Legal links quick access */}
                <div className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-3 text-xs">
                  <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-cream-muted">
                    Policies
                  </p>
                  <div className="flex flex-wrap gap-x-3 gap-y-1">
                    <Link
                      to="/terms"
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary-300 underline hover:text-primary-200"
                    >
                      Terms
                    </Link>
                    <Link
                      to="/privacy"
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary-300 underline hover:text-primary-200"
                    >
                      Privacy
                    </Link>
                    <Link
                      to="/refund-policy"
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary-300 underline hover:text-primary-200"
                    >
                      Refunds
                    </Link>
                    <Link
                      to="/payment-policy"
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary-300 underline hover:text-primary-200"
                    >
                      Payments
                    </Link>
                  </div>
                </div>

                {!confirmRelease ? (
                  <button
                    onClick={() => setConfirmRelease(true)}
                    className="mt-1 w-full text-center text-xs text-cream-muted underline transition hover:text-error"
                  >
                    Start over and release these slots
                  </button>
                ) : (
                  <div className="rounded-xl border border-error/40 bg-error/10 p-3 text-xs">
                    <p className="font-semibold text-error">Release these slots?</p>
                    <p className="mt-1 text-cream-muted">
                      Only if you have <strong className="text-cream">not</strong> paid yet.
                    </p>
                    <div className="mt-2.5 flex gap-2">
                      <button
                        onClick={releaseAndRestart}
                        className="flex-1 rounded-lg bg-error px-3 py-2 font-semibold text-white"
                      >
                        Yes, release
                      </button>
                      <button
                        onClick={() => setConfirmRelease(false)}
                        className="flex-1 rounded-lg border border-neutral-600 px-3 py-2 font-semibold text-cream-muted"
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

      {/* Sticky mobile bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-600 bg-charcoal/95 p-3.5 backdrop-blur-md sm:hidden">
        {uploadError && (
          <p className="mb-2 rounded-lg border border-error/30 bg-error/10 p-2 text-xs font-medium text-error">
            {uploadError}
          </p>
        )}
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-cream-muted">{submitHint ?? `via ${methodName}`}</p>
            <p className="text-sm font-bold text-accent-400">
              {formatCurrency(currentBooking.total_amount)}
            </p>
          </div>
          <Button
            size="md"
            isLoading={uploading}
            disabled={!canSubmit}
            onClick={handleUpload}
            leftIcon={<CheckCircle2 className="h-4 w-4" />}
            className="shrink-0"
          >
            Submit
          </Button>
        </div>
      </div>

      <Footer />
    </div>
  );
}