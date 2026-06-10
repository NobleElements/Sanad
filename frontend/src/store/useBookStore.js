import { create } from 'zustand';
import { API_BASE } from '../config';

const useBookStore = create((set, get) => ({
    books: [],
    searchResults: [],
    periods: [],
    currentRead: null,
    
    searchBooks: async (query) => {
        try {
            const res = await fetch(`${API_BASE}/books/search?query=${encodeURIComponent(query)}`);
            const data = await res.json();
            set({ searchResults: data });
        } catch (error) {
            console.error("Failed to search books:", error);
        }
    },
    
    addBook: async (book) => {
        const res = await fetch(`${API_BASE}/books`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(book)
        });
        const savedBook = await res.json();
        set(state => ({ books: [savedBook, ...state.books] }));
        return savedBook;
    },
    
    fetchCurrentRead: async () => {
        try {
            const res = await fetch(`${API_BASE}/reading/current`);
            if (res.ok) {
                const data = await res.json();
                set({ currentRead: data });
            } else {
                set({ currentRead: null });
            }
        } catch (error) {
            console.error("Failed to fetch current read:", error);
            set({ currentRead: null });
        }
    },
    
    startReadingPeriod: async (bookId, plans) => {
        await fetch(`${API_BASE}/reading/periods`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookId, plans })
        });
        await get().fetchCurrentRead();
    },
    
    logProgress: async (periodId, startPage, endPage) => {
        await fetch(`${API_BASE}/reading/logs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ readingPeriodId: periodId, startPage, endPage })
        });
        await get().fetchCurrentRead();
    }
}));

export default useBookStore;
