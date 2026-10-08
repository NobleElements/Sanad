import { describe, it, expect, vi } from 'vitest';
import useCalendarStore from './useCalendarStore';
import { API_URL } from '../config';
import { mockFetch, jsonResponse, errorResponse, deferred, jsonBody } from '../test/fetchMock';

// fetchTodoTasks requests To Do (status=0) and In Progress (status=1) tasks and merges them sorted by order
const todoTaskRoutes = {
  'GET /api/tasks?status=0&unscheduledOnly=true': jsonResponse([{ id: 'todo-1', order: 2, createdAt: '2026-10-01T00:00:00Z' }]),
  'GET /api/tasks?status=1&unscheduledOnly=true': jsonResponse([{ id: 'doing-1', order: 1, createdAt: '2026-10-01T00:00:00Z' }])
};

describe('useCalendarStore', () => {
  it('fetchEvents requests the given range and normalizes event dates', async () => {
    const rawEvents = [
      { id: 'e1', title: 'Meeting', startDate: '2026-10-10T10:00:00', endDate: '2026-10-10T11:00:00' },
      { id: 'e2', title: 'Workout', startDate: '2026-10-11T08:00:00Z', endDate: '2026-10-11T09:00:00Z' }
    ];
    const fetchMock = mockFetch({
      'GET /api/calendar/events?start=2026-10-01T00:00:00.000Z&end=2026-10-31T23:59:59.000Z': jsonResponse(rawEvents)
    });

    const start = new Date('2026-10-01T00:00:00Z');
    const end = new Date('2026-10-31T23:59:59Z');

    await useCalendarStore.getState().fetchEvents(start, end);

    expect(fetchMock).toHaveBeenCalledWith(
      `${API_URL}/calendar/events?start=2026-10-01T00:00:00.000Z&end=2026-10-31T23:59:59.000Z`,
      expect.anything()
    );
    const state = useCalendarStore.getState();
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
    expect(state.events).toHaveLength(2);
    // e1 should have 'Z' appended
    expect(state.events[0].startDate).toBe('2026-10-10T10:00:00Z');
    expect(state.events[0].endDate).toBe('2026-10-10T11:00:00Z');
    // e2 already had 'Z'
    expect(state.events[1].startDate).toBe('2026-10-11T08:00:00Z');
  });

  it('createEvent shows a temporary event while pending, replaces it with the server event and refreshes todo tasks', async () => {
    const eventData = {
      title: 'Synced Task Event',
      startDate: '2026-10-15T14:00:00Z',
      endDate: '2026-10-15T15:00:00Z',
      taskItemId: 'task-100'
    };
    const createdServerEvent = { ...eventData, id: 'server-event-1', endDate: '2026-10-15T15:00:00' };
    const createRequest = deferred();
    const fetchMock = mockFetch({
      'POST /api/calendar/events': () => createRequest.promise,
      ...todoTaskRoutes
    });

    const pending = useCalendarStore.getState().createEvent(eventData);

    const [tempEvent] = useCalendarStore.getState().events;
    expect(useCalendarStore.getState().events).toHaveLength(1);
    expect(tempEvent).toEqual({ ...eventData, id: expect.stringMatching(/^temp-/), isTemp: true });
    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/calendar/events`, expect.objectContaining({
      method: 'POST',
      body: jsonBody(eventData)
    }));

    createRequest.resolve(jsonResponse(createdServerEvent, { status: 201 }));
    const result = await pending;

    const normalizedServerEvent = { ...createdServerEvent, endDate: '2026-10-15T15:00:00Z' };
    expect(result).toEqual(normalizedServerEvent);
    expect(useCalendarStore.getState().events).toEqual([normalizedServerEvent]);

    // The linked task leaves the unscheduled sidebar: todo tasks are refetched in the background
    await vi.waitFor(() => {
      expect(useCalendarStore.getState().todoTasks.map(t => t.id)).toEqual(['doing-1', 'todo-1']);
    });
  });

  it('createEvent removes the temporary event when the request fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    useCalendarStore.setState({ events: [{ id: 'existing', title: 'Existing' }] });
    mockFetch({ 'POST /api/calendar/events': errorResponse(500) });

    await expect(useCalendarStore.getState().createEvent({ title: 'Doomed' })).rejects.toThrow('Failed to create event');

    expect(useCalendarStore.getState().events).toEqual([{ id: 'existing', title: 'Existing' }]);
  });

  it('updateEvent applies the change while pending, sends it, and stores the server response', async () => {
    useCalendarStore.setState({
      events: [
        { id: 'ev1', title: 'Old Title', startDate: '2026-10-10T09:00:00Z', endDate: '2026-10-10T10:00:00Z' }
      ]
    });

    const updatedServerEvent = {
      id: 'ev1',
      title: 'Updated Title',
      startDate: '2026-10-10T09:30:00Z',
      endDate: '2026-10-10T10:30:00Z'
    };
    const updateRequest = deferred();
    const fetchMock = mockFetch({ 'PUT /api/calendar/events/ev1': () => updateRequest.promise });

    const pending = useCalendarStore.getState().updateEvent('ev1', { title: 'Updated Title' });

    expect(useCalendarStore.getState().events[0]).toEqual({
      id: 'ev1', title: 'Updated Title', startDate: '2026-10-10T09:00:00Z', endDate: '2026-10-10T10:00:00Z'
    });
    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/calendar/events/ev1`, expect.objectContaining({
      method: 'PUT',
      body: jsonBody({ title: 'Updated Title' })
    }));

    updateRequest.resolve(jsonResponse(updatedServerEvent));
    await pending;

    expect(useCalendarStore.getState().events).toEqual([updatedServerEvent]);
  });

  it('updateEvent rolls back the optimistic change when the request fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const original = { id: 'ev1', title: 'Old Title', startDate: '2026-10-10T09:00:00Z' };
    const other = { id: 'ev2', title: 'Untouched' };
    useCalendarStore.setState({ events: [original, other] });
    const updateRequest = deferred();
    mockFetch({ 'PUT /api/calendar/events/ev1': () => updateRequest.promise });

    const pending = useCalendarStore.getState().updateEvent('ev1', { title: 'New Title' });
    expect(useCalendarStore.getState().events[0].title).toBe('New Title');

    updateRequest.resolve(errorResponse(500));
    await expect(pending).rejects.toThrow('Failed to update event');

    expect(useCalendarStore.getState().events).toEqual([original, other]);
  });

  it('a failed updateEvent does not undo a newer update of the same event', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    useCalendarStore.setState({ events: [{ id: 'ev1', title: 'Old Title' }] });
    const firstRequest = deferred();
    const secondRequest = deferred();
    const requests = [firstRequest, secondRequest];
    mockFetch({ 'PUT /api/calendar/events/ev1': () => requests.shift().promise });

    const first = useCalendarStore.getState().updateEvent('ev1', { title: 'First' });
    const second = useCalendarStore.getState().updateEvent('ev1', { title: 'Second' });

    // The first request fails after the second edit was applied: the second edit must survive
    firstRequest.resolve(errorResponse(500));
    await expect(first).rejects.toThrow('Failed to update event');
    expect(useCalendarStore.getState().events).toEqual([{ id: 'ev1', title: 'Second' }]);

    secondRequest.resolve(jsonResponse({ id: 'ev1', title: 'Second' }));
    await second;
    expect(useCalendarStore.getState().events).toEqual([{ id: 'ev1', title: 'Second' }]);
  });

  it('updateCategory applies the change while pending, sends it, and stores the server response', async () => {
    useCalendarStore.setState({ categories: [{ id: 'cat1', name: 'Work', color: '#111111' }] });
    const updateRequest = deferred();
    const fetchMock = mockFetch({ 'PUT /api/calendar/categories/cat1': () => updateRequest.promise });

    const pending = useCalendarStore.getState().updateCategory('cat1', { name: 'Office' });

    expect(useCalendarStore.getState().categories).toEqual([{ id: 'cat1', name: 'Office', color: '#111111' }]);
    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/calendar/categories/cat1`, expect.objectContaining({
      method: 'PUT',
      body: jsonBody({ name: 'Office' })
    }));

    const serverCategory = { id: 'cat1', name: 'Office', color: '#222222' };
    updateRequest.resolve(jsonResponse(serverCategory));
    await expect(pending).resolves.toEqual(serverCategory);
    expect(useCalendarStore.getState().categories).toEqual([serverCategory]);
  });

  it('updateCategory rolls back the optimistic change when the request fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const original = { id: 'cat1', name: 'Work', color: '#111111' };
    const other = { id: 'cat2', name: 'Home', color: '#333333' };
    useCalendarStore.setState({ categories: [original, other] });
    const updateRequest = deferred();
    mockFetch({ 'PUT /api/calendar/categories/cat1': () => updateRequest.promise });

    const pending = useCalendarStore.getState().updateCategory('cat1', { name: 'Office' });
    expect(useCalendarStore.getState().categories[0].name).toBe('Office');

    updateRequest.resolve(errorResponse(500));
    await expect(pending).rejects.toThrow('Failed to update category');

    expect(useCalendarStore.getState().categories).toEqual([original, other]);
  });

  it('deleteEvent sends DELETE, removes event from store and refreshes todo tasks', async () => {
    useCalendarStore.setState({
      events: [
        { id: 'ev1', title: 'To Delete' },
        { id: 'ev2', title: 'To Keep' }
      ]
    });
    const fetchMock = mockFetch({
      'DELETE /api/calendar/events/ev1': jsonResponse(null, { status: 204 }),
      ...todoTaskRoutes
    });

    await useCalendarStore.getState().deleteEvent('ev1');

    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/calendar/events/ev1`, expect.objectContaining({ method: 'DELETE' }));
    expect(useCalendarStore.getState().events).toEqual([{ id: 'ev2', title: 'To Keep' }]);
    await vi.waitFor(() => {
      expect(useCalendarStore.getState().todoTasks.map(t => t.id)).toEqual(['doing-1', 'todo-1']);
    });
  });

  it('deleteCategory moves events to the target category and re-points the last selected category', async () => {
    useCalendarStore.setState({
      categories: [
        { id: 'cat-old', name: 'Work' },
        { id: 'cat-new', name: 'General' }
      ],
      hiddenCategoryIds: ['cat-old'],
      lastSelectedCategoryId: 'cat-old',
      events: [
        { id: 'e1', title: 'Task 1', categoryId: 'cat-old' },
        { id: 'e2', title: 'Task 2', categoryId: 'cat-new' }
      ]
    });
    const fetchMock = mockFetch({
      'DELETE /api/calendar/categories/cat-old?moveToCategoryId=cat-new': jsonResponse(null, { status: 204 })
    });

    await useCalendarStore.getState().deleteCategory('cat-old', 'cat-new');

    expect(fetchMock).toHaveBeenCalledWith(
      `${API_URL}/calendar/categories/cat-old?moveToCategoryId=cat-new`,
      expect.objectContaining({ method: 'DELETE' })
    );
    const state = useCalendarStore.getState();
    expect(state.categories).toEqual([{ id: 'cat-new', name: 'General' }]);
    expect(state.hiddenCategoryIds).toEqual([]);
    expect(state.events).toEqual([
      { id: 'e1', title: 'Task 1', categoryId: 'cat-new', category: { id: 'cat-new', name: 'General' } },
      { id: 'e2', title: 'Task 2', categoryId: 'cat-new' }
    ]);
    expect(state.lastSelectedCategoryId).toBe('cat-new');
    expect(localStorage.getItem('calendarLastCategoryId')).toBe('cat-new');
  });

  it('deleteCategory without a target uncategorizes events and keeps an unrelated last selected category', async () => {
    useCalendarStore.setState({
      categories: [{ id: 'cat-old', name: 'Work' }, { id: 'cat-other', name: 'Home' }],
      lastSelectedCategoryId: 'cat-other',
      events: [{ id: 'e1', title: 'Task 1', categoryId: 'cat-old' }]
    });
    const fetchMock = mockFetch({
      'DELETE /api/calendar/categories/cat-old': jsonResponse(null, { status: 204 })
    });

    await useCalendarStore.getState().deleteCategory('cat-old');

    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/calendar/categories/cat-old`, expect.objectContaining({ method: 'DELETE' }));
    const state = useCalendarStore.getState();
    expect(state.events).toEqual([{ id: 'e1', title: 'Task 1', categoryId: null, category: null }]);
    expect(state.lastSelectedCategoryId).toBe('cat-other');
  });

  it('toggleCategoryVisibility toggles category ID in hiddenCategoryIds array', () => {
    const store = useCalendarStore.getState();
    expect(store.hiddenCategoryIds).toEqual([]);

    store.toggleCategoryVisibility('cat-1');
    expect(useCalendarStore.getState().hiddenCategoryIds).toEqual(['cat-1']);

    store.toggleCategoryVisibility('cat-1');
    expect(useCalendarStore.getState().hiddenCategoryIds).toEqual([]);
  });
});
