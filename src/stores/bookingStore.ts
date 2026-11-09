import { create } from 'zustand';
import type { Court, TimeSlot, BookingSlotItem, CustomerDetails, Booking } from '@/types';
import { courtService } from '@/services/courtService';
import { bookingService } from '@/services/bookingService';
import { todayISO } from '@/utils/format';

interface BookingStoreState {
  courts: Court[];
  selectedCourt: Court | null;
  selectedDate: string;
  slots: TimeSlot[];
  selectedSlotIds: string[];
  customer: CustomerDetails;
  currentBooking: Booking | null;
  loadingCourts: boolean;
  loadingSlots: boolean;
  error: string | null;

  loadCourts: () => Promise<void>;
  selectCourt: (court: Court) => void;
  setDate: (date: string) => void;
  loadSlots: () => Promise<void>;
  loadAllCourtsSlots: () => Promise<void>;
  toggleSlot: (slotId: string) => void;
  clearSlots: () => void;
  setCustomer: (customer: Partial<CustomerDetails>) => void;
  createBooking: () => Promise<Booking>;
  reset: () => void;
  refreshSlots: () => Promise<boolean>;
}

const emptyCustomer: CustomerDetails = {
  name: '',
  email: '',
  phone: '',
  notes: '',
};

export const useBookingStore = create<BookingStoreState>((set, get) => ({
  courts: [],
  selectedCourt: null,
  selectedDate: todayISO(),
  slots: [],
  selectedSlotIds: [],
  customer: emptyCustomer,
  currentBooking: null,
  loadingCourts: false,
  loadingSlots: false,
  error: null,

  loadCourts: async () => {
    set({ loadingCourts: true, error: null });
    try {
      const courts = await courtService.getCourts();
      const activeCourts = courts.filter((c) => c.is_active !== false);
      const initialCourt = activeCourts[0] ?? null;

      set({
        courts: activeCourts,
        selectedCourt: initialCourt,
        loadingCourts: false,
      });
    } catch (err) {
      set({
        loadingCourts: false,
        error: err instanceof Error ? err.message : 'Failed to load courts',
      });
    }
  },

  selectCourt: (court) => {
    set({ selectedCourt: court, selectedSlotIds: [], error: null });
    get().loadSlots();
  },

  setDate: (date) => {
    set({ selectedDate: date, selectedSlotIds: [], error: null });
  },

  loadSlots: async () => {
    const { selectedCourt, selectedDate } = get();
    if (!selectedCourt) return;

    set({ loadingSlots: true, error: null });
    try {
      const slots = await courtService.getAvailability(selectedCourt.id, selectedDate);
      set({ slots, loadingSlots: false });
    } catch (err) {
      set({
        loadingSlots: false,
        error: err instanceof Error ? err.message : 'Failed to load slots',
      });
    }
  },

  loadAllCourtsSlots: async () => {
    const { courts, selectedDate } = get();
    if (courts.length === 0) return;

    const requestDate = selectedDate;
    set({ loadingSlots: true, error: null });
    try {
      const results = await Promise.all(
        courts.map((c) => courtService.getAvailability(c.id, requestDate))
      );
      if (get().selectedDate === requestDate) {
        set({ slots: results.flat(), loadingSlots: false });
      }
    } catch (err) {
      if (get().selectedDate === requestDate) {
        set({
          loadingSlots: false,
          error: err instanceof Error ? err.message : 'Failed to load slots',
        });
      }
    }
  },

    refreshSlots: async (): Promise<boolean> => {
    const { courts, selectedDate, selectedSlotIds, slots } = get();
    if (selectedSlotIds.length === 0) return true;

    try {
      // 1. Determine which courts are actually involved in the selection
      const selectedSlotObjs = slots.filter((s) => selectedSlotIds.includes(s.id));
      const courtIds = Array.from(new Set(selectedSlotObjs.map((s) => s.court_id)));

      // 2. Fetch fresh slots for ALL those courts
      const results = await Promise.all(
        courtIds.map((courtId) => courtService.getAvailability(courtId, selectedDate))
      );
      const freshSlots = results.flat();

      // 3. Update the store's slots with the fresh data
      set({ slots: freshSlots });

      // 4. Check if all selected slots are still available
      const allAvailable = selectedSlotIds.every((slotId) => {
        const slot = freshSlots.find((s) => s.id === slotId);
        return slot?.is_available === true;
      });

      if (!allAvailable) {
        const stillAvailableIds = selectedSlotIds.filter((slotId) => {
          const slot = freshSlots.find((s) => s.id === slotId);
          return slot?.is_available === true;
        });
        set({ selectedSlotIds: stillAvailableIds });
        return false;
      }

      return true;
    } catch (err) {
      console.error('Failed to refresh slots:', err);
      return true;
    }
  },

  toggleSlot: (slotId) => {
    set((state) => {
      const slot = state.slots.find((s) => s.id === slotId);
      if (!slot) return state;
      
      const currentCourtId = state.selectedCourt?.id;
      if (currentCourtId !== slot.court_id) {
        const newCourt = state.courts.find(c => c.id === slot.court_id);
        if (newCourt) {
          state.selectedCourt = newCourt;
        }
      }
      
      const exists = state.selectedSlotIds.includes(slotId);
      if (exists) {
        return { selectedSlotIds: state.selectedSlotIds.filter((id) => id !== slotId) };
      }

      if (slot.type === 'fixed_2hr') {
        return { selectedSlotIds: [slotId] };
      }

      const filtered = state.selectedSlotIds.filter((id) => {
        const s = state.slots.find((sl) => sl.id === id);
        return s?.type !== 'fixed_2hr';
      });

      return { selectedSlotIds: [...filtered, slotId] };
    });
  },

  clearSlots: () => set({ selectedSlotIds: [] }),

  setCustomer: (customerData) =>
    set((state) => ({
      customer: { ...state.customer, ...customerData },
    })),

    createBooking: async () => {
    const { selectedDate, selectedSlotIds, slots, customer } = get();
    
    if (selectedSlotIds.length === 0) {
      throw new Error('Please select at least one time slot');
    }

    const selectedSlotObjs = slots.filter((s) => selectedSlotIds.includes(s.id));

    // 1. Group slots by court
    const courtGroupsMap: Record<
      string,
      { courtId: string; slots: { start_time: string; end_time: string }[] }
    > = {};

    selectedSlotObjs.forEach((slot) => {
      if (!courtGroupsMap[slot.court_id]) {
        courtGroupsMap[slot.court_id] = { courtId: slot.court_id, slots: [] };
      }
      courtGroupsMap[slot.court_id].slots.push({
        start_time: slot.start_time,
        end_time: slot.end_time,
      });
    });

    const courtGroups = Object.values(courtGroupsMap);

    if (courtGroups.length === 0) {
      throw new Error('Could not determine courts for selected slots');
    }

    // 2. Total price
    const totalAmount = selectedSlotObjs.reduce((sum, s) => sum + Number(s.price || 0), 0);

    // 3. ONE API call for ALL courts
    const booking = await bookingService.createBooking({
      court_groups: courtGroups,
      date: selectedDate,
      customer,
      total_amount: totalAmount,
    });

    set({
      currentBooking: booking,
      selectedSlotIds: [],
    });

    return booking;
  },

  reset: () =>
    set({
      selectedSlotIds: [],
      currentBooking: null,
      customer: emptyCustomer,
      error: null,
    }),
}));

export function getSelectedSlotItems(state: BookingStoreState): BookingSlotItem[] {
  return state.slots
    .filter((s) => state.selectedSlotIds.includes(s.id))
    .map((s) => ({
      id: s.id,
      slot_id: s.id,
      court_id: s.court_id, // 👈 ADDED THIS
      start_time: s.start_time,
      end_time: s.end_time,
      date: s.date || state.selectedDate,
      type: s.type,
      price: Number(s.price || 0),
      is_peak: s.is_peak || false,
    }));
}
export function getSelectedTotal(state: BookingStoreState): number {
  return state.slots
    .filter((s) => state.selectedSlotIds.includes(s.id))
    .reduce((sum, s) => sum + Number(s.price || 0), 0);
}