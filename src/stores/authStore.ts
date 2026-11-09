// src/stores/authStore.ts
import { create } from 'zustand';
import type { AdminUser } from '@/types';
import { apiRequest } from '@/services/api';

interface AuthStoreState {
  user: AdminUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  initializing: boolean; // ✅ new — lets consumers wait before redirecting
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  init: () => void;
  updateProfile: (data: { name?: string; email?: string; phone?: string }) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  getRedirectPath: () => string;
}

// Decodes the JWT payload without verifying the signature — fine here because
// we're just reading claims to populate UI state; the backend still verifies
// the signature on every actual API request.
function decodeToken(token: string): AdminUser | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const role = payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
    const email = payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'];
    const name = payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'];
    const exp = payload.exp;

    if (!exp || Date.now() >= exp * 1000) return null; // expired

    return { id: payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'], name, email, role } as AdminUser;
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthStoreState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  loading: false,
  initializing: true, // ✅ starts true — nobody should redirect until init runs
  error: null,

  login: async (email: string, password: string) => {
    set({ loading: true, error: null });
    try {
      const response = await apiRequest<{ token: string; user: AdminUser }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      localStorage.setItem('admin_token', response.token);
      set({ user: response.user, isAuthenticated: true, loading: false, error: null });
    } catch (err: any) {
      set({ loading: false, error: err.message || 'Invalid email or password', isAuthenticated: false });
      throw err;
    }
  },

  logout: () => {
    localStorage.removeItem('admin_token');
    set({ user: null, isAuthenticated: false, error: null });
  },

  // ✅ Now synchronous-feeling and always resolves user+isAuthenticated together
  init: () => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      set({ isAuthenticated: false, user: null, initializing: false });
      return;
    }

    const user = decodeToken(token);
    if (!user) {
      // expired or malformed — clear it, don't leave a half-authenticated state
      localStorage.removeItem('admin_token');
      set({ isAuthenticated: false, user: null, initializing: false });
      return;
    }

    set({ isAuthenticated: true, user, initializing: false });
  },

  updateProfile: async (data) => {
    set({ loading: true, error: null });
    try {
      const res = await apiRequest<any>('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({ name: data.name, email: data.email, phone: data.phone }),
      });
      const updated = res?.data ?? res;
      set((state) => ({
        user: state.user ? { ...state.user, name: updated.name, email: updated.email, phone: updated.phone } : state.user,
        loading: false,
      }));
    } catch (err: any) {
      set({ loading: false, error: err.message || 'Failed to update profile' });
      throw err;
    }
  },

  changePassword: async (currentPassword, newPassword) => {
    set({ loading: true, error: null });
    try {
      await apiRequest('/api/auth/change-password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      set({ loading: false });
    } catch (err: any) {
      set({ loading: false, error: err.message || 'Failed to change password' });
      throw err;
    }
  },

  getRedirectPath: () => {
    const { user } = get();
    if (!user) return '/login';
    if (user.role === 'admin') return '/admin';
    if (user.role === 'staff') return '/staff/bookings';
    return '/login';
  },
}));