// src/pages/admin/StaffCreateBookingModal.tsx
import { useEffect, useState } from 'react';
import { AlertCircle, Check, Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { useAdminStore } from '@/stores/adminStore';
import { courtService } from '@/services/courtService';
import { formatCurrency, formatTimeRange, todayISO } from '@/utils/format';
import type { TimeSlot } from '@/types';

type PaymentMode = 'cash' | 'gcash' | 'pay_later' | 'free';

const PAYMENT_MODES: { value: PaymentMode; label: string; hint: string }[] = [
  { value: 'cash',       label: 'Cash',           hint: 'Paid now — booking confirmed immediately' },
  { value: 'gcash',      label: 'GCash',          hint: 'Pending — 15 min to upload proof' },
  { value: 'pay_later',  label: 'Pay on Arrival', hint: 'Pending — payment collected at the venue' },
  { value: 'free',       label: 'Free / Comp',    hint: 'No payment required — booking confirmed' },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function StaffCreateBookingModal({ isOpen, onClose, onCreated }: Props) {
  const courts = useAdminStore((s) => s.courts);
  const loadCourts = useAdminStore((s) => s.loadCourts);
  const createManualBooking = useAdminStore((s) => s.createManualBooking);

  const [courtId, setCourtId] = useState('');
  const [date, setDate] = useState(todayISO());
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedSlotIds, setSelectedSlotIds] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [staffNotes, setStaffNotes] = useState('');

  const [paymentMode, setPaymentMode] = useState<PaymentMode>('cash');
  const [amountOverride, setAmountOverride] = useState<string>('');
  const [sendConfirmation, setSendConfirmation] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && courts.length === 0) loadCourts();
  }, [isOpen, courts.length, loadCourts]);

  useEffect(() => {
    if (isOpen && !courtId && courts.length > 0) setCourtId(courts[0].id);
  }, [isOpen, courtId, courts]);

  useEffect(() => {
    if (!isOpen || !courtId || !date) return;

    let cancelled = false;
    setLoadingSlots(true);
    setSelectedSlotIds([]);

    (async () => {
      try {
        const result = await courtService.getAvailability(courtId, date);
        if (!cancelled) setSlots(result.filter((s) => s.is_available));
      } catch {
        if (!cancelled) setSlots([]);
      } finally {
        if (!cancelled) setLoadingSlots(false);
      }
    })();

    return () => { cancelled = true; };
  }, [isOpen, courtId, date]);

  const reset = () => {
    setCourtId(courts[0]?.id || '');
    setDate(todayISO());
    setSlots([]);
    setSelectedSlotIds([]);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerEmail('');
    setNotes('');
    setStaffNotes('');
    setPaymentMode('cash');
    setAmountOverride('');
    setSendConfirmation(false);
    setError(null);
  };

  const handleClose = () => {
    if (submitting) return;
    reset();
    onClose();
  };

  const toggleSlot = (slotId: string) => {
    setSelectedSlotIds((prev) =>
      prev.includes(slotId) ? prev.filter((id) => id !== slotId) : [...prev, slotId]
    );
  };

  const selectedSlots = slots.filter((s) => selectedSlotIds.includes(s.id));
  const autoAmount = selectedSlots.reduce((sum, s) => sum + s.price, 0);
  const effectiveAmount = amountOverride.trim() === '' ? autoAmount : Number(amountOverride) || 0;

  const handleSubmit = async () => {
    setError(null);

    if (!courtId) return setError('Please select a court');
    if (!date) return setError('Please pick a date');
    if (selectedSlotIds.length === 0) return setError('Please select at least one time slot');
    if (!customerName.trim()) return setError('Customer name is required');
    if (!customerPhone.trim()) return setError('Customer phone is required');
    if (sendConfirmation && !customerEmail.trim())
      return setError('Add an email address or turn off confirmation email');

    setSubmitting(true);
    try {
      await createManualBooking({
        court_id: courtId,
        date,
        slots: selectedSlots.map((s) => ({ start_time: s.start_time, end_time: s.end_time })),
        customer_name: customerName.trim(),
        customer_email: customerEmail.trim() || undefined,
        customer_phone: customerPhone.trim(),
        notes: notes.trim() || undefined,
        payment_mode: paymentMode,
        total_amount: amountOverride.trim() === '' ? undefined : effectiveAmount,
        staff_notes: staffNotes.trim() || undefined,
        send_confirmation: sendConfirmation,
      });

      onCreated();
      reset();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create booking');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create Manual Booking"
      size="lg"
    >
      <div className="space-y-4 text-cream">
        {/* Court + Date */}
        <div className="grid gap-3.5 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-cream-muted">
              Court *
            </label>
            <select
              value={courtId}
              onChange={(e) => setCourtId(e.target.value)}
              className="w-full rounded-xl border border-neutral-700 bg-neutral-950/70 px-3.5 py-2.5 text-sm text-cream transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            >
              {courts.map((c) => (
                <option key={c.id} value={c.id} className="bg-neutral-900">
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <Input
            label="Date *"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        {/* Slots */}
        <div>
          <label className="mb-1.5 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-cream-muted">
            <span>
              Available Slots *{' '}
              {loadingSlots && <Loader2 className="ml-1.5 inline h-3.5 w-3.5 animate-spin text-primary-300" />}
            </span>
            {selectedSlotIds.length > 0 && (
              <span className="font-bold text-accent-400">
                {selectedSlotIds.length} chosen (Auto: {formatCurrency(autoAmount)})
              </span>
            )}
          </label>

          {loadingSlots ? (
            <div className="rounded-xl border border-neutral-700 bg-neutral-950/40 p-4 text-center text-xs text-cream-muted">
              Checking court schedule availability…
            </div>
          ) : slots.length === 0 ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs font-medium text-amber-300">
              No available slots for this court on the selected date.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {slots.map((slot) => {
                const selected = selectedSlotIds.includes(slot.id);
                return (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => toggleSlot(slot.id)}
                    className={`rounded-xl border p-2.5 text-center text-xs transition ${
                      selected
                        ? 'border-accent-400 bg-accent-500 text-neutral-950 shadow-glow-lime font-bold'
                        : 'border-neutral-700 bg-neutral-950/60 text-cream-muted hover:border-primary-400/50 hover:text-cream'
                    }`}
                  >
                    <span className="font-mono block">
                      {formatTimeRange(slot.start_time, slot.end_time)}
                    </span>
                    <span className="block text-[10px] opacity-75 mt-0.5">
                      {formatCurrency(slot.price)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Customer */}
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Input
            label="Customer Name *"
            placeholder="Juan Dela Cruz"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
          />
          <Input
            label="Phone Number *"
            placeholder="0917 123 4567"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
          />
          <div className="sm:col-span-2">
            <Input
              label="Email (optional)"
              type="email"
              placeholder="juan@email.com"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
            />
          </div>
        </div>

        {/* Payment Mode */}
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-cream-muted">
            Payment Mode *
          </label>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {PAYMENT_MODES.map((mode) => {
              const selected = paymentMode === mode.value;
              return (
                <button
                  key={mode.value}
                  type="button"
                  onClick={() => setPaymentMode(mode.value)}
                  className={`rounded-xl border p-3 text-left transition ${
                    selected
                      ? 'border-primary-400 bg-primary-500/20 shadow-glow-blue'
                      : 'border-neutral-700 bg-neutral-950/60 hover:border-primary-400/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold ${selected ? 'text-primary-200' : 'text-cream'}`}>
                      {mode.label}
                    </span>
                    {selected && <Check className="h-4 w-4 text-primary-300" />}
                  </div>
                  <p className="mt-0.5 text-[11px] text-cream-muted leading-tight">{mode.hint}</p>
                </button>
              );
            })}
          </div>

          {paymentMode !== 'free' && (
            <div className="mt-3">
              <Input
                label="Amount Override (optional)"
                type="number"
                min={0}
                step="0.01"
                placeholder={`Auto calculated: ${formatCurrency(autoAmount)}`}
                value={amountOverride}
                onChange={(e) => setAmountOverride(e.target.value)}
                hint={`Leave blank to use default total (${formatCurrency(effectiveAmount)})`}
              />
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="space-y-3">
          <Textarea
            label="Customer Notes (optional)"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Special requests, paddle rentals, etc."
          />
          <Textarea
            label="Internal Staff Notes (optional)"
            rows={2}
            value={staffNotes}
            onChange={(e) => setStaffNotes(e.target.value)}
            placeholder="e.g. Paid cash at counter, handled by staff"
          />
        </div>

        {/* Confirmation Email */}
        <div className="pt-1">
          <label className="flex items-center gap-2 text-xs font-semibold text-cream cursor-pointer">
            <input
              type="checkbox"
              checked={sendConfirmation}
              onChange={(e) => setSendConfirmation(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-600 bg-neutral-950 accent-primary-500 cursor-pointer"
            />
            Send automated booking confirmation to the customer's email
          </label>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-error/30 bg-error/10 p-3 text-xs font-semibold text-error">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2.5 border-t border-neutral-700 pt-4 sm:flex-row sm:gap-3">
          <Button
            fullWidth
            isLoading={submitting}
            onClick={handleSubmit}
          >
            Create Booking
          </Button>
          <Button
            variant="ghost"
            fullWidth
            className="sm:w-auto"
            onClick={handleClose}
            disabled={submitting}
          >
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}