// src/App.tsx
import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { Landing } from '@/pages/Landing';
import { Booking } from '@/pages/Booking';
import { Checkout } from '@/pages/Checkout';
import { Success } from '@/pages/Success';
import { Track } from '@/pages/Track';
import { MyBookings } from '@/pages/MyBookings';
import { Login } from '@/pages/Login';
import { ResetPassword } from '@/pages/ResetPassword';
import { Dashboard } from '@/pages/admin/Dashboard';
import { Bookings } from '@/pages/admin/Bookings';
import { Courts } from '@/pages/admin/Courts';
import { Pricing } from '@/pages/admin/Pricing';
import { Settings } from '@/pages/admin/Settings';
import { OpenPlayManagement } from '@/pages/admin/OpenPlayManagement';
import { SecurityLogs } from '@/pages/admin/SecurityLogs';
import { StaffBookings } from '@/pages/staff/StaffBookings';
import { OpenPlay } from '@/pages/OpenPlay';
import { Terms, Privacy, RefundPolicy, PaymentPolicy } from '@/pages/legal';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useAuthStore } from '@/stores/authStore';
import { IntroSplash } from '@/components/IntroSplash';
import { isInAppBrowser } from '@/utils/browser';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function useForceExternalBrowser() {
  useEffect(() => {
    const isAndroid = /Android/i.test(navigator.userAgent);
    if (!isAndroid || !isInAppBrowser()) return;

    const alreadyTried = sessionStorage.getItem('triedExternalRedirect');
    if (alreadyTried) return;
    sessionStorage.setItem('triedExternalRedirect', '1');

    const currentUrl = window.location.href;
    const cleanUrl = currentUrl.replace(/^https?:\/\//, '');
    const fallback = encodeURIComponent(currentUrl);
    const intentUrl = `intent://${cleanUrl}#Intent;scheme=https;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;S.browser_fallback_url=${fallback};end`;

    window.location.href = intentUrl;
  }, []);
}

export default function App() {
  const init = useAuthStore((s) => s.init);
  useForceExternalBrowser();

  useEffect(() => {
    init();
  }, [init]);

  return (
    <BrowserRouter>
      <IntroSplash />
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/booking" element={<Booking />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/success" element={<Success />} />
        <Route path="/track" element={<Track />} />
        <Route path="/my-bookings" element={<MyBookings />} />
        <Route path="/open-play" element={<OpenPlay />} />
        <Route path="/login" element={<Login />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Legal Pages */}
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/refund-policy" element={<RefundPolicy />} />
        <Route path="/payment-policy" element={<PaymentPolicy />} />

        {/* Admin Routes */}
        <Route path="/admin" element={<Dashboard />} />
        <Route path="/admin/bookings" element={<Bookings />} />
        <Route path="/admin/courts" element={<Courts />} />
        <Route path="/admin/pricing" element={<Pricing />} />
        <Route
          path="/admin/open-play"
          element={
            <AdminLayout>
              <OpenPlayManagement />
            </AdminLayout>
          }
        />
        <Route path="/admin/settings" element={<Settings />} />
        <Route path="/admin/security-logs" element={<SecurityLogs />} />

        {/* Staff Routes */}
        <Route path="/staff" element={<Navigate to="/staff/bookings" replace />} />
        <Route path="/staff/bookings" element={<StaffBookings />} />
      </Routes>
    </BrowserRouter>
  );
}