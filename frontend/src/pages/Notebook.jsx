import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import TipTapEditor from '../components/TipTapEditor';
import { Plus, Search, FolderOpen, FileText, Trash2, Pencil, X, Check, BookOpen, ArrowUp, ArrowDown, ListFilter } from 'lucide-react';
import useNotebookStore from '../store/useNotebookStore';
import useConfirmStore from '../store/useConfirmStore';
import { timeAgo } from '../utils/dateUtils';
import usePageTitle from '../hooks/usePageTitle';
import { extractImagesFromHtml, deleteImages } from '../utils/imageUtils';

export default function Notebook() {
  usePageTitle('Notebook');
  const { noteId: urlNoteId } = useParams();
  const navigate = useNavigate();

  // Store state and actions
  const {
    notebooks, notes, selectedNotebookId, selectedNote, searchResults,
    fetchNotebooks, fetchNotes, fetchNote, fetchLatestNote,
    setSelectedNotebookId, setSelectedNote, setSearchResults,
    searchNotes, createNotebook: storeCreateNotebook,
    renameNotebook: storeRenameNotebook, deleteNotebook: storeDeleteNotebook,
    createNote: storeCreateNote, updateNote, deleteNote: storeDeleteNote, uploadImage
  } = useNotebookStore();
  const { showConfirm } = useConfirmStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [notebookSortBy, setNotebookSortBy] = useState('editDate');
  const [notebookSortDir, setNotebookSortDir] = useState('desc');
  const [noteSortBy, setNoteSortBy] = useState('editDate');
  const [noteSortDir, setNoteSortDir] = useState('desc');

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
  const uploadedSessionImagesRef = useRef([]);
  const initialImagesRef = useRef([]);
  const isSavingRef = useRef(false);
  const isInitializingRef = useRef(false);



  // --- Initialization: load notebooks, then open note from URL or latest ---

  const initDone = useRef(false);

  useEffect(() => {
    const init = async () => {
      await fetchNotebooks();

      let targetNoteId = urlNoteId;

      // If no note in URL, try to get the latest
      if (!targetNoteId) {
        const latest = await fetchLatestNote();
        if (latest) {
          targetNoteId = latest.id;
          navigate(`/notebook/${latest.id}`, { replace: true });
        }
      }

      // Load the target note and select its notebook
      if (targetNoteId) {
        const note = await fetchNote(targetNoteId);
        if (note) {
          isInitializingRef.current = true;
          setSelectedNotebookId(note.notebookId);
          fetchNotes(note.notebookId);
          setNoteTitle(note.title);
          setNoteContent(note.content || '');
          initialImagesRef.current = extractImagesFromHtml(note.content || '');
          uploadedSessionImagesRef.current = [];
          setTimeout(() => { isInitializingRef.current = false; }, 500);
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
      fetchNote(urlNoteId).then(note => {
        if (note) {
          isInitializingRef.current = true;
          setNoteTitle(note.title);
          setNoteContent(note.content || '');
          initialImagesRef.current = extractImagesFromHtml(note.content || '');
          uploadedSessionImagesRef.current = [];
          if (note.notebookId !== selectedNotebookId) {
            setSelectedNotebookId(note.notebookId);
            fetchNotes(note.notebookId);
          }
          setTimeout(() => { isInitializingRef.current = false; }, 500);
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
    initialImagesRef.current = [];
    uploadedSessionImagesRef.current = [];
    navigate('/notebook');
    fetchNotes(notebookId);
  };

  // --- Search ---

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    const timer = setTimeout(async () => {
      await searchNotes(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // --- Auto-save ---

  const saveNote = useCallback(async (title, content, currentNoteId) => {
    const idToSave = currentNoteId || selectedNote?.id;
    if (!idToSave) return;
    setIsSaving(true);
    isSavingRef.current = true;
    const success = await updateNote(idToSave, title, content);
    if (success) {
      setLastSaved(new Date());
      
      // Image cleanup
      const finalImages = extractImagesFromHtml(content);
      const toDelete = [...new Set([...initialImagesRef.current, ...uploadedSessionImagesRef.current])].filter(url => !finalImages.includes(url));
      
      await deleteImages(toDelete);
      
      // Update refs to reflect current state
      initialImagesRef.current = finalImages;
      uploadedSessionImagesRef.current = [];
    }
    setIsSaving(false);
    isSavingRef.current = false;
  }, [selectedNote, updateNote]);

  const debouncedSave = useCallback((title, content, noteId) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveNote(title, content, noteId), 1000);
  }, [saveNote]);

  const handleTitleChange = (newTitle) => {
    setNoteTitle(newTitle);
    if (isInitializingRef.current) return;
    debouncedSave(newTitle, noteContent, selectedNote?.id);
  };

  const handleContentChange = (newContent) => {
    if (newContent === noteContent) return;
    setNoteContent(newContent);
    if (isInitializingRef.current) return;
    debouncedSave(noteTitle, newContent, selectedNote?.id);
  };

  // --- Notebook CRUD ---

  const createNotebook = async () => {
    if (!newNotebookName.trim()) return;
    const nb = await storeCreateNotebook(newNotebookName);
    if (nb) {
      switchNotebook(nb.id);
      setNewNotebookName('');
      setIsCreatingNotebook(false);
    }
  };

  const renameNotebook = async (id) => {
    if (!editingNotebookName.trim()) return;
    const success = await storeRenameNotebook(id, editingNotebookName);
    if (success) {
      setEditingNotebookId(null);
    }
  };

  const deleteNotebook = async (id) => {
    showConfirm({
      title: 'Delete Notebook',
      message: 'Delete this notebook and all its notes?',
      confirmText: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        const success = await storeDeleteNotebook(id);
        if (success && selectedNotebookId === id) {
          setSelectedNotebookId(null);
          setSelectedNote(null);
          navigate('/notebook');
        }
      }
    });
  };

  // --- Note CRUD ---

  const createNote = async () => {
    if (!selectedNotebookId) return;
    const note = await storeCreateNote(selectedNotebookId);
    if (note) {
      navigate(`/notebook/${note.id}`);
      fetchNote(note.id).then(fetchedNote => {
        if (fetchedNote) {
          isInitializingRef.current = true;
          setNoteTitle(fetchedNote.title);
          setNoteContent(fetchedNote.content || '');
          initialImagesRef.current = extractImagesFromHtml(fetchedNote.content || '');
          uploadedSessionImagesRef.current = [];
          setTimeout(() => { isInitializingRef.current = false; }, 500);
        }
      });
    }
  };

  const deleteNote = async (id) => {
    const success = await storeDeleteNote(id);
    if (success && selectedNote?.id === id) {
      setSelectedNote(null);
      setNoteTitle('');
      setNoteContent('');
      initialImagesRef.current = [];
      uploadedSessionImagesRef.current = [];
      navigate('/notebook');
    }
  };

  // --- Image upload ---

  const handleImageUpload = async (file) => {
    if (!selectedNote) return null;
    const url = await uploadImage(selectedNote.id, file);
    if (url) uploadedSessionImagesRef.current.push(url);
    return url;
  };

  // Cleanup unsaved images on unmount or page refresh/close
  useEffect(() => {
    const cleanupUnsavedImages = () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      if (!isSavingRef.current && uploadedSessionImagesRef.current && uploadedSessionImagesRef.current.length > 0) {
        deleteImages(uploadedSessionImagesRef.current, true).catch(() => {});
      }
      uploadedSessionImagesRef.current = [];
      initialImagesRef.current = [];
    };

    window.addEventListener('beforeunload', cleanupUnsavedImages);

    return () => {
      window.removeEventListener('beforeunload', cleanupUnsavedImages);
      cleanupUnsavedImages();
    };
  }, [selectedNote?.id]);

  // Focus input when creating notebook
  useEffect(() => {
    if (isCreatingNotebook && newNotebookInputRef.current) {
      newNotebookInputRef.current.focus();
    }
  }, [isCreatingNotebook]);

  const getNotebookEditDate = (nb) => {
    if (!nb.notes || nb.notes.length === 0) return new Date(nb.createdAt || 0).getTime();
    return Math.max(...nb.notes.map(n => new Date(n.updatedAt).getTime()));
  };

  const sortedNotebooks = [...notebooks].sort((a, b) => {
    let cmp = 0;
    if (notebookSortBy === 'createDate') cmp = new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
    else if (notebookSortBy === 'title') cmp = (a.name || '').localeCompare(b.name || '');
    else cmp = getNotebookEditDate(a) - getNotebookEditDate(b);
    return notebookSortDir === 'desc' ? -cmp : cmp;
  });

  const displayedNotes = searchResults !== null ? searchResults : notes;
  
  const sortedNotes = [...displayedNotes].sort((a, b) => {
    let cmp = 0;
    if (noteSortBy === 'createDate') cmp = new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
    else if (noteSortBy === 'title') cmp = (a.title || '').localeCompare(b.title || '');
    else cmp = new Date(a.updatedAt || 0).getTime() - new Date(b.updatedAt || 0).getTime();
    return noteSortDir === 'desc' ? -cmp : cmp;
  });

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden">
      {/* Sidebar */}
      <div className="w-full md:w-[260px] h-[40%] md:h-full bg-white dark:bg-slate-800 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-700 flex flex-col flex-shrink-0">
        {/* Search */}
        <div className="p-3 border-b border-slate-200 dark:border-slate-700 dark:bg-slate-700 dark:text-slate-100">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Search all notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50 dark:bg-slate-900 dark:text-slate-100"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-400 dark:text-slate-500"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Notebooks */}
        {searchResults === null && (
          <div className="p-3 border-b border-slate-200 dark:border-slate-700 dark:bg-slate-700 dark:text-slate-100">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Notebooks</h3>
                <div className="flex items-center gap-0.5">
                  <div className="relative p-1 hover:bg-slate-100 dark:hover:bg-slate-600 rounded text-slate-400 dark:text-slate-500 transition-colors cursor-pointer" title="Sort by">
                    <ListFilter className="w-3.5 h-3.5" />
                    <select
                      value={notebookSortBy}
                      onChange={(e) => setNotebookSortBy(e.target.value)}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    >
                      <option value="editDate">Edit Date</option>
                      <option value="createDate">Create Date</option>
                      <option value="title">Name</option>
                    </select>
                  </div>
                  <button
                    onClick={() => setNotebookSortDir(prev => prev === 'asc' ? 'desc' : 'asc')}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-600 rounded text-slate-400 dark:text-slate-500 transition-colors"
                    title={notebookSortDir === 'asc' ? 'Ascending' : 'Descending'}
                  >
                    {notebookSortDir === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <button
                onClick={() => setIsCreatingNotebook(true)}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-400 transition-colors"
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
                  className="flex-1 text-sm border border-slate-200 dark:border-slate-700 rounded px-2 py-1 focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:bg-slate-700 dark:text-slate-100"
                />
                <button onClick={createNotebook} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"><Check className="w-3.5 h-3.5" /></button>
                <button onClick={() => { setIsCreatingNotebook(false); setNewNotebookName(''); }} className="p-1 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"><X className="w-3.5 h-3.5" /></button>
              </div>
            )}

            {/* Notebook list */}
            <div className="flex flex-col gap-0.5 max-h-[200px] overflow-y-auto">
              {notebooks.length === 0 && !isCreatingNotebook && (
                <p className="text-xs text-slate-400 dark:text-slate-500 italic py-1">No notebooks yet</p>
              )}
              {sortedNotebooks.map(nb => (
                <div
                  key={nb.id}
                  className={`group flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors text-sm ${
                    selectedNotebookId === nb.id
                      ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-medium'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:bg-slate-900'
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
                      className="flex-1 text-sm border border-indigo-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:bg-slate-700 dark:text-slate-100"
                      autoFocus
                    />
                  ) : (
                    <span className="flex-1 truncate">{nb.name}</span>
                  )}
                  <div className="hidden group-hover:flex items-center gap-0.5 flex-shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingNotebookId(nb.id); setEditingNotebookName(nb.name); }}
                      className="p-0.5 rounded hover:bg-slate-200 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-400 dark:text-slate-500 transition-colors"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteNotebook(nb.id); }}
                      className="p-0.5 rounded hover:bg-red-100 text-slate-400 dark:text-slate-500 hover:text-red-600 transition-colors"
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
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {searchResults !== null ? `Results (${searchResults.length})` : 'Notes'}
              </h3>
              <div className="flex items-center gap-0.5">
                <div className="relative p-1 hover:bg-slate-100 dark:hover:bg-slate-600 rounded text-slate-400 dark:text-slate-500 transition-colors cursor-pointer" title="Sort by">
                  <ListFilter className="w-3.5 h-3.5" />
                  <select
                    value={noteSortBy}
                    onChange={(e) => setNoteSortBy(e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  >
                    <option value="editDate">Edit Date</option>
                    <option value="createDate">Create Date</option>
                    <option value="title">Title</option>
                  </select>
                </div>
                <button
                  onClick={() => setNoteSortDir(prev => prev === 'asc' ? 'desc' : 'asc')}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-600 rounded text-slate-400 dark:text-slate-500 transition-colors"
                  title={noteSortDir === 'asc' ? 'Ascending' : 'Descending'}
                >
                  {noteSortDir === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            {searchResults === null && selectedNotebookId && (
              <button
                onClick={createNote}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-400 transition-colors"
                title="New Note"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="flex flex-col gap-0.5">
            {displayedNotes.length === 0 && (
              <p className="text-xs text-slate-400 dark:text-slate-500 italic py-1">
                {searchResults !== null ? 'No results found' : selectedNotebookId ? 'No notes yet' : 'Select a notebook'}
              </p>
            )}
            {sortedNotes.map(note => (
              <div
                key={note.id}
                className={`group flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer transition-colors text-sm ${
                  selectedNote?.id === note.id
                    ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:bg-slate-900'
                }`}
                onClick={() => {
                  if (selectedNote?.id === note.id) return;
                  
                  navigate(`/notebook/${note.id}`);
                  fetchNote(note.id).then(fetchedNote => {
                    if (fetchedNote) {
                      isInitializingRef.current = true;
                      setNoteTitle(fetchedNote.title);
                      setNoteContent(fetchedNote.content || '');
                      initialImagesRef.current = extractImagesFromHtml(fetchedNote.content || '');
                      uploadedSessionImagesRef.current = [];
                      setTimeout(() => { isInitializingRef.current = false; }, 500);
                    }
                  });
                  if (searchResults !== null) {
                    setSelectedNotebookId(note.notebookId);
                    fetchNotes(note.notebookId);
                    setSearchQuery('');
                  }
                }}
              >
                <FileText className="w-4 h-4 flex-shrink-0 opacity-60" />
                <div className="flex-1 min-w-0">
                  <div className="truncate font-medium">{note.title || 'Untitled'}</div>
                  <div className="text-xs text-slate-400 dark:text-slate-500">{timeAgo(note.updatedAt)}</div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }}
                  className="hidden group-hover:block p-0.5 rounded hover:bg-red-100 text-slate-400 dark:text-slate-500 hover:text-red-600 transition-colors flex-shrink-0"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main editor area */}
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-900">
        {selectedNote ? (
          <>
            {/* Title bar */}
            <div className="px-8 pt-8 pb-2">
              <input
                type="text"
                value={noteTitle}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="w-full text-3xl font-bold text-slate-900 dark:text-slate-100 bg-transparent border-none outline-none placeholder-slate-300"
                placeholder="Note title..."
              />
              <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 dark:text-slate-500">
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
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
            <BookOpen className="w-16 h-16 mb-4 opacity-30" />
            <h2 className="text-xl font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 mb-2">
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
