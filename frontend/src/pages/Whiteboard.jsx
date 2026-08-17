import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Maximize2, 
  Minimize2, 
  ExternalLink, 
  ChevronDown, 
  Check, 
  Presentation,
  Search,
  Sparkles
} from 'lucide-react';
import useWhiteboardStore from '../store/useWhiteboardStore';
import useUIStore from '../store/useUIStore';
import useConfirmStore from '../store/useConfirmStore';
import usePageTitle from '../hooks/usePageTitle';
import WhiteboardCanvas from '../components/Whiteboard/WhiteboardCanvas';
import WhiteboardModal from '../components/Whiteboard/WhiteboardModal';
import ResourceDrawer from '../components/Whiteboard/ResourceDrawer';
import WhiteboardPageSelector from '../components/Whiteboard/WhiteboardPageSelector';

export default function Whiteboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isOffline = useUIStore((state) => state.isOffline);
  const addToast = useUIStore((state) => state.addToast);
  const { showConfirm } = useConfirmStore();

  const {
    whiteboards,
    activeWhiteboard,
    isLoading,
    fetchWhiteboards,
    fetchWhiteboardById,
    createWhiteboard,
    updateWhiteboard,
    deleteWhiteboard,
    setActiveWhiteboard
  } = useWhiteboardStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isResourceDrawerOpen, setIsResourceDrawerOpen] = useState(false);
  const [editor, setEditor] = useState(null);

  const containerRef = useRef(null);
  const dropdownRef = useRef(null);
  const canvasRef = useRef(null);

  usePageTitle(activeWhiteboard ? `Whiteboard - ${activeWhiteboard.name}` : 'Whiteboards');

  // Fetch all whiteboards on mount
  useEffect(() => {
    if (id) {
      fetchWhiteboardById(id);
    }
    fetchWhiteboards().then((boards) => {
      if (id) {
        fetchWhiteboardById(id);
      } else if (boards && boards.length > 0 && !activeWhiteboard) {
        fetchWhiteboardById(boards[0].id);
      }
    });
  }, [id]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Sync fullscreen state
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleSelectWhiteboard = async (wb) => {
    setIsDropdownOpen(false);
    await fetchWhiteboardById(wb.id);
    navigate(`/whiteboard/${wb.id}`);
  };

  const handleOpenCreateModal = () => {
    if (isOffline) return;
    setModalMode('create');
    setIsModalOpen(true);
    setIsDropdownOpen(false);
  };

  const handleOpenEditModal = () => {
    if (isOffline || !activeWhiteboard) return;
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleModalSave = async ({ name, icon }) => {
    if (modalMode === 'create') {
      const created = await createWhiteboard({ name, icon });
      if (created) {
        addToast('Whiteboard created successfully', 'success');
        navigate(`/whiteboard/${created.id}`);
      } else {
        addToast('Failed to create whiteboard', 'error');
      }
    } else if (modalMode === 'edit' && activeWhiteboard) {
      const updated = await updateWhiteboard(activeWhiteboard.id, { name, icon });
      if (updated) {
        addToast('Whiteboard updated', 'success');
      } else {
        addToast('Failed to update whiteboard', 'error');
      }
    }
  };

  const handleDelete = () => {
    if (isOffline || !activeWhiteboard) return;

    showConfirm({
      title: 'Delete Whiteboard',
      message: `Are you sure you want to delete "${activeWhiteboard.name}"? This action cannot be undone.`,
      confirmLabel: 'Delete',
      confirmVariant: 'danger',
      onConfirm: async () => {
        const success = await deleteWhiteboard(activeWhiteboard.id);
        if (success) {
          addToast('Whiteboard deleted', 'success');
          const remaining = whiteboards.filter((w) => w.id !== activeWhiteboard.id);
          if (remaining.length > 0) {
            handleSelectWhiteboard(remaining[0]);
          } else {
            setActiveWhiteboard(null);
            navigate('/whiteboard');
          }
        } else {
          addToast('Failed to delete whiteboard', 'error');
        }
      }
    });
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  };

  const handleInsertResource = (type, data) => {
    if (canvasRef.current) {
      canvasRef.current.insertResource(type, data);
      addToast(`Added ${type === 'sanad-task' ? 'Task' : 'Note'} card to canvas`, 'success');
    }
  };

  const filteredWhiteboards = whiteboards.filter((w) =>
    w.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div 
      ref={containerRef}
      className="flex-1 flex flex-col h-full bg-slate-100 dark:bg-slate-900 overflow-hidden relative"
    >
      {/* Top Header / Action Bar */}
      <div className="flex-none flex items-center justify-between px-4 py-2.5 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm z-30">
        <div className="flex items-center gap-3 min-w-0">
          {/* Whiteboard Dropdown Selector */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-100 font-semibold text-sm max-w-[280px] sm:max-w-xs transition-colors shadow-sm"
            >
              {activeWhiteboard ? (
                <>
                  <span className="text-xl leading-none flex-shrink-0">{activeWhiteboard.icon}</span>
                  <span className="truncate">{activeWhiteboard.name}</span>
                </>
              ) : (
                <span className="text-slate-500">Select a Whiteboard...</span>
              )}
              <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0 ml-auto" />
            </button>

            {isDropdownOpen && (
              <div className="absolute top-full left-0 mt-1.5 w-72 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                {/* Search in Dropdown */}
                {whiteboards.length > 4 && (
                  <div className="relative mb-2">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search whiteboards..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                )}

                <div className="max-h-60 overflow-y-auto space-y-1">
                  {filteredWhiteboards.map((wb) => {
                    const isSelected = activeWhiteboard?.id === wb.id;
                    return (
                      <button
                        key={wb.id}
                        onClick={() => handleSelectWhiteboard(wb)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-sm transition-colors ${
                          isSelected
                            ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-medium'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                      >
                        <span className="text-lg leading-none">{wb.icon}</span>
                        <span className="truncate flex-1">{wb.name}</span>
                        {isSelected && <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />}
                      </button>
                    );
                  })}

                  {filteredWhiteboards.length === 0 && (
                    <div className="p-3 text-center text-xs text-slate-400">
                      No whiteboards found.
                    </div>
                  )}
                </div>

                <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                  <button
                    onClick={handleOpenCreateModal}
                    disabled={isOffline}
                    title={isOffline ? 'Not available offline' : 'Create Whiteboard'}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4" />
                    <span>New Whiteboard</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quick Edit/Rename & Delete for active whiteboard */}
          {activeWhiteboard && (
            <div className="flex items-center gap-1">
              <button
                onClick={handleOpenEditModal}
                disabled={isOffline}
                title={isOffline ? 'Not available offline' : 'Rename / Change Icon'}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button
                onClick={handleDelete}
                disabled={isOffline}
                title={isOffline ? 'Not available offline' : 'Delete Whiteboard'}
                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:text-slate-400 dark:hover:text-rose-400 dark:hover:bg-rose-950/40 transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Whiteboard Page Selector Dropdown */}
          {activeWhiteboard && editor && (
            <>
              <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 mx-0.5 hidden sm:block" />
              <WhiteboardPageSelector editor={editor} />
            </>
          )}
        </div>

        {/* Right Toolbar Actions */}
        <div className="flex items-center gap-2">
          {/* New Whiteboard Button */}
          <button
            onClick={handleOpenCreateModal}
            disabled={isOffline}
            title={isOffline ? 'Not available offline' : 'Create Whiteboard'}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            <span>New Board</span>
          </button>

          {activeWhiteboard && (
            <>
              {/* Open in Standalone Tab Button */}
              <a
                href={`/whiteboard-standalone/${activeWhiteboard.id}`}
                target="_blank"
                rel="noreferrer"
                title="Open in new standalone tab"
                className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium inline-flex items-center gap-1.5 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                <span className="hidden md:inline">Open in Tab</span>
              </a>

              {/* Fullscreen Button */}
              <button
                onClick={toggleFullscreen}
                title={isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
                className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 w-full h-full relative overflow-hidden bg-slate-50 dark:bg-slate-900">
        {isLoading && !activeWhiteboard ? (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-50 dark:bg-slate-900 z-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : activeWhiteboard ? (
          <>
            <WhiteboardCanvas 
              key={activeWhiteboard.id} 
              ref={canvasRef}
              whiteboard={activeWhiteboard} 
              readOnly={isOffline}
              isResourceDrawerOpen={isResourceDrawerOpen}
              onToggleResourceDrawer={() => setIsResourceDrawerOpen(!isResourceDrawerOpen)}
              onEditorMount={setEditor}
            />

            {/* Sanad Resources Slide-out Drawer */}
            <ResourceDrawer
              isOpen={isResourceDrawerOpen}
              onClose={() => setIsResourceDrawerOpen(false)}
              onInsertResource={handleInsertResource}
            />
          </>
        ) : (
          /* Empty State */
          <div className="flex-1 h-full flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4 shadow-sm border border-indigo-100 dark:border-indigo-800">
              <Presentation className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">
              No Whiteboards Yet
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-6">
              Create an infinite whiteboard canvas to draw, sketch diagrams, take visual notes, and brainstorm ideas.
            </p>
            <button
              onClick={handleOpenCreateModal}
              disabled={isOffline}
              title={isOffline ? 'Not available offline' : 'Create your first Whiteboard'}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-5 h-5" />
              <span>Create your first Whiteboard</span>
            </button>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      <WhiteboardModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleModalSave}
        editingWhiteboard={modalMode === 'edit' ? activeWhiteboard : null}
      />
    </div>
  );
}
