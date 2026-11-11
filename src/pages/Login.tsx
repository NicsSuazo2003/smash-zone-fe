import { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, AlertCircle, ArrowLeft, Shield } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/stores/authStore';
import { ApiError } from '@/services/api';
import { ADMIN_CREDENTIALS, COURT_IMAGES } from '@/utils/constants';

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const { login, loading, error, isAuthenticated, initializing } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const from =
    params.get('next') ??
    (location.state as { from?: { pathname: string } })?.from?.pathname ??
    '/admin';

  useEffect(() => {
    if (!initializing && isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, initializing, navigate, from]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!email.trim() || !password.trim()) {
      setFormError('Please enter both email and password');
      return;
    }
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.userMessage);
      } else if (err instanceof Error) {
        setFormError(err.message);
      } else {
        setFormError('Invalid email or password');
      }
    }
  };

  const fillDemo = () => {
    setEmail(ADMIN_CREDENTIALS.email);
    setPassword(ADMIN_CREDENTIALS.password);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 text-slate-900">
      {/* Subtle Light Court Background Accent */}
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
          to="/"
          className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-[#FF7A00] transition hover:text-[#E56600]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
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
              Staff Portal
            </h1>
            <p className="mt-1 text-xs text-slate-500 font-medium">
              Sign in to manage Smash Zone bookings & courts
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="admin@smashzone.com"
              leftIcon={<Mail className="h-4 w-4" />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              leftIcon={<Lock className="h-4 w-4" />}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />

            {(formError || error) && (
              <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError ?? error}</span>
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              fullWidth
              isLoading={loading}
              leftIcon={<Shield className="h-5 w-5" />}
              className="bg-[#3D1164] hover:bg-[#5A1B91] text-white font-black"
            >
              Sign In
            </Button>
          </form>

          {import.meta.env.DEV && (
            <div className="mt-5 border-t border-slate-200 pt-4 text-center">
              <button
                type="button"
                onClick={fillDemo}
                className="text-xs font-semibold text-[#FF7A00] underline hover:text-[#E56600]"
              >
                Auto-fill admin demo credentials
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}