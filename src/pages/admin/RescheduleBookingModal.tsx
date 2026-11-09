// src/pages/admin/RescheduleBookingModal.tsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Calendar,
  Check,
  Loader2,
  Lock,
  RotateCcw,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { useAdminStore } from '@/stores/adminStore';
import { courtService } from '@/services/courtService';
import { formatCurrency, formatDateLong, formatTimeRange } from '@/utils/format';
import type { Booking, RescheduleBookingResult, TimeSlot } from '@/types';

interface Props {
  isOpen: boolean;
  booking: Booking | null;
  onClose: () => void;
  onRescheduled: (result: RescheduleBookingResult) => void;
}

const toDay = (d?: string | null) => (d ? d.slice(0, 10) : '');

export function RescheduleBookingModal({ isOpen, booking, onClose, onRescheduled }: Props) {
  const courts = useAdminStore((s) => s.courts);
  const loadCourts = useAdminStore((s) => s.loadCourts);
  const rescheduleBooking = useAdminStore((s) => s.rescheduleBooking);

  const [targetCourtId, setTargetCourtId] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedSlotIds, setSelectedSlotIds] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RescheduleBookingResult | null>(null);

  useEffect(() => {
    if (!isOpen || !booking) return;
    setTargetCourtId(booking.court_id);
    setTargetDate(toDay(booking.date));
    setSelectedSlotIds([]);
    setReason('');
    setError(null);
    setResult(null);
  }, [isOpen, booking]);

  useEffect(() => {
    if (isOpen && courts.length === 0) loadCourts();
  }, [isOpen, courts.length, loadCourts]);

  const fetchAvailability = useCallback(async () => {
    if (!isOpen || !booking || !targetCourtId || !targetDate) return;

    setLoadingSlots(true);
    try {
      const fetched = await courtService.getAvailability(
        targetCourtId,
        targetDate,
        booking.id
      );
      setSlots(fetched);

      const sameCourt = targetCourtId === booking.court_id;
      const sameDate = toDay(targetDate) === toDay(booking.date);
      if (sameCourt && sameDate) {
        const currentStarts = new Set(
          booking.slots.map((s) => s.start_time.slice(0, 5))
        );
        setSelectedSlotIds(
          fetched
            .filter((s) => s.is_available && currentStarts.has(s.start_time.slice(0, 5)))
            .map((s) => s.id)
        );
      } else {
        setSelectedSlotIds([]);
      }
    } catch {
      setSlots([]);
      setSelectedSlotIds([]);
    } finally {
      setLoadingSlots(false);
    }
  }, [isOpen, booking, targetCourtId, targetDate]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  useEffect(() => {
    setSelectedSlotIds([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetCourtId, targetDate]);

  const toggleSlot = (slotId: string) => {
    setSelectedSlotIds((prev) =>
      prev.includes(slotId) ? prev.filter((id) => id !== slotId) : [...prev, slotId]
    );
  };

  const selectedSlots = useMemo(
    () => slots.filter((s) => selectedSlotIds.includes(s.id)),
    [slots, selectedSlotIds]
  );

  const newTotal = useMemo(
    () => selectedSlots.reduce((sum, s) => sum + s.price, 0),
    [selectedSlots]
  );

  const previousTotal = booking?.total_amount ?? 0;
  const projectedBalance = newTotal > previousTotal ? newTotal - previousTotal : 0;
  const projectedRefund = newTotal < previousTotal ? previousTotal - newTotal : 0;

  const hasChanges = useMemo(() => {
    if (!booking) return false;
    if (targetCourtId !== booking.court_id) return true;
    if (toDay(targetDate) !== toDay(booking.date)) return true;

    const currentStarts = [...booking.slots.map((s) => s.start_time.slice(0, 5))].sort();
    const newStarts = [...selectedSlots.map((s) => s.start_time.slice(0, 5))].sort();
    return currentStarts.join(',') !== newStarts.join(',');
  }, [booking, targetCourtId, targetDate, selectedSlots]);

  const handleSubmit = async () => {
    if (!booking) return;
    setError(null);

    if (selectedSlots.length === 0)
      return setError('Please select at least one time slot');
    if (!hasChanges)
      return setError('Please change the court, date, or time before saving');

    setSubmitting(true);
    try {
      const response = await rescheduleBooking(booking.id, {
        court_id: targetCourtId !== booking.court_id ? targetCourtId : undefined,
        date: toDay(targetDate) !== toDay(booking.date) ? targetDate : undefined,
        slots: selectedSlots
          .sort((a, b) => a.start_time.localeCompare(b.start_time))
          .map((s) => ({ start_time: s.start_time, end_time: s.end_time })),
        reason: reason.trim() || undefined,
      });

      setResult(response);
      onRescheduled(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reschedule booking');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (submitting) return;
    onClose();
  };

  if (!booking) return null;

  const currentCourtName =
    courts.find((c) => c.id === booking.court_id)?.name || booking.court_name;
  const targetCourtName =
    courts.find((c) => c.id === targetCourtId)?.name || booking.court_name;

  if (result) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title="Booking rescheduled" size="md">
        <div className="space-y-4 text-cream">
          <div className="flex items-start gap-3 rounded-xl border border-success/40 bg-success/10 p-4">
            <Check className="mt-0.5 h-5 w-5 shrink-0 text-accent-300" />
            <div>
              <p className="text-sm font-bold text-cream">Booking updated</p>
              <p className="mt-0.5 text-xs text-cream-muted">
                Reference <span className="font-mono text-primary-300">
                  {result.booking.reference_code}
                </span>{' '}
                has been moved.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-neutral-700 bg-neutral-950/70 p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-cream-muted">
              Change summary
            </p>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-cream-muted">{result.previous_court_name}</span>
              <span className="text-cream-muted">·</span>
              <span className="text-cream-muted">{result.previous_date}</span>
              <ArrowRight className="h-4 w-4 text-primary-300" />
              <span className="font-semibold text-cream">{targetCourtName}</span>
              <span className="text-cream-muted">·</span>
              <span className="font-semibold text-cream">{result.booking.date}</span>
            </div>
            <p className="mt-1 text-xs text-cream-muted">
              {formatTimeRange(
                selectedSlots[0]?.start_time,
                selectedSlots[selectedSlots.length - 1]?.end_time
              )}
            </p>
          </div>

          {result.refund_due > 0 && (
            <div className="flex items-start gap-2 rounded-xl border border-purple-500/40 bg-purple-500/10 p-4">
              <RotateCcw className="mt-0.5 h-4 w-4 shrink-0 text-purple-300" />
              <div>
                <p className="text-sm font-bold text-purple-200">
                  Refund due: {formatCurrency(result.refund_due)}
                </p>
                <p className="mt-0.5 text-xs text-cream-muted">
                  The new total is lower than what the customer paid. Issue the refund
                  via GCash/cash, then use "Mark as refunded" to log it.
                </p>
              </div>
            </div>
          )}

          {result.balance_due > 0 && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
              <div>
                <p className="text-sm font-bold text-amber-200">
                  Balance due: {formatCurrency(result.balance_due)}
                </p>
                <p className="mt-0.5 text-xs text-cream-muted">
                  The new total is higher than what was recorded. Collect the
                  difference from the customer.
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-end border-t border-neutral-700 pt-4">
            <Button size="sm" onClick={handleClose}>Done</Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Reschedule ${booking.reference_code}`}
      size="lg"
    >
      <div className="space-y-4 text-cream">
        <div className="rounded-xl border border-neutral-700 bg-neutral-950/70 p-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-cream-muted">
            Currently booked
          </p>
          <p className="text-sm font-bold text-cream">{currentCourtName}</p>
          <p className="text-xs text-cream-muted">{formatDateLong(booking.date)}</p>
          <p className="mt-1 text-xs text-cream-muted">
            {booking.slots
              .map((s) => formatTimeRange(s.start_time, s.end_time))
              .join(' · ')}
          </p>
          <p className="mt-1 text-xs font-semibold text-accent-400">
            {formatCurrency(previousTotal)}
          </p>
        </div>

        <div className="grid gap-3.5 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-cream-muted">
              New court
            </label>
            <select
              value={targetCourtId}
              onChange={(e) => setTargetCourtId(e.target.value)}
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
            label="New date"
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            leftIcon={<Calendar className="h-4 w-4" />}
          />
        </div>

        <div>
          <label className="mb-1.5 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-cream-muted">
            <span>
              New time slots{' '}
              {loadingSlots && (
                <Loader2 className="ml-1.5 inline h-3.5 w-3.5 animate-spin text-primary-300" />
              )}
            </span>
            {selectedSlotIds.length > 0 && (
              <span className="font-bold text-accent-400">
                {selectedSlotIds.length} chosen (New total: {formatCurrency(newTotal)})
              </span>
            )}
          </label>

          {loadingSlots ? (
            <div className="rounded-xl border border-neutral-700 bg-neutral-950/40 p-4 text-center text-xs text-cream-muted">
              Checking availability…
            </div>
          ) : slots.length === 0 ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs font-medium text-amber-300">
              No slots for this court on the selected date.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {slots.map((slot) => {
                  const selected = selectedSlotIds.includes(slot.id);
                  const unavailable = !slot.is_available;

                  return (
                    <button
                      key={slot.id}
                      type="button"
                      disabled={unavailable}
                      onClick={() => !unavailable && toggleSlot(slot.id)}
                      aria-label={
                        unavailable
                          ? `${formatTimeRange(slot.start_time, slot.end_time)} — already booked`
                          : formatTimeRange(slot.start_time, slot.end_time)
                      }
                      aria-pressed={selected}
                      title={unavailable ? 'Already booked' : undefined}
                      className={`relative rounded-xl border p-2.5 text-center text-xs transition ${
                        unavailable
                          ? 'cursor-not-allowed border-neutral-800 bg-neutral-950/30 text-cream-muted/40'
                          : selected
                          ? 'border-accent-400 bg-accent-500 font-bold text-neutral-950 shadow-glow-lime'
                          : 'border-neutral-700 bg-neutral-950/60 text-cream-muted hover:border-primary-400/50 hover:text-cream'
                      }`}
                    >
                      {unavailable && (
                        <Lock className="absolute right-1.5 top-1.5 h-3 w-3 text-cream-muted/50" />
                      )}
                      <span className={`font-mono block ${unavailable ? 'line-through' : ''}`}>
                        {formatTimeRange(slot.start_time, slot.end_time)}
                      </span>
                      <span className="block text-[10px] mt-0.5 opacity-75">
                        {unavailable ? 'Booked' : formatCurrency(slot.price)}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-cream-muted">
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 rounded border border-neutral-700 bg-neutral-950/60" />
                  Available
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 rounded border border-accent-400 bg-accent-500" />
                  Selected
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 rounded border border-neutral-800 bg-neutral-950/30" />
                  Already booked
                </span>
              </div>
            </>
          )}
        </div>

        {selectedSlots.length > 0 && (
          <div
            className={`rounded-xl border p-4 ${
              projectedRefund > 0
                ? 'border-purple-500/40 bg-purple-500/10'
                : projectedBalance > 0
                ? 'border-amber-500/40 bg-amber-500/10'
                : 'border-neutral-700 bg-neutral-950/70'
            }`}
          >
            <div className="flex items-center justify-between text-sm">
              <span className="text-cream-muted">Previous total</span>
              <span className="font-mono text-cream">{formatCurrency(previousTotal)}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-sm">
              <span className="text-cream-muted">New total</span>
              <span className="font-mono font-bold text-accent-400">
                {formatCurrency(newTotal)}
              </span>
            </div>

            {projectedRefund > 0 && (
              <div className="mt-3 flex items-center gap-2 border-t border-purple-500/30 pt-3 text-sm font-bold text-purple-200">
                <RotateCcw className="h-4 w-4" />
                Refund due: {formatCurrency(projectedRefund)}
              </div>
            )}
            {projectedBalance > 0 && (
              <div className="mt-3 flex items-center gap-2 border-t border-amber-500/30 pt-3 text-sm font-bold text-amber-200">
                <AlertTriangle className="h-4 w-4" />
                Balance due: {formatCurrency(projectedBalance)}
              </div>
            )}
            {projectedRefund === 0 && projectedBalance === 0 && (
              <p className="mt-2 text-[11px] text-cream-muted">
                Totals match — no adjustment needed.
              </p>
            )}
          </div>
        )}

        <Textarea
          label="Reason (optional)"
          rows={2}
          maxLength={300}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Customer requested a later start"
          hint="Shown to the customer in the reschedule email and saved to the booking history."
        />

        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-error/30 bg-error/10 p-3 text-xs font-semibold text-error">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex flex-col gap-2.5 border-t border-neutral-700 pt-4 sm:flex-row sm:gap-3">
          <Button fullWidth isLoading={submitting} onClick={handleSubmit} disabled={!hasChanges}>
            Save changes
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