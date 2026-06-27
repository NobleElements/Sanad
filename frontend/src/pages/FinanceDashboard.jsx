import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useSearchParams } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import AssetsTab from './AssetsTab';
import useFinanceStore from '../store/useFinanceStore';
import useConfirmStore from '../store/useConfirmStore';
import CategorySelector from '../components/CategorySelector';
import usePageTitle from '../hooks/usePageTitle';

export default function FinanceDashboard() {
  usePageTitle('Finance');
  const [activeTab, setActiveTab] = useState('spending'); // 'spending' | 'assets'
  
  const [searchParams, setSearchParams] = useSearchParams();
  const urlMonth = searchParams.get('month') ? parseInt(searchParams.get('month'), 10) : new Date().getMonth() + 1;
  const urlYear = searchParams.get('year') ? parseInt(searchParams.get('year'), 10) : new Date().getFullYear();

  const { 
    currencies, categories, transactions, budgetSummary: summary, 
    currentMonth, currentYear, setDate, fetchFinanceData, isLoaded, addCurrency,
    addTransaction, updateTransaction, deleteTransaction, createCategory, updateCategory, updateBudget 
  } = useFinanceStore();
  const { showConfirm } = useConfirmStore();

  const defaultCurrency = currencies.find(c => c.isDefault) || { symbol: '$' };

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

  // setup state
  const [setupCode, setSetupCode] = useState('');
  const [setupName, setSetupName] = useState('');
  const [setupSymbol, setSetupSymbol] = useState('');

  const handleSetup = async (e) => {
    e.preventDefault();
    const success = await addCurrency(setupCode.toUpperCase(), setupName, setupSymbol, 1.0);
    if (success) {
      setSetupCode(''); setSetupName(''); setSetupSymbol('');
      // After this finishes, currencies will be updated and setup screen will disappear
    }
  };

  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [logDate, setLogDate] = useState(getLocalDateStr());

  // inline transaction editing state
  const [editingTxId, setEditingTxId] = useState(null);
  const [editingTxAmount, setEditingTxAmount] = useState('');

  const handleSaveTxAmount = async (tx) => {
    const parsed = parseFloat(editingTxAmount);
    if (isNaN(parsed) || parsed < 0) return;
    const success = await updateTransaction(tx.id, { amount: parsed });
    if (success) {
      setEditingTxId(null);
    }
  };

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
    showConfirm({
      title: 'Delete Transaction',
      message: 'Are you sure you want to delete this transaction?',
      confirmText: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        await deleteTransaction(id);
      }
    });
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

  if (isLoaded && currencies.length === 0) {
    return (
      <div className="flex-1 p-8 overflow-y-auto bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex items-center justify-center">
        <div className="max-w-md w-full bg-white dark:bg-slate-800 p-8 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm dark:text-slate-100">
          <h2 className="text-2xl font-bold mb-2 text-slate-800 dark:text-slate-200">Welcome to Finance</h2>
          <p className="text-slate-500 dark:text-slate-400 dark:text-slate-500 mb-6">Before you start tracking your finances, please configure your primary default currency.</p>
          <form onSubmit={handleSetup} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Code (e.g. USD)</label>
              <input type="text" value={setupCode} onChange={e=>setSetupCode(e.target.value)} className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:bg-slate-700 dark:text-slate-100" required maxLength={10} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Name (e.g. US Dollar)</label>
              <input type="text" value={setupName} onChange={e=>setSetupName(e.target.value)} className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:bg-slate-700 dark:text-slate-100" required maxLength={50} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Symbol (e.g. $)</label>
              <input type="text" value={setupSymbol} onChange={e=>setSetupSymbol(e.target.value)} className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:bg-slate-700 dark:text-slate-100" required maxLength={10} />
            </div>
            <button type="submit" className="mt-4 bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-600 dark:bg-indigo-500 text-white p-3 rounded font-semibold transition-colors">Set Default Currency</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 w-full lg:w-auto">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-200">Financial Tracking</h1>
            <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-lg">
              <button 
                onClick={() => setActiveTab('spending')}
                className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${activeTab === 'spending' ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
              >
                Spending & Budget
              </button>
              <button 
                onClick={() => setActiveTab('assets')}
                className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${activeTab === 'assets' ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
              >
                Assets & Net Worth
              </button>
            </div>
          </div>
          
          {activeTab === 'spending' && (
            <div className="w-full lg:w-auto flex justify-between lg:justify-start items-center gap-4 bg-white dark:bg-slate-800 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm dark:text-slate-100">
              <button onClick={prevMonth} className="p-1 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:text-slate-300 transition-colors cursor-pointer" title="Previous Month">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
              </button>
              <span className="font-semibold text-slate-700 dark:text-slate-300 min-w-[120px] text-center">
                {monthNames[currentMonth - 1]} {currentYear}
              </span>
              <button onClick={nextMonth} className="p-1 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:text-slate-300 transition-colors cursor-pointer" title="Next Month">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          )}
        </div>
        
        
        
        {activeTab === 'spending' ? (
          <>
            {/* Top Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8">
              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm dark:text-slate-100">
                <p className="text-slate-500 dark:text-slate-400 dark:text-slate-500">Total Spent</p>
                <p className="text-3xl font-semibold text-slate-800 dark:text-slate-200">{defaultCurrency.symbol}{totalSpent.toFixed(2)}</p>
              </div>
              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm dark:text-slate-100">
                <p className="text-slate-500 dark:text-slate-400 dark:text-slate-500 mb-1">Monthly Budget</p>
                {editingMonthlyBudget ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xl text-slate-400 dark:text-slate-500">{defaultCurrency.symbol}</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={monthlyBudgetValue}
                      onChange={(e) => setMonthlyBudgetValue(e.target.value)}
                      onKeyDown={handleMonthlyBudgetKeyDown}
                      className="w-32 text-2xl font-semibold border border-indigo-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-700 dark:text-slate-100"
                      autoFocus
                    />
                    <button
                      onClick={saveMonthlyBudget}
                      className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 font-bold text-lg px-1"
                      title="Save"
                    >
                      ✓
                    </button>
                    <button
                      onClick={cancelEditMonthlyBudget}
                      className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-400 dark:text-slate-500 font-bold text-lg px-1"
                      title="Cancel"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={startEditMonthlyBudget}
                    className="text-3xl font-semibold text-slate-800 dark:text-slate-200 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-400 dark:text-indigo-400 dark:hover:text-indigo-400 transition-colors cursor-pointer text-left"
                    title="Click to edit monthly budget"
                  >
                    {defaultCurrency.symbol}{totalBudget.toFixed(2)}
                  </button>
                )}
              </div>
              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm dark:text-slate-100">
                <p className="text-slate-500 dark:text-slate-400 dark:text-slate-500">Remaining</p>
                <p className={`text-3xl font-semibold ${remaining < 0 ? 'text-red-500 dark:text-red-400' : 'text-slate-800 dark:text-slate-200'}`}>{defaultCurrency.symbol}{remaining.toFixed(2)}</p>
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
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{spentPct.toFixed(0)}% used</p>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Chart + Budget Breakdown */}
              <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm dark:text-slate-100">
                <h2 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-200">Budget vs Spend</h2>
                <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
                  <div className="w-48 h-48 flex-shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={catSummary} dataKey="spent" nameKey="category.name" cx="50%" cy="50%" innerRadius={50} outerRadius={70}>
                          {catSummary.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.category.colorHex || '#CBD5E1'} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => `${defaultCurrency.symbol}${value}`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 flex flex-col gap-3 overflow-y-auto max-h-64" style={{scrollbarWidth: "none"}}>
                    {catSummary.map((item) => {
                      const pct = item.category.monthlyBudget > 0
                        ? Math.min((item.spent / item.category.monthlyBudget) * 100, 100)
                        : 0;
                      const isOver = item.spent > item.category.monthlyBudget && item.category.monthlyBudget > 0;
                      const isEditing = editingCatId === item.category.id;

                      if (isEditing) {
                        return (
                          <div key={item.category.id} className="flex flex-col gap-2 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-indigo-200 dark:text-slate-100">
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={editingCatColor}
                                onChange={(e) => setEditingCatColor(e.target.value)}
                                className="w-7 h-7 p-0.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded cursor-pointer flex-shrink-0 dark:text-slate-100"
                                title="Category color"
                              />
                              <input
                                type="text"
                                value={editingCatName}
                                onChange={(e) => setEditingCatName(e.target.value)}
                                onKeyDown={(e) => handleEditCatKeyDown(e, item.category)}
                                className="flex-1 border border-indigo-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-700 dark:text-slate-100"
                                placeholder="Category name"
                                autoFocus
                              />
                              <div className="flex items-center gap-1">
                                <span className="text-slate-400 dark:text-slate-500 text-sm">{defaultCurrency.symbol}</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={editingCatBudget}
                                  onChange={(e) => setEditingCatBudget(e.target.value)}
                                  onKeyDown={(e) => handleEditCatKeyDown(e, item.category)}
                                  className="w-20 border border-indigo-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-700 dark:text-slate-100"
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
                                className="text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:text-slate-300 px-3 py-1 rounded transition-colors"
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
                              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{item.category.name}</span>
                            </button>
                            <div className="flex items-center gap-1 text-sm">
                              <span className={`font-semibold ${isOver ? 'text-red-500 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'}`}>
                                {defaultCurrency.symbol}{item.spent.toFixed(0)}
                              </span>
                              <span className="text-slate-400 dark:text-slate-500">/</span>
                              <button
                                onClick={() => startEditCategory(item.category)}
                                className="text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-400 dark:text-indigo-400 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                                title="Click to edit category"
                              >
                                {defaultCurrency.symbol}{item.category.monthlyBudget.toFixed(0)}
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
                      <p className="text-slate-400 dark:text-slate-500 text-sm italic">No categories yet. Create one to get started.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Log Form */}
              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col gap-6 dark:text-slate-100">
                <div>
                  <h2 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-200">Quick Log</h2>
                  <form onSubmit={handleLog} className="flex flex-col gap-4">
                    <input type="number" placeholder="Amount" value={amount} onChange={e=>setAmount(e.target.value)} className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded p-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500" required />
                    <input type="date" value={logDate} onChange={e=>setLogDate(e.target.value)} className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded p-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500" required />
                    <div className="relative">
                      <CategorySelector 
                        value={categoryId}
                        onChange={setCategoryId}
                        placeholder="Select Category..."
                      />
                    </div>
                    <input type="text" placeholder="Description" value={desc} onChange={e=>setDesc(e.target.value)} className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded p-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <button type="submit" disabled={!categoryId} className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Log Expense</button>
                  </form>
                </div>
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="mt-8 bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm dark:text-slate-100">
              <h2 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-200">Recent Transactions</h2>
              <div className="flex flex-col gap-2">
                {transactions.map(tx => (
                  <div key={tx.id} className="group flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900 rounded border border-slate-100 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700 dark:text-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tx.category?.colorHex || '#CBD5E1' }}></div>
                      <span className="font-medium text-slate-800 dark:text-slate-200">{tx.description || 'No description'}</span>
                      <span className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">{tx.category?.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      {editingTxId === tx.id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 dark:text-slate-500">{defaultCurrency.symbol}</span>
                          <input
                              type="number"
                              value={editingTxAmount}
                              onChange={e => setEditingTxAmount(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') handleSaveTxAmount(tx); if (e.key === 'Escape') setEditingTxId(null); }}
                              className="w-24 border border-indigo-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-700 dark:text-slate-100"
                              autoFocus
                          />
                          <button onClick={() => handleSaveTxAmount(tx)} className="text-emerald-600 dark:text-emerald-400 font-bold px-2">✓</button>
                          <button onClick={() => setEditingTxId(null)} className="text-slate-400 dark:text-slate-500 font-bold px-1">✕</button>
                        </div>
                      ) : (
                        <button 
                            onClick={() => { setEditingTxId(tx.id); setEditingTxAmount(String(tx.amount)); }}
                            className="text-xl font-semibold text-slate-800 dark:text-slate-200 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-400 dark:text-indigo-400 dark:hover:text-indigo-400 transition-colors cursor-pointer flex flex-col items-end"
                            title="Click to update amount"
                        >
                            <span>{defaultCurrency.symbol}{tx.amount.toFixed(2)}</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteTransaction(tx.id)}
                        className="hidden md:block opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 dark:text-slate-500 hover:text-red-600 dark:text-red-400 hover:bg-red-50 dark:bg-red-500/10 rounded transition-all"
                        title="Delete transaction"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {transactions.length === 0 && <p className="text-slate-500 dark:text-slate-400 dark:text-slate-500">No transactions yet.</p>}
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
