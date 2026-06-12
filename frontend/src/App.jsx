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
import TaskModal from './components/TaskModal';
import useAuthStore from './store/useAuthStore';
import useTaskStore from './store/useTaskStore';
import AdminDashboard from './pages/AdminDashboard';
import StorageTiers from './pages/StorageTiers';
import Subscription from './pages/Subscription';

function App() {
  const { loaded, authenticated, isAdmin, checkAuthStatus } = useAuthStore();
  const { isTaskModalOpen, activeTask, closeTaskModal, createTask, updateTask } = useTaskStore();

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  if (!loaded) {
    return <div className="flex h-screen items-center justify-center bg-slate-50">Loading...</div>;
  }

  const handleAuthenticated = () => {
    // No need to set authStatus here, the store handles it in login.
  };

  const handleSaveTask = async (taskData) => {
    let success = false;
    if (taskData.isNew) {
      success = await createTask(taskData);
    } else {
      success = await updateTask(taskData.id, taskData);
    }
    if (success) {
      closeTaskModal();
    }
  };

  return (
    <BrowserRouter>
      {!authenticated ? (
        <AuthOverlay onAuthenticated={handleAuthenticated} />
      ) : (
        <div className="flex h-screen w-full bg-slate-50 font-sans">
          <Sidebar />
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/thoughts" element={<Thoughts />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/tasks/:taskId" element={<Tasks />} />
            <Route path="/finance" element={<FinanceDashboard />} />
            <Route path="/notebook" element={<Notebook />} />
            <Route path="/notebook/:noteId" element={<Notebook />} />
            <Route path="/books" element={<Books />} />
            <Route path="/habits" element={<Habits />} />
            <Route path="/files" element={<FileManager />} />
            <Route path="/files/:folderId" element={<FileManager />} />
            <Route path="/subscription" element={<Subscription />} />
            <Route 
              path="/admin" 
              element={isAdmin ? <AdminDashboard /> : <Navigate to="/" replace />} 
            />
            <Route 
              path="/admin/tiers" 
              element={isAdmin ? <StorageTiers /> : <Navigate to="/" replace />} 
            />
          </Routes>
          <ToastContainer />
          
          <TaskModal 
            isOpen={isTaskModalOpen} 
            task={activeTask} 
            onClose={closeTaskModal} 
            onSave={handleSaveTask} 
          />
        </div>
      )}
    </BrowserRouter>
  );
}

export default App;
