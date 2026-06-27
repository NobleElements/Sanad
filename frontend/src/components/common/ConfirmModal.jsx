import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

export default function ConfirmModal({ 
  isOpen, 
  title = "Confirm Action", 
  message = "Are you sure you want to proceed?", 
  confirmText = "Confirm", 
  cancelText = "Cancel", 
  onConfirm, 
  onCancel,
  variant = "danger"
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-sm overflow-hidden flex flex-col transform transition-all">
        <div className="p-4 flex items-start gap-4">
          <div className={`p-2 rounded-full shrink-0 ${variant === 'danger' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'}`}>
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="flex-1 pt-1">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white leading-tight">
              {title}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              {message}
            </p>
          </div>
          <button onClick={onCancel} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-400 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-700">
          <button 
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
          >
            {cancelText}
          </button>
          <button 
            onClick={() => {
              onConfirm();
            }}
            className={`px-4 py-2 text-sm font-medium text-white rounded transition-colors ${
              variant === 'danger' 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
