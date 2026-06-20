import { useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import usePageTitle from '../hooks/usePageTitle';
import useAdminStore from '../store/useAdminStore';
import { RefreshCw, HardDrive } from 'lucide-react';

import AdminSummaryCards from '../components/admin/AdminSummaryCards';
import AdminDatastoresManagement from '../components/admin/AdminDatastoresManagement';
import AdminUserManagement from '../components/admin/AdminUserManagement';

export default function AdminDashboard() {
  usePageTitle('Admin');
  
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parseInt(searchParams.get('page') || '1', 10);
  const sortBy = searchParams.get('sortBy') || '';
  const sortDesc = searchParams.get('sortDesc') === 'true';
  const statusFilter = searchParams.get('statusFilter') || '';
  const tierFilter = searchParams.get('tierFilter') || '';

  const fetchData = useAdminStore(state => state.fetchData);
  const loading = useAdminStore(state => state.loading);
  const error = useAdminStore(state => state.error);
  const dashboardData = useAdminStore(state => state.dashboardData);
  const recalculateAllStorage = useAdminStore(state => state.recalculateAllStorage);

  const queryParamsStr = searchParams.toString();

  useEffect(() => {
    fetchData(queryParamsStr);
  }, [fetchData, queryParamsStr]);

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

  if (loading && (!dashboardData.users || dashboardData.users.length === 0)) {
    return <div className="p-8">Loading admin data...</div>;
  }
  
  if (error) {
    return <div className="p-8 text-red-500">{error}</div>;
  }

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-slate-50">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Admin Dashboard</h1>
        <div className="flex gap-2 items-center">
          <button 
            onClick={() => recalculateAllStorage(queryParamsStr)}
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
          <Link 
            to="/admin/settings" 
            className="flex items-center gap-2 p-2 md:px-4 md:py-2 bg-slate-800 text-white rounded-md hover:bg-slate-700 transition-colors shadow-sm"
            title="System Settings"
          >
            <span className="hidden md:inline text-sm font-medium">Settings</span>
          </Link>
        </div>
      </div>

      <AdminSummaryCards />
      
      <AdminDatastoresManagement queryParamsStr={queryParamsStr} />
      
      <AdminUserManagement 
        queryParamsStr={queryParamsStr}
        page={page}
        sortBy={sortBy}
        sortDesc={sortDesc}
        statusFilter={statusFilter}
        tierFilter={tierFilter}
        handleSort={handleSort}
        handleFilterChange={handleFilterChange}
        handlePageChange={handlePageChange}
      />
    </div>
  );
}
