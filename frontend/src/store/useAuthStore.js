import { create } from 'zustand';
import { API_BASE, API_URL } from '../config';
import useUIStore from './useUIStore';

const useAuthStore = create((set, get) => ({
  loaded: false,
  authenticated: false,
  id: null,
  username: null,
  isAdmin: false,
  tierId: 1,
  tierStartedAt: null,
  tierExpiresAt: null,
  paddleSubscriptionStatus: null,
  apiKey: null,

  checkAuthStatus: async () => {
    try {
      const res = await fetch(`${API_URL}/auth/status`);
      const data = await res.json();
      set({
        loaded: true,
        authenticated: data.authenticated,
        id: data.id || null,
        username: data.username,
        isAdmin: data.isAdmin || false,
        tierId: data.tierId || 1,
        tierStartedAt: data.tierStartedAt || null,
        tierExpiresAt: data.tierExpiresAt || null,
        paddleSubscriptionStatus: data.paddleSubscriptionStatus || null,
        apiKey: data.apiKey || null
      });
    } catch (err) {
      console.error("Auth status error:", err);
      set({ loaded: true, authenticated: false, id: null, username: null, isAdmin: false, apiKey: null, tierStartedAt: null, tierExpiresAt: null, paddleSubscriptionStatus: null });
    }
  },

  login: async (username, password, isSignup = false) => {
    const endpoint = isSignup ? '/api/auth/signup' : '/api/auth/login';
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (response.ok) {
        const data = await response.json();
        set({ 
            authenticated: true, 
            id: data.id,
            username: data.username, 
            isAdmin: data.isAdmin,
            tierId: data.tierId || 1,
            tierStartedAt: data.tierStartedAt || null,
            tierExpiresAt: data.tierExpiresAt || null,
            paddleSubscriptionStatus: data.paddleSubscriptionStatus || null,
            apiKey: data.apiKey || null
        });
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
      await fetch(`${API_URL}/auth/logout`, { method: 'POST' });
      set({ authenticated: false, id: null, username: null, isAdmin: false, tierId: 1, apiKey: null, tierStartedAt: null, tierExpiresAt: null, paddleSubscriptionStatus: null });
    } catch (err) {
      console.error('Logout failed', err);
      useUIStore.getState().showError('Logout failed');
    }
  },

  rerollApiKey: async () => {
    try {
      const res = await fetch(`${API_URL}/auth/api-key/reroll`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        set({ apiKey: data.apiKey });
        return { success: true };
      }
      return { success: false, error: 'Failed to reroll API key' };
    } catch (err) {
      return { success: false, error: 'Network error' };
    }
  },

  changePassword: async (currentPassword, newPassword) => {
    try {
      const res = await fetch(`${API_URL}/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      if (res.ok) {
        return { success: true };
      }
      const errText = await res.text();
      // the api returns a string like "Incorrect current password."
      let errorMsg = errText;
      try {
        const json = JSON.parse(errText);
        errorMsg = json.message || errText;
      } catch (e) {}
      return { success: false, error: errorMsg || 'Failed to change password' };
    } catch (err) {
      return { success: false, error: 'Network error' };
    }
  }
}));

export default useAuthStore;
