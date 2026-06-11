import React from 'react';
import { useFileManagerStore } from '../../store/fileManagerStore';
import { X, Pause, Play, Upload, Download, CheckCircle, AlertCircle } from 'lucide-react';

const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const TransferProgress = () => {
  const { transfers, pauseTransfer, resumeTransfer, cancelTransfer, clearTransfers } = useFileManagerStore();

  if (transfers.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border dark:border-gray-700 overflow-hidden z-50">
      <div className="bg-gray-50 dark:bg-gray-900 px-4 py-3 border-b dark:border-gray-700 flex justify-between items-center">
        <h4 className="font-semibold text-sm">Transfers ({transfers.filter(t => t.status === 'active').length} active)</h4>
        <button onClick={clearTransfers} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" title="Close Panel">
          <X size={16} />
        </button>
      </div>
      <div className="max-h-64 overflow-y-auto p-2">
        {transfers.map(transfer => (
          <div key={transfer.id} className="mb-3 p-2 bg-gray-50 dark:bg-gray-700/50 rounded flex flex-col gap-1">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2 truncate pr-2">
                {transfer.type === 'upload' ? <Upload size={14} className="text-blue-500" /> : <Download size={14} className="text-green-500" />}
                <span className="text-sm font-medium truncate" title={transfer.name}>{transfer.name}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {transfer.status === 'active' && transfer.type === 'upload' && (
                  <button onClick={() => pauseTransfer(transfer.id)} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded">
                    <Pause size={12} />
                  </button>
                )}
                {transfer.status === 'paused' && transfer.type === 'upload' && (
                  <button onClick={() => resumeTransfer(transfer.id)} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded">
                    <Play size={12} />
                  </button>
                )}
                {transfer.status === 'done' ? (
                  <CheckCircle size={14} className="text-green-500" />
                ) : transfer.status === 'error' ? (
                  <AlertCircle size={14} className="text-red-500" />
                ) : (
                  <button onClick={() => cancelTransfer(transfer.id)} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded">
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>
            
            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5 mt-1">
              <div 
                className={`h-1.5 rounded-full ${transfer.status === 'error' ? 'bg-red-500' : 'bg-blue-600'}`} 
                style={{ width: `${transfer.progress}%` }}
              ></div>
            </div>
            
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
              <span>{transfer.progress}% {transfer.status === 'paused' ? '(Paused)' : ''}</span>
              {transfer.status === 'active' && transfer.speed > 0 && (
                <span>{formatBytes(transfer.speed)}/s</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TransferProgress;
