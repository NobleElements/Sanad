import { describe, it, expect, beforeEach } from 'vitest';
import useAppStore from './useAppStore';
import { API_URL } from '../config';
import { mockFetch, jsonResponse, errorResponse, jsonBody } from '../test/fetchMock';

describe('useAppStore', () => {
  beforeEach(() => {
    useAppStore.setState({ apps: [], isLoading: false });
  });

  it('fetchApps loads apps and updates isLoading', async () => {
    const mockApps = [
      { id: 'app-1', name: 'Calculator', html: '<script></script>' },
      { id: 'app-2', name: 'Timer', html: '<script></script>' }
    ];
    const fetchMock = mockFetch({ 'GET /api/apps': jsonResponse(mockApps) });

    const fetchPromise = useAppStore.getState().fetchApps();
    expect(useAppStore.getState().isLoading).toBe(true);

    await fetchPromise;

    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/apps`);
    expect(useAppStore.getState().apps).toEqual(mockApps);
    expect(useAppStore.getState().isLoading).toBe(false);
  });

  it('fetchApps handles error gracefully', async () => {
    mockFetch({ 'GET /api/apps': errorResponse(500) });

    await useAppStore.getState().fetchApps();

    expect(useAppStore.getState().apps).toEqual([]);
    expect(useAppStore.getState().isLoading).toBe(false);
  });

  it('createApp posts new app, prepends to apps, and returns app', async () => {
    const initial = [{ id: 'app-old', name: 'Old' }];
    useAppStore.setState({ apps: initial });

    const newApp = { id: 'app-new', name: 'Weather', html: '<div></div>' };
    const fetchMock = mockFetch({
      'POST /api/apps': jsonResponse(newApp, { status: 201 })
    });

    const result = await useAppStore.getState().createApp({ name: 'Weather', html: '<div></div>' });

    expect(result).toEqual(newApp);
    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/apps`, expect.objectContaining({
      method: 'POST',
      body: jsonBody({ name: 'Weather', html: '<div></div>' })
    }));
    expect(useAppStore.getState().apps).toEqual([newApp, ...initial]);
  });

  it('createApp returns null on failure', async () => {
    mockFetch({ 'POST /api/apps': errorResponse(400) });

    const result = await useAppStore.getState().createApp({ name: 'Broken' });

    expect(result).toBeNull();
  });

  it('updateApp updates existing app in state and returns updated app', async () => {
    const initial = [
      { id: 'app-1', name: 'Old Name', html: 'old' },
      { id: 'app-2', name: 'Other', html: 'other' }
    ];
    useAppStore.setState({ apps: initial });

    const updated = { id: 'app-1', name: 'New Name', html: 'new' };
    const fetchMock = mockFetch({
      'PUT /api/apps/app-1': jsonResponse(updated)
    });

    const result = await useAppStore.getState().updateApp('app-1', { name: 'New Name', html: 'new' });

    expect(result).toEqual(updated);
    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/apps/app-1`, expect.objectContaining({
      method: 'PUT',
      body: jsonBody({ name: 'New Name', html: 'new' })
    }));
    expect(useAppStore.getState().apps[0]).toEqual(updated);
    expect(useAppStore.getState().apps[1]).toEqual(initial[1]);
  });

  it('updateApp returns null on failure without mutating state', async () => {
    const initial = [{ id: 'app-1', name: 'Old' }];
    useAppStore.setState({ apps: initial });
    mockFetch({ 'PUT /api/apps/app-1': errorResponse(500) });

    const result = await useAppStore.getState().updateApp('app-1', { name: 'Fail' });

    expect(result).toBeNull();
    expect(useAppStore.getState().apps).toEqual(initial);
  });

  it('deleteApp removes app from state and returns true', async () => {
    const initial = [
      { id: 'app-1', name: 'App 1' },
      { id: 'app-2', name: 'App 2' }
    ];
    useAppStore.setState({ apps: initial });
    const fetchMock = mockFetch({
      'DELETE /api/apps/app-1': jsonResponse(null, { status: 204 })
    });

    const result = await useAppStore.getState().deleteApp('app-1');

    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/apps/app-1`, { method: 'DELETE' });
    expect(useAppStore.getState().apps).toEqual([{ id: 'app-2', name: 'App 2' }]);
  });

  it('deleteApp returns false on failure without removing app', async () => {
    const initial = [{ id: 'app-1', name: 'App 1' }];
    useAppStore.setState({ apps: initial });
    mockFetch({ 'DELETE /api/apps/app-1': errorResponse(500) });

    const result = await useAppStore.getState().deleteApp('app-1');

    expect(result).toBe(false);
    expect(useAppStore.getState().apps).toEqual(initial);
  });
});
