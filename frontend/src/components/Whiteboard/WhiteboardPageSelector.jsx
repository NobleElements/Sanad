import { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  ChevronDown, 
  Plus, 
  Check, 
  Trash2, 
  Edit2, 
  Copy, 
  Layers 
} from 'lucide-react';
import useUIStore from '../../store/useUIStore';

export default function WhiteboardPageSelector({ editor }) {
  const isOffline = useUIStore((state) => state.isOffline);
  const [isOpen, setIsOpen] = useState(false);
  const [pages, setPages] = useState([]);
  const [currentPageId, setCurrentPageId] = useState(null);
  const [editingPageId, setEditingPageId] = useState(null);
  const [editingName, setEditingName] = useState('');
  
  const dropdownRef = useRef(null);

  // Sync pages and current page from tldraw editor
  useEffect(() => {
    if (!editor) return;

    const updatePages = () => {
      try {
        const allPages = editor.getPages ? editor.getPages() : [];
        const currentId = editor.getCurrentPageId ? editor.getCurrentPageId() : null;
        setPages([...allPages]);
        setCurrentPageId(currentId);
      } catch (e) {
        console.warn('Error reading pages from editor', e);
      }
    };

    updatePages();

    // Listen to changes in session & document store
    const unlisten = editor.store.listen(updatePages, { scope: 'all' });
    return () => unlisten();
  }, [editor]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
        setEditingPageId(null);
      }
    };
    document.addEventListener('pointerdown', handleOutsideClick);
    return () => document.removeEventListener('pointerdown', handleOutsideClick);
  }, []);

  if (!editor || pages.length === 0) return null;

  const currentPage = pages.find((p) => p.id === currentPageId) || pages[0];

  const handleSelectPage = (pageId) => {
    if (editingPageId) return;
    try {
      editor.setCurrentPage(pageId);
      setIsOpen(false);
    } catch (e) {
      console.warn('Failed to switch page', e);
    }
  };

  const handleCreatePage = () => {
    if (isOffline) return;
    try {
      const newPageName = `Page ${pages.length + 1}`;
      const newPageId = editor.createPage ? editor.createPage({ name: newPageName }) : null;
      if (newPageId) {
        editor.setCurrentPage(newPageId);
      }
      setIsOpen(false);
    } catch (e) {
      console.warn('Failed to create page', e);
    }
  };

  const handleStartRename = (e, page) => {
    e.stopPropagation();
    setEditingPageId(page.id);
    setEditingName(page.name);
  };

  const handleSaveRename = (e, pageId) => {
    e.stopPropagation();
    if (editingName.trim()) {
      try {
        editor.renamePage(pageId, editingName.trim());
      } catch (err) {
        console.warn('Failed to rename page', err);
      }
    }
    setEditingPageId(null);
  };

  const handleDeletePage = (e, pageId) => {
    e.stopPropagation();
    if (pages.length <= 1) return;
    try {
      editor.deletePage(pageId);
    } catch (err) {
      console.warn('Failed to delete page', err);
    }
  };

  const handleDuplicatePage = (e, pageId) => {
    e.stopPropagation();
    try {
      if (editor.duplicatePage) {
        editor.duplicatePage(pageId);
      }
    } catch (err) {
      console.warn('Failed to duplicate page', err);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Page Selector Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-800/90 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-sm transition-all"
        title="Whiteboard Pages"
      >
        <FileText className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
        <span className="max-w-[110px] truncate">{currentPage?.name || 'Page 1'}</span>
        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
          ({pages.length})
        </span>
        <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />
      </button>

      {/* Pages Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1.5 w-64 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-2 z-50 animate-in fade-in zoom-in-95 duration-100 font-sans">
          {/* Header */}
          <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-slate-100 dark:border-slate-700/60 mb-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
              <Layers className="w-3.5 h-3.5 text-indigo-500" />
              <span>Pages</span>
            </div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500">
              {pages.length} total
            </span>
          </div>

          {/* Page Items List */}
          <div className="max-h-56 overflow-y-auto space-y-1 py-1">
            {pages.map((page) => {
              const isSelected = page.id === currentPageId;
              const isEditing = editingPageId === page.id;

              return (
                <div
                  key={page.id}
                  onClick={() => !isEditing && handleSelectPage(page.id)}
                  className={`group flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-xl text-xs transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-semibold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                  }`}
                >
                  {isEditing ? (
                    <div className="flex items-center gap-1 w-full" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveRename(e, page.id);
                          if (e.key === 'Escape') setEditingPageId(null);
                        }}
                        autoFocus
                        className="flex-1 px-2 py-0.5 text-xs bg-white dark:bg-slate-900 border border-indigo-400 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none"
                      />
                      <button
                        onClick={(e) => handleSaveRename(e, page.id)}
                        className="p-1 rounded bg-indigo-600 text-white hover:bg-indigo-700"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <FileText className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                        <span className="truncate flex-1">{page.name}</span>
                      </div>

                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => handleStartRename(e, page)}
                          className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-600"
                          title="Rename page"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDuplicatePage(e, page.id)}
                          className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-600"
                          title="Duplicate page"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        {pages.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => handleDeletePage(e, page.id)}
                            className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            title="Delete page"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      {isSelected && !isEditing && (
                        <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 flex-shrink-0 ml-1" />
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer: Create Page Button */}
          <div className="mt-1 pt-1.5 border-t border-slate-100 dark:border-slate-700/60">
            <button
              type="button"
              onClick={handleCreatePage}
              disabled={isOffline}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-xl transition-colors disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Page</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
