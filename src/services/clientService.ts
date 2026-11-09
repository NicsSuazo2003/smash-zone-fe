import type { ClientSettings, AmenityItem } from '@/types';
import { apiRequest } from './api';

function normalizeAmenity(raw: any): AmenityItem {
  if (typeof raw === 'string') {
    return { name: raw, icon: 'Sparkles', description: '' };
  }
  return {
    name: raw?.name ?? '',
    icon: raw?.icon ?? 'Sparkles',
    description: raw?.description ?? '',
  };
}

function normalizeClientSettings(raw: any): ClientSettings {
  const data = raw?.data ?? raw;
  return {
    id: data.id || '',
    name: data.name || '',
    subdomain: data.subdomain || '',
    logo_url: data.logoUrl ?? data.logo_url ?? null,
    primary_color: data.primaryColor ?? data.primary_color ?? '#1A2E1A',
    accent_color: data.accentColor ?? data.accent_color ?? '#C9A94E',
    gcash_number: data.gcashNumber ?? data.gcash_number ?? null,
    gcash_account_name: data.gcashAccountName ?? data.gcash_account_name ?? null,
    payment_methods: data.paymentMethods ?? data.payment_methods ?? [],
    available_amenities: (data.availableAmenities ?? data.available_amenities ?? [])
      .map(normalizeAmenity),
    max_advance_booking_days: Number(
      data.maxAdvanceBookingDays ??
        data.max_advance_booking_days ??
        90
    ),
    // ⭐ NEW — master online-bookings switch (defaults to true if absent)
    bookings_enabled: (() => {
      const v = data.bookingsEnabled ?? data.bookings_enabled;
      return v === undefined || v === null ? true : Boolean(v);
    })(),
  };
}

export const clientService = {
  async getPublicSettings(): Promise<ClientSettings> {
    const res = await apiRequest<any>('/api/clients/public');
    return normalizeClientSettings(res?.data ?? res);
  },
};