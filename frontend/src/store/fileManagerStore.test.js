import { describe, it, expect, vi } from 'vitest';
import { useFileManagerStore } from './fileManagerStore';
import useSubscriptionStore from './useSubscriptionStore';
import { mockFetch, jsonResponse, jsonBody } from '../test/fetchMock';

const QUERY = 'page=1&pageSize=50&sortBy=name&sortOrder=asc';

describe('fileManagerStore', () => {
  it('setCurrentFolder updates folderChain when descending and navigating back, loading each folder', async () => {
    const fetchMock = mockFetch({
      [`GET /api/folders/f1?${QUERY}`]: jsonResponse({ folder: { id: 'f1', name: 'Documents' }, subfolders: [{ id: 'f2', name: 'Invoices' }], files: [] }),
      [`GET /api/folders/f2?${QUERY}`]: jsonResponse({ folder: { id: 'f2', name: 'Invoices' }, subfolders: [], files: [{ id: 'inv-1', name: 'inv.pdf' }] }),
      [`GET /api/folders?${QUERY}`]: jsonResponse({ subfolders: [{ id: 'f1', name: 'Documents' }], files: [] })
    });
    // Navigation resets paging and search
    useFileManagerStore.setState({ page: 3, searchQuery: 'old search' });

    const store = useFileManagerStore.getState();
    const waitForLoad = () => vi.waitFor(() => expect(useFileManagerStore.getState().isLoading).toBe(false));

    // 1. Enter Documents folder
    store.setCurrentFolder('f1', 'Documents');
    expect(useFileManagerStore.getState().currentFolderId).toBe('f1');
    expect(useFileManagerStore.getState().folderChain).toEqual([{ id: 'f1', name: 'Documents' }]);
    expect(useFileManagerStore.getState().isLoading).toBe(true);
    await waitForLoad();
    expect(fetchMock).toHaveBeenLastCalledWith(`/api/folders/f1?${QUERY}`);
    expect(useFileManagerStore.getState().folders).toEqual([{ id: 'f2', name: 'Invoices' }]);

    // 2. Enter Invoices subfolder
    store.setCurrentFolder('f2', 'Invoices');
    expect(useFileManagerStore.getState().currentFolderId).toBe('f2');
    expect(useFileManagerStore.getState().folderChain).toEqual([
      { id: 'f1', name: 'Documents' },
      { id: 'f2', name: 'Invoices' }
    ]);
    await waitForLoad();
    expect(useFileManagerStore.getState().files).toEqual([{ id: 'inv-1', name: 'inv.pdf' }]);

    // 3. Click back on Documents
    store.setCurrentFolder('f1', 'Documents');
    expect(useFileManagerStore.getState().currentFolderId).toBe('f1');
    expect(useFileManagerStore.getState().folderChain).toEqual([{ id: 'f1', name: 'Documents' }]);
    await waitForLoad();
    expect(useFileManagerStore.getState().files).toEqual([]);

    // 4. Return to root
    store.setCurrentFolder(null);
    expect(useFileManagerStore.getState().currentFolderId).toBeNull();
    expect(useFileManagerStore.getState().folderChain).toEqual([]);
    await waitForLoad();
    expect(fetchMock).toHaveBeenLastCalledWith(`/api/folders?${QUERY}`);
    expect(useFileManagerStore.getState().folders).toEqual([{ id: 'f1', name: 'Documents' }]);
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(useFileManagerStore.getState().error).toBeNull();
  });

  it('fetchContents fetches root files and folders with query params', async () => {
    const mockData = {
      subfolders: [{ id: 'f1', name: 'Photos' }],
      files: [{ id: 'file1', name: 'doc.pdf', sizeBytes: 1024 }],
      pagination: { totalPages: 1, currentPage: 1, totalItems: 2 }
    };
    const fetchMock = mockFetch({ [`GET /api/folders?${QUERY}`]: jsonResponse(mockData) });

    await useFileManagerStore.getState().fetchContents();

    expect(fetchMock).toHaveBeenCalledWith(`/api/folders?${QUERY}`);
    const state = useFileManagerStore.getState();
    expect(state.isLoading).toBe(false);
    expect(state.folders).toEqual(mockData.subfolders);
    expect(state.files).toEqual(mockData.files);
    expect(state.pagination).toEqual(mockData.pagination);
  });

  it('fetchContents in append mode adds the next page without overwriting existing state', async () => {
    useFileManagerStore.setState({
      page: 2,
      folders: [{ id: 'f1', name: 'Old Folder' }],
      files: [{ id: 'file1', name: 'first.txt' }]
    });
    mockFetch({
      'GET /api/folders?page=2&pageSize=50&sortBy=name&sortOrder=asc': jsonResponse({
        subfolders: [{ id: 'f2', name: 'New Folder' }],
        files: [{ id: 'file2', name: 'second.txt' }]
      })
    });

    await useFileManagerStore.getState().fetchContents(true); // append = true

    const state = useFileManagerStore.getState();
    expect(state.isFetchingMore).toBe(false);
    expect(state.folders).toEqual([{ id: 'f1', name: 'Old Folder' }, { id: 'f2', name: 'New Folder' }]);
    expect(state.files).toEqual([{ id: 'file1', name: 'first.txt' }, { id: 'file2', name: 'second.txt' }]);
  });

  it('createFolder posts folder name with parentId and reloads the current folder', async () => {
    useFileManagerStore.setState({ currentFolderId: 'parent-123' });
    const fetchMock = mockFetch({
      'POST /api/folders': jsonResponse({ id: 'new-f' }, { status: 201 }),
      [`GET /api/folders/parent-123?${QUERY}`]: jsonResponse({ subfolders: [{ id: 'new-f', name: 'Archive' }], files: [] })
    });

    await useFileManagerStore.getState().createFolder('Archive');

    expect(fetchMock).toHaveBeenCalledWith('/api/folders', expect.objectContaining({
      method: 'POST',
      body: jsonBody({ name: 'Archive', parentId: 'parent-123' })
    }));
    expect(useFileManagerStore.getState().folders).toEqual([{ id: 'new-f', name: 'Archive' }]);
  });

  it.each([
    [false, '/api/files/item-999'],
    [true, '/api/folders/item-999']
  ])('deleteItem (isFolder=%s) calls DELETE on %s, reloads contents and storage usage', async (isFolder, url) => {
    useFileManagerStore.setState({ files: [{ id: 'item-999', name: 'gone.txt' }] });
    const fetchMock = mockFetch({
      [`DELETE ${url}`]: jsonResponse(null, { status: 204 }),
      [`GET /api/folders?${QUERY}`]: jsonResponse({ files: [], subfolders: [] }),
      'GET /api/storage/tiers': jsonResponse([{ id: 1, name: 'Free' }]),
      'GET /api/storage': jsonResponse({ diskUsed: 0, diskLimitBytes: 100 })
    });

    await useFileManagerStore.getState().deleteItem('item-999', isFolder);

    expect(fetchMock).toHaveBeenCalledWith(url, expect.objectContaining({ method: 'DELETE' }));
    expect(useFileManagerStore.getState().files).toEqual([]);
    expect(useSubscriptionStore.getState().storageData).toEqual({ diskUsed: 0, diskLimitBytes: 100 });
  });
});
