import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Menu } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import FinanceDashboard from './pages/FinanceDashboard';
import Notebook from './pages/Notebook';
import Thoughts from './pages/Thoughts';
import Books from './pages/Books';
import Habits from './pages/Habits';
import FileManager from './components/FileManager/FileManager';
import AuthOverlay from './components/AuthOverlay';
import ToastContainer from './components/ToastContainer';
import useAuthStore from './store/useAuthStore';
import AdminDashboard from './pages/AdminDashboard';
import AdminSettings from './pages/AdminSettings';
import StorageTiers from './pages/StorageTiers';
import Subscription from './pages/Subscription';
import ProtectedRoute from './components/ProtectedRoute';
import LandingPage from './pages/LandingPage';
import MaintenancePage from './pages/MaintenancePage';
import TermsOfService from './pages/TermsOfService';
import PrivacyPolicy from './pages/PrivacyPolicy';
import RefundPolicy from './pages/RefundPolicy';

function App() {
  const { loaded, authenticated, isAdmin, checkAuthStatus } = useAuthStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);

  useEffect(() => {
    checkAuthStatus();
    
    const handleMigrating = () => setIsMigrating(true);
    window.addEventListener('account_migrating', handleMigrating);
    return () => window.removeEventListener('account_migrating', handleMigrating);
  }, [checkAuthStatus]);

  if (!loaded) {
    return <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">Loading...</div>;
  }

  if (isMigrating) {
    return <MaintenancePage />;
  }

  const AppLayout = ({ children }) => (
    <div className="flex h-screen w-full bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans overflow-hidden">
      <Sidebar 
        isMobileMenuOpen={isMobileMenuOpen} 
        setIsMobileMenuOpen={setIsMobileMenuOpen} 
      />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Top Bar */}
        <div className="md:hidden flex items-center justify-between bg-slate-900 text-slate-100 p-4 border-b border-slate-800 dark:bg-slate-700 dark:text-slate-100">
          <Link to="/" className="text-xl font-bold tracking-wider text-white">SANAD</Link>
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-100 transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
      <ToastContainer />
    </div>
  );

  return (
    <BrowserRouter>
       <Routes>
        <Route path="/" element={!authenticated ? <LandingPage /> : <Navigate to="/dashboard" replace />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/refund" element={<RefundPolicy />} />
        
        <Route path="/login" element={
          !authenticated ? (
            <div className="flex h-screen w-full bg-slate-50 dark:bg-slate-900 relative">
              <AuthOverlay onAuthenticated={() => {}} />
            </div>
          ) : (
            <Navigate to="/dashboard" replace />
          )
        } />
        
        <Route path="/dashboard" element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
        <Route path="/thoughts" element={<ProtectedRoute><AppLayout><Thoughts /></AppLayout></ProtectedRoute>} />
        <Route path="/tasks" element={<ProtectedRoute><AppLayout><Tasks /></AppLayout></ProtectedRoute>} />
        <Route path="/tasks/:taskId" element={<ProtectedRoute><AppLayout><Tasks /></AppLayout></ProtectedRoute>} />
        <Route path="/finance" element={<ProtectedRoute><AppLayout><FinanceDashboard /></AppLayout></ProtectedRoute>} />
        <Route path="/notebook" element={<ProtectedRoute><AppLayout><Notebook /></AppLayout></ProtectedRoute>} />
        <Route path="/notebook/:noteId" element={<ProtectedRoute><AppLayout><Notebook /></AppLayout></ProtectedRoute>} />
        <Route path="/books" element={<ProtectedRoute><AppLayout><Books /></AppLayout></ProtectedRoute>} />
        <Route path="/habits" element={<ProtectedRoute><AppLayout><Habits /></AppLayout></ProtectedRoute>} />
        <Route path="/files" element={<ProtectedRoute><AppLayout><FileManager /></AppLayout></ProtectedRoute>} />
        <Route path="/files/:folderId" element={<ProtectedRoute><AppLayout><FileManager /></AppLayout></ProtectedRoute>} />
        <Route path="/subscription" element={<ProtectedRoute><AppLayout><Subscription /></AppLayout></ProtectedRoute>} />
        
        <Route 
          path="/admin" 
          element={<ProtectedRoute><AppLayout>{isAdmin ? <AdminDashboard /> : <Navigate to="/dashboard" replace />}</AppLayout></ProtectedRoute>} 
        />
        <Route 
          path="/admin/tiers" 
          element={<ProtectedRoute><AppLayout>{isAdmin ? <StorageTiers /> : <Navigate to="/dashboard" replace />}</AppLayout></ProtectedRoute>} 
        />
        <Route 
          path="/admin/settings" 
          element={<ProtectedRoute><AppLayout>{isAdmin ? <AdminSettings /> : <Navigate to="/dashboard" replace />}</AppLayout></ProtectedRoute>} 
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
