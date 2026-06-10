import { create } from 'zustand';

const useUIStore = create((set) => ({
  theme: 'light',
  toasts: [],
  
  toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
  
  addToast: (message, type = 'info') => {
    const id = Date.now().toString();
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }]
    }));
    
    // Auto remove after 3 seconds
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id)
      }));
    }, 3000);
  },
  
  removeToast: (id) => set((state) => ({
    toasts: state.toasts.filter((t) => t.id !== id)
  })),
  
  showError: (message) => useUIStore.getState().addToast(message, 'error'),
  showSuccess: (message) => useUIStore.getState().addToast(message, 'success'),
}));

export default useUIStore;
