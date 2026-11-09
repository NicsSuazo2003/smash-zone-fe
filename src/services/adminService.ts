import type {
  Analytics,
  Booking,
  BookingStatus,
  Court,
  BlockedDate,
  ClientSettings,
  PaymentMethod,
  PricingRule,
  AmenityItem,
  RescheduleBookingPayload,
  RescheduleBookingResult,
} from '@/types';
import { apiRequest } from './api';
import { normalizeCourt, buildCourtPayload } from './courtService';

// ─── Security events (admin log viewer) ───
export type SecuritySeverity = 'info' | 'warning' | 'critical';

export interface SecurityEvent {
  id: string;
  occurred_at: string;
  event_type: string;
  severity: SecuritySeverity;
  message: string;
  actor_email?: string | null;
  ip_hash?: string | null;
  resource?: string | null;
  success: boolean;
  error_code?: string | null;
}

export interface SecurityEventFilters {
  severity?: SecuritySeverity;
  eventType?: string;
  limit?: number;
}

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
    primary_color: data.primaryColor ?? data.primary_color ?? '#2563EB',
    accent_color: data.accentColor ?? data.accent_color ?? '#A3E635',
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
    bookings_enabled: (() => {
      const v = data.bookingsEnabled ?? data.bookings_enabled;
      return v === undefined || v === null ? true : Boolean(v);
    })(),
  };
}

function normalizeAnalytics(raw: any): Analytics {
  const data = raw?.data ?? raw;
  const rawRevenueByDay =
    data.revenueByDay ??
    data.revenue_by_day ??
    data.dailyRevenue ??
    data.daily_revenue ??
    data.revenueTrend ??
    [];

  const revenueByDay = rawRevenueByDay
    .map((d: any) => ({
      date: d.date || '',
      revenue: Number(d.revenue ?? 0),
    }))
    .sort((a: any, b: any) => a.date.localeCompare(b.date));

  return {
    total_bookings: Number(data.totalBookings ?? data.total_bookings ?? 0),
    total_revenue: Number(data.totalRevenue ?? data.total_revenue ?? 0),
    pending_payments: Number(data.pendingPayments ?? data.pending_payments ?? 0),
    confirmed_bookings: Number(data.confirmedBookings ?? data.confirmed_bookings ?? 0),
    completed_bookings: Number(data.completedBookings ?? data.completed_bookings ?? 0),
    cancelled_bookings: Number(data.cancelledBookings ?? data.cancelled_bookings ?? 0),
    status_breakdown: data.statusBreakdown ?? data.status_breakdown ?? {},
    revenue_by_day: revenueByDay,
    court_breakdown: data.courtBreakdown ?? data.court_breakdown ?? [],
  };
}

function normalizeBooking(raw: any): Booking {
  const data = raw?.data ?? raw;
  const rawSlots: any[] = data.slots ?? data.Slots ?? data.bookingSlots ?? data.booking_slots ?? [];

  const slots = rawSlots.map((s: any) => ({
    id: s.id || '',
    slot_id: s.slotId ?? s.slot_id ?? s.id ?? '',
    court_id: String(
      s.courtId ?? s.court_id ?? s.CourtId ?? s.court?.id ?? data.courtId ?? data.court_id ?? ''
    ),
    start_time: s.startTime ?? s.start_time ?? '',
    end_time: s.endTime ?? s.end_time ?? '',
    date: s.date ?? data.date ?? '',
    type: s.type ?? 'standard',
    price: Number(s.price ?? s.amount ?? s.total ?? s.Price ?? 0),
    is_peak: s.isPeak ?? s.is_peak ?? false,
  }));

  return {
    id: data.id || '',
    reference_code: data.referenceCode ?? data.reference_code ?? '',
    court_id: String(data.courtId ?? data.court_id ?? slots[0]?.court_id ?? ''),
    court_name: data.courtName ?? data.court_name ?? 'Unknown Court',
    date: data.date || '',
    slots,
    customer: {
      name: data.customerName ?? data.customer?.name ?? 'Unknown',
      email: data.customerEmail ?? data.customer?.email ?? '',
      phone: data.customerPhone ?? data.customer?.phone ?? '',
      notes: data.notes ?? data.customer?.notes ?? '',
    },
    total_amount: Number(data.totalAmount ?? data.total_amount ?? 0),
    status: data.status || 'pending_payment',
    payment_screenshot_url: data.paymentScreenshot ?? data.payment_screenshot_url ?? null,
    payment_reference: data.paymentReference ?? data.payment_reference ?? '',
    payment_expires_at: data.paymentExpiresAt ?? data.payment_expires_at ?? null,
    gcash_number: data.gcashNumber ?? data.gcash_number ?? '',
    created_at: data.createdAt ?? data.created_at ?? new Date().toISOString(),
    updated_at:
      data.updatedAt ??
      data.updated_at ??
      data.createdAt ??
      data.created_at ??
      new Date().toISOString(),
    open_play_session_id: data.openPlaySessionId ?? data.open_play_session_id ?? null,
  };
}

function normalizeSecurityEvent(raw: any): SecurityEvent {
  const d = raw ?? {};
  const rawSeverity = String(d.severity ?? d.Severity ?? 'info').toLowerCase();
  const severity: SecuritySeverity =
    rawSeverity === 'warning' || rawSeverity === 'critical' ? rawSeverity : 'info';

  return {
    id: String(d.id ?? d.Id ?? ''),
    occurred_at:
      d.occurredAt ?? d.occurred_at ?? d.OccurredAt ?? new Date().toISOString(),
    event_type: String(d.eventType ?? d.event_type ?? d.EventType ?? ''),
    severity,
    message: String(d.message ?? d.Message ?? ''),
    actor_email: d.actorEmail ?? d.actor_email ?? d.ActorEmail ?? null,
    ip_hash: d.ipHash ?? d.ip_hash ?? d.IpHash ?? null,
    resource: d.resource ?? d.Resource ?? null,
    success:
      typeof d.success === 'boolean'
        ? d.success
        : d.success === 'true' || d.Success === true,
    error_code: d.errorCode ?? d.error_code ?? d.ErrorCode ?? null,
  };
}

export const adminService = {
  // ✅ UPDATED: Accepts optional startDate and endDate
  async getAnalytics(startDate?: string, endDate?: string): Promise<Analytics> {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    
    const query = params.toString();
    const url = `/api/admin/analytics${query ? `?${query}` : ''}`;
    
    const res = await apiRequest<any>(url);
    return normalizeAnalytics(res?.data ?? res);
  },

  async getSettings(): Promise<ClientSettings> {
    const res = await apiRequest<any>('/api/admin/settings');
    return normalizeClientSettings(res?.data ?? res);
  },

  async updateSettings(payload: {
    name?: string;
    gcash_number?: string;
    gcash_account_name?: string;
    payment_methods?: PaymentMethod[];
    rcbc_account_name?: string;
    rcbc_qr_image?: string;
    available_amenities?: AmenityItem[];
    max_advance_booking_days?: number;
    bookings_enabled?: boolean;
  }): Promise<ClientSettings> {
    const res = await apiRequest<any>('/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify({
        name: payload.name,
        gcashNumber: payload.gcash_number,
        gcashAccountName: payload.gcash_account_name,
        paymentMethods: payload.payment_methods,
        rcbcAccountName: payload.rcbc_account_name,
        rcbcQrImage: payload.rcbc_qr_image,
        availableAmenities: payload.available_amenities,
        maxAdvanceBookingDays: payload.max_advance_booking_days,
        bookingsEnabled: payload.bookings_enabled,
      }),
    });
    return normalizeClientSettings(res?.data ?? res);
  },

  async getBookings(filters?: {
    status?: BookingStatus;
    courtId?: string;
    date?: string;
    search?: string;
  }): Promise<Booking[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.set('status', filters.status);
    if (filters?.courtId) params.set('court_id', filters.courtId);
    if (filters?.date) params.set('date', filters.date);
    if (filters?.search) params.set('search', filters.search);
    const query = params.toString();
    const res = await apiRequest<any>(`/api/admin/bookings${query ? `?${query}` : ''}`);
    const rawList = Array.isArray(res) ? res : res?.data || [];
    return rawList.map((item: any) => normalizeBooking(item));
  },

  async updateBookingStatus(bookingId: string, status: BookingStatus): Promise<Booking> {
    const res = await apiRequest<any>(`/api/admin/bookings/${bookingId}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
    return normalizeBooking(res?.data ?? res);
  },

  async getCourts(): Promise<Court[]> {
    const data = await apiRequest<any>('/api/admin/courts');
    const rawList = Array.isArray(data) ? data : data?.data || data?.courts || [];
    return rawList.map((court: any, idx: number) => normalizeCourt(court, idx));
  },

  async updateCourt(court: Court): Promise<Court> {
    const payload = buildCourtPayload(court);
    const res = await apiRequest<any>(`/api/admin/courts/${court.id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    const updated = res?.data ?? res?.court ?? res;
    return normalizeCourt(updated);
  },

  async getBlockedDates(courtId?: string): Promise<BlockedDate[]> {
    if (!courtId) return [];
    try {
      const res = await apiRequest<any>(`/api/courts/${courtId}/blocked-dates`);
      const rawList = Array.isArray(res) ? res : res?.data || [];
      
      return rawList.map((item: any) => ({
        id: item.id || item.Id || '',
        court_id: courtId,
        date: item.date || item.Date || '',
        reason: item.reason || item.Reason || 'No reason provided',
        startTime: item.startTime || item.StartTime || null,
        endTime: item.endTime || item.EndTime || null,
      }));
    } catch (error) {
      console.error('Failed to fetch blocked dates:', error);
      return [];
    }
  },

  async addBlockedDate(blocked: Omit<BlockedDate, 'id'>): Promise<BlockedDate> {
    const payload = {
      Date: blocked.date,
      StartTime: blocked.startTime || null,
      EndTime: blocked.endTime || null,
      Reason: blocked.reason,
    };

    const res = await apiRequest<any>(`/api/courts/${blocked.court_id}/blocked-dates`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const created = res?.data ?? res;
    return {
      id: created.id || created.Id || '',
      court_id: blocked.court_id,
      date: created.date || created.Date || blocked.date,
      reason: created.reason || created.Reason || blocked.reason,
      startTime: created.startTime || created.StartTime || null,
      endTime: created.endTime || created.EndTime || null,
    };
  },

  async removeBlockedDate(id: string): Promise<void> {
    await apiRequest<void>(`/api/courts/blocked-dates/${id}`, {
      method: 'DELETE',
    });
  },

  async createStaff(data: {
    name: string;
    email: string;
    phone: string;
    password: string;
  }): Promise<any> {
    const res = await apiRequest<any>('/api/admin/staff', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res?.data ?? res;
  },

  async updateStaffStatus(userId: string, status: string): Promise<void> {
    await apiRequest(`/api/admin/staff/${userId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },

  async deleteStaff(userId: string): Promise<void> {
    await apiRequest(`/api/admin/staff/${userId}`, {
      method: 'DELETE',
    });
  },

  async createManualBooking(payload: {
    court_id: string;
    date: string;
    slots: { start_time: string; end_time: string }[];
    customer_name: string;
    customer_email?: string;
    customer_phone?: string;
    notes?: string;
    payment_mode: 'cash' | 'gcash' | 'pay_later' | 'free';
    total_amount?: number;
    staff_notes?: string;
    send_confirmation?: boolean;
  }): Promise<Booking> {
    const res = await apiRequest<any>('/api/admin/bookings/manual', {
      method: 'POST',
      body: JSON.stringify({
        courtId: payload.court_id,
        date: payload.date,
        slots: payload.slots.map((s) => ({
          startTime: s.start_time,
          endTime: s.end_time,
        })),
        customerName: payload.customer_name,
        customerEmail: payload.customer_email || null,
        customerPhone: payload.customer_phone || null,
        notes: payload.notes || null,
        paymentMode: payload.payment_mode,
        totalAmount: payload.total_amount ?? null,
        staffNotes: payload.staff_notes || null,
        sendConfirmation: payload.send_confirmation ?? false,
      }),
    });
    return normalizeBooking(res?.data ?? res);
  },

  async rescheduleBooking(
    bookingId: string,
    payload: RescheduleBookingPayload
  ): Promise<RescheduleBookingResult> {
    const res = await apiRequest<any>(`/api/admin/bookings/${bookingId}/reschedule`, {
      method: 'PATCH',
      body: JSON.stringify({
        courtId: payload.court_id ?? null,
        date: payload.date ?? null,
        slots: payload.slots.map((s) => ({
          startTime: s.start_time,
          endTime: s.end_time,
        })),
        reason: payload.reason ?? null,
        staffNotes: payload.staff_notes ?? null,
      }),
    });

    const data = res?.data ?? res;

    return {
      booking: normalizeBooking(data.booking ?? data.Booking ?? data),
     previous_slots: (data.previousSlots ?? data.previous_slots ?? []).map((s: any) => ({
  id: s.id || '',
  slot_id: s.slotId ?? s.slot_id ?? s.id ?? '',
  court_id: String(s.courtId ?? s.court_id ?? data.previousCourtId ?? data.previous_court_id ?? ''),
  start_time: s.startTime ?? s.start_time ?? '',
  end_time: s.endTime ?? s.end_time ?? '',
  date: s.date ?? '',
  type: s.type ?? 'standard',
  price: Number(s.price ?? 0),
  is_peak: s.isPeak ?? s.is_peak ?? false,
})),
      previous_date: data.previousDate ?? data.previous_date ?? '',
      previous_court_id: data.previousCourtId ?? data.previous_court_id ?? '',
      previous_court_name: data.previousCourtName ?? data.previous_court_name ?? '',
      previous_total_amount: Number(
        data.previousTotalAmount ?? data.previous_total_amount ?? 0
      ),
      new_total_amount: Number(data.newTotalAmount ?? data.new_total_amount ?? 0),
      balance_due: Number(data.balanceDue ?? data.balance_due ?? 0),
      refund_due: Number(data.refundDue ?? data.refund_due ?? 0),
    };
  },

  async getPricingRules(courtId: string): Promise<PricingRule[]> {
    const res = await apiRequest<any>(`/api/admin/courts/${courtId}/pricing-rules`);
    const rawList = Array.isArray(res) ? res : res?.data || [];
    return rawList.map((r: any) => ({
      id: r.id || '',
      court_id: r.courtId ?? r.court_id ?? courtId,
      label: r.label || '',
      days: r.days || '',
      start_time: r.startTime ?? r.start_time ?? '00:00',
      end_time: r.endTime ?? r.end_time ?? '00:00',
      price_per_hour: Number(r.pricePerHour ?? r.price_per_hour ?? 0),
      priority: Number(r.priority ?? 0),
    }));
  },

  async createPricingRule(
    courtId: string,
    rule: {
      label: string;
      days: string;
      start_time: string;
      end_time: string;
      price_per_hour: number;
      priority: number;
    }
  ): Promise<PricingRule> {
    const res = await apiRequest<any>(`/api/admin/courts/${courtId}/pricing-rules`, {
      method: 'POST',
      body: JSON.stringify({
        label: rule.label,
        days: rule.days,
        startTime: rule.start_time,
        endTime: rule.end_time,
        pricePerHour: rule.price_per_hour,
        priority: rule.priority,
      }),
    });
    const r = res?.data ?? res;
    return {
      id: r.id || '',
      court_id: r.courtId ?? r.court_id ?? courtId,
      label: r.label || '',
      days: r.days || '',
      start_time: r.startTime ?? r.start_time ?? '00:00',
      end_time: r.endTime ?? r.end_time ?? '00:00',
      price_per_hour: Number(r.pricePerHour ?? r.price_per_hour ?? 0),
      priority: Number(r.priority ?? 0),
    };
  },

  async updatePricingRule(
    ruleId: string,
    rule: {
      label: string;
      days: string;
      start_time: string;
      end_time: string;
      price_per_hour: number;
      priority: number;
    }
  ): Promise<PricingRule> {
    const res = await apiRequest<any>(`/api/admin/pricing-rules/${ruleId}`, {
      method: 'PUT',
      body: JSON.stringify({
        label: rule.label,
        days: rule.days,
        startTime: rule.start_time,
        endTime: rule.end_time,
        pricePerHour: rule.price_per_hour,
        priority: rule.priority,
      }),
    });
    const r = res?.data ?? res;
    return {
      id: r.id || ruleId,
      court_id: r.courtId ?? r.court_id ?? '',
      label: r.label || '',
      days: r.days || '',
      start_time: r.startTime ?? r.start_time ?? '00:00',
      end_time: r.endTime ?? r.end_time ?? '00:00',
      price_per_hour: Number(r.pricePerHour ?? r.price_per_hour ?? 0),
      priority: Number(r.priority ?? 0),
    };
  },

  async deletePricingRule(ruleId: string): Promise<void> {
    await apiRequest<void>(`/api/admin/pricing-rules/${ruleId}`, {
      method: 'DELETE',
    });
  },

  // ─── Security Events ───
  async getSecurityEvents(
    filters: SecurityEventFilters = {}
  ): Promise<SecurityEvent[]> {
    const params = new URLSearchParams();
    if (filters.severity) params.set('severity', filters.severity);
    if (filters.eventType) params.set('eventType', filters.eventType);
    if (filters.limit != null) params.set('limit', String(filters.limit));

    const qs = params.toString();
    const res = await apiRequest<any>(
      `/api/admin/security-events${qs ? `?${qs}` : ''}`
    );

    const rawList = Array.isArray(res) ? res : res?.data ?? res?.events ?? [];
    return rawList.map((item: any) => normalizeSecurityEvent(item));
  },
};