import { create } from 'zustand';
import { API_BASE } from '../config';
import useUIStore from './useUIStore';

const useThoughtsStore = create((set, get) => ({
  thoughts: [],
  timeline: [],
  isLoaded: false,

  fetchThoughts: async (page = 1, search = '') => {
    try {
      let url = `${API_BASE}/api/thoughts?page=${page}&pageSize=20`;
      if (search) {
        url += `&search=${encodeURIComponent(search)}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        set((state) => {
          if (page === 1) return { thoughts: data, isLoaded: true, hasMore: data.length >= 20 };
          const existingIds = new Set(state.thoughts.map(t => t.id));
          const newItems = data.filter(t => !existingIds.has(t.id));
          return { thoughts: [...state.thoughts, ...newItems], isLoaded: true, hasMore: data.length >= 20 };
        });
        return data;
      }
    } catch (err) {
      useUIStore.getState().showError('Failed to load thoughts');
    }
  },

  fetchTimeline: async () => {
    try {
      const res = await fetch(`${API_BASE}/api/timeline`);
      if (res.ok) {
        const data = await res.json();
        set({ timeline: data });
      }
    } catch (err) {
      useUIStore.getState().showError('Failed to load timeline');
    }
  },

  addThought: async (content, tags) => {
    try {
      const res = await fetch(`${API_BASE}/api/thoughts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, tags: tags || null })
      });
      if (res.ok) {
        useUIStore.getState().showSuccess('Thought saved');
        await Promise.all([get().fetchThoughts(), get().fetchTimeline()]);
        return true;
      }
      throw new Error('Failed to save');
    } catch (err) {
      useUIStore.getState().showError('Failed to save thought');
      return false;
    }
  },

  deleteThought: async (id) => {
    try {
      const res = await fetch(`${API_BASE}/api/thoughts/${id}`, { method: 'DELETE' });
      if (res.ok) {
        useUIStore.getState().showSuccess('Thought deleted');
        await Promise.all([get().fetchThoughts(1), get().fetchTimeline()]);
        return true;
      }
      throw new Error('Failed to delete');
    } catch (err) {
      useUIStore.getState().showError('Failed to delete thought');
      return false;
    }
  },

  updateThought: async (id, content) => {
    try {
      const res = await fetch(`${API_BASE}/api/thoughts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });
      if (res.ok) {
        useUIStore.getState().showSuccess('Thought updated');
        await Promise.all([get().fetchThoughts(1), get().fetchTimeline()]);
        return true;
      }
      throw new Error('Failed to update');
    } catch (err) {
      useUIStore.getState().showError('Failed to update thought');
      return false;
    }
  }
}));

export default useThoughtsStore;
