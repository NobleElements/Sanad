import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Download, Trash2, Folder as FolderIcon, File as FileIcon, Loader2, UploadCloud, X, Upload } from 'lucide-react';
import { BYTES_PER_KB } from '../config';
import FilePreview from '../components/FileManager/FilePreview';

// Use standard fetch to avoid api.js auth interceptors for public routes
const fetchPublic = async (url, options = {}) => {
  const response = await fetch(`/api/public/share${url}`, options);
  if (!response.ok) {
    if (response.status === 404) throw new Error('Not Found');
    if (response.status === 403) throw new Error('Forbidden');
    throw new Error('API Error');
  }
  return response;
};

const formatSize = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = BYTES_PER_KB, sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const PublicShareView = () => {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploadingFiles, setUploadingFiles] = useState([]);
  const [previewFile, setPreviewFile] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadData();
  }, [token]);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetchPublic(`/${token}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err.message === 'Not Found' ? 'This link is invalid or has expired.' : 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadMain = async () => {
    if (type === 'file') {
      window.location.href = `/api/public/share/${token}/download`;
      return;
    }

    if (!window.showDirectoryPicker) {
      alert("Your browser does not support the File System Access API needed to download folders directly.");
      return;
    }

    try {
      const dirHandle = await window.showDirectoryPicker();
      const filesToDownload = item.files || [];
      
      if (filesToDownload.length === 0) {
        alert("This folder is empty.");
        return;
      }

      setDownloadProgress({ current: 0, total: filesToDownload.length, status: 'active' });

      const sanitizeName = (name) => {
        if (!name) return 'unnamed';
        let safeName = name.replace(/[\\/:"*?<>|]/g, '_');
        safeName = safeName.trim();
        if (!safeName) return 'unnamed';
        if (safeName === '.' || safeName === '..') return safeName + '_';
        return safeName;
      };

      let downloaded = 0;
      for (const file of filesToDownload) {
        try {
          const safeName = sanitizeName(file.name);
          const fileHandle = await dirHandle.getFileHandle(safeName, { create: true });
          const writable = await fileHandle.createWritable();
          
          const fileRes = await fetch(`/api/public/share/${token}/folder/${file.id}/download`);
          if (fileRes.ok && fileRes.body) {
            await fileRes.body.pipeTo(writable);
          } else {
            await writable.close();
          }
        } catch (e) {
          console.error("Failed to download file", file.name, e);
        }
        downloaded++;
        setDownloadProgress({ current: downloaded, total: filesToDownload.length, status: 'active' });
      }

      setDownloadProgress({ current: downloaded, total: filesToDownload.length, status: 'done' });
      setTimeout(() => setDownloadProgress(null), 3000);

    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error(err);
        alert("An error occurred during folder download.");
      }
      setDownloadProgress(null);
    }
  };

  const handleDownloadItem = (fileId) => {
    window.location.href = `/api/public/share/${token}/folder/${fileId}/download`;
  };

  const handleDeleteItem = async (fileId) => {
    if (!window.confirm('Are you sure you want to delete this file?')) return;
    try {
      await fetchPublic(`/${token}/file/${fileId}`, { method: 'DELETE' });
      // Reload
      loadData();
    } catch (err) {
      alert('Failed to delete file.');
    }
  };

  const handleDeleteMain = async () => {
    if (!window.confirm('Are you sure you want to delete this file? This action cannot be undone.')) return;
    try {
      await fetchPublic(`/${token}`, { method: 'DELETE' });
      setData(null);
      setError('This file has been deleted.');
    } catch (err) {
      alert('Failed to delete file.');
    }
  };

  const uploadFile = async (file) => {
    const id = Math.random().toString(36).substring(7);
    setUploadingFiles(prev => [...prev, { id, name: file.name, progress: 0 }]);

    try {
      // Init
      const initRes = await fetchPublic(`/${token}/upload/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: file.name,
          sizeBytes: file.size,
          mimeType: file.type || 'application/octet-stream'
        })
      });
      const { uploadId } = await initRes.json();

      // Chunk
      const chunkSize = 10 * 1024 * 1024; // 10MB
      let uploadedBytes = 0;
      
      while (uploadedBytes < file.size) {
        const chunk = file.slice(uploadedBytes, uploadedBytes + chunkSize);
        await fetchPublic(`/${token}/upload/${uploadId}/chunk`, {
          method: 'POST',
          body: chunk
        });
        uploadedBytes += chunk.size;
        setUploadingFiles(prev => prev.map(f => f.id === id ? { ...f, progress: Math.round((uploadedBytes / file.size) * 100) } : f));
      }

      // Complete
      await fetchPublic(`/${token}/upload/${uploadId}/complete`, { method: 'POST' });
      
      // Remove from uploading and reload
      setUploadingFiles(prev => prev.filter(f => f.id !== id));
      loadData();
    } catch (err) {
      alert('Failed to upload ' + file.name + ': ' + err.message);
      setUploadingFiles(prev => prev.filter(f => f.id !== id));
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(uploadFile);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow max-w-md w-full text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4">
            <X size={32} />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Unavailable</h1>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  const { type, item, permission, owner } = data;
  const canEdit = permission === 1;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      <div className="max-w-4xl mx-auto p-4 py-12">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          
          {/* Header */}
          <div className="p-6 border-b border-gray-100 bg-gray-50 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg ${type === 'folder' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>
                {type === 'folder' ? <FolderIcon size={32} /> : <FileIcon size={32} />}
              </div>
              <div>
                <h1 className="text-xl font-bold">{item.name}</h1>
                <p className="text-sm text-gray-500">Shared by <span className="font-medium text-gray-700">{owner}</span></p>
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={handleDownloadMain}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <Download size={18} />
                {type === 'folder' ? 'Download Folder' : 'Download'}
              </button>
              {type === 'file' && canEdit && (
                <button 
                  onClick={handleDeleteMain}
                  className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-lg font-medium transition-colors border border-red-200"
                >
                  <Trash2 size={18} />
                  Delete
                </button>
              )}
            </div>
          </div>

          {/* Download Progress */}
          {downloadProgress && (
            <div className="bg-blue-50 border-b border-blue-100 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {downloadProgress.status !== 'done' && <Loader2 className="animate-spin text-blue-500" size={20} />}
                <span className="text-sm font-medium text-blue-900">
                  {downloadProgress.status === 'done' 
                    ? 'Download complete!' 
                    : `Downloading folder contents: ${downloadProgress.current} of ${downloadProgress.total} files...`}
                </span>
              </div>
              <div className="w-48 bg-blue-200 rounded-full h-2 overflow-hidden">
                <div className="bg-blue-600 h-full transition-all duration-300" style={{ width: `${(downloadProgress.current / downloadProgress.total) * 100}%` }} />
              </div>
            </div>
          )}

          {/* Content */}
          <div className="p-6">
            {type === 'file' ? (
              <div className="text-center py-12 flex flex-col items-center">
                <FileIcon size={64} className="text-gray-300 mb-4" />
                <h2 className="text-lg font-medium">{item.name}</h2>
                <p className="text-gray-500 mt-1 mb-6">{formatSize(item.sizeBytes)} • Uploaded {new Date(item.uploadDate).toLocaleDateString()}</p>
                <button 
                  onClick={() => setPreviewFile(item)}
                  className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  Preview File
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {canEdit && (
                  <div className="flex justify-between items-center bg-blue-50 border border-blue-100 rounded-lg p-4">
                    <div>
                      <h3 className="font-medium text-blue-900">Upload Files</h3>
                      <p className="text-sm text-blue-700">You have permission to add files to this folder.</p>
                    </div>
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 bg-white border border-blue-200 text-blue-700 px-4 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors"
                    >
                      <UploadCloud size={18} />
                      Select Files
                    </button>
                    <input type="file" multiple className="hidden" ref={fileInputRef} onChange={handleFileSelect} />
                  </div>
                )}

                {/* Uploading progress */}
                {uploadingFiles.length > 0 && (
                  <div className="flex flex-col gap-2 mb-4">
                    {uploadingFiles.map(f => (
                      <div key={f.id} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
                        <Upload size={16} className="text-blue-500" />
                        <span className="flex-1 text-sm font-medium truncate">{f.name}</span>
                        <div className="w-32 bg-gray-200 rounded-full h-2 overflow-hidden">
                          <div className="bg-blue-500 h-full transition-all duration-300" style={{ width: `${f.progress}%` }} />
                        </div>
                        <span className="text-xs text-gray-500 w-8">{f.progress}%</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Files List */}
                {(!item.files || item.files.length === 0) ? (
                  <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
                    <FolderIcon size={48} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-gray-500">This folder is empty.</p>
                  </div>
                ) : (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200 text-gray-500">
                        <tr>
                          <th className="px-4 py-3 font-medium">Name</th>
                          <th className="px-4 py-3 font-medium">Size</th>
                          <th className="px-4 py-3 font-medium">Date</th>
                          <th className="px-4 py-3 font-medium text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {item.files.map(f => (
                          <tr key={f.id} className="hover:bg-gray-50 transition-colors group cursor-pointer" onClick={() => setPreviewFile(f)}>
                            <td className="px-4 py-3 flex items-center gap-3">
                              <FileIcon size={16} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
                              <span className="font-medium truncate max-w-[200px] md:max-w-md group-hover:text-blue-600 transition-colors">{f.name}</span>
                            </td>
                            <td className="px-4 py-3 text-gray-500">{formatSize(f.sizeBytes)}</td>
                            <td className="px-4 py-3 text-gray-500">{new Date(f.uploadDate).toLocaleDateString()}</td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex justify-end gap-2">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleDownloadItem(f.id); }}
                                  className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                                  title="Download"
                                >
                                  <Download size={16} />
                                </button>
                                {canEdit && (
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); handleDeleteItem(f.id); }}
                                    className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                                    title="Delete"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      </div>
      <FilePreview 
        file={previewFile} 
        files={type === 'folder' ? (item?.files || []) : [item]} 
        onNavigate={setPreviewFile} 
        onClose={() => setPreviewFile(null)} 
        urlResolver={(f) => type === 'folder' 
          ? `/api/public/share/${token}/folder/${f.id}/download`
          : `/api/public/share/${token}/download`
        }
      />
    </div>
  );
};

export default PublicShareView;
