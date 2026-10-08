import { describe, it, expect, vi, beforeEach } from 'vitest';
import { API_URL } from '../config';
import { mockFetch, jsonResponse } from '../test/fetchMock';

const WARM_UP_PATHS = [
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
  '/finances/debts',
  '/finances/debts/history',
  '/finances/summary?month=3&year=2026',
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
  '/folders?page=1&pageSize=50&sortBy=name&sortOrder=asc',
  '/apps',
  '/whiteboards',
  '/settings/public'
];

const warmUpRoutes = (overrides = {}) => ({
  ...Object.fromEntries(WARM_UP_PATHS.map(path => [`GET /api${path}`, jsonResponse([])])),
  'GET /api/notebooks': jsonResponse([{ id: 'nb-1' }, { id: 'nb-2' }]),
  'GET /api/notebooks/nb-1/notes': jsonResponse([]),
  'GET /api/notebooks/nb-2/notes': jsonResponse([]),
  'GET /api/notes/sync': jsonResponse([]),
  ...overrides
});

const calledUrls = (fetchMock) => fetchMock.mock.calls.map(([url]) => url);

describe('offlineSync warmUpApiCache', () => {
  let warmUpApiCache;

  beforeEach(async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    // The current month/year is part of the finance summary URL
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-03-15T12:00:00'));
    // Fresh module instance so the module-level hasWarmedUp flag starts false in every test
    vi.resetModules();
    ({ warmUpApiCache } = await import('./offlineSync'));
  });

  it('fetches every cache endpoint once, plus the notes of each notebook and the notes sync', async () => {
    const fetchMock = mockFetch(warmUpRoutes());

    await warmUpApiCache();

    const expected = [
      ...WARM_UP_PATHS,
      '/notebooks/nb-1/notes',
      '/notebooks/nb-2/notes',
      '/notes/sync'
    ].map(path => `${API_URL}${path}`);
    expect(fetchMock.unhandled).toEqual([]);
    expect([...calledUrls(fetchMock)].sort()).toEqual([...expected].sort());
  });

  it('only warms up once per session', async () => {
    const fetchMock = mockFetch(warmUpRoutes());

    await warmUpApiCache();
    const callsAfterFirstWarmUp = fetchMock.mock.calls.length;
    await warmUpApiCache();

    expect(callsAfterFirstWarmUp).toBeGreaterThan(0);
    expect(fetchMock).toHaveBeenCalledTimes(callsAfterFirstWarmUp);
  });

  it('skips per-notebook fetches when the notebooks request fails', async () => {
    const fetchMock = mockFetch(warmUpRoutes({ 'GET /api/notebooks': jsonResponse([{ id: 'nb-1' }], { status: 503 }) }));

    await warmUpApiCache();

    expect(calledUrls(fetchMock).filter(url => url.includes('/notebooks/'))).toEqual([]);
  });

  it('syncs notes changed since the last sync and records the new sync time', async () => {
    localStorage.setItem('last_notes_sync_v2', '2026-03-01T00:00:00.000Z');
    const fetchMock = mockFetch(warmUpRoutes({
      'GET /api/notes/sync?since=2026-03-01T00%3A00%3A00.000Z': jsonResponse(['n-1', 'n-2']),
      'GET /api/notes/n-1': jsonResponse({}),
      'GET /api/notes/n-2': jsonResponse({})
    }));

    await warmUpApiCache();

    expect(fetchMock.unhandled).toEqual([]);
    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/notes/sync?since=2026-03-01T00%3A00%3A00.000Z`);
    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/notes/n-1`);
    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/notes/n-2`);
    expect(localStorage.getItem('last_notes_sync_v2')).toBe(new Date('2026-03-15T12:00:00').toISOString());
  });
});
