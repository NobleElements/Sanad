import { useState } from 'react';
import { Trash2, Star } from 'lucide-react';
import useFinanceStore from '../store/useFinanceStore';

export default function CurrencyManager() {
  const { currencies, addCurrency, updateCurrency, deleteCurrency, setDefaultCurrency } = useFinanceStore();

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [rate, setRate] = useState('');

  const [editingId, setEditingId] = useState(null);
  const [editRate, setEditRate] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editName, setEditName] = useState('');
  const [editSymbol, setEditSymbol] = useState('');

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
    const success = await updateCurrency(currency.id, editCode.toUpperCase(), editName, editSymbol, parsedRate);
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
                <div key={c.id} className="flex flex-col p-3 bg-slate-50 rounded border border-slate-100 transition-colors hover:border-slate-300">
                  {isEditing ? (
                     <div className="flex flex-col gap-3">
                        <div className="flex gap-2">
                          <input type="text" value={editCode} onChange={e=>setEditCode(e.target.value)} className="w-16 border border-indigo-300 rounded px-2 py-1 text-sm focus:outline-none" placeholder="Code" maxLength={10} />
                          <input type="text" value={editSymbol} onChange={e=>setEditSymbol(e.target.value)} className="w-12 border border-indigo-300 rounded px-2 py-1 text-sm focus:outline-none" placeholder="Sym" maxLength={10} />
                          <input type="text" value={editName} onChange={e=>setEditName(e.target.value)} className="flex-1 border border-indigo-300 rounded px-2 py-1 text-sm focus:outline-none" placeholder="Name" maxLength={50} />
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            step="0.0001"
                            value={editRate}
                            onChange={e => setEditRate(e.target.value)}
                            className="w-24 border border-indigo-300 rounded px-2 py-1 text-sm focus:outline-none"
                            disabled={c.isDefault}
                          />
                          <span className="text-xs text-slate-500 font-medium">rate to {defaultCurrency?.code}</span>
                          <div className="flex-1"></div>
                          <button onClick={() => handleSaveEdit(c)} className="text-emerald-700 font-semibold px-3 py-1 bg-emerald-100 hover:bg-emerald-200 rounded text-sm transition-colors">Save</button>
                          <button onClick={() => setEditingId(null)} className="text-slate-600 font-semibold px-3 py-1 bg-slate-200 hover:bg-slate-300 rounded text-sm transition-colors">Cancel</button>
                        </div>
                     </div>
                  ) : (
                    <div className="flex justify-between items-center w-full">
                      <div className="flex items-center gap-3 cursor-pointer group" onClick={() => { setEditingId(c.id); setEditCode(c.code); setEditName(c.name); setEditSymbol(c.symbol); setEditRate(String(c.exchangeRateToDefault)); }}>
                        <span className="font-bold text-slate-700 w-8">{c.symbol}</span>
                        <div>
                          <div className="font-semibold text-slate-800 flex items-center gap-2">
                            {c.code}
                            {c.isDefault && <span className="bg-indigo-100 text-indigo-800 text-xs px-2 py-0.5 rounded-full font-medium">Default</span>}
                          </div>
                          <div className="text-sm text-slate-500 group-hover:text-indigo-600 transition-colors">{c.name}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="text-sm text-slate-600 font-medium cursor-pointer hover:text-indigo-600" onClick={() => { setEditingId(c.id); setEditCode(c.code); setEditName(c.name); setEditSymbol(c.symbol); setEditRate(String(c.exchangeRateToDefault)); }}>
                          {c.isDefault ? '1.00' : Number(c.exchangeRateToDefault).toFixed(2)} {defaultCurrency?.code}
                        </div>

                        <div className="hidden md:flex items-center gap-2">
                          {!c.isDefault && (
                            <button onClick={() => setDefaultCurrency(c.id)} title="Make Default" className="text-indigo-400 hover:text-indigo-600 transition-colors p-1">
                              <Star className="w-4 h-4" />
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
                  )}
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
