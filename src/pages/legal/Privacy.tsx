// src/pages/legal/Privacy.tsx
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shield, ArrowLeft, Mail, Facebook, MapPin } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

export function Privacy() {
  useEffect(() => {
    document.title = 'Privacy Policy | Smash Point Pickle Sports Center';
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
              <Shield className="h-6 w-6 text-primary-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-cream sm:text-3xl">Privacy Policy</h1>
              <p className="text-xs text-cream-muted sm:text-sm">
                Last updated: {new Date().toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          </div>

          <div className="space-y-8">
            <section className="rounded-2xl border border-neutral-700 bg-neutral-900/80 p-5 sm:p-6">
              <p className="text-sm leading-relaxed text-cream-muted">
                Smash Point Pickle Sports Center respects your privacy. This policy explains what
                information we collect when you book a court, why we collect it, and how we protect it.
              </p>
            </section>

            <section className="rounded-2xl border border-neutral-700 bg-neutral-900/80 p-5 sm:p-6">
              <h2 className="mb-3 text-lg font-bold text-cream">Information We Collect</h2>
              <ul className="list-inside list-disc space-y-1.5 pl-2 text-sm leading-relaxed text-cream-muted">
                <li><strong className="text-cream">Name</strong> — to identify your booking</li>
                <li><strong className="text-cream">Email address</strong> — for booking confirmations and updates</li>
                <li><strong className="text-cream">Mobile number</strong> — for urgent booking-related contact</li>
                <li><strong className="text-cream">Booking details</strong> — court, date, and time</li>
                <li><strong className="text-cream">Payment reference</strong> — to verify your payment</li>
              </ul>
            </section>

            <section className="rounded-2xl border border-neutral-700 bg-neutral-900/80 p-5 sm:p-6">
              <h2 className="mb-3 text-lg font-bold text-cream">How We Use It</h2>
              <ul className="list-inside list-disc space-y-1.5 pl-2 text-sm leading-relaxed text-cream-muted">
                <li>To process and confirm your booking</li>
                <li>To verify payments and prevent fraud</li>
                <li>To keep records for accounting and tax purposes</li>
                <li>To contact you about your reservation</li>
              </ul>
            </section>

            <section className="rounded-2xl border border-neutral-700 bg-neutral-900/80 p-5 sm:p-6">
              <h2 className="mb-3 text-lg font-bold text-cream">Sharing</h2>
              <p className="text-sm leading-relaxed text-cream-muted">
                We do not sell or share your personal information for commercial purposes. We may
                share it only with staff who need it to manage your booking, or when required by law.
              </p>
            </section>

            <section className="rounded-2xl border border-neutral-700 bg-neutral-900/80 p-5 sm:p-6">
              <h2 className="mb-3 text-lg font-bold text-cream">Security</h2>
              <p className="text-sm leading-relaxed text-cream-muted">
                Your data is stored on secure servers and only accessible to authorized staff.
              </p>
            </section>

            <section className="rounded-2xl border border-primary-400/30 bg-primary-600/20 p-5 sm:p-6">
              <h2 className="mb-3 text-lg font-bold text-cream">Contact Us</h2>
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