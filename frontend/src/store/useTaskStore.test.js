import { describe, it, expect } from 'vitest';
import useTaskStore from './useTaskStore';
import useUIStore from './useUIStore';
import { API_URL } from '../config';
import { mockFetch, jsonResponse, errorResponse, deferred, jsonBody } from '../test/fetchMock';

const hasToast = (message, type) =>
  useUIStore.getState().toasts.some(t => t.message === message && t.type === type);

describe('useTaskStore', () => {
  it('fetchTasks retrieves tasks from API and updates store', async () => {
    const mockTasks = [
      { id: 't1', title: 'Task 1', status: 0, order: 1 },
      { id: 't2', title: 'Task 2', status: 1, order: 2 }
    ];
    const fetchMock = mockFetch({ 'GET /api/tasks': jsonResponse(mockTasks) });

    await useTaskStore.getState().fetchTasks();

    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/tasks`);
    const state = useTaskStore.getState();
    expect(state.tasks).toEqual(mockTasks);
    expect(state.isLoaded).toBe(true);
  });

  it('createTask posts new task, reloads tasks and shows success toast', async () => {
    const fetchMock = mockFetch({
      'POST /api/tasks': jsonResponse(null, { status: 201 }),
      'GET /api/tasks': jsonResponse([{ id: 't-new', title: 'Brand New Task' }])
    });

    const success = await useTaskStore.getState().createTask({ title: 'Brand New Task', status: 0 });

    expect(success).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/tasks`, expect.objectContaining({
      method: 'POST',
      body: jsonBody({ title: 'Brand New Task', status: 0 })
    }));
    expect(useTaskStore.getState().tasks).toEqual([{ id: 't-new', title: 'Brand New Task' }]);
    expect(hasToast('Task created', 'success')).toBe(true);
  });

  it('updateTaskStatus sends PATCH request with the new status and reloads tasks', async () => {
    const fetchMock = mockFetch({
      'PATCH /api/tasks/t1/status': jsonResponse(null),
      'GET /api/tasks': jsonResponse([{ id: 't1', title: 'Task 1', status: 2 }])
    });

    const success = await useTaskStore.getState().updateTaskStatus('t1', { status: 2 });

    expect(success).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/tasks/t1/status`, expect.objectContaining({
      method: 'PATCH',
      body: jsonBody({ status: 2 })
    }));
    expect(useTaskStore.getState().tasks).toEqual([{ id: 't1', title: 'Task 1', status: 2 }]);
  });

  it('deleteTask sends DELETE request, reloads tasks and shows toast', async () => {
    useTaskStore.setState({ tasks: [{ id: 't1', title: 'Task 1' }] });
    const fetchMock = mockFetch({
      'DELETE /api/tasks/t1': jsonResponse(null, { status: 204 }),
      'GET /api/tasks': jsonResponse([])
    });

    const success = await useTaskStore.getState().deleteTask('t1');

    expect(success).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/tasks/t1`, expect.objectContaining({ method: 'DELETE' }));
    expect(useTaskStore.getState().tasks).toEqual([]);
    expect(hasToast('Task deleted', 'success')).toBe(true);
  });

  it('reorderTasks applies the new order while the request is pending and reverts it on failure', async () => {
    const initialTasks = [
      { id: 't1', title: 'Task 1', order: 0, status: 0 },
      { id: 't2', title: 'Task 2', order: 1, status: 0 }
    ];
    useTaskStore.setState({ tasks: initialTasks });

    const reorderRequest = deferred();
    const fetchMock = mockFetch({
      'PATCH /api/tasks/reorder': () => reorderRequest.promise,
      // The server still has the original order, so the revert reload restores it
      'GET /api/tasks': jsonResponse(initialTasks)
    });

    const reorderPayload = [
      { id: 't2', order: 0, status: 0 },
      { id: 't1', order: 1, status: 0 }
    ];

    const pending = useTaskStore.getState().reorderTasks(reorderPayload);

    // Optimistic state is visible before the server answers
    expect(useTaskStore.getState().tasks.map(t => [t.id, t.order])).toEqual([['t2', 0], ['t1', 1]]);
    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/tasks/reorder`, expect.objectContaining({
      method: 'PATCH',
      body: jsonBody({ tasks: reorderPayload })
    }));

    reorderRequest.resolve(errorResponse(500));
    const result = await pending;

    expect(result).toBe(false);
    expect(useTaskStore.getState().tasks).toEqual(initialTasks);
    expect(hasToast('Failed to reorder tasks', 'error')).toBe(true);
  });

  it('createTask shows error toast and returns false on failure', async () => {
    mockFetch({
      'POST /api/tasks': errorResponse(500)
    });

    const success = await useTaskStore.getState().createTask({ title: 'Broken Task' });

    expect(success).toBe(false);
    expect(hasToast('Failed to create task', 'error')).toBe(true);
  });

  it('updateTaskStatus shows error toast and returns false on failure', async () => {
    mockFetch({
      'PATCH /api/tasks/t1/status': errorResponse(500)
    });

    const success = await useTaskStore.getState().updateTaskStatus('t1', { status: 2 });

    expect(success).toBe(false);
    expect(hasToast('Failed to update task status', 'error')).toBe(true);
  });

  it('deleteTask shows error toast and returns false on failure', async () => {
    mockFetch({
      'DELETE /api/tasks/t1': errorResponse(500)
    });

    const success = await useTaskStore.getState().deleteTask('t1');

    expect(success).toBe(false);
    expect(hasToast('Failed to delete task', 'error')).toBe(true);
  });
});
