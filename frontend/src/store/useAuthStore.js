import { create } from 'zustand';
import { API_BASE } from '../config';
import useUIStore from './useUIStore';

const useAuthStore = create((set, get) => ({
  loaded: false,
  setupRequired: false,
  authenticated: false,
  username: null,

  checkAuthStatus: async () => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/status`);
      const data = await res.json();
      set({
        loaded: true,
        setupRequired: data.setupRequired,
        authenticated: data.authenticated,
        username: data.username
      });
    } catch (err) {
      console.error("Auth status error:", err);
      set({ loaded: true, setupRequired: false, authenticated: false, username: null });
    }
  },

  login: async (username, password, isSetup = false) => {
    const endpoint = isSetup ? '/api/auth/setup' : '/api/auth/login';
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (response.ok) {
        const data = await response.json();
        set({ authenticated: true, username: data.username, setupRequired: false });
        return { success: true };
      } else {
        const errText = await response.text();
        return { success: false, error: errText || 'Authentication failed. Please try again.' };
      }
    } catch (err) {
      return { success: false, error: 'Network error. Is the server running?' };
    }
  },

  logout: async () => {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, { method: 'POST' });
      set({ authenticated: false, username: null });
    } catch (err) {
      console.error('Logout failed', err);
      useUIStore.getState().showError('Logout failed');
    }
  }
}));

export default useAuthStore;
