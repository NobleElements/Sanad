import React, { useState, useEffect } from 'react';
import useBookStore from '../store/useBookStore';
import { Search as SearchIcon, BookOpen as BookOpenIcon, Plus, History, Library, Edit, Trash2, CheckCircle, List, Play, XCircle, LayoutGrid } from 'lucide-react';
import BookModal from '../components/BookModal';
import PlanModal from '../components/PlanModal';
import CachedImage from '../components/CachedImage';

export default function Books() {
  const { books, periods, fetchBooks, fetchPeriods, searchBooks, searchResults, addBook, deleteBook, startReadingPeriod, currentRead, fetchCurrentRead, setPeriodStatus, deletePeriod } = useBookStore();
  
  const [activeTab, setActiveTab] = useState('shelf');
  const [viewMode, setViewMode] = useState('grid');
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  
  const [showBookModal, setShowBookModal] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState(null);

  useEffect(() => {
    fetchCurrentRead();
    fetchBooks();
    fetchPeriods();
  }, [fetchCurrentRead, fetchBooks, fetchPeriods]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setIsSearching(true);
    await searchBooks(query);
    setIsSearching(false);
  };

  const handleAddFromSearch = async (bookResult) => {
    const book = {
      title: bookResult.title,
      author: bookResult.author,
      coverUrl: bookResult.coverUrl,
      totalPages: bookResult.totalPages,
      externalApiId: bookResult.externalApiId
    };
    await addBook(book);
    setActiveTab('shelf');
  };

  const handleSetReading = async (periodId) => {
    await setPeriodStatus(periodId, 'Reading');
  };
  
  const handleStartReading = async (book) => {
    const plans = [{ title: "Chapter 1", startPage: 1, endPage: Math.min(book.totalPages, 50) }];
    await startReadingPeriod(book.id, plans);
  };

  const handleStopReading = async (periodId) => {
    if (window.confirm("Are you sure you want to stop reading this book? Your current session progress will be lost.")) {
      await deletePeriod(periodId);
    }
  };

  const handleDeleteBook = async (bookId) => {
    if (window.confirm("Are you sure you want to delete this book? This will remove reading history too.")) {
      await deleteBook(bookId);
    }
  };

  const openEditBook = (book) => {
    setSelectedBook(book);
    setShowBookModal(true);
  };

  const openNewBook = () => {
    setSelectedBook(null);
    setShowBookModal(true);
  };

  const openPlanModal = (period) => {
    setSelectedPeriod(period);
    setShowPlanModal(true);
  };

  const completedPeriods = periods.filter(p => p.status === 'Completed');
  
  const activePeriodsByBook = {};
  periods.forEach(p => {
    if (p.status === 'Reading' || p.status === 'Paused') {
      activePeriodsByBook[p.bookId] = p;
    }
  });

  return (
    <div className="p-8 w-full overflow-y-auto bg-slate-50 relative">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                <BookOpenIcon className="w-8 h-8 text-indigo-600" />
                Reading Tracker
            </h1>
        </div>
        
        <div className="flex gap-6 mb-8 border-b border-slate-200">
          <button onClick={() => setActiveTab('shelf')} className={`pb-3 font-medium flex items-center gap-2 ${activeTab==='shelf' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}><Library className="w-4 h-4"/> My Shelf</button>
          <button onClick={() => setActiveTab('search')} className={`pb-3 font-medium flex items-center gap-2 ${activeTab==='search' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}><SearchIcon className="w-4 h-4"/> Find Books</button>
          <button onClick={() => setActiveTab('history')} className={`pb-3 font-medium flex items-center gap-2 ${activeTab==='history' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}><History className="w-4 h-4"/> History</button>
        </div>
        
        {activeTab === 'shelf' && (
          <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-slate-800">My Library</h2>
                <div className="flex items-center gap-3">
                    <div className="bg-slate-100 p-1 rounded-lg flex gap-1">
                        <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md transition ${viewMode === 'grid' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`} title="Grid View">
                            <LayoutGrid className="w-4 h-4"/>
                        </button>
                        <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition ${viewMode === 'list' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`} title="List View">
                            <List className="w-4 h-4"/>
                        </button>
                    </div>
                    <button onClick={openAddModal} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition">
                        <Plus className="w-4 h-4"/> Add Book Manually
                    </button>
                </div>
            </div>
            {books.length === 0 ? (
                <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center flex flex-col items-center">
                    <Library className="w-12 h-12 text-slate-300 mb-4"/>
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">Your shelf is empty</h3>
                    <p className="text-slate-500 mb-6">Find books or add them manually to start tracking.</p>
                    <button onClick={() => setActiveTab('search')} className="text-indigo-600 font-medium hover:underline">Go to Find Books →</button>
                </div>
            ) : (
                <div className={viewMode === 'grid' ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6" : "flex flex-col gap-4"}>
                    {books.map(b => {
                        const activePeriod = activePeriodsByBook[b.id];
                        return viewMode === 'grid' ? (
                        <div key={b.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col hover:shadow-lg transition group">
                            <div className="h-48 bg-slate-100 relative">
                                {b.coverUrl ? (
                                    <CachedImage src={b.coverUrl} className="w-full h-full object-cover" alt="cover"/>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-400">No Cover</div>
                                )}
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-4">
                                    <button onClick={() => openEditBook(b)} className="p-2 bg-white/20 hover:bg-white/40 rounded-full text-white backdrop-blur-sm" title="Edit Book"><Edit className="w-5 h-5"/></button>
                                    <button onClick={() => handleDeleteBook(b.id)} className="p-2 bg-red-500/80 hover:bg-red-500 rounded-full text-white backdrop-blur-sm" title="Remove"><Trash2 className="w-5 h-5"/></button>
                                </div>
                            </div>
                            <div className="p-4 flex flex-col flex-1">
                                <h3 className="font-semibold text-sm text-slate-800 mb-1 line-clamp-2" title={b.title}>{b.title}</h3>
                                <p className="text-xs text-slate-500 mb-4">{b.author}</p>
                                
                                <div className="mt-auto">
                                    {activePeriod ? (
                                        <div className="flex flex-col gap-2">
                                            {activePeriod.status === 'Reading' ? (
                                                <span className="text-xs font-medium bg-emerald-100 text-emerald-700 py-1 px-2 rounded text-center">Currently Reading</span>
                                            ) : (
                                                <button onClick={() => handleSetReading(activePeriod.id)} className="text-xs font-medium bg-indigo-50 hover:bg-indigo-100 text-indigo-700 py-1 px-2 rounded text-center transition">Resume Reading</button>
                                            )}
                                            <div className="flex gap-2">
                                                <button onClick={() => openPlanModal(activePeriod)} className="flex-1 text-xs font-medium border border-slate-200 hover:bg-slate-50 text-slate-600 py-1 px-2 rounded text-center transition flex items-center justify-center gap-1">
                                                    <List className="w-3 h-3"/> Edit Plan
                                                </button>
                                                <button onClick={() => handleStopReading(activePeriod.id)} className="text-xs font-medium border border-red-200 hover:bg-red-50 text-red-600 py-1 px-2 rounded text-center transition flex items-center justify-center" title="Stop Reading">
                                                    <XCircle className="w-4 h-4"/>
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button onClick={() => handleStartReading(b)} className="w-full text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white py-1.5 px-2 rounded text-center transition flex items-center justify-center gap-1">
                                            <Play className="w-3 h-3"/> Start Reading
                                        </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        ) : (
                        <div key={b.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden flex items-center p-4 gap-4 hover:shadow-sm transition group">
                            <div className="w-16 h-24 bg-slate-100 shrink-0 rounded overflow-hidden">
                                {b.coverUrl ? (
                                    <CachedImage src={b.coverUrl} className="w-full h-full object-cover" alt="cover"/>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-400 text-[10px]">No Cover</div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-slate-800 truncate">{b.title}</h3>
                                <p className="text-sm text-slate-500 truncate mb-1">{b.author}</p>
                                <p className="text-xs text-slate-400">{b.totalPages} pages</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="w-64 hidden sm:block">
                                    {activePeriod ? (
                                        <div className="flex gap-2">
                                            {activePeriod.status === 'Reading' ? (
                                                <span className="flex-1 text-[10px] sm:text-xs font-medium bg-emerald-100 text-emerald-700 py-2 px-2 rounded text-center flex items-center justify-center">Reading</span>
                                            ) : (
                                                <button onClick={() => handleSetReading(activePeriod.id)} className="flex-1 text-[10px] sm:text-xs font-medium bg-indigo-50 hover:bg-indigo-100 text-indigo-700 py-2 px-2 rounded text-center transition flex items-center justify-center">Resume</button>
                                            )}
                                            <button onClick={() => openPlanModal(activePeriod)} className="flex-1 text-[10px] sm:text-xs font-medium border border-slate-200 hover:bg-slate-50 text-slate-600 py-2 px-2 rounded text-center transition flex items-center justify-center gap-1">
                                                <List className="w-3 h-3"/> Plan
                                            </button>
                                            <button onClick={() => handleStopReading(activePeriod.id)} className="text-xs font-medium border border-red-200 hover:bg-red-50 text-red-600 py-2 px-3 rounded transition flex items-center justify-center" title="Stop Reading">
                                                <XCircle className="w-4 h-4"/>
                                            </button>
                                        </div>
                                    ) : (
                                        <button onClick={() => handleStartReading(b)} className="w-full text-[10px] sm:text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded transition flex items-center justify-center gap-1">
                                            <Play className="w-3 h-3"/> Start Reading
                                        </button>
                                    )}
                                </div>
                                <div className="flex gap-2 border-l pl-4 border-slate-100">
                                    <button onClick={() => openEditBook(b)} className="p-2 text-slate-400 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 rounded transition" title="Edit Metadata">
                                        <Edit className="w-4 h-4"/>
                                    </button>
                                    <button onClick={() => handleDeleteBook(b.id)} className="p-2 text-slate-400 hover:text-red-600 bg-slate-50 hover:bg-red-50 rounded transition" title="Delete Book">
                                        <Trash2 className="w-4 h-4"/>
                                    </button>
                                </div>
                            </div>
                        </div>
                        );
                    })}
                </div>
            )}
          </div>
        )}

        {activeTab === 'search' && (
            <div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-8">
                    <h2 className="text-lg font-semibold mb-4 text-slate-800">Find a Book</h2>
                    <form onSubmit={handleSearch} className="flex gap-4">
                        <div className="relative flex-1">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <SearchIcon className="h-5 w-5 text-slate-400" />
                            </div>
                            <input 
                                className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 text-slate-900"
                                placeholder="Search OpenLibrary or Google Books..."
                                value={query} 
                                onChange={e => setQuery(e.target.value)} 
                            />
                        </div>
                        <button type="submit" disabled={isSearching} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-2.5 rounded-xl transition font-medium flex items-center gap-2 disabled:opacity-50">
                            {isSearching ? 'Searching...' : 'Search'}
                        </button>
                    </form>
                </div>

                {searchResults.length > 0 && (
                    <div>
                        <h2 className="text-xl font-semibold mb-6 text-slate-800">Search Results</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                            {searchResults.map((b, i) => (
                            <div key={i} className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col items-center hover:shadow-md transition relative">
                                {b.source && (
                                    <span className="absolute top-2 right-2 text-[10px] uppercase tracking-wider font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded">
                                        {b.source}
                                    </span>
                                )}
                                {b.coverUrl ? (
                                    <CachedImage src={b.coverUrl} className="w-full h-48 object-cover mb-4 rounded-lg shadow-sm" alt="cover"/>
                                ) : (
                                    <div className="w-full h-48 bg-slate-100 mb-4 rounded-lg flex items-center justify-center text-slate-400 border border-slate-200 text-sm">
                                        No Cover
                                    </div>
                                )}
                                <h3 className="font-semibold text-center text-sm text-slate-800 mb-1 line-clamp-2">{b.title}</h3>
                                <p className="text-xs text-slate-500 text-center mb-4">{b.author}</p>
                                <button onClick={() => handleAddFromSearch(b)} className="mt-auto w-full py-2 bg-slate-100 hover:bg-indigo-50 text-indigo-600 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2">
                                    <Plus className="w-4 h-4"/> Add to Shelf
                                </button>
                            </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        )}

        {activeTab === 'history' && (
            <div>
                <h2 className="text-xl font-semibold mb-6 text-slate-800">Reading History</h2>
                {completedPeriods.length === 0 ? (
                    <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center flex flex-col items-center">
                        <CheckCircle className="w-12 h-12 text-slate-300 mb-4"/>
                        <h3 className="text-lg font-semibold text-slate-700 mb-2">No completed books yet</h3>
                        <p className="text-slate-500">Your finished books will appear here.</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        {completedPeriods.map(p => (
                            <div key={p.id} className="bg-white border border-slate-200 p-4 rounded-xl flex items-center gap-4 shadow-sm">
                                {p.book.coverUrl ? (
                                    <CachedImage src={p.book.coverUrl} className="w-16 h-24 object-cover rounded shadow-sm" alt="cover"/>
                                ) : (
                                    <div className="w-16 h-24 bg-slate-100 rounded flex items-center justify-center text-slate-400 text-xs">No Cover</div>
                                )}
                                <div className="flex-1">
                                    <h3 className="font-semibold text-lg text-slate-800">{p.book.title}</h3>
                                    <p className="text-sm text-slate-500 mb-2">{p.book.author} • {p.book.totalPages} pages</p>
                                    <p className="text-xs text-slate-400">
                                        Started: {new Date(p.startDate).toLocaleDateString()} — Finished: {p.endDate ? new Date(p.endDate).toLocaleDateString() : 'N/A'}
                                    </p>
                                </div>
                                <div className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg font-medium flex items-center gap-2">
                                    <CheckCircle className="w-5 h-5"/> Completed
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )}
      </div>

      {showBookModal && <BookModal book={selectedBook} onClose={() => setShowBookModal(false)} />}
      {showPlanModal && <PlanModal period={selectedPeriod} onClose={() => setShowPlanModal(false)} />}
    </div>
  );
}
