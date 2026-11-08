import { create } from 'zustand';
import { API_URL } from '../config';
import useUIStore from './useUIStore';

const useThoughtsStore = create((set, get) => ({
  thoughts: [],
  collections: [],
  activeCollectionId: null, // null for All, '__UNCATEGORIZED__' for uncategorized, or collectionId
  viewMode: localStorage.getItem('sanad_thoughts_viewMode') || 'grid',
  isLoaded: false,
  hasMore: false,

  setViewMode: (mode) => {
    localStorage.setItem('sanad_thoughts_viewMode', mode);
    set({ viewMode: mode });
  },

  setActiveCollectionId: (collectionId) => {
    set({ activeCollectionId: collectionId });
  },

  fetchCollections: async () => {
    try {
      const res = await fetch(`${API_URL}/thought-collections`);
      if (res.ok) {
        const data = await res.json();
        set({ collections: data });
        return data;
      }
    } catch (err) {
      useUIStore.getState().showError('Failed to load collections');
    }
  },

  createCollection: async (name, color = '#6366F1') => {
    try {
      const res = await fetch(`${API_URL}/thought-collections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, color })
      });
      if (res.ok) {
        const created = await res.json();
        useUIStore.getState().showSuccess('Collection created');
        await get().fetchCollections();
        return created;
      }
      throw new Error('Failed to create collection');
    } catch (err) {
      useUIStore.getState().showError('Failed to create collection');
      return null;
    }
  },

  updateCollection: async (id, name, color) => {
    try {
      const res = await fetch(`${API_URL}/thought-collections/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, color })
      });
      if (res.ok) {
        const updated = await res.json();
        useUIStore.getState().showSuccess('Collection updated');
        await Promise.all([get().fetchCollections(), get().fetchThoughts(1)]);
        return updated;
      }
      throw new Error('Failed to update collection');
    } catch (err) {
      useUIStore.getState().showError('Failed to update collection');
      return null;
    }
  },

  deleteCollection: async (id, deleteThoughts = false) => {
    try {
      const res = await fetch(`${API_URL}/thought-collections/${id}?deleteThoughts=${deleteThoughts}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        useUIStore.getState().showSuccess('Collection deleted');
        if (get().activeCollectionId === id) {
          set({ activeCollectionId: null });
        }
        await Promise.all([get().fetchCollections(), get().fetchThoughts(1)]);
        return true;
      }
      throw new Error('Failed to delete collection');
    } catch (err) {
      useUIStore.getState().showError('Failed to delete collection');
      return false;
    }
  },

  fetchThoughts: async (page = 1, search = '', collectionId = undefined) => {
    try {
      const targetCol = collectionId !== undefined ? collectionId : get().activeCollectionId;
      let url = `${API_URL}/thoughts?page=${page}&pageSize=20`;
      if (search) {
        url += `&search=${encodeURIComponent(search)}`;
      }
      if (targetCol) {
        url += `&collectionId=${encodeURIComponent(targetCol)}`;
      }

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        set((state) => {
          if (page === 1) return { thoughts: data, isLoaded: true, hasMore: data.length >= 20 };
          const existingIds = new Set(state.thoughts.map((t) => t.id));
          const newItems = data.filter((t) => !existingIds.has(t.id));
          return { thoughts: [...state.thoughts, ...newItems], isLoaded: true, hasMore: data.length >= 20 };
        });
        return data;
      }
    } catch (err) {
      useUIStore.getState().showError('Failed to load thoughts');
    }
  },

  addThought: async (content, optionsOrTags) => {
    try {
      let body;
      if (typeof optionsOrTags === 'string') {
        body = { content, tags: optionsOrTags };
      } else if (optionsOrTags && typeof optionsOrTags === 'object') {
        body = { content, ...optionsOrTags };
      } else {
        body = { content, tags: null };
      }

      const res = await fetch(`${API_URL}/thoughts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        useUIStore.getState().showSuccess('Thought saved');
        await Promise.all([get().fetchThoughts(1), get().fetchCollections()]);
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
      const res = await fetch(`${API_URL}/thoughts/${id}`, { method: 'DELETE' });
      if (res.ok) {
        useUIStore.getState().showSuccess('Thought deleted');
        await Promise.all([get().fetchThoughts(1), get().fetchCollections()]);
        return true;
      }
      throw new Error('Failed to delete');
    } catch (err) {
      useUIStore.getState().showError('Failed to delete thought');
      return false;
    }
  },

  updateThought: async (id, updatesOrContent) => {
    try {
      const body =
        typeof updatesOrContent === 'string'
          ? { content: updatesOrContent }
          : updatesOrContent;

      const res = await fetch(`${API_URL}/thoughts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        useUIStore.getState().showSuccess('Thought updated');
        await Promise.all([get().fetchThoughts(1), get().fetchCollections()]);
        return true;
      }
      throw new Error('Failed to update');
    } catch (err) {
      useUIStore.getState().showError('Failed to update thought');
      return false;
    }
  },

  moveThought: async (id, collectionId) => {
    try {
      const res = await fetch(`${API_URL}/thoughts/${id}/move`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collectionId })
      });
      if (res.ok) {
        useUIStore.getState().showSuccess('Thought moved');
        await Promise.all([get().fetchThoughts(1), get().fetchCollections()]);
        return true;
      }
      throw new Error('Failed to move');
    } catch (err) {
      useUIStore.getState().showError('Failed to move thought');
      return false;
    }
  },

  togglePinThought: async (id, isPinned) => {
    try {
      const res = await fetch(`${API_URL}/thoughts/${id}/pin`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isPinned !== undefined ? { isPinned } : {})
      });
      if (res.ok) {
        useUIStore.getState().showSuccess(isPinned ? 'Thought pinned' : 'Thought unpinned');
        await get().fetchThoughts(1);
        return true;
      }
      throw new Error('Failed to pin');
    } catch (err) {
      useUIStore.getState().showError('Failed to update pin');
      return false;
    }
  }
}));

export default useThoughtsStore;
