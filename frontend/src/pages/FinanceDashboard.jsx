import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useSearchParams } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import AssetsTab from './AssetsTab';
import useFinanceStore from '../store/useFinanceStore';
import CategorySelector from '../components/CategorySelector';

export default function FinanceDashboard() {
  const [activeTab, setActiveTab] = useState('spending'); // 'spending' | 'assets'
  
  const [searchParams, setSearchParams] = useSearchParams();
  const urlMonth = searchParams.get('month') ? parseInt(searchParams.get('month'), 10) : new Date().getMonth() + 1;
  const urlYear = searchParams.get('year') ? parseInt(searchParams.get('year'), 10) : new Date().getFullYear();

  const { 
    categories, transactions, budgetSummary: summary, 
    currentMonth, currentYear, setDate, fetchFinanceData,
    addTransaction, deleteTransaction, createCategory, updateCategory, updateBudget 
  } = useFinanceStore();

  useEffect(() => {
    if (urlMonth !== currentMonth || urlYear !== currentYear) {
      setDate(urlMonth, urlYear);
    } else {
      fetchFinanceData();
    }
  }, [urlMonth, urlYear, currentMonth, currentYear, setDate, fetchFinanceData]);
  
  const getLocalDateStr = () => {
    const d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
  };

  // form state
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [logDate, setLogDate] = useState(getLocalDateStr());


  // category editing state
  const [editingCatId, setEditingCatId] = useState(null);
  const [editingCatName, setEditingCatName] = useState('');
  const [editingCatColor, setEditingCatColor] = useState('#CBD5E1');
  const [editingCatBudget, setEditingCatBudget] = useState('');

  // total monthly budget editing
  const [editingMonthlyBudget, setEditingMonthlyBudget] = useState(false);
  const [monthlyBudgetValue, setMonthlyBudgetValue] = useState('');

  const handleLog = async (e) => {
    e.preventDefault();
    const dateToLog = logDate ? new Date(logDate + 'T12:00:00Z').toISOString() : null;
    const success = await addTransaction(parseFloat(amount), categoryId, desc, 'Expense', dateToLog);
    if (success) {
      setCategoryId('');
      setAmount(''); 
      setDesc('');
      setLogDate(getLocalDateStr());
    }
  };

  const handleDeleteTransaction = async (id) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return;
    await deleteTransaction(id);
  };



  const startEditCategory = (cat) => {
    setEditingCatId(cat.id);
    setEditingCatName(cat.name);
    setEditingCatColor(cat.colorHex || '#CBD5E1');
    setEditingCatBudget(String(cat.monthlyBudget));
  };

  const cancelEditCategory = () => {
    setEditingCatId(null);
    setEditingCatName('');
    setEditingCatColor('#CBD5E1');
    setEditingCatBudget('');
  };

  const saveEditCategory = async (cat) => {
    const newBudget = parseFloat(editingCatBudget);
    if (!editingCatName.trim()) return;
    if (isNaN(newBudget) || newBudget < 0) return;

    const success = await updateCategory(cat.id, editingCatName.trim(), editingCatColor, newBudget);
    if (success) {
      cancelEditCategory();
    }
  };

  const handleEditCatKeyDown = (e, cat) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEditCategory(cat);
    } else if (e.key === 'Escape') {
      cancelEditCategory();
    }
  };

  // Total monthly budget editing
  const startEditMonthlyBudget = () => {
    setEditingMonthlyBudget(true);
    setMonthlyBudgetValue(String(summary.monthlyBudget || 0));
  };

  const cancelEditMonthlyBudget = () => {
    setEditingMonthlyBudget(false);
    setMonthlyBudgetValue('');
  };

  const saveMonthlyBudget = async () => {
    const newAmount = parseFloat(monthlyBudgetValue);
    if (isNaN(newAmount) || newAmount < 0) return;

    const success = await updateBudget(newAmount);
    if (success) {
      setEditingMonthlyBudget(false);
      setMonthlyBudgetValue('');
    }
  };

  const handleMonthlyBudgetKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveMonthlyBudget();
    } else if (e.key === 'Escape') {
      cancelEditMonthlyBudget();
    }
  };

  const catSummary = summary.categories || [];
  const totalBudget = summary.monthlyBudget || 0;
  const totalSpent = summary.totalSpent || 0;
  const remaining = totalBudget - totalSpent;
  const spentPct = totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0;

  const prevMonth = () => {
    const newMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const newYear = currentMonth === 1 ? currentYear - 1 : currentYear;
    setSearchParams({ month: newMonth, year: newYear }, { replace: true });
  };

  const nextMonth = () => {
    const newMonth = currentMonth === 12 ? 1 : currentMonth + 1;
    const newYear = currentMonth === 12 ? currentYear + 1 : currentYear;
    setSearchParams({ month: newMonth, year: newYear }, { replace: true });
  };

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-slate-50 text-slate-900">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-6">
            <h1 className="text-3xl font-bold text-slate-800">Financial Tracking</h1>
            <div className="flex bg-slate-200 p-1 rounded-lg">
              <button 
                onClick={() => setActiveTab('spending')}
                className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${activeTab === 'spending' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Spending & Budget
              </button>
              <button 
                onClick={() => setActiveTab('assets')}
                className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${activeTab === 'assets' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Assets & Net Worth
              </button>
            </div>
          </div>
          
          {activeTab === 'spending' && (
            <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
              <button onClick={prevMonth} className="p-1 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer" title="Previous Month">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
              </button>
              <span className="font-semibold text-slate-700 min-w-[120px] text-center">
                {monthNames[currentMonth - 1]} {currentYear}
              </span>
              <button onClick={nextMonth} className="p-1 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer" title="Next Month">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          )}
        </div>
        
        
        
        {activeTab === 'spending' ? (
          <>
            {/* Top Metrics */}
            <div className="grid grid-cols-3 gap-6 mb-8">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-slate-500">Total Spent</p>
                <p className="text-3xl font-semibold text-slate-800">₪{totalSpent.toFixed(2)}</p>
              </div>
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-slate-500 mb-1">Monthly Budget</p>
                {editingMonthlyBudget ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xl text-slate-400">₪</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={monthlyBudgetValue}
                      onChange={(e) => setMonthlyBudgetValue(e.target.value)}
                      onKeyDown={handleMonthlyBudgetKeyDown}
                      className="w-32 text-2xl font-semibold border border-indigo-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      autoFocus
                    />
                    <button
                      onClick={saveMonthlyBudget}
                      className="text-emerald-600 hover:text-emerald-700 font-bold text-lg px-1"
                      title="Save"
                    >
                      ✓
                    </button>
                    <button
                      onClick={cancelEditMonthlyBudget}
                      className="text-slate-400 hover:text-slate-600 font-bold text-lg px-1"
                      title="Cancel"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={startEditMonthlyBudget}
                    className="text-3xl font-semibold text-slate-800 hover:text-indigo-600 transition-colors cursor-pointer text-left"
                    title="Click to edit monthly budget"
                  >
                    ₪{totalBudget.toFixed(2)}
                  </button>
                )}
              </div>
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-slate-500">Remaining</p>
                <p className={`text-3xl font-semibold ${remaining < 0 ? 'text-red-500' : 'text-slate-800'}`}>₪{remaining.toFixed(2)}</p>
                {totalBudget > 0 && (
                  <div className="mt-3">
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all duration-500"
                        style={{
                          width: `${spentPct}%`,
                          backgroundColor: remaining < 0 ? '#EF4444' : '#6366F1'
                        }}
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{spentPct.toFixed(0)}% used</p>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-8">
              {/* Main Chart + Budget Breakdown */}
              <div className="col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h2 className="text-xl font-bold mb-4 text-slate-800">Budget vs Spend</h2>
                <div className="flex gap-6">
                  <div className="w-48 h-48 flex-shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={catSummary} dataKey="spent" nameKey="category.name" cx="50%" cy="50%" innerRadius={50} outerRadius={70}>
                          {catSummary.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.category.colorHex || '#CBD5E1'} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => `₪${value}`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 flex flex-col gap-3 overflow-y-auto max-h-64">
                    {catSummary.map((item) => {
                      const pct = item.category.monthlyBudget > 0
                        ? Math.min((item.spent / item.category.monthlyBudget) * 100, 100)
                        : 0;
                      const isOver = item.spent > item.category.monthlyBudget && item.category.monthlyBudget > 0;
                      const isEditing = editingCatId === item.category.id;

                      if (isEditing) {
                        return (
                          <div key={item.category.id} className="flex flex-col gap-2 p-3 bg-slate-50 rounded-lg border border-indigo-200">
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={editingCatColor}
                                onChange={(e) => setEditingCatColor(e.target.value)}
                                className="w-7 h-7 p-0.5 bg-white border border-slate-300 rounded cursor-pointer flex-shrink-0"
                                title="Category color"
                              />
                              <input
                                type="text"
                                value={editingCatName}
                                onChange={(e) => setEditingCatName(e.target.value)}
                                onKeyDown={(e) => handleEditCatKeyDown(e, item.category)}
                                className="flex-1 border border-indigo-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="Category name"
                                autoFocus
                              />
                              <div className="flex items-center gap-1">
                                <span className="text-slate-400 text-sm">₪</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={editingCatBudget}
                                  onChange={(e) => setEditingCatBudget(e.target.value)}
                                  onKeyDown={(e) => handleEditCatKeyDown(e, item.category)}
                                  className="w-20 border border-indigo-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                  placeholder="Budget"
                                />
                              </div>
                            </div>
                            <div className="flex justify-end gap-1">
                              <button
                                onClick={() => saveEditCategory(item.category)}
                                className="text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1 rounded transition-colors"
                              >
                                Save
                              </button>
                              <button
                                onClick={cancelEditCategory}
                                className="text-xs font-semibold text-slate-500 hover:text-slate-700 px-3 py-1 rounded transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div key={item.category.id} className="flex flex-col gap-1.5">
                          <div className="flex items-center justify-between">
                            <button
                              onClick={() => startEditCategory(item.category)}
                              className="flex items-center gap-2 hover:opacity-70 transition-opacity cursor-pointer"
                              title="Click to edit category"
                            >
                              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.category.colorHex || '#CBD5E1' }} />
                              <span className="text-sm font-medium text-slate-700">{item.category.name}</span>
                            </button>
                            <div className="flex items-center gap-1 text-sm">
                              <span className={`font-semibold ${isOver ? 'text-red-500' : 'text-slate-700'}`}>
                                ₪{item.spent.toFixed(0)}
                              </span>
                              <span className="text-slate-400">/</span>
                              <button
                                onClick={() => startEditCategory(item.category)}
                                className="text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
                                title="Click to edit category"
                              >
                                ₪{item.category.monthlyBudget.toFixed(0)}
                              </button>
                            </div>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2">
                            <div
                              className="h-2 rounded-full transition-all duration-300"
                              style={{
                                width: `${pct}%`,
                                backgroundColor: isOver ? '#EF4444' : (item.category.colorHex || '#CBD5E1')
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                    {catSummary.length === 0 && (
                      <p className="text-slate-400 text-sm italic">No categories yet. Create one to get started.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Log Form */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-6">
                <div>
                  <h2 className="text-xl font-bold mb-4 text-slate-800">Quick Log</h2>
                  <form onSubmit={handleLog} className="flex flex-col gap-4">
                    <input type="number" placeholder="Amount" value={amount} onChange={e=>setAmount(e.target.value)} className="bg-white border border-slate-300 rounded p-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" required />
                    <input type="date" value={logDate} onChange={e=>setLogDate(e.target.value)} className="bg-white border border-slate-300 rounded p-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" required />
                    <div className="relative">
                      <CategorySelector 
                        value={categoryId}
                        onChange={setCategoryId}
                        placeholder="Select Category..."
                      />
                    </div>
                    <input type="text" placeholder="Description" value={desc} onChange={e=>setDesc(e.target.value)} className="bg-white border border-slate-300 rounded p-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <button type="submit" disabled={!categoryId} className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Log Expense</button>
                  </form>
                </div>
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="mt-8 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h2 className="text-xl font-bold mb-4 text-slate-800">Recent Transactions</h2>
              <div className="flex flex-col gap-2">
                {transactions.map(tx => (
                  <div key={tx.id} className="group flex justify-between items-center p-3 bg-slate-50 rounded border border-slate-100 transition-colors hover:bg-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tx.category?.colorHex || '#CBD5E1' }}></div>
                      <span className="font-medium text-slate-800">{tx.description || 'No description'}</span>
                      <span className="text-sm text-slate-500">{tx.category?.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-semibold text-slate-800">₪{tx.amount.toFixed(2)}</span>
                      <button
                        onClick={() => handleDeleteTransaction(tx.id)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                        title="Delete transaction"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {transactions.length === 0 && <p className="text-slate-500">No transactions yet.</p>}
              </div>
            </div>
          </>
        ) : (
          <AssetsTab />
        )}
      </div>
    </div>
  );
}
