import React, { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import useBookStore from '../store/useBookStore';
import useConfirmStore from '../store/useConfirmStore';

export default function BookModal({ book, onClose }) {
  const { addBook, updateBook, deleteBook } = useBookStore();
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    coverUrl: '',
    totalPages: 0
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (book) {
      setFormData({
        title: book.title || '',
        author: book.author || '',
        coverUrl: book.coverUrl || '',
        totalPages: book.totalPages || 0
      });
    }
  }, [book]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    if (book) {
      await updateBook(book.id, formData);
    } else {
      await addBook(formData);
    }
    setIsSubmitting(false);
    onClose();
  };
  const { showConfirm } = useConfirmStore();

  const handleDelete = async () => {
    showConfirm({
      title: 'Delete Book',
      message: 'Are you sure you want to delete this book? This will remove reading history too.',
      confirmText: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        setIsSubmitting(true);
        await deleteBook(book.id);
        setIsSubmitting(false);
        onClose();
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md mx-4 p-6 dark:text-slate-100">
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-6">{book ? 'Edit Book' : 'Add Book Manually'}</h3>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Title</label>
            <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full p-2 border rounded focus:ring focus:ring-indigo-200 focus:border-indigo-500 dark:bg-slate-700 dark:text-slate-100" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Author</label>
            <input required type="text" value={formData.author} onChange={e => setFormData({...formData, author: e.target.value})} className="w-full p-2 border rounded focus:ring focus:ring-indigo-200 focus:border-indigo-500 dark:bg-slate-700 dark:text-slate-100" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Total Pages</label>
            <input required type="number" min="1" value={formData.totalPages} onChange={e => setFormData({...formData, totalPages: parseInt(e.target.value) || 0})} className="w-full p-2 border rounded focus:ring focus:ring-indigo-200 focus:border-indigo-500 dark:bg-slate-700 dark:text-slate-100" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Cover Image URL (Optional)</label>
            <div className="flex flex-col sm:flex-row gap-2">
                <input type="text" value={formData.coverUrl} onChange={e => setFormData({...formData, coverUrl: e.target.value})} className="flex-1 p-2 border rounded focus:ring focus:ring-indigo-200 focus:border-indigo-500 dark:bg-slate-700 dark:text-slate-100" placeholder="https://..." />
                <button type="button" onClick={() => {
                    if (!formData.title) return alert('Please enter a book title first!');
                    window.open(`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(formData.title + ' ' + (formData.author || '') + ' book cover')}`, '_blank');
                }} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded transition text-sm font-medium whitespace-nowrap">
                    Search Google Images
                </button>
            </div>
          </div>
          
          <div className="flex gap-3 justify-between mt-4 items-center">
            {book ? (
                <button type="button" onClick={handleDelete} className="p-2 text-red-500 dark:text-red-400 hover:bg-red-50 dark:bg-red-500/10 rounded transition" title="Delete Book">
                    <Trash2 className="w-5 h-5"/>
                </button>
            ) : <div/>}
            <div className="flex gap-3">
                <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 dark:text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition font-medium">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-600 text-white rounded transition font-medium">
                {isSubmitting ? 'Saving...' : 'Save Book'}
                </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
