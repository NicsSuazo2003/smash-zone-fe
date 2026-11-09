// src/pages/Login.tsx
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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-charcoal">
      <div className="absolute inset-0">
        <img
          src={COURT_IMAGES.hero}
          alt=""
          className="h-full w-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-neutral-950 via-neutral-950/90 to-charcoal" />
        <div className="absolute inset-0 bg-grid opacity-20" />
      </div>

      <div className="relative z-10 w-full max-w-md px-4">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-2 text-sm text-cream-muted hover:text-accent-400 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-8"
        >
          <div className="mb-6 text-center">
            <div className="flex justify-center">
              <Logo size="2xl" to="" withText={false} />
            </div>
            <h1 className="mt-3 font-display text-lg font-bold text-cream">
              Admin Portal
            </h1>
            <p className="mt-1 text-xs text-cream-muted">
              Sign in to manage bookings
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="admin@smashpoint.com"
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
              <div className="flex items-center gap-2 rounded-lg bg-error/10 p-3 text-sm text-error">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {formError ?? error}
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              fullWidth
              isLoading={loading}
              leftIcon={<Shield className="h-5 w-5" />}
            >
              Sign In
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}