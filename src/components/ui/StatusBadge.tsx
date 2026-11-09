import type { BookingStatus } from '@/types';
import { BOOKING_STATUS_META } from '@/utils/constants';

interface StatusBadgeProps {
  status: BookingStatus;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const meta = BOOKING_STATUS_META[status] ?? BOOKING_STATUS_META.pending_payment;
  const sizeClass =
    size === 'sm'
      ? 'px-2.5 py-0.5 text-[10px]'
      : 'px-3 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-bold uppercase tracking-wider ${meta.color} ${meta.bg} ${meta.border} ${sizeClass}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}