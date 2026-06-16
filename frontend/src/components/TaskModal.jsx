import { useState, useEffect, useRef } from 'react';
import { X, Save, Paperclip, MessageSquare, AlertCircle, Tag, FolderKanban, Timer, Download, Trash2, Loader2 } from 'lucide-react';
import TipTapEditor from './TipTapEditor';
import { API_BASE } from '../config';
import ProjectSelector from './ProjectSelector';
import useTaskStore from '../store/useTaskStore';
import { extractImagesFromHtml, deleteImages } from '../utils/imageUtils';

import { getTagColor } from '../utils/colorUtils';
export default function TaskModal() {
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
  const uploadedSessionImages = useRef([]);

  const { 
    isTaskModalOpen: isOpen, activeTask: task, closeTaskModal: onClose, createTask, updateTask,
    activeTaskDetails, isLoadingTaskDetails, isUploadingAttachment,
    getTaskDetails, addTaskComment, deleteTaskComment, 
    uploadTaskAttachment, deleteTaskAttachment, deleteTask
  } = useTaskStore();

  const [newComment, setNewComment] = useState('');
  const [isAddingComment, setIsAddingComment] = useState(false);
  const fileInputRef = useRef(null);
  const activeTask = internalTask || {};

  useEffect(() => {
    if (isOpen && activeTask?.id) {
      getTaskDetails(activeTask.id);
    }
  }, [isOpen, activeTask?.id, getTaskDetails]);

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

      uploadedSessionImages.current = [];

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
        if(!!!titleInputRef.current?.value)
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
       const taskData = {
        ...internalTask,
        title,
        status: statusVal,
        content,
        project: project || null,
        tags: tags.length > 0 ? tags.join(',') : null,
        estimatedMinutes,
      };

      let success = false;
      if (taskData.isNew) {
        success = await createTask(taskData);
      } else {
        success = await updateTask(taskData.id, taskData);
      }
      if (success) {
        onClose();
      }

      // Cleanup unused images
      const initialImages = extractImagesFromHtml(task?.content || '');
      const finalImages = extractImagesFromHtml(content);
      const toDelete = [...new Set([...initialImages, ...uploadedSessionImages.current])].filter(url => !finalImages.includes(url));
      
      await deleteImages(toDelete);
      uploadedSessionImages.current = [];

    } catch (err) {
      setError(err.message || 'Failed to save task');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddTag = (e) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === ',') {
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

  const handleDeleteTask = async () => {
    if (!activeTask?.id || activeTask.isNew) return;
    if (confirm('Are you sure you want to delete this task?')) {
      try {
        await deleteTask(activeTask.id);
        onClose(); // Close the modal
      } catch (err) {
        setError('Failed to delete task.');
      }
    }
  };

  const handleCloseModal = async () => {
    // Delete session images since we are cancelling
    await deleteImages(uploadedSessionImages.current);
    uploadedSessionImages.current = [];
    onClose();
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) handleCloseModal();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Cleanup unsaved images on unmount or page refresh/close
  useEffect(() => {
    const cleanupUnsavedImages = () => {
      if (uploadedSessionImages.current && uploadedSessionImages.current.length > 0) {
        deleteImages(uploadedSessionImages.current, true).catch(() => {});
      }
    };

    window.addEventListener('beforeunload', cleanupUnsavedImages);

    return () => {
      window.removeEventListener('beforeunload', cleanupUnsavedImages);
      cleanupUnsavedImages();
    };
  }, []);

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
        const url = `${API_BASE}${data.url}`;
        uploadedSessionImages.current.push(url);
        return url;
      }
    } catch (e) {
      console.error('Failed to upload image:', e);
      setError('Failed to upload image');
    }
    return null;
  };

  // We need to render even if !isOpen to allow slide out animation
  // If internalTask is null, we can render an empty shell or nothing

  const handleAddComment = async () => {
    if (!newComment.trim() || !activeTask?.id) return;
    setIsAddingComment(true);
    try {
      const success = await addTaskComment(activeTask.id, newComment.trim());
      if (success) {
        setNewComment('');
      }
    } finally {
      setIsAddingComment(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeTask?.id) return;
    await uploadTaskAttachment(activeTask.id, file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <div 
        className={`fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={handleCloseModal}
        aria-hidden="true"
      />

      <div 
        className={`fixed inset-0 m-auto z-50 w-[95%] sm:w-full max-w-2xl h-fit max-h-[90vh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl transform transition-all duration-200 flex flex-col overflow-hidden ${isOpen ? 'scale-100 opacity-100 pointer-events-auto' : 'scale-95 opacity-0 pointer-events-none'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {activeTask.isNew ? 'Create Task' : 'Edit Task'}
          </h2>
          <button 
            onClick={handleCloseModal}
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
            <ProjectSelector 
              value={project}
              onChange={setProject}
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
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${getTagColor(tag)}`}
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
                placeholder={tags.length === 0 ? "Type a tag and press Space or Enter" : "Add more..."}
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

          {activeTask?.id && (
            <div className="pt-4 space-y-6 border-t border-gray-100 dark:border-gray-800">
              {/* Attachments Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-sm font-medium text-gray-900 dark:text-white">
                    <Paperclip className="w-4 h-4" />
                    Attachments
                  </label>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingAttachment}
                    className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium disabled:opacity-50 flex items-center gap-1"
                  >
                    {isUploadingAttachment ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add File'}
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileUpload} 
                    className="hidden" 
                  />
                </div>
                
                {isLoadingTaskDetails ? (
                  <div className="text-sm text-gray-500 dark:text-gray-400 py-2">Loading attachments...</div>
                ) : (
                  <div className="space-y-2">
                    {activeTaskDetails?.attachments?.length > 0 ? (
                      <ul className="space-y-2">
                        {activeTaskDetails.attachments.map(att => (
                          <li key={att.id || att._id} className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800">
                            <div className="flex items-center gap-2 overflow-hidden">
                              <Paperclip className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              <a 
                                href={`${API_BASE}${att.filePath}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-sm text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 truncate"
                              >
                                {att.fileName}
                              </a>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                              <a 
                                href={`${API_BASE}${att.filePath}`}
                                download
                                className="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                              >
                                <Download className="w-4 h-4" />
                              </a>
                              <button
                                type="button"
                                onClick={() => {
                                  if (!window.confirm('Are you sure you want to delete this?')) return;
                                  deleteTaskAttachment(activeTask.id, att.id || att._id);
                                }}
                                className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-sm text-gray-500 dark:text-gray-400 italic">No attachments yet.</div>
                    )}
                  </div>
                )}
              </div>

              {/* Comments Section */}
              <div className="space-y-3">
                <label className="flex items-center gap-1.5 text-sm font-medium text-gray-900 dark:text-white">
                  <MessageSquare className="w-4 h-4" />
                  Comments
                </label>
                
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add a comment..."
                      className="flex-1 min-h-[80px] p-2.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:ring-indigo-500 focus:border-indigo-500 resize-y"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleAddComment}
                      disabled={!newComment.trim() || isAddingComment}
                      className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      Comment
                    </button>
                  </div>
                </div>

                {isLoadingTaskDetails ? (
                  <div className="text-sm text-gray-500 dark:text-gray-400 py-2">Loading comments...</div>
                ) : (
                  <div className="space-y-3 mt-4">
                    {activeTaskDetails?.comments?.length > 0 ? (
                      <ul className="space-y-3">
                        {activeTaskDetails.comments.map(comment => (
                          <li key={comment.id || comment._id} className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800 group">
                            <div className="flex items-start justify-between gap-4">
                              <div className="space-y-1">
                                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                  {comment.text}
                                </p>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {new Date(comment.createdAt).toLocaleString()}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  if (!window.confirm('Are you sure you want to delete this?')) return;
                                  deleteTaskComment(activeTask.id, comment.id || comment._id);
                                }}
                                className="p-1.5 text-gray-400 md:opacity-0 group-hover:opacity-100 hover:text-red-600 dark:hover:text-red-400 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-all flex-shrink-0"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-sm text-gray-500 dark:text-gray-400 italic">No comments yet.</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 flex justify-between items-center">
          <div>
            {!activeTask?.isNew && (
              <button
                onClick={handleDeleteTask}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete Task
              </button>
            )}
          </div>
          <div className="flex justify-end gap-3">
            <button
              onClick={handleCloseModal}
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
