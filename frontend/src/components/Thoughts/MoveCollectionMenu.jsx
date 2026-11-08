import { useState, useRef, useEffect } from 'react';
import { Tag, Check, Plus, FolderMinus } from 'lucide-react';

export default function MoveCollectionMenu({
  isOpen,
  onClose,
  collections,
  currentCollectionId,
  onMoveToCollection,
  onCreateNewCollection,
  isOffline
}) {
  const menuRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-100"
    >
      <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700/60 mb-1">
        Move to Collection
      </div>

      <div className="max-h-56 overflow-y-auto">
        {/* Uncategorized Option */}
        <button
          type="button"
          onClick={() => {
            onMoveToCollection(null);
            onClose();
          }}
          disabled={isOffline}
          className="w-full flex items-center justify-between px-3 py-1.5 text-left text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer disabled:opacity-50"
        >
          <div className="flex items-center gap-2 truncate">
            <FolderMinus className="w-3.5 h-3.5 text-slate-400" />
            <span className="truncate">Uncategorized</span>
          </div>
          {!currentCollectionId && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />}
        </button>

        {/* Existing Collections */}
        {collections.map((col) => {
          const isSelected = currentCollectionId === col.id;
          return (
            <button
              key={col.id}
              type="button"
              onClick={() => {
                onMoveToCollection(col.id);
                onClose();
              }}
              disabled={isOffline}
              className="w-full flex items-center justify-between px-3 py-1.5 text-left text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer disabled:opacity-50"
            >
              <div className="flex items-center gap-2 truncate">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 ring-1 ring-black/10"
                  style={{ backgroundColor: col.color || '#6366F1' }}
                />
                <span className="truncate">{col.name}</span>
              </div>
              {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />}
            </button>
          );
        })}
      </div>

      {/* New Collection Quick Create */}
      <div className="border-t border-slate-100 dark:border-slate-700/60 mt-1 pt-1">
        <button
          type="button"
          onClick={() => {
            onClose();
            onCreateNewCollection();
          }}
          disabled={isOffline}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 cursor-pointer font-medium disabled:opacity-50"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Collection...</span>
        </button>
      </div>
    </div>
  );
}
