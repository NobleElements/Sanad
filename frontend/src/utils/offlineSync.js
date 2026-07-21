import { API_URL } from '../config';

let hasWarmedUp = false;

const syncNotesCache = async () => {
  try {
    const lastSync = localStorage.getItem('last_notes_sync');
    const url = lastSync ? `/notes/sync?since=${encodeURIComponent(lastSync)}` : '/notes/sync';
    
    const response = await fetch(`${API_URL}${url}`);
    if (response.ok) {
      const ids = await response.json();
      if (ids.length > 0) {
        console.log(`[Offline Sync] Found ${ids.length} updated notes. Caching...`);
        await Promise.allSettled(
          ids.map(id => fetch(`${API_URL}/notes/${id}`).catch(() => {}))
        );
      }
      localStorage.setItem('last_notes_sync', new Date().toISOString());
    }
  } catch (err) {
    console.warn('[Offline Sync] Failed to sync notes cache:', err);
  }
};

export const warmUpApiCache = async () => {
  if (hasWarmedUp) return;
  hasWarmedUp = true;

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const endpointsToCache = [
    '/tasks',
    '/calendar/categories',
    '/calendar/events',
    '/books',
    '/habits',
    '/thoughts?page=1',
    '/notebooks',
    '/notes/latest',
    '/finances/currencies',
    '/finances/categories',
    '/finances/assets',
    '/finances/assets/history',
    `/finances/summary?month=${currentMonth}&year=${currentYear}`,
    '/finances/transactions?page=1&limit=50',
    '/reading/periods',
    '/reading/current',
    '/storage/paddle-config',
    '/storage/history',
    '/storage/tiers',
    '/storage',
    '/subscription/transactions',
    '/admin/users',
    '/admin/datastores',
    '/folders?page=1&pageSize=50&sortBy=name&sortOrder=asc'
  ];

  console.log('[Offline Sync] Warming up API cache...');

  // Fire and forget all requests to warm up the cache
  // We use Promise.allSettled so that one failure doesn't stop others
  Promise.allSettled(
    endpointsToCache.map(endpoint => 
      fetch(`${API_URL}${endpoint}`)
        .then(async (res) => {
          if (endpoint === '/notebooks' && res.ok) {
            try {
              const clone = res.clone();
              const notebooks = await clone.json();
              await Promise.allSettled(
                notebooks.map(nb => fetch(`${API_URL}/notebooks/${nb.id}/notes`).catch(() => {}))
              );
            } catch (e) {
              console.warn('Failed to parse notebooks for offline sync', e);
            }
          }
        })
        .catch(err => console.warn(`Failed to cache ${endpoint}:`, err))
    )
  ).then(() => {
    console.log('[Offline Sync] API cache warm up complete.');
    syncNotesCache();
  });
};
