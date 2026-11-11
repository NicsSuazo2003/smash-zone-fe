import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, AlertCircle, CheckCircle2, ArrowLeft, Shield } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { apiRequest, ApiError } from '@/services/api';
import { COURT_IMAGES } from '@/utils/constants';

export function ResetPassword() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const token = params.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Missing reset token. Please use the link from your email.');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError('Missing reset token. Please use the link from your email.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await apiRequest('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword: password }),
      });
      setSuccess(true);
      setTimeout(() => navigate('/login', { replace: true }), 2500);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.userMessage
          : err instanceof Error
            ? err.message
            : 'Could not reset password. Please try again.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 text-slate-900">
        <div className="absolute inset-0 pointer-events-none">
          <img
            src={COURT_IMAGES.hero}
            alt=""
            className="h-full w-full object-cover opacity-10"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-white via-white/80 to-slate-100" />
        </div>
        <div className="relative z-10 w-full max-w-md px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl"
          >
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 shadow-xs">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h1 className="font-display text-2xl font-black uppercase tracking-wider text-slate-900">
              Password Reset
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Your password has been changed. Redirecting to sign in…
            </p>
            <Button
              size="md"
              to="/login"
              className="mt-5 bg-[#3D1164] hover:bg-[#5A1B91] text-white font-bold"
            >
              Go to sign in
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 text-slate-900">
      <div className="absolute inset-0 pointer-events-none">
        <img
          src={COURT_IMAGES.hero}
          alt=""
          className="h-full w-full object-cover opacity-10"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-white via-white/80 to-slate-100" />
      </div>

      <div className="relative z-10 w-full max-w-md px-4 py-8">
        <Link
          to="/login"
          className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-[#FF7A00] transition hover:text-[#E56600]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to sign in
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8"
        >
          <div className="mb-6 text-center">
            <div className="flex justify-center">
              <Logo size="xl" to="" withText={false} />
            </div>
            <h1 className="mt-4 font-display text-2xl font-black uppercase tracking-wider text-slate-900">
              Set a New Password
            </h1>
            <p className="mt-1 text-xs text-slate-500 font-medium">
              Choose a strong password of at least 8 characters.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="New password"
              type="password"
              placeholder="••••••••"
              leftIcon={<Lock className="h-4 w-4" />}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
            <Input
              label="Confirm password"
              type="password"
              placeholder="••••••••"
              leftIcon={<Lock className="h-4 w-4" />}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />

            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              fullWidth
              isLoading={submitting}
              disabled={!token}
              leftIcon={<Shield className="h-5 w-5" />}
              className="bg-[#3D1164] hover:bg-[#5A1B91] text-white font-black"
            >
              Reset password
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}