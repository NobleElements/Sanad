import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { API_BASE } from '../config';
import { formatBytes } from '../utils/formatUtils';
import usePageTitle from '../hooks/usePageTitle';

export default function AdminDashboard() {
  usePageTitle('Admin');
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

      const [usersRes, tiersRes] = await Promise.all([
        fetch(`${API_BASE}/api/admin/users?${query.toString()}`),
        fetch(`${API_BASE}/api/storage/tiers`)
      ]);
      
      const usersData = await usersRes.json();
      const tiersData = await tiersRes.json();
      
      setData(usersData);
      setTiers(tiersData);
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

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-slate-50">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Admin Dashboard</h1>
        <Link 
          to="/admin/tiers" 
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors shadow-sm"
        >
          Manage Storage Tiers
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">Total Disk Usage</h3>
          <p className="text-2xl font-bold text-slate-800 mt-2">{formatBytes(data.totalDiskUsage || 0)}</p>
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
              <tr className="border-b border-slate-200 text-sm text-slate-500 uppercase tracking-wider">
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
                  Created / Last Visit {getSortIndicator('CreatedAt')}
                </th>
                <th className="p-3">Status</th>
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
                    <div>C: {new Date(u.createdAt).toLocaleDateString()}</div>
                    <div>V: {u.lastVisitAt ? new Date(u.lastVisitAt).toLocaleDateString() : 'Never'}</div>
                  </td>
                  <td className="p-3 space-y-2">
                    <label className="flex items-center space-x-2">
                      <input 
                        type="checkbox" 
                        checked={u.isAdmin} 
                        onChange={(e) => updateUser(u.id, { isAdmin: e.target.checked })}
                        className="rounded border-slate-300"
                      />
                      <span>Admin</span>
                    </label>
                    <label className="flex items-center space-x-2 text-red-600">
                      <input 
                        type="checkbox" 
                        checked={u.isBlocked} 
                        onChange={(e) => updateUser(u.id, { isBlocked: e.target.checked })}
                        className="rounded border-slate-300"
                      />
                      <span>Blocked</span>
                    </label>
                  </td>
                  <td className="p-3 text-right">
                    <button 
                      onClick={() => deleteUser(u.id)}
                      className="text-red-500 hover:text-red-700 px-3 py-1 border border-red-200 rounded hover:bg-red-50 transition-colors"
                    >
                      Delete
                    </button>
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
