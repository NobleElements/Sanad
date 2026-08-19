import { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Trash2, GripVertical, TrendingUp, TrendingDown, Landmark, CreditCard } from 'lucide-react';
import useFinanceStore from '../store/useFinanceStore';
import useConfirmStore from '../store/useConfirmStore';
import useUIStore from '../store/useUIStore';
import CurrencyManager from '../components/CurrencyManager';

export default function AssetsTab() {
  const { 
    assets, debts = [], currencies, assetHistory: history, assetChartLines: chartLines, 
    fetchAssets, addAsset, updateAsset, deleteAsset: storeDeleteAsset,
    addDebt, updateDebt, deleteDebt: storeDeleteDebt, reorderAssets, reorderDebts
  } = useFinanceStore();
  const { showConfirm } = useConfirmStore();
  const isOffline = useUIStore(state => state.isOffline);
  
  const formRef = useRef(null);
  const nameInputRef = useRef(null);
  const assetsSectionRef = useRef(null);
  const debtsSectionRef = useRef(null);
  
  const scrollToAssets = () => {
    assetsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const scrollToDebts = () => {
    debtsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  
  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);
  
  // Form Type: 'asset' | 'debt'
  const [formType, setFormType] = useState('asset');

  // Asset/Debt form fields
  const [name, setName] = useState('');
  const [type, setType] = useState('Cash');
  const [amount, setAmount] = useState('');
  const [currencyId, setCurrencyId] = useState('');
  const [icon, setIcon] = useState('');

  // Inline editing state for amounts
  const [editingAssetId, setEditingAssetId] = useState(null);
  const [editingAssetAmount, setEditingAssetAmount] = useState('');

  const [editingDebtId, setEditingDebtId] = useState(null);
  const [editingDebtAmount, setEditingDebtAmount] = useState('');

  // Editing full item state in widget
  const [editingFullAsset, setEditingFullAsset] = useState(null);
  const [editingFullDebt, setEditingFullDebt] = useState(null);

  const scrollToForm = () => {
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 150);
    }
  };

  const handleEditFullAsset = (asset) => {
    setFormType('asset');
    setEditingFullDebt(null);
    setEditingFullAsset(asset.id);
    setName(asset.name);
    setType(asset.type);
    setAmount(String(asset.currentAmount));
    setCurrencyId(asset.currencyId || '');
    setIcon(asset.icon || '');
    scrollToForm();
  };

  const handleEditFullDebt = (debt) => {
    setFormType('debt');
    setEditingFullAsset(null);
    setEditingFullDebt(debt.id);
    setName(debt.name);
    setType(debt.type);
    setAmount(String(debt.currentAmount));
    setCurrencyId(debt.currencyId || '');
    setIcon(debt.icon || '');
    scrollToForm();
  };

  const clearForm = () => {
    setEditingFullAsset(null);
    setEditingFullDebt(null);
    setName('');
    setType(formType === 'asset' ? 'Cash' : 'Loan');
    setAmount('');
    setCurrencyId('');
    setIcon('');
  };

  const handleSwitchFormType = (newType) => {
    setFormType(newType);
    setEditingFullAsset(null);
    setEditingFullDebt(null);
    setName('');
    setType(newType === 'asset' ? 'Cash' : 'Loan');
    setAmount('');
    setCurrencyId('');
    setIcon('');
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    
    const sourceIndex = result.source.index;
    const destIndex = result.destination.index;
    if (sourceIndex === destIndex) return;

    if (result.source.droppableId === 'assets') {
      const orderedIds = Array.from(assets.map(a => a.id));
      const [movedId] = orderedIds.splice(sourceIndex, 1);
      orderedIds.splice(destIndex, 0, movedId);
      reorderAssets(orderedIds);
    } else if (result.source.droppableId === 'debts') {
      const orderedIds = Array.from(debts.map(d => d.id));
      const [movedId] = orderedIds.splice(sourceIndex, 1);
      orderedIds.splice(destIndex, 0, movedId);
      reorderDebts(orderedIds);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formType === 'asset') {
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
    } else {
      if (editingFullDebt) {
        const debtToUpdate = debts.find(d => d.id === editingFullDebt);
        if (debtToUpdate) {
          const updatedDebtObj = {
            ...debtToUpdate,
            name,
            type,
            currencyId: currencyId || null,
            icon: icon || null
          };
          const success = await updateDebt(updatedDebtObj, parseFloat(amount));
          if (success) clearForm();
        }
      } else {
        const success = await addDebt(name, type, parseFloat(amount), currencyId || null, icon || null);
        if (success) clearForm();
      }
    }
  };

  const saveEditAsset = async (asset) => {
    const newAmount = parseFloat(editingAssetAmount);
    if (isNaN(newAmount) || newAmount < 0) return;
    
    const success = await updateAsset(asset, newAmount);
    if (success) {
      setEditingAssetId(null);
    }
  };

  const saveEditDebt = async (debt) => {
    const newAmount = parseFloat(editingDebtAmount);
    if (isNaN(newAmount) || newAmount < 0) return;
    
    const success = await updateDebt(debt, newAmount);
    if (success) {
      setEditingDebtId(null);
    }
  };

  const deleteAsset = async (id) => {
    showConfirm({
      title: 'Delete Asset',
      message: 'Are you sure you want to delete this asset?',
      confirmText: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        await storeDeleteAsset(id);
      }
    });
  };

  const deleteDebt = async (id) => {
    showConfirm({
      title: 'Delete Debt',
      message: 'Are you sure you want to delete this debt?',
      confirmText: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        await storeDeleteDebt(id);
      }
    });
  };

  const defaultCurrency = currencies.find(c => c.isDefault) || { symbol: '$' };
  const totalAssetsValue = assets.reduce((sum, a) => sum + (a.currentAmount * (a.currency?.exchangeRateToDefault || 1)), 0);
  const totalDebtsValue = debts.reduce((sum, d) => sum + (d.currentAmount * (d.currency?.exchangeRateToDefault || 1)), 0);
  const totalNetWorth = totalAssetsValue - totalDebtsValue;

  return (
    <div className="flex flex-col gap-8">

      {/* Top Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm md:col-span-1 dark:text-slate-100 flex flex-col justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Net Worth</p>
            <p className={`text-4xl font-bold mt-2 ${totalNetWorth < 0 ? 'text-red-500 dark:text-red-400' : 'text-slate-800 dark:text-slate-200'}`}>
              {defaultCurrency.symbol}{totalNetWorth.toFixed(2)}
            </p>
          </div>
          
          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700 flex flex-col gap-2">
            <button
              type="button"
              onClick={scrollToAssets}
              className="w-full flex items-center justify-between text-sm hover:bg-slate-50 dark:hover:bg-slate-700/50 p-1.5 -mx-1.5 rounded-lg transition-colors cursor-pointer text-left group"
              title="Click to view Your Assets"
            >
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium group-hover:underline">
                <TrendingUp size={16} /> Total Assets ({assets.length})
              </span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                +{defaultCurrency.symbol}{totalAssetsValue.toFixed(2)}
              </span>
            </button>
            <button
              type="button"
              onClick={scrollToDebts}
              className="w-full flex items-center justify-between text-sm hover:bg-slate-50 dark:hover:bg-slate-700/50 p-1.5 -mx-1.5 rounded-lg transition-colors cursor-pointer text-left group"
              title="Click to view Your Debts & Liabilities"
            >
              <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-medium group-hover:underline">
                <TrendingDown size={16} /> Total Debts ({debts.length})
              </span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                -{defaultCurrency.symbol}{totalDebtsValue.toFixed(2)}
              </span>
            </button>
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm md:col-span-2 dark:text-slate-100">
            <h2 className="text-lg font-bold mb-4 text-slate-800 dark:text-slate-200">Net Worth Over Time</h2>
            <div className="h-48 w-full">
                {history.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={history}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis dataKey="date" stroke="#94A3B8" fontSize={12} tickMargin={10} minTickGap={30} />
                        <YAxis stroke="#94A3B8" fontSize={12} tickFormatter={(value) => `${defaultCurrency.symbol}${Number(value).toFixed(0)}`} width={80} />
                        <Tooltip formatter={(value, name) => [`${defaultCurrency.symbol}${Number(value).toFixed(2)}`, name === 'netWorth' ? 'Net Worth' : name]} labelStyle={{ color: '#1E293B' }} />
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
                    <div className="h-full flex items-center justify-center text-slate-400 dark:text-slate-500 italic">No history available yet.</div>
                )}
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 flex flex-col gap-8">
          
          {/* Assets Section */}
          <div ref={assetsSectionRef} className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm dark:text-slate-100 scroll-mt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Landmark className="text-emerald-600 dark:text-emerald-400" size={22} />
                  <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Your Assets</h2>
                  <span className="text-xs bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold px-2 py-0.5 rounded-full">
                    {assets.length}
                  </span>
                </div>
                <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                  {defaultCurrency.symbol}{totalAssetsValue.toFixed(2)}
                </span>
              </div>
              
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="assets">
                  {(provided) => (
                    <div className="flex flex-col gap-3" {...provided.droppableProps} ref={provided.innerRef}>
                      {assets.map((asset, index) => {
                          const isEditing = editingAssetId === asset.id;
                          return (
                            <Draggable key={asset.id} draggableId={asset.id} index={index}>
                              {(provided, snapshot) => (
                                <div 
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  className={`group flex justify-between items-center p-4 rounded-lg border transition-all ${snapshot.isDragging ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 shadow-md scale-[1.01]' : 'bg-slate-50 dark:bg-slate-900 border-slate-100 hover:border-slate-200 dark:border-slate-700'}`}
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div {...provided.dragHandleProps} className="text-slate-300 hover:text-slate-500 dark:text-slate-400 cursor-grab active:cursor-grabbing">
                                      <GripVertical size={20} />
                                    </div>
                                    <div 
                                        className="flex items-center gap-3 cursor-pointer group-hover:opacity-80 min-w-0" 
                                        onClick={() => !isOffline && handleEditFullAsset(asset)}
                                        title={isOffline ? "Not available offline" : "Click to edit asset details"}
                                    >
                                        {asset.icon && <span className="text-2xl flex-shrink-0">{asset.icon}</span>}
                                        <div className="min-w-0">
                                            <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-lg group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">{asset.name}</h3>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">{asset.type}</p>
                                        </div>
                                    </div>
                                  </div>
                              <div className="flex items-center gap-4 flex-shrink-0">
                                  {isEditing ? (
                                      <div className="flex items-center gap-2">
                                          <span className="text-slate-400 dark:text-slate-500">{asset.currency?.symbol || defaultCurrency.symbol}</span>
                                          <input
                                              type="number"
                                              value={editingAssetAmount}
                                              onChange={e => setEditingAssetAmount(e.target.value)}
                                              onKeyDown={e => { if (e.key === 'Enter') saveEditAsset(asset); if (e.key === 'Escape') setEditingAssetId(null); }}
                                              className="w-24 border border-indigo-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-700 dark:text-slate-100"
                                              autoFocus
                                          />
                                          <button onClick={() => saveEditAsset(asset)} className="text-emerald-600 dark:text-emerald-400 font-bold px-2" disabled={isOffline}>✓</button>
                                          <button onClick={() => setEditingAssetId(null)} className="text-slate-400 dark:text-slate-500 font-bold px-1">✕</button>
                                      </div>
                                  ) : (
                                      <button 
                                          onClick={() => { if (!isOffline) { setEditingAssetId(asset.id); setEditingAssetAmount(String(asset.currentAmount)); } }}
                                          disabled={isOffline}
                                          className="text-xl font-semibold text-slate-800 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer flex flex-col items-end disabled:cursor-not-allowed"
                                          title={isOffline ? "Not available offline" : "Click to update amount"}
                                      >
                                          <span>{asset.currency?.symbol || defaultCurrency.symbol}{asset.currentAmount.toFixed(2)}</span>
                                          {!asset.currency?.isDefault && asset.currency?.exchangeRateToDefault && (
                                            <span className="text-xs text-slate-400 dark:text-slate-500 font-normal">
                                              ≈ {defaultCurrency.symbol}{(asset.currentAmount * asset.currency.exchangeRateToDefault).toFixed(2)}
                                            </span>
                                          )}
                                      </button>
                                  )}
                                  <button
                                      onClick={() => deleteAsset(asset.id)}
                                      disabled={isOffline}
                                      className="hidden md:block opacity-0 group-hover:opacity-100 p-2 text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                      title={isOffline ? "Not available offline" : "Delete asset"}
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
                  {assets.length === 0 && <p className="text-slate-500 dark:text-slate-400 italic text-center py-4">You have not added any assets yet.</p>}
                </div>
              )}
            </Droppable>
          </DragDropContext>
          </div>

          {/* Debts & Liabilities Section */}
          <div ref={debtsSectionRef} className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm dark:text-slate-100 scroll-mt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CreditCard className="text-rose-600 dark:text-rose-400" size={22} />
                  <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Your Debts & Liabilities</h2>
                  <span className="text-xs bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 font-semibold px-2 py-0.5 rounded-full">
                    {debts.length}
                  </span>
                </div>
                <span className="text-sm font-semibold text-rose-600 dark:text-rose-400">
                  -{defaultCurrency.symbol}{totalDebtsValue.toFixed(2)}
                </span>
              </div>
              
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="debts">
                  {(provided) => (
                    <div className="flex flex-col gap-3" {...provided.droppableProps} ref={provided.innerRef}>
                      {debts.map((debt, index) => {
                          const isEditing = editingDebtId === debt.id;
                          return (
                            <Draggable key={debt.id} draggableId={debt.id} index={index}>
                              {(provided, snapshot) => (
                                <div 
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  className={`group flex justify-between items-center p-4 rounded-lg border transition-all ${snapshot.isDragging ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 shadow-md scale-[1.01]' : 'bg-slate-50 dark:bg-slate-900 border-slate-100 hover:border-slate-200 dark:border-slate-700'}`}
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div {...provided.dragHandleProps} className="text-slate-300 hover:text-slate-500 dark:text-slate-400 cursor-grab active:cursor-grabbing">
                                      <GripVertical size={20} />
                                    </div>
                                    <div 
                                        className="flex items-center gap-3 cursor-pointer group-hover:opacity-80 min-w-0" 
                                        onClick={() => !isOffline && handleEditFullDebt(debt)}
                                        title={isOffline ? "Not available offline" : "Click to edit debt details"}
                                    >
                                        {debt.icon && <span className="text-2xl flex-shrink-0">{debt.icon}</span>}
                                        <div className="min-w-0">
                                            <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-lg group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors truncate">{debt.name}</h3>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">{debt.type}</p>
                                        </div>
                                    </div>
                                  </div>
                              <div className="flex items-center gap-4 flex-shrink-0">
                                  {isEditing ? (
                                      <div className="flex items-center gap-2">
                                          <span className="text-slate-400 dark:text-slate-500">{debt.currency?.symbol || defaultCurrency.symbol}</span>
                                          <input
                                              type="number"
                                              value={editingDebtAmount}
                                              onChange={e => setEditingDebtAmount(e.target.value)}
                                              onKeyDown={e => { if (e.key === 'Enter') saveEditDebt(debt); if (e.key === 'Escape') setEditingDebtId(null); }}
                                              className="w-24 border border-rose-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-rose-500 dark:bg-slate-700 dark:text-slate-100"
                                              autoFocus
                                          />
                                          <button onClick={() => saveEditDebt(debt)} className="text-emerald-600 dark:text-emerald-400 font-bold px-2" disabled={isOffline}>✓</button>
                                          <button onClick={() => setEditingDebtId(null)} className="text-slate-400 dark:text-slate-500 font-bold px-1">✕</button>
                                      </div>
                                  ) : (
                                      <button 
                                          onClick={() => { if (!isOffline) { setEditingDebtId(debt.id); setEditingDebtAmount(String(debt.currentAmount)); } }}
                                          disabled={isOffline}
                                          className="text-xl font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 transition-colors cursor-pointer flex flex-col items-end disabled:cursor-not-allowed"
                                          title={isOffline ? "Not available offline" : "Click to update amount"}
                                      >
                                          <span>{debt.currency?.symbol || defaultCurrency.symbol}{debt.currentAmount.toFixed(2)}</span>
                                          {!debt.currency?.isDefault && debt.currency?.exchangeRateToDefault && (
                                            <span className="text-xs text-slate-400 dark:text-slate-500 font-normal">
                                              ≈ {defaultCurrency.symbol}{(debt.currentAmount * debt.currency.exchangeRateToDefault).toFixed(2)}
                                            </span>
                                          )}
                                      </button>
                                  )}
                                  <button
                                      onClick={() => deleteDebt(debt.id)}
                                      disabled={isOffline}
                                      className="hidden md:block opacity-0 group-hover:opacity-100 p-2 text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                      title={isOffline ? "Not available offline" : "Delete debt"}
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
                  {debts.length === 0 && <p className="text-slate-500 dark:text-slate-400 italic text-center py-4">You have not added any debts or liabilities yet.</p>}
                </div>
              )}
            </Droppable>
          </DragDropContext>
          </div>

        </div>

        {/* Right Column Form Widget */}
        <div 
          ref={formRef} 
          className={`bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm h-fit dark:text-slate-100 transition-all ${
            editingFullAsset ? 'ring-2 ring-indigo-400 dark:ring-indigo-500' : editingFullDebt ? 'ring-2 ring-rose-400 dark:ring-rose-500' : ''
          }`}
        >
            {/* Tab switch for Add Asset vs Add Debt */}
            {!editingFullAsset && !editingFullDebt && (
              <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-lg mb-6">
                <button
                  type="button"
                  onClick={() => handleSwitchFormType('asset')}
                  className={`flex-1 py-1.5 text-sm font-semibold rounded-md transition-colors flex items-center justify-center gap-1.5 ${formType === 'asset' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
                >
                  <Landmark size={16} /> Asset
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchFormType('debt')}
                  className={`flex-1 py-1.5 text-sm font-semibold rounded-md transition-colors flex items-center justify-center gap-1.5 ${formType === 'debt' ? 'bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
                >
                  <CreditCard size={16} /> Debt
                </button>
              </div>
            )}

            <h2 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-200">
              {editingFullAsset ? 'Update Asset' : editingFullDebt ? 'Update Debt' : formType === 'asset' ? 'Add Asset' : 'Add Debt'}
            </h2>
            
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Name</label>
                    <input 
                      ref={nameInputRef}
                      type="text" 
                      value={name} 
                      onChange={e=>setName(e.target.value)} 
                      placeholder={formType === 'asset' ? "e.g. Chase Checking" : "e.g. Car Loan or Visa"} 
                      className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded p-2 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none" 
                      required 
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Type</label>
                    {formType === 'asset' ? (
                      <select value={type} onChange={e=>setType(e.target.value)} className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded p-2 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                          <option value="Cash">Cash</option>
                          <option value="Bank Account">Bank Account</option>
                          <option value="Gold">Gold</option>
                          <option value="Card">Card</option>
                          <option value="Investment">Investment</option>
                          <option value="Crypto">Crypto</option>
                          <option value="Other">Other</option>
                      </select>
                    ) : (
                      <select value={type} onChange={e=>setType(e.target.value)} className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded p-2 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-rose-500 focus:outline-none">
                          <option value="Loan">Loan</option>
                          <option value="Credit Card">Credit Card</option>
                          <option value="Mortgage">Mortgage</option>
                          <option value="Personal Loan">Personal Loan</option>
                          <option value="Line of Credit">Line of Credit</option>
                          <option value="Other">Other</option>
                      </select>
                    )}
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Currency</label>
                      <select value={currencyId} onChange={e=>setCurrencyId(e.target.value)} className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded p-2 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                          <option value="">{defaultCurrency.name || 'Default'} ({defaultCurrency.code})</option>
                          {currencies.filter(c => !c.isDefault).map(c => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
                      </select>
                  </div>
                  <div className="flex-1">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Icon (Emoji)</label>
                      <input 
                        type="text" 
                        value={icon} 
                        onChange={e=>setIcon(e.target.value)} 
                        placeholder={formType === 'asset' ? "💰" : "💳"} 
                        className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded p-2 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none" 
                        maxLength={10} 
                      />
                  </div>
                </div>
                {!editingFullAsset && !editingFullDebt && (
                  <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Initial Amount</label>
                      <input type="number" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0.00" className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded p-2 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none" required />
                  </div>
                )}
                <div className="flex gap-2 mt-2">
                  <button 
                    type="submit" 
                    disabled={isOffline}
                    title={isOffline ? "Not available offline" : undefined}
                    className={`flex-1 text-white p-2 rounded font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${formType === 'debt' ? 'bg-rose-600 hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-600' : 'bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600'}`}
                  >
                    {editingFullAsset ? 'Update Asset' : editingFullDebt ? 'Update Debt' : formType === 'asset' ? 'Add Asset' : 'Add Debt'}
                  </button>
                  {(editingFullAsset || editingFullDebt) && (
                    <button type="button" onClick={clearForm} className="px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 dark:text-slate-400 rounded font-semibold transition-colors">
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
