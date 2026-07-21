import { API_URL } from '../config';

let hasWarmedUp = false;

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
    '/finances/transactions?page=1&limit=50'
  ];

  console.log('[Offline Sync] Warming up API cache...');

  // Fire and forget all requests to warm up the cache
  // We use Promise.allSettled so that one failure doesn't stop others
  Promise.allSettled(
    endpointsToCache.map(endpoint => 
      fetch(`${API_URL}${endpoint}`).catch(err => console.warn(`Failed to cache ${endpoint}:`, err))
    )
  ).then(() => {
    console.log('[Offline Sync] API cache warm up complete.');
  });
};
