import useUIStore from '../store/useUIStore';

export default function ToastContainer() {
  const toasts = useUIStore((state) => state.toasts);
  const removeToast = useUIStore((state) => state.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto px-4 py-3 rounded-lg shadow-lg flex items-center justify-between min-w-[300px] max-w-sm ${
            toast.type === 'error'
              ? 'bg-red-50 text-red-800 border border-red-200 dark:bg-red-900/50 dark:text-red-200 dark:border-red-800'
              : toast.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200 dark:bg-green-900/50 dark:text-green-200 dark:border-green-800'
              : 'bg-blue-50 text-blue-800 border border-blue-200 dark:bg-blue-900/50 dark:text-blue-200 dark:border-blue-800'
          }`}
        >
          <span className="text-sm font-medium">{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            className="ml-4 opacity-70 hover:opacity-100 transition-opacity"
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  );
}
