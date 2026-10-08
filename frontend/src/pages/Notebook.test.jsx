import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Notebook from './Notebook';
import { API_URL } from '../config';
import { mockFetch, jsonResponse, jsonBody } from '../test/fetchMock';

const note = {
  id: 'n-1',
  title: 'Loaded note',
  notebookId: 'nb-1',
  content: '<p>Loaded body</p>',
  createdAt: '2026-10-01T10:00:00Z',
  updatedAt: '2026-10-01T10:00:00Z'
};

// Advance fake time and let pending fetch promises and React updates settle
const advance = (ms) => act(() => vi.advanceTimersByTimeAsync(ms));

// Edit through the real TipTap editor: same onUpdate -> onChange path as typing
// (and as the editor's own fixup transactions while a note loads).
const appendToEditor = (text) => {
  const editor = screen.getByText(/Loaded body/).closest('[contenteditable="true"]').editor;
  act(() => {
    editor.commands.insertContentAt(editor.state.doc.content.size - 1, text);
  });
};

describe('Notebook autosave initialization shield', () => {
  it('ignores editor updates while a note is loading but autosaves later user edits', async () => {
    vi.useFakeTimers();
    const fetchMock = mockFetch({
      'GET /api/notebooks': jsonResponse([
        { id: 'nb-1', name: 'Work', notes: [{ id: 'n-1', title: 'Loaded note', notebookId: 'nb-1', updatedAt: note.updatedAt }] }
      ]),
      'GET /api/notes/n-1': jsonResponse(note),
      'PUT /api/notes/n-1': jsonResponse(null)
    });
    const saveCalls = () => fetchMock.mock.calls.filter(([, init]) => init?.method === 'PUT');

    render(
      <MemoryRouter initialEntries={['/notebook/n-1']}>
        <Routes>
          <Route path="/notebook/:noteId" element={<Notebook />} />
        </Routes>
      </MemoryRouter>
    );

    // Let the note load (no timers advanced yet, so we are inside the 500ms shield window)
    await advance(0);
    expect(screen.getByDisplayValue('Loaded note')).toBeInTheDocument();
    expect(screen.getByText('Loaded body')).toBeInTheDocument();

    // An editor update during the initial load window must not be autosaved
    appendToEditor(' (normalized)');
    await advance(1500); // well past the 1000ms autosave debounce
    expect(saveCalls()).toHaveLength(0);

    // After the window, a user edit is autosaved once the debounce elapses
    appendToEditor(' and edited');
    await advance(999);
    expect(saveCalls()).toHaveLength(0);
    await advance(1);

    expect(saveCalls()).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/notes/n-1`, expect.objectContaining({
      method: 'PUT',
      body: jsonBody({ title: 'Loaded note', content: '<p dir="auto">Loaded body (normalized) and edited</p>' })
    }));
  });
});
