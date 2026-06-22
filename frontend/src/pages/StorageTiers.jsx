import React, { useState, useEffect } from 'react';
import { API_BASE, BYTES_PER_KB, API_URL } from '../config';
import { formatBytes } from '../utils/formatUtils';
import usePageTitle from '../hooks/usePageTitle';

export default function StorageTiers() {
  usePageTitle('Storage Tiers');
  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingTier, setEditingTier] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchTiers();
  }, []);

  const fetchTiers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/storage/tiers`);
      if (!res.ok) throw new Error('Failed to load tiers');
      const data = await res.json();
      setTiers(data);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleEditTier = (tier) => {
    setEditingTier({ 
      ...tier, 
      limitGb: tier.diskLimitBytes / (BYTES_PER_KB * BYTES_PER_KB * BYTES_PER_KB) 
    });
  };

  const saveTier = async () => {
    setIsSaving(true);
    try {
      const updates = {
        name: editingTier.name,
        price: parseFloat(editingTier.price),
        diskLimitBytes: Math.floor(parseFloat(editingTier.limitGb) * BYTES_PER_KB * BYTES_PER_KB * BYTES_PER_KB)
      };
      
      const res = await fetch(`${API_URL}/admin/tiers/${editingTier.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        setEditingTier(null);
        fetchTiers();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <div className="p-8">Loading storage tiers...</div>;
  if (error) return <div className="p-8 text-red-500 dark:text-red-400">{error}</div>;

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-slate-50 dark:bg-slate-900">
      <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200 mb-8">Storage Tiers</h1>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 border border-slate-200 dark:border-slate-700 dark:text-slate-100">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {tiers.map(tier => {
            const isEditing = editingTier && editingTier.id === tier.id;
            return (
              <div key={tier.id} className={`border rounded-lg p-4 bg-slate-50 dark:bg-slate-900 flex flex-col ${isEditing ? 'border-blue-500' : ''}`}>
                {isEditing ? (
                  <div className="mb-2">
                    <input 
                      type="text"
                      className="w-full font-bold text-lg border rounded px-2 py-1 bg-white dark:bg-slate-800 dark:text-slate-100"
                      value={editingTier.name}
                      onChange={(e) => setEditingTier({...editingTier, name: e.target.value})}
                      placeholder="Tier Name"
                    />
                  </div>
                ) : (
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="font-bold text-lg">{tier.name}</h3>
                    {tier.paddleProductId && (
                      <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-1 rounded-full font-medium" title="Synced with Paddle">
                        Paddle Synced
                      </span>
                    )}
                  </div>
                )}
                
                {isEditing ? (
                  <div className="space-y-3 flex-1 mb-4">
                    <div>
                      <label className="block text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 mb-1">Price ($)</label>
                      <input 
                        type="number"
                        className="w-full border rounded px-2 py-1 dark:bg-slate-700 dark:text-slate-100"
                        value={editingTier.price}
                        onChange={(e) => setEditingTier({...editingTier, price: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 mb-1">Limit (GB)</label>
                      <input 
                        type="number"
                        className="w-full border rounded px-2 py-1 dark:bg-slate-700 dark:text-slate-100"
                        value={editingTier.limitGb}
                        onChange={(e) => setEditingTier({...editingTier, limitGb: e.target.value})}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 mb-4">
                    <p className="text-slate-600 dark:text-slate-400 dark:text-slate-500 mb-2">Price: ${tier.price}</p>
                    <p className="text-slate-600 dark:text-slate-400 dark:text-slate-500">Limit: {formatBytes(tier.diskLimitBytes)}</p>
                  </div>
                )}

                <div>
                  {isEditing ? (
                    <div className="flex space-x-2">
                      <button 
                        onClick={saveTier} 
                        disabled={isSaving}
                        className="flex-1 bg-blue-600 text-white rounded py-1 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSaving ? 'Saving...' : 'Save'}
                      </button>
                      <button 
                        onClick={() => setEditingTier(null)} 
                        disabled={isSaving}
                        className="flex-1 border text-slate-600 dark:text-slate-400 dark:text-slate-500 rounded py-1 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => handleEditTier(tier)} className="w-full border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 dark:text-slate-500 rounded py-1 text-sm font-medium hover:bg-white dark:bg-slate-800">
                      Edit
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
