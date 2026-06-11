import React, { useCallback, useRef } from 'react';
import { useFileManagerStore } from '../../store/fileManagerStore';
import { UploadCloud } from 'lucide-react';

const FileUploader = () => {
  const uploadFile = useFileManagerStore(state => state.uploadFile);
  const fileInputRef = useRef(null);

  const onDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const onDrop = useCallback(async (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      Array.from(e.dataTransfer.files).forEach(file => {
        uploadFile(file);
      });
    }
  }, [uploadFile]);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      Array.from(e.target.files).forEach(file => {
        uploadFile(file);
      });
      // reset input
      e.target.value = '';
    }
  };

  return (
    <div
      onDragOver={onDragOver}
      onDrop={onDrop}
      className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      onClick={() => fileInputRef.current?.click()}
    >
      <input 
        type="file" 
        multiple 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
      />
      <UploadCloud className="w-12 h-12 text-gray-400 mb-2" />
      <p className="text-gray-600 dark:text-gray-300 font-medium">Drag & drop files here</p>
      <p className="text-gray-400 text-sm">or click to browse</p>
    </div>
  );
};

export default FileUploader;
