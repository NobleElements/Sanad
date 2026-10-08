import { describe, it, expect, beforeEach } from 'vitest';
import useBookStore from './useBookStore';
import { API_URL } from '../config';
import { mockFetch, jsonResponse, jsonBody, errorResponse } from '../test/fetchMock';

describe('useBookStore', () => {
  beforeEach(() => {
    useBookStore.setState({
      books: [],
      searchResults: [],
      periods: [],
      currentRead: null
    });
  });

  it('fetchBooks loads books into state', async () => {
    const mockBooks = [{ id: 'b1', title: 'Clean Architecture', author: 'Uncle Bob' }];
    const fetchMock = mockFetch({ 'GET /api/books': jsonResponse(mockBooks) });

    await useBookStore.getState().fetchBooks();

    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/books`);
    expect(useBookStore.getState().books).toEqual(mockBooks);
  });

  it('searchBooks fetches and stores searchResults', async () => {
    const mockResults = [{ id: 'b-res', title: 'Design Patterns' }];
    const fetchMock = mockFetch({
      'GET /api/books/search?query=design': jsonResponse(mockResults)
    });

    await useBookStore.getState().searchBooks('design');

    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/books/search?query=design`);
    expect(useBookStore.getState().searchResults).toEqual(mockResults);
  });

  it('addBook posts new book and prepends to books', async () => {
    const initial = [{ id: 'b1', title: 'Existing' }];
    useBookStore.setState({ books: initial });

    const newBook = { id: 'b2', title: 'Refactoring' };
    const fetchMock = mockFetch({
      'POST /api/books': jsonResponse(newBook)
    });

    const result = await useBookStore.getState().addBook({ title: 'Refactoring' });

    expect(result).toEqual(newBook);
    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/books`, expect.objectContaining({
      method: 'POST',
      body: jsonBody({ title: 'Refactoring' })
    }));
    expect(useBookStore.getState().books).toEqual([newBook, ...initial]);
  });

  it('fetchCurrentRead sets currentRead on 200 and null on 404', async () => {
    const readData = { id: 'p1', bookTitle: 'Domain-Driven Design' };
    mockFetch({ 'GET /api/reading/current': jsonResponse(readData) });

    await useBookStore.getState().fetchCurrentRead();
    expect(useBookStore.getState().currentRead).toEqual(readData);

    mockFetch({ 'GET /api/reading/current': jsonResponse(null, { status: 404, ok: false }) });
    await useBookStore.getState().fetchCurrentRead();
    expect(useBookStore.getState().currentRead).toBeNull();
  });

  it('startReadingPeriod updates state optimistically and refreshes from server', async () => {
    const existingPeriods = [{ id: 'p-prev', status: 'Reading' }];
    useBookStore.setState({ periods: existingPeriods });

    const refreshedPeriods = [
      { id: 'p-new', bookId: 'b1', status: 'Reading' },
      { id: 'p-prev', status: 'Paused' }
    ];

    const fetchMock = mockFetch({
      'POST /api/reading/periods': jsonResponse({ id: 'p-new' }),
      'GET /api/reading/periods': jsonResponse(refreshedPeriods),
      'GET /api/reading/current': jsonResponse({ bookId: 'b1' })
    });

    await useBookStore.getState().startReadingPeriod('b1', 'daily 10 pages');

    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/reading/periods`, expect.objectContaining({
      method: 'POST',
      body: jsonBody({ bookId: 'b1', plans: 'daily 10 pages' })
    }));
    expect(useBookStore.getState().periods).toEqual(refreshedPeriods);
  });

  it('logProgress posts progress and updates currentRead and periods', async () => {
    const fetchMock = mockFetch({
      'POST /api/reading/logs': jsonResponse({ success: true }),
      'GET /api/reading/current': jsonResponse({ currentProgress: 50 }),
      'GET /api/reading/periods': jsonResponse([{ id: 'p1', progress: 50 }])
    });

    await useBookStore.getState().logProgress('p1', 1, 50);

    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/reading/logs`, expect.objectContaining({
      method: 'POST',
      body: jsonBody({ readingPeriodId: 'p1', startPage: 1, endPage: 50 })
    }));
    expect(useBookStore.getState().currentRead).toEqual({ currentProgress: 50 });
  });

  it('updateBook calls PUT and refreshes stores', async () => {
    const fetchMock = mockFetch({
      'PUT /api/books/b1': jsonResponse({ success: true }),
      'GET /api/books': jsonResponse([{ id: 'b1', title: 'Updated' }]),
      'GET /api/reading/periods': jsonResponse([]),
      'GET /api/reading/current': jsonResponse(null)
    });

    await useBookStore.getState().updateBook('b1', { title: 'Updated' });

    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/books/b1`, expect.objectContaining({
      method: 'PUT',
      body: jsonBody({ title: 'Updated' })
    }));
    expect(useBookStore.getState().books).toEqual([{ id: 'b1', title: 'Updated' }]);
  });

  it('deleteBook calls DELETE and refreshes stores', async () => {
    const fetchMock = mockFetch({
      'DELETE /api/books/b1': jsonResponse(null, { status: 204 }),
      'GET /api/books': jsonResponse([]),
      'GET /api/reading/periods': jsonResponse([]),
      'GET /api/reading/current': jsonResponse(null)
    });

    await useBookStore.getState().deleteBook('b1');

    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/books/b1`, { method: 'DELETE' });
    expect(useBookStore.getState().books).toEqual([]);
  });

  it('deletePeriod removes period optimistically and confirms deletion', async () => {
    useBookStore.setState({ periods: [{ id: 'p1' }, { id: 'p2' }] });

    const fetchMock = mockFetch({
      'DELETE /api/reading/periods/p1': jsonResponse(null, { status: 204 }),
      'GET /api/reading/periods': jsonResponse([{ id: 'p2' }]),
      'GET /api/reading/current': jsonResponse(null)
    });

    await useBookStore.getState().deletePeriod('p1');

    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/reading/periods/p1`, { method: 'DELETE' });
    expect(useBookStore.getState().periods).toEqual([{ id: 'p2' }]);
  });
});
