// src/pages/legal/Terms.tsx
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText, ArrowLeft, Mail, Facebook, MapPin, Ban, ShieldAlert, Users, RefreshCw,
} from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

const rules = [
  'Wear non-marking athletic shoes on the court.',
  'No food or drinks on the playing surface.',
  'Respect your time slot and vacate the court when it ends.',
  'Keep noise reasonable, especially at night.',
  'Pets are allowed only in the waiting area, not on or beside the courts.',
];

export function Terms() {
  useEffect(() => {
    document.title = 'Terms & Conditions | Smash Point Pickle Sports Center';
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
              <FileText className="h-6 w-6 text-primary-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-cream sm:text-3xl">Terms & Conditions</h1>
              <p className="text-xs text-cream-muted sm:text-sm">
                Last updated: {new Date().toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          </div>

          <div className="space-y-8">
            <section className="rounded-2xl border border-neutral-700 bg-neutral-900/80 p-5 sm:p-6">
              <p className="text-sm leading-relaxed text-cream-muted">
                By booking a court or using the facilities of Smash Point Pickle Sports Center, you
                agree to these Terms & Conditions. Please read them before making a reservation.
              </p>
            </section>

            <section className="rounded-2xl border border-neutral-700 bg-neutral-900/80 p-5 sm:p-6">
              <h2 className="mb-3 text-lg font-bold text-cream">1. Bookings</h2>
              <p className="text-sm leading-relaxed text-cream-muted">
                All bookings are subject to court availability. A booking is confirmed only after
                payment is verified and you receive a confirmation email. Smash Point may cancel or
                reschedule bookings for maintenance, safety, or events beyond our control.
              </p>
            </section>

            <section className="rounded-2xl border border-rose-900/50 bg-rose-950/25 p-5 sm:p-6">
              <div className="mb-3 flex items-center gap-2.5">
                <Ban className="h-5 w-5 shrink-0 text-rose-400" />
                <h2 className="text-lg font-bold text-rose-400">2. No Cancellation Policy</h2>
              </div>
              <div className="flex items-start gap-2.5 text-sm leading-relaxed text-cream-muted">
                <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
                <div>
                  <p className="font-bold text-rose-400">ALL BOOKINGS ARE FINAL.</p>
                  <p className="mt-1.5">
                    Confirmed bookings are non-cancellable and non-refundable. If you cannot play, you
                    may pass your slot to someone else and settle payment with them directly.
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-neutral-700 bg-neutral-900/80 p-5 sm:p-6">
              <div className="mb-3 flex items-center gap-2.5">
                <Users className="h-5 w-5 shrink-0 text-primary-300" />
                <h2 className="text-lg font-bold text-cream">3. Court Rules</h2>
              </div>
              <ul className="list-inside list-disc space-y-1.5 pl-2 text-sm leading-relaxed text-cream-muted">
                {rules.map((rule) => <li key={rule}>{rule}</li>)}
              </ul>
            </section>

            <section className="rounded-2xl border border-neutral-700 bg-neutral-900/80 p-5 sm:p-6">
              <h2 className="mb-3 text-lg font-bold text-cream">4. Conduct</h2>
              <p className="text-sm leading-relaxed text-cream-muted">
                Players must treat staff, other players, and the facility with respect. Smash Point
                may remove anyone behaving disruptively or unsafely, without a refund.
              </p>
            </section>

            <section className="rounded-2xl border border-neutral-700 bg-neutral-900/80 p-5 sm:p-6">
              <h2 className="mb-3 text-lg font-bold text-cream">5. Equipment & Damage</h2>
              <p className="text-sm leading-relaxed text-cream-muted">
                The booking party is responsible for any damage to the facility or rental equipment
                caused by misuse or negligence during their booking. Repair or replacement costs must
                be paid in full.
              </p>
            </section>

            <section className="rounded-2xl border border-neutral-700 bg-neutral-900/80 p-5 sm:p-6">
              <h2 className="mb-3 text-lg font-bold text-cream">6. Health & Liability</h2>
              <p className="text-sm leading-relaxed text-cream-muted">
                Pickleball is a physical sport with inherent risk of injury. By booking, players
                confirm they are fit to play and agree, to the extent permitted by law, to hold Smash
                Point Pickle Sports Center, its owners, and staff harmless from claims arising from
                personal injury or property damage during use of the facility.
              </p>
            </section>

            <section className="rounded-2xl border border-neutral-700 bg-neutral-900/80 p-5 sm:p-6">
              <h2 className="mb-3 text-lg font-bold text-cream">7. Minors</h2>
              <p className="text-sm leading-relaxed text-cream-muted">
                Minors (under 18) must be accompanied by a parent or guardian, who is responsible for
                their safety and conduct.
              </p>
            </section>

            <section className="rounded-2xl border border-neutral-700 bg-neutral-900/80 p-5 sm:p-6">
              <div className="mb-3 flex items-center gap-2.5">
                <RefreshCw className="h-5 w-5 shrink-0 text-primary-300" />
                <h2 className="text-lg font-bold text-cream">8. Changes to Terms</h2>
              </div>
              <p className="text-sm leading-relaxed text-cream-muted">
                We may update these Terms at any time. Continued use of our courts and booking
                platform means you accept the revised terms.
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
                <li className="flex items-start gap-2.5">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary-300" />
                  <span>National Highway, Rosario, Tandag City</span>
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