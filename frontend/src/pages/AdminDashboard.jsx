import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { API_BASE, API_URL } from '../config';
import { formatBytes } from '../utils/formatUtils';
import usePageTitle from '../hooks/usePageTitle';
import useAuthStore from '../store/useAuthStore';
import { Edit2, Trash2, Key, RefreshCw, CheckCircle, Save, X, HardDrive } from 'lucide-react';

export default function AdminDashboard() {
  usePageTitle('Admin');
  const currentUsername = useAuthStore(state => state.username);
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parseInt(searchParams.get('page') || '1', 10);
  const sortBy = searchParams.get('sortBy') || '';
  const sortDesc = searchParams.get('sortDesc') === 'true';
  const statusFilter = searchParams.get('statusFilter') || '';
  const tierFilter = searchParams.get('tierFilter') || '';

  const [data, setData] = useState({
    users: [],
    totalCount: 0,
    totalDiskUsage: 0,
    monthlyRevenue: 0,
    usersByTier: {}
  });
  const [tiers, setTiers] = useState([]);
  const [datastores, setDatastores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Datastore form state
  const [newDsName, setNewDsName] = useState('');
  const [newDsPath, setNewDsPath] = useState('');
  const [newDsDefault, setNewDsDefault] = useState(false);
  
  // Datastore inline edit state
  const [editingDsId, setEditingDsId] = useState(null);
  const [editDsName, setEditDsName] = useState('');
  const [editDsPath, setEditDsPath] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      query.set('page', page.toString());
      if (sortBy) {
        query.set('sortBy', sortBy);
        query.set('sortDesc', sortDesc.toString());
      }
      if (statusFilter) query.set('statusFilter', statusFilter);
      if (tierFilter) query.set('tierFilter', tierFilter);

      const [usersRes, tiersRes, dsRes] = await Promise.all([
        fetch(`${API_URL}/admin/users?${query.toString()}`),
        fetch(`${API_URL}/storage/tiers`),
        fetch(`${API_URL}/admin/datastores`)
      ]);
      
      const usersData = await usersRes.json();
      const tiersData = await tiersRes.json();
      const dsData = await dsRes.json();
      
      setData(usersData);
      setTiers(tiersData);
      setDatastores(dsData);
    } catch {
      setError('Failed to load admin data');
    }
    setLoading(false);
  }, [page, sortBy, sortDesc, statusFilter, tierFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateUser = async (id, updates) => {
    try {
      const res = await fetch(`${API_URL}/admin/users/${id}`, {
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
      const res = await fetch(`${API_URL}/admin/users/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const resetPassword = async (id) => {
    const newPassword = window.prompt("Enter new password for this user:");
    if (!newPassword) return;

    try {
      const res = await fetch(`${API_URL}/admin/users/${id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword })
      });
      if (res.ok) {
        alert("Password reset successfully.");
      } else {
        alert("Failed to reset password.");
      }
    } catch (e) {
      console.error(e);
      alert("Error resetting password.");
    }
  };

  const recalculateStorage = async (username) => {
    try {
      const res = await fetch(`${API_URL}/admin/users/${username}/recalculate-storage`, {
        method: 'POST'
      });
      if (res.ok) {
        fetchData();
        alert(`Storage recalculated for ${username}.`);
      } else {
        alert("Failed to recalculate storage.");
      }
    } catch (e) {
      console.error(e);
      alert("Error recalculating storage.");
    }
  };

  const recalculateAllStorage = async () => {
    if (!window.confirm("Are you sure you want to recalculate storage for all users? This might take a while.")) return;
    try {
      const res = await fetch(`${API_URL}/admin/recalculate-storage`, {
        method: 'POST'
      });
      if (res.ok) {
        fetchData();
        alert("Storage recalculated for all users.");
      } else {
        alert("Failed to recalculate storage for all users.");
      }
    } catch (e) {
      console.error(e);
      alert("Error recalculating storage.");
    }
  };

  const migrateUser = async (userId, targetDsId) => {
    if (!targetDsId) return;
    if (!window.confirm("Are you sure you want to migrate this user to a new datastore? They won't be able to log in during the process.")) return;
    try {
      const res = await fetch(`${API_URL}/admin/users/${userId}/migrate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetDatastoreId: parseInt(targetDsId) })
      });
      if (res.ok) {
        alert("Migration started successfully. It will run in the background.");
        fetchData();
      } else {
        const error = await res.text();
        alert("Migration failed: " + error);
      }
    } catch (e) {
      console.error(e);
      alert("Error triggering migration.");
    }
  };

  const createDatastore = async (e) => {
    e.preventDefault();
    if (!newDsName || !newDsPath) return;
    try {
      const res = await fetch(`${API_URL}/admin/datastores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newDsName, path: newDsPath, isDefault: newDsDefault })
      });
      if (res.ok) {
        setNewDsName('');
        setNewDsPath('');
        setNewDsDefault(false);
        fetchData();
      } else {
        const error = await res.text();
        alert("Failed to create datastore: " + error);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const setDatastoreDefault = async (id) => {
    try {
      const res = await fetch(`${API_URL}/admin/datastores/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDefault: true })
      });
      if (res.ok) fetchData();
    } catch (e) { console.error(e); }
  };

  const startEditDatastore = (ds) => {
    setEditingDsId(ds.id);
    setEditDsName(ds.name);
    setEditDsPath(ds.path);
  };

  const cancelEditDatastore = () => {
    setEditingDsId(null);
    setEditDsName('');
    setEditDsPath('');
  };

  const saveDatastoreEdit = async (id) => {
    try {
      const res = await fetch(`${API_URL}/admin/datastores/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editDsName, path: editDsPath })
      });
      if (res.ok) {
        fetchData();
        cancelEditDatastore();
      } else {
        const error = await res.text();
        alert("Failed to update datastore: " + error);
      }
    } catch (e) { console.error(e); }
  };

  const deleteDatastore = async (id) => {
    if (!window.confirm("Are you sure you want to delete this datastore? Make sure no users are left on it.")) return;
    try {
      const res = await fetch(`${API_URL}/admin/datastores/${id}`, { method: 'DELETE' });
      if (res.ok) fetchData();
      else {
        const error = await res.text();
        alert(error);
      }
    } catch (e) { console.error(e); }
  };

  const handleSort = (column) => {
    if (sortBy === column) {
      setSearchParams(prev => {
        prev.set('sortDesc', (!sortDesc).toString());
        return prev;
      });
    } else {
      setSearchParams(prev => {
        prev.set('sortBy', column);
        prev.set('sortDesc', 'false');
        return prev;
      });
    }
  };

  const handleFilterChange = (key, value) => {
    setSearchParams(prev => {
      if (value) {
        prev.set(key, value);
      } else {
        prev.delete(key);
      }
      prev.set('page', '1'); // Reset to page 1 on filter
      return prev;
    });
  };

  const handlePageChange = (newPage) => {
    setSearchParams(prev => {
      prev.set('page', newPage.toString());
      return prev;
    });
  };

  if (loading && !data.users.length) return <div className="p-8">Loading admin data...</div>;
  if (error) return <div className="p-8 text-red-500">{error}</div>;

  const usersList = data.users || [];
  const pageSize = data.pageSize || 10;
  const totalPages = Math.ceil((data.totalCount || 0) / pageSize);

  const getSortIndicator = (column) => {
    if (sortBy !== column) return null;
    return <span className="ml-1">{sortDesc ? '▼' : '▲'}</span>;
  };

  const totalDsSpace = datastores.reduce((acc, ds) => acc + ds.totalDiskSpace, 0);
  const totalDsFree = datastores.reduce((acc, ds) => acc + ds.freeDiskSpace, 0);

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-slate-50">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Admin Dashboard</h1>
        <div className="flex gap-2 items-center">
          <button 
            onClick={recalculateAllStorage}
            className="flex items-center gap-2 p-2 md:px-4 md:py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors shadow-sm"
            title="Recalculate All Storage"
          >
            <RefreshCw className="w-5 h-5 md:w-4 md:h-4" />
            <span className="hidden md:inline text-sm font-medium">Recalculate All Storage</span>
          </button>
          <Link 
            to="/admin/tiers" 
            className="flex items-center gap-2 p-2 md:px-4 md:py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors shadow-sm"
            title="Manage Storage Tiers"
          >
            <HardDrive className="w-5 h-5 md:w-4 md:h-4" />
            <span className="hidden md:inline text-sm font-medium">Manage Storage Tiers</span>
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">Storage Total</h3>
          <div className="mt-2 text-sm text-slate-700 space-y-1">
            <div className="flex justify-between border-b border-slate-100 pb-1 mb-1">
              <span>System Total:</span>
              <span className="font-semibold text-slate-800">{formatBytes(totalDsSpace || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span>System Free:</span>
              <span className="font-semibold text-emerald-600">{formatBytes(totalDsFree || 0)}</span>
            </div>
            <div className="flex justify-between mt-2 pt-2 border-t border-slate-100">
              <span className="text-slate-500 text-xs">Used By Users:</span>
              <span className="font-semibold text-slate-800 text-xs">{formatBytes(data.totalDiskUsage || 0)}</span>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">Total Users</h3>
          <p className="text-2xl font-bold text-slate-800 mt-2">{data.totalCount || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">Monthly Revenue</h3>
          <p className="text-2xl font-bold text-slate-800 mt-2">${(data.monthlyRevenue || 0).toFixed(2)}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">Users by Tier</h3>
          <div className="mt-2 text-sm text-slate-700 space-y-1">
            {Object.entries(data.usersByTier || {}).map(([tier, count]) => (
              <div key={tier} className="flex justify-between">
                <span>{tier}:</span>
                <span className="font-semibold">{count}</span>
              </div>
            ))}
            {Object.keys(data.usersByTier || {}).length === 0 && (
              <div className="text-slate-400 italic">No data</div>
            )}
          </div>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm p-6 mb-8 border border-slate-200">
        <h2 className="text-xl font-semibold text-slate-700 mb-6">Datastores Management</h2>
        
        <form onSubmit={createDatastore} className="flex flex-col sm:flex-row gap-4 mb-6 items-end bg-slate-50 p-4 rounded-lg border border-slate-100">
          <div className="flex-1 w-full">
            <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
            <input 
              type="text" 
              required
              placeholder="e.g. HDD Array 1"
              value={newDsName}
              onChange={e => setNewDsName(e.target.value)}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
          <div className="flex-1 w-full">
            <label className="block text-sm font-medium text-slate-700 mb-1">Absolute Path</label>
            <input 
              type="text" 
              required
              placeholder="e.g. /mnt/hdd1/sanad-data"
              value={newDsPath}
              onChange={e => setNewDsPath(e.target.value)}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
          <div className="flex items-center h-10">
            <label className="flex items-center space-x-2 text-sm cursor-pointer">
              <input 
                type="checkbox" 
                checked={newDsDefault}
                onChange={e => setNewDsDefault(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="font-medium text-slate-700">Set Default</span>
            </label>
          </div>
          <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors shadow-sm text-sm font-medium h-10">
            Add Datastore
          </button>
        </form>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-sm text-slate-500 uppercase tracking-wider">
                <th className="p-3">Name</th>
                <th className="p-3">Path</th>
                <th className="p-3">Disk Usage</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {datastores.map(ds => (
                <tr key={ds.id} className="border-b border-slate-100 hover:bg-slate-50">
                  {editingDsId === ds.id ? (
                    <>
                      <td className="p-3">
                        <input 
                          type="text" 
                          value={editDsName} 
                          onChange={e => setEditDsName(e.target.value)}
                          className="w-full border border-slate-300 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                        />
                      </td>
                      <td className="p-3">
                        <input 
                          type="text" 
                          value={editDsPath} 
                          onChange={e => setEditDsPath(e.target.value)}
                          disabled={ds.usersCount > 0}
                          className={`w-full border rounded px-2 py-1 text-sm outline-none ${ds.usersCount > 0 ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed' : 'bg-white border-slate-300 focus:ring-1 focus:ring-indigo-500'}`}
                          title={ds.usersCount > 0 ? "Cannot edit path while users belong to this datastore" : ""}
                        />
                      </td>
                      <td className="p-3 text-slate-600">
                        <span className="text-xs italic text-slate-400">Editing...</span>
                      </td>
                      <td className="p-3">
                        {ds.isDefault ? <span className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-semibold">Default</span> : null}
                      </td>
                      <td className="p-3 text-right space-x-2">
                        <button 
                          onClick={() => saveDatastoreEdit(ds.id)}
                          title="Save Changes"
                          className="text-emerald-600 hover:text-emerald-800 p-1.5 border border-emerald-200 rounded hover:bg-emerald-50 transition-colors inline-flex"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={cancelEditDatastore}
                          title="Cancel"
                          className="text-slate-500 hover:text-slate-700 p-1.5 border border-slate-200 rounded hover:bg-slate-50 transition-colors inline-flex"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="p-3 font-medium text-slate-800">{ds.name}</td>
                      <td className="p-3 text-slate-500 font-mono text-xs">{ds.path}</td>
                      <td className="p-3 text-slate-600 w-48">
                        {ds.totalDiskSpace > 0 ? (
                          <div 
                            className="w-full bg-slate-200 rounded-full h-2.5 dark:bg-slate-700 overflow-hidden cursor-help flex items-center"
                            title={`${formatBytes(ds.totalDiskSpace - ds.freeDiskSpace)} / ${formatBytes(ds.totalDiskSpace)} (${formatBytes(ds.freeDiskSpace)} free)`}
                          >
                            <div 
                              className={`h-full rounded-full ${((ds.totalDiskSpace - ds.freeDiskSpace) / ds.totalDiskSpace) > 0.9 ? 'bg-red-500' : ((ds.totalDiskSpace - ds.freeDiskSpace) / ds.totalDiskSpace) > 0.75 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                              style={{ width: `${Math.min(100, Math.max(0, ((ds.totalDiskSpace - ds.freeDiskSpace) / ds.totalDiskSpace) * 100))}%` }}
                            ></div>
                          </div>
                        ) : (
                          <span className="text-red-500 text-xs">Path not accessible</span>
                        )}
                      </td>
                      <td className="p-3">
                        {ds.isDefault ? (
                          <span className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-semibold">Default</span>
                        ) : null}
                      </td>
                      <td className="p-3 text-right space-x-2">
                        <button 
                          onClick={() => startEditDatastore(ds)}
                          title="Edit Datastore"
                          className="text-indigo-600 hover:text-indigo-800 p-1.5 border border-indigo-200 rounded hover:bg-indigo-50 transition-colors inline-flex"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {!ds.isDefault && (
                          <button 
                            onClick={() => setDatastoreDefault(ds.id)}
                            title="Make Default"
                            className="text-emerald-600 hover:text-emerald-800 p-1.5 border border-emerald-200 rounded hover:bg-emerald-50 transition-colors inline-flex"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        <button 
                          onClick={() => deleteDatastore(ds.id)}
                          disabled={ds.isDefault || ds.usersCount > 0}
                          title={ds.isDefault ? "Cannot delete default datastore" : (ds.usersCount > 0 ? "Cannot delete datastore with assigned users" : "Delete Datastore")}
                          className="text-red-500 hover:text-red-700 p-1.5 border border-red-200 rounded hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
              {datastores.length === 0 && (
                <tr>
                  <td colSpan="5" className="p-6 text-center text-slate-500">No datastores defined.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm p-6 mb-8 border border-slate-200">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h2 className="text-xl font-semibold text-slate-700">User Management</h2>
          <div className="flex gap-4">
            <select 
              className="border border-slate-300 rounded-md px-3 py-1.5 text-sm bg-white"
              value={statusFilter}
              onChange={(e) => handleFilterChange('statusFilter', e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Blocked">Blocked</option>
            </select>
            <select 
              className="border border-slate-300 rounded-md px-3 py-1.5 text-sm bg-white"
              value={tierFilter}
              onChange={(e) => handleFilterChange('tierFilter', e.target.value)}
            >
              <option value="">All Tiers</option>
              {tiers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider whitespace-nowrap">
                <th className="p-3 cursor-pointer hover:bg-slate-50 select-none" onClick={() => handleSort('Username')}>
                  Username {getSortIndicator('Username')}
                </th>
                <th className="p-3 cursor-pointer hover:bg-slate-50 select-none" onClick={() => handleSort('DiskUsed')}>
                  Disk Used {getSortIndicator('DiskUsed')}
                </th>
                <th className="p-3 cursor-pointer hover:bg-slate-50 select-none" onClick={() => handleSort('Tier')}>
                  Tier {getSortIndicator('Tier')}
                </th>
                <th className="p-3 cursor-pointer hover:bg-slate-50 select-none" onClick={() => handleSort('CreatedAt')}>
                  Created {getSortIndicator('CreatedAt')}
                </th>
                <th className="p-3 cursor-pointer hover:bg-slate-50 select-none" onClick={() => handleSort('LastVisitAt')}>
                  Last Visit {getSortIndicator('LastVisitAt')}
                </th>
                <th className="p-3">Status</th>
                <th className="p-3">Datastore & Migrations</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {usersList.map(u => (
                <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="p-3 font-medium text-slate-800">{u.username}</td>
                  <td className="p-3 text-slate-600">{formatBytes(u.diskUsed)}</td>
                  <td className="p-3">
                    <select 
                      className="border rounded p-1 bg-white"
                      value={u.tierId || ''}
                      onChange={(e) => updateUser(u.id, { tierId: parseInt(e.target.value) })}
                    >
                      {tiers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </td>
                  <td className="p-3 text-slate-500">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-3 text-slate-500">
                    {u.lastVisitAt ? new Date(u.lastVisitAt).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="p-3 space-y-2">
                    <label className="flex items-center space-x-2">
                      <input 
                        type="checkbox" 
                        checked={u.isAdmin} 
                        onChange={(e) => updateUser(u.id, { isAdmin: e.target.checked })}
                        className="rounded border-slate-300"
                        disabled={u.isMigrating}
                      />
                      <span>Admin</span>
                    </label>
                    <label className="flex items-center space-x-2 text-red-600">
                      <input 
                        type="checkbox" 
                        checked={u.isBlocked} 
                        onChange={(e) => updateUser(u.id, { isBlocked: e.target.checked })}
                        className="rounded border-slate-300"
                        disabled={u.isMigrating}
                      />
                      <span>Blocked</span>
                    </label>
                    {u.isMigrating && (
                      <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium">
                        <svg className="animate-spin h-3 w-3 text-amber-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Migrating...
                      </div>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Current: {u.datastoreName || 'Unknown'}</span>
                      <select
                        className="border border-slate-200 rounded p-1 text-xs bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        value=""
                        disabled={u.isMigrating}
                        onChange={(e) => migrateUser(u.id, e.target.value)}
                      >
                        <option value="">{u.isMigrating ? "Migrating..." : "Move to..."}</option>
                        {datastores.filter(d => d.id !== u.datastoreId).map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                  </td>
                  <td className="p-3 text-right space-x-2 whitespace-nowrap">
                    <button 
                      onClick={() => recalculateStorage(u.username)}
                      disabled={u.isMigrating}
                      title="Recalculate Storage"
                      className="text-emerald-600 hover:text-emerald-800 p-1.5 border border-emerald-200 rounded hover:bg-emerald-50 transition-colors disabled:opacity-50 inline-flex"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => resetPassword(u.id)}
                      disabled={u.isMigrating}
                      title="Reset Password"
                      className="text-indigo-600 hover:text-indigo-800 p-1.5 border border-indigo-200 rounded hover:bg-indigo-50 transition-colors disabled:opacity-50 inline-flex"
                    >
                      <Key className="w-4 h-4" />
                    </button>
                    {u.username !== currentUsername && (
                      <button 
                        onClick={() => deleteUser(u.id)}
                        disabled={u.isMigrating}
                        title="Delete User"
                        className="text-red-500 hover:text-red-700 p-1.5 border border-red-200 rounded hover:bg-red-50 transition-colors disabled:opacity-50 inline-flex"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {usersList.length === 0 && !loading && (
                <tr>
                  <td colSpan="6" className="p-6 text-center text-slate-500">No users found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="mt-6 flex flex-col sm:flex-row justify-between items-center text-sm text-slate-600 gap-4">
            <div>
              Showing page {page} of {totalPages} ({data.totalCount} total users)
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1}
                className="px-3 py-1.5 border border-slate-300 rounded disabled:opacity-50 hover:bg-slate-50 transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages}
                className="px-3 py-1.5 border border-slate-300 rounded disabled:opacity-50 hover:bg-slate-50 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
