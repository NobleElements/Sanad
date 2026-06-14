import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
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
import StorageTiers from './pages/StorageTiers';
import Subscription from './pages/Subscription';
import ProtectedRoute from './components/ProtectedRoute';
import LandingPage from './pages/LandingPage';

function App() {
  const { loaded, authenticated, isAdmin, checkAuthStatus } = useAuthStore();

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  if (!loaded) {
    return <div className="flex h-screen items-center justify-center bg-slate-50">Loading...</div>;
  }

  const AppLayout = ({ children }) => (
    <div className="flex h-screen w-full bg-slate-50 font-sans">
      <Sidebar />
      {children}
      <ToastContainer />
    </div>
  );

  return (
    <BrowserRouter>
       <Routes>
        <Route path="/" element={!authenticated ? <LandingPage /> : <Navigate to="/dashboard" replace />} />
        
        <Route path="/login" element={
          !authenticated ? (
            <div className="flex h-screen w-full bg-slate-50 relative">
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
      </Routes>
    </BrowserRouter>
  );
}

export default App;
