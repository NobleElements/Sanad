import { create } from 'zustand';
import { API_BASE, API_URL } from '../config';
import useUIStore from './useUIStore';

const useHabitStore = create((set, get) => ({
  habits: [],
  isLoaded: false,

  fetchHabits: async () => {
    try {
      const res = await fetch(`${API_URL}/habits`);
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
      const res = await fetch(`${API_URL}/habits`, {
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
      const res = await fetch(`${API_URL}/habits/${id}`, {
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
      const res = await fetch(`${API_URL}/habits/${id}`, { method: 'DELETE' });
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
      const res = await fetch(`${API_URL}/habits/${id}/toggle`, {
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
  },

  reorderHabits: async (startIndex, endIndex) => {
    const { habits } = get();
    const newHabits = Array.from(habits);
    const [movedHabit] = newHabits.splice(startIndex, 1);
    newHabits.splice(endIndex, 0, movedHabit);

    // Optimistic update
    set({ habits: newHabits });

    try {
      const habitIds = newHabits.map(h => h.id);
      const res = await fetch(`${API_URL}/habits/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ habitIds })
      });
      if (!res.ok) {
        throw new Error('Failed to reorder');
      }
    } catch (err) {
      useUIStore.getState().showError('Failed to save habit order');
      // Rollback
      get().fetchHabits();
    }
  }
}));

export default useHabitStore;
