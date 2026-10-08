import { describe, it, expect } from 'vitest';
import useAuthStore from './useAuthStore';
import { API_URL } from '../config';
import { mockFetch, jsonResponse } from '../test/fetchMock';

describe('useAuthStore', () => {
  it('updates state when checkAuthStatus succeeds with authenticated user', async () => {
    const fetchMock = mockFetch({
      'GET /api/auth/status': jsonResponse({
        authenticated: true,
        id: 'user-123',
        username: 'alice',
        isAdmin: true,
        tierId: 2,
        apiKey: 'key-abc'
      })
    });

    await useAuthStore.getState().checkAuthStatus();

    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/auth/status`);
    const state = useAuthStore.getState();
    expect(state.loaded).toBe(true);
    expect(state.authenticated).toBe(true);
    expect(state.id).toBe('user-123');
    expect(state.username).toBe('alice');
    expect(state.isAdmin).toBe(true);
    expect(state.tierId).toBe(2);
    expect(state.apiKey).toBe('key-abc');
  });

  it('resets state when checkAuthStatus returns unauthenticated', async () => {
    mockFetch({ 'GET /api/auth/status': jsonResponse({ authenticated: false }) });

    await useAuthStore.getState().checkAuthStatus();

    const state = useAuthStore.getState();
    expect(state.loaded).toBe(true);
    expect(state.authenticated).toBe(false);
    expect(state.username).toBeUndefined();
    expect(state.isAdmin).toBe(false);
    expect(state.apiKey).toBeNull();
  });

  it('posts logout, clears state and the notes sync markers', async () => {
    useAuthStore.setState({
      authenticated: true,
      username: 'alice',
      isAdmin: true,
      apiKey: 'secret'
    });
    localStorage.setItem('last_notes_sync_v2', '2026-10-01T00:00:00Z');
    const fetchMock = mockFetch({ 'POST /api/auth/logout': jsonResponse(null) });

    await useAuthStore.getState().logout();

    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/auth/logout`, expect.objectContaining({ method: 'POST' }));
    const state = useAuthStore.getState();
    expect(state.authenticated).toBe(false);
    expect(state.username).toBeNull();
    expect(state.isAdmin).toBe(false);
    expect(state.apiKey).toBeNull();
    expect(localStorage.getItem('last_notes_sync_v2')).toBeNull();
  });
});
