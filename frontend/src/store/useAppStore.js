import { create } from 'zustand';
import { API_URL } from '../config';

const useAppStore = create((set, get) => ({
  apps: [],
  isLoading: false,

  fetchApps: async () => {
    set({ isLoading: true });
    try {
      const res = await fetch(`${API_URL}/apps`);
      if (res.ok) {
        const apps = await res.json();
        set({ apps });
      }
    } catch (e) {
      console.error('Failed to fetch apps', e);
    } finally {
      set({ isLoading: false });
    }
  },

  createApp: async (appData) => {
    try {
      const res = await fetch(`${API_URL}/apps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appData)
      });
      if (res.ok) {
        const newApp = await res.json();
        set((state) => ({ apps: [newApp, ...state.apps] }));
        return newApp;
      }
      return null;
    } catch (e) {
      console.error('Failed to create app', e);
      return null;
    }
  },

  updateApp: async (id, appData) => {
    try {
      const res = await fetch(`${API_URL}/apps/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appData)
      });
      if (res.ok) {
        const updatedApp = await res.json();
        set((state) => ({
          apps: state.apps.map(a => a.id === id ? updatedApp : a)
        }));
        return updatedApp;
      }
      return null;
    } catch (e) {
      console.error('Failed to update app', e);
      return null;
    }
  },

  deleteApp: async (id) => {
    try {
      const res = await fetch(`${API_URL}/apps/${id}`, {
        method: 'DELETE'
      });
      if (res.ok || res.status === 204) {
        set((state) => ({
          apps: state.apps.filter(a => a.id !== id)
        }));
        return true;
      }
      return false;
    } catch (e) {
      console.error('Failed to delete app', e);
      return false;
    }
  }
}));

export default useAppStore;
