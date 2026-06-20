import useAdminStore from '../../store/useAdminStore';
import useAuthStore from '../../store/useAuthStore';
import { formatBytes } from '../../utils/formatUtils';
import { RefreshCw, Key, Trash2 } from 'lucide-react';

export default function AdminUserManagement({
  queryParamsStr,
  page,
  sortBy,
  sortDesc,
  statusFilter,
  tierFilter,
  handleSort,
  handleFilterChange,
  handlePageChange
}) {
  const currentUsername = useAuthStore(state => state.username);
  
  const dashboardData = useAdminStore(state => state.dashboardData);
  const tiers = useAdminStore(state => state.tiers);
  const datastores = useAdminStore(state => state.datastores);
  
  const updateUser = useAdminStore(state => state.updateUser);
  const migrateUser = useAdminStore(state => state.migrateUser);
  const recalculateStorage = useAdminStore(state => state.recalculateStorage);
  const resetPassword = useAdminStore(state => state.resetPassword);
  const deleteUser = useAdminStore(state => state.deleteUser);
  const loading = useAdminStore(state => state.loading);

  const usersList = dashboardData.users || [];
  const pageSize = dashboardData.pageSize || 10;
  const totalPages = Math.ceil((dashboardData.totalCount || 0) / pageSize);

  const getSortIndicator = (column) => {
    if (sortBy !== column) return null;
    return <span className="ml-1">{sortDesc ? '▼' : '▲'}</span>;
  };

  return (
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
                  <div className="flex flex-col gap-2">
                    <select 
                      className="border rounded p-1 bg-white w-full"
                      value={u.tierId || ''}
                      onChange={(e) => updateUser(u.id, { tierId: parseInt(e.target.value) }, queryParamsStr)}
                    >
                      {tiers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                    {u.tierId > 1 && (
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] uppercase font-bold text-slate-500">Expires At</label>
                        <input 
                          type="date"
                          className="border border-slate-300 rounded p-1 text-xs bg-white w-full"
                          value={u.tierExpiresAt ? u.tierExpiresAt.split('T')[0] : ''}
                          onChange={(e) => {
                            if (!e.target.value) {
                              updateUser(u.id, { clearTierExpiresAt: true }, queryParamsStr);
                            } else {
                              updateUser(u.id, { tierExpiresAt: e.target.value }, queryParamsStr);
                            }
                          }}
                        />
                      </div>
                    )}
                  </div>
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
                      onChange={(e) => updateUser(u.id, { isAdmin: e.target.checked }, queryParamsStr)}
                      className="rounded border-slate-300"
                      disabled={u.isMigrating}
                    />
                    <span>Admin</span>
                  </label>
                  <label className="flex items-center space-x-2 text-red-600">
                    <input 
                      type="checkbox" 
                      checked={u.isBlocked} 
                      onChange={(e) => updateUser(u.id, { isBlocked: e.target.checked }, queryParamsStr)}
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
                      onChange={(e) => migrateUser(u.id, e.target.value, queryParamsStr)}
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
                    onClick={() => recalculateStorage(u.username, queryParamsStr)}
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
                      onClick={() => deleteUser(u.id, queryParamsStr)}
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
                <td colSpan="8" className="p-6 text-center text-slate-500">No users found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-6 flex flex-col sm:flex-row justify-between items-center text-sm text-slate-600 gap-4">
          <div>
            Showing page {page} of {totalPages} ({dashboardData.totalCount} total users)
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
  );
}
