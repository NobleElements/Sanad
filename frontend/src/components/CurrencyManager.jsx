import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import useFinanceStore from '../store/useFinanceStore';

export default function CurrencyManager() {
  const { currencies, addCurrency, updateCurrency, deleteCurrency, setDefaultCurrency } = useFinanceStore();

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [rate, setRate] = useState('');

  const [editingId, setEditingId] = useState(null);
  const [editRate, setEditRate] = useState('');

  const handleAdd = async (e) => {
    e.preventDefault();
    const parsedRate = parseFloat(rate);
    if (isNaN(parsedRate) || parsedRate <= 0) return;
    const success = await addCurrency(code.toUpperCase(), name, symbol, parsedRate);
    if (success) {
      setCode(''); setName(''); setSymbol(''); setRate('');
    }
  };

  const handleSaveEdit = async (currency) => {
    const parsedRate = parseFloat(editRate);
    if (isNaN(parsedRate) || parsedRate <= 0) return;
    const success = await updateCurrency(currency.id, currency.code, currency.name, currency.symbol, parsedRate);
    if (success) setEditingId(null);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this currency?')) return;
    await deleteCurrency(id);
  };

  const defaultCurrency = currencies.find(c => c.isDefault);

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mt-8">
      <h2 className="text-xl font-bold mb-4 text-slate-800">Currencies</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <div className="flex flex-col gap-3">
            {currencies.map(c => {
              const isEditing = editingId === c.id;
              return (
                <div key={c.id} className="flex justify-between items-center p-3 bg-slate-50 rounded border border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-700 w-8">{c.symbol}</span>
                    <div>
                      <div className="font-semibold text-slate-800 flex items-center gap-2">
                        {c.code}
                        {c.isDefault && <span className="bg-indigo-100 text-indigo-800 text-xs px-2 py-0.5 rounded-full font-medium">Default</span>}
                      </div>
                      <div className="text-sm text-slate-500">{c.name}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {isEditing ? (
                       <div className="flex items-center gap-2">
                          <input
                            type="number"
                            step="0.0001"
                            value={editRate}
                            onChange={e => setEditRate(e.target.value)}
                            className="w-24 border border-indigo-300 rounded px-2 py-1 text-sm focus:outline-none"
                            autoFocus
                          />
                          <button onClick={() => handleSaveEdit(c)} className="text-emerald-600 font-bold px-1">✓</button>
                          <button onClick={() => setEditingId(null)} className="text-slate-400 font-bold px-1">✕</button>
                       </div>
                    ) : (
                      <div className="text-sm text-slate-600 font-medium cursor-pointer hover:text-indigo-600" onClick={() => !c.isDefault && (setEditingId(c.id), setEditRate(String(c.exchangeRateToDefault)))}>
                        {c.isDefault ? '1.0000' : Number(c.exchangeRateToDefault).toFixed(4)} {defaultCurrency?.code}
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      {!c.isDefault && (
                        <button onClick={() => setDefaultCurrency(c.id)} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium px-2 py-1 bg-indigo-50 hover:bg-indigo-100 rounded transition-colors">
                          Make Default
                        </button>
                      )}
                      {!c.isDefault && (
                        <button onClick={() => handleDelete(c.id)} className="text-slate-400 hover:text-red-600 transition-colors p-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-slate-700 mb-3">Add Currency</h3>
          <form onSubmit={handleAdd} className="flex flex-col gap-3">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-500 mb-1">Code (e.g. JOD)</label>
                <input type="text" value={code} onChange={e=>setCode(e.target.value)} className="w-full border border-slate-300 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" required maxLength={10} />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-500 mb-1">Symbol (e.g. JD)</label>
                <input type="text" value={symbol} onChange={e=>setSymbol(e.target.value)} className="w-full border border-slate-300 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" required maxLength={10} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Name</label>
              <input type="text" value={name} onChange={e=>setName(e.target.value)} className="w-full border border-slate-300 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" required maxLength={50} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Exchange Rate (1 {code || 'X'} = ? {defaultCurrency?.code || 'Default'})</label>
              <input type="number" step="0.000001" value={rate} onChange={e=>setRate(e.target.value)} className="w-full border border-slate-300 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" required />
            </div>
            <button type="submit" className="bg-slate-800 hover:bg-slate-900 text-white p-2 rounded text-sm font-semibold transition-colors mt-1">Add Currency</button>
          </form>
        </div>
      </div>
    </div>
  );
}
