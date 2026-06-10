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
        // Optimistic UI Update
        const tempPeriod = { id: Date.now(), bookId, plans, status: 'Reading', startDate: new Date().toISOString() };
        set(state => {
            const updatedPeriods = state.periods.map(p => p.status === 'Reading' ? { ...p, status: 'Paused' } : p);
            return { periods: [tempPeriod, ...updatedPeriods] };
        });

        await fetch(`${API_BASE}/reading/periods`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookId, plans })
        });
        await get().fetchPeriods();
        await get().fetchCurrentRead();
    },
    
    logProgress: async (periodId, startPage, endPage) => {
        await fetch(`${API_BASE}/reading/logs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ readingPeriodId: periodId, startPage, endPage })
        });
        await get().fetchCurrentRead();
        await get().fetchPeriods();
    },

    fetchBooks: async () => {
        try {
            const res = await fetch(`${API_BASE}/books`);
            const data = await res.json();
            set({ books: data });
        } catch (error) {
            console.error("Failed to fetch books:", error);
        }
    },

    fetchPeriods: async () => {
        try {
            const res = await fetch(`${API_BASE}/reading/periods`);
            const data = await res.json();
            set({ periods: data });
        } catch (error) {
            console.error("Failed to fetch periods:", error);
        }
    },

    updateBook: async (id, book) => {
        await fetch(`${API_BASE}/books/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(book)
        });
        await get().fetchBooks();
        await get().fetchPeriods();
        await get().fetchCurrentRead();
    },

    deleteBook: async (id) => {
        await fetch(`${API_BASE}/books/${id}`, {
            method: 'DELETE'
        });
        await get().fetchBooks();
        await get().fetchPeriods();
        await get().fetchCurrentRead();
    },

    updatePlans: async (periodId, plans) => {
        await fetch(`${API_BASE}/reading/periods/${periodId}/plans`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(plans)
        });
        await get().fetchPeriods();
        await get().fetchCurrentRead();
    },

    setPeriodStatus: async (periodId, status) => {
        // Optimistic UI Update
        set(state => {
            const updatedPeriods = state.periods.map(p => {
                if (p.id === periodId) return { ...p, status };
                if (status === 'Reading' && p.status === 'Reading') return { ...p, status: 'Paused' };
                return p;
            });
            return { periods: updatedPeriods };
        });

        await fetch(`${API_BASE}/reading/periods/${periodId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        await get().fetchPeriods();
        await get().fetchCurrentRead();
    },

    deletePeriod: async (periodId) => {
        // Optimistic UI Update
        set(state => ({ periods: state.periods.filter(p => p.id !== periodId) }));

        await fetch(`${API_BASE}/reading/periods/${periodId}`, {
            method: 'DELETE'
        });
        await get().fetchPeriods();
        await get().fetchCurrentRead();
    }
}));

export default useBookStore;
