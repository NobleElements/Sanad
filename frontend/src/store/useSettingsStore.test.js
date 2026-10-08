import { describe, it, expect, beforeEach, vi } from 'vitest';
import useSettingsStore from './useSettingsStore';
import { API_URL } from '../config';
import { mockFetch, jsonResponse, errorResponse, jsonBody } from '../test/fetchMock';

describe('useSettingsStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useSettingsStore.setState({
      features: {
        todayGoal: true,
        thoughts: true,
        habits: true,
        tasks: true,
        calendar: true,
        notebook: true,
        finance: true,
        reading: true,
        files: true,
        apps: true,
        whiteboard: true,
      },
      tldrawLicenseKey: '',
      publicSettingsLoaded: false
    });
  });

  it('fetchPublicSettings loads license key and persists to localStorage', async () => {
    const fetchMock = mockFetch({
      'GET /api/settings/public': jsonResponse({ tldrawLicenseKey: 'lic_xyz123' })
    });

    await useSettingsStore.getState().fetchPublicSettings();

    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/settings/public`);
    const state = useSettingsStore.getState();
    expect(state.tldrawLicenseKey).toBe('lic_xyz123');
    expect(state.publicSettingsLoaded).toBe(true);
    expect(localStorage.getItem('sanad_tldraw_license_key')).toBe('lic_xyz123');
  });

  it('fetchPublicSettings removes key from localStorage when key is empty', async () => {
    localStorage.setItem('sanad_tldraw_license_key', 'old_key');
    mockFetch({
      'GET /api/settings/public': jsonResponse({ tldrawLicenseKey: '' })
    });

    await useSettingsStore.getState().fetchPublicSettings();

    expect(useSettingsStore.getState().tldrawLicenseKey).toBe('');
    expect(localStorage.getItem('sanad_tldraw_license_key')).toBeNull();
  });

  it('fetchSettings parses string settings into boolean features', async () => {
    mockFetch({
      'GET /api/settings': jsonResponse({
        habits: 'false',
        reading: 'false',
        calendar: 'true'
      })
    });

    await useSettingsStore.getState().fetchSettings();

    const features = useSettingsStore.getState().features;
    expect(features.habits).toBe(false);
    expect(features.reading).toBe(false);
    expect(features.calendar).toBe(true);
    expect(features.tasks).toBe(true); // Untouched feature retains default
  });

  it('toggleFeature updates optimistically and calls PUT', async () => {
    const fetchMock = mockFetch({
      'PUT /api/settings/habits': jsonResponse({ success: true })
    });

    expect(useSettingsStore.getState().features.habits).toBe(true);

    await useSettingsStore.getState().toggleFeature('habits');

    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/settings/habits`, expect.objectContaining({
      method: 'PUT',
      body: jsonBody({ value: 'false' })
    }));
    expect(useSettingsStore.getState().features.habits).toBe(false);
  });

  it('toggleFeature rolls back optimistic update on API error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockFetch({
      'PUT /api/settings/habits': errorResponse(500)
    });

    expect(useSettingsStore.getState().features.habits).toBe(true);

    await useSettingsStore.getState().toggleFeature('habits');

    expect(useSettingsStore.getState().features.habits).toBe(true);
    expect(consoleSpy).toHaveBeenCalled();
  });
});
