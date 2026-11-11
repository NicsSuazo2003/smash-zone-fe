import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, CalendarPlus, Shield, Mail } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/Button';

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const contactEmail = 'smashzonehub@gmail.com';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 15);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks = [
    { label: 'Home', path: '/' },
    { label: 'My Bookings', path: '/my-bookings' },
    { label: 'Track Booking', path: '/track' },
  ];

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-200 py-0'
          : 'bg-white/85 backdrop-blur-sm border-b border-slate-100 py-1'
      }`}
    >
      <nav className="container-page flex h-16 items-center justify-between md:h-20">
        <Logo size="nav" />

        {/* Desktop Navigation Links */}
        <div className="hidden items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 md:flex">
          {navLinks.map((link) => {
            const active = isActive(link.path);
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`relative px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  active
                    ? 'bg-brand-purple text-white shadow-sm'
                    : 'text-slate-600 hover:text-brand-purple hover:bg-slate-200/60'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Action Button */}
        <div className="hidden items-center gap-4 md:flex">
          <a
            href={`mailto:${contactEmail}`}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand-orange transition"
          >
            <Mail className="h-3.5 w-3.5 text-brand-orange" />
            <span>{contactEmail}</span>
          </a>

          <Button
            size="sm"
            to="/booking"
            leftIcon={<CalendarPlus className="h-4 w-4" />}
            className="bg-brand-orange hover:bg-accent-600 text-white font-black shadow-orange-glow uppercase tracking-wider text-xs px-5 py-2.5 rounded-xl"
          >
            Book Now
          </Button>
        </div>

        {/* Mobile Hamburger */}
        <button
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-800 shadow-sm md:hidden"
          onClick={() => setIsOpen(!isOpen)}
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
            className="border-b border-slate-200 bg-white px-4 py-5 shadow-xl md:hidden"
          >
            <div className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsOpen(false)}
                  className={`rounded-xl px-4 py-3 text-sm font-bold ${
                    isActive(link.path)
                      ? 'bg-brand-purple text-white'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <Button
                size="lg"
                fullWidth
                onClick={() => {
                  setIsOpen(false);
                  navigate('/booking');
                }}
                className="mt-2 bg-brand-orange text-white font-black"
              >
                Book a Court Now
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}