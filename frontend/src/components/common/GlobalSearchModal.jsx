import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, X, Loader2, Lightbulb, CheckSquare, Calendar as CalendarIcon, 
  DollarSign, CreditCard, Book, FileText, BookOpen, Folder, HardDrive, 
  Presentation, Repeat, CheckCircle2, AppWindow, ArrowRight, Clock, 
  Trash2, Sparkles, LayoutDashboard
} from 'lucide-react';
import useUIStore from '../../store/useUIStore';
import { API_URL } from '../../config';

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'notes', label: 'Notes' },
  { id: 'thoughts', label: 'Thoughts' },
  { id: 'finance', label: 'Finance' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'whiteboards', label: 'Whiteboards' },
  { id: 'books', label: 'Books' },
  { id: 'files', label: 'Files' },
  { id: 'habits', label: 'Habits' },
  { id: 'goals', label: 'Goals' },
  { id: 'apps', label: 'Apps' },
];

const TYPE_ICONS = {
  thought: Lightbulb,
  task: CheckSquare,
  calendar: CalendarIcon,
  asset: DollarSign,
  debt: CreditCard,
  transaction: DollarSign,
  notebook: Book,
  note: FileText,
  book: BookOpen,
  folder: Folder,
  file: HardDrive,
  whiteboard: Presentation,
  whiteboard_shape: Presentation,
  habit: Repeat,
  goal: CheckCircle2,
  app: AppWindow,
};

const CATEGORY_COLORS = {
  Tasks: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  Notes: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  Thoughts: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
  Finance: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300 border-green-200 dark:border-green-800',
  Calendar: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  Whiteboards: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  Books: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300 border-rose-200 dark:border-rose-800',
  Files: 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300 border-sky-200 dark:border-sky-800',
  Habits: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
  Goals: 'bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300 border-teal-200 dark:border-teal-800',
  Apps: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/20 dark:text-fuchsia-300 border-fuchsia-200 dark:border-fuchsia-800',
};

const QUICK_SHORTCUTS = [
  { label: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { label: 'Tasks', url: '/tasks', icon: CheckSquare },
  { label: 'Notebook', url: '/notebook', icon: FileText },
  { label: 'Calendar', url: '/calendar', icon: CalendarIcon },
  { label: 'Thoughts', url: '/thoughts', icon: Lightbulb },
  { label: 'Whiteboard', url: '/whiteboard', icon: Presentation },
  { label: 'Finance', url: '/finance', icon: DollarSign },
  { label: 'Files', url: '/files', icon: HardDrive },
];

const RECENT_SEARCHES_KEY = 'sanad_recent_searches_v1';

function highlightMatches(text, query) {
  if (!text || !query) return text;
  const parts = [];
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  let lastIdx = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      parts.push(text.substring(lastIdx, match.index));
    }
    parts.push(
      <mark key={match.index} className="bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 font-semibold px-0.5 rounded">
        {match[0]}
      </mark>
    );
    lastIdx = regex.lastIndex;
  }
  if (lastIdx < text.length) {
    parts.push(text.substring(lastIdx));
  }
  return parts.length > 0 ? parts : text;
}

export default function GlobalSearchModal() {
  const isOpen = useUIStore((state) => state.isGlobalSearchOpen);
  const closeGlobalSearch = useUIStore((state) => state.closeGlobalSearch);
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const [recentSearches, setRecentSearches] = useState(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const inputRef = useRef(null);
  const resultsContainerRef = useRef(null);
  const debounceTimerRef = useRef(null);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults([]);
      setActiveCategory('all');
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const saveRecentSearch = (term) => {
    if (!term || !term.trim()) return;
    const clean = term.trim();
    const updated = [clean, ...recentSearches.filter((s) => s.toLowerCase() !== clean.toLowerCase())].slice(0, 8);
    setRecentSearches(updated);
    try {
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save recent search', e);
    }
  };

  const removeRecentSearch = (e, termToRemove) => {
    e.stopPropagation();
    const updated = recentSearches.filter((s) => s !== termToRemove);
    setRecentSearches(updated);
    try {
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to remove recent search', e);
    }
  };

  const clearAllRecentSearches = () => {
    setRecentSearches([]);
    try {
      localStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch (e) {
      console.warn('Failed to clear recent searches', e);
    }
  };

  // Perform search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    setIsLoading(true);

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const typeParam = activeCategory !== 'all' ? `&type=${encodeURIComponent(activeCategory)}` : '';
        const res = await fetch(`${API_URL}/search?q=${encodeURIComponent(query.trim())}${typeParam}&limit=15`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.results || []);
          setSelectedIndex(0);
        } else {
          setResults([]);
        }
      } catch (err) {
        console.error('Search request failed', err);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 150);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, activeCategory]);

  const handleSelectResult = (item) => {
    saveRecentSearch(query || item.title);
    closeGlobalSearch();
    navigate(item.url);
  };

  // Keyboard navigation inside modal
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeGlobalSearch();
      return;
    }

    if (results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        handleSelectResult(results[selectedIndex]);
      }
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (!resultsContainerRef.current) return;
    const selectedElem = resultsContainerRef.current.querySelector(`[data-index="${selectedIndex}"]`);
    if (selectedElem) {
      selectedElem.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-start justify-center pt-12 sm:pt-20 p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={closeGlobalSearch}
    >
      <div 
        className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-slate-800 dark:text-slate-100 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Top Search Input Bar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <Search className="w-5 h-5 text-slate-400 dark:text-slate-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search thoughts, tasks, notes, calendar, finance, files..."
            className="flex-1 bg-transparent border-none outline-none text-base sm:text-lg placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-900 dark:text-slate-100"
          />
          {isLoading && (
            <Loader2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400 animate-spin shrink-0" />
          )}
          {query && !isLoading && (
            <button
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-xs font-semibold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded shadow-xs">
            ESC
          </kbd>
        </div>

        {/* Category Filter Pills */}
        <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800/60 flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden bg-slate-50/50 dark:bg-slate-900/50">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-2.5 py-1 text-xs font-medium rounded-full transition-all shrink-0 ${
                activeCategory === cat.id
                  ? 'bg-indigo-600 dark:bg-indigo-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Results / Empty View */}
        <div 
          ref={resultsContainerRef}
          className="flex-1 overflow-y-auto p-2 sm:p-3 divide-y divide-slate-100 dark:divide-slate-800/40"
        >
          {/* Active Search Results */}
          {query.trim() !== '' && (
            <>
              {results.length > 0 ? (
                <div className="space-y-1">
                  {results.map((item, idx) => {
                    const IconComp = TYPE_ICONS[item.type] || FileText;
                    const isSelected = idx === selectedIndex;
                    const badgeClass = CATEGORY_COLORS[item.category] || 'bg-slate-100 text-slate-700 border-slate-200';

                    return (
                      <div
                        key={`${item.id}-${idx}`}
                        data-index={idx}
                        onClick={() => handleSelectResult(item)}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`group flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/60 shadow-xs'
                            : 'hover:bg-slate-100/80 dark:hover:bg-slate-800/50 border border-transparent'
                        }`}
                      >
                        <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                          isSelected 
                            ? 'bg-indigo-600 text-white dark:bg-indigo-500' 
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:bg-slate-200 dark:group-hover:bg-slate-700'
                        }`}>
                          <IconComp className="w-4 h-4" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-semibold text-sm sm:text-base text-slate-900 dark:text-slate-100 truncate">
                              {highlightMatches(item.title, query)}
                            </span>
                            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border shrink-0 ${badgeClass}`}>
                              {item.category}
                            </span>
                          </div>

                          {item.snippet && (
                            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                              {highlightMatches(item.snippet, query)}
                            </p>
                          )}
                        </div>

                        <div className="shrink-0 self-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <ArrowRight className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                !isLoading && (
                  <div className="py-12 px-4 text-center">
                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-400">
                      <Search className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-medium text-slate-700 dark:text-slate-300">
                      No results for "{query}"
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-400 dark:text-slate-500 mt-1 max-w-sm mx-auto">
                      Try adjusting your keywords, switching categories, or searching by title, content, or project.
                    </p>
                  </div>
                )
              )}
            </>
          )}

          {/* Empty Query State: Recent Searches & Quick Shortcuts */}
          {query.trim() === '' && (
            <div className="space-y-5 p-2">
              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <div>
                  <div className="flex items-center justify-between px-2 mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" /> Recent Searches
                    </span>
                    <button
                      onClick={clearAllRecentSearches}
                      className="text-xs text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" /> Clear
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2 px-2">
                    {recentSearches.map((term, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setQuery(term);
                          inputRef.current?.focus();
                        }}
                        className="group flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs sm:text-sm transition-all"
                      >
                        <span>{term}</span>
                        <span
                          onClick={(e) => removeRecentSearch(e, term)}
                          className="opacity-40 group-hover:opacity-100 hover:text-red-500 p-0.5 rounded transition-all"
                        >
                          <X className="w-3 h-3" />
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Navigation Shortcuts */}
              <div>
                <div className="px-2 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> Quick Navigation
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 px-2">
                  {QUICK_SHORTCUTS.map((shortcut) => {
                    const Icon = shortcut.icon;
                    return (
                      <button
                        key={shortcut.url}
                        onClick={() => {
                          closeGlobalSearch();
                          navigate(shortcut.url);
                        }}
                        className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 border border-slate-200/60 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs sm:text-sm font-medium transition-all text-left"
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="truncate">{shortcut.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Helper Bar */}
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 font-sans font-semibold bg-slate-200 dark:bg-slate-800 rounded">↑</kbd>
              <kbd className="px-1.5 py-0.5 font-sans font-semibold bg-slate-200 dark:bg-slate-800 rounded">↓</kbd>
              to navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 font-sans font-semibold bg-slate-200 dark:bg-slate-800 rounded">↵</kbd>
              to select
            </span>
          </div>
          <span className="hidden sm:inline-block">
            Press <kbd className="px-1.5 py-0.5 font-sans font-semibold bg-slate-200 dark:bg-slate-800 rounded">ESC</kbd> to close
          </span>
        </div>
      </div>
    </div>
  );
}
