import { useState, useRef, useEffect } from 'react';
import { Plus, MoreVertical, Edit2, Trash2, Layers, Inbox } from 'lucide-react';

export default function CollectionTabBar({
  collections,
  activeCollectionId,
  onSelectCollection,
  totalThoughtsCount,
  uncategorizedCount,
  onCreateClick,
  onRenameClick,
  onDeleteClick,
  isOffline
}) {
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none select-none mb-6">
      {/* All Thoughts Tab */}
      <button
        type="button"
        onClick={() => onSelectCollection(null)}
        className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer border ${
          activeCollectionId === null
            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/60'
        }`}
      >
        <Layers className="w-3.5 h-3.5" />
        <span>All Thoughts</span>
        {typeof totalThoughtsCount === 'number' && (
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              activeCollectionId === null
                ? 'bg-white/20 text-white'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
            }`}
          >
            {totalThoughtsCount}
          </span>
        )}
      </button>

      {/* Uncategorized Tab */}
      <button
        type="button"
        onClick={() => onSelectCollection('__UNCATEGORIZED__')}
        className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer border ${
          activeCollectionId === '__UNCATEGORIZED__'
            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/60'
        }`}
      >
        <Inbox className="w-3.5 h-3.5" />
        <span>Uncategorized</span>
        {typeof uncategorizedCount === 'number' && (
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              activeCollectionId === '__UNCATEGORIZED__'
                ? 'bg-white/20 text-white'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
            }`}
          >
            {uncategorizedCount}
          </span>
        )}
      </button>

      {/* Custom Collection Tabs */}
      {collections.map((col) => {
        const isActive = activeCollectionId === col.id;
        const isMenuOpen = openMenuId === col.id;

        return (
          <div key={col.id} className="relative inline-flex items-center">
            <button
              type="button"
              onClick={() => onSelectCollection(col.id)}
              className={`inline-flex items-center gap-2 pl-3.5 pr-2 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer border ${
                isActive
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/60'
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0 ring-1 ring-black/10"
                style={{ backgroundColor: col.color || '#6366F1' }}
              />
              <span>{col.name}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                {col.thoughtCount || 0}
              </span>
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenMenuId(isMenuOpen ? null : col.id);
                }}
                className={`p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors ${
                  isActive ? 'text-white' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                }`}
                title="Collection options"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </span>
            </button>

            {/* Dropdown Options Menu */}
            {isMenuOpen && (
              <div
                ref={menuRef}
                className="absolute top-full left-0 mt-1 w-36 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-50 text-xs"
              >
                <button
                  type="button"
                  onClick={() => {
                    setOpenMenuId(null);
                    onRenameClick(col);
                  }}
                  disabled={isOffline}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>Rename</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOpenMenuId(null);
                    onDeleteClick(col);
                  }}
                  disabled={isOffline}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            )}
          </div>
        );
      })}

      {/* New Collection Button */}
      <button
        type="button"
        onClick={onCreateClick}
        disabled={isOffline}
        title={isOffline ? 'Not available offline' : 'Create new collection'}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>New Collection</span>
      </button>
    </div>
  );
}
