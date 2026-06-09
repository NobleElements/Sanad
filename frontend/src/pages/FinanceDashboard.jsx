import { useState, useEffect, useCallback } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5186/api';

export default function FinanceDashboard() {
  const [summary, setSummary] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState(null);
  
  // form state
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [desc, setDesc] = useState('');

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [sumRes, catRes, txRes] = await Promise.all([
        fetch(`${API_URL}/finances/summary`),
        fetch(`${API_URL}/finances/categories`),
        fetch(`${API_URL}/finances/transactions`)
      ]);

      if (!sumRes.ok || !catRes.ok || !txRes.ok) {
        throw new Error('Failed to load financial data');
      }

      const [sumData, catData, txData] = await Promise.all([
        sumRes.json(),
        catRes.json(),
        txRes.json()
      ]);

      setSummary(sumData);
      setCategories(catData);
      setTransactions(txData);
    } catch (err) {
      console.error(err);
      setError('Failed to load data. Please try again later.');
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleLog = async (e) => {
    e.preventDefault();
    try {
      setError(null);
      const res = await fetch(`${API_URL}/finances/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(amount),
          categoryId,
          description: desc,
          type: 'Expense',
          date: new Date().toISOString()
        })
      });
      
      if (!res.ok) {
        throw new Error('Failed to log expense');
      }

      setAmount(''); 
      setDesc('');
      loadData();
    } catch (err) {
      console.error(err);
      setError('Failed to log expense. Please try again.');
    }
  };

  const totalBudget = summary.reduce((acc, curr) => acc + curr.category.monthlyBudget, 0);
  const totalSpent = summary.reduce((acc, curr) => acc + curr.spent, 0);

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-slate-50 text-slate-900">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-slate-800">Financial Tracking</h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}
        
        {/* Top Metrics */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-slate-500">Total Spent</p>
            <p className="text-3xl font-semibold text-slate-800">${totalSpent.toFixed(2)}</p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-slate-500">Total Budget</p>
            <p className="text-3xl font-semibold text-slate-800">${totalBudget.toFixed(2)}</p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-slate-500">Remaining</p>
            <p className={`text-3xl font-semibold ${totalBudget - totalSpent < 0 ? 'text-red-500' : 'text-slate-800'}`}>${(totalBudget - totalSpent).toFixed(2)}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-8">
          {/* Main Chart Area */}
          <div className="col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h2 className="text-xl font-bold mb-4 text-slate-800">Budget vs Spend</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={summary} dataKey="spent" nameKey="category.name" cx="50%" cy="50%" innerRadius={60} outerRadius={80}>
                    {summary.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.category.colorHex || '#CBD5E1'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `$${value}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quick Log Form */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h2 className="text-xl font-bold mb-4 text-slate-800">Quick Log</h2>
            <form onSubmit={handleLog} className="flex flex-col gap-4">
              <input type="number" placeholder="Amount" value={amount} onChange={e=>setAmount(e.target.value)} className="bg-white border border-slate-300 rounded p-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" required />
              <select value={categoryId} onChange={e=>setCategoryId(e.target.value)} className="bg-white border border-slate-300 rounded p-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                <option value="">Select Category...</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input type="text" placeholder="Description" value={desc} onChange={e=>setDesc(e.target.value)} className="bg-white border border-slate-300 rounded p-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded font-semibold transition-colors">Log Expense</button>
            </form>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="mt-8 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h2 className="text-xl font-bold mb-4 text-slate-800">Recent Transactions</h2>
          <div className="flex flex-col gap-2">
            {transactions.map(tx => (
              <div key={tx.id} className="flex justify-between items-center p-3 bg-slate-50 rounded border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tx.category?.colorHex || '#CBD5E1' }}></div>
                  <span className="font-medium text-slate-800">{tx.description || 'No description'}</span>
                  <span className="text-sm text-slate-500">{tx.category?.name}</span>
                </div>
                <span className="font-semibold text-slate-800">${tx.amount.toFixed(2)}</span>
              </div>
            ))}
            {transactions.length === 0 && <p className="text-slate-500">No transactions yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
