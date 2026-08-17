import { create } from 'zustand';
import { API_URL } from '../config';

const useSettingsStore = create((set, get) => ({
  features: {
    todayGoal: true,
    thoughts: true,
    habits: true,
    tasks: true,
    calendar: true,
    notebook: true,
    finance: true,
    reading: true,
    files: true,
    apps: true,
    whiteboard: true,
  },
  tldrawLicenseKey: typeof window !== 'undefined' ? (localStorage.getItem('sanad_tldraw_license_key') || '') : '',
  publicSettingsLoaded: false,

  fetchPublicSettings: async () => {
    try {
      const res = await fetch(`${API_URL}/settings/public`);
      if (res.ok) {
        const data = await res.json();
        const key = data.tldrawLicenseKey || '';
        set({ tldrawLicenseKey: key, publicSettingsLoaded: true });
        if (typeof window !== 'undefined') {
          if (key) {
            localStorage.setItem('sanad_tldraw_license_key', key);
          } else {
            localStorage.removeItem('sanad_tldraw_license_key');
          }
        }
      }
    } catch (e) {
      console.error('Failed to fetch public settings', e);
    }
  },

  fetchSettings: async () => {
    try {
      const res = await fetch(`${API_URL}/settings`);
      if (res.ok) {
        const data = await res.json();
        const features = { ...get().features };
        for (const [key, value] of Object.entries(data)) {
          if (key in features) {
            features[key] = value === 'true';
          }
        }
        set({ features });
      }
    } catch (e) {
      console.error('Failed to fetch settings', e);
    }
  },

  toggleFeature: async (featureName) => {
    const currentState = get().features[featureName];
    const newState = !currentState;
    
    // Optimistic update
    set((state) => ({
      features: {
        ...state.features,
        [featureName]: newState,
      },
    }));

    try {
      const res = await fetch(`${API_URL}/settings/${featureName}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: newState.toString() })
      });
      if (!res.ok) throw new Error('Failed to save');
    } catch (e) {
      console.error('Failed to save setting', e);
      // Revert optimistic update
      set((state) => ({
        features: {
          ...state.features,
          [featureName]: currentState,
        },
      }));
    }
  },
}));

export default useSettingsStore;
