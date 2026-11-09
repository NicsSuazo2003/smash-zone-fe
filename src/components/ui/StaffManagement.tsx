import { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Trash2,
  Mail,
  Phone,
  User,
  AlertCircle,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { adminService } from '@/services/adminService';
import { apiRequest } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';

interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  createdAt: string;
}

export function StaffManagement() {
  const { user } = useAuthStore();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  const isAdmin = user?.role === 'admin';

  const loadStaff = async () => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest<any>('/api/admin/staff');
      const data = Array.isArray(res) ? res : res?.data || [];
      setStaff(data);
    } catch (err) {
      if (isAdmin) {
        setError(err instanceof Error ? err.message : 'Failed to load staff');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStaff();
  }, [isAdmin]);

  if (!isAdmin) {
    return null;
  }

  const handleAddStaff = async () => {
    setError(null);
    setSuccess(null);

    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }
    if (!formData.email.trim()) {
      setError('Email is required');
      return;
    }
    if (!formData.password || formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setSaving(true);
    try {
      await adminService.createStaff({
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        password: formData.password,
      });
      setSuccess('Staff member added successfully!');
      setFormData({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
      setShowAddModal(false);
      await loadStaff();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add staff');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      await adminService.updateStaffStatus(userId, newStatus);
      await loadStaff();
      setSuccess(`Staff member ${newStatus === 'active' ? 'activated' : 'suspended'}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update staff status');
    }
  };

  const handleDeleteStaff = async (userId: string, name: string) => {
    if (!confirm(`Remove ${name} from staff?`)) return;
    try {
      await adminService.deleteStaff(userId);
      await loadStaff();
      setSuccess('Staff member removed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove staff');
    }
  };

  return (
    <div className="card p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-display text-lg font-bold uppercase tracking-wider text-white">
            <Users className="h-5 w-5 text-primary-500" />
            Staff Management
          </h2>
          <p className="mt-0.5 text-xs text-cream-muted">
            Add and manage staff members who can verify payments and manage bookings
          </p>
        </div>
        <Button
          size="sm"
          leftIcon={<UserPlus className="h-4 w-4" />}
          onClick={() => setShowAddModal(true)}
        >
          Add Staff
        </Button>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-primary-500/30 bg-primary-500/10 p-3 text-xs text-primary-400 font-medium">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-accent-500/30 bg-accent-500/10 p-3 text-xs text-accent-400 font-medium">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {success}
        </div>
      )}

      {loading ? (
        <LoadingSpinner className="py-12" />
      ) : staff.length === 0 ? (
        <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 py-12 text-center">
          <Users className="mx-auto h-10 w-10 text-cream-muted/30" />
          <p className="mt-3 text-sm font-medium text-cream-muted">No staff members registered.</p>
          <p className="text-xs text-cream-muted/60">Click "Add Staff" to create an account.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-neutral-800">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-800 bg-neutral-950/80 text-[11px] uppercase tracking-wider text-cream-muted">
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Phone</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Joined</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/80 bg-neutral-900/60">
              {staff.map((member) => (
                <tr key={member.id} className="transition hover:bg-neutral-800/40">
                  <td className="px-4 py-3 font-medium text-white">{member.name}</td>
                  <td className="px-4 py-3 text-xs text-cream-muted">{member.email}</td>
                  <td className="px-4 py-3 text-xs text-cream-muted">{member.phone || '—'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                        member.status === 'active'
                          ? 'border border-accent-500/40 bg-accent-500/10 text-accent-400'
                          : 'border border-primary-500/40 bg-primary-500/10 text-primary-400'
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          member.status === 'active' ? 'bg-accent-500' : 'bg-primary-500'
                        }`}
                      />
                      {member.status === 'active' ? 'Active' : 'Suspended'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-cream-muted">
                    {new Date(member.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleUpdateStatus(member.id, member.status)}
                        className="rounded-lg border border-neutral-700 bg-neutral-800 px-2.5 py-1 text-xs text-cream-muted transition hover:border-primary-500 hover:text-white"
                      >
                        {member.status === 'active' ? 'Suspend' : 'Activate'}
                      </button>
                      <button
                        onClick={() => handleDeleteStaff(member.id, member.name)}
                        className="rounded-lg border border-neutral-700 bg-neutral-800 p-1.5 text-cream-muted transition hover:border-primary-500 hover:text-primary-400"
                        aria-label={`Remove ${member.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Staff Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Staff Member"
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Full Name"
            placeholder="Juan Dela Cruz"
            leftIcon={<User className="h-4 w-4" />}
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <Input
            label="Email Address"
            type="email"
            placeholder="staff@smashpoint.com"
            leftIcon={<Mail className="h-4 w-4" />}
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
          <Input
            label="Phone Number"
            placeholder="0917 123 4567"
            leftIcon={<Phone className="h-4 w-4" />}
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
          <Input
            label="Password"
            type="password"
            placeholder="At least 8 characters"
            leftIcon={<Lock className="h-4 w-4" />}
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          />
          <Input
            label="Confirm Password"
            type="password"
            placeholder="Confirm password"
            leftIcon={<Lock className="h-4 w-4" />}
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
          />

          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-primary-500/30 bg-primary-500/10 p-3 text-xs text-primary-400 font-medium">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-3 border-t border-neutral-800 pt-4">
            <Button
              fullWidth
              isLoading={saving}
              leftIcon={<UserPlus className="h-4 w-4" />}
              onClick={handleAddStaff}
            >
              Add Staff Member
            </Button>
            <Button variant="ghost" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}