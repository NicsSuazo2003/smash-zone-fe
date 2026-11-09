// src/components/layout/Navbar.tsx
import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, CalendarPlus, Shield, Mail, ArrowRight } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/Button';
import { useClientStore } from '@/stores/clientStore';
import { bookingService } from '@/services/bookingService';

interface NavLink {
  label: string;
  path: string;
  badge?: number;
}

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hasPending, setHasPending] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const loadSettings = useClientStore((state) => state.loadSettings);
  const contactEmail = 'smashpoint@gmail.com';
  const mailtoHref = `mailto:${contactEmail}`;

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 15);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  // Check unpaid pending reservation state
  useEffect(() => {
    let cancelled = false;

    const checkPending = async () => {
      const savedRef = localStorage.getItem('pendingBookingRef');
      if (!savedRef) {
        if (!cancelled) setHasPending(false);
        return;
      }

      try {
        const booking = await bookingService.trackBooking(savedRef);
        if (cancelled) return;

        if (booking.status === 'pending_payment') {
          setHasPending(true);
        } else {
          localStorage.removeItem('pendingBookingRef');
          setHasPending(false);
        }
      } catch {
        if (cancelled) return;
        setHasPending(false);
      }
    };

    checkPending();

    const onVisibility = () => {
      if (document.visibilityState === 'visible') checkPending();
    };
    document.addEventListener('visibilitychange', onVisibility);

    const onUpdate = () => checkPending();
    window.addEventListener('pendingBookingUpdated', onUpdate);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pendingBookingUpdated', onUpdate);
    };
  }, [location.pathname]);

  const navLinks: NavLink[] = [
    { label: 'Home', path: '/' },
    { label: 'My Bookings', path: '/my-bookings', badge: hasPending ? 1 : 0 },
    { label: 'Track Booking', path: '/track' },
  ];

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[#0A0D12]/95 backdrop-blur-md shadow-2xl border-b border-neutral-800/80 py-0'
          : 'bg-[#0A0D12]/75 backdrop-blur-sm border-b border-transparent py-1'
      }`}
    >
      <nav className="container-page flex h-16 items-center justify-between md:h-20">
        <Logo size="nav" />

        {/* Desktop Navigation Links */}
        <div className="hidden items-center gap-1.5 rounded-full border border-neutral-800/80 bg-neutral-900/60 px-3 py-1.5 backdrop-blur-md md:flex">
          {navLinks.map((link) => {
            const showDot = (link.badge ?? 0) > 0;
            const active = isActive(link.path);

            return (
              <Link
                key={link.path}
                to={link.path}
                className={`relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  active
                    ? 'bg-rose-600 text-white shadow-[0_0_12px_rgba(244,63,94,0.4)]'
                    : 'text-neutral-300 hover:text-white hover:bg-neutral-800/60'
                }`}
              >
                <span>{link.label}</span>
                {showDot && (
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Desktop Right Action Area */}
        <div className="hidden items-center gap-4 md:flex">
          <a
            href={mailtoHref}
            className="flex items-center gap-1.5 text-xs font-medium text-neutral-400 transition hover:text-rose-400"
          >
            <Mail className="h-3.5 w-3.5 text-rose-500" />
            <span>{contactEmail}</span>
          </a>

          <Button
            size="sm"
            to="/booking"
            leftIcon={<CalendarPlus className="h-4 w-4" />}
            className="bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-lg shadow-rose-950"
          >
            Book Now
          </Button>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900/80 text-cream transition hover:border-neutral-700 md:hidden"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle navigation menu"
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden border-b border-neutral-800 bg-[#0C1017]/98 backdrop-blur-xl md:hidden"
          >
            <div className="container-page flex flex-col gap-1.5 py-4 pb-6">
              {navLinks.map((link) => {
                const showDot = (link.badge ?? 0) > 0;
                const active = isActive(link.path);

                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition ${
                      active
                        ? 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
                        : 'text-neutral-300 hover:bg-neutral-850 hover:text-white'
                    }`}
                  >
                    <span>{link.label}</span>
                    {showDot && (
                      <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-black text-neutral-950">
                        PENDING
                      </span>
                    )}
                  </Link>
                );
              })}

              <a
                href={mailtoHref}
                className="flex items-center gap-2.5 rounded-xl px-4 py-3 text-xs text-neutral-400 transition hover:bg-neutral-850 hover:text-white"
              >
                <Mail className="h-4 w-4 text-rose-500" />
                <span>{contactEmail}</span>
              </a>

              <div className="my-2 border-t border-neutral-800/80" />

              <div className="flex flex-col gap-2.5 pt-1">
                <Button
                  size="lg"
                  fullWidth
                  leftIcon={<CalendarPlus className="h-5 w-5" />}
                  onClick={() => {
                    setIsOpen(false);
                    navigate('/booking');
                  }}
                  className="bg-rose-600 hover:bg-rose-500 text-white font-bold"
                >
                  Book a Court Now
                </Button>

                <Link
                  to="/admin"
                  className="flex items-center justify-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900/60 px-4 py-3 text-xs font-semibold text-neutral-400 transition hover:border-neutral-700 hover:text-white"
                >
                  <Shield className="h-3.5 w-3.5 text-rose-400" />
                  Staff / Admin Login
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}