import React, { useState, useEffect } from 'react';
import useBookStore from '../store/useBookStore';
import { Search as MagnifyingGlassIcon, BookOpen as BookOpenIcon } from 'lucide-react';

export default function Books() {
  const { searchBooks, searchResults, addBook, startReadingPeriod, currentRead, fetchCurrentRead } = useBookStore();
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    fetchCurrentRead();
  }, [fetchCurrentRead]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setIsSearching(true);
    await searchBooks(query);
    setIsSearching(false);
  };

  const handleAddAndStart = async (book) => {
    const saved = await addBook(book);
    
    // Auto-create a simple plan for demo based on total pages. In a real app this would open a modal to define chapters.
    const plans = [
        { title: "Chapter 1", startPage: 1, endPage: Math.min(saved.totalPages, 50) },
    ];
    if (saved.totalPages > 50) {
        plans.push({ title: "Chapter 2", startPage: 51, endPage: saved.totalPages });
    }

    await startReadingPeriod(saved.id, plans);
  };

  return (
    <div className="p-8 w-full overflow-y-auto bg-slate-50">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-slate-800 tracking-tight flex items-center gap-3">
            <BookOpenIcon className="w-8 h-8 text-indigo-600" />
            Reading Tracker
        </h1>
        
        {currentRead && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-8 flex gap-6 items-center">
            {currentRead.period.book.coverUrl ? (
                <img src={currentRead.period.book.coverUrl} className="w-24 h-36 object-cover rounded-lg shadow-md" alt="cover"/>
            ) : (
                <div className="w-24 h-36 bg-slate-200 rounded-lg flex items-center justify-center shadow-md">
                    <BookOpenIcon className="w-8 h-8 text-slate-400" />
                </div>
            )}
            <div>
                <h2 className="font-semibold text-xl text-slate-800 mb-1">Currently Reading: {currentRead.period.book.title}</h2>
                <p className="text-slate-600 mb-4">{currentRead.period.book.author}</p>
                <div className="flex gap-4 mb-2">
                    <div className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg text-sm font-medium">
                        Chapter: {currentRead.currentChapter || 'Not Started'}
                    </div>
                    <div className="bg-amber-50 text-amber-700 px-4 py-2 rounded-lg text-sm font-medium">
                        {currentRead.pagesLeftInChapter} pages left in session
                    </div>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2.5 mt-4">
                    <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${Math.min(100, (currentRead.currentPage / currentRead.period.book.totalPages) * 100)}%` }}></div>
                </div>
                <p className="text-xs text-slate-500 mt-2 text-right">{currentRead.currentPage} / {currentRead.period.book.totalPages} pages</p>
            </div>
          </div>
        )}

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-8">
            <h2 className="text-lg font-semibold mb-4 text-slate-800">Find a Book</h2>
            <form onSubmit={handleSearch} className="flex gap-4">
                <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <MagnifyingGlassIcon className="h-5 w-5 text-slate-400" />
                    </div>
                    <input 
                        className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 text-slate-900"
                        placeholder="Search OpenLibrary by title or author..."
                        value={query} 
                        onChange={e => setQuery(e.target.value)} 
                    />
                </div>
                <button type="submit" disabled={isSearching} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-xl transition font-medium flex items-center gap-2 disabled:opacity-50">
                    {isSearching ? 'Searching...' : 'Search'}
                </button>
            </form>
        </div>

        {searchResults.length > 0 && (
            <div>
                <h2 className="text-xl font-semibold mb-6 text-slate-800">Search Results</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                    {searchResults.map((b, i) => (
                    <div key={i} className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col items-center hover:shadow-md transition">
                        {b.coverUrl ? (
                            <img src={b.coverUrl} className="w-full h-48 object-cover mb-4 rounded-lg shadow-sm" alt="cover"/>
                        ) : (
                            <div className="w-full h-48 bg-slate-100 mb-4 rounded-lg flex items-center justify-center text-slate-400 border border-slate-200">
                                No Cover
                            </div>
                        )}
                        <h3 className="font-semibold text-center text-sm text-slate-800 mb-1 line-clamp-2">{b.title}</h3>
                        <p className="text-xs text-slate-500 text-center mb-4">{b.author}</p>
                        <p className="text-xs text-slate-400 text-center mb-4">{b.totalPages} pages</p>
                        <button onClick={() => handleAddAndStart(b)} className="mt-auto w-full py-2 bg-slate-100 hover:bg-indigo-50 text-indigo-600 rounded-lg text-sm font-medium transition">
                            Add to Shelf
                        </button>
                    </div>
                    ))}
                </div>
            </div>
        )}
      </div>
    </div>
  );
}
