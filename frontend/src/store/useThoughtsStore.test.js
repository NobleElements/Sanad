import { describe, it, expect, beforeEach } from 'vitest';
import useThoughtsStore from './useThoughtsStore';
import useUIStore from './useUIStore';
import { API_URL } from '../config';
import { mockFetch, jsonResponse, errorResponse, jsonBody } from '../test/fetchMock';

const hasToast = (message, type) =>
  useUIStore.getState().toasts.some(t => t.message === message && (!type || t.type === type));

describe('useThoughtsStore', () => {
  beforeEach(() => {
    useUIStore.setState({ toasts: [] });
    useThoughtsStore.setState({
      thoughts: [],
      isLoaded: false,
      hasMore: false
    });
  });

  it('fetchThoughts page 1 sets thoughts and isLoaded', async () => {
    const mockThoughts = Array.from({ length: 20 }, (_, i) => ({ id: `t${i}`, content: `Thought ${i}` }));
    const fetchMock = mockFetch({
      'GET /api/thoughts?page=1&pageSize=20': jsonResponse(mockThoughts)
    });

    await useThoughtsStore.getState().fetchThoughts(1);

    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/thoughts?page=1&pageSize=20`);
    const state = useThoughtsStore.getState();
    expect(state.thoughts).toEqual(mockThoughts);
    expect(state.isLoaded).toBe(true);
    expect(state.hasMore).toBe(true);
  });

  it('fetchThoughts page 2 appends new items without duplicates', async () => {
    const page1 = [{ id: 't1', content: 'One' }];
    useThoughtsStore.setState({ thoughts: page1, isLoaded: true });

    const page2 = [
      { id: 't1', content: 'One' }, // duplicate
      { id: 't2', content: 'Two' }
    ];
    mockFetch({
      'GET /api/thoughts?page=2&pageSize=20': jsonResponse(page2)
    });

    await useThoughtsStore.getState().fetchThoughts(2);

    expect(useThoughtsStore.getState().thoughts).toEqual([
      { id: 't1', content: 'One' },
      { id: 't2', content: 'Two' }
    ]);
  });

  it('fetchThoughts includes search query when provided', async () => {
    const mockThoughts = [{ id: 't1', content: 'Search Match' }];
    const fetchMock = mockFetch({
      'GET /api/thoughts?page=1&pageSize=20&search=idea': jsonResponse(mockThoughts)
    });

    await useThoughtsStore.getState().fetchThoughts(1, 'idea');

    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/thoughts?page=1&pageSize=20&search=idea`);
    expect(useThoughtsStore.getState().thoughts).toEqual(mockThoughts);
  });

  it('addThought posts new thought and refreshes list', async () => {
    const fetchMock = mockFetch({
      'POST /api/thoughts': jsonResponse({ id: 't-new' }, { status: 201 }),
      'GET /api/thoughts?page=1&pageSize=20': jsonResponse([{ id: 't-new', content: 'New Thought', tags: 'dev' }])
    });

    const success = await useThoughtsStore.getState().addThought('New Thought', 'dev');

    expect(success).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/thoughts`, expect.objectContaining({
      method: 'POST',
      body: jsonBody({ content: 'New Thought', tags: 'dev' })
    }));
    expect(hasToast('Thought saved', 'success')).toBe(true);
  });

  it('addThought handles error and shows error toast', async () => {
    mockFetch({ 'POST /api/thoughts': errorResponse(500) });

    const success = await useThoughtsStore.getState().addThought('Fail');

    expect(success).toBe(false);
    expect(hasToast('Failed to save thought', 'error')).toBe(true);
  });

  it('deleteThought calls DELETE and refreshes thoughts', async () => {
    const fetchMock = mockFetch({
      'DELETE /api/thoughts/t1': jsonResponse(null, { status: 204 }),
      'GET /api/thoughts?page=1&pageSize=20': jsonResponse([])
    });

    const success = await useThoughtsStore.getState().deleteThought('t1');

    expect(success).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/thoughts/t1`, { method: 'DELETE' });
    expect(hasToast('Thought deleted', 'success')).toBe(true);
  });

  it('updateThought calls PUT and refreshes thoughts', async () => {
    const fetchMock = mockFetch({
      'PUT /api/thoughts/t1': jsonResponse({ id: 't1', content: 'Updated' }),
      'GET /api/thoughts?page=1&pageSize=20': jsonResponse([{ id: 't1', content: 'Updated' }])
    });

    const success = await useThoughtsStore.getState().updateThought('t1', 'Updated');

    expect(success).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/thoughts/t1`, expect.objectContaining({
      method: 'PUT',
      body: jsonBody({ content: 'Updated' })
    }));
    expect(hasToast('Thought updated', 'success')).toBe(true);
  });
});
