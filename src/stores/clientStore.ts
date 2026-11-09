import { create } from 'zustand';
import type { ClientSettings } from '@/types';
import { clientService } from '@/services/clientService';

interface ClientStoreState {
  settings: ClientSettings | null;
  loading: boolean;
  loadSettings: () => Promise<void>;
  setBookingsEnabled: (enabled: boolean) => void;   // ⭐ NEW
}

export const useClientStore = create<ClientStoreState>((set, get) => ({
  settings: null,
  loading: false,

  loadSettings: async () => {
    if (get().settings || get().loading) return; // avoid duplicate fetches
    set({ loading: true });
    try {
      const settings = await clientService.getPublicSettings();
      set({ settings, loading: false });
    } catch (err) {
      console.error('Failed to load client settings:', err);
      set({ loading: false });
    }
  },

  // ⭐ NEW — optimistic, cross-tab friendly update used by Settings.tsx
  setBookingsEnabled: (enabled) =>
    set((s) =>
      s.settings
        ? { settings: { ...s.settings, bookings_enabled: enabled } }
        : {}
    ),
}));