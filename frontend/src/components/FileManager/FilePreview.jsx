import React, { useEffect, useCallback } from 'react';
import { X, Download, ChevronLeft, ChevronRight } from 'lucide-react';

const FilePreview = ({ file, files = [], onClose, onNavigate }) => {
  if (!file) return null;

  const navigateFile = useCallback((direction) => {
    if (!files.length || !onNavigate) return;
    onNavigate((currentFile) => {
      if (!currentFile) return null;
      const isPreviewable = (f) => f.mimeType.startsWith('image/') || f.mimeType.startsWith('video/') || f.mimeType === 'application/pdf';
      const previewableFiles = files.filter(isPreviewable);
      const targetList = previewableFiles.length > 0 ? previewableFiles : files;
      
      const currentIndex = targetList.findIndex(f => f.id === currentFile.id);
      if (currentIndex === -1) return currentFile;
      
      if (direction === 'next') {
        return targetList[(currentIndex + 1) % targetList.length];
      } else {
        return targetList[(currentIndex - 1 + targetList.length) % targetList.length];
      }
    });
  }, [files, onNavigate]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault(); 
        navigateFile(e.key === 'ArrowRight' ? 'next' : 'prev');
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigateFile, onClose]);

  const fileUrl = `/api/files/${file.id}/download`;
  const inlineUrl = `${fileUrl}?inline=true`;

  const renderContent = () => {
    if (file.mimeType.startsWith('image/')) {
      return <img src={inlineUrl} alt={file.name} className="max-w-full max-h-[70vh] object-contain rounded" />;
    }
    if (file.mimeType.startsWith('video/')) {
      return <video src={inlineUrl} controls className="max-w-full max-h-[70vh] object-contain rounded" />;
    }
    if (file.mimeType.startsWith('audio/')) {
      return <audio src={inlineUrl} controls className="w-full mt-4" />;
    }
    if (file.mimeType === 'application/pdf') {
      return <iframe src={inlineUrl} title={file.name} className="w-full h-[70vh] rounded" />;
    }
    
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-gray-100 dark:bg-gray-800 rounded">
        <p className="text-gray-500 mb-4">Preview not available for this file type.</p>
        <a 
          href={fileUrl}
          download={file.name}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors"
        >
          <Download size={18} />
          Download {file.name}
        </a>
      </div>
    );
  };

  const isPreviewable = (f) => f.mimeType.startsWith('image/') || f.mimeType.startsWith('video/') || f.mimeType === 'application/pdf';
  const previewableFiles = files.filter(isPreviewable);
  const targetFiles = previewableFiles.length > 0 ? previewableFiles : files;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col relative">
        <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
          <h3 className="font-semibold text-lg truncate pr-4">{file.name}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
            <X size={20} />
          </button>
        </div>
        <div className="p-4 flex-1 overflow-auto flex items-center justify-center bg-gray-50 dark:bg-black/50 relative group">
          {targetFiles.length > 1 && onNavigate && (
            <>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  navigateFile('prev');
                }}
                className="absolute left-4 p-2 rounded-full bg-black/30 hover:bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <ChevronLeft size={24} />
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  navigateFile('next');
                }}
                className="absolute right-4 p-2 rounded-full bg-black/30 hover:bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <ChevronRight size={24} />
              </button>
            </>
          )}
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default FilePreview;
