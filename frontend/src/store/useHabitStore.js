import { create } from 'zustand';
import { API_BASE } from '../config';
import useUIStore from './useUIStore';

const useHabitStore = create((set, get) => ({
  habits: [],
  isLoaded: false,

  fetchHabits: async () => {
    try {
      const res = await fetch(`${API_BASE}/api/habits`);
      if (res.ok) {
        const data = await res.json();
        set({ habits: data, isLoaded: true });
        return data;
      }
    } catch (err) {
      useUIStore.getState().showError('Failed to load habits');
    }
  },

  createHabit: async (habitData) => {
    try {
      const res = await fetch(`${API_BASE}/api/habits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(habitData)
      });
      if (res.ok) {
        useUIStore.getState().showSuccess('Habit created');
        await get().fetchHabits();
        return true;
      }
      throw new Error('Failed to create');
    } catch (err) {
      useUIStore.getState().showError('Failed to create habit');
      return false;
    }
  },

  updateHabit: async (id, habitData) => {
    try {
      const res = await fetch(`${API_BASE}/api/habits/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(habitData)
      });
      if (res.ok) {
        useUIStore.getState().showSuccess('Habit updated');
        await get().fetchHabits();
        return true;
      }
      throw new Error('Failed to update');
    } catch (err) {
      useUIStore.getState().showError('Failed to update habit');
      return false;
    }
  },

  deleteHabit: async (id) => {
    try {
      const res = await fetch(`${API_BASE}/api/habits/${id}`, { method: 'DELETE' });
      if (res.ok) {
        useUIStore.getState().showSuccess('Habit deleted');
        await get().fetchHabits();
        return true;
      }
      throw new Error('Failed to delete');
    } catch (err) {
      useUIStore.getState().showError('Failed to delete habit');
      return false;
    }
  },

  toggleHabitLog: async (id, dateStr) => {
    try {
      const res = await fetch(`${API_BASE}/api/habits/${id}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: dateStr })
      });
      if (res.ok) {
        await get().fetchHabits();
        return true;
      }
      throw new Error('Failed to toggle log');
    } catch (err) {
      useUIStore.getState().showError('Failed to toggle habit log');
      return false;
    }
  }
}));

export default useHabitStore;
