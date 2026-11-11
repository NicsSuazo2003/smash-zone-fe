import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Tag, Clock, CloudSun, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useAdminStore } from '@/stores/adminStore';
import { apiRequest } from '@/services/api';
import { formatCurrency } from '@/utils/format';
import type { DayOfWeek, PricingRule, TimeSlot } from '@/types';

const DAYS: { key: DayOfWeek; label: string }[] = [
  { key: 'mon', label: 'Mon' },
  { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' },
  { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' },
];

interface EditorForm {
  id: string | null;
  label: string;
  days: DayOfWeek[];
  start_time: string;
  end_time: string;
  price_per_hour: number | '';
  priority: number | '';
}

const EMPTY_FORM: EditorForm = {
  id: null,
  label: '',
  days: [],
  start_time: '',
  end_time: '',
  price_per_hour: '',
  priority: 0,
};

function formatTimeShort(time: string): string {
  if (!time) return '';
  const [hour, minute] = time.split(':').map(Number);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return minute === 0
    ? `${hour12}${ampm}`
    : `${hour12}:${String(minute).padStart(2, '0')}${ampm}`;
}

function groupSlotsByPeriod(slots: TimeSlot[]) {
  const morningMap = new Map<string, { start_time: string; end_time: string }>();
  const afternoonMap = new Map<string, { start_time: string; end_time: string }>();
  const eveningMap = new Map<string, { start_time: string; end_time: string }>();

  slots.forEach((slot) => {
    if (!slot.start_time || !slot.end_time) return;
    const hour = parseInt(slot.start_time.split(':')[0], 10);
    const key = `${slot.start_time}-${slot.end_time}`;
    const obj = { start_time: slot.start_time, end_time: slot.end_time };

    if (hour < 12) morningMap.set(key, obj);
    else if (hour < 17) afternoonMap.set(key, obj);
    else eveningMap.set(key, obj);
  });

  const sortFn = (a: { start_time: string }, b: { start_time: string }) =>
    a.start_time.localeCompare(b.start_time);

  return {
    morning: Array.from(morningMap.values()).sort(sortFn),
    afternoon: Array.from(afternoonMap.values()).sort(sortFn),
    evening: Array.from(eveningMap.values()).sort(sortFn),
  };
}

export function PricingRulesEditor({ courtId }: { courtId: string }) {
  const court = useAdminStore((s) => s.courts.find((c) => c.id === courtId));
  const loadPricingRules = useAdminStore((s) => s.loadPricingRules);
  const addPricingRule = useAdminStore((s) => s.addPricingRule);
  const editPricingRule = useAdminStore((s) => s.editPricingRule);
  const removePricingRule = useAdminStore((s) => s.removePricingRule);

  const [form, setForm] = useState<EditorForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [manualMode, setManualMode] = useState(false);

  useEffect(() => {
    if (courtId) loadPricingRules(courtId).catch(() => {});
  }, [courtId, loadPricingRules]);

  useEffect(() => {
    if (!courtId) return;
    let cancelled = false;

    (async () => {
      setLoadingSlots(true);
      try {
        const today = new Date().toISOString().slice(0, 10);
        const res = await apiRequest<any>(
          `/api/courts/${courtId}/availability?date=${today}`
        );
        const rawList = Array.isArray(res) ? res : res?.data ?? [];

        const normalized: TimeSlot[] = rawList.map((item: any) => ({
          id: item.id ?? '',
          court_id: item.courtId ?? item.court_id ?? courtId,
          date: item.date ?? today,
          start_time: item.startTime ?? item.start_time ?? '',
          end_time: item.endTime ?? item.end_time ?? '',
          type: 'standard',
          price: Number(item.price ?? 0),
          is_available: item.isAvailable ?? item.is_available ?? true,
          is_peak: item.isPeak ?? item.is_peak ?? false,
        }));

        if (!cancelled) setSlots(normalized);
      } catch (err) {
        if (!cancelled) setSlots([]);
        console.warn('[PricingRulesEditor] Slot fetch failed:', err);
      } finally {
        if (!cancelled) setLoadingSlots(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [courtId]);

  const { morning, afternoon, evening } = useMemo(
    () => groupSlotsByPeriod(slots),
    [slots]
  );

  const allIntervals = useMemo(
    () => [...morning, ...afternoon, ...evening],
    [morning, afternoon, evening]
  );

  const rules = court?.pricing_rules ?? [];

  const openCreate = () => {
    setLocalError(null);
    setManualMode(false);
    setForm({ ...EMPTY_FORM });
  };

  const openEdit = (rule: PricingRule) => {
    setLocalError(null);
    setManualMode(false);
    setForm({
      id: rule.id,
      label: rule.label,
      days: rule.days
        .split(',')
        .map((d) => d.trim().toLowerCase())
        .filter((d): d is DayOfWeek => DAYS.some((x) => x.key === d)),
      start_time: rule.start_time,
      end_time: rule.end_time,
      price_per_hour: rule.price_per_hour,
      priority: rule.priority,
    });
  };

  const close = () => {
    if (saving) return;
    setForm(null);
    setLocalError(null);
    setManualMode(false);
  };

  const toggleDay = (day: DayOfWeek) => {
    if (!form) return;
    const has = form.days.includes(day);
    setForm({
      ...form,
      days: has ? form.days.filter((d) => d !== day) : [...form.days, day],
    });
  };

  const selectEveryDay = () => {
    if (!form) return;
    setForm({ ...form, days: DAYS.map((d) => d.key) });
  };

  const clearDays = () => {
    if (!form) return;
    setForm({ ...form, days: [] });
  };

  const isInRange = (
    start: string,
    end: string,
    interval: { start_time: string; end_time: string }
  ): boolean => {
    if (!start) return false;
    if (!end || start === end || end === '00:00') {
      return interval.start_time >= start;
    }
    return interval.start_time >= start && interval.end_time <= end;
  };

  const handleSlotClick = (interval: { start_time: string; end_time: string }) => {
    if (!form) return;
    const s = form.start_time;
    const e = form.end_time;
    const clickedStart = interval.start_time;
    const clickedEnd = interval.end_time;

    if (!s) {
      setForm({ ...form, start_time: clickedStart, end_time: clickedEnd });
      return;
    }

    if (s === clickedStart && e === clickedEnd) {
      setForm({ ...form, start_time: '', end_time: '' });
      return;
    }

    if (clickedStart > s) {
      setForm({ ...form, start_time: s, end_time: clickedEnd });
      return;
    }

    if (clickedStart < s) {
      setForm({
        ...form,
        start_time: clickedStart,
        end_time: e || clickedEnd,
      });
      return;
    }

    setForm({ ...form, start_time: s, end_time: clickedEnd });
  };

  const selectWholeDay = () => {
    if (!form || allIntervals.length === 0) return;
    const first = allIntervals.reduce(
      (min, x) => (x.start_time < min.start_time ? x : min),
      allIntervals[0]
    );
    const last = allIntervals.reduce(
      (max, x) => (x.end_time > max.end_time ? x : max),
      allIntervals[0]
    );
    const finalEnd = last.end_time === '00:00' ? '00:00' : last.end_time;
    setForm({ ...form, start_time: first.start_time, end_time: finalEnd });
  };

  const selectMorning = () => {
    if (!form || morning.length === 0) return;
    const first = morning[0];
    const last = morning[morning.length - 1];
    setForm({ ...form, start_time: first.start_time, end_time: last.end_time });
  };

  const selectAfternoon = () => {
    if (!form || afternoon.length === 0) return;
    const first = afternoon[0];
    const last = afternoon[afternoon.length - 1];
    setForm({ ...form, start_time: first.start_time, end_time: last.end_time });
  };

  const selectEvening = () => {
    if (!form || evening.length === 0) return;
    const first = evening[0];
    const last = evening[evening.length - 1];
    const finalEnd = last.end_time === '00:00' ? '00:00' : last.end_time;
    setForm({ ...form, start_time: first.start_time, end_time: finalEnd });
  };

  const clearRange = () => {
    if (!form) return;
    setForm({ ...form, start_time: '', end_time: '' });
  };

  const handleSubmit = async () => {
    if (!form) return;
    setLocalError(null);

    if (!form.label.trim()) {
      setLocalError('Please enter a label (e.g. "Weekend All Day").');
      return;
    }
    if (!form.start_time || !form.end_time) {
      setLocalError('Please pick a start and end time.');
      return;
    }
    if (form.end_time !== '00:00' && form.end_time <= form.start_time) {
      setLocalError('End time must be after start time.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        label: form.label.trim(),
        days: form.days.join(','),
        start_time: form.start_time,
        end_time: form.end_time,
        price_per_hour: Number(form.price_per_hour) || 0,
        priority: Number(form.priority) || 0,
      };

      if (form.id) {
        await editPricingRule(form.id, payload);
      } else {
        await addPricingRule(courtId, payload);
      }
      setForm(null);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (rule: PricingRule) => {
    if (!confirm(`Delete pricing rule "${rule.label}"?`)) return;
    try {
      await removePricingRule(courtId, rule.id);
    } catch {
      // Handled in store
    }
  };

  const formatDays = (csv: string): string => {
    if (!csv.trim()) return 'Every day';
    const parts = csv.split(',').map((d) => d.trim().toLowerCase());
    if (parts.length === 7) return 'Every day';
    return parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(', ');
  };

  const formatRange = (start: string, end: string) => {
    const isMidnightEnd = end === '00:00';
    return `${formatTimeShort(start)} – ${isMidnightEnd ? '12:00 AM' : formatTimeShort(end)}`;
  };

  const renderSlotGroup = (
    title: string,
    icon: React.ReactNode,
    intervals: { start_time: string; end_time: string }[]
  ) => {
    if (intervals.length === 0) return null;
    return (
      <div key={title}>
        <div className="mb-2 flex items-center gap-2">
          {icon}
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#3D1164]">
            {title}
          </span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {intervals.map((it) => {
            const active = form ? isInRange(form.start_time, form.end_time, it) : false;
            return (
              <button
                key={`${it.start_time}-${it.end_time}`}
                type="button"
                onClick={() => handleSlotClick(it)}
                className={`flex h-9 items-center justify-center rounded-xl border px-1.5 text-[11px] font-bold tracking-tight transition-all active:scale-95 ${
                  active
                    ? 'border-[#FF7A00] bg-[#FF7A00] text-white shadow-xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-[#3D1164]/40 hover:bg-slate-50'
                }`}
              >
                {formatTimeShort(it.start_time)}–{formatTimeShort(it.end_time)}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="mt-5 border-t border-slate-200 pt-4 text-slate-900">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#3D1164]">
            Day-Based Pricing Rules
          </p>
          <p className="text-[11px] text-slate-500">
            Override the base rate for specific days and time windows.
          </p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          leftIcon={<Plus className="h-3.5 w-3.5" />}
          onClick={openCreate}
          className="bg-white border-slate-300 text-slate-800 hover:bg-slate-50"
        >
          Add Rule
        </Button>
      </div>

      {rules.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-5 text-center text-xs text-slate-500">
          No rules yet. Base and peak rates apply to all slots.
        </div>
      ) : (
        <div className="space-y-2">
          {rules
            .slice()
            .sort((a, b) => b.priority - a.priority)
            .map((rule) => (
              <div
                key={rule.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-xs hover:border-slate-300"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 shrink-0 text-[#FF7A00]" />
                    <span className="truncate text-sm font-bold text-slate-900">
                      {rule.label}
                    </span>
                    {rule.priority > 0 && (
                      <span className="rounded-md border border-purple-200 bg-purple-50 px-2 py-0.5 text-[9px] font-bold text-[#3D1164]">
                        P{rule.priority}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-500 font-medium">
                    {formatDays(rule.days)} · {formatTimeShort(rule.start_time)}–
                    {rule.end_time === '00:00' ? '12:00 AM' : formatTimeShort(rule.end_time)}
                  </p>
                </div>

                <div className="text-right">
                  <p className="font-display text-base font-extrabold text-[#FF7A00]">
                    {formatCurrency(rule.price_per_hour)}
                    <span className="text-[10px] font-normal text-slate-400">/hr</span>
                  </p>
                </div>

                <div className="flex gap-1.5">
                  <button
                    onClick={() => openEdit(rule)}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-600 transition hover:border-[#3D1164] hover:text-[#3D1164] active:scale-95 shadow-xs"
                    title="Edit rule"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(rule)}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-600 transition hover:border-rose-400 hover:text-rose-600 active:scale-95 shadow-xs"
                    title="Delete rule"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}

      {form && (
        <Modal
          isOpen={!!form}
          onClose={close}
          title={form.id ? 'Edit Pricing Rule' : 'Add Pricing Rule'}
          size="lg"
        >
          <div className="space-y-4">
            <Input
              label="Label"
              placeholder='e.g. "Weekend All Day", "Weekday Peak"'
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
            />

            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Days
                </p>
                <div className="flex gap-3 text-[11px] font-semibold">
                  <button
                    type="button"
                    onClick={selectEveryDay}
                    className="text-[#FF7A00] underline hover:text-[#E56600]"
                  >
                    Every day
                  </button>
                  <button
                    type="button"
                    onClick={clearDays}
                    className="text-slate-500 underline hover:text-slate-800"
                  >
                    Clear
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {DAYS.map((d) => {
                  const isSelected = form.days.includes(d.key);
                  return (
                    <button
                      key={d.key}
                      type="button"
                      onClick={() => toggleDay(d.key)}
                      className={`min-w-[52px] rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                        isSelected
                          ? 'border-[#3D1164] bg-[#3D1164] text-white shadow-xs'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-1.5 text-[11px] text-slate-500">
                Leave all unselected to apply this rule to <strong>every day</strong>.
              </p>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Time Range
                </p>
                <button
                  type="button"
                  onClick={() => setManualMode((m) => !m)}
                  className="text-[11px] font-semibold text-[#FF7A00] underline hover:text-[#E56600]"
                >
                  {manualMode ? 'Pick from slots' : 'Enter manually'}
                </button>
              </div>

              <div className="mb-3 rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
                <div className="flex items-center gap-2 text-xs">
                  <Clock className="h-4 w-4 shrink-0 text-[#FF7A00]" />
                  {form.start_time && form.end_time ? (
                    <span className="font-bold text-slate-900">
                      {formatRange(form.start_time, form.end_time)}
                    </span>
                  ) : (
                    <span className="text-slate-500">
                      Tap a slot to set the start, then tap later slots to extend.
                    </span>
                  )}
                </div>

                {!manualMode && allIntervals.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={selectWholeDay}
                      className="rounded-xl border border-purple-200 bg-purple-50 px-3 py-1 text-[11px] font-bold text-[#3D1164] transition hover:bg-purple-100"
                    >
                      Whole day
                    </button>
                    {morning.length > 0 && (
                      <button
                        type="button"
                        onClick={selectMorning}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50 shadow-xs"
                      >
                        Morning
                      </button>
                    )}
                    {afternoon.length > 0 && (
                      <button
                        type="button"
                        onClick={selectAfternoon}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50 shadow-xs"
                      >
                        Afternoon
                      </button>
                    )}
                    {evening.length > 0 && (
                      <button
                        type="button"
                        onClick={selectEvening}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50 shadow-xs"
                      >
                        Evening
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={clearRange}
                      className="rounded-xl border border-transparent px-3 py-1 text-[11px] font-semibold text-slate-500 hover:text-rose-600"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>

              {manualMode ? (
                <div className="grid gap-3.5 sm:grid-cols-2">
                  <Input
                    label="Start Time"
                    type="time"
                    value={form.start_time}
                    onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                  />
                  <Input
                    label="End Time"
                    type="time"
                    value={form.end_time}
                    onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                  />
                </div>
              ) : loadingSlots ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 py-6 text-center">
                  <LoadingSpinner />
                </div>
              ) : allIntervals.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-xs text-slate-500">
                  No time slots found for this court.{' '}
                  <button
                    type="button"
                    onClick={() => setManualMode(true)}
                    className="font-bold text-[#FF7A00] underline"
                  >
                    Enter manually
                  </button>
                </div>
              ) : (
                <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  {renderSlotGroup(
                    'Morning',
                    <CloudSun className="h-4 w-4 text-[#FF7A00]" />,
                    morning
                  )}
                  {renderSlotGroup(
                    'Afternoon',
                    <Sun className="h-4 w-4 text-[#FFA81A]" />,
                    afternoon
                  )}
                  {renderSlotGroup(
                    'Evening',
                    <Moon className="h-4 w-4 text-[#3D1164]" />,
                    evening
                  )}
                </div>
              )}
            </div>

            <div className="grid gap-3.5 sm:grid-cols-2">
              <Input
                label="Price per Hour"
                type="number"
                inputMode="decimal"
                min="0"
                value={form.price_per_hour === '' ? '' : form.price_per_hour}
                onChange={(e) => {
                  const raw = e.target.value;
                  setForm({
                    ...form,
                    price_per_hour: raw === '' ? '' : Number(raw),
                  });
                }}
                onFocus={(e) => e.target.select()}
                leftIcon={<span className="text-xs font-bold text-[#FF7A00]">₱</span>}
              />
              <Input
                label="Priority"
                type="number"
                inputMode="numeric"
                min="0"
                value={form.priority === '' ? '' : form.priority}
                onChange={(e) => {
                  const raw = e.target.value;
                  setForm({
                    ...form,
                    priority: raw === '' ? '' : Number(raw),
                  });
                }}
                onFocus={(e) => e.target.select()}
                hint="Higher wins on overlap. Default 0."
              />
            </div>

            {localError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 font-semibold">
                {localError}
              </div>
            )}

            <div className="flex flex-col gap-2 sm:flex-row sm:gap-3 pt-2">
              <Button
                size="md"
                fullWidth
                isLoading={saving}
                onClick={handleSubmit}
                className="bg-[#FF7A00] hover:bg-[#E56600] text-white font-bold"
              >
                {form.id ? 'Save Changes' : 'Create Rule'}
              </Button>
              <Button
                size="md"
                variant="ghost"
                fullWidth
                className="sm:w-auto"
                onClick={close}
                disabled={saving}
              >
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}