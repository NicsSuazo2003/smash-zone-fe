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
      // Store captures error
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
      <div className="container-page py-6 sm:py-8 text-slate-900">
        <div className="mb-6 sm:mb-8">
          <h1 className="font-display text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
            Courts Management
          </h1>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">
            Manage court details, hours, and photos. Set hourly rates on the{' '}
            <Link
              to="/admin/pricing"
              className="font-bold text-[#FF7A00] underline hover:text-[#E56600]"
            >
              Pricing page
            </Link>
            .
          </p>
        </div>

        {loadingCourts ? (
          <LoadingSpinner className="py-16" />
        ) : courts.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white py-12 text-center shadow-xs">
            <Building2 className="mx-auto h-12 w-12 text-slate-300" />
            <p className="mt-4 text-sm font-bold text-slate-800">No courts found.</p>
            <p className="text-xs text-slate-500">Configure venue courts to get started.</p>
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
                  className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-xs transition hover:shadow-md flex flex-col justify-between"
                >
                  <div>
                    <div className="relative h-44 overflow-hidden bg-slate-100">
                      <img
                        src={getImageUrl(court)}
                        alt={court?.name || 'Court'}
                        className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'https://images.pexels.com/photos/17299530/pexels-photo-17299530.jpeg?auto=compress&cs=tinysrgb&w=1200';
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      <div className="absolute bottom-3 left-3">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black ${
                            court?.is_active
                              ? 'bg-emerald-500 text-white shadow-xs'
                              : 'bg-rose-500 text-white shadow-xs'
                          }`}
                        >
                          {court?.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>

                    <div className="p-5">
                      <h3 className="font-display text-lg font-bold text-slate-900">
                        {court?.name || 'Unnamed Court'}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-xs text-slate-500 leading-relaxed">
                        {court?.description || 'No description provided.'}
                      </p>

                      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Current Rates
                        </p>
                        <p className="mt-1 text-base font-black text-[#FF7A00]">
                          {formatCurrency(court?.price_per_hour || 0)}
                          <span className="text-[10px] font-medium text-slate-500"> /hr base</span>
                        </p>
                        <Link
                          to="/admin/pricing"
                          className="mt-1.5 inline-block text-[11px] font-bold text-[#3D1164] underline"
                        >
                          Edit on Pricing page →
                        </Link>
                      </div>

                      <div className="mt-3 text-xs font-semibold text-slate-500">
                        Playing Hours:{' '}
                        <span className="text-slate-900 font-bold">
                          {court?.open_time || 'N/A'} – {court?.close_time || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 pt-0">
                    <Button
                      size="sm"
                      variant="secondary"
                      fullWidth
                      leftIcon={<Edit3 className="h-4 w-4" />}
                      onClick={() => court && startEditing(court)}
                      disabled={!court}
                      className="bg-white border-slate-300 text-slate-800"
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
              placeholder="e.g. Pro Acrylic Sport Coating"
              value={editing?.surface || ''}
              onChange={(e) => setEditing({ ...editing, surface: e.target.value })}
            />

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center pt-1">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editing?.is_indoor || false}
                  onChange={(e) => setEditing({ ...editing, is_indoor: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 accent-[#3D1164] cursor-pointer"
                />
                Indoor Court
              </label>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editing?.is_active || false}
                  onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 accent-[#3D1164] cursor-pointer"
                />
                Active (Bookable online)
              </label>
            </div>

            <div className="rounded-2xl border border-purple-200 bg-purple-50 p-3.5 text-xs text-slate-700">
              <strong className="text-[#3D1164]">Hourly rates are managed on the Pricing page.</strong>{' '}
              <Link to="/admin/pricing" className="font-bold text-[#FF7A00] underline">
                Go to Pricing
              </Link>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:gap-3 pt-2">
              <Button
                size="md"
                fullWidth
                isLoading={saving}
                leftIcon={<Save className="h-4 w-4" />}
                onClick={handleSave}
                className="bg-[#FF7A00] hover:bg-[#E56600] text-white font-bold"
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
        </Modal>
      )}
    </AdminLayout>
  );
}