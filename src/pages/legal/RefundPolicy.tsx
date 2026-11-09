// src/pages/legal/RefundPolicy.tsx
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { RotateCcw, ArrowLeft, Mail, Facebook, ShieldAlert } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

export function RefundPolicy() {
  useEffect(() => {
    document.title = 'Refund & Cancellation Policy | Smash Point Pickle Sports Center';
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-charcoal text-cream">
      <Navbar />
      <div className="container-page pt-24 pb-16">
        <Link to="/" className="mb-6 inline-flex items-center gap-1.5 text-xs font-semibold text-cream-muted transition hover:text-primary-300">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Home
        </Link>

        <div className="mx-auto max-w-3xl">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-primary-400/30 bg-primary-600/30">
              <RotateCcw className="h-6 w-6 text-primary-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-cream sm:text-3xl">Refund & Cancellation Policy</h1>
              <p className="text-xs text-cream-muted sm:text-sm">
                Last updated: {new Date().toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          </div>

          <div className="mb-8 rounded-2xl border border-rose-900/50 bg-rose-950/25 p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-6 w-6 shrink-0 text-rose-400" />
              <div>
                <h2 className="text-lg font-bold text-rose-400">No Cancellation Policy</h2>
                <p className="mt-2 text-sm leading-relaxed text-cream-muted">
                  <strong className="text-cream">Confirmed court bookings are non-cancellable and non-refundable.</strong>{' '}
                  Please make sure you can play before booking.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <section className="rounded-2xl border border-neutral-700 bg-neutral-900/80 p-5 sm:p-6">
              <h2 className="mb-3 text-lg font-bold text-cream">If You Cannot Play</h2>
              <p className="text-sm leading-relaxed text-cream-muted">
                You may pass your court slot to someone else. Any payment between you and them is
                your own arrangement — Smash Point is not involved.
              </p>
            </section>

            <section className="rounded-2xl border border-neutral-700 bg-neutral-900/80 p-5 sm:p-6">
              <h2 className="mb-3 text-lg font-bold text-cream">If We Cancel</h2>
              <p className="text-sm leading-relaxed text-cream-muted">
                If we cancel your booking due to maintenance, safety, or events beyond our control,
                we will contact you to arrange a refund or reschedule.
              </p>
            </section>

            <section className="rounded-2xl border border-primary-400/30 bg-primary-600/20 p-5 sm:p-6">
              <h2 className="mb-3 text-lg font-bold text-cream">Questions?</h2>
              <ul className="space-y-2 text-sm text-cream-muted">
                <li className="flex items-center gap-2.5">
                  <Mail className="h-4 w-4 shrink-0 text-primary-300" />
                  <span>smashpoint@gmail.com</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Facebook className="h-4 w-4 shrink-0 text-primary-300" />
                  <a
                    href="https://www.facebook.com/profile.php?id=61594106069425"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-primary-300 transition"
                  >
                    Smash Point Pickle Sports Center
                  </a>
                </li>
              </ul>
            </section>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}