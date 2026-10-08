import { describe, it, expect, beforeEach } from 'vitest';
import useAuthStore from './useAuthStore';
import { API_BASE, API_URL } from '../config';
import { mockFetch, jsonResponse, errorResponse, jsonBody } from '../test/fetchMock';

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.setState({
      loaded: false,
      authenticated: false,
      id: null,
      username: null,
      isAdmin: false,
      tierId: 1,
      tierStartedAt: null,
      tierExpiresAt: null,
      paddleSubscriptionStatus: null,
      apiKey: null
    });
    localStorage.clear();
  });

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

  it('login posts credentials to /api/auth/login and sets authenticated state on success', async () => {
    const fetchMock = mockFetch({
      'POST /api/auth/login': jsonResponse({
        id: 'u-1',
        username: 'alice',
        isAdmin: true,
        tierId: 2,
        apiKey: 'key-123'
      })
    });

    const result = await useAuthStore.getState().login('alice', 'password123');

    expect(result).toEqual({ success: true });
    expect(fetchMock).toHaveBeenCalledWith(`${API_BASE}/api/auth/login`, expect.objectContaining({
      method: 'POST',
      body: jsonBody({ username: 'alice', password: 'password123' })
    }));

    const state = useAuthStore.getState();
    expect(state.authenticated).toBe(true);
    expect(state.username).toBe('alice');
    expect(state.isAdmin).toBe(true);
    expect(state.apiKey).toBe('key-123');
  });

  it('login returns failure and preserves unauthenticated state on wrong password', async () => {
    mockFetch({
      'POST /api/auth/login': errorResponse(401, 'Invalid credentials')
    });

    const result = await useAuthStore.getState().login('alice', 'wrong-pass');

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid credentials');
    expect(useAuthStore.getState().authenticated).toBe(false);
  });

  it('login with isSignup=true posts to /api/auth/signup', async () => {
    const fetchMock = mockFetch({
      'POST /api/auth/signup': jsonResponse({
        id: 'u-new',
        username: 'bob',
        isAdmin: false,
        tierId: 1
      })
    });

    const result = await useAuthStore.getState().login('bob', 'password123', true);

    expect(result).toEqual({ success: true });
    expect(fetchMock).toHaveBeenCalledWith(`${API_BASE}/api/auth/signup`, expect.objectContaining({
      method: 'POST',
      body: jsonBody({ username: 'bob', password: 'password123' })
    }));
    expect(useAuthStore.getState().username).toBe('bob');
    expect(useAuthStore.getState().authenticated).toBe(true);
  });

  it('rerollApiKey updates apiKey in store', async () => {
    useAuthStore.setState({ apiKey: 'old-key' });
    const fetchMock = mockFetch({
      'POST /api/auth/api-key/reroll': jsonResponse({ apiKey: 'new-key-999' })
    });

    const result = await useAuthStore.getState().rerollApiKey();

    expect(result).toEqual({ success: true });
    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/auth/api-key/reroll`, { method: 'POST' });
    expect(useAuthStore.getState().apiKey).toBe('new-key-999');
  });

  it('changePassword posts old and new password', async () => {
    const fetchMock = mockFetch({
      'POST /api/auth/change-password': jsonResponse({ success: true })
    });

    const result = await useAuthStore.getState().changePassword('oldPass', 'newPass123!');

    expect(result).toEqual({ success: true });
    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/auth/change-password`, expect.objectContaining({
      method: 'POST',
      body: jsonBody({ currentPassword: 'oldPass', newPassword: 'newPass123!' })
    }));
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
