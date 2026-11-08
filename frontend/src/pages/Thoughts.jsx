import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import {
  Loader2,
  Search,
  Calendar,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  List as ListIcon,
  AlignJustify,
  Clock,
  Pin,
  Palette,
  Tag,
  Plus,
  X
} from 'lucide-react';
import useThoughtsStore from '../store/useThoughtsStore';
import useConfirmStore from '../store/useConfirmStore';
import useUIStore from '../store/useUIStore';

import { parseUTCDate, timeAgo, formatTimeOfDay } from '../utils/dateUtils';
import usePageTitle from '../hooks/usePageTitle';
import { getKeepColorStyle, KEEP_COLORS } from '../utils/thoughtUtils';
import PromptModal from '../components/common/PromptModal';
import ThoughtCard from '../components/Thoughts/ThoughtCard';
import CompactThoughtRow from '../components/Thoughts/CompactThoughtRow';
import CollectionTabBar from '../components/Thoughts/CollectionTabBar';
import DeleteCollectionModal from '../components/Thoughts/DeleteCollectionModal';
import ColorPickerMenu from '../components/Thoughts/ColorPickerMenu';
import MoveCollectionMenu from '../components/Thoughts/MoveCollectionMenu';

const getLocalDateKey = (dateStr) => {
  const d = parseUTCDate(dateStr);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDayDisplay = (dateObj) => {
  const now = new Date();
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

  const targetKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;

  const formatted = dateObj.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  if (targetKey === todayKey) {
    return { label: formatted, relative: 'Today' };
  }
  if (targetKey === yesterdayKey) {
    return { label: formatted, relative: 'Yesterday' };
  }
  return { label: formatted, relative: null };
};

export default function Thoughts() {
  usePageTitle('Thoughts');
  const [searchParams] = useSearchParams();
  const location = useLocation();

  const {
    thoughts,
    collections,
    activeCollectionId,
    viewMode,
    hasMore,
    isLoaded,
    fetchThoughts,
    fetchCollections,
    setActiveCollectionId,
    setViewMode,
    createCollection,
    updateCollection,
    deleteCollection,
    addThought,
    updateThought,
    deleteThought: storeDeleteThought,
    moveThought,
    togglePinThought
  } = useThoughtsStore();

  const { showConfirm } = useConfirmStore();
  const isOffline = useUIStore((state) => state.isOffline);

  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [highlightedThoughtId, setHighlightedThoughtId] = useState(null);

  const [expandedDays, setExpandedDays] = useState({});

  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // New Thought Form State
  const [newContent, setNewContent] = useState('');
  const [newCollectionId, setNewCollectionId] = useState(activeCollectionId || null);
  const [newColor, setNewColor] = useState('default');
  const [newIsPinned, setNewIsPinned] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInputColorOpen, setIsInputColorOpen] = useState(false);
  const [isInputMoveOpen, setIsInputMoveOpen] = useState(false);
  const captureTextareaRef = useRef(null);

  // Auto-expand textarea height as content grows without inner scroll or first-character jump
  useEffect(() => {
    if (captureTextareaRef.current) {
      captureTextareaRef.current.style.height = 'auto';
      captureTextareaRef.current.style.height = `${captureTextareaRef.current.scrollHeight}px`;
    }
  }, [newContent]);

  // Modals for collection management
  const [isCreateColModalOpen, setIsCreateColModalOpen] = useState(false);
  const [renameTargetCol, setRenameTargetCol] = useState(null);
  const [deleteTargetCol, setDeleteTargetCol] = useState(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Sync new thought collection with active tab when active tab changes
  useEffect(() => {
    if (activeCollectionId === '__UNCATEGORIZED__') {
      setNewCollectionId(null);
    } else {
      setNewCollectionId(activeCollectionId);
    }
  }, [activeCollectionId]);

  // Load collections once on mount
  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const observerRef = useRef();
  const lastElementRef = useCallback(
    (node) => {
      if (!isLoaded || loadingMore) return;
      if (observerRef.current) observerRef.current.disconnect();

      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setPage((prev) => prev + 1);
        }
      });

      if (node) observerRef.current.observe(node);
    },
    [isLoaded, loadingMore, hasMore]
  );

  const loadThoughts = useCallback(
    async (pageNum, currentSearch, targetCol) => {
      setLoadingMore(pageNum > 1);
      await fetchThoughts(pageNum, currentSearch, targetCol);
      setLoadingMore(false);
    },
    [fetchThoughts]
  );

  // Refetch when search query or active collection tab changes
  useEffect(() => {
    setPage(1);
    loadThoughts(1, debouncedSearch, activeCollectionId);
  }, [debouncedSearch, activeCollectionId, loadThoughts]);

  // Load more pages
  useEffect(() => {
    if (page > 1) {
      loadThoughts(page, debouncedSearch, activeCollectionId);
    }
  }, [page, debouncedSearch, activeCollectionId, loadThoughts]);

  // Total and uncategorized thought counts
  const totalThoughtsCount = useMemo(() => {
    // Sum of collection counts + uncategorized thoughts in memory
    const knownInCols = collections.reduce((acc, c) => acc + (c.thoughtCount || 0), 0);
    const uncatInMemory = thoughts.filter((t) => !t.collectionId).length;
    return Math.max(thoughts.length, knownInCols + uncatInMemory);
  }, [collections, thoughts]);

  const uncategorizedCount = useMemo(() => {
    return thoughts.filter((t) => !t.collectionId).length;
  }, [thoughts]);

  // Group thoughts by local day for Timeline View
  const dayGroups = useMemo(() => {
    const map = new Map();

    for (const thought of thoughts) {
      const dateObj = parseUTCDate(thought.createdAt);
      const dateKey = getLocalDateKey(thought.createdAt);

      if (!map.has(dateKey)) {
        map.set(dateKey, {
          dateKey,
          date: dateObj,
          display: formatDayDisplay(dateObj),
          thoughts: []
        });
      }
      map.get(dateKey).thoughts.push(thought);
    }

    // Days in descending order (newest day first)
    const sortedDays = Array.from(map.values()).sort((a, b) => b.dateKey.localeCompare(a.dateKey));

    // Thoughts in the same day in ascending order (earliest thought of the day first)
    for (const day of sortedDays) {
      day.thoughts.sort((a, b) => {
        const diff = parseUTCDate(a.createdAt).getTime() - parseUTCDate(b.createdAt).getTime();
        if (diff !== 0) return diff;
        return a.id.localeCompare(b.id);
      });
    }

    return sortedDays;
  }, [thoughts]);

  // Split thoughts into pinned and unpinned for Grid & Compact views
  const { pinnedThoughts, otherThoughts } = useMemo(() => {
    const pinned = [];
    const others = [];
    for (const t of thoughts) {
      if (t.isPinned) {
        pinned.push(t);
      } else {
        others.push(t);
      }
    }
    return { pinnedThoughts: pinned, otherThoughts: others };
  }, [thoughts]);

  const isDayExpanded = useCallback(
    (dateKey) => {
      if (debouncedSearch.trim() !== '') {
        return expandedDays[dateKey] !== false;
      }
      return !!expandedDays[dateKey];
    },
    [debouncedSearch, expandedDays]
  );

  const toggleDay = useCallback(
    (dateKey) => {
      setExpandedDays((prev) => {
        const currentExpanded = isDayExpanded(dateKey);
        return {
          ...prev,
          [dateKey]: !currentExpanded
        };
      });
    },
    [isDayExpanded]
  );

  const handlePileClick = (e, dateKey) => {
    if (
      e.target.closest('button') ||
      e.target.closest('textarea') ||
      e.target.closest('a') ||
      e.target.closest('input')
    ) {
      return;
    }
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) {
      return;
    }
    toggleDay(dateKey);
  };

  useEffect(() => {
    const targetId =
      searchParams.get('highlight') || (location.hash ? location.hash.replace('#thought-', '') : null);
    if (!targetId || !isLoaded) return;

    setHighlightedThoughtId(targetId);

    // Auto-expand the day containing the highlighted thought in timeline view
    const targetGroup = dayGroups.find((group) => group.thoughts.some((t) => t.id === targetId));
    if (targetGroup) {
      setExpandedDays((prev) => ({ ...prev, [targetGroup.dateKey]: true }));
    }

    const scrollTimer = setTimeout(() => {
      const el = document.getElementById(`thought-${targetId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);

    const clearTimer = setTimeout(() => {
      setHighlightedThoughtId(null);
    }, 3000);

    return () => {
      clearTimeout(scrollTimer);
      clearTimeout(clearTimer);
    };
  }, [searchParams, location.hash, isLoaded, dayGroups]);

  const handleStartEdit = (thought, dayKey) => {
    if (dayKey) {
      setExpandedDays((prev) => ({ ...prev, [dayKey]: true }));
    }
    setEditingId(thought.id);
    setEditContent(thought.content);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };

  const saveEdit = async (id) => {
    if (!editContent.trim()) return;
    setIsSaving(true);
    const success = await updateThought(id, { content: editContent });
    if (success) {
      setEditingId(null);
    }
    setIsSaving(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    setIsSubmitting(true);
    const options = { tags: null };
    if (newCollectionId) options.collectionId = newCollectionId;
    if (newColor && newColor !== 'default') options.color = newColor;
    if (newIsPinned) options.isPinned = newIsPinned;

    const success = await addThought(newContent, options);

    if (success) {
      setNewContent('');
      setNewColor('default');
      setNewIsPinned(false);
      setPage(1);
      setSearchQuery('');
      // Auto-expand today so user can see their freshly captured thought in timeline view
      const todayKey = getLocalDateKey(new Date().toISOString());
      setExpandedDays((prev) => ({ ...prev, [todayKey]: true }));
    }
    setIsSubmitting(false);
  };

  const deleteThought = async (id) => {
    showConfirm({
      title: 'Delete Thought',
      message: 'Are you sure you want to delete this thought?',
      confirmText: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        await storeDeleteThought(id);
      }
    });
  };

  const handleMoveThought = async (thoughtId, colId) => {
    await moveThought(thoughtId, colId);
  };

  const handleTogglePin = async (thoughtId, isPinned) => {
    await togglePinThought(thoughtId, isPinned);
  };

  const handleColorChange = async (thoughtId, colorId) => {
    await updateThought(thoughtId, { color: colorId !== 'default' ? colorId : null });
  };

  // Collection modal handlers
  const handleConfirmCreateCollection = async (name) => {
    if (!name.trim()) return;
    const created = await createCollection(name);
    if (created) {
      setIsCreateColModalOpen(false);
      setActiveCollectionId(created.id);
    }
  };

  const handleConfirmRenameCollection = async (newName) => {
    if (!renameTargetCol || !newName.trim()) return;
    await updateCollection(renameTargetCol.id, newName, renameTargetCol.color);
    setRenameTargetCol(null);
  };

  const handleConfirmDeleteCollection = async (deleteThoughts) => {
    if (!deleteTargetCol) return;
    await deleteCollection(deleteTargetCol.id, deleteThoughts);
    setDeleteTargetCol(null);
  };

  const activeCollectionObj = collections.find((c) => c.id === activeCollectionId);
  const inputColorStyle = getKeepColorStyle(newColor);
  const inputAssignedCol = collections.find((c) => c.id === newCollectionId);

  return (
    <div className="flex-1 flex flex-col p-4 md:p-8 overflow-y-auto bg-slate-50 dark:bg-slate-900">
      <div className="max-w-6xl w-full mx-auto">
        {/* Header with Title, Search, and View Mode Toggles */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
              Thoughts
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Capture, organize, and skim your ideas with Google Keep-like flexibility.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Search Bar */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Search thoughts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:text-slate-100 shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* View Mode Toggle Buttons */}
            <div className="flex bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1 shadow-2xs shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('timeline')}
                className={`p-1.5 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                  viewMode === 'timeline'
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
                title="Timeline View"
              >
                <Clock className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('compact')}
                className={`p-1.5 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                  viewMode === 'compact'
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
                title="Compact View"
              >
                <AlignJustify className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Collection Tabs Bar */}
        <CollectionTabBar
          collections={collections}
          activeCollectionId={activeCollectionId}
          onSelectCollection={(colId) => setActiveCollectionId(colId)}
          totalThoughtsCount={totalThoughtsCount}
          uncategorizedCount={uncategorizedCount}
          onCreateClick={() => setIsCreateColModalOpen(true)}
          onRenameClick={(col) => setRenameTargetCol(col)}
          onDeleteClick={(col) => setDeleteTargetCol(col)}
          isOffline={isOffline}
        />

        {/* Active Search & Filter Banner */}
        {debouncedSearch && activeCollectionId && (
          <div className="mb-4 flex items-center justify-between px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-xs text-indigo-900 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
            <span>
              Searching for &ldquo;{debouncedSearch}&rdquo; inside &ldquo;
              {activeCollectionObj ? activeCollectionObj.name : 'Uncategorized'}&rdquo;.
            </span>
            <button
              type="button"
              onClick={() => setActiveCollectionId(null)}
              className="font-semibold underline hover:text-indigo-700 dark:hover:text-indigo-200 cursor-pointer"
            >
              Search all thoughts instead
            </button>
          </div>
        )}

        {/* Thought Capture Form (Google Keep style) */}
        <div
          className={`p-4 rounded-2xl shadow-sm border transition-all duration-200 mb-8 dark:text-slate-100 ${
            inputColorStyle.bg
          } ${inputColorStyle.border}`}
        >
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <textarea
              ref={captureTextareaRef}
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              className="w-full bg-transparent border-0 p-1 rounded-lg focus:outline-none resize-none overflow-hidden text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-base"
              placeholder="Capture a thought..."
              rows={2}
              disabled={isSubmitting}
            />

            {/* Bottom Actions Bar */}
            <div className="flex items-center justify-between pt-2 border-t border-black/5 dark:border-white/5 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                {/* Collection Selector Pill */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsInputMoveOpen(!isInputMoveOpen)}
                    disabled={isSubmitting || isOffline}
                    title="Assign collection"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-white/70 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: inputAssignedCol?.color || '#94A3B8' }}
                    />
                    <span className="truncate max-w-[120px]">
                      {inputAssignedCol ? inputAssignedCol.name : 'Uncategorized'}
                    </span>
                  </button>

                  <MoveCollectionMenu
                    isOpen={isInputMoveOpen}
                    onClose={() => setIsInputMoveOpen(false)}
                    collections={collections}
                    currentCollectionId={newCollectionId}
                    onMoveToCollection={(colId) => setNewCollectionId(colId)}
                    onCreateNewCollection={() => setIsCreateColModalOpen(true)}
                    isOffline={isOffline}
                  />
                </div>

                {/* Color Palette Button */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsInputColorOpen(!isInputColorOpen)}
                    disabled={isSubmitting || isOffline}
                    title="Note color"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Palette className="w-4 h-4" />
                  </button>

                  <ColorPickerMenu
                    isOpen={isInputColorOpen}
                    onClose={() => setIsInputColorOpen(false)}
                    currentColor={newColor}
                    onSelectColor={(colorId) => setNewColor(colorId)}
                    isOffline={isOffline}
                  />
                </div>

                {/* Pin Toggle Button */}
                <button
                  type="button"
                  onClick={() => setNewIsPinned(!newIsPinned)}
                  disabled={isSubmitting || isOffline}
                  title={newIsPinned ? 'Pinned' : 'Pin to top'}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50 ${
                    newIsPinned
                      ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60'
                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  <Pin className={`w-4 h-4 ${newIsPinned ? 'fill-current rotate-45' : ''}`} />
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || !newContent.trim() || isOffline}
                title={isOffline ? 'Not available offline' : ''}
                className="bg-indigo-600 dark:bg-indigo-500 text-white px-5 py-1.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 dark:hover:bg-indigo-600 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
              >
                {isSubmitting ? 'Capturing...' : 'Capture Thought'}
              </button>
            </div>
          </form>
        </div>

        {/* Thoughts List / Grid / Timeline View */}
        {!isLoaded ? (
          <div className="text-slate-500 dark:text-slate-400 italic">Loading thoughts...</div>
        ) : thoughts.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 text-center dark:text-slate-100">
            <p className="text-slate-500 dark:text-slate-400 italic text-lg mb-2">
              No thoughts captured yet.
            </p>
            <p className="text-slate-400 dark:text-slate-500 text-sm">
              Capture your first thought above to begin building your timeline.
            </p>
          </div>
        ) : (
          <div>
            {/* 1. GRID VIEW (Google Keep Masonry) */}
            {viewMode === 'grid' && (
              <div className="space-y-8">
                {/* Pinned Section */}
                {pinnedThoughts.length > 0 && (
                  <div>
                    <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 px-1">
                      Pinned ({pinnedThoughts.length})
                    </div>
                    <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
                      {pinnedThoughts.map((thought) => (
                        <div key={thought.id} className="break-inside-avoid">
                          <ThoughtCard
                            thought={thought}
                            collections={collections}
                            isHighlighted={highlightedThoughtId === thought.id}
                            isEditing={editingId === thought.id}
                            editContent={editContent}
                            setEditContent={setEditContent}
                            isSaving={isSaving}
                            isOffline={isOffline}
                            onStartEdit={() => handleStartEdit(thought)}
                            onCancelEdit={cancelEdit}
                            onSaveEdit={() => saveEdit(thought.id)}
                            onDelete={() => deleteThought(thought.id)}
                            onTogglePin={handleTogglePin}
                            onColorChange={handleColorChange}
                            onMoveToCollection={handleMoveThought}
                            onCreateNewCollection={() => setIsCreateColModalOpen(true)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Others Section */}
                <div>
                  {pinnedThoughts.length > 0 && otherThoughts.length > 0 && (
                    <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 px-1">
                      Others
                    </div>
                  )}
                  <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
                    {otherThoughts.map((thought) => (
                      <div key={thought.id} className="break-inside-avoid">
                        <ThoughtCard
                          thought={thought}
                          collections={collections}
                          isHighlighted={highlightedThoughtId === thought.id}
                          isEditing={editingId === thought.id}
                          editContent={editContent}
                          setEditContent={setEditContent}
                          isSaving={isSaving}
                          isOffline={isOffline}
                          onStartEdit={() => handleStartEdit(thought)}
                          onCancelEdit={cancelEdit}
                          onSaveEdit={() => saveEdit(thought.id)}
                          onDelete={() => deleteThought(thought.id)}
                          onTogglePin={handleTogglePin}
                          onColorChange={handleColorChange}
                          onMoveToCollection={handleMoveThought}
                          onCreateNewCollection={() => setIsCreateColModalOpen(true)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 2. COMPACT VIEW (Dense Rows for Fast Skimming) */}
            {viewMode === 'compact' && (
              <div className="space-y-6">
                {pinnedThoughts.length > 0 && (
                  <div>
                    <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 px-1">
                      Pinned
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {pinnedThoughts.map((thought) => (
                        <CompactThoughtRow
                          key={thought.id}
                          thought={thought}
                          collections={collections}
                          isEditing={editingId === thought.id}
                          editContent={editContent}
                          setEditContent={setEditContent}
                          isSaving={isSaving}
                          isOffline={isOffline}
                          onStartEdit={() => handleStartEdit(thought)}
                          onCancelEdit={cancelEdit}
                          onSaveEdit={() => saveEdit(thought.id)}
                          onDelete={() => deleteThought(thought.id)}
                          onTogglePin={handleTogglePin}
                          onMoveToCollection={handleMoveThought}
                          onCreateNewCollection={() => setIsCreateColModalOpen(true)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  {pinnedThoughts.length > 0 && otherThoughts.length > 0 && (
                    <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 px-1">
                      Others
                    </div>
                  )}
                  <div className="flex flex-col gap-1.5">
                    {otherThoughts.map((thought) => (
                      <CompactThoughtRow
                        key={thought.id}
                        thought={thought}
                        collections={collections}
                        isEditing={editingId === thought.id}
                        editContent={editContent}
                        setEditContent={setEditContent}
                        isSaving={isSaving}
                        isOffline={isOffline}
                        onStartEdit={() => handleStartEdit(thought)}
                        onCancelEdit={cancelEdit}
                        onSaveEdit={() => saveEdit(thought.id)}
                        onDelete={() => deleteThought(thought.id)}
                        onTogglePin={handleTogglePin}
                        onMoveToCollection={handleMoveThought}
                        onCreateNewCollection={() => setIsCreateColModalOpen(true)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 3. TIMELINE VIEW (Chronological Day Piles) */}
            {viewMode === 'timeline' && (
              <div className="relative border-l-2 border-indigo-200 dark:border-indigo-900/60 ml-4 space-y-10">
                {dayGroups.map((dayGroup) => {
                  const expanded = isDayExpanded(dayGroup.dateKey);

                  return (
                    <div key={dayGroup.dateKey} className="relative pl-8 group/day">
                      {/* Timeline Node */}
                      <div className="absolute -left-[11px] top-1.5 w-6 h-6 bg-slate-100 dark:bg-slate-800 rounded-full border-4 border-slate-50 dark:border-slate-900 flex items-center justify-center transition-colors group-hover/day:border-indigo-200 dark:group-hover/day:border-indigo-800 z-20">
                        <div
                          className={`w-2 h-2 rounded-full transition-colors ${
                            expanded
                              ? 'bg-indigo-600 dark:bg-indigo-400'
                              : 'bg-slate-400 dark:bg-slate-500 group-hover/day:bg-indigo-500'
                          }`}
                        />
                      </div>

                      {/* Day Header Pill */}
                      <div className="flex items-center mb-3">
                        <button
                          type="button"
                          onClick={() => toggleDay(dayGroup.dateKey)}
                          className={`inline-flex items-center gap-2 px-3.5 py-1 rounded-full border shadow-2xs transition-all duration-200 select-none ${
                            expanded
                              ? 'bg-indigo-50/90 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-950 dark:text-indigo-200 ring-2 ring-indigo-500/20'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600'
                          } ${dayGroup.thoughts.length > 1 ? 'cursor-pointer' : 'cursor-default'}`}
                          title={
                            dayGroup.thoughts.length > 1
                              ? expanded
                                ? 'Click to collapse thoughts'
                                : 'Click to see all thoughts'
                              : ''
                          }
                        >
                          {dayGroup.display.relative && (
                            <span
                              className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                                dayGroup.display.relative === 'Today'
                                  ? 'bg-indigo-600 text-white dark:bg-indigo-500'
                                  : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {dayGroup.display.relative}
                            </span>
                          )}
                          <Calendar className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                          <span className="text-sm font-semibold">{dayGroup.display.label}</span>
                          {dayGroup.thoughts.length > 1 && (
                            <ChevronDown
                              className={`w-4 h-4 text-slate-400 dark:text-slate-400 transition-transform duration-300 ${
                                expanded
                                  ? 'rotate-180 text-indigo-600 dark:text-indigo-400'
                                  : 'group-hover/day:translate-y-0.5'
                              }`}
                            />
                          )}
                        </button>
                      </div>

                      {/* Day Thoughts View */}
                      {!expanded ? (
                        <div>
                          <ThoughtCard
                            thought={dayGroup.thoughts[0]}
                            collections={collections}
                            orderNumber={dayGroup.thoughts.length > 1 ? 1 : null}
                            isHighlighted={highlightedThoughtId === dayGroup.thoughts[0].id}
                            isTopInCollapsedPile={true}
                            hasMultipleInPile={dayGroup.thoughts.length > 1}
                            pileCount={dayGroup.thoughts.length}
                            onPileClick={(e) => handlePileClick(e, dayGroup.dateKey)}
                            isEditing={editingId === dayGroup.thoughts[0].id}
                            editContent={editContent}
                            setEditContent={setEditContent}
                            isSaving={isSaving}
                            isOffline={isOffline}
                            onStartEdit={() => handleStartEdit(dayGroup.thoughts[0], dayGroup.dateKey)}
                            onCancelEdit={cancelEdit}
                            onSaveEdit={() => saveEdit(dayGroup.thoughts[0].id)}
                            onDelete={() => deleteThought(dayGroup.thoughts[0].id)}
                            onTogglePin={handleTogglePin}
                            onColorChange={handleColorChange}
                            onMoveToCollection={handleMoveThought}
                            onCreateNewCollection={() => setIsCreateColModalOpen(true)}
                          />
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {dayGroup.thoughts.map((thought, tIndex) => (
                            <div key={thought.id}>
                              <ThoughtCard
                                thought={thought}
                                collections={collections}
                                orderNumber={dayGroup.thoughts.length > 1 ? tIndex + 1 : null}
                                isHighlighted={highlightedThoughtId === thought.id}
                                isTopInCollapsedPile={false}
                                hasMultipleInPile={false}
                                pileCount={dayGroup.thoughts.length}
                                onPileClick={() => {}}
                                isEditing={editingId === thought.id}
                                editContent={editContent}
                                setEditContent={setEditContent}
                                isSaving={isSaving}
                                isOffline={isOffline}
                                onStartEdit={() => handleStartEdit(thought, dayGroup.dateKey)}
                                onCancelEdit={cancelEdit}
                                onSaveEdit={() => saveEdit(thought.id)}
                                onDelete={() => deleteThought(thought.id)}
                                onTogglePin={handleTogglePin}
                                onColorChange={handleColorChange}
                                onMoveToCollection={handleMoveThought}
                                onCreateNewCollection={() => setIsCreateColModalOpen(true)}
                              />
                            </div>
                          ))}

                          {dayGroup.thoughts.length > 1 && (
                            <div className="pt-1">
                              <button
                                type="button"
                                onClick={() => toggleDay(dayGroup.dateKey)}
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 border border-slate-200 dark:border-slate-700 shadow-2xs transition-all cursor-pointer"
                              >
                                <ChevronUp className="w-3.5 h-3.5" />
                                <span>Collapse</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Infinite Scroll Sentinel */}
            <div ref={lastElementRef} className="py-4 flex justify-center">
              {loadingMore && (
                <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm font-medium">Loading older thoughts...</span>
                </div>
              )}
              {!hasMore && thoughts.length > 0 && (
                <div className="text-slate-400 dark:text-slate-500 text-sm font-medium italic">
                  No more thoughts to load
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Create Collection Modal */}
      <PromptModal
        isOpen={isCreateColModalOpen}
        title="Create New Collection"
        message="Enter a name for the new collection:"
        initialValue=""
        confirmText="Create"
        cancelText="Cancel"
        onConfirm={handleConfirmCreateCollection}
        onCancel={() => setIsCreateColModalOpen(false)}
      />

      {/* Rename Collection Modal */}
      <PromptModal
        isOpen={!!renameTargetCol}
        title="Rename Collection"
        message={`Enter a new name for "${renameTargetCol?.name}":`}
        initialValue={renameTargetCol?.name || ''}
        confirmText="Save"
        cancelText="Cancel"
        onConfirm={handleConfirmRenameCollection}
        onCancel={() => setRenameTargetCol(null)}
      />

      {/* Delete Collection Modal */}
      <DeleteCollectionModal
        isOpen={!!deleteTargetCol}
        collection={deleteTargetCol}
        onClose={() => setDeleteTargetCol(null)}
        onConfirm={handleConfirmDeleteCollection}
      />
    </div>
  );
}
