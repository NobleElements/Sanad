import { useState, useEffect, useRef, useCallback, Fragment } from 'react';
import { Loader2, Search } from 'lucide-react';
import useThoughtsStore from '../store/useThoughtsStore';

import { parseUTCDate, timeAgo } from '../utils/dateUtils';
import { linkify } from '../utils/textUtils';
import usePageTitle from '../hooks/usePageTitle';

export default function Thoughts() {
  usePageTitle('Thoughts');
  const { thoughts, hasMore, isLoaded, fetchThoughts, addThought, updateThought, deleteThought: storeDeleteThought } = useThoughtsStore();
  
  const [loadingMore, setLoadingMore] = useState(false);

  const [page, setPage] = useState(1);

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
  const lastElementRef = useCallback((node) => {
    if (!isLoaded || loadingMore) return;
    if (observerRef.current) observerRef.current.disconnect();
    
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prev => prev + 1);
      }
    });
    
    if (node) observerRef.current.observe(node);
  }, [isLoaded, loadingMore, hasMore]);

  const loadThoughts = async (pageNum, currentSearch) => {
    setLoadingMore(pageNum > 1);
    await fetchThoughts(pageNum, currentSearch);
    setLoadingMore(false);
  };

  useEffect(() => {
    setPage(1);
    loadThoughts(1, debouncedSearch);
  }, [debouncedSearch]);

  useEffect(() => {
    if (page > 1) {
      loadThoughts(page, debouncedSearch);
    }
  }, [page]);

  const startEdit = (thought) => {
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
    }
    setIsSubmitting(false);
  };

  const deleteThought = async (id) => {
    if (!confirm('Are you sure you want to delete this thought?')) return;
    await storeDeleteThought(id);
  };

  return (
    <div className="flex-1 flex flex-col p-8 overflow-y-auto bg-slate-50">
      <div className="max-w-3xl w-full mx-auto">
        <div className="flex justify-between items-center mb-8 gap-2">
          <h2 className="text-3xl font-bold text-slate-800">Thoughts</h2>
          <div className="relative w-64">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search thoughts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-10">
          <h3 className="text-lg font-semibold mb-4 text-slate-700">What's on your mind?</h3>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <textarea 
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              className="w-full border border-slate-300 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              placeholder="Capture a thought..."
              rows="3"
              disabled={isSubmitting}
            />
            <button 
              type="submit" 
              disabled={isSubmitting || !newContent.trim()}
              className="self-end bg-indigo-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Capturing...' : 'Capture Thought'}
            </button>
          </form>
        </div>

        {!isLoaded ? (
          <div className="text-slate-500 italic">Loading thoughts...</div>
        ) : thoughts.length === 0 ? (
          <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 text-center">
            <p className="text-slate-500 italic text-lg mb-2">No thoughts captured yet.</p>
            <p className="text-slate-400 text-sm">Head over to the Dashboard to write your first thought.</p>
          </div>
        ) : (
          <div className="relative border-l-2 border-indigo-200 ml-4 space-y-8">
            {thoughts.map((thought, index) => {
              const currentDay = parseUTCDate(thought.createdAt).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
              const prevDay = index > 0 ? parseUTCDate(thoughts[index - 1].createdAt).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : null;
              const showDateHeader = currentDay !== prevDay;

              return (
                <Fragment key={thought.id}>
                  {showDateHeader && (
                    <div className="relative pl-8 my-6">
                      <div className="absolute -left-[11px] top-1/2 -translate-y-1/2 w-6 h-6 bg-slate-100 rounded-full border-4 border-slate-50 flex items-center justify-center">
                        <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                      </div>
                      <span className="inline-block px-4 py-1.5 bg-slate-100 border border-slate-200 text-sm font-semibold text-slate-600 rounded-full shadow-sm">
                        {currentDay}
                      </span>
                    </div>
                  )}

                  <div className="relative pl-8 group">
                    {/* Timeline dot */}
                    <div className="absolute -left-[9px] top-1.5 w-4 h-4 bg-indigo-500 rounded-full border-4 border-slate-50"></div>
                    
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold uppercase tracking-wider text-indigo-500 bg-indigo-50 px-2 py-1 rounded">
                          Thought
                        </span>
                        <div className="flex items-center gap-3">
                          {editingId !== thought.id && (
                            <>
                              <button
                                onClick={() => startEdit(thought)}
                                className="text-xs text-slate-400 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => deleteThought(thought.id)}
                                className="text-xs text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                Delete
                              </button>
                            </>
                          )}
                          <span className="text-sm text-slate-400 font-medium" title={parseUTCDate(thought.createdAt).toLocaleString()}>
                            {timeAgo(thought.createdAt)}
                          </span>
                        </div>
                      </div>
                      
                      {editingId === thought.id ? (
                        <div className="flex flex-col gap-3">
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="w-full border border-slate-300 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            rows="3"
                            disabled={isSaving}
                            autoFocus
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={cancelEdit}
                              disabled={isSaving}
                              className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded transition"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => saveEdit(thought.id)}
                              disabled={isSaving}
                              className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 transition disabled:opacity-50"
                            >
                              {isSaving ? 'Saving...' : 'Save'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div 
                          className="text-slate-700 text-lg leading-relaxed whitespace-pre-wrap break-words"
                          dangerouslySetInnerHTML={{ __html: linkify(thought.content) }} 
                        />
                      )}
                    </div>
                  </div>
                </Fragment>
              );
            })}
            
            {/* Loading more indicator & sentinel node */}
            <div ref={lastElementRef} className="py-4 flex justify-center">
              {loadingMore && (
                <div className="flex items-center gap-2 text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm font-medium">Loading older thoughts...</span>
                </div>
              )}
              {!hasMore && thoughts.length > 0 && (
                <div className="text-slate-400 text-sm font-medium italic">
                  No more thoughts to load
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
