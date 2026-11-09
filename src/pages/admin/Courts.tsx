import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, Edit3, Save } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Modal } from '@/components/ui/Modal';
import { useAdminStore } from '@/stores/adminStore';
import { formatCurrency } from '@/utils/format';
import type { Court } from '@/types';
import { ImageUpload } from '@/components/ui/ImageUpload';

export function Courts() {
  const courts = useAdminStore((state) => state.courts);
  const loadingCourts = useAdminStore((state) => state.loadingCourts);
  const loadCourts = useAdminStore((state) => state.loadCourts);
  const updateCourt = useAdminStore((state) => state.updateCourt);

  const [editing, setEditing] = useState<Court | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCourts();
  }, [loadCourts]);

  const startEditing = (court: Court) => {
    setEditing({ ...court });
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await updateCourt(editing);
      setEditing(null);
    } catch {
      // Store surfaces the error.
    } finally {
      setSaving(false);
    }
  };

  const getImageUrl = (court: Court): string => {
    return (
      court?.image ||
      court?.image_url ||
      'https://images.pexels.com/photos/17299530/pexels-photo-17299530.jpeg?auto=compress&cs=tinysrgb&w=1200'
    );
  };

  return (
    <AdminLayout>
      <div className="container-page py-6 sm:py-8 text-cream">
        <div className="mb-6 sm:mb-8">
          <h1 className="font-display text-2xl font-bold tracking-tight text-cream sm:text-3xl">
            Courts Management
          </h1>
          <p className="mt-1 text-xs text-cream-muted sm:text-sm">
            Manage court details, operating hours, and images. Pricing is on the{' '}
            <Link
              to="/admin/pricing"
              className="text-accent-400 underline hover:text-accent-300"
            >
              Pricing page
            </Link>
            .
          </p>
        </div>

        {loadingCourts ? (
          <LoadingSpinner className="py-16" />
        ) : courts.length === 0 ? (
          <div className="card rounded-2xl border border-neutral-700 bg-neutral-900/60 py-12 text-center shadow-xl backdrop-blur-sm">
            <Building2 className="mx-auto h-12 w-12 text-cream-muted/40" />
            <p className="mt-4 text-sm font-medium text-cream-muted">No courts found.</p>
            <p className="text-xs text-cream-muted/60">
              Configure your venue courts to get started.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
            {courts.map((court, i) => {
              if (!court) return null;

              return (
                <motion.div
                  key={court.id || `court-${i}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="card rounded-2xl border border-neutral-700 bg-neutral-900/80 overflow-hidden shadow-xl backdrop-blur-sm transition-all hover:border-primary-400/50 flex flex-col justify-between"
                >
                  <div>
                    <div className="relative h-40 overflow-hidden sm:h-44">
                      <img
                        src={getImageUrl(court)}
                        alt={court?.name || 'Court'}
                        className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'https://images.pexels.com/photos/17299530/pexels-photo-17299530.jpeg?auto=compress&cs=tinysrgb&w=1200';
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-transparent" />
                      <div className="absolute bottom-3 left-3">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            court?.is_active
                              ? 'border border-accent-400/40 bg-accent-500/20 text-accent-300'
                              : 'border border-red-500/40 bg-red-500/20 text-red-400'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              court?.is_active ? 'bg-accent-400' : 'bg-red-400'
                            }`}
                          />
                          {court?.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>

                    <div className="p-4 sm:p-5">
                      <h3 className="font-display text-base font-bold text-cream sm:text-lg">
                        {court?.name || 'Unnamed Court'}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-xs text-cream-muted leading-relaxed">
                        {court?.description || 'No description provided.'}
                      </p>

                      <div className="mt-4 rounded-xl border border-neutral-700 bg-neutral-950/40 p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-cream-muted">
                          Current Rates
                        </p>
                        <p className="mt-1 text-sm font-extrabold text-accent-400">
                          {formatCurrency(court?.price_per_hour || 0)}
                          <span className="text-[10px] font-normal text-cream-muted">
                            /hr base
                          </span>
                        </p>
                        <Link
                          to="/admin/pricing"
                          className="mt-1.5 inline-block text-[10px] text-accent-400 underline hover:text-accent-300"
                        >
                          Edit on Pricing page →
                        </Link>
                      </div>

                      <div className="mt-3 text-[11px] font-medium text-cream-muted">
                        Operating Hours:{' '}
                        <span className="text-cream">
                          {court?.open_time || 'N/A'} – {court?.close_time || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 pt-0 sm:p-5 sm:pt-0">
                    <Button
                      size="sm"
                      variant="secondary"
                      fullWidth
                      leftIcon={<Edit3 className="h-3.5 w-3.5" />}
                      onClick={() => court && startEditing(court)}
                      disabled={!court}
                    >
                      Edit Court Details
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {editing && (
        <Modal
          isOpen={!!editing}
          onClose={() => setEditing(null)}
          title={`Edit ${editing?.name || 'Court'}`}
          size="lg"
        >
          <div className="space-y-4">
            <Input
              label="Court Name"
              value={editing?.name || ''}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
            />

            <Textarea
              label="Description"
              rows={2}
              value={editing?.description || ''}
              onChange={(e) => setEditing({ ...editing, description: e.target.value })}
            />

            <div className="grid gap-3.5 sm:grid-cols-2">
              <Input
                label="Opening Time"
                type="time"
                value={editing?.open_time || '08:00'}
                onChange={(e) => setEditing({ ...editing, open_time: e.target.value })}
              />
              <Input
                label="Closing Time"
                type="time"
                value={editing?.close_time || '22:00'}
                onChange={(e) => setEditing({ ...editing, close_time: e.target.value })}
              />
            </div>

            <ImageUpload
              label="Court Image"
              value={editing?.image || editing?.image_url || ''}
              onChange={(url) => setEditing({ ...editing, image: url, image_url: url })}
              folder="courts"
            />

            <Input
              label="Surface Type"
              placeholder="e.g. Acrylic Sport Coating, Concrete"
              value={editing?.surface || ''}
              onChange={(e) => setEditing({ ...editing, surface: e.target.value })}
            />

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center pt-1">
              <label className="flex items-center gap-2 text-xs font-semibold text-cream cursor-pointer">
                <input
                  type="checkbox"
                  checked={editing?.is_indoor || false}
                  onChange={(e) => setEditing({ ...editing, is_indoor: e.target.checked })}
                  className="h-4 w-4 rounded border-neutral-600 bg-neutral-950 accent-primary-500 cursor-pointer"
                />
                Indoor Court
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold text-cream cursor-pointer">
                <input
                  type="checkbox"
                  checked={editing?.is_active || false}
                  onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
                  className="h-4 w-4 rounded border-neutral-600 bg-neutral-950 accent-primary-500 cursor-pointer"
                />
                Active (Bookable by public)
              </label>
            </div>

            <div className="rounded-xl border border-primary-500/30 bg-primary-500/10 p-3 text-xs text-cream-muted">
              <strong className="text-primary-200">Pricing is not edited here.</strong>{' '}
              To change rates or add day-based rules, go to the{' '}
              <Link
                to="/admin/pricing"
                className="font-semibold text-primary-300 underline hover:text-primary-200"
              >
                Pricing page
              </Link>
              .
            </div>

            <div className="sticky bottom-0 -mx-4 -mb-4 mt-5 border-t border-neutral-700 bg-neutral-900/95 p-4 backdrop-blur-sm sm:static sm:mx-0 sm:mb-0 sm:bg-transparent sm:p-0 sm:pt-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
                <Button
                  size="md"
                  fullWidth
                  isLoading={saving}
                  leftIcon={<Save className="h-4 w-4" />}
                  onClick={handleSave}
                >
                  Save Changes
                </Button>
                <Button
                  size="md"
                  variant="ghost"
                  fullWidth
                  className="sm:w-auto"
                  onClick={() => setEditing(null)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </AdminLayout>
  );
}