import useAdminStore from '../../store/useAdminStore';
import { formatBytes } from '../../utils/formatUtils';

export default function AdminSummaryCards() {
  const dashboardData = useAdminStore(state => state.dashboardData);
  const datastores = useAdminStore(state => state.datastores);

  const totalDsSpace = datastores.reduce((acc, ds) => acc + ds.totalDiskSpace, 0);
  const totalDsFree = datastores.reduce((acc, ds) => acc + ds.freeDiskSpace, 0);

  return (
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
            <span className="font-semibold text-slate-800 text-xs">{formatBytes(dashboardData.totalDiskUsage || 0)}</span>
          </div>
        </div>
      </div>
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">Total Users</h3>
        <p className="text-2xl font-bold text-slate-800 mt-2">{dashboardData.totalCount || 0}</p>
      </div>
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">Monthly Revenue</h3>
        <p className="text-2xl font-bold text-slate-800 mt-2">${(dashboardData.monthlyRevenue || 0).toFixed(2)}</p>
      </div>
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">Users by Tier</h3>
        <div className="mt-2 text-sm text-slate-700 space-y-1">
          {Object.entries(dashboardData.usersByTier || {}).map(([tier, count]) => (
            <div key={tier} className="flex justify-between">
              <span>{tier}:</span>
              <span className="font-semibold">{count}</span>
            </div>
          ))}
          {Object.keys(dashboardData.usersByTier || {}).length === 0 && (
            <div className="text-slate-400 italic">No data</div>
          )}
        </div>
      </div>
    </div>
  );
}
