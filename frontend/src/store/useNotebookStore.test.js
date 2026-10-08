import { describe, it, expect, beforeEach } from 'vitest';
import useNotebookStore from './useNotebookStore';
import useUIStore from './useUIStore';
import { API_URL } from '../config';
import { mockFetch, jsonResponse, jsonBody, errorResponse } from '../test/fetchMock';

const hasToast = (message, type) =>
  useUIStore.getState().toasts.some(t => t.message === message && (!type || t.type === type));

describe('useNotebookStore', () => {
  beforeEach(() => {
    useUIStore.setState({ toasts: [] });
    useNotebookStore.setState({
      notebooks: [],
      notes: [],
      selectedNotebookId: null,
      selectedNote: null,
      searchResults: null
    });
  });
  it('fetchNotebooks retrieves notebooks and sets store state', async () => {
    const mockNotebooks = [
      { id: 'nb-1', name: 'Work', notes: [{ id: 'n-1', title: 'Note 1' }] },
      { id: 'nb-2', name: 'Personal', notes: [] }
    ];
    const fetchMock = mockFetch({ 'GET /api/notebooks': jsonResponse(mockNotebooks) });

    const result = await useNotebookStore.getState().fetchNotebooks();

    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/notebooks`);
    expect(result).toEqual(mockNotebooks);
    expect(useNotebookStore.getState().notebooks).toEqual(mockNotebooks);
  });

  it('createNotebook posts the trimmed name and appends notebook to store', async () => {
    const newNb = { id: 'nb-new', name: 'Projects', notes: [] };
    const fetchMock = mockFetch({ 'POST /api/notebooks': jsonResponse(newNb, { status: 201 }) });

    const result = await useNotebookStore.getState().createNotebook('  Projects ');

    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/notebooks`, expect.objectContaining({
      method: 'POST',
      body: jsonBody({ name: 'Projects' })
    }));
    expect(result).toEqual(newNb);
    expect(useNotebookStore.getState().notebooks).toEqual([newNb]);
  });

  it('renameNotebook sends PUT and updates notebook name in store, keeping its notes', async () => {
    useNotebookStore.setState({
      notebooks: [{ id: 'nb-1', name: 'Old Name', notes: [{ id: 'n1', title: 'Doc' }] }]
    });
    const fetchMock = mockFetch({ 'PUT /api/notebooks/nb-1': jsonResponse({ id: 'nb-1', name: 'New Name' }) });

    const success = await useNotebookStore.getState().renameNotebook('nb-1', 'New Name');

    expect(success).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/notebooks/nb-1`, expect.objectContaining({
      method: 'PUT',
      body: jsonBody({ name: 'New Name' })
    }));
    expect(useNotebookStore.getState().notebooks).toEqual([
      { id: 'nb-1', name: 'New Name', notes: [{ id: 'n1', title: 'Doc' }] }
    ]);
  });

  it('createNote posts to the notebook and adds new note to both notes list and parent notebook', async () => {
    useNotebookStore.setState({
      notebooks: [{ id: 'nb-1', name: 'Work', notes: [] }]
    });

    const serverNote = {
      id: 'n-new',
      title: 'Untitled Note',
      notebookId: 'nb-1',
      createdAt: '2026-10-07T12:00:00Z',
      updatedAt: '2026-10-07T12:00:00Z'
    };
    const fetchMock = mockFetch({ 'POST /api/notebooks/nb-1/notes': jsonResponse(serverNote, { status: 201 }) });

    const result = await useNotebookStore.getState().createNote('nb-1');

    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/notebooks/nb-1/notes`, expect.objectContaining({
      method: 'POST',
      body: jsonBody({ title: 'Untitled Note' })
    }));
    expect(result).toEqual(serverNote);
    const state = useNotebookStore.getState();
    expect(state.notes).toEqual([serverNote]);
    expect(state.notebooks[0].notes).toEqual([serverNote]);
  });

  it('updateNote sends title and content, and updates title in notes list and inside notebooks', async () => {
    useNotebookStore.setState({
      notes: [{ id: 'n-1', title: 'Draft' }],
      notebooks: [{ id: 'nb-1', name: 'Work', notes: [{ id: 'n-1', title: 'Draft' }] }]
    });
    const fetchMock = mockFetch({ 'PUT /api/notes/n-1': jsonResponse(null) });

    const success = await useNotebookStore.getState().updateNote('n-1', 'Final Title', '<p>Done</p>');

    expect(success).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/notes/n-1`, expect.objectContaining({
      method: 'PUT',
      body: jsonBody({ title: 'Final Title', content: '<p>Done</p>' })
    }));
    const state = useNotebookStore.getState();
    expect(state.notes[0].title).toBe('Final Title');
    expect(state.notebooks[0].notes[0].title).toBe('Final Title');
  });

  it('deleteNote sends DELETE and removes note from notes list and parent notebook', async () => {
    useNotebookStore.setState({
      notes: [{ id: 'n-1', title: 'Draft' }],
      notebooks: [{ id: 'nb-1', name: 'Work', notes: [{ id: 'n-1', title: 'Draft' }] }]
    });
    const fetchMock = mockFetch({ 'DELETE /api/notes/n-1': jsonResponse(null, { status: 204 }) });

    const success = await useNotebookStore.getState().deleteNote('n-1');

    expect(success).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/notes/n-1`, expect.objectContaining({ method: 'DELETE' }));
    const state = useNotebookStore.getState();
    expect(state.notes).toHaveLength(0);
    expect(state.notebooks[0].notes).toHaveLength(0);
  });

  it('deleteNotebook calls DELETE and removes notebook from state', async () => {
    useNotebookStore.setState({
      notebooks: [{ id: 'nb-1', name: 'Work' }, { id: 'nb-2', name: 'Home' }]
    });
    const fetchMock = mockFetch({ 'DELETE /api/notebooks/nb-1': jsonResponse(null, { status: 204 }) });

    const success = await useNotebookStore.getState().deleteNotebook('nb-1');

    expect(success).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/notebooks/nb-1`, { method: 'DELETE' });
    expect(useNotebookStore.getState().notebooks).toEqual([{ id: 'nb-2', name: 'Home' }]);
  });

  it('fetchNotes serves notebook.notes if cached, else fetches from API', async () => {
    const cachedNotes = [{ id: 'n-cached', title: 'Cached Note' }];
    useNotebookStore.setState({
      notebooks: [{ id: 'nb-1', notes: cachedNotes }]
    });

    const cachedResult = await useNotebookStore.getState().fetchNotes('nb-1');
    expect(cachedResult).toEqual(cachedNotes);

    const apiNotes = [{ id: 'n-fresh', title: 'Fresh Note' }];
    const fetchMock = mockFetch({ 'GET /api/notebooks/nb-2/notes': jsonResponse(apiNotes) });

    const apiResult = await useNotebookStore.getState().fetchNotes('nb-2');
    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/notebooks/nb-2/notes`);
    expect(apiResult).toEqual(apiNotes);
    expect(useNotebookStore.getState().notes).toEqual(apiNotes);
  });

  it('fetchNote retrieves note by id and sets selectedNote', async () => {
    const note = { id: 'n-single', title: 'Single Note', content: 'hello' };
    const fetchMock = mockFetch({ 'GET /api/notes/n-single': jsonResponse(note) });

    const result = await useNotebookStore.getState().fetchNote('n-single');

    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/notes/n-single`);
    expect(result).toEqual(note);
    expect(useNotebookStore.getState().selectedNote).toEqual(note);
  });

  it('moveNote updates notebookId via PUT and refreshes notebooks', async () => {
    const note = { id: 'n-1', title: 'Task Note', content: 'body', notebookId: 'nb-1' };
    useNotebookStore.setState({
      notes: [note],
      notebooks: [{ id: 'nb-1', notes: [note] }, { id: 'nb-2', notes: [] }],
      selectedNote: note
    });

    const fetchMock = mockFetch({
      'PUT /api/notes/n-1': jsonResponse({ success: true }),
      'GET /api/notebooks': jsonResponse([{ id: 'nb-1', notes: [] }, { id: 'nb-2', notes: [{ ...note, notebookId: 'nb-2' }] }])
    });

    const success = await useNotebookStore.getState().moveNote('n-1', 'nb-2');

    expect(success).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/notes/n-1`, expect.objectContaining({
      method: 'PUT',
      body: jsonBody({ title: 'Task Note', content: 'body', notebookId: 'nb-2' })
    }));
    expect(useNotebookStore.getState().selectedNote.notebookId).toBe('nb-2');
  });

  it('displays error toasts when actions fail', async () => {
    mockFetch({
      'POST /api/notebooks': errorResponse(500),
      'PUT /api/notebooks/nb-1': errorResponse(500),
      'DELETE /api/notebooks/nb-1': errorResponse(500),
      'POST /api/notebooks/nb-1/notes': errorResponse(500)
    });

    await useNotebookStore.getState().createNotebook('Failing NB');
    expect(hasToast('Failed to create notebook', 'error')).toBe(true);

    await useNotebookStore.getState().renameNotebook('nb-1', 'Failing Rename');
    expect(hasToast('Failed to rename notebook', 'error')).toBe(true);

    await useNotebookStore.getState().deleteNotebook('nb-1');
    expect(hasToast('Failed to delete notebook', 'error')).toBe(true);

    await useNotebookStore.getState().createNote('nb-1');
    expect(hasToast('Failed to create note', 'error')).toBe(true);
  });
});
