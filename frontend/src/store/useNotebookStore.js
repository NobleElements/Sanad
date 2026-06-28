import { create } from 'zustand';
import { API_BASE, API_URL } from '../config';
import useUIStore from './useUIStore';

const useNotebookStore = create((set, get) => ({
  notebooks: [],
  notes: [],
  selectedNotebookId: null,
  selectedNote: null,
  searchResults: null,

  fetchNotebooks: async () => {
    try {
      const res = await fetch(`${API_URL}/notebooks`);
      if (res.ok) {
        const data = await res.json();
        set({ notebooks: data });
        return data;
      }
    } catch (e) {
      console.error('Failed to load notebooks:', e);
    }
    return [];
  },

  fetchNotes: async (notebookId) => {
    const state = get();
    const nb = state.notebooks.find(n => n.id === notebookId);
    if (nb && nb.notes) {
      set({ notes: nb.notes });
      return nb.notes;
    }
    
    try {
      const res = await fetch(`${API_URL}/notebooks/${notebookId}/notes`);
      if (res.ok) {
        const data = await res.json();
        set({ notes: data });
        return data;
      }
    } catch (e) {
      console.error('Failed to load notes:', e);
    }
    return [];
  },

  fetchNote: async (noteId) => {
    try {
      const res = await fetch(`${API_URL}/notes/${noteId}`);
      if (res.ok) {
        const note = await res.json();
        set({ selectedNote: note });
        return note;
      }
    } catch (e) {
      console.error('Failed to load note:', e);
    }
    return null;
  },

  fetchLatestNote: async () => {
    const state = get();
    if (state.notebooks.length > 0) {
      let latest = null;
      for (const nb of state.notebooks) {
        if (!nb.notes) continue;
        for (const note of nb.notes) {
          if (!latest || new Date(note.updatedAt) > new Date(latest.updatedAt)) {
            latest = note;
          }
        }
      }
      if (latest) return latest;
    }

    try {
      const res = await fetch(`${API_URL}/notes/latest`);
      if (res.ok && res.status !== 204) {
        return await res.json();
      }
    } catch (e) {
      console.error('Failed to load latest note:', e);
    }
    return null;
  },

  setSelectedNotebookId: (id) => set({ selectedNotebookId: id }),
  setSelectedNote: (note) => set({ selectedNote: note }),
  setSearchResults: (results) => set({ searchResults: results }),

  searchNotes: async (query) => {
    if (!query.trim()) {
      set({ searchResults: null });
      return;
    }
    try {
      const res = await fetch(`${API_URL}/notes/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        set({ searchResults: await res.json() });
      }
    } catch (e) {
      console.error('Search failed:', e);
    }
  },

  createNotebook: async (name) => {
    if (!name.trim()) return null;
    try {
      const res = await fetch(`${API_URL}/notebooks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (res.ok) {
        const nb = await res.json();
        set((state) => ({ notebooks: [...state.notebooks, nb] }));
        return nb;
      }
      throw new Error('Failed to create notebook');
    } catch (e) {
      useUIStore.getState().showError('Failed to create notebook');
      return null;
    }
  },

  renameNotebook: async (id, name) => {
    if (!name.trim()) return false;
    try {
      const res = await fetch(`${API_URL}/notebooks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (res.ok) {
        const updated = await res.json();
        set((state) => ({
          notebooks: state.notebooks.map(nb => nb.id === id ? { ...updated, notes: nb.notes || [] } : nb)
        }));
        return true;
      }
      throw new Error('Failed to rename notebook');
    } catch (e) {
      useUIStore.getState().showError('Failed to rename notebook');
      return false;
    }
  },

  deleteNotebook: async (id) => {
    try {
      const res = await fetch(`${API_URL}/notebooks/${id}`, { method: 'DELETE' });
      if (res.ok) {
        set((state) => ({ notebooks: state.notebooks.filter(nb => nb.id !== id) }));
        return true;
      }
      throw new Error('Failed to delete notebook');
    } catch (e) {
      useUIStore.getState().showError('Failed to delete notebook');
      return false;
    }
  },

  createNote: async (notebookId) => {
    if (!notebookId) return null;
    try {
      const res = await fetch(`${API_URL}/notebooks/${notebookId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Untitled Note' }),
      });
      if (res.ok) {
        const note = await res.json();
        const newNoteMetadata = { id: note.id, title: note.title, notebookId: note.notebookId, createdAt: note.createdAt, updatedAt: note.updatedAt };
        set((state) => ({
          notes: [newNoteMetadata, ...state.notes],
          notebooks: state.notebooks.map(nb => 
            nb.id === notebookId ? { ...nb, notes: [newNoteMetadata, ...(nb.notes || [])] } : nb
          )
        }));
        return note;
      }
      throw new Error('Failed to create note');
    } catch (e) {
      useUIStore.getState().showError('Failed to create note');
      return null;
    }
  },

  updateNote: async (id, title, content) => {
    try {
      const res = await fetch(`${API_URL}/notes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content }),
      });
      if (res.ok) {
        const updatedTime = new Date().toISOString();
        set((state) => {
          const updatedNotes = state.notes.map(n =>
            n.id === id ? { ...n, title, updatedAt: updatedTime } : n
          );
          const updatedNotebooks = state.notebooks.map(nb => {
            if (!nb.notes) return nb;
            return {
              ...nb,
              notes: nb.notes.map(n => n.id === id ? { ...n, title, updatedAt: updatedTime } : n)
            };
          });
          return { notes: updatedNotes, notebooks: updatedNotebooks };
        });
        return true;
      }
      throw new Error('Failed to update note');
    } catch (e) {
      console.error('Failed to save note:', e);
      return false;
    }
  },

  deleteNote: async (id) => {
    try {
      const res = await fetch(`${API_URL}/notes/${id}`, { method: 'DELETE' });
      if (res.ok) {
        set((state) => ({ 
          notes: state.notes.filter(n => n.id !== id),
          notebooks: state.notebooks.map(nb => {
            if (!nb.notes) return nb;
            return {
              ...nb,
              notes: nb.notes.filter(n => n.id !== id)
            };
          })
        }));
        return true;
      }
      throw new Error('Failed to delete note');
    } catch (e) {
      useUIStore.getState().showError('Failed to delete note');
      return false;
    }
  },

  uploadImage: async (noteId, file) => {
    if (!noteId) return null;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`${API_URL}/notes/${noteId}/images`, {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        return `${API_BASE}${data.url}`;
      }
      throw new Error('Failed to upload image');
    } catch (e) {
      useUIStore.getState().showError('Failed to upload image');
      return null;
    }
  }

}));

export default useNotebookStore;
