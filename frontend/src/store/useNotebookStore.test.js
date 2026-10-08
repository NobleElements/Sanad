import { describe, it, expect } from 'vitest';
import useNotebookStore from './useNotebookStore';
import { API_URL } from '../config';
import { mockFetch, jsonResponse, jsonBody } from '../test/fetchMock';

describe('useNotebookStore', () => {
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
});
