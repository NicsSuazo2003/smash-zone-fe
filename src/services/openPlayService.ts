// src/services/openPlayService.ts
import type {
  OpenPlaySession,
  OpenPlaySessionStats,
  OpenPlayPlayer,
  Booking,
  CreateOpenPlaySessionPayload,
  UpdateOpenPlaySessionPayload,
  CustomerDetails,
  OpenPlayCourt,
} from '@/types';
import { apiRequest } from './api';

/** PII-safe player info returned by the public roster endpoint */
export interface PublicOpenPlayPlayer {
  booking_id: string;
  display_name: string;
  status: string;
  joined_at: string;
}

function normalizeSession(raw: any): OpenPlaySession {
  const courts: OpenPlayCourt[] = (raw.courts ?? []).map((c: any) => ({
    id: c.id,
    name: c.name,
  }));

  return {
    id: raw.id,
    court_id: raw.courtId ?? raw.court_id,
    court_name: raw.courtName ?? raw.court_name,
    courts,
    date: raw.date,
    start_time: raw.startTime ?? raw.start_time,
    end_time: raw.endTime ?? raw.end_time,
    max_players: raw.maxPlayers ?? raw.max_players,
    current_players: raw.currentPlayers ?? raw.current_players,
    spots_left: raw.spotsLeft ?? raw.spots_left,
    price_per_player: raw.pricePerPlayer ?? raw.price_per_player,
    skill_level: raw.skillLevel ?? raw.skill_level,
    host_name: raw.hostName ?? raw.host_name ?? null,
    title: raw.title ?? null,
    description: raw.description ?? null,
    status: raw.status,
    is_active: raw.isActive ?? raw.is_active,
    created_at: raw.createdAt ?? raw.created_at,
  };
}

function normalizeBooking(raw: any): Booking {
  return {
    id: raw.id,
    reference_code: raw.referenceCode ?? raw.reference_code,
    court_id: raw.courtId ?? raw.court_id,
    court_name: raw.courtName ?? raw.court_name,
    date: raw.date,
    slots: (raw.slots ?? []).map((s: any) => ({
      id: s.id,
      slot_id: s.slotId ?? s.slot_id ?? s.id,
      start_time: s.startTime ?? s.start_time,
      end_time: s.endTime ?? s.end_time,
      date: s.date ?? raw.date,
      type: s.type ?? 'standard',
      price: s.price ?? 0,
      is_peak: s.isPeak ?? s.is_peak ?? false,
    })),
    customer: {
      name: raw.customerName ?? raw.customer?.name,
      email: raw.customerEmail ?? raw.customer?.email,
      phone: raw.customerPhone ?? raw.customer?.phone,
      notes: raw.notes ?? raw.customer?.notes,
    },
    total_amount: raw.totalAmount ?? raw.total_amount,
    status: raw.status,
    payment_screenshot_url: raw.paymentScreenshot ?? raw.payment_screenshot_url ?? null,
    payment_reference: raw.paymentReference ?? raw.payment_reference ?? null,
    gcash_number: raw.gcashNumber ?? raw.gcash_number ?? '',
    created_at: raw.createdAt ?? raw.created_at,
    updated_at: raw.updatedAt ?? raw.updated_at ?? raw.createdAt ?? raw.created_at,
    open_play_session_id: raw.openPlaySessionId ?? raw.open_play_session_id ?? null,
  };
}

function normalizePlayer(raw: any): OpenPlayPlayer {
  return {
    booking_id: raw.bookingId ?? raw.booking_id,
    customer_name: raw.customerName ?? raw.customer_name,
    customer_email: raw.customerEmail ?? raw.customer_email,
    customer_phone: raw.customerPhone ?? raw.customer_phone ?? null,
    reference_code: raw.referenceCode ?? raw.reference_code,
    status: raw.status,
    payment_method: raw.paymentMethod ?? raw.payment_method,
    amount_paid: raw.amountPaid ?? raw.amount_paid ?? 0,
    joined_at: raw.joinedAt ?? raw.joined_at,
  };
}

function normalizePublicPlayer(raw: any): PublicOpenPlayPlayer {
  return {
    booking_id: raw.bookingId ?? raw.booking_id,
    display_name: raw.displayName ?? raw.display_name,
    status: raw.status,
    joined_at: raw.joinedAt ?? raw.joined_at,
  };
}

function normalizeStats(raw: any): OpenPlaySessionStats {
  return {
    id: raw.id,
    total_players: raw.totalPlayers ?? raw.total_players ?? 0,
    max_players: raw.maxPlayers ?? raw.max_players ?? 0,
    total_revenue: raw.totalRevenue ?? raw.total_revenue ?? 0,
    pending_revenue: raw.pendingRevenue ?? raw.pending_revenue ?? 0,
    confirmed_count: raw.confirmedCount ?? raw.confirmed_count ?? 0,
    pending_count: raw.pendingCount ?? raw.pending_count ?? 0,
  };
}

export const openPlayService = {
  // ── Public ────────────────────────────────────────────────
  async getUpcomingSessions(): Promise<OpenPlaySession[]> {
    const res = await apiRequest<any[]>('/api/open-play');
    return (res ?? []).map(normalizeSession);
  },

  async getSession(id: string): Promise<OpenPlaySession> {
    const res = await apiRequest<any>(`/api/open-play/${id}`);
    return normalizeSession(res);
  },

  async getSessionPlayers(id: string): Promise<PublicOpenPlayPlayer[]> {
    const res = await apiRequest<any[]>(`/api/open-play/${id}/players/public`);
    return (res ?? []).map(normalizePublicPlayer);
  },

  async joinSession(id: string, customer: CustomerDetails): Promise<Booking> {
    if (!customer.name?.trim()) throw new Error('Name is required');
    if (!customer.email?.trim()) throw new Error('Email is required');

    const res = await apiRequest<any>(`/api/open-play/${id}/join`, {
      method: 'POST',
      body: JSON.stringify({
        customerName: customer.name.trim(),
        customerEmail: customer.email.trim().toLowerCase(),
        customerPhone: customer.phone?.trim() || null,
        notes: customer.notes?.trim() || '',
      }),
    });
    return normalizeBooking(res);
  },

  // ── Admin ─────────────────────────────────────────────────
  async adminGetAllSessions(): Promise<OpenPlaySession[]> {
    const res = await apiRequest<any[]>('/api/admin/open-play');
    return (res ?? []).map(normalizeSession);
  },

  async adminCreateSession(payload: CreateOpenPlaySessionPayload): Promise<OpenPlaySession> {
    const res = await apiRequest<any>('/api/admin/open-play', {
      method: 'POST',
      body: JSON.stringify({
        courtIds: payload.court_ids,
        date: payload.date,
        startTime: payload.start_time,
        endTime: payload.end_time,
        maxPlayers: payload.max_players,
        pricePerPlayer: payload.price_per_player,
        skillLevel: payload.skill_level,
        hostName: payload.host_name || null,
        title: payload.title || null,
        description: payload.description || null,
      }),
    });
    return normalizeSession(res);
  },

  async adminUpdateSession(id: string, payload: UpdateOpenPlaySessionPayload): Promise<OpenPlaySession> {
    const res = await apiRequest<any>(`/api/admin/open-play/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        courtIds: payload.court_ids,
        date: payload.date,
        startTime: payload.start_time,
        endTime: payload.end_time,
        maxPlayers: payload.max_players,
        pricePerPlayer: payload.price_per_player,
        skillLevel: payload.skill_level,
        hostName: payload.host_name || null,
        title: payload.title || null,
        description: payload.description || null,
        isActive: payload.is_active,
      }),
    });
    return normalizeSession(res);
  },

  async adminDeleteSession(id: string): Promise<void> {
    await apiRequest<void>(`/api/admin/open-play/${id}`, { method: 'DELETE' });
  },

  async adminGetPlayers(id: string): Promise<OpenPlayPlayer[]> {
    const res = await apiRequest<any[]>(`/api/admin/open-play/${id}/players`);
    return (res ?? []).map(normalizePlayer);
  },

  async adminGetStats(id: string): Promise<OpenPlaySessionStats> {
    const res = await apiRequest<any>(`/api/admin/open-play/${id}/stats`);
    return normalizeStats(res);
  },
};