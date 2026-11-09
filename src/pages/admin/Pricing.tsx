import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Tag, Save } from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { PricingRulesEditor } from '@/components/ui/PricingRulesEditor';
import { useAdminStore } from '@/stores/adminStore';
import { formatCurrency } from '@/utils/format';
import type { Court } from '@/types';

interface BaseRateForm {
  court_id: string;
  base_price: number | '';
}

export function Pricing() {
  const courts = useAdminStore((state) => state.courts);
  const loadingCourts = useAdminStore((state) => state.loadingCourts);
  const loadCourts = useAdminStore((state) => state.loadCourts);
  const updateCourt = useAdminStore((state) => state.updateCourt);

  const [baseRates, setBaseRates] = useState<Record<string, BaseRateForm>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    loadCourts();
  }, [loadCourts]);

  useEffect(() => {
    setBaseRates((prev) => {
      const next: Record<string, BaseRateForm> = {};
      courts.forEach((c) => {
        if (!c) return;
        next[c.id] =
          prev[c.id] ?? {
            court_id: c.id,
            base_price: c.price_per_hour ?? 0,
          };
      });
      return next;
    });
  }, [courts]);

  const updateBaseRate = (
    courtId: string,
    field: keyof BaseRateForm,
    value: string | number
  ) => {
    setBaseRates((prev) => ({
      ...prev,
      [courtId]: { ...prev[courtId], [field]: value },
    }));
  };

  const handleNumericChange = (
    courtId: string,
    field: keyof BaseRateForm,
    raw: string
  ) => {
    if (raw === '') {
      updateBaseRate(courtId, field, '');
      return;
    }
    const n = Number(raw);
    if (!Number.isNaN(n)) updateBaseRate(courtId, field, n);
  };

  const handleSave = async (court: Court) => {
    if (!court) return;
    const form = baseRates[court.id];
    if (!form) return;

    setSavingId(court.id);
    try {
      await updateCourt({
        ...court,
        price_per_hour: Number(form.base_price) || 0,
      });

      const updated = useAdminStore.getState().courts.find((c) => c.id === court.id);
      if (updated) {
        setBaseRates((prev) => ({
          ...prev,
          [court.id]: {
            ...prev[court.id],
            base_price: updated.price_per_hour ?? 0,
          },
        }));
      }
    } catch {
      // Store surfaces the error.
    } finally {
      setSavingId(null);
    }
  };

  return (
    <AdminLayout>
      <div className="container-page py-6 sm:py-8 text-cream">
        <div className="mb-6 sm:mb-8">
          <h1 className="font-display text-2xl font-bold tracking-tight text-cream sm:text-3xl">
            Pricing Rules
          </h1>
          <p className="mt-1 text-xs text-cream-muted sm:text-sm">
            Set a base rate per court, then add rules for specific days and time windows.
          </p>
        </div>

        {loadingCourts ? (
          <LoadingSpinner className="py-16" />
        ) : courts.length === 0 ? (
          <div className="card rounded-2xl border border-neutral-700 bg-neutral-900/60 py-12 text-center shadow-xl backdrop-blur-sm">
            <Tag className="mx-auto h-12 w-12 text-cream-muted/40" />
            <p className="mt-4 text-sm font-medium text-cream-muted">
              No courts available to configure.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {courts.map((court, i) => {
              if (!court) return null;
              const form = baseRates[court.id];
              if (!form) return null;
              const baseRate = form.base_price === '' ? 0 : Number(form.base_price) || 0;

              return (
                <motion.div
                  key={court.id || `court-${i}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="card rounded-2xl border border-neutral-700 bg-neutral-900/80 p-5 shadow-xl backdrop-blur-sm sm:p-6"
                >
                  <div className="mb-5 flex items-center gap-3.5">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary-400/30 bg-primary-500/20 text-primary-300 shadow-inner">
                      <Tag className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-display text-lg font-bold text-cream">
                        {court?.name || 'Unnamed Court'}
                      </h3>
                      <p className="text-xs text-cream-muted">
                        Base rate: ₱{baseRate.toFixed(2)}/hr
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-neutral-700 bg-neutral-950/40 p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-primary-300">
                          Base Rate
                        </p>
                        <p className="text-[11px] text-cream-muted">
                          Applies to any slot that doesn't match a rule below.
                        </p>
                      </div>
                    </div>
                    <div className="max-w-xs">
                      <Input
                        label=""
                        type="number"
                        inputMode="decimal"
                        min="0"
                        value={form.base_price === '' ? '' : form.base_price}
                        onChange={(e) =>
                          handleNumericChange(court.id, 'base_price', e.target.value)
                        }
                        onFocus={(e) => e.target.select()}
                        leftIcon={
                          <span className="text-xs font-bold text-accent-400">₱</span>
                        }
                      />
                    </div>
                  </div>

                  <PricingRulesEditor courtId={court.id} />

                  <div className="mt-5 border-t border-neutral-700 pt-4">
                    <Button
                      size="sm"
                      leftIcon={<Save className="h-4 w-4" />}
                      isLoading={savingId === court.id}
                      disabled={savingId !== null && savingId !== court.id}
                      onClick={() => handleSave(court)}
                    >
                      Save Base Rate
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        <div className="mt-6 card rounded-2xl border border-primary-500/40 bg-neutral-900/90 p-5 sm:p-6 shadow-xl backdrop-blur-sm">
          <div className="mb-2 flex items-center gap-2 text-primary-300">
            <Tag className="h-5 w-5" />
            <h3 className="font-display text-lg font-bold text-cream">
              How pricing works
            </h3>
          </div>
          <ul className="mt-3 space-y-2 text-xs leading-relaxed text-cream-muted sm:text-sm">
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-300" />
              <span>
                <strong className="text-cream">Base rate</strong> is the price per hour
                for any slot that doesn't match a rule.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-300" />
              <span>
                <strong className="text-cream">Rules</strong> override the base rate for
                specific days and time windows — e.g. weekday evenings, weekends, holidays.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-300" />
              <span>
                When multiple rules overlap, the one with{' '}
                <strong className="text-cream">higher priority</strong> wins. Rules with
                equal priority resolve by earliest start time.
              </span>
            </li>
          </ul>
        </div>
      </div>
    </AdminLayout>
  );
}