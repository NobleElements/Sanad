import { useState, useEffect, useRef } from 'react';
import { X, Save, Paperclip, MessageSquare, AlertCircle, Tag, FolderKanban, Timer } from 'lucide-react';
import TipTapEditor from './TipTapEditor';
import { API_BASE } from '../config';

const TAG_COLORS = [
  'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
  'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300',
  'bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-300',
  'bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300',
  'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300',
  'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300',
];

export default function TaskModal({ isOpen, task, onClose, onSave }) {
  const titleInputRef = useRef(null);
  const [internalTask, setInternalTask] = useState(null);
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState('ToDo');
  const [content, setContent] = useState('');
  const [project, setProject] = useState('');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && task) {
      setInternalTask(task);
      setTitle(task.title || '');
      setStatus(task.status === 2 || task.status === 'Done' ? 'Done' : 
                task.status === 1 || task.status === 'InProgress' ? 'InProgress' : 'ToDo');
      setContent(task.content || '');
      setProject(task.project || '');
      setTagInput('');
      setError(null);

      // Initialize tags from comma-separated string
      if (task.tags && typeof task.tags === 'string') {
        setTags(task.tags.split(',').map(t => t.trim()).filter(Boolean));
      } else {
        setTags([]);
      }

      // Initialize estimated time from minutes
      if (task.estimatedMinutes && task.estimatedMinutes > 0) {
        setHours(String(Math.floor(task.estimatedMinutes / 60)) || '');
        setMinutes(String(task.estimatedMinutes % 60) || '');
      } else {
        setHours('');
        setMinutes('');
      }
      
      // Auto-focus the title input when opening
      setTimeout(() => {
        titleInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, task]);

  const handleSave = async () => {
    setError(null);
    setIsSaving(true);
    const statusVal = status === 'Done' ? 2 : status === 'InProgress' ? 1 : 0;
    
    // Convert hours/minutes back to estimatedMinutes
    const h = parseInt(hours, 10) || 0;
    const m = parseInt(minutes, 10) || 0;
    const estimatedMinutes = (h * 60 + m) || null;

    try {
      await onSave({
        ...internalTask,
        title,
        status: statusVal,
        content,
        project: project || null,
        tags: tags.length > 0 ? tags.join(',') : null,
        estimatedMinutes,
      });
    } catch (err) {
      setError(err.message || 'Failed to save task');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddTag = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const newTag = tagInput.trim();
      if (newTag && !tags.includes(newTag)) {
        setTags([...tags, newTag]);
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleImageUpload = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        return `${API_BASE}${data.url}`;
      }
    } catch (e) {
      console.error('Failed to upload image:', e);
      setError('Failed to upload image');
    }
    return null;
  };

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
              ref={titleInputRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task Title"
              className="w-full text-2xl font-bold bg-transparent border-0 border-b-2 border-transparent hover:border-gray-200 dark:hover:border-gray-700 focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-0 px-0 py-2 transition-colors text-gray-900 dark:text-white placeholder-gray-400"
            />
          </div>

          {/* Status */}
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

          {/* Project */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-500 dark:text-gray-400 w-20">
              <FolderKanban className="w-3.5 h-3.5" />
              Project
            </label>
            <input
              type="text"
              value={project}
              onChange={(e) => setProject(e.target.value)}
              placeholder="Optional project name"
              className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-48 p-2.5 transition-colors placeholder-gray-400"
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-500 dark:text-gray-400">
              <Tag className="w-3.5 h-3.5" />
              Tags
            </label>
            <div className="flex flex-wrap items-center gap-2 p-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg min-h-[42px]">
              {tags.map((tag, i) => (
                <span
                  key={tag}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${TAG_COLORS[i % TAG_COLORS.length]}`}
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-0.5 hover:opacity-70 transition-opacity"
                    aria-label={`Remove tag ${tag}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                placeholder={tags.length === 0 ? "Type a tag and press Enter" : "Add more..."}
                className="flex-1 min-w-[120px] bg-transparent border-0 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-0 focus:outline-none p-0"
              />
            </div>
          </div>

          {/* Estimated Time */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-500 dark:text-gray-400 w-20">
              <Timer className="w-3.5 h-3.5" />
              Time
            </label>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="0"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  placeholder="0"
                  className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-20 p-2.5 transition-colors text-center"
                />
                <span className="text-sm text-gray-500 dark:text-gray-400">hrs</span>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                  placeholder="0"
                  className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-20 p-2.5 transition-colors text-center"
                />
                <span className="text-sm text-gray-500 dark:text-gray-400">min</span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Description
            </label>
            <TipTapEditor content={content} onChange={setContent} onImageUpload={handleImageUpload} />
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
