import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import FinanceDashboard from './pages/FinanceDashboard';
import Notebook from './pages/Notebook';
import Thoughts from './pages/Thoughts';
import AuthOverlay from './components/AuthOverlay';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function App() {
  const [authStatus, setAuthStatus] = useState({ loaded: false, setupRequired: false, authenticated: false, username: null });

  useEffect(() => {
    fetch(`${API_BASE}/api/auth/status`)
      .then(res => res.json())
      .then(data => {
        setAuthStatus({
          loaded: true,
          setupRequired: data.setupRequired,
          authenticated: data.authenticated,
          username: data.username
        });
      })
      .catch(err => {
        console.error("Auth status error:", err);
        setAuthStatus({ loaded: true, setupRequired: false, authenticated: false, username: null });
      });
  }, []);

  if (!authStatus.loaded) {
    return <div className="flex h-screen items-center justify-center bg-slate-50">Loading...</div>;
  }

  const handleAuthenticated = (username) => {
    setAuthStatus({ loaded: true, setupRequired: false, authenticated: true, username });
  };

  return (
    <BrowserRouter>
      {authStatus.setupRequired ? (
        <AuthOverlay mode="setup" onAuthenticated={handleAuthenticated} />
      ) : !authStatus.authenticated ? (
        <AuthOverlay mode="login" onAuthenticated={handleAuthenticated} />
      ) : (
        <div className="flex h-screen w-full bg-slate-50 font-sans">
          <Sidebar />
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/thoughts" element={<Thoughts />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/finance" element={<FinanceDashboard />} />
            <Route path="/notebook" element={<Notebook />} />
            <Route path="/notebook/:noteId" element={<Notebook />} />
          </Routes>
        </div>
      )}
    </BrowserRouter>
  );
}

export default App;
