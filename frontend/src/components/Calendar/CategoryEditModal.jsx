import { useState, useEffect } from 'react';
import { X, Tag, Trash2 } from 'lucide-react';
import useCalendarStore from '../../store/useCalendarStore';
import useUIStore from '../../store/useUIStore';

export default function CategoryEditModal({ isOpen, onClose, categoryId, onDeleteCategory }) {
  const isOffline = useUIStore((state) => state.isOffline);
  const { categories, updateCategory, createCategory } = useCalendarStore();
  
  const [name, setName] = useState('');
  const [colorCode, setColorCode] = useState('#3B82F6');
  const [isSaving, setIsSaving] = useState(false);


  useEffect(() => {
    if (categoryId === 'new') {
      setName('');
      setColorCode('#3B82F6');
    } else if (categoryId) {
      const cat = categories.find(c => c.id === categoryId);
      if (cat) {
        setName(cat.name);
        setColorCode(cat.colorCode || '#3B82F6');
      }
    }
  }, [categoryId, categories, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !categoryId) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (categoryId === 'new') {
        await createCategory({ name, colorCode });
      } else {
        await updateCategory(categoryId, { name, colorCode });
      }
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const isNew = categoryId === 'new';
  const currentCategory = !isNew ? categories.find((c) => c.id === categoryId) : null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-sm overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center shrink-0">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">
            <Tag className="w-5 h-5" /> {isNew ? 'New Category' : 'Edit Category'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Name</label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-sm"
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Color</label>
            <div className="flex items-center gap-3">
              <input 
                type="color" 
                value={colorCode}
                onChange={(e) => setColorCode(e.target.value)}
                className="w-10 h-10 rounded border-0 cursor-pointer p-0 bg-transparent shrink-0"
              />
              <span className="text-sm text-slate-500 dark:text-slate-400 font-mono">{colorCode.toUpperCase()}</span>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800/50">
          {!isNew && currentCategory ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                if (onDeleteCategory) {
                  onDeleteCategory(currentCategory);
                }
              }}
              disabled={isOffline || isSaving}
              title={isOffline ? "Not available offline" : "Delete Category"}
              className="px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors">
              Cancel
            </button>
            <button 
              onClick={handleSave} 
              disabled={!name || isSaving || isOffline} 
              title={isOffline ? "Not available offline" : "Save"}
              className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
