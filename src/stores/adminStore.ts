import { create } from 'zustand';
import type {
  Analytics,
  Booking,
  BookingStatus,
  Court,
  BlockedDate,
  PaymentMethod,
  PricingRule,
  RescheduleBookingPayload,
  RescheduleBookingResult,
} from '@/types';
import { adminService } from '@/services/adminService';

// ✅ Type for the manual booking payload — matches adminService.createManualBooking
export interface ManualBookingPayload {
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
}

interface AdminStoreState {
  analytics: Analytics | null;
  bookings: Booking[];
  courts: Court[];
  blockedDates: BlockedDate[];
  paymentMethods: PaymentMethod[];
  loadingAnalytics: boolean;
  loadingBookings: boolean;
  loadingCourts: boolean;
  loadingPaymentMethods: boolean;
  error: string | null;

  // ✅ UPDATED: loadAnalytics now accepts optional dates
  loadAnalytics: (startDate?: string, endDate?: string) => Promise<void>;
  
  loadBookings: (filters?: {
    status?: BookingStatus;
    courtId?: string;
    date?: string;
    search?: string;
  }) => Promise<void>;
  updateBookingStatus: (bookingId: string, status: BookingStatus) => Promise<void>;
  createManualBooking: (payload: ManualBookingPayload) => Promise<Booking>;
  
  rescheduleBooking: (
    bookingId: string,
    payload: RescheduleBookingPayload
  ) => Promise<RescheduleBookingResult>;
  
  loadCourts: () => Promise<void>;
  updateCourt: (court: Court) => Promise<void>;
  loadBlockedDates: (courtId?: string) => Promise<void>;
  addBlockedDate: (blocked: Omit<BlockedDate, 'id'>) => Promise<void>;
  removeBlockedDate: (id: string) => Promise<void>;
  loadPaymentMethods: () => Promise<void>;
  updatePaymentMethods: (methods: PaymentMethod[]) => Promise<void>;

  loadPricingRules: (courtId: string) => Promise<PricingRule[]>;
  addPricingRule: (
    courtId: string,
    rule: Omit<PricingRule, 'id' | 'court_id'>
  ) => Promise<PricingRule>;
  editPricingRule: (
    ruleId: string,
    rule: Omit<PricingRule, 'id' | 'court_id'>
  ) => Promise<PricingRule>;
  removePricingRule: (courtId: string, ruleId: string) => Promise<void>;
}

export const useAdminStore = create<AdminStoreState>((set, get) => ({
  analytics: null,
  bookings: [],
  courts: [],
  blockedDates: [],
  paymentMethods: [],
  loadingAnalytics: false,
  loadingBookings: false,
  loadingCourts: false,
  loadingPaymentMethods: false,
  error: null,

  // ✅ UPDATED: Implementation accepts dates and passes them to service
  loadAnalytics: async (startDate, endDate) => {
    set({ loadingAnalytics: true, error: null });
    try {
      const analytics = await adminService.getAnalytics(startDate, endDate);
      set({ analytics, loadingAnalytics: false });
    } catch (err) {
      set({
        loadingAnalytics: false,
        error: err instanceof Error ? err.message : 'Failed to load analytics',
      });
    }
  },

  loadBookings: async (filters) => {
    set({ loadingBookings: true, error: null });
    try {
      const bookings = await adminService.getBookings(filters);
      set({ bookings, loadingBookings: false });
    } catch (err) {
      set({
        loadingBookings: false,
        error: err instanceof Error ? err.message : 'Failed to load bookings',
      });
    }
  },

  updateBookingStatus: async (bookingId, status) => {
    try {
      const updated = await adminService.updateBookingStatus(bookingId, status);
      set((state) => ({
        bookings: state.bookings.map((b) => (b.id === bookingId ? updated : b)),
      }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to update booking' });
      throw err;
    }
  },

  createManualBooking: async (payload) => {
    try {
      const booking = await adminService.createManualBooking(payload);
      set((state) => ({ bookings: [booking, ...state.bookings] }));
      return booking;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to create booking',
      });
      throw err;
    }
  },

  rescheduleBooking: async (bookingId, payload) => {
    try {
      const result = await adminService.rescheduleBooking(bookingId, payload);
      set((state) => ({
        bookings: state.bookings.map((b) =>
          b.id === bookingId ? result.booking : b
        ),
      }));
      return result;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to reschedule booking',
      });
      throw err;
    }
  },

  loadCourts: async () => {
    set({ loadingCourts: true, error: null });
    try {
      const courts = await adminService.getCourts();
      set({ courts, loadingCourts: false });
    } catch (err) {
      set({
        loadingCourts: false,
        error: err instanceof Error ? err.message : 'Failed to load courts',
      });
    }
  },

  updateCourt: async (court) => {
    const previous = get().courts;

    set((state) => ({
      courts: state.courts.map((c) => (c.id === court.id ? { ...c, ...court } : c)),
    }));

    try {
      const updated = await adminService.updateCourt(court);

      set((state) => ({
        courts: state.courts.map((c) =>
          c.id === court.id ? { ...c, ...court, ...(updated ?? {}) } : c
        ),
      }));
    } catch (err) {
      set({
        courts: previous,
        error: err instanceof Error ? err.message : 'Failed to update court',
      });
      throw err;
    }
  },

  loadBlockedDates: async (courtId) => {
    try {
      const blocked = await adminService.getBlockedDates(courtId);
      set({ blockedDates: blocked });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load blocked dates' });
    }
  },

  addBlockedDate: async (blocked) => {
    try {
      await adminService.addBlockedDate(blocked);
      await get().loadBlockedDates(blocked.court_id);
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to add blocked date' });
    }
  },

  removeBlockedDate: async (id) => {
    try {
      await adminService.removeBlockedDate(id);
      set((state) => ({
        blockedDates: state.blockedDates.filter((b) => b.id !== id),
      }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to remove blocked date' });
    }
  },

  loadPaymentMethods: async () => {
    set({ loadingPaymentMethods: true, error: null });
    try {
      const settings = await adminService.getSettings();
      set({
        paymentMethods: settings.payment_methods || [],
        loadingPaymentMethods: false,
      });
    } catch (err) {
      set({
        loadingPaymentMethods: false,
        error: err instanceof Error ? err.message : 'Failed to load payment methods',
      });
    }
  },

  updatePaymentMethods: async (methods: PaymentMethod[]) => {
    try {
      await adminService.updateSettings({
        payment_methods: methods,
      });
      set({ paymentMethods: methods });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to update payment methods' });
      throw err;
    }
  },

  loadPricingRules: async (courtId) => {
    try {
      const rules = await adminService.getPricingRules(courtId);
      set((state) => ({
        courts: state.courts.map((c) =>
          c.id === courtId ? { ...c, pricing_rules: rules } : c
        ),
      }));
      return rules;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load pricing rules' });
      throw err;
    }
  },

  addPricingRule: async (courtId, rule) => {
    try {
      const created = await adminService.createPricingRule(courtId, rule);
      set((state) => ({
        courts: state.courts.map((c) =>
          c.id === courtId
            ? { ...c, pricing_rules: [...(c.pricing_rules ?? []), created] }
            : c
        ),
      }));
      return created;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to add pricing rule' });
      throw err;
    }
  },

  editPricingRule: async (ruleId, rule) => {
    try {
      const updated = await adminService.updatePricingRule(ruleId, rule);
      set((state) => ({
        courts: state.courts.map((c) => ({
          ...c,
          pricing_rules: (c.pricing_rules ?? []).map((r) =>
            r.id === ruleId ? updated : r
          ),
        })),
      }));
      return updated;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to update pricing rule' });
      throw err;
    }
  },

  removePricingRule: async (courtId, ruleId) => {
    try {
      await adminService.deletePricingRule(ruleId);
      set((state) => ({
        courts: state.courts.map((c) =>
          c.id === courtId
            ? {
                ...c,
                pricing_rules: (c.pricing_rules ?? []).filter((r) => r.id !== ruleId),
              }
            : c
        ),
      }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to delete pricing rule' });
      throw err;
    }
  },
}));