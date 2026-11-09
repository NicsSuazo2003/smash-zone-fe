// src/services/api.ts
import { APP_CONFIG } from '@/utils/constants';

export class ApiError extends Error {
  status: number;
  body?: unknown;
  retryAfter?: number;

  constructor(message: string, status: number, body?: unknown, retryAfter?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
    this.retryAfter = retryAfter;
  }

  get userMessage(): string {
    const b = this.body as { message?: string } | string | undefined;
    if (typeof b === 'string' && b.trim()) return b;
    if (b && typeof b === 'object' && typeof b.message === 'string' && b.message.trim()) {
      return b.message;
    }
    if (this.status === 429) {
      return this.retryAfter
        ? `Too many requests. Try again in ${this.retryAfter}s.`
        : 'Too many requests. Please try again shortly.';
    }
    return this.message;
  }
}

const BASE_URL = APP_CONFIG.apiUrl;
const CLIENT_SUBDOMAIN = import.meta.env.VITE_CLIENT_SUBDOMAIN ?? 'smashpoint';

/**
 * Only redirect to /login on 401 when the failing call is one that
 * REQUIRES an authenticated session.
 *
 * Public endpoints (/api/courts, /api/open-play, /api/clients/public,
 * /api/bookings) returning 401 is a backend bug — we do NOT want to
 * log customers out for a backend problem.
 */
function shouldRedirectOn401(path: string): boolean {
  return (
    path.startsWith('/api/admin') ||
    path.startsWith('/api/auth/change-password') ||
    path.startsWith('/api/auth/profile')
  );
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const fullPath = path.startsWith('/api') ? path : `/api${path}`;
  const url = `${BASE_URL}${fullPath}`;

  const token = localStorage.getItem('admin_token');

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'X-Client-Subdomain': CLIENT_SUBDOMAIN,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  try {
    const res = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      let body: unknown;
      const cloned = res.clone();
      try {
        body = await cloned.json();
      } catch {
        try {
          body = await res.text();
        } catch {
          body = undefined;
        }
      }

      let retryAfter: number | undefined;
      if (res.status === 429) {
        const ra = res.headers.get('Retry-After');
        if (ra) {
          const parsed = parseInt(ra, 10);
          if (!Number.isNaN(parsed)) retryAfter = parsed;
        }
      }

      // 401 handler: only redirect for auth-required endpoints
      if (res.status === 401 && shouldRedirectOn401(fullPath)) {
        localStorage.removeItem('admin_token');
        if (
          typeof window !== 'undefined' &&
          !window.location.pathname.startsWith('/login')
        ) {
          const redirect = encodeURIComponent(
            window.location.pathname + window.location.search
          );
          window.location.replace(`/login?next=${redirect}`);
        }
      }

      throw new ApiError(
        `Request failed: ${res.status} ${res.statusText}`,
        res.status,
        body,
        retryAfter
      );
    }

    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiError(
        'Request timed out — the server may be waking up, please try again',
        0
      );
    }
    throw err;
  }
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}