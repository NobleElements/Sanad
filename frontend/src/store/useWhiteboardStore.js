import { create } from 'zustand';
import { API_URL } from '../config';
import useUIStore from './useUIStore';

const STORAGE_KEY_LIST = 'sanad_whiteboards_list';
const STORAGE_KEY_DETAIL_PREFIX = 'sanad_whiteboard_data_';

const loadCachedList = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LIST);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn('Failed to load cached whiteboards list', e);
    return [];
  }
};

const setCachedList = (list) => {
  try {
    localStorage.setItem(STORAGE_KEY_LIST, JSON.stringify(list));
  } catch (e) {
    console.warn('Failed to cache whiteboards list', e);
  }
};

const loadCachedDetail = (id) => {
  if (!id) return null;
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_DETAIL_PREFIX}${id}`);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn(`Failed to load cached whiteboard for ${id}`, e);
    return null;
  }
};

const setCachedDetail = (id, data) => {
  if (!id || !data) return;
  try {
    localStorage.setItem(`${STORAGE_KEY_DETAIL_PREFIX}${id}`, JSON.stringify(data));
  } catch (e) {
    console.warn(`Failed to cache whiteboard ${id}`, e);
  }
};

const removeCachedDetail = (id) => {
  if (!id) return;
  try {
    localStorage.removeItem(`${STORAGE_KEY_DETAIL_PREFIX}${id}`);
  } catch (e) {
    console.warn(`Failed to remove cached whiteboard ${id}`, e);
  }
};

const initialCachedList = loadCachedList();
let initialActiveBoard = null;
if (initialCachedList.length > 0) {
  const cached = loadCachedDetail(initialCachedList[0].id);
  if (cached && typeof cached.documentJson === 'string') {
    initialActiveBoard = cached;
  }
}

let isSaveInFlight = false;
let pendingSavePayload = null;

const executeSave = async (id, data) => {
  if (isSaveInFlight) {
    pendingSavePayload = { id, data: { ...pendingSavePayload?.data, ...data } };
    return true;
  }

  isSaveInFlight = true;
  try {
    const res = await fetch(`${API_URL}/whiteboards/${id}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify(data)
    });
    if (res.ok) {
      const serverData = await res.json();
      setCachedDetail(id, serverData);
    }
  } catch (err) {
    console.warn(`Failed to sync whiteboard ${id} to API, local copy preserved`, err);
  } finally {
    isSaveInFlight = false;
    if (pendingSavePayload) {
      const next = pendingSavePayload;
      pendingSavePayload = null;
      executeSave(next.id, next.data);
    }
  }
  return true;
};

const useWhiteboardStore = create((set, get) => ({
  whiteboards: initialCachedList,
  activeWhiteboard: initialActiveBoard,
  isLoading: false,
  isSaving: false,

  fetchWhiteboards: async () => {
    // 1. Instantly return cached list if available
    const cached = loadCachedList();
    if (cached.length > 0) {
      set({ whiteboards: cached });
    }

    // 2. Fetch fresh list from server in background
    try {
      const res = await fetch(`${API_URL}/whiteboards`, {
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (res.ok) {
        const fresh = await res.json();
        setCachedList(fresh);
        set({ whiteboards: fresh });
        return fresh;
      }
    } catch (err) {
      console.warn('Failed to fetch whiteboards list from server, serving local cache', err);
    }
    return cached;
  },

  fetchWhiteboardById: async (id) => {
    if (!id) return null;

    // 1. Immediately serve cached whiteboard from localStorage if it has full documentJson
    const cached = loadCachedDetail(id);
    if (cached && typeof cached.documentJson === 'string') {
      set((state) => ({
        activeWhiteboard: state.activeWhiteboard?.id === id ? { ...state.activeWhiteboard, ...cached } : cached
      }));
    }

    // 2. Fetch fresh whiteboard from API (bypassing browser cache)
    try {
      const res = await fetch(`${API_URL}/whiteboards/${id}`, {
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (res.ok) {
        const fresh = await res.json();
        setCachedDetail(id, fresh);
        set((state) => ({
          activeWhiteboard: fresh,
          whiteboards: state.whiteboards.map((w) =>
            w.id === id
              ? {
                  ...w,
                  name: fresh.name,
                  icon: fresh.icon,
                  cameraX: fresh.cameraX,
                  cameraY: fresh.cameraY,
                  cameraZ: fresh.cameraZ,
                  isMinimapOpen: fresh.isMinimapOpen,
                  updatedAt: fresh.updatedAt
                }
              : w
          )
        }));
        return fresh;
      }
    } catch (err) {
      console.warn(`Failed to fetch whiteboard ${id} from server, serving local cache`, err);
    }
    return cached;
  },

  setActiveWhiteboard: (whiteboard) => {
    if (whiteboard?.id) {
      const cached = loadCachedDetail(whiteboard.id);
      set({ activeWhiteboard: cached || whiteboard });
    } else {
      set({ activeWhiteboard: whiteboard });
    }
  },

  createWhiteboard: async ({ name, icon }) => {
    const isOffline = useUIStore.getState().isOffline;
    if (isOffline) return null;

    try {
      const res = await fetch(`${API_URL}/whiteboards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, icon, documentJson: '' })
      });
      if (res.ok) {
        const created = await res.json();
        setCachedDetail(created.id, created);
        set((state) => {
          const nextList = [
            {
              id: created.id,
              name: created.name,
              icon: created.icon,
              cameraX: created.cameraX,
              cameraY: created.cameraY,
              cameraZ: created.cameraZ,
              isMinimapOpen: created.isMinimapOpen,
              createdAt: created.createdAt,
              updatedAt: created.updatedAt
            },
            ...state.whiteboards
          ];
          setCachedList(nextList);
          return {
            whiteboards: nextList,
            activeWhiteboard: created
          };
        });
        return created;
      }
    } catch (err) {
      console.error('Failed to create whiteboard', err);
    }
    return null;
  },

  updateWhiteboard: async (id, data) => {
    const isOffline = useUIStore.getState().isOffline;
    if (isOffline) return null;

    // Immediately cache locally
    const currentCached = loadCachedDetail(id) || {};
    const updatedLocally = { ...currentCached, ...data, id, updatedAt: new Date().toISOString() };
    setCachedDetail(id, updatedLocally);

    set((state) => {
      const nextList = state.whiteboards.map((w) =>
        w.id === id
          ? {
              ...w,
              name: data.name ?? w.name,
              icon: data.icon ?? w.icon,
              updatedAt: updatedLocally.updatedAt
            }
          : w
      );
      setCachedList(nextList);
      return {
        whiteboards: nextList,
        activeWhiteboard:
          state.activeWhiteboard?.id === id
            ? { ...state.activeWhiteboard, ...updatedLocally }
            : state.activeWhiteboard
      };
    });

    try {
      const res = await fetch(`${API_URL}/whiteboards/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        const updated = await res.json();
        setCachedDetail(id, updated);
        return updated;
      }
    } catch (err) {
      console.error('Failed to update whiteboard on server', err);
    }
    return updatedLocally;
  },

  saveDocumentJson: async (id, documentJson) => {
    return get().saveWhiteboardState(id, { documentJson });
  },

  saveWhiteboardState: async (id, data) => {
    if (!id) return false;

    // 1. Save to localStorage immediately
    const currentCached = loadCachedDetail(id) || {};
    const updated = {
      ...currentCached,
      ...data,
      id,
      updatedAt: new Date().toISOString()
    };
    setCachedDetail(id, updated);

    // Update in-memory state
    set((state) => {
      const nextList = state.whiteboards.map((w) =>
        w.id === id ? { ...w, ...data, updatedAt: updated.updatedAt } : w
      );
      setCachedList(nextList);
      return {
        whiteboards: nextList,
        activeWhiteboard:
          state.activeWhiteboard?.id === id
            ? { ...state.activeWhiteboard, ...updated }
            : state.activeWhiteboard
      };
    });

    // 2. If offline, don't attempt network call
    const isOffline = useUIStore.getState().isOffline;
    if (isOffline) {
      return true;
    }

    // 3. Send to API in background with in-flight coalescing
    return executeSave(id, data);
  },

  deleteWhiteboard: async (id) => {
    removeCachedDetail(id);
    set((state) => {
      const remaining = state.whiteboards.filter((w) => w.id !== id);
      setCachedList(remaining);
      return {
        whiteboards: remaining,
        activeWhiteboard:
          state.activeWhiteboard?.id === id
            ? remaining[0] || null
            : state.activeWhiteboard
      };
    });

    const isOffline = useUIStore.getState().isOffline;
    if (isOffline) return true;

    try {
      const res = await fetch(`${API_URL}/whiteboards/${id}`, {
        method: 'DELETE'
      });
      return res.ok;
    } catch (err) {
      console.error('Failed to delete whiteboard on server', err);
      return false;
    }
  }
}));

export default useWhiteboardStore;
