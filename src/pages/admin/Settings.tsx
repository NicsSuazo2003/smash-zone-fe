import { useEffect, useState } from 'react';
import {
  Settings as SettingsIcon,
  CalendarOff,
  CalendarDays,
  Plus,
  Trash2,
  Save,
  Building2,
  Lock,
  CheckCircle2,
  AlertCircle,
  Wallet,
  QrCode,
  Smartphone,
  Banknote,
  Edit3,
  Image as ImageIcon,
  Loader2,
  Sparkles,
  CloudSun,
  Sun,
  Moon,
  Power,
} from 'lucide-react';

import { AdminLayout } from '@/components/layout/AdminLayout';
import { StaffLayout } from '@/components/layout/StaffLayout';
import { useClientStore } from '@/stores/clientStore';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useAdminStore } from '@/stores/adminStore';
import { useAuthStore } from '@/stores/authStore';
import { adminService } from '@/services/adminService';
import { courtService } from '@/services/courtService';
import {
  formatDateLong,
  formatTimeRange,
  todayISO,
  toISODate,
  addDays,
  describeAdvanceWindow,
} from '@/utils/format';
import { APP_CONFIG } from '@/utils/constants';
import type { ClientSettings, PaymentMethod, AmenityItem, TimeSlot } from '@/types';
import { StaffManagement } from '@/components/ui/StaffManagement';
import { Modal } from '@/components/ui/Modal';
import {
  LUCIDE_ICON_OPTIONS,
  getAmenityIconForItem,
} from '@/utils/amenityIcons';

const PAYMENT_TYPE_OPTIONS = [
  { value: 'gcash', label: 'GCash', icon: '📱' },
  { value: 'qr_ph', label: 'QR Ph (Bank QR)', icon: '📷' },
  { value: 'bank_transfer', label: 'Bank Transfer', icon: '🏦' },
  { value: 'e_wallet', label: 'E-Wallet', icon: '💳' },
  { value: 'other', label: 'Other', icon: '🔗' },
];

const ICON_OPTIONS = [
  { value: 'Smartphone', icon: Smartphone },
  { value: 'QrCode', icon: QrCode },
  { value: 'Banknote', icon: Banknote },
  { value: 'Wallet', icon: Wallet },
  { value: 'Building2', icon: Building2 },
];

export function Settings() {
  const { user } = useAuthStore();

  const courts = useAdminStore((state) => state.courts);
  const loadingCourts = useAdminStore((state) => state.loadingCourts);
  const blockedDates = useAdminStore((state) => state.blockedDates);

  const loadCourts = useAdminStore((state) => state.loadCourts);
  const loadBlockedDates = useAdminStore((state) => state.loadBlockedDates);
  const addBlockedDate = useAdminStore((state) => state.addBlockedDate);
  const removeBlockedDate = useAdminStore((state) => state.removeBlockedDate);

  const { updateProfile, changePassword } = useAuthStore();

  const [selectedCourtId, setSelectedCourtId] = useState<string>('');
  const [blockDate, setBlockDate] = useState(toISODate(addDays(new Date(), 7)));
  const [blockReason, setBlockReason] = useState('');
  const [isFullDay, setIsFullDay] = useState(true);

  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedSlotIds, setSelectedSlotIds] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [profileName, setProfileName] = useState(user?.name ?? '');
  const [profileEmail, setProfileEmail] = useState(user?.email ?? '');
  const [profilePhone, setProfilePhone] = useState(user?.phone ?? '');
  const [savingProfile, setSavingProfile] = useState(false);

  const [profileMsg, setProfileMsg] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const [passwordMsg, setPasswordMsg] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [savingMethod, setSavingMethod] = useState(false);

  const [methodMsg, setMethodMsg] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const [amenities, setAmenities] = useState<AmenityItem[]>([]);
  const [editingAmenityIdx, setEditingAmenityIdx] = useState<number | null>(null);
  const [draftAmenity, setDraftAmenity] = useState<AmenityItem>({
    name: '',
    icon: 'Sparkles',
    description: '',
  });
  const [savingAmenities, setSavingAmenities] = useState(false);
  const [amenitiesMsg, setAmenitiesMsg] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const [maxAdvanceDays, setMaxAdvanceDays] = useState<number>(90);
  const [savingBookingWindow, setSavingBookingWindow] = useState(false);
  const [bookingWindowMsg, setBookingWindowMsg] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const [bookingsEnabled, setBookingsEnabled] = useState<boolean>(true);
  const [savingBookingsEnabled, setSavingBookingsEnabled] = useState(false);
  const [bookingsEnabledMsg, setBookingsEnabledMsg] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const [uploadingQR, setUploadingQR] = useState(false);

  const [formData, setFormData] = useState<Partial<PaymentMethod>>({
    name: '',
    type: 'other',
    icon: 'Smartphone',
    enabled: true,
    config: {
      account_name: '',
      account_number: '',
      qr_image_url: '',
      instructions: '',
    },
  });

  const [clientSettings, setClientSettings] = useState<ClientSettings | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    loadCourts();
    loadPaymentMethods();

    (async () => {
      try {
        const settings = await adminService.getSettings();
        setClientSettings(settings);
        setAmenities(settings.available_amenities ?? []);
        setMaxAdvanceDays(settings.max_advance_booking_days ?? 90);
        setBookingsEnabled(settings.bookings_enabled ?? true);
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        setLoadingSettings(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (selectedCourtId) {
      loadBlockedDates(selectedCourtId);
    }
  }, [selectedCourtId, loadBlockedDates]);

  useEffect(() => {
    if (!selectedCourtId || !blockDate) return;

    let cancelled = false;
    setLoadingSlots(true);
    setSelectedSlotIds([]);

    (async () => {
      try {
        const result = await courtService.getAvailability(selectedCourtId, blockDate);
        if (!cancelled) setSlots(result);
      } catch {
        if (!cancelled) setSlots([]);
      } finally {
        if (!cancelled) setLoadingSlots(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedCourtId, blockDate]);

  useEffect(() => {
    if (courts.length > 0 && !selectedCourtId) {
      setSelectedCourtId(courts[0]?.id || '');
    }
  }, [courts, selectedCourtId]);

  useEffect(() => {
    setProfileName(user?.name ?? '');
    setProfileEmail(user?.email ?? '');
    setProfilePhone(user?.phone ?? '');
  }, [user]);

  const loadPaymentMethods = async () => {
    setLoadingPaymentMethods(true);
    try {
      const settings = await adminService.getSettings();
      if (settings.payment_methods && settings.payment_methods.length > 0) {
        setPaymentMethods(settings.payment_methods);
      } else {
        setPaymentMethods([
          {
            id: '1',
            name: 'GCash',
            type: 'gcash',
            icon: 'Smartphone',
            enabled: true,
            config: {
              account_name: APP_CONFIG.paymentAccountName || 'Smash Zone Recreational Hub',
              account_number: APP_CONFIG.paymentNumber || '09XX XXX XXXX',
            },
            sort_order: 0,
          },
        ]);
      }
    } catch (error) {
      console.error('Failed to load payment methods:', error);
    } finally {
      setLoadingPaymentMethods(false);
    }
  };

  const savePaymentMethods = async (methods: PaymentMethod[]) => {
    try {
      await adminService.updateSettings({ payment_methods: methods });
      setPaymentMethods(methods);
      return true;
    } catch (error) {
      setMethodMsg({ type: 'error', text: 'Failed to save payment methods' });
      return false;
    }
  };

  const handleQrUpload = async (file: File): Promise<string | null> => {
    setUploadingQR(true);
    setMethodMsg(null);
    try {
      const uploadData = new FormData();
      uploadData.append('file', file);
      const token = localStorage.getItem('admin_token');
      const baseUrl = import.meta.env.VITE_API_BASE_URL ?? APP_CONFIG.apiUrl;

      const response = await fetch(`${baseUrl}/api/files/upload`, {
        method: 'POST',
        headers: {
          'X-Client-Subdomain': import.meta.env.VITE_CLIENT_SUBDOMAIN ?? 'smashzone',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: uploadData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      const imageUrl = data.url;

      if (imageUrl) {
        setFormData({
          ...formData,
          config: { ...formData.config, qr_image_url: imageUrl },
        });
        setMethodMsg({ type: 'success', text: 'QR code uploaded successfully!' });
        return imageUrl;
      }
      throw new Error('No URL returned from upload');
    } catch (error) {
      setMethodMsg({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to upload QR code',
      });
      return null;
    } finally {
      setUploadingQR(false);
    }
  };

  const handleAddMethod = async () => {
    if (!formData.name?.trim()) {
      setMethodMsg({ type: 'error', text: 'Payment method name is required.' });
      return;
    }

    setSavingMethod(true);
    setMethodMsg(null);

    const newMethod: PaymentMethod = {
      id: Date.now().toString(),
      name: formData.name.trim(),
      type: (formData.type as PaymentMethod['type']) || 'other',
      icon: formData.icon || 'Smartphone',
      enabled: formData.enabled !== undefined ? formData.enabled : true,
      config: {
        account_name: formData.config?.account_name || '',
        account_number: formData.config?.account_number || '',
        qr_image_url: formData.config?.qr_image_url || '',
        instructions: formData.config?.instructions || '',
      },
      sort_order: paymentMethods.length,
    };

    const updated = [...paymentMethods, newMethod];
    const success = await savePaymentMethods(updated);

    if (success) {
      setMethodMsg({ type: 'success', text: `"${newMethod.name}" added successfully.` });
      setShowAddModal(false);
      resetForm();
      await loadPaymentMethods();
    }
    setSavingMethod(false);
  };

  const handleEditMethod = async () => {
    if (!editingMethod) return;
    if (!formData.name?.trim()) {
      setMethodMsg({ type: 'error', text: 'Payment method name is required.' });
      return;
    }

    setSavingMethod(true);
    setMethodMsg(null);

    const updatedMethod: PaymentMethod = {
      ...editingMethod,
      name: formData.name.trim(),
      type: (formData.type as PaymentMethod['type']) || editingMethod.type,
      icon: formData.icon || editingMethod.icon,
      enabled: formData.enabled !== undefined ? formData.enabled : editingMethod.enabled,
      config: {
        account_name: formData.config?.account_name ?? editingMethod.config?.account_name ?? '',
        account_number: formData.config?.account_number ?? editingMethod.config?.account_number ?? '',
        qr_image_url: formData.config?.qr_image_url ?? editingMethod.config?.qr_image_url ?? '',
        instructions: formData.config?.instructions ?? editingMethod.config?.instructions ?? '',
      },
    };

    const updated = paymentMethods.map((method) =>
      method.id === editingMethod.id ? updatedMethod : method
    );

    const success = await savePaymentMethods(updated);
    if (success) {
      setMethodMsg({ type: 'success', text: `"${updatedMethod.name}" updated successfully.` });
      setEditingMethod(null);
      resetForm();
      await loadPaymentMethods();
    }
    setSavingMethod(false);
  };

  const handleToggleMethod = async (id: string) => {
    const method = paymentMethods.find((m) => m.id === id);
    if (!method) return;
    const updated = paymentMethods.map((m) =>
      m.id === id ? { ...m, enabled: !m.enabled } : m
    );
    await savePaymentMethods(updated);
    setPaymentMethods(updated);
  };

  const handleDeleteMethod = async (id: string) => {
    const method = paymentMethods.find((m) => m.id === id);
    if (!method) return;
    if (!confirm(`Remove "${method.name}" from payment options?`)) return;

    const updated = paymentMethods.filter((m) => m.id !== id);
    const success = await savePaymentMethods(updated);
    if (success) {
      setPaymentMethods(updated);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'other',
      icon: 'Smartphone',
      enabled: true,
      config: {
        account_name: '',
        account_number: '',
        qr_image_url: '',
        instructions: '',
      },
    });
    setMethodMsg(null);
  };

  const handleEditClick = (method: PaymentMethod) => {
    setEditingMethod(method);
    setFormData({
      name: method.name,
      type: method.type,
      icon: method.icon,
      enabled: method.enabled,
      config: { ...method.config },
    });
    setMethodMsg(null);
  };

  const toggleSlot = (slotId: string) => {
    setSelectedSlotIds((prev) =>
      prev.includes(slotId) ? prev.filter((id) => id !== slotId) : [...prev, slotId]
    );
  };

  const handleAddBlock = async () => {
    if (!selectedCourtId || !blockDate) return;

    if (!isFullDay && selectedSlotIds.length === 0) {
      alert('Please select at least one time slot to block.');
      return;
    }

    const payload: any = {
      court_id: selectedCourtId,
      date: blockDate,
      reason: blockReason || 'Maintenance',
    };

    if (!isFullDay && selectedSlotIds.length > 0) {
      const selectedSlots = slots.filter((s) => selectedSlotIds.includes(s.id));
      const sorted = selectedSlots.sort((a, b) => a.start_time.localeCompare(b.start_time));
      const first = sorted[0];
      const last = sorted[sorted.length - 1];

      payload.startTime = first.start_time.slice(0, 5);
      payload.endTime = last.end_time.slice(0, 5);
    }

    try {
      await addBlockedDate(payload);
      if (selectedCourtId) {
        await loadBlockedDates(selectedCourtId);
      }
      setBlockReason('');
      setSelectedSlotIds([]);
      setIsFullDay(true);
    } catch (err) {
      alert('Failed to block date.');
    }
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      await updateProfile({
        name: profileName,
        email: profileEmail,
        phone: profilePhone,
      });
      setProfileMsg({ type: 'success', text: 'Profile updated successfully.' });
    } catch (err) {
      setProfileMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to update profile.',
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordMsg(null);
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Please fill in all password fields.' });
      return;
    }
    if (newPassword.length < 8) {
      setPasswordMsg({ type: 'error', text: 'New password must be at least 8 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'New password and confirmation do not match.' });
      return;
    }

    setSavingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      setPasswordMsg({ type: 'success', text: 'Password changed successfully.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to change password.',
      });
    } finally {
      setSavingPassword(false);
    }
  };

  const resetDraftAmenity = () => {
    setDraftAmenity({ name: '', icon: 'Sparkles', description: '' });
  };

  const addAmenity = () => {
    const trimmed = draftAmenity.name.trim();

    if (!trimmed) {
      setAmenitiesMsg({ type: 'error', text: 'Amenity name is required.' });
      return;
    }

    if (trimmed.includes(',')) {
      setAmenitiesMsg({ type: 'error', text: 'Amenity names cannot contain commas.' });
      return;
    }

    if (amenities.some((a) => a.name.toLowerCase() === trimmed.toLowerCase())) {
      setAmenitiesMsg({ type: 'error', text: `"${trimmed}" is already in the list.` });
      return;
    }

    setAmenities([
      ...amenities,
      {
        name: trimmed,
        icon: draftAmenity.icon || 'Sparkles',
        description: (draftAmenity.description ?? '').trim(),
      },
    ]);
    resetDraftAmenity();
    setAmenitiesMsg(null);
  };

  const updateAmenity = (idx: number, patch: Partial<AmenityItem>) => {
    setAmenities(amenities.map((a, i) => (i === idx ? { ...a, ...patch } : a)));
  };

  const removeAmenity = (idx: number) => {
    const amenity = amenities[idx];
    if (!amenity) return;

    setAmenities(amenities.filter((_, i) => i !== idx));
    if (editingAmenityIdx === idx) setEditingAmenityIdx(null);
    setAmenitiesMsg(null);
  };

  const saveAmenities = async () => {
    setSavingAmenities(true);
    setAmenitiesMsg(null);
    try {
      await adminService.updateSettings({ available_amenities: amenities });
      setAmenitiesMsg({ type: 'success', text: 'Amenities saved.' });
      await loadCourts();
    } catch (err) {
      setAmenitiesMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to save amenities.',
      });
    } finally {
      setSavingAmenities(false);
    }
  };

  const saveBookingWindow = async () => {
    setSavingBookingWindow(true);
    setBookingWindowMsg(null);
    try {
      await adminService.updateSettings({
        max_advance_booking_days: maxAdvanceDays,
      });
      setBookingWindowMsg({ type: 'success', text: 'Booking window saved.' });
    } catch (err) {
      setBookingWindowMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to save booking window.',
      });
    } finally {
      setSavingBookingWindow(false);
    }
  };

  const filteredBlocked = selectedCourtId
    ? blockedDates.filter((b) => b.court_id === selectedCourtId)
    : blockedDates;

  const selectedCourt = courts.find((c) => c.id === selectedCourtId);
  const Layout = user?.role === 'staff' ? StaffLayout : AdminLayout;

  const renderSlotGrid = () => {
    if (loadingSlots)
      return (
        <div className="py-6 text-center text-xs text-slate-400">
          <Loader2 className="mx-auto h-5 w-5 animate-spin" />
        </div>
      );
    if (slots.length === 0)
      return <p className="text-xs text-slate-500 py-2">No slots available for this court.</p>;

    const morning = slots.filter((s) => parseInt(s.start_time.split(':')[0]) < 12);
    const afternoon = slots.filter(
      (s) =>
        parseInt(s.start_time.split(':')[0]) >= 12 &&
        parseInt(s.start_time.split(':')[0]) < 17
    );
    const evening = slots.filter((s) => parseInt(s.start_time.split(':')[0]) >= 17);

    const renderGroup = (title: string, icon: React.ReactNode, group: TimeSlot[]) => {
      if (group.length === 0) return null;
      return (
        <div className="mb-3">
          <div className="mb-1.5 flex items-center gap-2">
            {icon}
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#3D1164]">
              {title}
            </span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
            {group.map((slot) => {
              const isSelected = selectedSlotIds.includes(slot.id);
              return (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => toggleSlot(slot.id)}
                  className={`rounded-xl border p-2 text-[11px] font-bold transition-all shadow-xs ${
                    isSelected
                      ? 'border-[#3D1164] bg-[#3D1164] text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {formatTimeRange(slot.start_time, slot.end_time)}
                </button>
              );
            })}
          </div>
        </div>
      );
    };

    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        {renderGroup('Morning', <CloudSun className="h-4 w-4 text-[#FF7A00]" />, morning)}
        {renderGroup('Afternoon', <Sun className="h-4 w-4 text-[#FFA81A]" />, afternoon)}
        {renderGroup('Evening', <Moon className="h-4 w-4 text-[#3D1164]" />, evening)}
      </div>
    );
  };

  return (
    <Layout>
      <div className="container-page py-6 sm:py-8 text-slate-900">
        <div className="mb-6 sm:mb-8">
          <h1 className="font-display text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
            Settings
          </h1>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">
            Manage your staff account, payment options, and court maintenance blocks
          </p>
        </div>

        {loadingCourts ? (
          <LoadingSpinner className="py-16" />
        ) : (
          <div className="space-y-6">
            {/* Account Info */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
              <h2 className="mb-4 flex items-center gap-2 font-display text-base font-bold text-slate-900 sm:text-lg">
                <SettingsIcon className="h-5 w-5 text-[#3D1164]" />
                Account Profile
              </h2>

              <div className="grid gap-4 sm:grid-cols-3">
                <Input
                  label="Display Name"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                />
                <Input
                  label="Email Address"
                  type="email"
                  value={profileEmail}
                  onChange={(e) => setProfileEmail(e.target.value)}
                />
                <Input
                  label="Mobile Number"
                  value={profilePhone}
                  onChange={(e) => setProfilePhone(e.target.value)}
                />
              </div>

              {profileMsg && (
                <div
                  className={`mt-4 flex items-center gap-2 rounded-xl border p-3 text-xs font-semibold ${
                    profileMsg.type === 'success'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : 'border-rose-200 bg-rose-50 text-rose-800'
                  }`}
                >
                  {profileMsg.type === 'success' ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                  )}
                  {profileMsg.text}
                </div>
              )}

              <div className="mt-5 border-t border-slate-100 pt-4">
                <Button
                  leftIcon={<Save className="h-4 w-4" />}
                  isLoading={savingProfile}
                  onClick={handleSaveProfile}
                  className="bg-[#3D1164] hover:bg-[#5A1B91] text-white font-bold"
                >
                  Save Profile
                </Button>
              </div>
            </div>

            {/* Change Password */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
              <h2 className="mb-4 flex items-center gap-2 font-display text-base font-bold text-slate-900 sm:text-lg">
                <Lock className="h-5 w-5 text-[#3D1164]" />
                Change Password
              </h2>

              <div className="grid gap-4 sm:grid-cols-3">
                <Input
                  label="Current Password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
                <Input
                  label="New Password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  hint="At least 8 characters"
                />
                <Input
                  label="Confirm Password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              {passwordMsg && (
                <div
                  className={`mt-4 flex items-center gap-2 rounded-xl border p-3 text-xs font-semibold ${
                    passwordMsg.type === 'success'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : 'border-rose-200 bg-rose-50 text-rose-800'
                  }`}
                >
                  {passwordMsg.type === 'success' ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                  )}
                  {passwordMsg.text}
                </div>
              )}

              <div className="mt-5 border-t border-slate-100 pt-4">
                <Button
                  variant="secondary"
                  leftIcon={<Save className="h-4 w-4" />}
                  isLoading={savingPassword}
                  onClick={handleChangePassword}
                  className="bg-white border-slate-300 text-slate-800"
                >
                  Update Password
                </Button>
              </div>
            </div>

            {/* Venue Amenities */}
            {isAdmin && (
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
                <div className="mb-4">
                  <h2 className="flex items-center gap-2 font-display text-base font-bold text-slate-900 sm:text-lg">
                    <Sparkles className="h-5 w-5 text-[#FF7A00]" />
                    Venue Amenities
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
                    Amenities displayed to customers on the landing page.
                  </p>
                </div>

                {amenities.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 py-8 text-center">
                    <Sparkles className="mx-auto h-8 w-8 text-slate-300" />
                    <p className="mt-2 text-sm font-semibold text-slate-600">No amenities yet.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {amenities.map((amenity, idx) => {
                      const Icon = getAmenityIconForItem(amenity);
                      const isEditing = editingAmenityIdx === idx;

                      return (
                        <div
                          key={`${amenity.name}-${idx}`}
                          className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5"
                        >
                          {isEditing ? (
                            <div className="space-y-3">
                              <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
                                <Input
                                  label="Name"
                                  value={amenity.name}
                                  onChange={(e) => updateAmenity(idx, { name: e.target.value })}
                                />
                                <div>
                                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">
                                    Icon
                                  </label>
                                  <select
                                    value={amenity.icon}
                                    onChange={(e) => updateAmenity(idx, { icon: e.target.value })}
                                    className="w-full rounded-2xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:border-[#3D1164]"
                                  >
                                    {LUCIDE_ICON_OPTIONS.map((opt) => (
                                      <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>

                              <Textarea
                                label="Description (landing page)"
                                rows={2}
                                value={amenity.description ?? ''}
                                onChange={(e) => updateAmenity(idx, { description: e.target.value })}
                              />

                              <div className="flex justify-end gap-2">
                                <Button size="sm" variant="ghost" onClick={() => setEditingAmenityIdx(null)}>
                                  Done
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  leftIcon={<Trash2 className="h-4 w-4" />}
                                  onClick={() => removeAmenity(idx)}
                                >
                                  Remove
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-[#3D1164]">
                                <Icon className="h-5 w-5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-bold text-slate-900">
                                  {amenity.name}
                                </p>
                                <p className="truncate text-xs text-slate-500">
                                  {amenity.description || 'No description provided'}
                                </p>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setEditingAmenityIdx(idx)}
                                  className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50"
                                >
                                  <Edit3 className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeAmenity(idx)}
                                  className="rounded-xl border border-slate-200 bg-white p-2 text-rose-600 hover:bg-rose-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="mt-4 space-y-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#3D1164]">
                    Add New Amenity
                  </p>
                  <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
                    <Input
                      label="Name"
                      placeholder="e.g. Air Conditioned Lounge, Pro Shop"
                      value={draftAmenity.name}
                      onChange={(e) => setDraftAmenity({ ...draftAmenity, name: e.target.value })}
                    />
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">
                        Icon
                      </label>
                      <select
                        value={draftAmenity.icon}
                        onChange={(e) => setDraftAmenity({ ...draftAmenity, icon: e.target.value })}
                        className="w-full rounded-2xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:border-[#3D1164]"
                      >
                        {LUCIDE_ICON_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <Textarea
                    label="Description"
                    rows={2}
                    placeholder="Short description for guests..."
                    value={draftAmenity.description ?? ''}
                    onChange={(e) => setDraftAmenity({ ...draftAmenity, description: e.target.value })}
                  />
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      onClick={addAmenity}
                      disabled={!draftAmenity.name.trim()}
                      leftIcon={<Plus className="h-4 w-4" />}
                      className="bg-[#FF7A00] hover:bg-[#E56600] text-white font-bold"
                    >
                      Add
                    </Button>
                  </div>
                </div>

                <div className="mt-5 flex justify-end border-t border-slate-100 pt-4">
                  <Button
                    size="md"
                    isLoading={savingAmenities}
                    leftIcon={<Save className="h-4 w-4" />}
                    onClick={saveAmenities}
                    className="bg-[#3D1164] hover:bg-[#5A1B91] text-white font-bold"
                  >
                    Save Amenities
                  </Button>
                </div>
              </div>
            )}

            {/* Master Online Bookings Toggle */}
            {isAdmin && (
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="flex items-center gap-2 font-display text-base font-bold text-slate-900 sm:text-lg">
                      <Power className="h-5 w-5 text-[#FF7A00]" />
                      Online Booking System
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
                      Master switch for customer bookings. When off, guests see &quot;Bookings temporarily closed&quot;.
                      Staff can always create manual reservations.
                    </p>
                  </div>

                  <label className="relative inline-flex shrink-0 cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={bookingsEnabled}
                      onChange={async (e) => {
                        const next = e.target.checked;
                        const prev = bookingsEnabled;
                        setBookingsEnabled(next);
                        setSavingBookingsEnabled(true);
                        setBookingsEnabledMsg(null);
                        try {
                          await adminService.updateSettings({ bookings_enabled: next });
                          useClientStore.getState().setBookingsEnabled(next);
                          setBookingsEnabledMsg({
                            type: 'success',
                            text: next ? 'Online bookings OPEN.' : 'Online bookings CLOSED.',
                          });
                        } catch (err) {
                          setBookingsEnabled(prev);
                          setBookingsEnabledMsg({
                            type: 'error',
                            text: 'Failed to update system state.',
                          });
                        } finally {
                          setSavingBookingsEnabled(false);
                        }
                      }}
                      className="peer sr-only"
                      disabled={savingBookingsEnabled}
                    />
                    <div className="peer h-7 w-12 rounded-full border border-slate-300 bg-slate-200 transition-all after:absolute after:top-[2px] after:left-[2px] after:h-6 after:w-6 after:rounded-full after:bg-white after:shadow-sm after:transition-all peer-checked:bg-[#FF7A00] peer-checked:after:translate-x-5" />
                  </label>
                </div>

                <div
                  className={`flex items-center gap-2 rounded-2xl border p-3.5 text-xs font-semibold ${
                    bookingsEnabled
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : 'border-amber-200 bg-amber-50 text-amber-800'
                  }`}
                >
                  {bookingsEnabled ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                  )}
                  {bookingsEnabled
                    ? 'Customers can reserve courts online.'
                    : 'Online customer booking is temporarily disabled.'}
                </div>
              </div>
            )}

            {/* Advance Booking Window */}
            {isAdmin && (
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
                <div className="mb-4">
                  <h2 className="flex items-center gap-2 font-display text-base font-bold text-slate-900 sm:text-lg">
                    <CalendarDays className="h-5 w-5 text-[#3D1164]" />
                    Booking Window
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
                    How far ahead customers can reserve. Use 0 for unlimited days.
                  </p>
                </div>

                <div className="grid gap-4 sm:max-w-md">
                  <Input
                    label="Max Advance Booking (days)"
                    type="number"
                    min={0}
                    max={365}
                    value={String(maxAdvanceDays)}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setMaxAdvanceDays(Number.isNaN(v) ? 0 : Math.max(0, Math.min(365, v)));
                    }}
                    hint="e.g. 90 = customers can book up to ~3 months ahead."
                  />
                </div>

                <p className="mt-3 text-xs text-slate-500 font-medium">
                  Currently:{' '}
                  <span className="font-bold text-[#3D1164]">
                    {describeAdvanceWindow(maxAdvanceDays)}
                  </span>
                </p>

                <div className="mt-4 flex justify-end border-t border-slate-100 pt-4">
                  <Button
                    size="md"
                    isLoading={savingBookingWindow}
                    leftIcon={<Save className="h-4 w-4" />}
                    onClick={saveBookingWindow}
                    className="bg-[#3D1164] hover:bg-[#5A1B91] text-white font-bold"
                  >
                    Save Booking Window
                  </Button>
                </div>
              </div>
            )}

            {/* Payment Methods */}
            {isAdmin && (
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="flex items-center gap-2 font-display text-base font-bold text-slate-900 sm:text-lg">
                      <Wallet className="h-5 w-5 text-[#FF7A00]" />
                      Payment Options (GCash / QR Ph)
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
                      Accounts and QR codes shown to customers during checkout
                    </p>
                  </div>

                  <Button
                    size="sm"
                    leftIcon={<Plus className="h-4 w-4" />}
                    onClick={() => {
                      resetForm();
                      setShowAddModal(true);
                    }}
                    className="bg-[#FF7A00] hover:bg-[#E56600] text-white font-bold"
                  >
                    Add Method
                  </Button>
                </div>

                {loadingPaymentMethods ? (
                  <LoadingSpinner className="py-8" />
                ) : (
                  <div className="space-y-3">
                    {paymentMethods
                      .sort((a, b) => a.sort_order - b.sort_order)
                      .map((method) => (
                        <div
                          key={method.id}
                          className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="flex items-center gap-3.5">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-[#FF7A00]">
                              <Smartphone className="h-5 w-5" />
                            </div>

                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-slate-900 text-sm sm:text-base">
                                  {method.name}
                                </p>
                                <span
                                  className={`rounded-full px-2.5 py-0.5 text-[9px] font-black ${
                                    method.enabled
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-slate-200 text-slate-500'
                                  }`}
                                >
                                  {method.enabled ? 'Active' : 'Disabled'}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {method.config?.account_name && (
                                  <span>{method.config.account_name} · </span>
                                )}
                                {method.config?.account_number && (
                                  <span className="font-mono font-bold text-[#3D1164]">
                                    {method.config.account_number}
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-3">
                            <label className="relative inline-flex cursor-pointer items-center">
                              <input
                                type="checkbox"
                                checked={method.enabled}
                                onChange={() => handleToggleMethod(method.id)}
                                className="peer sr-only"
                              />
                              <div className="peer h-6 w-11 rounded-full border border-slate-300 bg-slate-200 transition-all after:absolute after:top-[2px] after:left-[2px] after:h-5 after:after:w-5 after:rounded-full after:bg-white after:shadow-xs after:transition-all peer-checked:bg-[#FF7A00] peer-checked:after:translate-x-full" />
                            </label>

                            <button
                              onClick={() => handleEditClick(method)}
                              className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-100 shadow-xs"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteMethod(method.id)}
                              className="rounded-xl border border-slate-200 bg-white p-2 text-rose-600 hover:bg-rose-50 shadow-xs"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* Blocked Dates */}
            {isAdmin && (
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
                <h2 className="mb-2 flex items-center gap-2 font-display text-base font-bold text-slate-900 sm:text-lg">
                  <CalendarOff className="h-5 w-5 text-[#3D1164]" />
                  Blocked Dates & Maintenance
                </h2>
                <p className="mb-4 text-xs text-slate-500 sm:text-sm">
                  Block courts for tournaments, private reservations, or surface maintenance
                </p>

                <div className="mb-4">
                  <div className="flex flex-wrap gap-2">
                    {courts.map((court) => {
                      if (!court) return null;
                      const isSelected = selectedCourtId === court.id;
                      return (
                        <button
                          key={court.id}
                          onClick={() => {
                            setSelectedCourtId(court.id);
                            loadBlockedDates(court.id);
                          }}
                          className={`flex items-center gap-1.5 rounded-2xl border px-3.5 py-2 text-xs font-bold transition shadow-xs ${
                            isSelected
                              ? 'border-[#3D1164] bg-[#3D1164] text-white'
                              : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <Building2 className="h-3.5 w-3.5" />
                          {court.name || 'Court'}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mb-5 grid gap-3.5 sm:grid-cols-2">
                  <Input
                    label="Date to Block"
                    type="date"
                    min={todayISO()}
                    value={blockDate}
                    onChange={(e) => setBlockDate(e.target.value)}
                  />
                  <div className="flex items-end">
                    <label className="flex w-full items-center gap-2 rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-xs font-bold text-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isFullDay}
                        onChange={(e) => {
                          setIsFullDay(e.target.checked);
                          if (e.target.checked) setSelectedSlotIds([]);
                        }}
                        className="h-4 w-4 rounded border-slate-300 accent-[#3D1164] cursor-pointer"
                      />
                      <span>Full Day Block</span>
                    </label>
                  </div>
                </div>

                {!isFullDay && (
                  <div className="mb-5">
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                      Select Time Slots to Block
                    </label>
                    {renderSlotGrid()}
                  </div>
                )}

                <div className="mb-5">
                  <Input
                    label="Reason"
                    placeholder="e.g. Tournament, Maintenance"
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value)}
                  />
                </div>

                <Button
                  leftIcon={<Plus className="h-4 w-4" />}
                  onClick={handleAddBlock}
                  disabled={!blockDate || !selectedCourtId}
                  className="bg-[#3D1164] hover:bg-[#5A1B91] text-white font-bold"
                >
                  Block Date
                </Button>

                <div className="mt-6 space-y-2.5 border-t border-slate-100 pt-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#3D1164]">
                    {selectedCourt ? `${selectedCourt.name} — ` : ''}Active Blocks
                  </p>

                  {filteredBlocked.length === 0 ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 py-6 text-center text-xs text-slate-400">
                      No blocked dates scheduled for this court.
                    </div>
                  ) : (
                    filteredBlocked.map((block) => (
                      <div
                        key={block.id}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <div>
                          <p className="text-sm font-bold text-slate-900">
                            {formatDateLong(block.date)}
                          </p>
                          <p className="text-xs text-slate-500">{block.reason}</p>
                        </div>
                        <button
                          onClick={() => removeBlockedDate(block.id)}
                          className="rounded-xl border border-slate-200 bg-white p-2 text-rose-600 hover:bg-rose-50 shadow-xs"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Staff Management */}
            {isAdmin && <StaffManagement />}

            {/* System Info */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
              <h2 className="mb-4 font-display text-base font-bold text-slate-900 sm:text-lg">
                System Information
              </h2>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Platform
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-900">{APP_CONFIG.fullName}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Established
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-900">
                    Est. {APP_CONFIG.established}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Developer
                  </p>
                  <p className="mt-1 text-sm font-bold text-[#FF7A00]">
                    {APP_CONFIG.developer}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Method Modal */}
      <Modal
        isOpen={showAddModal || !!editingMethod}
        onClose={() => {
          setShowAddModal(false);
          setEditingMethod(null);
          resetForm();
        }}
        title={editingMethod ? `Edit ${editingMethod.name}` : 'Add Payment Method'}
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Payment Method Name"
            placeholder="e.g. GCash, Maya, BPI QR Ph"
            value={formData.name || ''}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />

          <div className="grid gap-3.5 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">
                Payment Type
              </label>
              <select
                value={formData.type || 'other'}
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value as PaymentMethod['type'] })
                }
                className="w-full rounded-2xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:border-[#3D1164]"
              >
                {PAYMENT_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.icon} {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">
                Display Icon
              </label>
              <select
                value={formData.icon || 'Smartphone'}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                className="w-full rounded-2xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:border-[#3D1164]"
              >
                {ICON_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.value}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 space-y-3.5">
            <p className="text-xs font-bold uppercase tracking-wider text-[#3D1164]">
              Account Details
            </p>

            <Input
              label="Account Holder Name"
              placeholder="e.g. Smash Zone by Jerjen"
              value={formData.config?.account_name || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  config: { ...formData.config, account_name: e.target.value },
                })
              }
            />

            {(formData.type === 'gcash' || formData.type === 'e_wallet') && (
              <Input
                label="Account Number"
                placeholder="09XX XXX XXXX"
                value={formData.config?.account_number || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    config: { ...formData.config, account_number: e.target.value },
                  })
                }
              />
            )}

            {(formData.type === 'qr_ph' || formData.type === 'gcash') && (
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  QR Code Image
                  {uploadingQR && (
                    <Loader2 className="ml-2 inline h-4 w-4 animate-spin text-[#FF7A00]" />
                  )}
                </label>

                {formData.config?.qr_image_url ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-col items-center gap-3 sm:flex-row">
                      <img
                        src={formData.config.qr_image_url}
                        alt="QR Code"
                        className="h-24 w-24 rounded-xl border border-slate-200 object-contain bg-white p-1 shadow-xs"
                      />
                      <div>
                        <p className="text-xs font-bold text-emerald-700">QR Code Linked ✓</p>
                        <button
                          type="button"
                          onClick={() =>
                            setFormData({
                              ...formData,
                              config: { ...formData.config, qr_image_url: '' },
                            })
                          }
                          className="mt-1 text-xs font-bold text-rose-600 underline"
                        >
                          Remove QR
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-5 text-center">
                    <ImageIcon className="mx-auto h-8 w-8 text-slate-400" />
                    <label className="mt-3 inline-block cursor-pointer">
                      <span className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-800 shadow-xs hover:bg-slate-50">
                        {uploadingQR ? 'Uploading...' : 'Choose QR Image'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingQR}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) await handleQrUpload(file);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </div>
                )}
              </div>
            )}

            <Textarea
              label="Checkout Instructions (optional)"
              rows={2}
              placeholder="e.g. Include your booking reference code in the transaction notes..."
              value={formData.config?.instructions || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  config: { ...formData.config, instructions: e.target.value },
                })
              }
            />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:gap-3 pt-3">
            <Button
              size="md"
              fullWidth
              isLoading={savingMethod}
              leftIcon={<Save className="h-4 w-4" />}
              onClick={editingMethod ? handleEditMethod : handleAddMethod}
              className="bg-[#FF7A00] hover:bg-[#E56600] text-white font-bold"
            >
              {editingMethod ? 'Save Changes' : 'Add Payment Method'}
            </Button>
            <Button
              size="md"
              variant="ghost"
              fullWidth
              className="sm:w-auto"
              onClick={() => {
                setShowAddModal(false);
                setEditingMethod(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </Layout>
  );
}