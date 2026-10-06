import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { Loader2, Search, Calendar, ChevronDown, ChevronUp, Layers, Clock } from 'lucide-react';
import useThoughtsStore from '../store/useThoughtsStore';
import useConfirmStore from '../store/useConfirmStore';
import useUIStore from '../store/useUIStore';

import { parseUTCDate, timeAgo, formatTimeOfDay } from '../utils/dateUtils';
import { linkify } from '../utils/textUtils';
import usePageTitle from '../hooks/usePageTitle';

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

function ThoughtCard({
  thought,
  orderNumber,
  isHighlighted,
  isTopInCollapsedPile,
  hasMultipleInPile,
  pileCount,
  onPileClick,
  isEditing,
  editContent,
  setEditContent,
  isSaving,
  isOffline,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete
}) {
  const cardContent = (
    <div
      id={`thought-${thought.id}`}
      className={`relative z-10 bg-white dark:bg-slate-800 p-6 rounded-xl border transition-all duration-300 dark:text-slate-100 ${
        isHighlighted
          ? 'border-indigo-500 ring-2 ring-indigo-500/50 bg-indigo-50/40 dark:bg-indigo-950/40 shadow-md'
          : hasMultipleInPile
          ? 'border-slate-200 dark:border-slate-700 shadow-sm group-hover:shadow-md group-hover:border-indigo-300 dark:group-hover:border-indigo-600/70'
          : 'border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md'
      }`}
    >
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded">
            Thought {orderNumber ? `#${orderNumber}` : ''}
          </span>
          <span className="text-xs text-slate-400 dark:text-slate-500 font-medium flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-400" />
            {formatTimeOfDay(thought.createdAt)}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {!isEditing && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onStartEdit();
                }}
                disabled={isOffline}
                title={isOffline ? 'Not available offline' : ''}
                className="text-xs text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                disabled={isOffline}
                title={isOffline ? 'Not available offline' : ''}
                className="text-xs text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Delete
              </button>
            </>
          )}
          <span
            className="text-xs text-slate-400 dark:text-slate-500 font-medium whitespace-nowrap"
            title={parseUTCDate(thought.createdAt).toLocaleString()}
          >
            {timeAgo(thought.createdAt)}
          </span>
        </div>
      </div>

      {isEditing ? (
        <div className="flex flex-col gap-3">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full border border-slate-300 dark:border-slate-600 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:bg-slate-700 dark:text-slate-100"
            rows="3"
            disabled={isSaving}
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancelEdit}
              disabled={isSaving}
              className="px-3 py-1.5 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSaveEdit}
              disabled={isSaving || isOffline}
              title={isOffline ? 'Not available offline' : ''}
              className="px-3 py-1.5 text-sm bg-indigo-600 dark:bg-indigo-500 text-white rounded hover:bg-indigo-700 dark:hover:bg-indigo-600 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      ) : (
        <div
          dir="auto"
          className="text-slate-700 dark:text-slate-300 text-lg leading-relaxed whitespace-pre-wrap break-words"
          dangerouslySetInnerHTML={{ __html: linkify(thought.content) }}
        />
      )}

      {/* Pile footer hint shown on top card when collapsed with multiple thoughts */}
      {isTopInCollapsedPile && hasMultipleInPile && (
        <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs select-none">
          <div className="flex items-center gap-2 font-medium text-indigo-600 dark:text-indigo-400">
            <span className="flex items-center justify-center w-5 h-5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/70 dark:border-indigo-800/60 shadow-2xs">
              <Layers className="w-3.5 h-3.5" />
            </span>
            <span>
              +{pileCount - 1} more {pileCount - 1 === 1 ? 'thought' : 'thoughts'} in this pile
            </span>
          </div>
          <div className="flex items-center gap-1 font-medium text-slate-400 dark:text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            <span>Click to unfold pile</span>
            <ChevronDown className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-y-0.5" />
          </div>
        </div>
      )}
    </div>
  );

  if (isTopInCollapsedPile && hasMultipleInPile) {
    return (
      <div
        onClick={onPileClick}
        className="relative isolate group cursor-pointer transition-all duration-300 pb-3"
      >
        {/* Layer 2: Deepest card peek (when >= 3 thoughts) */}
        {pileCount >= 3 && (
          <div
            aria-hidden="true"
            className="absolute inset-0 translate-y-3.5 mx-3 rounded-xl bg-slate-100/90 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 shadow-xs -rotate-1 transition-all duration-300 ease-out group-hover:translate-y-5 group-hover:-rotate-2 group-hover:scale-[1.01] pointer-events-none -z-20"
          />
        )}

        {/* Layer 1: Middle card peek (when >= 2 thoughts) */}
        {pileCount >= 2 && (
          <div
            aria-hidden="true"
            className="absolute inset-0 translate-y-1.5 mx-1.5 rounded-xl bg-slate-50/95 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs rotate-0.5 transition-all duration-300 ease-out group-hover:translate-y-2.5 group-hover:rotate-1.5 group-hover:scale-[1.005] pointer-events-none -z-10"
          />
        )}

        {cardContent}
      </div>
    );
  }

  return cardContent;
}

export default function Thoughts() {
  usePageTitle('Thoughts');
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const {
    thoughts,
    hasMore,
    isLoaded,
    fetchThoughts,
    addThought,
    updateThought,
    deleteThought: storeDeleteThought
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

  const [newContent, setNewContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

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
    async (pageNum, currentSearch) => {
      setLoadingMore(pageNum > 1);
      await fetchThoughts(pageNum, currentSearch);
      setLoadingMore(false);
    },
    [fetchThoughts]
  );

  useEffect(() => {
    setPage(1);
    loadThoughts(1, debouncedSearch);
  }, [debouncedSearch, loadThoughts]);

  useEffect(() => {
    if (page > 1) {
      loadThoughts(page, debouncedSearch);
    }
  }, [page, debouncedSearch, loadThoughts]);

  // Group thoughts by local day, days descending, thoughts within each day ascending
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

  const isDayExpanded = useCallback(
    (dateKey) => {
      // If user is actively searching, auto-expand so matching thoughts are directly visible
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

  const allExpanded = dayGroups.length > 0 && dayGroups.every((g) => isDayExpanded(g.dateKey));

  const toggleAllDays = () => {
    if (allExpanded) {
      const nextState = {};
      dayGroups.forEach((g) => {
        nextState[g.dateKey] = false;
      });
      setExpandedDays(nextState);
    } else {
      const nextState = {};
      dayGroups.forEach((g) => {
        nextState[g.dateKey] = true;
      });
      setExpandedDays(nextState);
    }
  };

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

    // Auto-expand the day containing the highlighted thought
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
    const success = await updateThought(id, editContent);
    if (success) {
      setEditingId(null);
    }
    setIsSaving(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    setIsSubmitting(true);
    const success = await addThought(newContent);
    if (success) {
      setNewContent('');
      setPage(1);
      setSearchQuery('');
      // Auto-expand today so user can see their freshly captured thought
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

  return (
    <div className="flex-1 flex flex-col p-8 overflow-y-auto bg-slate-50 dark:bg-slate-900">
      <div className="max-w-3xl w-full mx-auto">
        <div className="flex justify-between items-center mb-8 gap-2">
          <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-200">Thoughts</h2>
          <div className="relative w-64">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Search thoughts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:text-slate-100"
            />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 mb-10 dark:text-slate-100">
          <h3 className="text-lg font-semibold mb-4 text-slate-700 dark:text-slate-300">
            What's on your mind?
          </h3>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              className="w-full border border-slate-300 dark:border-slate-600 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:bg-slate-700 dark:text-slate-100"
              placeholder="Capture a thought..."
              rows="3"
              disabled={isSubmitting}
            />
            <button
              type="submit"
              disabled={isSubmitting || !newContent.trim() || isOffline}
              title={isOffline ? 'Not available offline' : ''}
              className="self-end bg-indigo-600 dark:bg-indigo-500 text-white px-5 py-2 rounded-lg font-medium hover:bg-indigo-700 dark:hover:bg-indigo-600 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? 'Capturing...' : 'Capture Thought'}
            </button>
          </form>
        </div>

        {!isLoaded ? (
          <div className="text-slate-500 dark:text-slate-400 italic">Loading thoughts...</div>
        ) : thoughts.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 text-center dark:text-slate-100">
            <p className="text-slate-500 dark:text-slate-400 italic text-lg mb-2">
              No thoughts captured yet.
            </p>
            <p className="text-slate-400 dark:text-slate-500 text-sm">
              Capture your first thought above to begin building your timeline.
            </p>
          </div>
        ) : (
          <div>
            {dayGroups.length > 1 && (
              <div className="flex items-center justify-between px-2 mb-4 text-xs font-medium text-slate-500 dark:text-slate-400">
                <span>
                  {thoughts.length} {thoughts.length === 1 ? 'thought' : 'thoughts'} across {dayGroups.length} days
                </span>
                <button
                  type="button"
                  onClick={toggleAllDays}
                  className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors cursor-pointer"
                >
                  {allExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  <span>{allExpanded ? 'Collapse all days' : 'Expand all days'}</span>
                </button>
              </div>
            )}

            <div className="relative border-l-2 border-indigo-200 dark:border-indigo-900/60 ml-4 space-y-8">
              {dayGroups.map((dayGroup) => {
                const expanded = isDayExpanded(dayGroup.dateKey);

                return (
                  <div key={dayGroup.dateKey} className="relative">
                    {/* Interactive Day Header */}
                    <button
                      type="button"
                      onClick={() => toggleDay(dayGroup.dateKey)}
                      className="group/day relative pl-8 my-6 flex items-center text-left focus:outline-none cursor-pointer select-none"
                      title={
                        expanded
                          ? 'Click to collapse thoughts for this day'
                          : 'Click to see all thoughts for this day'
                      }
                    >
                      {/* Timeline node */}
                      <div className="absolute -left-[11px] top-1/2 -translate-y-1/2 w-6 h-6 bg-slate-100 dark:bg-slate-800 rounded-full border-4 border-slate-50 dark:border-slate-900 flex items-center justify-center transition-colors group-hover/day:border-indigo-200 dark:group-hover/day:border-indigo-800">
                        <div
                          className={`w-2 h-2 rounded-full transition-colors ${
                            expanded
                              ? 'bg-indigo-600 dark:bg-indigo-400'
                              : 'bg-slate-400 dark:bg-slate-500 group-hover/day:bg-indigo-500'
                          }`}
                        />
                      </div>

                      {/* Date pill button */}
                      <div
                        className={`inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border shadow-2xs transition-all duration-200 ${
                          expanded
                            ? 'bg-indigo-50/90 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-950 dark:text-indigo-200 ring-2 ring-indigo-500/20'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
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
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200/50 dark:border-slate-600/50">
                          {dayGroup.thoughts.length} {dayGroup.thoughts.length === 1 ? 'thought' : 'thoughts'}
                        </span>
                        {dayGroup.thoughts.length > 1 && (
                          <ChevronDown
                            className={`w-4 h-4 text-slate-400 dark:text-slate-400 transition-transform duration-300 ${
                              expanded
                                ? 'rotate-180 text-indigo-600 dark:text-indigo-400'
                                : 'group-hover/day:translate-y-0.5'
                            }`}
                          />
                        )}
                      </div>
                    </button>

                    {/* Day Thoughts View */}
                    {!expanded ? (
                      /* Collapsed state: only first thought visible, rendered as a pile of cards */
                      <div className="relative pl-8">
                        {/* Timeline dot */}
                        <div className="absolute -left-[9px] top-6 w-4 h-4 bg-indigo-500 rounded-full border-4 border-slate-50 dark:border-slate-900 z-20"></div>

                        <ThoughtCard
                          thought={dayGroup.thoughts[0]}
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
                        />
                      </div>
                    ) : (
                      /* Expanded state: all thoughts for this day ordered ascending */
                      <div className="space-y-6">
                        {dayGroup.thoughts.map((thought, tIndex) => (
                          <div key={thought.id} className="relative pl-8 group">
                            {/* Timeline dot */}
                            <div className="absolute -left-[9px] top-6 w-4 h-4 bg-indigo-500 rounded-full border-4 border-slate-50 dark:border-slate-900 z-20"></div>

                            <ThoughtCard
                              thought={thought}
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
                            />
                          </div>
                        ))}

                        {/* Quick collapse footer if day has multiple thoughts */}
                        {dayGroup.thoughts.length > 1 && (
                          <div className="relative pl-8 pt-1 pb-2">
                            <button
                              type="button"
                              onClick={() => toggleDay(dayGroup.dateKey)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 border border-slate-200 dark:border-slate-700 shadow-2xs transition-all cursor-pointer"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                              <span>Collapse day into pile</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Loading more indicator & sentinel node */}
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
          </div>
        )}
      </div>
    </div>
  );
}
