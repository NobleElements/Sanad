import { describe, it, expect } from 'vitest';
import useHabitStore from './useHabitStore';
import useUIStore from './useUIStore';
import { API_URL } from '../config';
import { mockFetch, jsonResponse, errorResponse, deferred, jsonBody } from '../test/fetchMock';

const hasToast = (message, type) =>
  useUIStore.getState().toasts.some(t => t.message === message && t.type === type);

describe('useHabitStore', () => {
  it('fetchHabits fetches habits from API and sets isLoaded', async () => {
    const mockHabits = [
      { id: 'h1', name: 'Read 20 mins', order: 0, logs: [] },
      { id: 'h2', name: 'Exercise', order: 1, logs: [{ date: '2026-10-07' }] }
    ];
    const fetchMock = mockFetch({ 'GET /api/habits': jsonResponse(mockHabits) });

    await useHabitStore.getState().fetchHabits();

    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/habits`);
    const state = useHabitStore.getState();
    expect(state.habits).toEqual(mockHabits);
    expect(state.isLoaded).toBe(true);
  });

  it('createHabit posts habit, reloads habits and triggers toast', async () => {
    const fetchMock = mockFetch({
      'POST /api/habits': jsonResponse(null, { status: 201 }),
      'GET /api/habits': jsonResponse([{ id: 'h-new', name: 'Meditate' }])
    });

    const success = await useHabitStore.getState().createHabit({ name: 'Meditate', icon: 'leaf' });

    expect(success).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/habits`, expect.objectContaining({
      method: 'POST',
      body: jsonBody({ name: 'Meditate', icon: 'leaf' })
    }));
    expect(useHabitStore.getState().habits).toEqual([{ id: 'h-new', name: 'Meditate' }]);
    expect(hasToast('Habit created', 'success')).toBe(true);
  });

  it('toggleHabitLog calls toggle endpoint and refreshes habits', async () => {
    const fetchMock = mockFetch({
      'POST /api/habits/h1/toggle': jsonResponse(null),
      'GET /api/habits': jsonResponse([{ id: 'h1', name: 'Read', logs: [{ date: '2026-10-07' }] }])
    });

    const success = await useHabitStore.getState().toggleHabitLog('h1', '2026-10-07');

    expect(success).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/habits/h1/toggle`, expect.objectContaining({
      method: 'POST',
      body: jsonBody({ date: '2026-10-07' })
    }));
    expect(useHabitStore.getState().habits[0].logs).toEqual([{ date: '2026-10-07' }]);
  });

  it('reorderHabits applies the new order while pending and rolls back on API failure', async () => {
    const initialHabits = [
      { id: 'h1', name: 'First' },
      { id: 'h2', name: 'Second' }
    ];
    useHabitStore.setState({ habits: initialHabits });

    const reorderRequest = deferred();
    const fetchMock = mockFetch({
      'PUT /api/habits/reorder': () => reorderRequest.promise,
      'GET /api/habits': jsonResponse(initialHabits)
    });

    const pending = useHabitStore.getState().reorderHabits(0, 1);

    expect(useHabitStore.getState().habits.map(h => h.id)).toEqual(['h2', 'h1']);
    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/habits/reorder`, expect.objectContaining({
      method: 'PUT',
      body: jsonBody({ habitIds: ['h2', 'h1'] })
    }));

    reorderRequest.resolve(errorResponse(500));
    await pending;

    expect(hasToast('Failed to save habit order', 'error')).toBe(true);
    expect(useHabitStore.getState().habits).toEqual(initialHabits);
  });
});
