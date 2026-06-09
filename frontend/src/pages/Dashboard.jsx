import { useState, useEffect, useRef } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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

export default function Dashboard() {
  const [content, setContent] = useState('');
  const [timeline, setTimeline] = useState([]);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Spending state
  const [categories, setCategories] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [spendAmount, setSpendAmount] = useState('');
  const [spendCategoryId, setSpendCategoryId] = useState('');
  const [spendDesc, setSpendDesc] = useState('');
  const [isLoggingSpend, setIsLoggingSpend] = useState(false);
  const [spendError, setSpendError] = useState(null);
  const [spendSuccess, setSpendSuccess] = useState(false);
  const [showSpendModal, setShowSpendModal] = useState(false);

  // Category combobox state
  const [catSearch, setCatSearch] = useState('');
  const [catDropdownOpen, setCatDropdownOpen] = useState(false);
  const [isCreatingCat, setIsCreatingCat] = useState(false);
  const catRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (catRef.current && !catRef.current.contains(e.target)) {
        setCatDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCategories = categories.filter(c =>
    c.name.toLowerCase().includes(catSearch.toLowerCase())
  );

  const exactMatch = categories.some(
    c => c.name.toLowerCase() === catSearch.toLowerCase()
  );

  const randomColor = () => {
    const hue = Math.floor(Math.random() * 360);
    return `hsl(${hue}, 65%, 55%)`;
  };

  const hslToHex = (h, s, l) => {
    s /= 100; l /= 100;
    const a = s * Math.min(l, 1 - l);
    const f = n => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  };

  const createCategoryInline = async (name) => {
    setIsCreatingCat(true);
    try {
      const hue = Math.floor(Math.random() * 360);
      const colorHex = hslToHex(hue, 65, 55);
      const res = await fetch(`${API_URL}/finances/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          monthlyBudget: 0,
          colorHex
        })
      });
      if (!res.ok) throw new Error('Failed to create category');
      const newCat = await res.json();
      setCategories(prev => [...prev, newCat]);
      setSpendCategoryId(newCat.id);
      setCatSearch(newCat.name);
      setCatDropdownOpen(false);
    } catch (e) {
      console.error(e);
      setSpendError('Failed to create category.');
    } finally {
      setIsCreatingCat(false);
    }
  };

  const selectCategory = (cat) => {
    setSpendCategoryId(cat.id);
    setCatSearch(cat.name);
    setCatDropdownOpen(false);
  };

  const loadTimeline = async () => {
    try {
      const res = await fetch(`${API_URL}/timeline`);
      if (!res.ok) throw new Error('Failed to load timeline');
      const data = await res.json();
      setTimeline(data);
    } catch (e) {
      console.error(e);
      setError('Failed to load timeline. Please try again later.');
    }
  };

  const loadFinanceData = async () => {
    try {
      const [catRes, txRes] = await Promise.all([
        fetch(`${API_URL}/finances/categories`),
        fetch(`${API_URL}/finances/transactions`)
      ]);
      if (catRes.ok) {
        setCategories(await catRes.json());
      }
      if (txRes.ok) {
        const txData = await txRes.json();
        setRecentTransactions(txData.slice(0, 5));
      }
    } catch (e) {
      console.error('Failed to load finance data:', e);
    }
  };

  useEffect(() => {
    loadTimeline();
    loadFinanceData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/thoughts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });
      if (!res.ok) throw new Error('Failed to save thought');
      setContent('');
      loadTimeline();
    } catch (e) {
      console.error(e);
      setError('Failed to save thought. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogSpend = async (e) => {
    e.preventDefault();
    if (!spendAmount || !spendCategoryId) return;

    setIsLoggingSpend(true);
    setSpendError(null);
    setSpendSuccess(false);
    try {
      const res = await fetch(`${API_URL}/finances/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(spendAmount),
          categoryId: spendCategoryId,
          description: spendDesc,
          type: 'Expense',
          date: new Date().toISOString()
        })
      });

      if (!res.ok) throw new Error('Failed to log expense');

      setSpendAmount('');
      setSpendDesc('');
      setSpendCategoryId('');
      setCatSearch('');
      setSpendSuccess(true);
      setTimeout(() => setSpendSuccess(false), 2000);
      loadFinanceData();
      loadTimeline();
    } catch (e) {
      console.error(e);
      setSpendError('Failed to log expense. Please try again.');
    } finally {
      setIsLoggingSpend(false);
    }
  };

  const totalSpentToday = recentTransactions
    .filter(tx => {
      const txDate = new Date(tx.date);
      const today = new Date();
      return txDate.toDateString() === today.toDateString();
    })
    .reduce((sum, tx) => sum + tx.amount, 0);

  return (
    <div className="flex-1 flex flex-col p-8 overflow-y-auto">
      <h2 className="text-3xl font-bold mb-6">Dashboard</h2>
      
      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <h3 className="text-sm text-slate-500 font-semibold uppercase">Spent Today</h3>
          <p className="text-2xl font-bold">${totalSpentToday.toFixed(2)}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <h3 className="text-sm text-slate-500 font-semibold uppercase">Today's Goals</h3>
          <p className="text-slate-400 mt-2">No goals yet</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <h3 className="text-sm text-slate-500 font-semibold uppercase">Habits</h3>
          <p className="text-slate-400 mt-2">No habits tracked</p>
        </div>
      </div>
      
      <div className="flex gap-8">
        <div className="flex-2 w-2/3 flex flex-col gap-6">
          {/* Thoughts Input */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <h3 className="text-lg font-semibold mb-4 text-slate-700">What's on your mind?</h3>
            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <textarea 
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full border border-slate-300 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                placeholder="Write a thought..."
                rows="3"
                disabled={isSubmitting}
              />
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="self-end bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Capturing...' : 'Capture'}
              </button>
            </form>
          </div>


          
          {/* Timeline */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
             <h3 className="text-lg font-semibold mb-4 text-slate-700">Timeline</h3>
             <div className="flex flex-col gap-4">
               {timeline.length === 0 ? (
                 <p className="text-slate-500 italic">No timeline items yet.</p>
               ) : (
                 timeline.map(item => (
                   <div key={item.id} className="p-4 bg-slate-50 rounded border border-slate-100 flex flex-col gap-1">
                     <div className="text-xs text-slate-400">{new Date(item.createdAt).toLocaleString()} &bull; {item.itemType}</div>
                     <div className="text-slate-800" dangerouslySetInnerHTML={{ __html: item.content }} />
                   </div>
                 ))
               )}
             </div>
          </div>
        </div>
        <div className="w-1/3">
           <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <a href="/finance" className="text-lg font-semibold text-slate-700 hover:text-indigo-600 transition-colors cursor-pointer">Recent Spending →</a>
                <button
                  type="button"
                  onClick={() => setShowSpendModal(true)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                >
                  Quick Log
                </button>
             </div>
             {recentTransactions.length === 0 ? (
               <p className="text-slate-400 text-sm italic">No spending logged yet.</p>
             ) : (
               <div className="flex flex-col gap-3">
                 {recentTransactions.map(tx => (
                   <div key={tx.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                     <div
                       className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                       style={{ backgroundColor: tx.category?.colorHex || '#CBD5E1' }}
                     />
                     <div className="flex-1 min-w-0">
                       <div className="text-sm font-medium text-slate-800 truncate">
                         {tx.description || 'No description'}
                       </div>
                       <div className="text-xs text-slate-400">
                         {tx.category?.name} · {timeAgo(tx.date)}
                       </div>
                     </div>
                     <div className="text-sm font-semibold text-slate-700 flex-shrink-0">
                       ${tx.amount.toFixed(2)}
                     </div>
                   </div>
                 ))}
               </div>
             )}
           </div>
        </div>
      </div>

      {/* Quick Spend Modal */}
      {showSpendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowSpendModal(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md mx-4 p-6 animate-fadeInUp">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-slate-800">Quick Spend</h3>
              <button
                type="button"
                onClick={() => setShowSpendModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors text-xl leading-none"
              >
                ×
              </button>
            </div>
            {spendSuccess && (
              <div className="mb-4 p-3 bg-emerald-50 text-emerald-700 rounded-lg text-sm border border-emerald-200 font-medium">
                ✓ Expense logged successfully!
              </div>
            )}
            {spendError && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">
                {spendError}
              </div>
            )}
            <form onSubmit={handleLogSpend} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm text-slate-600 mb-1 font-medium">Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={spendAmount}
                    onChange={(e) => setSpendAmount(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2.5 pl-7 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    required
                    disabled={isLoggingSpend}
                    autoFocus
                  />
                </div>
              </div>
              <div className="relative" ref={catRef}>
                <label className="block text-sm text-slate-600 mb-1 font-medium">Category</label>
                <div className="relative">
                  {spendCategoryId && (
                    <span
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: categories.find(c => c.id === spendCategoryId)?.colorHex || '#CBD5E1' }}
                    />
                  )}
                  <input
                    type="text"
                    placeholder="Type to search..."
                    value={catSearch}
                    onChange={(e) => {
                      setCatSearch(e.target.value);
                      setSpendCategoryId('');
                      setCatDropdownOpen(true);
                    }}
                    onFocus={() => setCatDropdownOpen(true)}
                    className={`w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white ${
                      spendCategoryId ? 'pl-7' : ''
                    }`}
                    disabled={isLoggingSpend || isCreatingCat}
                  />
                </div>
                {catDropdownOpen && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {filteredCategories.length > 0 && filteredCategories.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => selectCategory(c)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2 transition-colors"
                      >
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: c.colorHex || '#CBD5E1' }} />
                        {c.name}
                      </button>
                    ))}
                    {catSearch.trim() && !exactMatch && (
                      <button
                        type="button"
                        onClick={() => createCategoryInline(catSearch.trim())}
                        disabled={isCreatingCat}
                        className="w-full text-left px-3 py-2 text-sm text-indigo-600 hover:bg-indigo-50 font-medium border-t border-slate-100 flex items-center gap-2 transition-colors disabled:opacity-50"
                      >
                        <span className="text-indigo-400">+</span>
                        {isCreatingCat ? 'Creating...' : `Create "${catSearch.trim()}"`}
                      </button>
                    )}
                    {filteredCategories.length === 0 && (!catSearch.trim() || exactMatch) && (
                      <div className="px-3 py-2 text-sm text-slate-400 italic">No categories found</div>
                    )}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1 font-medium">Description</label>
                <input
                  type="text"
                  placeholder="What was it for?"
                  value={spendDesc}
                  onChange={(e) => setSpendDesc(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  disabled={isLoggingSpend}
                />
              </div>
              <button
                type="submit"
                disabled={isLoggingSpend || !spendCategoryId}
                className="w-full bg-emerald-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed mt-1"
              >
                {isLoggingSpend ? 'Logging...' : 'Log Expense'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
