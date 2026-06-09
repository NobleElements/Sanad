import { useState, useEffect } from 'react';
import { X, Save, Paperclip, MessageSquare, AlertCircle } from 'lucide-react';
import TipTapEditor from './TipTapEditor';

export default function TaskModal({ isOpen, task, onClose, onSave }) {
  const [internalTask, setInternalTask] = useState(null);
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState('ToDo');
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && task) {
      setInternalTask(task);
      setTitle(task.title || '');
      setStatus(task.status === 2 || task.status === 'Done' ? 'Done' : 
                task.status === 1 || task.status === 'InProgress' ? 'InProgress' : 'ToDo');
      setContent(task.content || '');
      setError(null);
    }
  }, [isOpen, task]);

  const handleSave = async () => {
    setError(null);
    setIsSaving(true);
    const statusVal = status === 'Done' ? 2 : status === 'InProgress' ? 1 : 0;
    
    try {
      await onSave({
        ...internalTask,
        title,
        status: statusVal,
        content
      });
      // Error handling is handled by the try/catch here if onSave throws
    } catch (err) {
      setError(err.message || 'Failed to save task');
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // We need to render even if !isOpen to allow slide out animation
  // If internalTask is null, we can render an empty shell or nothing
  const activeTask = internalTask || {};

  return (
    <>
      <div 
        className={`fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <div 
        className={`fixed inset-0 m-auto z-50 w-full max-w-2xl h-fit max-h-[90vh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl transform transition-all duration-200 flex flex-col overflow-hidden ${isOpen ? 'scale-100 opacity-100 pointer-events-auto' : 'scale-95 opacity-0 pointer-events-none'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {activeTask.isNew ? 'Create Task' : 'Edit Task'}
          </h2>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 rounded-lg border border-red-200 dark:border-red-500/20">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div className="space-y-1">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task Title"
              className="w-full text-2xl font-bold bg-transparent border-0 border-b-2 border-transparent hover:border-gray-200 dark:hover:border-gray-700 focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-0 px-0 py-2 transition-colors text-gray-900 dark:text-white placeholder-gray-400"
            />
          </div>

          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-500 dark:text-gray-400 w-20">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-48 p-2.5 transition-colors"
            >
              <option value="ToDo">To Do</option>
              <option value="InProgress">In Progress</option>
              <option value="Done">Done</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Description
            </label>
            <TipTapEditor content={content} onChange={setContent} />
          </div>

          <div className="pt-4 space-y-4 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800 border-dashed text-gray-500 dark:text-gray-400">
              <Paperclip className="w-5 h-5" />
              <span className="text-sm">Attachments area (coming soon)</span>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800 border-dashed text-gray-500 dark:text-gray-400">
              <MessageSquare className="w-5 h-5" />
              <span className="text-sm">Comments area (coming soon)</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !title.trim()}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save Task'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
