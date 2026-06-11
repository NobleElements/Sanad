import React, { useState, useEffect } from 'react';
import { API_BASE, BYTES_PER_KB } from '../config';

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [editingTier, setEditingTier] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, tiersRes] = await Promise.all([
        fetch(`${API_BASE}/api/admin/users`),
        fetch(`${API_BASE}/api/admin/tiers`)
      ]);
      
      const usersData = await usersRes.json();
      const tiersData = await tiersRes.json();
      
      setUsers(usersData);
      setTiers(tiersData);
    } catch (err) {
      setError('Failed to load admin data');
    }
    setLoading(false);
  };

  const updateUser = async (id, updates) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteUser = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user and ALL their data?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
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
      
      const res = await fetch(`${API_BASE}/api/admin/tiers/${editingTier.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        setEditingTier(null);
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = BYTES_PER_KB;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) return <div className="p-8">Loading admin data...</div>;
  if (error) return <div className="p-8 text-red-500">{error}</div>;

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-slate-50">
      <h1 className="text-3xl font-bold text-slate-800 mb-8">Admin Dashboard</h1>

      <div className="bg-white rounded-xl shadow-sm p-6 mb-8 border border-slate-200">
        <h2 className="text-xl font-semibold mb-4 text-slate-700">User Management</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-sm text-slate-500 uppercase tracking-wider">
                <th className="p-3">Username</th>
                <th className="p-3">Disk Used</th>
                <th className="p-3">Tier</th>
                <th className="p-3">Created / Last Visit</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {users.map(u => (
                <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="p-3 font-medium text-slate-800">{u.username}</td>
                  <td className="p-3 text-slate-600">{formatBytes(u.diskUsed)}</td>
                  <td className="p-3">
                    <select 
                      className="border rounded p-1"
                      value={u.tierId}
                      onChange={(e) => updateUser(u.id, { tierId: parseInt(e.target.value) })}
                    >
                      {tiers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </td>
                  <td className="p-3 text-slate-500">
                    <div>C: {new Date(u.createdAt).toLocaleDateString()}</div>
                    <div>V: {u.lastVisitAt ? new Date(u.lastVisitAt).toLocaleDateString() : 'Never'}</div>
                  </td>
                  <td className="p-3 space-y-2">
                    <label className="flex items-center space-x-2">
                      <input 
                        type="checkbox" 
                        checked={u.isAdmin} 
                        onChange={(e) => updateUser(u.id, { isAdmin: e.target.checked })}
                      />
                      <span>Admin</span>
                    </label>
                    <label className="flex items-center space-x-2 text-red-600">
                      <input 
                        type="checkbox" 
                        checked={u.isBlocked} 
                        onChange={(e) => updateUser(u.id, { isBlocked: e.target.checked })}
                      />
                      <span>Blocked</span>
                    </label>
                  </td>
                  <td className="p-3 text-right">
                    <button 
                      onClick={() => deleteUser(u.id)}
                      className="text-red-500 hover:text-red-700 px-3 py-1 border border-red-200 rounded hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
        <h2 className="text-xl font-semibold mb-4 text-slate-700">Storage Tiers</h2>
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
