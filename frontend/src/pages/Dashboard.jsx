import { useState, useEffect, useRef } from 'react';
import { API_BASE } from '../config';
import useFinanceStore from '../store/useFinanceStore';
import useThoughtsStore from '../store/useThoughtsStore';
import useBookStore from '../store/useBookStore';
import useHabitStore from '../store/useHabitStore';
import CachedImage from '../components/CachedImage';
import { format } from 'date-fns';

import { timeAgo } from '../utils/dateUtils';
import CategorySelector from '../components/CategorySelector';

export default function Dashboard() {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Thoughts store
  const { timeline, fetchTimeline, addThought } = useThoughtsStore();

  // Finance store
  const { 
    transactions: recentTransactions, 
    budgetSummary, 
    fetchFinanceData, 
    addTransaction
  } = useFinanceStore();

  // Book store
  const { currentRead, fetchCurrentRead, logProgress } = useBookStore();

  // Habit store
  const { habits, fetchHabits, toggleHabitLog } = useHabitStore();

  const [spendAmount, setSpendAmount] = useState('');
  const [spendDesc, setSpendDesc] = useState('');
  const [isLoggingSpend, setIsLoggingSpend] = useState(false);
  const [showSpendModal, setShowSpendModal] = useState(false);
  const [spendCategoryId, setSpendCategoryId] = useState('');

  // Daily Goal state
  const [dailyGoal, setDailyGoal] = useState('');
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [editGoalValue, setEditGoalValue] = useState('');
  const [isSavingGoal, setIsSavingGoal] = useState(false);


  const loadDailyGoal = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await fetch(`${API_BASE}/api/goals/${today}`);
      if (res.status === 204 || !res.ok) {
        setDailyGoal('');
        return;
      }
      const data = await res.json();
      setDailyGoal(data.goal || '');
    } catch (e) {
      console.error('Failed to load daily goal:', e);
    }
  };

  const saveDailyGoal = async () => {
    try {
      setIsSavingGoal(true);
      const today = new Date().toISOString().split('T')[0];
      const res = await fetch(`${API_BASE}/api/goals/${today}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: editGoalValue })
      });
      if (res.ok) {
        setDailyGoal(editGoalValue);
        setIsEditingGoal(false);
      }
    } catch (e) {
      console.error('Failed to save daily goal:', e);
    } finally {
      setIsSavingGoal(false);
    }
  };

  const handleGoalKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveDailyGoal();
    } else if (e.key === 'Escape') {
      setIsEditingGoal(false);
    }
  };

  useEffect(() => {
    fetchTimeline();
    fetchFinanceData();
    loadDailyGoal();
    fetchCurrentRead();
    fetchHabits();
  }, [fetchTimeline, fetchFinanceData, fetchCurrentRead, fetchHabits]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    
    setIsSubmitting(true);
    const success = await addThought(content);
    if (success) {
      setContent('');
    }
    setIsSubmitting(false);
  };

  const handleLogSpend = async (e) => {
    e.preventDefault();
    if (!spendAmount || !spendCategoryId) return;

    setIsLoggingSpend(true);
    const success = await addTransaction(parseFloat(spendAmount), spendCategoryId, spendDesc);
    if (success) {
      setSpendAmount('');
      setSpendDesc('');
      setSpendCategoryId('');
      setShowSpendModal(false);
      fetchTimeline();
    }
    setIsLoggingSpend(false);
  };

  const totalSpentToday = recentTransactions
    .filter(tx => {
      const txDate = new Date(tx.date);
      const today = new Date();
      return txDate.toDateString() === today.toDateString();
    })
    .reduce((sum, tx) => sum + tx.amount, 0);

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const uncompletedHabitsToday = habits.filter(h => 
    !h.logs?.some(l => l.completed && format(new Date(l.date), 'yyyy-MM-dd') === todayStr)
  );

  return (
    <div className="flex-1 flex flex-col p-8 overflow-y-auto">
      <h2 className="text-3xl font-bold mb-6">Dashboard</h2>
      
      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <h3 className="text-sm text-slate-500 font-semibold uppercase">Spent Today</h3>
          <p className="text-2xl font-bold">₪{totalSpentToday.toFixed(2)}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <h3 className="text-sm text-slate-500 font-semibold uppercase">Today's Goals</h3>
          {isEditingGoal ? (
            <div className="mt-2 flex items-center gap-2">
              <input
                type="text"
                value={editGoalValue}
                onChange={(e) => setEditGoalValue(e.target.value)}
                onKeyDown={handleGoalKeyDown}
                className="w-full border border-indigo-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="What is your goal today?"
                autoFocus
                disabled={isSavingGoal}
              />
              <button onClick={saveDailyGoal} disabled={isSavingGoal} className="text-emerald-600 hover:text-emerald-700 font-bold px-1 text-sm">✓</button>
              <button onClick={() => setIsEditingGoal(false)} disabled={isSavingGoal} className="text-slate-400 hover:text-slate-600 font-bold px-1 text-sm">✕</button>
            </div>
          ) : (
            <div className="mt-2 group flex items-center justify-between">
              <p className={`text-sm ${dailyGoal ? 'text-slate-800 font-medium' : 'text-slate-400 italic'}`}>
                {dailyGoal || 'No goals yet'}
              </p>
              <button
                onClick={() => {
                  setEditGoalValue(dailyGoal);
                  setIsEditingGoal(true);
                }}
                className="text-xs text-slate-400 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                Edit
              </button>
            </div>
          )}
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 flex flex-col max-h-[140px]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm text-slate-500 font-semibold uppercase">Today's Habits</h3>
            <a href="/habits" className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">All →</a>
          </div>
          <div className="overflow-y-auto flex-1 pr-1 custom-scrollbar">
            {uncompletedHabitsToday.length === 0 ? (
               <p className="text-slate-400 text-sm mt-2">All done for today! 🎉</p>
            ) : (
               <div className="flex flex-col gap-2 mt-2">
                 {uncompletedHabitsToday.map(habit => (
                   <div key={habit.id} className="flex items-center justify-between group">
                     <div className="flex items-center gap-2 min-w-0">
                       <span className="text-lg flex-shrink-0">{habit.icon}</span>
                       <span className="text-sm font-medium text-slate-700 truncate" title={habit.name}>{habit.name}</span>
                     </div>
                     <button
                       onClick={() => toggleHabitLog(habit.id, todayStr)}
                       className="w-5 h-5 rounded border border-slate-300 flex items-center justify-center text-transparent hover:border-emerald-500 hover:text-emerald-500 transition-colors flex-shrink-0"
                       title="Mark completed"
                     >
                       <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                       </svg>
                     </button>
                   </div>
                 ))}
               </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex gap-8">
        <div className="flex-2 w-2/3 flex flex-col gap-6">
          {/* Thoughts Input */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <h3 className="text-lg font-semibold mb-4 text-slate-700">What's on your mind?</h3>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <textarea 
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full border border-slate-300 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                placeholder="Write a thought..."
                rows="2"
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
           {/* Current Read Widget */}
           {currentRead && (
             <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
               <div className="flex justify-between items-center mb-4">
                 <h3 className="text-lg font-semibold text-slate-700">Current Read</h3>
                 <a href="/books" className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">Shelf →</a>
               </div>
               <div className="flex gap-4">
                 {currentRead.period.book.coverUrl ? (
                    <CachedImage src={currentRead.period.book.coverUrl} className="w-16 h-24 object-cover rounded shadow-sm" alt="cover"/>
                 ) : (
                    <div className="w-16 h-24 bg-slate-200 rounded flex items-center justify-center shadow-sm">
                      <span className="text-slate-400 text-xs">No Cover</span>
                    </div>
                 )}
                 <div className="flex-1 min-w-0">
                   <p className="font-medium text-slate-800 truncate" title={currentRead.period.book.title}>{currentRead.period.book.title}</p>
                   <p className="text-sm text-slate-600 truncate mb-1">Ch: {currentRead.currentChapter || 'Not Started'}</p>
                   <p className="text-xs text-amber-600 font-medium bg-amber-50 inline-block px-2 py-0.5 rounded mb-2">{currentRead.pagesLeftInChapter} pages left</p>
                   <div className="flex gap-2">
                      <input type="number" id="logPageInput" className="w-16 border border-slate-300 rounded p-1.5 text-sm focus:outline-none focus:border-indigo-500" placeholder="Pg" />
                      <button onClick={() => {
                         const val = document.getElementById('logPageInput').value;
                         if(val) {
                            logProgress(currentRead.period.id, currentRead.currentPage, parseInt(val));
                            document.getElementById('logPageInput').value = '';
                         }
                      }} className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded hover:bg-indigo-700 transition font-medium">Log</button>
                   </div>
                 </div>
               </div>
             </div>
           )}

           <div className={"bg-white p-6 rounded-lg shadow-sm border border-slate-200" + (currentRead ? " mt-6" : "")}>
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
             <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-500">Left this month</span>
                  <span className={`font-semibold ${budgetSummary.monthlyBudget - budgetSummary.totalSpent < 0 ? 'text-red-500' : 'text-slate-700'}`}>
                    ₪{(budgetSummary.monthlyBudget - budgetSummary.totalSpent).toFixed(2)}
                  </span>
                </div>
                {budgetSummary.monthlyBudget > 0 && (
                  <div className="w-full bg-slate-100 rounded-full h-1.5">
                    <div 
                      className={`h-1.5 rounded-full ${budgetSummary.monthlyBudget - budgetSummary.totalSpent < 0 ? 'bg-red-500' : 'bg-indigo-500'}`} 
                      style={{ width: `${Math.min((budgetSummary.totalSpent / budgetSummary.monthlyBudget) * 100, 100)}%` }}
                    />
                  </div>
                )}
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
                       ₪{tx.amount.toFixed(2)}
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
            <form onSubmit={handleLogSpend} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm text-slate-600 mb-1 font-medium">Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₪</span>
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
              <div className="relative">
                <label className="block text-sm text-slate-600 mb-1 font-medium">Category</label>
                <CategorySelector 
                  value={spendCategoryId}
                  onChange={setSpendCategoryId}
                  disabled={isLoggingSpend}
                />
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
