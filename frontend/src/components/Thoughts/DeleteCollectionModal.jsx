import { AlertTriangle, X, FolderX, Trash2 } from 'lucide-react';

export default function DeleteCollectionModal({
  isOpen,
  collection,
  onClose,
  onConfirm
}) {
  if (!isOpen || !collection) return null;

  const count = collection.thoughtCount || 0;

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col transform transition-all border border-slate-200 dark:border-slate-700">
        <div className="p-5 flex items-start gap-4">
          <div className="p-2.5 rounded-full shrink-0 bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="flex-1 pt-0.5">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
              Delete Collection &ldquo;{collection.name}&rdquo;?
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">
              {count > 0 ? (
                <>
                  This collection currently contains <span className="font-semibold text-indigo-600 dark:text-indigo-400">{count}</span> {count === 1 ? 'thought' : 'thoughts'}. How would you like to handle them?
                </>
              ) : (
                'Are you sure you want to delete this empty collection?'
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>

          {count > 0 ? (
            <>
              <button
                type="button"
                onClick={() => onConfirm(false)}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 rounded-lg transition-colors cursor-pointer"
              >
                <FolderX className="w-4 h-4" />
                <span>Move to Uncategorized</span>
              </button>
              <button
                type="button"
                onClick={() => onConfirm(true)}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete All Thoughts</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => onConfirm(false)}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Collection</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
