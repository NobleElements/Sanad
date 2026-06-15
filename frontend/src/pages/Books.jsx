import React, { useState, useEffect } from 'react';
import useBookStore from '../store/useBookStore';
import { Search as SearchIcon, BookOpen as BookOpenIcon, Plus, History, Library, Edit, Trash2, CheckCircle, List, Play, XCircle, LayoutGrid, Circle } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import BookModal from '../components/BookModal';
import PlanModal from '../components/PlanModal';
import LogModal from '../components/LogModal';
import CachedImage from '../components/CachedImage';
import usePageTitle from '../hooks/usePageTitle';

export default function Books() {
  usePageTitle('Reading');
  const { books, periods, fetchBooks, fetchPeriods, searchBooks, searchResults, addBook, deleteBook, startReadingPeriod, currentRead, fetchCurrentRead, setPeriodStatus, deletePeriod } = useBookStore();
  
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'shelf';
  
  const handleTabChange = (tab) => {
      setSearchParams({ tab }, { replace: true });
  };

  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('sanad_books_viewMode') || 'grid';
  });
  const [shelfSearch, setShelfSearch] = useState('');
  const [shelfSort, setShelfSort] = useState('addedDesc');

  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  
  const [showBookModal, setShowBookModal] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState(null);

  const [showLogModal, setShowLogModal] = useState(false);
  const [logPeriod, setLogPeriod] = useState(null);

  const [expandedHistory, setExpandedHistory] = useState({});

  useEffect(() => {
    localStorage.setItem('sanad_books_viewMode', viewMode);
  }, [viewMode]);

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
    handleTabChange('shelf');
  };

  const handleSetReading = async (periodId) => {
    await setPeriodStatus(periodId, 'Reading');
  };
  
  const handleStartReading = async (book) => {
    const previousPeriods = periods.filter(p => p.bookId === book.id && p.plans && p.plans.length > 0);
    
    let plans = [];
    if (previousPeriods.length > 0) {
      const mostRecent = previousPeriods.sort((a,b) => new Date(b.startDate) - new Date(a.startDate))[0];
      plans = mostRecent.plans.map(p => ({
        title: p.title,
        startPage: p.startPage,
        endPage: p.endPage,
        orderIndex: p.orderIndex
      }));
    } else {
      plans = [{ title: "Chapter 1", startPage: 1, endPage: Math.min(book.totalPages, 50) }];
    }

    await startReadingPeriod(book.id, plans);
  };

  const handleStopReading = async (periodId) => {
    if (window.confirm("Are you sure you want to stop reading this book? Your progress and logs will be saved.")) {
      await setPeriodStatus(periodId, 'Stopped');
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

  const openLogModal = (period) => {
    setLogPeriod(period);
    setShowLogModal(true);
  };

  const toggleHistory = (id) => {
      setExpandedHistory(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const historyPeriods = periods.filter(p => p.status === 'Completed' || p.status === 'Stopped' || (p.logs && p.logs.length > 0));
  
  const latestPeriodByBook = {};
  periods.forEach(p => {
    if (!latestPeriodByBook[p.bookId]) {
      latestPeriodByBook[p.bookId] = p;
    }
  });

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-slate-50 relative">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                <BookOpenIcon className="w-8 h-8 text-indigo-600" />
                Reading Tracker
            </h1>
        </div>
        
        <div className="flex gap-6 mb-8 border-b border-slate-200">
          <button onClick={() => handleTabChange('shelf')} className={`pb-3 font-medium flex items-center gap-2 ${activeTab==='shelf' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}><Library className="w-4 h-4"/> My Shelf</button>
          <button onClick={() => handleTabChange('search')} className={`pb-3 font-medium flex items-center gap-2 ${activeTab==='search' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}><SearchIcon className="w-4 h-4"/> Find Books</button>
          <button onClick={() => handleTabChange('history')} className={`pb-3 font-medium flex items-center gap-2 ${activeTab==='history' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}><History className="w-4 h-4"/> History</button>
        </div>
        
        {activeTab === 'shelf' && (
          <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <h2 className="text-xl font-semibold text-slate-800">My Library</h2>
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <div className="relative">
                        <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search library..."
                            value={shelfSearch}
                            onChange={(e) => setShelfSearch(e.target.value)}
                            className="pl-9 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none w-48"
                        />
                    </div>
                    <select
                        value={shelfSort}
                        onChange={(e) => setShelfSort(e.target.value)}
                        className="py-1.5 pl-3 pr-8 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    >
                        <option value="addedDesc">Latest</option>
                        <option value="addedAsc">Oldest</option>
                        <option value="titleAsc">Title A-Z</option>
                        <option value="titleDesc">Title Z-A</option>
                        <option value="pagesDesc">Most Pages</option>
                        <option value="pagesAsc">Least Pages</option>
                    </select>

                    <div className="bg-slate-100 p-1 rounded-lg flex gap-1 ml-2">
                        <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md transition ${viewMode === 'grid' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`} title="Grid View">
                            <LayoutGrid className="w-4 h-4"/>
                        </button>
                        <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition ${viewMode === 'list' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`} title="List View">
                            <List className="w-4 h-4"/>
                        </button>
                    </div>
                    <button onClick={openNewBook} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition ml-2">
                        <Plus className="w-4 h-4"/> Add Book
                    </button>
                </div>
            </div>
            {books.length === 0 ? (
                <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center flex flex-col items-center">
                    <Library className="w-12 h-12 text-slate-300 mb-4"/>
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">Your shelf is empty</h3>
                    <p className="text-slate-500 mb-6">Find books or add them manually to start tracking.</p>
                    <button onClick={() => handleTabChange('search')} className="text-indigo-600 font-medium hover:underline">Go to Find Books →</button>
                </div>
            ) : (
                <div className={viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6" : "flex flex-col gap-4"}>
                    {(() => {
                        let displayedBooks = books.filter(b => b.title.toLowerCase().includes(shelfSearch.toLowerCase()) || (b.author && b.author.toLowerCase().includes(shelfSearch.toLowerCase())));
                        if (shelfSort === 'titleAsc') displayedBooks.sort((a,b) => a.title.localeCompare(b.title));
                        else if (shelfSort === 'titleDesc') displayedBooks.sort((a,b) => b.title.localeCompare(a.title));
                        else if (shelfSort === 'pagesDesc') displayedBooks.sort((a,b) => b.totalPages - a.totalPages);
                        else if (shelfSort === 'pagesAsc') displayedBooks.sort((a,b) => a.totalPages - b.totalPages);
                        else if (shelfSort === 'addedAsc') displayedBooks.sort((a,b) => (a.id > b.id ? 1 : -1));
                        else displayedBooks.sort((a,b) => (a.id < b.id ? 1 : -1));
                        
                        return displayedBooks.map(b => {
                        const p = latestPeriodByBook[b.id];
                        const activePeriod = (p && p.status !== 'Completed') ? p : null;

                        return viewMode === 'grid' ? (
                        <div key={b.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col hover:shadow-lg transition group">
                            <div className="h-48 bg-slate-100 relative">
                                {b.coverUrl ? (
                                    <CachedImage src={b.coverUrl} className="w-full h-full object-cover" alt="cover"/>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-400">No Cover</div>
                                )}
                            </div>
                            <div className="p-4 flex flex-col flex-1">
                                <button onClick={() => openEditBook(b)} className="font-semibold text-sm text-slate-800 mb-1 line-clamp-2 text-left hover:text-indigo-600 hover:underline transition" title={b.title}>{b.title}</button>
                                <p className="text-xs text-slate-500 mb-4">{b.author}</p>
                                
                                <div className="mt-auto">
                                    {activePeriod ? (
                                        <div className="flex flex-col gap-2">
                                            {activePeriod.status === 'Reading' ? (
                                                <button onClick={() => openLogModal(activePeriod)} className="text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white py-1 px-2 rounded text-center shadow-sm transition">Log Progress</button>
                                            ) : (
                                                <button onClick={() => handleSetReading(activePeriod.id)} className="text-xs font-medium bg-indigo-50 hover:bg-indigo-100 text-indigo-700 py-1 px-2 rounded text-center transition">Resume Reading</button>
                                            )}
                                            {activePeriod.status !== 'Stopped' && (
                                                <div className="flex gap-2">
                                                    <button onClick={() => openPlanModal(activePeriod)} className="flex-1 text-xs font-medium border border-slate-200 hover:bg-slate-50 text-slate-600 py-1 px-2 rounded text-center transition flex items-center justify-center gap-1">
                                                        <List className="w-3 h-3"/> Edit Plan
                                                    </button>
                                                    <button onClick={() => handleStopReading(activePeriod.id)} className="text-xs font-medium border border-red-200 hover:bg-red-50 text-red-600 py-1 px-2 rounded text-center transition flex items-center justify-center" title="Stop Reading">
                                                        <XCircle className="w-4 h-4"/>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <button onClick={() => handleStartReading(b)} className="w-full text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white py-1.5 px-2 rounded text-center transition flex items-center justify-center gap-1">
                                            <Play className="w-3 h-3"/> Start Reading
                                        </button>
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
                                <button onClick={() => openEditBook(b)} className="font-semibold text-slate-800 truncate hover:text-indigo-600 hover:underline transition block text-left w-full">{b.title}</button>
                                <p className="text-sm text-slate-500 truncate mb-1">{b.author}</p>
                                <p className="text-xs text-slate-400">{b.totalPages} pages</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="w-64 hidden sm:block">
                                    {activePeriod ? (
                                        <div className="flex gap-2">
                                            {activePeriod.status === 'Reading' ? (
                                                <button onClick={() => openLogModal(activePeriod)} className="flex-1 text-[10px] sm:text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white py-2 px-2 rounded text-center flex items-center justify-center transition shadow-sm">Log Progress</button>
                                            ) : (
                                                <button onClick={() => handleSetReading(activePeriod.id)} className="flex-1 text-[10px] sm:text-xs font-medium bg-indigo-50 hover:bg-indigo-100 text-indigo-700 py-2 px-2 rounded text-center transition flex items-center justify-center">Resume</button>
                                            )}
                                            {activePeriod.status !== 'Stopped' && (
                                                <>
                                                    <button onClick={() => openPlanModal(activePeriod)} className="flex-1 text-[10px] sm:text-xs font-medium border border-slate-200 hover:bg-slate-50 text-slate-600 py-2 px-2 rounded text-center transition flex items-center justify-center gap-1">
                                                        <List className="w-3 h-3"/> Plan
                                                    </button>
                                                    <button onClick={() => handleStopReading(activePeriod.id)} className="text-xs font-medium border border-red-200 hover:bg-red-50 text-red-600 py-2 px-3 rounded transition flex items-center justify-center" title="Stop Reading">
                                                        <XCircle className="w-4 h-4"/>
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    ) : (
                                        <button onClick={() => handleStartReading(b)} className="w-full text-[10px] sm:text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded transition flex items-center justify-center gap-1">
                                            <Play className="w-3 h-3"/> Start Reading
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                        );
                    })})()}
                </div>
            )}
          </div>
        )}

        {activeTab === 'search' && (
            <div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-8">
                    <h2 className="text-lg font-semibold mb-4 text-slate-800">Find a Book</h2>
                    <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
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
                {historyPeriods.length === 0 ? (
                    <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center flex flex-col items-center">
                        <History className="w-12 h-12 text-slate-300 mb-4"/>
                        <h3 className="text-lg font-semibold text-slate-700 mb-2">No reading history yet</h3>
                        <p className="text-slate-500">Your logged reading progress and finished books will appear here.</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-6">
                        {historyPeriods.map(p => {
                            const totalDays = p.endDate ? Math.ceil((new Date(p.endDate) - new Date(p.startDate)) / (1000 * 60 * 60 * 24)) : 0;
                            const isExpanded = expandedHistory[p.id];
                            
                            return (
                            <div key={p.id} className={`bg-white border-2 p-1 rounded-2xl shadow-sm hover:shadow-md transition overflow-hidden ${p.status === 'Completed' ? 'border-emerald-100' : 'border-indigo-100'}`}>
                                <div className={`p-5 rounded-xl flex flex-col md:flex-row items-center gap-6 ${p.status === 'Completed' ? 'bg-gradient-to-r from-emerald-50 to-white' : 'bg-gradient-to-r from-indigo-50 to-white'}`}>
                                    <div className="w-20 h-32 bg-slate-100 shrink-0 rounded-lg overflow-hidden shadow-md">
                                        {p.book.coverUrl ? (
                                            <CachedImage src={p.book.coverUrl} className="w-full h-full object-cover" alt="cover"/>
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">No Cover</div>
                                        )}
                                    </div>
                                    <div className="flex-1 text-center md:text-left">
                                        {p.status === 'Completed' ? (
                                            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-emerald-600 mb-2 bg-emerald-100/50 px-3 py-1 rounded-full">
                                                <CheckCircle className="w-3.5 h-3.5"/> Completed
                                            </div>
                                        ) : (
                                            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-indigo-600 mb-2 bg-indigo-100/50 px-3 py-1 rounded-full">
                                                <BookOpenIcon className="w-3.5 h-3.5"/> Reading
                                            </div>
                                        )}
                                        <h3 className="font-bold text-2xl text-slate-800 mb-1">{p.book.title}</h3>
                                        <p className="text-slate-500 mb-4">{p.book.author} • {p.book.totalPages} pages</p>
                                        
                                        <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm text-slate-600">
                                            <div className="bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                                                <span className="text-slate-400 block text-xs uppercase tracking-wider mb-0.5">Started</span>
                                                <span className="font-medium">{new Date(p.startDate).toLocaleDateString()}</span>
                                            </div>
                                            <div className="bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                                                <span className="text-slate-400 block text-xs uppercase tracking-wider mb-0.5">Finished</span>
                                                <span className="font-medium">{p.endDate ? new Date(p.endDate).toLocaleDateString() : 'N/A'}</span>
                                            </div>
                                            {totalDays > 0 && (
                                                <div className="bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                                                    <span className="text-slate-400 block text-xs uppercase tracking-wider mb-0.5">Duration</span>
                                                    <span className="font-medium">{totalDays} {totalDays === 1 ? 'day' : 'days'}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="md:border-l md:border-slate-200 md:pl-6 flex flex-col gap-3 justify-center w-full md:w-auto">
                                        <button 
                                            onClick={() => toggleHistory(p.id)} 
                                            className="w-full md:w-auto px-6 py-2.5 bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 text-slate-700 rounded-xl font-medium transition text-sm flex justify-center items-center gap-2"
                                        >
                                            {isExpanded ? 'Hide Journey' : 'View Journey'}
                                        </button>
                                        <button 
                                            onClick={() => {
                                                if (window.confirm("Are you sure you want to permanently delete this entire journey and all its logs?")) {
                                                    deletePeriod(p.id);
                                                }
                                            }}
                                            className="w-full md:w-auto px-6 py-2.5 bg-white border border-red-100 hover:border-red-300 hover:text-red-600 text-slate-500 rounded-xl font-medium transition text-sm flex justify-center items-center gap-2"
                                        >
                                            <Trash2 className="w-4 h-4"/> Delete
                                        </button>
                                    </div>
                                </div>
                                
                                {isExpanded && (
                                    <div className={`p-6 bg-slate-50 border-t ${p.status === 'Completed' ? 'border-emerald-100' : 'border-indigo-100'} rounded-b-xl flex flex-col md:flex-row gap-8`}>
                                        
                                        <div className="flex-1">
                                            <h4 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                                <List className="w-4 h-4 text-indigo-500"/> Reading Plan Checklist
                                            </h4>
                                            {(!p.plans || p.plans.length === 0) ? (
                                                <p className="text-slate-500 text-sm italic">No plan was created for this book.</p>
                                            ) : (
                                                <div className="flex flex-col gap-3">
                                                    {p.plans.sort((a,b) => a.orderIndex - b.orderIndex).map(plan => {
                                                        const highestPage = p.logs?.length > 0 ? Math.max(...p.logs.map(l => l.endPage)) : 0;
                                                        const isCompleted = highestPage >= plan.endPage;
                                                        return (
                                                            <div key={plan.id} className={`flex items-center gap-3 p-3 rounded-lg border ${isCompleted ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-white border-slate-200 text-slate-700'}`}>
                                                                {isCompleted ? <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0"/> : <Circle className="w-5 h-5 text-slate-300 shrink-0"/>}
                                                                <div className="flex-1">
                                                                    <p className="font-medium text-sm">{plan.title}</p>
                                                                    <p className={`text-xs ${isCompleted ? 'text-emerald-600' : 'text-slate-400'}`}>Pages {plan.startPage} - {plan.endPage}</p>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-1">
                                            <h4 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                                <History className="w-4 h-4 text-indigo-500"/> Reading Logs
                                            </h4>
                                            {(!p.logs || p.logs.length === 0) ? (
                                                <p className="text-slate-500 text-sm italic">No logs recorded for this book.</p>
                                            ) : (
                                                <div className="relative border-l-2 border-indigo-200 ml-3 pl-6 space-y-6">
                                                    {p.logs.sort((a,b) => new Date(b.date) - new Date(a.date)).map(log => (
                                                        <div key={log.id} className="relative">
                                                            <div className="absolute -left-[31px] bg-white border-2 border-indigo-400 w-4 h-4 rounded-full mt-0.5"></div>
                                                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                                                                <div>
                                                                    <p className="text-sm font-medium text-slate-800">
                                                                        Read pages <span className="text-indigo-600 font-bold">{log.startPage}</span> to <span className="text-indigo-600 font-bold">{log.endPage}</span>
                                                                    </p>
                                                                    <p className="text-xs text-slate-400 mt-0.5">{new Date(log.date).toLocaleString()}</p>
                                                                </div>
                                                                <div className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-lg text-xs font-bold">
                                                                    +{log.endPage - log.startPage} pages
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                            );
                        })}
                    </div>
                )}
            </div>
        )}
      </div>

      {showBookModal && <BookModal book={selectedBook} onClose={() => setShowBookModal(false)} />}
      {showPlanModal && <PlanModal period={selectedPeriod} onClose={() => setShowPlanModal(false)} />}
      {showLogModal && <LogModal period={logPeriod} onClose={() => setShowLogModal(false)} />}
    </div>
  );
}
