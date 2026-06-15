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
    try {
      const updates = {
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
    }
  };

  if (loading) return <div className="p-8">Loading storage tiers...</div>;
  if (error) return <div className="p-8 text-red-500">{error}</div>;

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-slate-50">
      <h1 className="text-3xl font-bold text-slate-800 mb-8">Storage Tiers</h1>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {tiers.map(tier => {
            const isEditing = editingTier && editingTier.id === tier.id;
            return (
              <div key={tier.id} className={`border rounded-lg p-4 bg-slate-50 flex flex-col ${isEditing ? 'border-blue-500' : ''}`}>
                <h3 className="font-bold text-lg mb-2">{tier.name}</h3>
                
                {isEditing ? (
                  <div className="space-y-3 flex-1 mb-4">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Price ($)</label>
                      <input 
                        type="number"
                        className="w-full border rounded px-2 py-1"
                        value={editingTier.price}
                        onChange={(e) => setEditingTier({...editingTier, price: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Limit (GB)</label>
                      <input 
                        type="number"
                        className="w-full border rounded px-2 py-1"
                        value={editingTier.limitGb}
                        onChange={(e) => setEditingTier({...editingTier, limitGb: e.target.value})}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 mb-4">
                    <p className="text-slate-600 mb-2">Price: ${tier.price}</p>
                    <p className="text-slate-600">Limit: {formatBytes(tier.diskLimitBytes)}</p>
                  </div>
                )}

                <div>
                  {isEditing ? (
                    <div className="flex space-x-2">
                      <button onClick={saveTier} className="flex-1 bg-blue-600 text-white rounded py-1 text-sm font-medium hover:bg-blue-700">Save</button>
                      <button onClick={() => setEditingTier(null)} className="flex-1 border text-slate-600 rounded py-1 text-sm font-medium hover:bg-slate-100">Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => handleEditTier(tier)} className="w-full border border-slate-300 text-slate-600 rounded py-1 text-sm font-medium hover:bg-white">
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
