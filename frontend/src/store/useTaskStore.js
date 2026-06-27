import { create } from 'zustand';
import { API_BASE, API_URL } from '../config';
import useUIStore from './useUIStore';

const useTaskStore = create((set, get) => ({
  tasks: [],
  isLoaded: false,
  isTaskModalOpen: false,
  activeTask: null,
  activeTaskDetails: null,
  isLoadingTaskDetails: false,
  isUploadingAttachment: false,

  fetchTasks: async () => {
    try {
      const res = await fetch(`${API_URL}/tasks`);
      if (res.ok) {
        const data = await res.json();
        set({ tasks: data, isLoaded: true });
      }
    } catch (err) {
      useUIStore.getState().showError('Failed to load tasks');
    }
  },

  createTask: async (taskData) => {
    try {
      const res = await fetch(`${API_URL}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData)
      });
      if (res.ok) {
        await get().fetchTasks();
        useUIStore.getState().showSuccess('Task created');
        return true;
      }
      throw new Error('Failed to create');
    } catch (err) {
      useUIStore.getState().showError('Failed to create task');
      return false;
    }
  },

  updateTask: async (id, taskData) => {
    try {
      const res = await fetch(`${API_URL}/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData)
      });
      if (res.ok) {
        await get().fetchTasks();
        useUIStore.getState().showSuccess('Task updated');
        return true;
      }
      throw new Error('Failed to update');
    } catch (err) {
      useUIStore.getState().showError('Failed to update task');
      return false;
    }
  },

  deleteTask: async (id) => {
    try {
      const res = await fetch(`${API_URL}/tasks/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await get().fetchTasks();
        useUIStore.getState().showSuccess('Task deleted');
        return true;
      }
      throw new Error('Failed to delete');
    } catch (err) {
      useUIStore.getState().showError('Failed to delete task');
      return false;
    }
  },

  updateTaskStatus: async (id, newStatus) => {
    try {
      const res = await fetch(`${API_URL}/tasks/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStatus)
      });
      if (res.ok) {
        await get().fetchTasks();
        return true;
      }
      throw new Error('Failed to update status');
    } catch (err) {
      useUIStore.getState().showError('Failed to update task status');
      return false;
    }
  },

  reorderTasks: async (tasksToUpdate) => {
    try {
      // Optimistic update
      const currentTasks = get().tasks;
      
      const newTasks = currentTasks.map(t => {
        const update = tasksToUpdate.find(u => u.id === t.id);
        if (update) {
          return { ...t, status: update.status, order: update.order };
        }
        return t;
      });
      
      // Keep it sorted
      newTasks.sort((a, b) => {
        if (a.order !== b.order) return a.order - b.order;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
      
      set({ tasks: newTasks });

      const res = await fetch(`${API_URL}/tasks/reorder`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: tasksToUpdate })
      });
      
      if (!res.ok) throw new Error('Failed to reorder');
      return true;
    } catch (err) {
      useUIStore.getState().showError('Failed to reorder tasks');
      await get().fetchTasks(); // Revert
      return false;
    }
  },


  getTaskDetails: async (id) => {
    set({ isLoadingTaskDetails: true });
    try {
      const res = await fetch(`${API_URL}/tasks/${id}`);
      if (!res.ok) throw new Error('Failed to load task details');
      const data = await res.json();
      set({ activeTaskDetails: data });
      return data;
    } catch (err) {
      useUIStore.getState().showError('Failed to load task details');
    } finally {
      set({ isLoadingTaskDetails: false });
    }
    return null;
  },

  addTaskComment: async (taskId, text) => {
    try {
      const res = await fetch(`${API_URL}/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      if (res.ok) {
        const newComment = await res.json();
        set(state => ({
          activeTaskDetails: state.activeTaskDetails
            ? { ...state.activeTaskDetails, comments: [...(state.activeTaskDetails.comments || []), newComment] }
            : null
        }));
        return true;
      }
      throw new Error('Failed to post comment');
    } catch (err) {
      useUIStore.getState().showError('Failed to post comment');
      return false;
    }
  },

  deleteTaskComment: async (taskId, commentId) => {
    try {
      const res = await fetch(`${API_URL}/tasks/${taskId}/comments/${commentId}`, { method: 'DELETE' });
      if (res.ok) {
        set(state => ({
          activeTaskDetails: state.activeTaskDetails
            ? { ...state.activeTaskDetails, comments: state.activeTaskDetails.comments.filter(c => c.id !== commentId && c._id !== commentId) }
            : null
        }));
        return true;
      }
      throw new Error('Failed to delete comment');
    } catch (err) {
      useUIStore.getState().showError('Failed to delete comment');
      return false;
    }
  },

  uploadTaskAttachment: async (taskId, file) => {
    set({ isUploadingAttachment: true });
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API_URL}/tasks/${taskId}/attachments`, {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const newAttachment = await res.json();
        set(state => ({
          activeTaskDetails: state.activeTaskDetails
            ? { ...state.activeTaskDetails, attachments: [...(state.activeTaskDetails.attachments || []), newAttachment] }
            : null
        }));
        return true;
      }
      throw new Error('Failed to upload file');
    } catch (err) {
      useUIStore.getState().showError('Failed to upload file');
      return false;
    } finally {
      set({ isUploadingAttachment: false });
    }
  },

  deleteTaskAttachment: async (taskId, attachmentId) => {
    try {
      const res = await fetch(`${API_URL}/tasks/${taskId}/attachments/${attachmentId}`, { method: 'DELETE' });
      if (res.ok) {
        set(state => ({
          activeTaskDetails: state.activeTaskDetails
            ? { ...state.activeTaskDetails, attachments: state.activeTaskDetails.attachments.filter(a => a.id !== attachmentId && a._id !== attachmentId) }
            : null
        }));
        return true;
      }
      throw new Error('Failed to delete attachment');
    } catch (err) {
      useUIStore.getState().showError('Failed to delete attachment');
      return false;
    }
  },

  openTaskModal: (task = null) => {
    set({
      isTaskModalOpen: true,
      activeTask: task || { title: '', content: '', status: 'ToDo', isNew: true }
    });
  },

  closeTaskModal: () => {
    set({ isTaskModalOpen: false, activeTask: null, activeTaskDetails: null });
  },

  renameProject: async (oldName, newName) => {
    try {
      const res = await fetch(`${API_URL}/tasks/projects/rename`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldName, newName })
      });
      if (res.ok) {
        await get().fetchTasks();
        useUIStore.getState().showSuccess('Project renamed');
        return true;
      }
      throw new Error('Failed to rename project');
    } catch (err) {
      useUIStore.getState().showError('Failed to rename project');
      return false;
    }
  },

  deleteProject: async (projectName) => {
    try {
      const res = await fetch(`${API_URL}/tasks/projects/${encodeURIComponent(projectName)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        await get().fetchTasks();
        useUIStore.getState().showSuccess('Project deleted');
        return true;
      }
      throw new Error('Failed to delete project');
    } catch (err) {
      useUIStore.getState().showError('Failed to delete project');
      return false;
    }
  }
}));

export default useTaskStore;
