// src/components/layout/AdminLayout.tsx
import { type ReactNode, useState } from 'react';
import { Link, useLocation, Navigate } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarDays,
  Building2,
  Tag,
  Settings,
  LogOut,
  Menu,
  X,
  Users,
  Shield,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/stores/authStore';
import { Logo } from '@/components/Logo';

const navItems = [
  { path: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { path: '/admin/bookings', label: 'Bookings', icon: CalendarDays },
  { path: '/admin/courts', label: 'Courts', icon: Building2 },
  { path: '/admin/pricing', label: 'Pricing', icon: Tag },
  { path: '/admin/security-logs', label: 'Security Logs', icon: Shield },
  { path: '/admin/settings', label: 'Settings', icon: Settings },
];

export function AdminSidebar() {
  const location = useLocation();
  const { user, logout } = useAuthStore();

  return (
    <div className="flex h-full flex-col bg-neutral-900 text-cream">
      <div className="border-b border-neutral-700 px-6 py-5">
        <Logo size="sm" to="/admin" />
      </div>

      <nav className="flex-1 space-y-1.5 px-3 py-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.end
            ? location.pathname === item.path
            : location.pathname.startsWith(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                active
                  ? 'border border-primary-400/40 bg-primary-500/20 text-primary-300 shadow-glow-blue'
                  : 'border border-transparent text-cream-muted hover:border-neutral-700 hover:bg-neutral-800/60 hover:text-cream'
              }`}
            >
              <Icon
                className={`h-5 w-5 ${
                  active ? 'text-primary-300' : 'text-cream-muted'
                }`}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-neutral-700 p-4">
        <div className="mb-3 flex items-center gap-3 rounded-xl border border-neutral-700 bg-neutral-950/70 p-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary-400/40 bg-primary-500 text-sm font-black text-white shadow-sm">
            {(user?.name ?? 'A')[0].toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-cream">
              {user?.name ?? 'Admin'}
            </p>
            <p className="truncate text-xs text-cream-muted">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex w-full items-center gap-2 rounded-xl border border-transparent px-4 py-2.5 text-sm font-medium text-cream-muted transition hover:border-error/30 hover:bg-error/10 hover:text-error"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}

export function AdminLayout({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user?.role === 'staff') {
    return <Navigate to="/staff/bookings" replace />;
  }

  if (user?.role !== 'admin') {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-charcoal text-cream">
      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-64 border-r border-neutral-700 bg-neutral-900 shadow-xl lg:block">
        <AdminSidebar />
      </aside>

      {/* Mobile sidebar drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-40 bg-neutral-950/80 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed left-0 top-0 z-50 h-screen w-64 border-r border-neutral-700 bg-neutral-900 shadow-2xl lg:hidden"
            >
              <AdminSidebar />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="lg:pl-64">
        {/* Mobile top bar */}
        <div className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-neutral-700 bg-neutral-900/95 px-4 backdrop-blur-md lg:hidden">
          <Logo size="sm" to="/admin" />
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="rounded-lg border border-neutral-700 bg-neutral-800/80 p-2 text-cream transition hover:border-primary-400 hover:text-primary-300"
            aria-label="Toggle Navigation"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        <main className="min-h-screen">{children}</main>
      </div>
    </div>
  );
}