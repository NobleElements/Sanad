import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import TipTapEditor from '../components/TipTapEditor';
import { Plus, Search, FolderOpen, FileText, Trash2, Pencil, X, Check, BookOpen } from 'lucide-react';

import { API_URL, API_BASE } from '../config';

function timeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now - date) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

export default function Notebook() {
  const { noteId: urlNoteId } = useParams();
  const navigate = useNavigate();

  // Data state
  const [notebooks, setNotebooks] = useState([]);
  const [notes, setNotes] = useState([]);
  const [selectedNotebookId, setSelectedNotebookId] = useState(null);
  const [selectedNote, setSelectedNote] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);

  // UI state
  const [isCreatingNotebook, setIsCreatingNotebook] = useState(false);
  const [newNotebookName, setNewNotebookName] = useState('');
  const [editingNotebookId, setEditingNotebookId] = useState(null);
  const [editingNotebookName, setEditingNotebookName] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);

  const saveTimerRef = useRef(null);
  const newNotebookInputRef = useRef(null);

  // --- Data fetching ---

  const loadNotebooks = async () => {
    try {
      const res = await fetch(`${API_URL}/notebooks`);
      if (res.ok) return await res.json();
    } catch (e) { console.error('Failed to load notebooks:', e); }
    return [];
  };

  const loadNotes = async (notebookId) => {
    try {
      const res = await fetch(`${API_URL}/notebooks/${notebookId}/notes`);
      if (res.ok) setNotes(await res.json());
    } catch (e) { console.error('Failed to load notes:', e); }
  };

  const loadNote = async (noteId) => {
    try {
      const res = await fetch(`${API_URL}/notes/${noteId}`);
      if (res.ok) {
        const note = await res.json();
        setSelectedNote(note);
        setNoteTitle(note.title);
        setNoteContent(note.content || '');
        return note;
      }
    } catch (e) { console.error('Failed to load note:', e); }
    return null;
  };

  // --- Initialization: load notebooks, then open note from URL or latest ---

  const initDone = useRef(false);

  useEffect(() => {
    const init = async () => {
      const nbs = await loadNotebooks();
      setNotebooks(nbs);

      let targetNoteId = urlNoteId;

      // If no note in URL, try to get the latest
      if (!targetNoteId) {
        try {
          const res = await fetch(`${API_URL}/notes/latest`);
          if (res.ok && res.status !== 204) {
            const latest = await res.json();
            targetNoteId = latest.id;
            // Redirect to URL with note ID (replace so back button works)
            navigate(`/notebook/${latest.id}`, { replace: true });
          }
        } catch (e) { console.error('Failed to load latest note:', e); }
      }

      // Load the target note and select its notebook
      if (targetNoteId) {
        const note = await loadNote(targetNoteId);
        if (note) {
          setSelectedNotebookId(note.notebookId);
          loadNotes(note.notebookId);
        }
      }

      initDone.current = true;
    };
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // When URL noteId changes after init (e.g. browser back/forward)
  useEffect(() => {
    if (!initDone.current || !urlNoteId) return;
    // Only reload if it's a different note
    if (selectedNote?.id !== urlNoteId) {
      loadNote(urlNoteId).then(note => {
        if (note && note.notebookId !== selectedNotebookId) {
          setSelectedNotebookId(note.notebookId);
          loadNotes(note.notebookId);
        }
      });
    }
  }, [urlNoteId]); // eslint-disable-line react-hooks/exhaustive-deps

  // When user clicks a different notebook in the sidebar
  const switchNotebook = (notebookId) => {
    if (notebookId === selectedNotebookId) return;
    setSelectedNotebookId(notebookId);
    setSelectedNote(null);
    setNoteTitle('');
    setNoteContent('');
    navigate('/notebook');
    loadNotes(notebookId);
  };

  // --- Search ---

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${API_URL}/notes/search?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) setSearchResults(await res.json());
      } catch (e) { console.error('Search failed:', e); }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // --- Auto-save ---

  const saveNote = useCallback(async (title, content) => {
    if (!selectedNote) return;
    setIsSaving(true);
    try {
      const res = await fetch(`${API_URL}/notes/${selectedNote.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content }),
      });
      if (res.ok) {
        setLastSaved(new Date());
        setNotes(prev => prev.map(n =>
          n.id === selectedNote.id ? { ...n, title, updatedAt: new Date().toISOString() } : n
        ));
      }
    } catch (e) { console.error('Failed to save note:', e); }
    finally { setIsSaving(false); }
  }, [selectedNote]);

  const debouncedSave = useCallback((title, content) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveNote(title, content), 1000);
  }, [saveNote]);

  const handleTitleChange = (newTitle) => {
    setNoteTitle(newTitle);
    debouncedSave(newTitle, noteContent);
  };

  const handleContentChange = (newContent) => {
    setNoteContent(newContent);
    debouncedSave(noteTitle, newContent);
  };

  // --- Notebook CRUD ---

  const createNotebook = async () => {
    if (!newNotebookName.trim()) return;
    try {
      const res = await fetch(`${API_URL}/notebooks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newNotebookName.trim() }),
      });
      if (res.ok) {
        const nb = await res.json();
        setNotebooks(prev => [...prev, nb]);
        switchNotebook(nb.id);
        setNewNotebookName('');
        setIsCreatingNotebook(false);
      }
    } catch (e) { console.error('Failed to create notebook:', e); }
  };

  const renameNotebook = async (id) => {
    if (!editingNotebookName.trim()) return;
    try {
      const res = await fetch(`${API_URL}/notebooks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingNotebookName.trim() }),
      });
      if (res.ok) {
        const updated = await res.json();
        setNotebooks(prev => prev.map(nb => nb.id === id ? updated : nb));
        setEditingNotebookId(null);
      }
    } catch (e) { console.error('Failed to rename notebook:', e); }
  };

  const deleteNotebook = async (id) => {
    if (!confirm('Delete this notebook and all its notes?')) return;
    try {
      const res = await fetch(`${API_URL}/notebooks/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setNotebooks(prev => prev.filter(nb => nb.id !== id));
        if (selectedNotebookId === id) {
          setSelectedNotebookId(null);
          setSelectedNote(null);
          setNotes([]);
          navigate('/notebook');
        }
      }
    } catch (e) { console.error('Failed to delete notebook:', e); }
  };

  // --- Note CRUD ---

  const createNote = async () => {
    if (!selectedNotebookId) return;
    try {
      const res = await fetch(`${API_URL}/notebooks/${selectedNotebookId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Untitled Note' }),
      });
      if (res.ok) {
        const note = await res.json();
        setNotes(prev => [{ id: note.id, title: note.title, notebookId: note.notebookId, createdAt: note.createdAt, updatedAt: note.updatedAt }, ...prev]);
        navigate(`/notebook/${note.id}`);
        loadNote(note.id);
      }
    } catch (e) { console.error('Failed to create note:', e); }
  };

  const deleteNote = async (id) => {
    try {
      const res = await fetch(`${API_URL}/notes/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setNotes(prev => prev.filter(n => n.id !== id));
        if (selectedNote?.id === id) {
          setSelectedNote(null);
          setNoteTitle('');
          setNoteContent('');
          navigate('/notebook');
        }
      }
    } catch (e) { console.error('Failed to delete note:', e); }
  };

  // --- Image upload ---

  const handleImageUpload = async (file) => {
    if (!selectedNote) return null;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`${API_URL}/notes/${selectedNote.id}/images`, {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        return `${API_BASE}${data.url}`;
      }
    } catch (e) { console.error('Failed to upload image:', e); }
    return null;
  };

  // Focus input when creating notebook
  useEffect(() => {
    if (isCreatingNotebook && newNotebookInputRef.current) {
      newNotebookInputRef.current.focus();
    }
  }, [isCreatingNotebook]);

  const displayedNotes = searchResults !== null ? searchResults : notes;

  return (
    <div className="flex-1 flex h-full overflow-hidden">
      {/* Sidebar */}
      <div className="w-[260px] bg-white border-r border-slate-200 flex flex-col flex-shrink-0">
        {/* Search */}
        <div className="p-3 border-b border-slate-200">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search all notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Notebooks */}
        {searchResults === null && (
          <div className="p-3 border-b border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Notebooks</h3>
              <button
                onClick={() => setIsCreatingNotebook(true)}
                className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-indigo-600 transition-colors"
                title="New Notebook"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* New notebook input */}
            {isCreatingNotebook && (
              <div className="flex items-center gap-1 mb-1">
                <input
                  ref={newNotebookInputRef}
                  type="text"
                  value={newNotebookName}
                  onChange={(e) => setNewNotebookName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') createNotebook();
                    if (e.key === 'Escape') { setIsCreatingNotebook(false); setNewNotebookName(''); }
                  }}
                  placeholder="Notebook name..."
                  className="flex-1 text-sm border border-slate-200 rounded px-2 py-1 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <button onClick={createNotebook} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"><Check className="w-3.5 h-3.5" /></button>
                <button onClick={() => { setIsCreatingNotebook(false); setNewNotebookName(''); }} className="p-1 text-slate-400 hover:bg-slate-100 rounded"><X className="w-3.5 h-3.5" /></button>
              </div>
            )}

            {/* Notebook list */}
            <div className="flex flex-col gap-0.5 max-h-[200px] overflow-y-auto">
              {notebooks.length === 0 && !isCreatingNotebook && (
                <p className="text-xs text-slate-400 italic py-1">No notebooks yet</p>
              )}
              {notebooks.map(nb => (
                <div
                  key={nb.id}
                  className={`group flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors text-sm ${
                    selectedNotebookId === nb.id
                      ? 'bg-indigo-50 text-indigo-700 font-medium'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                  onClick={() => switchNotebook(nb.id)}
                >
                  <FolderOpen className="w-4 h-4 flex-shrink-0 opacity-60" />
                  {editingNotebookId === nb.id ? (
                    <input
                      type="text"
                      value={editingNotebookName}
                      onChange={(e) => setEditingNotebookName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') renameNotebook(nb.id);
                        if (e.key === 'Escape') setEditingNotebookId(null);
                      }}
                      onBlur={() => renameNotebook(nb.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 text-sm border border-indigo-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      autoFocus
                    />
                  ) : (
                    <span className="flex-1 truncate">{nb.name}</span>
                  )}
                  <div className="hidden group-hover:flex items-center gap-0.5 flex-shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingNotebookId(nb.id); setEditingNotebookName(nb.name); }}
                      className="p-0.5 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteNotebook(nb.id); }}
                      className="p-0.5 rounded hover:bg-red-100 text-slate-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes list */}
        <div className="flex-1 overflow-y-auto p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {searchResults !== null ? `Results (${searchResults.length})` : 'Notes'}
            </h3>
            {searchResults === null && selectedNotebookId && (
              <button
                onClick={createNote}
                className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-indigo-600 transition-colors"
                title="New Note"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="flex flex-col gap-0.5">
            {displayedNotes.length === 0 && (
              <p className="text-xs text-slate-400 italic py-1">
                {searchResults !== null ? 'No results found' : selectedNotebookId ? 'No notes yet' : 'Select a notebook'}
              </p>
            )}
            {displayedNotes.map(note => (
              <div
                key={note.id}
                className={`group flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer transition-colors text-sm ${
                  selectedNote?.id === note.id
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
                onClick={() => {
                  navigate(`/notebook/${note.id}`);
                  loadNote(note.id);
                  if (searchResults !== null) {
                    setSelectedNotebookId(note.notebookId);
                    loadNotes(note.notebookId);
                    setSearchQuery('');
                  }
                }}
              >
                <FileText className="w-4 h-4 flex-shrink-0 opacity-60" />
                <div className="flex-1 min-w-0">
                  <div className="truncate font-medium">{note.title || 'Untitled'}</div>
                  <div className="text-xs text-slate-400">{timeAgo(note.updatedAt)}</div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }}
                  className="hidden group-hover:block p-0.5 rounded hover:bg-red-100 text-slate-400 hover:text-red-600 transition-colors flex-shrink-0"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main editor area */}
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
        {selectedNote ? (
          <>
            {/* Title bar */}
            <div className="px-8 pt-8 pb-2">
              <input
                type="text"
                value={noteTitle}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="w-full text-3xl font-bold text-slate-900 bg-transparent border-none outline-none placeholder-slate-300"
                placeholder="Note title..."
              />
              <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                <span>{isSaving ? 'Saving...' : lastSaved ? `Last saved ${timeAgo(lastSaved.toISOString())}` : `Edited ${timeAgo(selectedNote.updatedAt)}`}</span>
              </div>
            </div>

            {/* Editor */}
            <div className="flex-1 overflow-y-auto px-8 pb-8">
              <TipTapEditor
                content={noteContent}
                onChange={handleContentChange}
                onImageUpload={handleImageUpload}
              />
            </div>
          </>
        ) : (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <BookOpen className="w-16 h-16 mb-4 opacity-30" />
            <h2 className="text-xl font-semibold text-slate-500 mb-2">
              {notebooks.length === 0 ? 'Create your first notebook' : selectedNotebookId ? 'Create or select a note' : 'Select a notebook'}
            </h2>
            <p className="text-sm">
              {notebooks.length === 0
                ? 'Click the + button in the sidebar to get started.'
                : selectedNotebookId
                ? 'Click + next to Notes to create a new note.'
                : 'Choose a notebook from the sidebar to view its notes.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
