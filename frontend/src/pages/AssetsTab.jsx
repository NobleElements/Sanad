import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Trash2, GripVertical } from 'lucide-react';
import useFinanceStore from '../store/useFinanceStore';
import CurrencyManager from '../components/CurrencyManager';

export default function AssetsTab() {
  const { assets, currencies, assetHistory: history, assetChartLines: chartLines, fetchAssets, addAsset, updateAsset, deleteAsset: storeDeleteAsset, isLoaded } = useFinanceStore();
  
  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);
  
  // New asset form
  const [name, setName] = useState('');
  const [type, setType] = useState('Cash');
  const [amount, setAmount] = useState('');
  const [currencyId, setCurrencyId] = useState('');
  const [icon, setIcon] = useState('');

  // Editing state (inline amount)
  const [editingId, setEditingId] = useState(null);
  const [editingAmount, setEditingAmount] = useState('');

  // Editing full asset state (in widget)
  const [editingFullAsset, setEditingFullAsset] = useState(null);

  const handleEditFullAsset = (asset) => {
    setEditingFullAsset(asset.id);
    setName(asset.name);
    setType(asset.type);
    setAmount(String(asset.currentAmount));
    setCurrencyId(asset.currencyId || '');
    setIcon(asset.icon || '');
  };

  const clearForm = () => {
    setEditingFullAsset(null);
    setName(''); setType('Cash'); setAmount(''); setCurrencyId(''); setIcon('');
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    
    const sourceIndex = result.source.index;
    const destIndex = result.destination.index;
    
    if (sourceIndex === destIndex) return;
    
    const orderedIds = Array.from(assets.map(a => a.id));
    const [movedId] = orderedIds.splice(sourceIndex, 1);
    orderedIds.splice(destIndex, 0, movedId);
    
    useFinanceStore.getState().reorderAssets(orderedIds);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingFullAsset) {
      const assetToUpdate = assets.find(a => a.id === editingFullAsset);
      if (assetToUpdate) {
        const updatedAssetObj = {
            ...assetToUpdate,
            name,
            type,
            currencyId: currencyId || null,
            icon: icon || null
        };
        const success = await updateAsset(updatedAssetObj, parseFloat(amount));
        if (success) clearForm();
      }
    } else {
      const success = await addAsset(name, type, parseFloat(amount), currencyId || null, icon || null);
      if (success) clearForm();
    }
  };

  const saveEdit = async (asset) => {
    const newAmount = parseFloat(editingAmount);
    if (isNaN(newAmount) || newAmount < 0) return;
    
    const success = await updateAsset(asset, newAmount);
    if (success) {
      setEditingId(null);
    }
  };

  const deleteAsset = async (id) => {
    if (!confirm('Are you sure you want to delete this asset?')) return;
    await storeDeleteAsset(id);
  };

  const defaultCurrency = currencies.find(c => c.isDefault) || { symbol: '$' };
  const totalAssetsValue = assets.reduce((sum, a) => sum + (a.currentAmount * (a.currency?.exchangeRateToDefault || 1)), 0);

  return (
    <div className="flex flex-col gap-8">

      {/* Top Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm md:col-span-1">
          <p className="text-slate-500">Total Net Worth</p>
          <p className="text-4xl font-bold text-slate-800 mt-2">{defaultCurrency.symbol}{totalAssetsValue.toFixed(2)}</p>
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
                        <YAxis stroke="#94A3B8" fontSize={12} tickFormatter={(value) => `${defaultCurrency.symbol}${value}`} width={80} />
                        <Tooltip formatter={(value, name) => [`${defaultCurrency.symbol}${value}`, name === 'netWorth' ? 'Net Worth' : name]} labelStyle={{ color: '#1E293B' }} />
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
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="assets">
                {(provided) => (
                  <div className="flex flex-col gap-3" {...provided.droppableProps} ref={provided.innerRef}>
                    {assets.map((asset, index) => {
                        const isEditing = editingId === asset.id;
                        return (
                          <Draggable key={asset.id} draggableId={asset.id} index={index}>
                            {(provided, snapshot) => (
                              <div 
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`group flex justify-between items-center p-4 rounded-lg border transition-all ${snapshot.isDragging ? 'bg-indigo-50 border-indigo-200 shadow-md scale-[1.01]' : 'bg-slate-50 border-slate-100 hover:border-slate-200'}`}
                              >
                                <div className="flex items-center gap-3">
                                  <div {...provided.dragHandleProps} className="text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing">
                                    <GripVertical size={20} />
                                  </div>
                                  <div 
                                      className="flex items-center gap-3 cursor-pointer group-hover:opacity-80" 
                                      onClick={() => handleEditFullAsset(asset)}
                                      title="Click to edit asset details"
                                  >
                                      {asset.icon && <span className="text-2xl">{asset.icon}</span>}
                                      <div>
                                          <h3 className="font-semibold text-slate-800 text-lg group-hover:text-indigo-600 transition-colors">{asset.name}</h3>
                                          <p className="text-sm text-slate-500">{asset.type}</p>
                                      </div>
                                  </div>
                                </div>
                            <div className="flex items-center gap-4">
                                {isEditing ? (
                                    <div className="flex items-center gap-2">
                                        <span className="text-slate-400">{asset.currency?.symbol || defaultCurrency.symbol}</span>
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
                                        className="text-xl font-semibold text-slate-800 hover:text-indigo-600 transition-colors cursor-pointer flex flex-col items-end"
                                        title="Click to update amount"
                                    >
                                        <span>{asset.currency?.symbol || defaultCurrency.symbol}{asset.currentAmount.toFixed(2)}</span>
                                        {!asset.currency?.isDefault && asset.currency?.exchangeRateToDefault && (
                                          <span className="text-xs text-slate-400 font-normal">
                                            ≈ {defaultCurrency.symbol}{(asset.currentAmount * asset.currency.exchangeRateToDefault).toFixed(2)}
                                          </span>
                                        )}
                                    </button>
                                )}
                                <button
                                    onClick={() => deleteAsset(asset.id)}
                                    className="hidden md:block opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
                {assets.length === 0 && <p className="text-slate-500 italic text-center py-4">You have not added any assets yet.</p>}
              </div>
            )}
          </Droppable>
        </DragDropContext>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-fit">
            <h2 className="text-xl font-bold mb-4 text-slate-800">{editingFullAsset ? 'Update Asset' : 'Add Asset'}</h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
                <div className="flex gap-4">
                  <div className="flex-1">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Currency</label>
                      <select value={currencyId} onChange={e=>setCurrencyId(e.target.value)} className="w-full bg-white border border-slate-300 rounded p-2 text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                          <option value="">{defaultCurrency.name || 'Default'} ({defaultCurrency.code})</option>
                          {currencies.filter(c => !c.isDefault).map(c => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
                      </select>
                  </div>
                  <div className="flex-1">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Icon (Emoji)</label>
                      <input type="text" value={icon} onChange={e=>setIcon(e.target.value)} placeholder="💰" className="w-full bg-white border border-slate-300 rounded p-2 text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none" maxLength={10} />
                  </div>
                </div>
                {!editingFullAsset && (
                  <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Initial Amount</label>
                      <input type="number" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0.00" className="w-full bg-white border border-slate-300 rounded p-2 text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none" required />
                  </div>
                )}
                <div className="flex gap-2 mt-2">
                  <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded font-semibold transition-colors">
                    {editingFullAsset ? 'Update Asset' : 'Add Asset'}
                  </button>
                  {editingFullAsset && (
                    <button type="button" onClick={clearForm} className="px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded font-semibold transition-colors">
                      Cancel
                    </button>
                  )}
                </div>
            </form>
        </div>
      </div>
      
      <CurrencyManager />
    </div>
  );
}
