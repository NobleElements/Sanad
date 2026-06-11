import { create } from 'zustand';

const CHUNK_SIZE = 1024 * 1024 * 2; // 2MB

export const useFileManagerStore = create((set, get) => ({
  currentFolderId: null,
  folderChain: [],
  folders: [],
  files: [],
  isLoading: false,
  error: null,
  transfers: [], // upload/download queue

  page: 1,
  pageSize: 50,
  searchQuery: '',
  sortBy: localStorage.getItem('fileManager_sortBy') || 'name',
  sortOrder: localStorage.getItem('fileManager_sortOrder') || 'asc',
  pagination: null,

  setPage: (page) => { set({ page }); get().fetchContents(); },
  setSearchQuery: (searchQuery) => { set({ searchQuery, page: 1 }); get().fetchContents(); },
  setSortBy: (sortBy) => { 
    localStorage.setItem('fileManager_sortBy', sortBy);
    set({ sortBy, page: 1 }); 
    get().fetchContents(); 
  },
  setSortOrder: (sortOrder) => { 
    localStorage.setItem('fileManager_sortOrder', sortOrder);
    set({ sortOrder, page: 1 }); 
    get().fetchContents(); 
  },
  setPageSize: (pageSize) => { set({ pageSize, page: 1 }); get().fetchContents(); },

  setCurrentFolder: (folderId, folderName) => {
    set(state => {
      let newChain = [...state.folderChain];
      if (folderId === null) {
        newChain = [];
      } else {
        const existingIndex = newChain.findIndex(f => f.id === folderId);
        if (existingIndex >= 0) {
          newChain = newChain.slice(0, existingIndex + 1);
        } else {
          newChain.push({ id: folderId, name: folderName });
        }
      }
      return { currentFolderId: folderId, folderChain: newChain, page: 1, searchQuery: '' };
    });
    get().fetchContents();
  },

  fetchContents: async () => {
    set({ isLoading: true, error: null });
    try {
      const { currentFolderId, page, pageSize, searchQuery, sortBy, sortOrder } = get();
      
      const queryParams = new URLSearchParams({
        page,
        pageSize,
        sortBy,
        sortOrder
      });
      if (searchQuery) queryParams.append('search', searchQuery);

      const url = currentFolderId ? `/api/folders/${currentFolderId}?${queryParams}` : `/api/folders?${queryParams}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch contents');
      const data = await response.json();
      
      set(state => {
        let newChain = [...state.folderChain];
        if (data.folder && newChain.length > 0) {
          const lastIndex = newChain.length - 1;
          if (newChain[lastIndex].id === data.folder.id) {
            newChain[lastIndex].name = data.folder.name;
          }
        }
        return { 
          folderChain: newChain,
          folders: data.subfolders || [], 
          files: data.files || [],
          pagination: data.pagination,
          isLoading: false 
        };
      });
    } catch (err) {
      set({ error: err.message, isLoading: false });
    }
  },

  createFolder: async (name) => {
    try {
      const { currentFolderId } = get();
      const response = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, parentId: currentFolderId })
      });
      if (response.ok) get().fetchContents();
    } catch (err) {
      console.error(err);
    }
  },

  deleteItem: async (id, isFolder) => {
    try {
      const url = isFolder ? `/api/folders/${id}` : `/api/files/${id}`;
      const response = await fetch(url, { method: 'DELETE' });
      if (response.ok) get().fetchContents();
    } catch (err) {
      console.error(err);
    }
  },

  moveFile: async (id, newFolderId) => {
    try {
      const response = await fetch(`/api/files/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId: newFolderId })
      });
      if (response.ok) get().fetchContents();
    } catch(err) { console.error(err); }
  },

  uploadFile: async (file) => {
    const { currentFolderId } = get();
    const id = crypto.randomUUID();
    const transfer = {
      id, name: file.name, type: 'upload', progress: 0, status: 'active',
      speed: 0, loaded: 0, total: file.size, fileObject: file,
      isPaused: false, uploadId: null
    };
    
    set(state => ({ transfers: [...state.transfers, transfer] }));

    try {
      // Init
      const initRes = await fetch('/api/files/upload/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: file.name, sizeBytes: file.size, mimeType: file.type, folderId: currentFolderId })
      });
      const { uploadId } = await initRes.json();
      
      set(state => ({
        transfers: state.transfers.map(t => t.id === id ? { ...t, uploadId } : t)
      }));

      // Start chunk loop
      get().processUploadChunk(id);

    } catch (err) {
      set(state => ({
        transfers: state.transfers.map(t => t.id === id ? { ...t, status: 'error' } : t)
      }));
    }
  },

  processUploadChunk: async (id) => {
    const state = get();
    const transfer = state.transfers.find(t => t.id === id);
    if (!transfer || transfer.status !== 'active' || transfer.isPaused) return;

    const { fileObject, loaded, total, uploadId } = transfer;

    if (loaded >= total) {
      // Complete
      const completeRes = await fetch(`/api/files/upload/${uploadId}/complete`, { method: 'POST' });
      if (completeRes.ok) {
        set(state => ({
          transfers: state.transfers.map(t => t.id === id ? { ...t, status: 'done', progress: 100 } : t)
        }));
        get().fetchContents();
      }
      return;
    }

    const chunk = fileObject.slice(loaded, loaded + CHUNK_SIZE);
    const startTime = Date.now();

    try {
      const chunkRes = await fetch(`/api/files/upload/${uploadId}/chunk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: chunk
      });

      if (chunkRes.ok) {
        const { uploadedBytes } = await chunkRes.json();
        const endTime = Date.now();
        const durationSeconds = (endTime - startTime) / 1000;
        const speed = durationSeconds > 0 ? (chunk.size / durationSeconds) : 0; // Bytes/sec

        set(state => ({
          transfers: state.transfers.map(t => t.id === id ? {
            ...t,
            loaded: uploadedBytes,
            progress: Math.round((uploadedBytes / total) * 100),
            speed
          } : t)
        }));

        // Next chunk
        get().processUploadChunk(id);
      } else {
        throw new Error('Chunk upload failed');
      }
    } catch (err) {
      set(state => ({
        transfers: state.transfers.map(t => t.id === id ? { ...t, status: 'error' } : t)
      }));
    }
  },

  pauseTransfer: (id) => {
    set(state => ({
      transfers: state.transfers.map(t => t.id === id && t.type === 'upload' ? { ...t, isPaused: true, status: 'paused', speed: 0 } : t)
    }));
  },

  resumeTransfer: (id) => {
    set(state => ({
      transfers: state.transfers.map(t => t.id === id && t.type === 'upload' ? { ...t, isPaused: false, status: 'active' } : t)
    }));
    get().processUploadChunk(id);
  },

  cancelTransfer: (id) => {
    set(state => ({
      transfers: state.transfers.filter(t => t.id !== id)
    }));
  },

  clearTransfers: () => {
    set({ transfers: [] });
  },

  downloadFolder: async (folderId, folderName) => {
    try {
      if (!window.showDirectoryPicker) {
        alert("Your browser does not support the File System Access API needed to download folders directly.");
        return;
      }
      const dirHandle = await window.showDirectoryPicker();
      
      const id = crypto.randomUUID();
      const transfer = {
        id, name: `Downloading: ${folderName}`, type: 'download', progress: 0, status: 'active',
        speed: 0, loaded: 0, total: 100, isPaused: false
      };
      
      set(state => ({ transfers: [...state.transfers, transfer] }));

      await get().processDownloadFolder(folderId, dirHandle);
      
      set(state => ({
        transfers: state.transfers.map(t => t.id === id ? { ...t, status: 'done', progress: 100 } : t)
      }));

    } catch (err) {
      if (err.name !== 'AbortError') console.error(err);
    }
  },

  processDownloadFolder: async (folderId, dirHandle) => {
    // Fetch folder contents
    const url = folderId ? `/api/folders/${folderId}` : '/api/folders';
    const response = await fetch(url);
    if (!response.ok) return;
    const data = await response.json();

    // Create subfolders and recurse
    for (const sub of data.subfolders || []) {
      const subDirHandle = await dirHandle.getDirectoryHandle(sub.name, { create: true });
      await get().processDownloadFolder(sub.id, subDirHandle);
    }

    // Download files
    for (const file of data.files || []) {
      const fileHandle = await dirHandle.getFileHandle(file.name, { create: true });
      const writable = await fileHandle.createWritable();
      
      const fileRes = await fetch(`/api/files/${file.id}/download`);
      if (fileRes.ok && fileRes.body) {
        // Stream to file
        await fileRes.body.pipeTo(writable);
      } else {
        await writable.close();
      }
    }
  }
}));
