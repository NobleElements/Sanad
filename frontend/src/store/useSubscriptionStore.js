import { create } from 'zustand';
import { API_BASE } from '../config';

const useSubscriptionStore = create((set, get) => ({
  tiers: [],
  storageData: { diskUsed: 0, diskLimitBytes: 1 },
  loading: true,
  error: null,

  fetchSubscriptionData: async () => {
    set({ loading: true, error: null });
    try {
      const [tiersRes, storageRes] = await Promise.all([
        fetch(`${API_BASE}/api/storage/tiers`),
        fetch(`${API_BASE}/api/storage`)
      ]);
      
      let newTiers = get().tiers;
      let newStorageData = get().storageData;

      if (tiersRes.ok) {
        newTiers = await tiersRes.json();
      }
      
      if (storageRes.ok) {
        newStorageData = await storageRes.json();
      }

      set({ tiers: newTiers, storageData: newStorageData, loading: false });
    } catch (err) {
      console.error("Failed to load subscription data", err);
      set({ error: "Failed to load subscription data", loading: false });
    }
  }
}));

export default useSubscriptionStore;
