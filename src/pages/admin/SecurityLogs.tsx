// src/pages/admin/SecurityLogs.tsx
import { useEffect, useState } from 'react';
import {
  Shield,
  AlertTriangle,
  XCircle,
  Info,
  CheckCircle2,
  Filter,
} from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { adminService, type SecurityEvent } from '@/services/adminService';
import { formatDateTime } from '@/utils/format';

type Severity = 'all' | 'info' | 'warning' | 'critical';

const SEVERITY_STYLES: Record<
  SecurityEvent['severity'],
  { icon: typeof Info; cls: string; label: string }
> = {
  info: {
    icon: Info,
    cls: 'border-neutral-700 bg-neutral-900/60 text-cream',
    label: 'Info',
  },
  warning: {
    icon: AlertTriangle,
    cls: 'border-amber-400/40 bg-amber-500/10 text-amber-200',
    label: 'Warning',
  },
  critical: {
    icon: XCircle,
    cls: 'border-error/40 bg-error/10 text-error',
    label: 'Critical',
  },
};

const EVENT_LABELS: Record<string, string> = {
  'auth.login_success': 'Login success',
  'auth.login_failed': 'Login failed',
  'auth.login_locked_out': 'Locked out',
  'auth.password_changed': 'Password changed',
  'auth.forbidden': 'Forbidden',
  'auth.unauthorized': 'Unauthorized',
  'booking.created': 'Booking created',
  'booking.status_changed': 'Status changed',
  'settings.changed': 'Settings changed',
  'admin.staff_created': 'Staff created',
  'rate_limit.triggered': 'Rate limited',
  'error.unhandled': 'Unhandled error',
};

export function SecurityLogs() {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [severity, setSeverity] = useState<Severity>('warning');
  const [eventType, setEventType] = useState<string>('');
  const [limit, setLimit] = useState(100);
  const [hideRateLimits, setHideRateLimits] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await adminService.getSecurityEvents({
          severity: severity === 'all' ? undefined : severity,
          eventType: eventType || undefined,
          limit,
        });
        setEvents(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load security events');
      } finally {
        setLoading(false);
      }
    })();
  }, [severity, eventType, limit]);

  // Filter rate-limit events unless the user is explicitly filtering for them
  const filteringForRateLimits = eventType.trim() === 'rate_limit.triggered';
  const rateLimitCount = events.filter((e) => e.event_type === 'rate_limit.triggered').length;
  const visibleEvents =
    hideRateLimits && !filteringForRateLimits
      ? events.filter((e) => e.event_type !== 'rate_limit.triggered')
      : events;

  const counts = {
    info: visibleEvents.filter((e) => e.severity === 'info').length,
    warning: visibleEvents.filter((e) => e.severity === 'warning').length,
    critical: visibleEvents.filter((e) => e.severity === 'critical').length,
  };

  return (
    <AdminLayout>
      <div className="container-page py-6 sm:py-8 text-cream">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            <Shield className="mr-2 inline h-6 w-6 text-primary-300" />
            Security Logs
          </h1>
          <p className="mt-1 text-xs text-cream-muted sm:text-sm">
            Authentication, booking, and administrative events. IP addresses are
            hashed. Only warnings and critical events are shown by default, and
            rate-limit events are hidden unless you turn them on.
          </p>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-cream-muted" />
          {(['all', 'warning', 'critical', 'info'] as Severity[]).map((s) => (
            <button
              key={s}
              onClick={() => setSeverity(s)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                severity === s
                  ? 'border-primary-400 bg-primary-500 text-white'
                  : 'border-neutral-700 bg-neutral-950 text-cream-muted hover:text-cream'
              }`}
            >
              {s.toUpperCase()}
            </button>
          ))}

          {rateLimitCount > 0 && !filteringForRateLimits && (
            <button
              onClick={() => setHideRateLimits((h) => !h)}
              className="rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-xs font-semibold text-cream-muted transition hover:text-cream"
            >
              {hideRateLimits
                ? `Show ${rateLimitCount} rate-limit event${rateLimitCount !== 1 ? 's' : ''}`
                : 'Hide rate-limit events'}
            </button>
          )}

          <input
            type="text"
            placeholder="Filter by event type (e.g. auth.login_failed)"
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
            className="ml-auto w-64 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-xs text-cream"
          />
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-error/40 bg-error/10 p-3 text-xs text-error">
            {error}
          </div>
        )}

        {loading ? (
          <LoadingSpinner className="py-16" />
        ) : visibleEvents.length === 0 ? (
          <div className="card rounded-2xl border border-neutral-700 bg-neutral-900/80 p-12 text-center">
            <Shield className="mx-auto h-10 w-10 text-cream-muted/30" />
            <p className="mt-3 text-sm font-semibold text-cream-muted">
              No security events match this filter.
            </p>
            {hideRateLimits && rateLimitCount > 0 && (
              <p className="mt-1 text-xs text-cream-muted/70">
                {rateLimitCount} rate-limit event
                {rateLimitCount !== 1 ? 's are' : ' is'} hidden.
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-4 text-xs text-cream-muted">
              <span>
                {visibleEvents.length} event
                {visibleEvents.length !== 1 ? 's' : ''}
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                {counts.warning} warning{counts.warning !== 1 ? 's' : ''}
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-red-400" />
                {counts.critical} critical
              </span>
            </div>

            <div className="space-y-2">
              {visibleEvents.map((e) => {
                const style = SEVERITY_STYLES[e.severity] ?? SEVERITY_STYLES.info;
                const Icon = style.icon;
                return (
                  <div
                    key={e.id}
                    className={`rounded-xl border p-3.5 ${style.cls}`}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span className="font-mono text-[11px] font-bold uppercase tracking-wider opacity-80">
                            {EVENT_LABELS[e.event_type] ?? e.event_type}
                          </span>
                          {e.success ? (
                            <CheckCircle2 className="h-3 w-3 text-accent-400" />
                          ) : (
                            <XCircle className="h-3 w-3 text-red-400" />
                                                   )}
                          {!e.success && e.error_code && (
                            <span className="rounded bg-black/20 px-1.5 py-0.5 text-[10px] font-mono">
                              {e.error_code}
                            </span>
                          )}
                          <span className="ml-auto text-[11px] opacity-60">
                            {formatDateTime(e.occurred_at)}
                          </span>
                        </div>
                        <p className="mt-1 text-sm font-medium">{e.message}</p>
                        <div className="mt-1 flex flex-wrap gap-3 text-[11px] opacity-70">
                          {e.actor_email && (
                            <span>by {e.actor_email}</span>
                          )}
                          {e.resource && (
                            <span className="font-mono">{e.resource}</span>
                          )}
                          {e.ip_hash && (
                            <span className="font-mono">
                              ip:{e.ip_hash.substring(0, 12)}…
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {events.length >= limit && (
              <div className="mt-4 text-center">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setLimit((l) => l + 100)}
                >
                  Load more
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}