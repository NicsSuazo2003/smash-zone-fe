// src/pages/Booking.tsx
import { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Clock,
  CalendarDays,
  ArrowRight,
  ArrowLeft,
  Pencil,
  User,
  Mail,
  Phone,
  Timer,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useBookingStore, getSelectedSlotItems, getSelectedTotal } from '@/stores/bookingStore';
import { useClientStore } from '@/stores/clientStore';
import { formatTimeRange, formatCurrency, formatDateLong } from '@/utils/format';
import { FIXED_SLOT, APP_CONFIG } from '@/utils/constants';
import type { CustomerDetails } from '@/types';

const normalizePhone = (value: string) =>
  value
    .replace(/[\s\-()]/g, '')
    .replace(/^\+?63/, '0');

const NOTES_MAX = 500;
const HOLD_MINUTES = Math.round(APP_CONFIG.paymentTimerSeconds / 60);

// ─── Blocklist: placeholder names that are obviously not real customers ───
const BLOCKED_NAMES_EXACT = [
  'juan dela cruz',
  'juan delacruz',
  'pedro dela cruz',
  'john doe',
  'jane doe',
  'john smith',
  'jane smith',
  'maria santos',
  'pedro reyes',
  'jose rizal',
  'test test',
  'admin admin',
  'user user',
  'asdf',
  'asdfgh',
  'qwerty',
  'aaa',
  'bbb',
  'xxx',
];

// ─── Blocklist: disposable / fake email services ───
const BLOCKED_EMAIL_DOMAINS = [
  'test.com',
  'example.com',
  'mailinator.com',
  'tempmail.com',
  'guerrillamail.com',
  '10minutemail.com',
  'yopmail.com',
  'sharklasers.com',
  'grr.la',
  'temp-mail.org',
  'throwawaymail.com',
  'dispostable.com',
  'getnada.com',
  'trashmail.com',
];

// ─── Blocklist: fake email local parts (regardless of domain) ───
const BLOCKED_EMAIL_LOCALPARTS = [
  'johndoe',
  'janedoe',
  'juandelacruz',
  'juan.delacruz',
  'admin',
  'test',
  'sample',
  'fake',
  'asdf',
  'qwerty',
  'aaa',
  'bbb',
  'xxx',
];

const isTestString = (val: string): boolean => {
  const lower = val.toLowerCase().trim();
  if (lower.length === 0) return true;

  // Substring blocklist (existing behavior)
  const blockedWords = ['test', 'sample', 'testing', 'admin', 'fake'];
  if (blockedWords.some((word) => lower.includes(word))) return true;

  // Exact placeholder names
  if (BLOCKED_NAMES_EXACT.includes(lower)) return true;

  // Repeated single character: "aaaa", "bbbb", "xxxx"
  if (/^(.)\1{2,}$/.test(lower.replace(/\s+/g, ''))) return true;

  // Keyboard mashes / sequential patterns
  if (/^(asdf|qwer|zxcv|1234|abcd)/i.test(lower)) return true;

  return false;
};

const isFakeEmail = (email: string): boolean => {
  if (!email || !email.includes('@')) return true;

  const parts = email.toLowerCase().trim().split('@');
  if (parts.length !== 2) return true;

  const localPart = parts[0];
  const domain = parts[1];

  if (!localPart || !domain) return true;

  // Blocked disposable email domains
  if (BLOCKED_EMAIL_DOMAINS.some((d) => domain === d || domain.endsWith('.' + d))) {
    return true;
  }

  // RFC-reserved TLDs (test-only, never real inbox)
  if (/\.(test|invalid|example|localhost)$/i.test(domain)) return true;

  // Blocked local parts (johndoe@*, test@*, etc.)
  if (BLOCKED_EMAIL_LOCALPARTS.includes(localPart)) return true;

  // Local part containing "test"/"sample"/"fake"/"admin" as whole word
  if (/\b(test|sample|fake|admin)\b/i.test(localPart)) return true;

  // Repeated single character local part: "aaaa@gmail.com", "xxxx@gmail.com"
  if (/^(.)\1{2,}$/.test(localPart)) return true;

  return false;
};

const customerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name is required')
    .max(80, 'Name is too long')
    .regex(/^[A-Za-zÀ-ÿ.'\-\s]+$/, "Name can only contain letters, spaces, and . ' -")
    .refine((v) => !isTestString(v), {
      message: 'Please enter your real full name (not a placeholder like "Juan Dela Cruz" or "test").',
    }),

  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'Email is required')
    .email('Enter a valid email address')
    .max(120, 'Email is too long')
    .refine((v) => !isFakeEmail(v), {
      message: 'Please use a real, active email address (not a disposable or placeholder inbox).',
    }),

  phone: z
    .string()
    .trim()
    .min(1, 'Mobile number is required')
    .transform(normalizePhone)
    .refine((v) => /^09\d{9}$/.test(v), {
      message: 'Enter a valid PH mobile number (e.g. 0917 123 4567)',
    })
    .refine((v) => !/^09(0{9}|1{9}|2{9}|3{9}|4{9}|5{9}|6{9}|7{9}|8{9}|9{9})$/.test(v), {
      message: 'Please enter a real mobile number.',
    }),

  notes: z.string().max(NOTES_MAX, 'Notes are too long').optional(),

  termsAccepted: z.boolean().refine((v) => v === true, {
    message: 'You must agree to the Terms & Privacy Policy to continue',
  }),
});

type CustomerForm = z.infer<typeof customerSchema>;

export function Booking() {
  const navigate = useNavigate();
  const formRef = useRef<HTMLDivElement>(null);

  const {
    courts,
    selectedDate,
    loadingCourts,
    error,
    loadCourts,
    setCustomer,
    createBooking,
    slots,
    refreshSlots,
  } = useBookingStore();

  const bookingsEnabled = useClientStore(
    (state) => state.settings?.bookings_enabled ?? true
  );

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CustomerForm>({
    resolver: zodResolver(customerSchema),
    mode: 'onBlur',
    defaultValues: {
      ...useBookingStore.getState().customer,
      termsAccepted: false,
    },
  });

  const notesLength = (watch('notes') ?? '').length;

  useEffect(() => {
    if (courts.length === 0) {
      loadCourts();
    }
  }, [courts.length, loadCourts]);

  const storeState = useBookingStore();
  const selectedSlots = getSelectedSlotItems(storeState);
  const total = getSelectedTotal(storeState);

  const getSelectedCourts = () => {
    const courtMap = new Map();
    const selectedTimeSlots = slots.filter((s) => storeState.selectedSlotIds.includes(s.id));
    selectedTimeSlots.forEach((slot) => {
      const court = courts.find((c) => c.id === slot.court_id);
      if (court && !courtMap.has(court.id)) {
        courtMap.set(court.id, court);
      }
    });
    return Array.from(courtMap.values());
  };

  const selectedCourts = getSelectedCourts();

  const getCourtForSlot = (slotId: string) => {
    const timeSlot = slots.find((s) => s.id === slotId);
    if (!timeSlot) return null;
    return courts.find((c) => c.id === timeSlot.court_id);
  };

  const onSubmit = async (data: CustomerForm) => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const isStillAvailable = await refreshSlots();
      if (!isStillAvailable) {
        setSubmitError(
          'Sorry, one of your selected slots was just booked by another customer. Please go back and select a different time.'
        );
        setSubmitting(false);
        return;
      }

      setCustomer({
        name: data.name,
        email: data.email,
        phone: data.phone,
        notes: data.notes,
      });
      await createBooking();

      const created = useBookingStore.getState().currentBooking;
      if (created?.reference_code) {
        localStorage.setItem('pendingBookingRef', created.reference_code);
        window.dispatchEvent(new Event('pendingBookingUpdated'));
      }

      navigate('/checkout');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to create booking');
    } finally {
      setSubmitting(false);
    }
  };

  const onInvalid = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSummaryButtonClick = () => {
    handleSubmit(onSubmit, onInvalid)();
  };

  if (!bookingsEnabled) {
    return (
      <div className="min-h-screen bg-charcoal">
        <Navbar />
        <div className="container-page flex flex-col items-center justify-center gap-4 pt-32 pb-24 text-center">
          <AlertCircle className="h-10 w-10 text-amber-400" />
          <div>
            <h1 className="text-lg font-bold text-cream">Online bookings are closed</h1>
            <p className="mt-1 text-sm text-cream-muted">
              Please check back soon or contact the venue directly. Existing bookings are unaffected.
            </p>
          </div>
          <Button size="md" to="/" leftIcon={<ArrowLeft className="h-4 w-4" />}>
            Back to Home
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  if (loadingCourts && courts.length === 0) {
    return (
      <div className="min-h-screen bg-charcoal">
        <Navbar />
        <LoadingSpinner className="pt-32" />
        <Footer />
      </div>
    );
  }

  if (selectedSlots.length === 0) {
    return (
      <div className="min-h-screen bg-charcoal">
        <Navbar />
        <div className="container-page flex flex-col items-center justify-center gap-4 pt-32 pb-24 text-center">
          <CalendarDays className="h-10 w-10 text-cream-muted/40" />
          <div>
            <h1 className="text-lg font-bold text-cream">No court or time selected yet</h1>
            <p className="mt-1 text-sm text-cream-muted">
              Head back to the homepage to pick a court and a time slot first.
            </p>
          </div>
          <Button size="md" to="/" leftIcon={<ArrowLeft className="h-4 w-4" />}>
            Choose Court & Time
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-charcoal text-cream">
      <Navbar />

      <div className="container-page pt-24 pb-32 lg:pb-16">
        <div className="mb-5 sm:mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-cream sm:text-3xl">
            Confirm & Book
          </h1>
          <p className="text-xs text-cream-muted sm:text-sm">
            Step 1 of 2: review your selection and enter your details. Payment comes next.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-error/20 bg-error/10 p-3 text-xs font-medium text-error">
            {error}
          </div>
        )}

        <div className="grid gap-5 md:gap-6 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            <div className="card rounded-2xl border border-neutral-700 bg-neutral-900/80 p-4 sm:p-5 shadow-xl backdrop-blur-sm">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary-300">
                  <CalendarDays className="h-3.5 w-3.5 text-primary-300" />
                  Your Selection ({selectedCourts.length} court
                  {selectedCourts.length !== 1 ? 's' : ''})
                </h2>
                <Link
                  to="/"
                  className="flex items-center gap-1 text-xs font-semibold text-cream-muted underline decoration-dotted transition hover:text-primary-300"
                >
                  <Pencil className="h-3 w-3" />
                  Edit selection
                </Link>
              </div>

              <p className="mb-3 text-xs font-medium text-cream-muted">
                {formatDateLong(selectedDate)}
              </p>

              <div className="space-y-2.5">
                {selectedCourts.map((court) => {
                  const courtSlots = selectedSlots.filter((s) => {
                    const timeSlot = slots.find((t) => t.id === s.slot_id);
                    return timeSlot?.court_id === court.id;
                  });
                  return (
                    <div
                      key={court.id}
                      className="flex items-center gap-3.5 rounded-xl border border-primary-500/40 bg-neutral-950/60 p-3.5 transition"
                    >
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-neutral-700 sm:h-16 sm:w-16">
                        <img
                          src={court.image}
                          alt={court.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-bold text-cream sm:text-base">
                          {court.name}
                        </h3>
                        <p className="truncate text-xs text-cream-muted">
                          {court.surface || court.description}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-accent-400">
                          {formatCurrency(courtSlots.reduce((sum, s) => sum + s.price, 0))}
                        </p>
                        <p className="text-[11px] text-cream-muted">
                          {courtSlots.length} slot{courtSlots.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-3.5 space-y-2">
                {selectedSlots.map((slot) => {
                  const court = getCourtForSlot(slot.slot_id);
                  return (
                    <div
                      key={slot.slot_id}
                      className="flex items-center justify-between rounded-xl border border-neutral-700 bg-neutral-800/80 px-3.5 py-2.5"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <Clock className="h-3.5 w-3.5 shrink-0 text-primary-300" />
                        <span className="truncate text-xs font-medium text-cream sm:text-sm">
                          {court?.name || 'Court'} ·{' '}
                          {formatTimeRange(slot.start_time, slot.end_time)}
                        </span>
                        {slot.type === 'fixed_2hr' && (
                          <span className="shrink-0 rounded-full border border-primary-400/40 bg-primary-500/30 px-2 py-0.5 text-[10px] font-bold text-primary-200">
                            {FIXED_SLOT.label}
                          </span>
                        )}
                      </div>
                      <span className="shrink-0 pl-2 text-xs font-bold text-accent-400 sm:text-sm">
                        {formatCurrency(slot.price)}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-neutral-700 pt-3.5">
                <span className="text-xs text-cream-muted">
                  {selectedSlots.length} slot{selectedSlots.length !== 1 ? 's' : ''} selected
                </span>
                <span className="font-display text-xl font-extrabold text-accent-400">
                  {formatCurrency(total)}
                </span>
              </div>
            </div>

            <div
              ref={formRef}
              className="card rounded-2xl border border-neutral-700 bg-neutral-900/80 p-4 scroll-mt-24 sm:p-5 shadow-xl backdrop-blur-sm"
            >
              <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-primary-300">
                Your Details
              </h2>
              <form
                id="bookingForm"
                onSubmit={handleSubmit(onSubmit, onInvalid)}
                className="space-y-3.5"
                noValidate
              >
                <div className="grid gap-3.5 sm:grid-cols-2">
                  <Input
                    id="name"
                    label="Full Name"
                    placeholder="Juan Dela Cruz"
                    autoComplete="name"
                    leftIcon={<User className="h-4 w-4" />}
                    error={errors.name?.message}
                    {...register('name')}
                  />
                  <Input
                    id="phone"
                    label="Phone Number"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    placeholder="0917 123 4567"
                    leftIcon={<Phone className="h-4 w-4" />}
                    error={errors.phone?.message}
                    {...register('phone')}
                  />
                </div>
                <Input
                  id="email"
                  label="Email Address"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="juan@email.com"
                  leftIcon={<Mail className="h-4 w-4" />}
                  error={errors.email?.message}
                  {...register('email')}
                />
                <div>
                  <Textarea
                    label="Notes (optional)"
                    rows={2}
                    placeholder="Any special requests or equipment rental notes..."
                    {...register('notes')}
                  />
                  <p
                    className={`mt-1 text-right text-[11px] ${
                      notesLength > NOTES_MAX ? 'text-error' : 'text-cream-muted'
                    }`}
                  >
                    {notesLength}/{NOTES_MAX}
                  </p>
                </div>

                <div className="flex items-start gap-2.5 rounded-xl border border-primary-500/30 bg-primary-500/10 p-3.5">
                  <Timer className="mt-0.5 h-4 w-4 shrink-0 text-primary-300" />
                  <p className="text-xs leading-relaxed text-cream-muted">
                    <strong className="font-semibold text-primary-200">
                      Heads up:
                    </strong>{' '}
                    your slot is held for {HOLD_MINUTES} minutes after you continue. Pay and submit
                    your reference within that time, or the hold is released.
                  </p>
                </div>

                <div className="flex items-start gap-2.5 rounded-xl border border-neutral-700 bg-neutral-950/60 p-3.5">
                  <input
                    type="checkbox"
                    id="termsAccepted"
                    {...register('termsAccepted')}
                    className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-neutral-600 bg-neutral-950 accent-primary-500 focus:ring-2 focus:ring-primary-500/40"
                  />
                  <label
                    htmlFor="termsAccepted"
                    className="cursor-pointer select-none text-xs leading-relaxed text-cream-muted sm:text-sm"
                  >
                    I have read and agree to the{' '}
                    <Link
                      to="/terms"
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-primary-300 underline underline-offset-2 hover:text-primary-200"
                    >
                      Terms & Conditions
                    </Link>
                    .
                  </label>
                </div>

                {errors.termsAccepted && (
                  <p className="flex items-center gap-1.5 rounded-lg border border-error/30 bg-error/10 px-2.5 py-2 text-xs font-medium text-error">
                    <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                    {errors.termsAccepted.message}
                  </p>
                )}

                {submitError && (
                  <p className="rounded-xl border border-error/30 bg-error/10 p-2.5 text-xs font-medium text-error">
                    {submitError}
                  </p>
                )}
              </form>
            </div>
          </div>

          <div className="hidden lg:col-span-1 lg:block">
            <div className="sticky top-24 space-y-3">
              <div className="card rounded-2xl border border-neutral-700 bg-neutral-900/90 p-5 shadow-xl">
                <h2 className="mb-3.5 font-display text-base font-bold text-cream">
                  Booking Summary
                </h2>

                <div className="mb-3.5 space-y-2">
                  {selectedCourts.map((court) => {
                    const courtSlots = selectedSlots.filter((s) => {
                      const timeSlot = slots.find((t) => t.id === s.slot_id);
                      return timeSlot?.court_id === court.id;
                    });
                    return (
                      <div
                        key={court.id}
                        className="rounded-xl border border-neutral-700 bg-neutral-950/60 p-3"
                      >
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-cream-muted">
                          Court
                        </p>
                        <p className="text-sm font-bold text-cream">{court.name}</p>
                        <p className="text-[11px] text-cream-muted">
                          {formatDateLong(selectedDate)}
                        </p>
                        <p className="mt-1.5 text-xs font-semibold text-accent-400">
                          {courtSlots.length} slot{courtSlots.length !== 1 ? 's' : ''} ·{' '}
                          {formatCurrency(courtSlots.reduce((sum, s) => sum + s.price, 0))}
                        </p>
                      </div>
                    );
                  })}
                </div>

                <AnimatePresence mode="popLayout">
                  <motion.div
                    key="slots"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-1.5"
                  >
                    {selectedSlots.map((slot) => {
                      const court = getCourtForSlot(slot.slot_id);
                      return (
                        <div
                          key={slot.slot_id}
                          className="flex items-center justify-between rounded-lg bg-neutral-800/80 px-3 py-2 text-xs"
                        >
                          <div className="min-w-0 flex-1 pr-2">
                            <p className="truncate font-medium text-cream">
                              {court?.name || 'Court'} ·{' '}
                              {formatTimeRange(slot.start_time, slot.end_time)}
                            </p>
                            {slot.type === 'fixed_2hr' && (
                              <span className="text-[10px] font-bold text-primary-300">
                                {FIXED_SLOT.label}
                              </span>
                            )}
                          </div>
                          <span className="shrink-0 font-bold text-accent-400">
                            {formatCurrency(slot.price)}
                          </span>
                        </div>
                      );
                    })}
                  </motion.div>
                </AnimatePresence>

                <div className="mt-4 border-t border-neutral-700 pt-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-cream-muted">
                      {selectedSlots.length} slot{selectedSlots.length !== 1 ? 's' : ''}
                    </span>
                    <span className="font-display text-2xl font-extrabold text-accent-400">
                      {formatCurrency(total)}
                    </span>
                  </div>
                </div>

                <Button
                  size="lg"
                  fullWidth
                  className="mt-4"
                  isLoading={submitting}
                  onClick={handleSummaryButtonClick}
                  rightIcon={<ArrowRight className="h-5 w-5" />}
                  disabled={!bookingsEnabled}
                >
                  Continue to Payment
                </Button>
                <p className="mt-2 text-center text-[11px] text-cream-muted">
                  You won&apos;t be charged yet. Payment is the next step.
                </p>

                <p className="mt-3 text-center text-[11px] text-cream-muted">
                  View our{' '}
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
                  .
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-700 bg-neutral-950/95 p-3.5 backdrop-blur-md lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase font-semibold tracking-wider text-cream-muted">
              {selectedSlots.length} slot{selectedSlots.length !== 1 ? 's' : ''} selected
            </p>
            <p className="text-xl font-extrabold text-accent-400">{formatCurrency(total)}</p>
            {errors.termsAccepted && (
              <p className="mt-0.5 text-[10px] font-medium text-error">
                ⚠ Agree to Terms above
              </p>
            )}
          </div>
          <Button
            size="md"
            isLoading={submitting}
            onClick={handleSummaryButtonClick}
            rightIcon={<ArrowRight className="h-4 w-4" />}
            className="shrink-0 px-6"
            disabled={!bookingsEnabled}
          >
            Continue
          </Button>
        </div>
        {submitError && (
          <p className="mt-2 rounded-lg border border-error/30 bg-error/10 p-2 text-xs font-medium text-error">
            {submitError}
          </p>
        )}
      </div>

      <Footer />
    </div>
  );
}

export type { CustomerDetails };