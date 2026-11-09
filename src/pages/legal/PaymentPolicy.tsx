// src/pages/legal/PaymentPolicy.tsx
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Wallet, ArrowLeft, Mail, ShieldAlert, Banknote, Clock, ListChecks } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { APP_CONFIG } from '@/utils/constants';

export function PaymentPolicy() {
  useEffect(() => {
    document.title = 'Payment & Verification Policy | Smash Point Pickle Sports Center';
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
              <Wallet className="h-6 w-6 text-primary-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-cream sm:text-3xl">Payment & Verification Policy</h1>
              <p className="text-xs text-cream-muted sm:text-sm">
                Last updated: {new Date().toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          </div>

          <div className="space-y-8">
            <section className="rounded-2xl border border-neutral-700 bg-neutral-900/80 p-5 sm:p-6">
              <div className="mb-3 flex items-center gap-2.5">
                <ListChecks className="h-5 w-5 shrink-0 text-primary-300" />
                <h2 className="text-lg font-bold text-cream">How Verification Works</h2>
              </div>
              <div className="space-y-3 text-sm leading-relaxed text-cream-muted">
                <p>
                  Smash Point verifies every payment manually. After you pay, our staff checks the
                  amount and reference before confirming your court booking.
                </p>
                <div className="flex items-start gap-2">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary-300" />
                  <p>
                    Verification usually takes 1–4 hours during business hours. Bookings submitted
                    after hours are verified the next business day.
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-neutral-700 bg-neutral-900/80 p-5 sm:p-6">
              <h2 className="mb-3 text-lg font-bold text-cream">Payment Rules</h2>
              <ul className="list-inside list-disc space-y-1.5 pl-2 text-sm leading-relaxed text-cream-muted">
                <li>Send the exact amount shown at checkout.</li>
                <li>Your slot is held for {Math.round(APP_CONFIG.paymentTimerSeconds / 60)} minutes — pay within that window.</li>
                <li>One payment per booking. No split payments.</li>
                <li>Submit the reference number from your receipt. Your booking code is not the same as your payment reference.</li>
              </ul>
            </section>

            <section className="rounded-2xl border border-neutral-700 bg-neutral-900/80 p-5 sm:p-6">
              <div className="mb-3 flex items-center gap-2.5">
                <Banknote className="h-5 w-5 shrink-0 text-primary-300" />
                <h2 className="text-lg font-bold text-cream">Accepted Methods</h2>
              </div>
              <ul className="list-inside list-disc space-y-1.5 pl-2 text-sm leading-relaxed text-cream-muted">
                <li>GCash</li>
                <li>Bank transfer (InstaPay/PESONet)</li>
                <li>Cash (in-person only, for walk-in bookings)</li>
              </ul>
            </section>

            <section className="rounded-2xl border border-rose-900/50 bg-rose-950/25 p-5 sm:p-6">
              <div className="mb-2 flex items-center gap-2.5">
                <ShieldAlert className="h-5 w-5 shrink-0 text-rose-400" />
                <h2 className="text-lg font-bold text-rose-400">Fraudulent Payments</h2>
              </div>
              <p className="text-sm leading-relaxed text-cream-muted">
                Fake or altered receipts will result in immediate cancellation, a permanent booking
                ban, and may be reported to authorities.
              </p>
            </section>

            <section className="rounded-2xl border border-primary-400/30 bg-primary-600/20 p-5 sm:p-6">
              <h2 className="mb-3 text-lg font-bold text-cream">Need Help?</h2>
              <ul className="space-y-2 text-sm text-cream-muted">
                <li className="flex items-center gap-2.5">
                  <Mail className="h-4 w-4 shrink-0 text-primary-300" />
                  <span>smashpoint@gmail.com</span>
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