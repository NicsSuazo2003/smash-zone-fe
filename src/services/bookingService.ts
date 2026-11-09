// src/services/bookingService.ts
import type { Booking, BookingSummary, CustomerDetails } from '@/types';
import { apiRequest } from './api';

export function normalizeBooking(raw: any): Booking {
  const rawSlots: any[] = raw.slots ?? raw.Slots ?? raw.bookingSlots ?? raw.booking_slots ?? [];

  const slots = rawSlots.map((s: any) => ({
    id: s.id,
    slot_id: s.slotId ?? s.slot_id ?? s.id,
    court_id: String(s.courtId ?? s.court_id ?? s.CourtId ?? s.court?.id ?? raw.courtId ?? raw.court_id ?? ''),
    court_name: s.courtName ?? s.court_name ?? s.CourtName ?? s.court?.name, // ✅ ADDED
    start_time: s.startTime ?? s.start_time ?? s.StartTime,
    end_time: s.endTime ?? s.end_time ?? s.EndTime,
    date: s.date ?? raw.date,
    type: s.type ?? 'standard',
    price: s.price ?? 0,
    is_peak: s.isPeak ?? s.is_peak ?? false,
  }));

  const topLevelCourtId = String(raw.courtId ?? raw.court_id ?? slots[0]?.court_id ?? '');

  return {
    id: raw.id,
    reference_code: raw.referenceCode ?? raw.reference_code,
    court_id: topLevelCourtId,
    court_name: raw.courtName ?? raw.court_name,
    date: raw.date,
    slots,
    customer: {
      name: raw.customerName ?? raw.customer?.name,
      email: raw.customerEmail ?? raw.customer?.email,
      phone: raw.customerPhone ?? raw.customer?.phone,
      notes: raw.notes ?? raw.customer?.notes,
    },
    total_amount: raw.totalAmount ?? raw.total_amount,
    status: raw.status,
    payment_screenshot_url:
      raw.paymentScreenshot ?? raw.payment_screenshot_url ?? raw.PaymentScreenshot ?? null,
    payment_reference:
      raw.paymentReference ?? raw.payment_reference ?? raw.PaymentReference ?? null,
    payment_expires_at: raw.paymentExpiresAt ?? raw.payment_expires_at ?? null,
    gcash_number: raw.gcashNumber ?? raw.gcash_number ?? '',
    created_at: raw.createdAt ?? raw.created_at,
    updated_at: raw.updatedAt ?? raw.updated_at ?? raw.createdAt ?? raw.created_at,
    open_play_session_id: raw.openPlaySessionId ?? raw.open_play_session_id ?? null,
  };
}

function normalizeSummary(raw: any): BookingSummary {
  return {
    id: raw.id,
    reference_code: raw.referenceCode ?? raw.reference_code,
    court_name: raw.courtName ?? raw.court_name,
    date: raw.date,
    start_time: raw.startTime ?? raw.start_time ?? '',
    end_time: raw.endTime ?? raw.end_time ?? '',
    status: raw.status,
    total_amount: raw.totalAmount ?? raw.total_amount ?? 0,
    created_at: raw.createdAt ?? raw.created_at,
  };
}

export interface CreateBookingPayload {
  court_groups: {
    courtId: string;
    slots: { start_time: string; end_time: string }[];
  }[];
  date: string;
  customer: CustomerDetails;
  total_amount: number;
}

function isValidGuid(id: string): boolean {
  const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return guidRegex.test(id);
}

function generateGuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const MOCK_COURT_GUIDS: Record<string, string> = {
  'court-1': '11111111-1111-4111-a111-111111111111',
  'court-2': '22222222-2222-4222-a222-222222222222',
  'court-3': '33333333-3333-4333-a333-333333333333',
  '1': '11111111-1111-4111-a111-111111111111',
  '2': '22222222-2222-4222-a222-222222222222',
  '3': '33333333-3333-4333-a333-333333333333',
};

function resolveCourtId(courtId: string): string {
  if (isValidGuid(courtId)) return courtId;
  if (courtId in MOCK_COURT_GUIDS) return MOCK_COURT_GUIDS[courtId];
  if (!isNaN(Number(courtId))) {
    const numId = String(courtId);
    if (numId in MOCK_COURT_GUIDS) return MOCK_COURT_GUIDS[numId];
  }
  console.error(`❌ Unknown court ID: "${courtId}" - cannot resolve to GUID`);
  throw new Error(`Invalid court ID: ${courtId}. Please refresh and try again.`);
}

export const bookingService = {
  async createBooking(payload: CreateBookingPayload): Promise<Booking> {
    if (!payload.court_groups || payload.court_groups.length === 0)
      throw new Error('At least one court is required');
    if (!payload.date) throw new Error('Date is required');
    if (!payload.customer?.name) throw new Error('Customer name is required');
    if (!payload.customer?.email) throw new Error('Customer email is required');
    if (!payload.customer?.phone) throw new Error('Customer phone is required');

    const resolvedGroups = payload.court_groups.map((group) => ({
      CourtId: resolveCourtId(group.courtId),
      Slots: group.slots.map((s) => ({
        StartTime: s.start_time,
        EndTime: s.end_time,
      })),
    }));

    const requestBody = {
      customerName: payload.customer.name.trim(),
      customerEmail: payload.customer.email.trim().toLowerCase(),
      customerPhone: payload.customer.phone.trim(),
      date: payload.date,
      courtGroups: resolvedGroups,
      totalAmount: payload.total_amount,
      notes: payload.customer.notes?.trim() || '',
    };

    try {
      const res = await apiRequest<Booking | { data: Booking }>('/api/bookings', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const booking = normalizeBooking((res as { data?: Booking }).data ?? (res as Booking));
      return booking;
    } catch (error) {
      console.error('❌ Failed to create booking:', error);
      throw error;
    }
  },

  async trackBooking(referenceCode: string, email?: string): Promise<Booking> {
    if (!referenceCode) {
      throw new Error('Reference code is required');
    }

    const query = email ? `?email=${encodeURIComponent(email)}` : '';
    const url = `/api/bookings/track/${referenceCode}${query}`;

    try {
      const res = await apiRequest<Booking | { data: Booking }>(url);
      const booking = normalizeBooking((res as { data?: Booking }).data ?? (res as Booking));
      return booking;
    } catch (error) {
      console.error('❌ Failed to track booking:', error);
      throw error;
    }
  },

  async trackBookingSummariesByEmail(email: string): Promise<BookingSummary[]> {
    if (!email || !email.trim()) {
      throw new Error('Email is required');
    }

    const url = `/api/bookings/track-summaries-by-email?email=${encodeURIComponent(
      email.trim().toLowerCase()
    )}`;

    try {
      const res = await apiRequest<any[]>(url);
      const summaries = (res ?? []).map(normalizeSummary);
      return summaries;
    } catch (error) {
      console.error('❌ Failed to fetch booking summaries:', error);
      throw error;
    }
  },

  async uploadPayment(
    bookingId: string,
    screenshotDataUrl: string | null,
    paymentReference: string,
    paymentMethod?: string
  ): Promise<Booking> {
    if (!bookingId) {
      throw new Error('Booking ID is required');
    }

    if (!paymentReference || !paymentReference.trim()) {
      throw new Error('Payment reference is required');
    }

    const formData = new FormData();
    formData.append('paymentReference', paymentReference.trim());

    if (paymentMethod) {
      formData.append('paymentMethod', paymentMethod);
    }

    if (screenshotDataUrl) {
      try {
        const response = await fetch(screenshotDataUrl);
        const blob = await response.blob();
        const file = new File([blob], `payment-${bookingId}.jpg`, { type: 'image/jpeg' });
        formData.append('screenshot', file);
      } catch (error) {
        console.warn('Failed to process screenshot, continuing without it:', error);
      }
    }

    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'https://smashpoint-booking-api.onrender.com'}/api/bookings/${bookingId}/upload-payment`,
        {
          method: 'POST',
          headers: {
            Authorization: token ? `Bearer ${token}` : '',
            'X-Client-Subdomain': import.meta.env.VITE_CLIENT_SUBDOMAIN ?? 'smashpoint',
          },
          body: formData,
        }
      );

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Upload failed: ${res.status}`);
      }

      const data = await res.json();
      const booking = normalizeBooking(data);
      return booking;
    } catch (error) {
      console.error('❌ Failed to upload payment:', error);
      throw error;
    }
  },

  async getBooking(id: string): Promise<Booking> {
    if (!id) {
      throw new Error('Booking ID is required');
    }

    try {
      const res = await apiRequest<Booking | { data: Booking }>(`/api/bookings/${id}`);
      const booking = normalizeBooking((res as { data?: Booking }).data ?? (res as Booking));
      return booking;
    } catch (error) {
      console.error('❌ Failed to get booking:', error);
      throw error;
    }
  },

  async checkBookingStatus(referenceCode: string): Promise<Booking> {
    return this.trackBooking(referenceCode);
  },

  async cancelBooking(bookingId: string, reason?: string): Promise<Booking> {
    if (!bookingId) {
      throw new Error('Booking ID is required');
    }

    try {
      const res = await apiRequest<Booking | { data: Booking }>(
        `/api/bookings/${bookingId}/cancel`,
        {
          method: 'POST',
          body: JSON.stringify({ reason: reason || 'Cancelled by customer' }),
        }
      );
      const booking = normalizeBooking((res as { data?: Booking }).data ?? (res as Booking));
      return booking;
    } catch (error) {
      console.error('❌ Failed to cancel booking:', error);
      throw error;
    }
  },
};

export const bookingHelpers = {
  isValidGuid,
  generateGuid,
  resolveCourtId,
  MOCK_COURT_GUIDS,
};