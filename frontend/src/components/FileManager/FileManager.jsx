import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useFileManagerStore } from '../../store/fileManagerStore';
import { Folder as FolderIcon, File as FileIcon, ChevronRight, Home, FolderPlus, Download, Trash2, MoreVertical, Search, Grid, List, ArrowUp, ArrowDown, Clock, Type, HardDrive } from 'lucide-react';
import FileUploader from './FileUploader';
import FilePreview from './FilePreview';
import TransferProgress from './TransferProgress';
import { BYTES_PER_KB } from '../../config';
import usePageTitle from '../../hooks/usePageTitle';

const FileManager = () => {
  usePageTitle('Files');
  const { folderId } = useParams();
  const navigate = useNavigate();

  const { 
    currentFolderId, folderChain, folders, files, isLoading, pagination,
    fetchContents, setCurrentFolder, createFolder, deleteItem, downloadFolder,
    searchQuery, setSearchQuery, sortBy, setSortBy, sortOrder, setSortOrder, setPage
  } = useFileManagerStore();

  const [previewFile, setPreviewFile] = useState(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  
  const [viewMode, setViewModeState] = useState(() => localStorage.getItem('fileManager_viewMode') || 'grid');

  const setViewMode = (mode) => {
    localStorage.setItem('fileManager_viewMode', mode);
    setViewModeState(mode);
  };

  // Debounce search
  const [localSearch, setLocalSearch] = useState(searchQuery);
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== searchQuery) {
        setSearchQuery(localSearch);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [localSearch, searchQuery, setSearchQuery]);

  useEffect(() => {
    // If URL has folderId, but store doesn't match, update store.
    const urlFolderId = folderId ? parseInt(folderId, 10) : null;
    if (urlFolderId !== currentFolderId) {
      setCurrentFolder(urlFolderId, urlFolderId === null ? 'Home' : `Folder ${urlFolderId}`);
    } else {
      fetchContents();
    }
  }, [folderId, fetchContents, setCurrentFolder, currentFolderId]);

  const handleCreateFolder = (e) => {
    e.preventDefault();
    if (newFolderName.trim()) {
      createFolder(newFolderName.trim());
      setNewFolderName('');
      setIsCreatingFolder(false);
    }
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = BYTES_PER_KB, sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // We no longer sort locally; the backend handles this now.
  const sortedFolders = folders;
  const sortedFiles = files;

  return (
    <div className="flex-1 h-full flex flex-col bg-white dark:bg-gray-900 shadow-sm border-l border-gray-200 dark:border-gray-800 overflow-hidden relative">
      {/* Toolbar & Breadcrumbs */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
        <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap">
          <button 
            onClick={() => navigate('/files')}
            className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors text-gray-600 dark:text-gray-300"
          >
            <Home size={18} />
          </button>
          {folderChain.map((folder, index) => (
            <React.Fragment key={folder.id}>
              <ChevronRight size={16} className="text-gray-400" />
              <button 
                onClick={() => navigate(`/files/${folder.id}`)}
                className="hover:bg-gray-200 dark:hover:bg-gray-700 px-2 py-1 rounded transition-colors text-sm font-medium"
              >
                {folder.name}
              </button>
            </React.Fragment>
          ))}
        </div>
        
        <div className="flex items-center gap-2">
          {isCreatingFolder ? (
            <form onSubmit={handleCreateFolder} className="flex items-center gap-2">
              <input 
                type="text" 
                autoFocus
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                placeholder="Folder name..."
                className="border rounded px-2 py-1 text-sm dark:bg-gray-800 dark:border-gray-600"
              />
              <button type="submit" className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700">Add</button>
              <button type="button" onClick={() => setIsCreatingFolder(false)} className="px-3 py-1 text-sm hover:bg-gray-200 dark:hover:bg-gray-700 rounded">Cancel</button>
            </form>
          ) : (
            <button 
              onClick={() => setIsCreatingFolder(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded text-sm font-medium transition-colors"
            >
              <FolderPlus size={16} /> New Folder
            </button>
          )}
          
          {currentFolderId && (
            <button 
              onClick={() => downloadFolder(currentFolderId, folderChain[folderChain.length-1]?.name || 'Folder')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded text-sm font-medium transition-colors"
              title="Download Folder contents directly to disk"
            >
              <Download size={16} /> Download
            </button>
          )}
        </div>
      </div>

      {/* Secondary Toolbar */}
      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-800 flex flex-wrap justify-between items-center bg-white dark:bg-gray-900 gap-4">
        <div className="relative flex-1 max-w-sm min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search files..."
            value={localSearch}
            onChange={e => setLocalSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 border border-gray-200 dark:border-gray-700 rounded-md p-0.5">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded transition-colors ${viewMode === 'grid' ? 'bg-gray-200 dark:bg-gray-700' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
              title="Grid View"
            >
              <Grid size={16} />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded transition-colors ${viewMode === 'list' ? 'bg-gray-200 dark:bg-gray-700' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
              title="List View"
            >
              <List size={16} />
            </button>
          </div>
          
          <div className="flex items-center gap-2 text-sm border border-gray-200 dark:border-gray-700 rounded-md px-2 py-1">
            <select 
              value={sortBy} 
              onChange={e => setSortBy(e.target.value)}
              className="bg-transparent border-none focus:outline-none cursor-pointer dark:text-gray-200"
            >
              <option value="name">Name</option>
              <option value="date">Date Modified</option>
              <option value="size">Size</option>
            </select>
            <button 
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
              title={sortOrder === 'asc' ? "Ascending" : "Descending"}
            >
              {sortOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-4 flex flex-col gap-6">
        <FileUploader />

        {isLoading ? (
          <div className="flex justify-center items-center h-32 text-gray-500">Loading...</div>
        ) : sortedFolders.length === 0 && sortedFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <FolderIcon size={48} className="mb-4 opacity-20" />
            <p>{searchQuery ? 'No matching files found.' : 'This folder is empty.'}</p>
          </div>
        ) : (
          <>
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {/* Folders */}
                {sortedFolders.map(folder => (
                  <div 
                    key={`folder-${folder.id}`}
                    className="group border border-gray-200 dark:border-gray-700 rounded-lg p-3 flex items-center justify-between hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-sm transition-all cursor-pointer bg-white dark:bg-gray-800"
                    onClick={() => navigate(`/files/${folder.id}`)}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-500 rounded">
                        <FolderIcon size={20} fill="currentColor" className="opacity-80" />
                      </div>
                      <span className="font-medium truncate">{folder.name}</span>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); deleteItem(folder.id, true); }}
                      className="p-1.5 text-red-500 opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-all"
                      title="Delete Folder"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}

                {/* Files */}
                {sortedFiles.map(file => (
                  <div 
                    key={`file-${file.id}`}
                    className="group border border-gray-200 dark:border-gray-700 rounded-lg p-3 flex items-center justify-between hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm transition-all cursor-pointer bg-white dark:bg-gray-800"
                    onClick={() => setPreviewFile(file)}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-500 rounded shrink-0">
                        {file.mimeType.startsWith('image/') ? (
                          <img src={`/api/files/${file.id}/download?inline=true`} alt="" className="w-5 h-5 object-cover rounded-sm" />
                        ) : (
                          <FileIcon size={20} />
                        )}
                      </div>
                      <div className="flex flex-col overflow-hidden">
                        <span className="font-medium text-sm truncate">{file.name}</span>
                        <span className="text-xs text-gray-400">{formatSize(file.sizeBytes)} • {new Date(file.uploadDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); deleteItem(file.id, false); }}
                      className="p-1.5 text-red-500 opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-all shrink-0"
                      title="Delete File"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
                <div className="grid grid-cols-[1fr_60px] sm:grid-cols-[1fr_120px_150px_60px] gap-4 p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <div>Name</div>
                  <div className="text-right hidden sm:block">Size</div>
                  <div className="text-right hidden sm:block">Date Modified</div>
                  <div></div>
                </div>
                <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800">
                  {/* Folders List */}
                  {sortedFolders.map(folder => (
                    <div 
                      key={`folder-${folder.id}`}
                      className="group grid grid-cols-[1fr_60px] sm:grid-cols-[1fr_120px_150px_60px] gap-4 p-3 items-center hover:bg-blue-50/50 dark:hover:bg-blue-900/10 cursor-pointer transition-colors"
                      onClick={() => navigate(`/files/${folder.id}`)}
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <FolderIcon size={18} className="text-blue-500 shrink-0" fill="currentColor" />
                        <span className="font-medium truncate">{folder.name}</span>
                      </div>
                      <div className="text-right text-sm text-gray-400 hidden sm:block">-</div>
                      <div className="text-right text-sm text-gray-400 hidden sm:block">{new Date(folder.createdAt || Date.now()).toLocaleDateString()}</div>
                      <div className="flex justify-end">
                        <button 
                          onClick={(e) => { e.stopPropagation(); deleteItem(folder.id, true); }}
                          className="p-1.5 text-red-500 opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-all"
                          title="Delete Folder"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Files List */}
                  {sortedFiles.map(file => (
                    <div 
                      key={`file-${file.id}`}
                      className="group grid grid-cols-[1fr_60px] sm:grid-cols-[1fr_120px_150px_60px] gap-4 p-3 items-center hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                      onClick={() => setPreviewFile(file)}
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        {file.mimeType.startsWith('image/') ? (
                          <img src={`/api/files/${file.id}/download?inline=true`} alt="" className="w-5 h-5 object-cover rounded-sm shrink-0" />
                        ) : (
                          <FileIcon size={18} className="text-gray-400 shrink-0" />
                        )}
                        <span className="font-medium truncate text-sm">{file.name}</span>
                      </div>
                      <div className="text-right text-sm text-gray-500 dark:text-gray-400 hidden sm:block">{formatSize(file.sizeBytes)}</div>
                      <div className="text-right text-sm text-gray-500 dark:text-gray-400 hidden sm:block">{new Date(file.uploadDate).toLocaleDateString()}</div>
                      <div className="flex justify-end">
                        <button 
                          onClick={(e) => { e.stopPropagation(); deleteItem(file.id, false); }}
                          className="p-1.5 text-red-500 opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-all shrink-0"
                          title="Delete File"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
        
        {/* Pagination Controls */}
        {pagination && pagination.TotalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg mt-auto">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Showing page <span className="font-medium text-gray-900 dark:text-white">{pagination.CurrentPage}</span> of <span className="font-medium text-gray-900 dark:text-white">{pagination.TotalPages}</span>
              {' '}(<span className="font-medium text-gray-900 dark:text-white">{pagination.TotalItems}</span> total items)
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(pagination.CurrentPage - 1)}
                disabled={pagination.CurrentPage === 1}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(pagination.CurrentPage + 1)}
                disabled={pagination.CurrentPage === pagination.TotalPages}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <FilePreview file={previewFile} files={files} onNavigate={setPreviewFile} onClose={() => setPreviewFile(null)} />
      <TransferProgress />
    </div>
  );
};

export default FileManager;
