import React, { useState, useEffect } from 'react';
import { Edit2, X } from 'lucide-react';

export default function PromptModal({ 
  isOpen, 
  title = "Rename", 
  message = "Enter new value:", 
  initialValue = "",
  confirmText = "Save", 
  cancelText = "Cancel", 
  onConfirm, 
  onCancel,
}) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (isOpen) {
      setValue(initialValue);
    }
  }, [isOpen, initialValue]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm(value);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-sm overflow-hidden flex flex-col transform transition-all">
        <div className="p-4 flex items-start gap-4">
          <div className="p-2 rounded-full shrink-0 bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
            <Edit2 className="w-6 h-6" />
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
        
        <form onSubmit={handleSubmit}>
          <div className="px-4 pb-4">
            <input
              type="text"
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 dark:text-white"
            />
          </div>
          
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-700">
            <button 
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
            >
              {cancelText}
            </button>
            <button 
              type="submit"
              disabled={!value.trim() || value.trim() === initialValue.trim()}
              className="px-4 py-2 text-sm font-medium text-white rounded transition-colors bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {confirmText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
