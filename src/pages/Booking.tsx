import { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
  const blockedWords = ['test', 'sample', 'testing', 'admin', 'fake'];
  if (blockedWords.some((word) => lower.includes(word))) return true;
  if (BLOCKED_NAMES_EXACT.includes(lower)) return true;
  if (/^(.)\1{2,}$/.test(lower.replace(/\s+/g, ''))) return true;
  if (/^(asdf|qwer|zxcv|1234|abcd)/i.test(lower)) return true;
  return false;
};

const isFakeEmail = (email: string): boolean => {
  if (!email || !email.includes('@')) return true;
  const parts = email.toLowerCase().trim().split('@');
  if (parts.length !== 2) return true;
  const [localPart, domain] = parts;
  if (!localPart || !domain) return true;
  if (BLOCKED_EMAIL_DOMAINS.some((d) => domain === d || domain.endsWith('.' + d))) return true;
  if (/\.(test|invalid|example|localhost)$/i.test(domain)) return true;
  if (BLOCKED_EMAIL_LOCALPARTS.includes(localPart)) return true;
  if (/\b(test|sample|fake|admin)\b/i.test(localPart)) return true;
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
      message: 'Please enter your real full name.',
    }),

  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'Email is required')
    .email('Enter a valid email address')
    .max(120, 'Email is too long')
    .refine((v) => !isFakeEmail(v), {
      message: 'Please use a real, active email address.',
    }),

  phone: z
    .string()
    .trim()
    .min(1, 'Mobile number is required')
    .transform(normalizePhone)
    .refine((v) => /^09\d{9}$/.test(v), { message: 'Enter a valid PH mobile number (e.g. 0917 123 4567)', }) .refine((v) => !/^09(0{9}\vert{}1{9}\vert{}2{9}\vert{}3{9}\vert{}4{9}\vert{}5{9}\vert{}6{9}\vert{}7{9}\vert{}8{9}\vert{}9{9})$/.test(v), {
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
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <Navbar />
        <div className="container-page flex flex-col items-center justify-center gap-4 pt-32 pb-24 text-center">
          <AlertCircle className="h-10 w-10 text-amber-500" />
          <div>
            <h1 className="text-xl font-black text-slate-900">Online bookings are closed</h1>
            <p className="mt-1 text-sm text-slate-600">
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
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <Navbar />
        <LoadingSpinner className="pt-32" />
        <Footer />
      </div>
    );
  }

  if (selectedSlots.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <Navbar />
        <div className="container-page flex flex-col items-center justify-center gap-4 pt-32 pb-24 text-center">
          <CalendarDays className="h-12 w-12 text-slate-300" />
          <div>
            <h1 className="text-xl font-black text-slate-900">No court or time selected yet</h1>
            <p className="mt-1 text-sm text-slate-600">
              Head back to the schedule to pick a court and a time slot first.
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
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />

      <div className="container-page pt-24 pb-32 lg:pb-16">
        <div className="mb-6">
          <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
            Confirm & Book
          </h1>
          <p className="text-xs text-slate-600 sm:text-sm">
            Step 1 of 2: review your selection and enter your details. Payment comes next.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-semibold text-rose-700">
            {error}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {/* Selection Card */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#3D1164]">
                  <CalendarDays className="h-4 w-4 text-[#FF7A00]" />
                  Your Selection ({selectedCourts.length} court
                  {selectedCourts.length !== 1 ? 's' : ''})
                </h2>
                <Link
                  to="/"
                  className="flex items-center gap-1 text-xs font-bold text-[#FF7A00] hover:text-[#E56600] transition"
                >
                  <Pencil className="h-3 w-3" />
                  Edit selection
                </Link>
              </div>

              <p className="mb-4 text-xs font-bold text-slate-700">
                {formatDateLong(selectedDate)}
              </p>

              <div className="space-y-3">
                {selectedCourts.map((court) => {
                  const courtSlots = selectedSlots.filter((s) => {
                    const timeSlot = slots.find((t) => t.id === s.slot_id);
                    return timeSlot?.court_id === court.id;
                  });
                  return (
                    <div
                      key={court.id}
                      className="flex items-center gap-3.5 rounded-2xl border border-purple-100 bg-purple-50/40 p-4 transition"
                    >
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-slate-200 sm:h-16 sm:w-16">
                        <img
                          src={court.image}
                          alt={court.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-bold text-slate-900 sm:text-base">
                          {court.name}
                        </h3>
                        <p className="truncate text-xs text-slate-500">
                          {court.surface || court.description}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-black text-[#FF7A00]">
                          {formatCurrency(courtSlots.reduce((sum, s) => sum + s.price, 0))}
                        </p>
                        <p className="text-[11px] font-medium text-slate-500">
                          {courtSlots.length} slot{courtSlots.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 space-y-2">
                {selectedSlots.map((slot) => {
                  const court = getCourtForSlot(slot.slot_id);
                  return (
                    <div
                      key={slot.slot_id}
                      className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-2.5"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <Clock className="h-3.5 w-3.5 shrink-0 text-[#3D1164]" />
                        <span className="truncate text-xs font-semibold text-slate-800 sm:text-sm">
                          {court?.name || 'Court'} ·{' '}
                          {formatTimeRange(slot.start_time, slot.end_time)}
                        </span>
                        {slot.type === 'fixed_2hr' && (
                          <span className="shrink-0 rounded-full border border-purple-200 bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-[#3D1164]">
                            {FIXED_SLOT.label}
                          </span>
                        )}
                      </div>
                      <span className="shrink-0 pl-2 text-xs font-black text-[#FF7A00] sm:text-sm">
                        {formatCurrency(slot.price)}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3.5">
                <span className="text-xs font-medium text-slate-500">
                  {selectedSlots.length} slot{selectedSlots.length !== 1 ? 's' : ''} selected
                </span>
                <span className="font-display text-xl font-black text-[#3D1164]">
                  {formatCurrency(total)}
                </span>
              </div>
            </div>

            {/* Customer Details Form */}
            <div
              ref={formRef}
              className="rounded-3xl border border-slate-200 bg-white p-5 scroll-mt-24 sm:p-6 shadow-sm"
            >
              <h2 className="mb-4 text-xs font-black uppercase tracking-wider text-[#3D1164]">
                Your Details
              </h2>
              <form
                id="bookingForm"
                onSubmit={handleSubmit(onSubmit, onInvalid)}
                className="space-y-4"
                noValidate
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    id="name"
                    label="Full Name"
                    placeholder="e.g. Maria Santos"
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
                  placeholder="name@email.com"
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
                      notesLength > NOTES_MAX ? 'text-rose-600 font-bold' : 'text-slate-400'
                    }`}
                  >
                    {notesLength}/{NOTES_MAX}
                  </p>
                </div>

                <div className="flex items-start gap-3 rounded-2xl border border-orange-200 bg-orange-50/70 p-4">
                  <Timer className="mt-0.5 h-4 w-4 shrink-0 text-[#FF7A00]" />
                  <p className="text-xs leading-relaxed text-slate-700">
                    <strong className="font-bold text-[#FF7A00]">Heads up:</strong> your slot is held
                    for {HOLD_MINUTES} minutes after you continue. Complete payment within that time to lock in your court.
                  </p>
                </div>

                <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <input
                    type="checkbox"
                    id="termsAccepted"
                    {...register('termsAccepted')}
                    className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 accent-[#FF7A00] focus:ring-2 focus:ring-[#FF7A00]/30"
                  />
                  <label
                    htmlFor="termsAccepted"
                    className="cursor-pointer select-none text-xs leading-relaxed text-slate-600 sm:text-sm"
                  >
                    I have read and agree to the{' '}
                    <Link
                      to="/terms"
                      target="_blank"
                      rel="noreferrer"
                      className="font-bold text-[#3D1164] underline underline-offset-2 hover:text-[#FF7A00]"
                    >
                      Terms & Conditions
                    </Link>
                    . All bookings are final and non-refundable.
                  </label>
                </div>

                {errors.termsAccepted && (
                  <p className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                    <ShieldCheck className="h-4 w-4 shrink-0" />
                    {errors.termsAccepted.message}
                  </p>
                )}

                {submitError && (
                  <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
                    {submitError}
                  </p>
                )}
              </form>
            </div>
          </div>

          {/* Desktop Summary Column */}
          <div className="hidden lg:col-span-1 lg:block">
            <div className="sticky top-24 space-y-4">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 font-display text-base font-black text-slate-900 uppercase">
                  Booking Summary
                </h2>

                <div className="mb-4 space-y-2">
                  {selectedCourts.map((court) => {
                    const courtSlots = selectedSlots.filter((s) => {
                      const timeSlot = slots.find((t) => t.id === s.slot_id);
                      return timeSlot?.court_id === court.id;
                    });
                    return (
                      <div
                        key={court.id}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5"
                      >
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Court
                        </p>
                        <p className="text-sm font-bold text-slate-900">{court.name}</p>
                        <p className="text-[11px] text-slate-500">
                          {formatDateLong(selectedDate)}
                        </p>
                        <p className="mt-1 text-xs font-extrabold text-[#FF7A00]">
                          {courtSlots.length} slot{courtSlots.length !== 1 ? 's' : ''} ·{' '}
                          {formatCurrency(courtSlots.reduce((sum, s) => sum + s.price, 0))}
                        </p>
                      </div>
                    );
                  })}
                </div>

                <div className="space-y-1.5 border-t border-slate-100 pt-3">
                  {selectedSlots.map((slot) => {
                    const court = getCourtForSlot(slot.slot_id);
                    return (
                      <div
                        key={slot.slot_id}
                        className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs"
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <p className="truncate font-semibold text-slate-800">
                            {court?.name || 'Court'} ·{' '}
                            {formatTimeRange(slot.start_time, slot.end_time)}
                          </p>
                        </div>
                        <span className="shrink-0 font-bold text-[#FF7A00]">
                          {formatCurrency(slot.price)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 border-t border-slate-200 pt-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500">
                      {selectedSlots.length} slot{selectedSlots.length !== 1 ? 's' : ''}
                    </span>
                    <span className="font-display text-2xl font-black text-[#3D1164]">
                      {formatCurrency(total)}
                    </span>
                  </div>
                </div>

                <Button
                  size="lg"
                  fullWidth
                  className="mt-5 bg-[#FF7A00] hover:bg-[#E56600] text-white font-black shadow-sm"
                  isLoading={submitting}
                  onClick={handleSummaryButtonClick}
                  rightIcon={<ArrowRight className="h-5 w-5" />}
                  disabled={!bookingsEnabled}
                >
                  Continue to Payment
                </Button>
                <p className="mt-2.5 text-center text-[11px] text-slate-500">
                  Payment is confirmed in the next step.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-3.5 shadow-xl backdrop-blur-md lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase font-bold tracking-wider text-slate-500">
              {selectedSlots.length} slot{selectedSlots.length !== 1 ? 's' : ''} selected
            </p>
            <p className="text-xl font-black text-[#3D1164]">{formatCurrency(total)}</p>
            {errors.termsAccepted && (
              <p className="mt-0.5 text-[10px] font-bold text-rose-600">
                ⚠ Please agree to terms
              </p>
            )}
          </div>
          <Button
            size="md"
            isLoading={submitting}
            onClick={handleSummaryButtonClick}
            rightIcon={<ArrowRight className="h-4 w-4" />}
            className="shrink-0 px-6 bg-[#FF7A00] hover:bg-[#E56600] text-white font-black"
            disabled={!bookingsEnabled}
          >
            Continue
          </Button>
        </div>
        {submitError && (
          <p className="mt-2 rounded-xl border border-rose-200 bg-rose-50 p-2 text-xs font-semibold text-rose-700">
            {submitError}
          </p>
        )}
      </div>

      <Footer />
    </div>
  );
}

export type { CustomerDetails };