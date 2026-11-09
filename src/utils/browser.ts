/**
 * Detects if the current page is running inside a social app's in-app browser
 * (Messenger, Instagram, Facebook, Line, TikTok, etc).
 *
 * These webviews often lose session/back-navigation state when the user is
 * redirected out to an external app (like the GCash app) and returns —
 * which is exactly the "user can't get back to upload payment proof" problem.
 */
export function isInAppBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || (navigator as any).vendor || '';
  return /FBAN|FBAV|Instagram|Line\/|MicroMessenger|TikTok/i.test(ua);
}

export function getInAppBrowserName(): string | null {
  if (typeof navigator === 'undefined') return null;
  const ua = navigator.userAgent || (navigator as any).vendor || '';
  if (/FBAN|FBAV/i.test(ua)) return 'Facebook';
  if (/Instagram/i.test(ua)) return 'Instagram';
  if (/Line\//i.test(ua)) return 'Line';
  if (/MicroMessenger/i.test(ua)) return 'WeChat';
  if (/TikTok/i.test(ua)) return 'TikTok';
  return null;
}