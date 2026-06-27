import { create } from 'zustand';

const useConfirmStore = create((set) => ({
  isOpen: false,
  title: 'Confirm Action',
  message: 'Are you sure you want to proceed?',
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  variant: 'danger',
  onConfirm: () => {},
  onCancel: () => {},

  showConfirm: (options) => {
    set({
      isOpen: true,
      title: options.title || 'Confirm Action',
      message: options.message || 'Are you sure you want to proceed?',
      confirmText: options.confirmText || 'Confirm',
      cancelText: options.cancelText || 'Cancel',
      variant: options.variant || 'danger',
      onConfirm: () => {
        if (options.onConfirm) options.onConfirm();
        set({ isOpen: false });
      },
      onCancel: () => {
        if (options.onCancel) options.onCancel();
        set({ isOpen: false });
      }
    });
  },

  hideConfirm: () => set({ isOpen: false })
}));

export default useConfirmStore;
