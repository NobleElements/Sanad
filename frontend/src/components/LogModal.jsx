import React, { useState } from 'react';
import useBookStore from '../store/useBookStore';
import { X, CheckCircle, BookOpen } from 'lucide-react';

export default function LogModal({ period, onClose }) {
    const { logProgress } = useBookStore();
    const highestPage = period.logs?.length > 0 ? Math.max(...period.logs.map(l => l.endPage)) : 0;
    
    const [endPage, setEndPage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const page = parseInt(endPage);
        
        if (!page || page <= highestPage) {
            alert(`Page must be greater than your current page (${highestPage}).`);
            return;
        }

        if (period.book.totalPages > 0 && page > period.book.totalPages) {
            if (!window.confirm(`You are logging page ${page}, but the book only has ${period.book.totalPages} pages. Is this correct?`)) {
                return;
            }
        }

        setIsSubmitting(true);
        await logProgress(period.id, highestPage, page);
        setIsSubmitting(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-6 border-b border-slate-100">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-indigo-600"/> Log Progress
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6 text-center">
                        <p className="text-sm font-medium text-slate-800 mb-1">{period.book.title}</p>
                        <p className="text-xs text-slate-500">Currently on Page {highestPage}</p>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-slate-700 mb-2">I just finished reading to page:</label>
                            <div className="relative">
                                <input 
                                    type="number" 
                                    value={endPage} 
                                    onChange={e => setEndPage(e.target.value)}
                                    className="w-full text-center text-3xl font-bold p-4 border border-indigo-200 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition"
                                    placeholder={highestPage.toString()}
                                    min={highestPage + 1}
                                    autoFocus
                                />
                                {period.book.totalPages > 0 && (
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium mr-5">
                                        / {period.book.totalPages}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-3 mt-8">
                            <button type="button" onClick={onClose} className="flex-1 px-4 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-medium transition">
                                Cancel
                            </button>
                            <button type="submit" disabled={isSubmitting || !endPage} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition disabled:opacity-50">
                                {isSubmitting ? 'Saving...' : <><CheckCircle className="w-5 h-5"/> Save Log</>}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
