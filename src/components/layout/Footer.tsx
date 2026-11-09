// src/components/layout/Footer.tsx
import { Link } from 'react-router-dom';
import {
  MapPin,
  Facebook,
  Clock,
  FileText,
  Lock,
  RotateCcw,
  Wallet,
  UserCog,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { APP_CONFIG } from '@/utils/constants';
import { useClientStore } from '@/stores/clientStore';
import { useBookingStore } from '@/stores/bookingStore';

export function Footer() {
  const settings = useClientStore((state) => state.settings);
  const courts = useBookingStore((state) => state.courts);

  const getOperatingHours = () => {
    if (!courts || courts.length === 0) return '7:00 AM – 12:00 AM';

    const earliestOpen = courts.reduce(
      (earliest, court) => (court.open_time < earliest ? court.open_time : earliest),
      courts[0].open_time
    );

    const latestClose = courts.reduce(
      (latest, court) => (court.close_time > latest ? court.close_time : latest),
      courts[0].close_time
    );

    const formatTime = (timeStr: string) => {
      const [hour, minute] = timeStr.split(':').map(Number);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      return minute === 0 ? `${hour12}:00 ${ampm}` : `${hour12}:${String(minute).padStart(2, '0')} ${ampm}`;
    };

    return `${formatTime(earliestOpen)} – ${formatTime(latestClose)}`;
  };

  return (
    <footer className="relative border-t border-neutral-800/80 bg-[#0A0D12] text-cream">
      {/* Subtle background glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-rose-500/30 to-transparent" />

      <div className="container-page py-12 sm:py-16">
        {/* Top Brand Banner */}
        <div className="mb-10 flex flex-col items-start justify-between gap-6 border-b border-neutral-800/80 pb-10 sm:flex-row sm:items-center">
          <div className="max-w-md">
            <Logo size="md" to="/" />
            <p className="mt-3 text-xs leading-relaxed text-cream-muted sm:text-sm">
              {APP_CONFIG.tagline}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="https://www.facebook.com/psyche.goyongcocatacte"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900/60 px-3.5 py-2 text-xs font-semibold text-cream transition hover:border-rose-500/50 hover:bg-neutral-800"
              aria-label="Smash Point on Facebook"
            >
              <Facebook className="h-4 w-4 text-rose-500 transition-transform group-hover:scale-110" />
              <span>Follow on Facebook</span>
              <ArrowUpRight className="h-3 w-3 text-neutral-500 group-hover:text-cream" />
            </a>
          </div>
        </div>

        {/* Links Grid */}
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-2 md:grid-cols-4 lg:gap-12">
          {/* Quick Links */}
          <div>
            <h4 className="mb-4 text-xs font-bold uppercase tracking-wider text-rose-400">
              Quick Links
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              <li>
                <Link to="/" className="text-cream-muted transition hover:text-white">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/booking" className="text-cream-muted transition hover:text-white">
                  Book a Court
                </Link>
              </li>
              <li>
                <Link to="/open-play" className="text-cream-muted transition hover:text-white">
                  Open Play Sessions
                </Link>
              </li>
              <li>
                <Link to="/track" className="text-cream-muted transition hover:text-white">
                  Track Booking
                </Link>
              </li>
              <li>
                <Link to="/my-bookings" className="text-cream-muted transition hover:text-white">
                  My Bookings
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="mb-4 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-rose-400">
              <FileText className="h-3.5 w-3.5" />
              Legal & Policy
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              <li>
                <Link
                  to="/terms"
                  className="inline-flex items-center gap-1.5 text-cream-muted transition hover:text-white"
                >
                  <FileText className="h-3.5 w-3.5 opacity-60" />
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link
                  to="/privacy"
                  className="inline-flex items-center gap-1.5 text-cream-muted transition hover:text-white"
                >
                  <Lock className="h-3.5 w-3.5 opacity-60" />
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  to="/refund-policy"
                  className="inline-flex items-center gap-1.5 text-cream-muted transition hover:text-white"
                >
                  <RotateCcw className="h-3.5 w-3.5 opacity-60" />
                  Refund Policy
                </Link>
              </li>
              <li>
                <Link
                  to="/payment-policy"
                  className="inline-flex items-center gap-1.5 text-cream-muted transition hover:text-white"
                >
                  <Wallet className="h-3.5 w-3.5 opacity-60" />
                  Payment Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Location & Contact */}
          <div>
            <h4 className="mb-4 text-xs font-bold uppercase tracking-wider text-rose-400">
              Venue Location
            </h4>
            <ul className="space-y-3 text-xs sm:text-sm text-cream-muted">
              <li className="flex items-start gap-2.5">
                <MapPin className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
                <span className="leading-relaxed">
                  National Highway, Rosario, Tandag City, Surigao del Sur
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <Facebook className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
                <a
                  href="https://www.facebook.com/psyche.goyongcocatacte"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="leading-snug hover:text-white transition"
                >
                  Smash Point Pickle Sports Center
                </a>
              </li>
            </ul>
          </div>

          {/* Hours & Staff Access */}
          <div>
            <h4 className="mb-4 text-xs font-bold uppercase tracking-wider text-rose-400">
              Playing Hours
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm text-cream-muted">
              <li className="flex items-center gap-2.5">
                <Clock className="h-4 w-4 shrink-0 text-amber-400" />
                <span>Monday – Sunday</span>
              </li>
              <li className="pl-6.5 text-xs font-semibold text-neutral-300">
                {getOperatingHours()}
              </li>
            </ul>

            <div className="mt-5 pt-4 border-t border-neutral-800/80">
              <Link
                to="/admin"
                className="inline-flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900/60 px-3 py-1.5 text-xs font-semibold text-cream-muted transition hover:border-neutral-700 hover:text-white"
              >
                <UserCog className="h-3.5 w-3.5 text-rose-400" />
                Staff Dashboard
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-neutral-800/80 pt-6 text-xs text-cream-muted sm:flex-row">
          <p>
            &copy; {new Date().getFullYear()} {APP_CONFIG.name}. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1 rounded-full border border-neutral-800 bg-neutral-900/80 px-2.5 py-0.5 text-[11px] font-semibold text-neutral-400">
              <Sparkles className="h-3 w-3 text-amber-400" /> Est. {APP_CONFIG.established}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}