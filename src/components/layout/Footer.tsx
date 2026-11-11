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
    <footer className="relative border-t border-slate-200 bg-white text-slate-800">
      {/* Subtle brand orange-to-purple gradient accent line */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[#FF7A00] to-transparent opacity-80" />

      <div className="container-page py-12 sm:py-16">
        {/* Top Brand Banner */}
        <div className="mb-10 flex flex-col items-start justify-between gap-6 border-b border-slate-200 pb-10 sm:flex-row sm:items-center">
          <div className="max-w-md">
            <Logo size="md" to="/" />
            <p className="mt-3 text-xs leading-relaxed text-slate-600 sm:text-sm">
              {APP_CONFIG.tagline}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="https://www.facebook.com/psyche.goyongcocatacte"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-800 shadow-xs transition hover:border-[#FF7A00] hover:bg-orange-50/50 hover:text-[#FF7A00]"
              aria-label="Smash Zone on Facebook"
            >
              <Facebook className="h-4 w-4 text-[#FF7A00] transition-transform group-hover:scale-110" />
              <span>Follow on Facebook</span>
              <ArrowUpRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-[#FF7A00]" />
            </a>
          </div>
        </div>

        {/* Links Grid */}
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-2 md:grid-cols-4 lg:gap-12">
          {/* Quick Links */}
          <div>
            <h4 className="mb-4 text-xs font-extrabold uppercase tracking-wider text-[#3D1164]">
              Quick Links
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              <li>
                <Link to="/" className="text-slate-600 transition hover:text-[#FF7A00] hover:font-medium">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/booking" className="text-slate-600 transition hover:text-[#FF7A00] hover:font-medium">
                  Book a Court
                </Link>
              </li>
              <li>
                <Link to="/open-play" className="text-slate-600 transition hover:text-[#FF7A00] hover:font-medium">
                  Open Play Sessions
                </Link>
              </li>
              <li>
                <Link to="/track" className="text-slate-600 transition hover:text-[#FF7A00] hover:font-medium">
                  Track Booking
                </Link>
              </li>
              <li>
                <Link to="/my-bookings" className="text-slate-600 transition hover:text-[#FF7A00] hover:font-medium">
                  My Bookings
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="mb-4 flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-[#3D1164]">
              <FileText className="h-3.5 w-3.5 text-[#FF7A00]" />
              Legal & Policy
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              <li>
                <Link
                  to="/terms"
                  className="inline-flex items-center gap-1.5 text-slate-600 transition hover:text-[#FF7A00] hover:font-medium"
                >
                  <FileText className="h-3.5 w-3.5 text-slate-400" />
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link
                  to="/privacy"
                  className="inline-flex items-center gap-1.5 text-slate-600 transition hover:text-[#FF7A00] hover:font-medium"
                >
                  <Lock className="h-3.5 w-3.5 text-slate-400" />
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  to="/refund-policy"
                  className="inline-flex items-center gap-1.5 text-slate-600 transition hover:text-[#FF7A00] hover:font-medium"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
                  Refund Policy
                </Link>
              </li>
              <li>
                <Link
                  to="/payment-policy"
                  className="inline-flex items-center gap-1.5 text-slate-600 transition hover:text-[#FF7A00] hover:font-medium"
                >
                  <Wallet className="h-3.5 w-3.5 text-slate-400" />
                  Payment Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Location & Contact */}
          <div>
            <h4 className="mb-4 text-xs font-extrabold uppercase tracking-wider text-[#3D1164]">
              Venue Location
            </h4>
            <ul className="space-y-3 text-xs sm:text-sm text-slate-600">
              <li className="flex items-start gap-2.5">
                <MapPin className="h-4 w-4 shrink-0 text-[#FF7A00] mt-0.5" />
                <span className="leading-relaxed">
                  National Highway, Rosario, Tandag City, Surigao del Sur
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <Facebook className="h-4 w-4 shrink-0 text-[#FF7A00] mt-0.5" />
                <a
                  href="https://www.facebook.com/psyche.goyongcocatacte"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="leading-snug hover:text-[#FF7A00] transition"
                >
                  Smash Zone by Jerjen
                </a>
              </li>
            </ul>
          </div>

          {/* Hours & Staff Access */}
          <div>
            <h4 className="mb-4 text-xs font-extrabold uppercase tracking-wider text-[#3D1164]">
              Playing Hours
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm text-slate-600">
              <li className="flex items-center gap-2.5">
                <Clock className="h-4 w-4 shrink-0 text-[#FFA81A]" />
                <span className="font-medium">Monday – Sunday</span>
              </li>
              <li className="pl-6.5 text-xs font-bold text-slate-800">
                {getOperatingHours()}
              </li>
            </ul>

            <div className="mt-5 pt-4 border-t border-slate-200">
              <Link
                to="/admin"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 shadow-xs transition hover:border-[#3D1164] hover:bg-purple-50 hover:text-[#3D1164]"
              >
                <UserCog className="h-3.5 w-3.5 text-[#3D1164]" />
                Staff Dashboard
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-slate-200 pt-6 text-xs text-slate-500 sm:flex-row">
          <p>
            &copy; {new Date().getFullYear()} {APP_CONFIG.name}. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-bold text-slate-700 shadow-xs">
              <Sparkles className="h-3 w-3 text-[#FFA81A]" /> Est. {APP_CONFIG.established}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}