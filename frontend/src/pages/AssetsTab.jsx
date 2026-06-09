import { useState, useEffect, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Trash2 } from 'lucide-react';

export default function AssetsTab() {
  const [assets, setAssets] = useState([]);
  const [history, setHistory] = useState([]);
  const [chartLines, setChartLines] = useState([]);
  const [error, setError] = useState(null);
  
  // New asset form
  const [name, setName] = useState('');
  const [type, setType] = useState('Cash');
  const [amount, setAmount] = useState('');

  // Editing state
  const [editingId, setEditingId] = useState(null);
  const [editingAmount, setEditingAmount] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [assetsRes, histRes] = await Promise.all([
        fetch('/api/finances/assets'),
        fetch('/api/finances/assets/history')
      ]);
      if (!assetsRes.ok || !histRes.ok) throw new Error('Failed to load assets');
      
      const [assetsData, histData] = await Promise.all([
        assetsRes.json(),
        histRes.json()
      ]);
      setAssets(assetsData);
      
      // Process history data for the chart
      const pointsMap = new Map();
      const assetLatestValue = {};
      const allAssetNames = new Set();
      
      histData.forEach(snapshot => {
        const dateStr = new Date(snapshot.recordedAt).toLocaleDateString();
        const name = snapshot.assetName || snapshot.assetId;
        
        assetLatestValue[name] = snapshot.amount;
        allAssetNames.add(name);
        
        const totalNetWorth = Object.values(assetLatestValue).reduce((a, b) => a + b, 0);
        const point = { date: dateStr, netWorth: totalNetWorth };
        
        Object.entries(assetLatestValue).forEach(([k, v]) => {
          point[k] = v;
        });
        
        // Overwrite so we keep the latest values for that specific date
        pointsMap.set(dateStr, point);
      });

      setChartLines(Array.from(allAssetNames));
      setHistory(Array.from(pointsMap.values()));
    } catch (err) {
      console.error(err);
      setError('Failed to load data.');
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/finances/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type, currentAmount: parseFloat(amount) })
      });
      if (!res.ok) throw new Error('Failed to create asset');
      setName(''); setType('Cash'); setAmount('');
      loadData();
    } catch (err) {
      console.error(err);
      setError('Failed to add asset.');
    }
  };

  const saveEdit = async (asset) => {
    const newAmount = parseFloat(editingAmount);
    if (isNaN(newAmount) || newAmount < 0) return;
    
    try {
      const res = await fetch(`/api/finances/assets/${asset.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...asset, currentAmount: newAmount })
      });
      if (!res.ok) throw new Error('Failed to update asset');
      setEditingId(null);
      loadData();
    } catch (err) {
      console.error(err);
      setError('Failed to update asset.');
    }
  };

  const deleteAsset = async (id) => {
    if (!confirm('Are you sure you want to delete this asset?')) return;
    try {
      const res = await fetch(`/api/finances/assets/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete asset');
      loadData();
    } catch (err) {
      console.error(err);
      setError('Failed to delete asset.');
    }
  };

  const totalAssetsValue = assets.reduce((sum, a) => sum + a.currentAmount, 0);

  return (
    <div className="flex flex-col gap-8">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Top Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm md:col-span-1">
          <p className="text-slate-500">Total Net Worth</p>
          <p className="text-4xl font-bold text-slate-800 mt-2">₪{totalAssetsValue.toFixed(2)}</p>
          <p className="text-sm text-slate-400 mt-2">Across {assets.length} active assets</p>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm md:col-span-2">
            <h2 className="text-lg font-bold mb-4 text-slate-800">Net Worth Over Time</h2>
            <div className="h-48 w-full">
                {history.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={history}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis dataKey="date" stroke="#94A3B8" fontSize={12} tickMargin={10} minTickGap={30} />
                        <YAxis stroke="#94A3B8" fontSize={12} tickFormatter={(value) => `₪${value}`} width={80} />
                        <Tooltip formatter={(value, name) => [`₪${value}`, name === 'netWorth' ? 'Net Worth' : name]} labelStyle={{ color: '#1E293B' }} />
                        <Line type="monotone" dataKey="netWorth" stroke="#6366F1" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                        {chartLines.map((name, index) => {
                            const colors = ['#10B981', '#F59E0B', '#3B82F6', '#EC4899', '#8B5CF6', '#14B8A6', '#F43F5E'];
                            return (
                                <Line 
                                    key={name} 
                                    type="monotone" 
                                    dataKey={name} 
                                    stroke={colors[index % colors.length]} 
                                    strokeWidth={2} 
                                    dot={{ r: 2 }} 
                                    activeDot={{ r: 4 }} 
                                />
                            );
                        })}
                    </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex items-center justify-center text-slate-400 italic">No history available yet.</div>
                )}
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h2 className="text-xl font-bold mb-4 text-slate-800">Your Assets</h2>
            <div className="flex flex-col gap-3">
                {assets.map(asset => {
                    const isEditing = editingId === asset.id;
                    return (
                        <div key={asset.id} className="group flex justify-between items-center p-4 bg-slate-50 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors">
                            <div>
                                <h3 className="font-semibold text-slate-800 text-lg">{asset.name}</h3>
                                <p className="text-sm text-slate-500">{asset.type}</p>
                            </div>
                            <div className="flex items-center gap-4">
                                {isEditing ? (
                                    <div className="flex items-center gap-2">
                                        <span className="text-slate-400">₪</span>
                                        <input
                                            type="number"
                                            value={editingAmount}
                                            onChange={e => setEditingAmount(e.target.value)}
                                            onKeyDown={e => { if (e.key === 'Enter') saveEdit(asset); if (e.key === 'Escape') setEditingId(null); }}
                                            className="w-24 border border-indigo-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            autoFocus
                                        />
                                        <button onClick={() => saveEdit(asset)} className="text-emerald-600 font-bold px-2">✓</button>
                                        <button onClick={() => setEditingId(null)} className="text-slate-400 font-bold px-1">✕</button>
                                    </div>
                                ) : (
                                    <button 
                                        onClick={() => { setEditingId(asset.id); setEditingAmount(String(asset.currentAmount)); }}
                                        className="text-xl font-semibold text-slate-800 hover:text-indigo-600 transition-colors cursor-pointer"
                                        title="Click to update amount"
                                    >
                                        ₪{asset.currentAmount.toFixed(2)}
                                    </button>
                                )}
                                <button
                                    onClick={() => deleteAsset(asset.id)}
                                    className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    );
                })}
                {assets.length === 0 && <p className="text-slate-500 italic text-center py-4">You have not added any assets yet.</p>}
            </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-fit">
            <h2 className="text-xl font-bold mb-4 text-slate-800">Add Asset</h2>
            <form onSubmit={handleAdd} className="flex flex-col gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                    <input type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Chase Checking" className="w-full bg-white border border-slate-300 rounded p-2 text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none" required />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                    <select value={type} onChange={e=>setType(e.target.value)} className="w-full bg-white border border-slate-300 rounded p-2 text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                        <option value="Cash">Cash</option>
                        <option value="Bank Account">Bank Account</option>
                        <option value="Gold">Gold</option>
                        <option value="Card">Card</option>
                        <option value="Investment">Investment</option>
                        <option value="Crypto">Crypto</option>
                        <option value="Other">Other</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Initial Amount (₪)</label>
                    <input type="number" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0.00" className="w-full bg-white border border-slate-300 rounded p-2 text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none" required />
                </div>
                <button type="submit" className="mt-2 bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded font-semibold transition-colors">Add Asset</button>
            </form>
        </div>
      </div>
    </div>
  );
}
