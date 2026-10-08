import { describe, it, expect, beforeEach } from 'vitest';
import useWhiteboardStore from './useWhiteboardStore';
import useUIStore from './useUIStore';
import { API_URL } from '../config';
import { mockFetch, jsonResponse, jsonBody } from '../test/fetchMock';

describe('useWhiteboardStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useUIStore.setState({ isOffline: false });
    useWhiteboardStore.setState({
      whiteboards: [],
      activeWhiteboard: null,
      isLoading: false,
      isSaving: false
    });
  });

  it('fetchWhiteboards fetches list from API and saves to cache', async () => {
    const mockList = [
      { id: 'wb-1', name: 'Board 1', icon: 'square' },
      { id: 'wb-2', name: 'Board 2', icon: 'circle' }
    ];
    const fetchMock = mockFetch({
      'GET /api/whiteboards': jsonResponse(mockList)
    });

    const result = await useWhiteboardStore.getState().fetchWhiteboards();

    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/whiteboards`, expect.anything());
    expect(result).toEqual(mockList);
    expect(useWhiteboardStore.getState().whiteboards).toEqual(mockList);
    expect(localStorage.getItem('sanad_whiteboards_list')).toBe(JSON.stringify(mockList));
  });

  it('fetchWhiteboardById returns cached data immediately and updates with fresh data', async () => {
    const cached = { id: 'wb-1', name: 'Cached Board', documentJson: '{}' };
    localStorage.setItem('sanad_whiteboard_data_wb-1', JSON.stringify(cached));

    const fresh = { id: 'wb-1', name: 'Fresh Board', documentJson: '{"shapes":[]}' };
    const fetchMock = mockFetch({
      'GET /api/whiteboards/wb-1': jsonResponse(fresh)
    });

    const result = await useWhiteboardStore.getState().fetchWhiteboardById('wb-1');

    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/whiteboards/wb-1`, expect.anything());
    expect(result).toEqual(fresh);
    expect(useWhiteboardStore.getState().activeWhiteboard).toEqual(fresh);
    expect(localStorage.getItem('sanad_whiteboard_data_wb-1')).toBe(JSON.stringify(fresh));
  });

  it('createWhiteboard returns null when offline', async () => {
    useUIStore.setState({ isOffline: true });

    const result = await useWhiteboardStore.getState().createWhiteboard({ name: 'Offline Board' });

    expect(result).toBeNull();
  });

  it('createWhiteboard posts to server and updates state & cache when online', async () => {
    const created = { id: 'wb-new', name: 'New Board', icon: 'star' };
    const fetchMock = mockFetch({
      'POST /api/whiteboards': jsonResponse(created, { status: 201 })
    });

    const result = await useWhiteboardStore.getState().createWhiteboard({ name: 'New Board', icon: 'star' });

    expect(result).toEqual(created);
    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/whiteboards`, expect.objectContaining({
      method: 'POST',
      body: jsonBody({ name: 'New Board', icon: 'star', documentJson: '' })
    }));
    expect(useWhiteboardStore.getState().activeWhiteboard).toEqual(created);
    expect(useWhiteboardStore.getState().whiteboards[0].id).toBe('wb-new');
  });

  it('updateWhiteboard updates cache and state locally and calls PUT', async () => {
    const existing = { id: 'wb-1', name: 'Original', icon: 'star' };
    useWhiteboardStore.setState({ whiteboards: [existing], activeWhiteboard: existing });

    const updated = { id: 'wb-1', name: 'Renamed', icon: 'star' };
    const fetchMock = mockFetch({
      'PUT /api/whiteboards/wb-1': jsonResponse(updated)
    });

    const result = await useWhiteboardStore.getState().updateWhiteboard('wb-1', { name: 'Renamed' });

    expect(result.name).toBe('Renamed');
    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/whiteboards/wb-1`, expect.objectContaining({
      method: 'PUT',
      body: jsonBody({ name: 'Renamed' })
    }));
    expect(useWhiteboardStore.getState().whiteboards[0].name).toBe('Renamed');
  });

  it('saveWhiteboardState persists to localStorage and syncs with API', async () => {
    const fetchMock = mockFetch({
      'PUT /api/whiteboards/wb-1': jsonResponse({ id: 'wb-1', documentJson: '{"x":1}' })
    });

    await useWhiteboardStore.getState().saveWhiteboardState('wb-1', { documentJson: '{"x":1}' });

    const stored = JSON.parse(localStorage.getItem('sanad_whiteboard_data_wb-1') || '{}');
    expect(stored.documentJson).toBe('{"x":1}');
    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/whiteboards/wb-1`, expect.anything());
  });

  it('deleteWhiteboard removes from cache, updates remaining, and calls DELETE', async () => {
    const b1 = { id: 'wb-1', name: 'B1' };
    const b2 = { id: 'wb-2', name: 'B2' };
    useWhiteboardStore.setState({ whiteboards: [b1, b2], activeWhiteboard: b1 });
    localStorage.setItem('sanad_whiteboard_data_wb-1', JSON.stringify(b1));

    const fetchMock = mockFetch({
      'DELETE /api/whiteboards/wb-1': jsonResponse(null, { status: 204 })
    });

    const success = await useWhiteboardStore.getState().deleteWhiteboard('wb-1');

    expect(success).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/whiteboards/wb-1`, { method: 'DELETE' });
    expect(useWhiteboardStore.getState().whiteboards).toEqual([b2]);
    expect(useWhiteboardStore.getState().activeWhiteboard).toEqual(b2);
    expect(localStorage.getItem('sanad_whiteboard_data_wb-1')).toBeNull();
  });
});
