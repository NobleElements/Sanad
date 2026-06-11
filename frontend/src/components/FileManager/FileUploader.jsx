import React, { useCallback, useRef, useEffect } from 'react';
import { useFileManagerStore } from '../../store/fileManagerStore';
import useSubscriptionStore from '../../store/useSubscriptionStore';
import { UploadCloud, AlertCircle } from 'lucide-react';

const FileUploader = () => {
  const uploadFile = useFileManagerStore(state => state.uploadFile);
  const { storageData, fetchSubscriptionData } = useSubscriptionStore();
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchSubscriptionData();
  }, [fetchSubscriptionData]);

  const isQuotaExceeded = storageData && storageData.diskUsed >= storageData.diskLimitBytes;

  const onDragOver = useCallback((e) => {
    e.preventDefault();
    if (isQuotaExceeded) return;
    e.dataTransfer.dropEffect = 'copy';
  }, [isQuotaExceeded]);

  const onDrop = useCallback(async (e) => {
    e.preventDefault();
    if (isQuotaExceeded) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      Array.from(e.dataTransfer.files).forEach(file => {
        uploadFile(file);
      });
    }
  }, [uploadFile, isQuotaExceeded]);

  const handleFileChange = (e) => {
    if (isQuotaExceeded) return;
    if (e.target.files && e.target.files.length > 0) {
      Array.from(e.target.files).forEach(file => {
        uploadFile(file);
      });
      e.target.value = '';
    }
  };

  if (isQuotaExceeded) {
    return (
      <div className="border-2 border-dashed border-red-300 dark:border-red-800 rounded-lg p-6 flex flex-col items-center justify-center bg-red-50 dark:bg-red-900/10">
        <AlertCircle className="w-12 h-12 text-red-400 mb-2" />
        <p className="text-red-600 dark:text-red-400 font-medium">Storage Quota Exceeded</p>
        <p className="text-red-500 text-sm mt-1">Please upgrade your subscription tier to upload more files.</p>
      </div>
    );
  }

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
