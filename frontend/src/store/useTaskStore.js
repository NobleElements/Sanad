import { create } from 'zustand';
import { API_BASE } from '../config';
import useUIStore from './useUIStore';

const useTaskStore = create((set, get) => ({
  tasks: [],
  isLoaded: false,
  isTaskModalOpen: false,
  activeTask: null,

  fetchTasks: async () => {
    try {
      const res = await fetch(`${API_BASE}/api/tasks`);
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
      const res = await fetch(`${API_BASE}/api/tasks`, {
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
      const res = await fetch(`${API_BASE}/api/tasks/${id}`, {
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
      const res = await fetch(`${API_BASE}/api/tasks/${id}`, { method: 'DELETE' });
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
      const res = await fetch(`${API_BASE}/api/tasks/${id}/status`, {
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

  openTaskModal: (task = null) => {
    set({
      isTaskModalOpen: true,
      activeTask: task || { title: '', content: '', status: 'ToDo', isNew: true }
    });
  },

  closeTaskModal: () => {
    set({ isTaskModalOpen: false, activeTask: null });
  }
}));

export default useTaskStore;
