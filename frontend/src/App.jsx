import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import FinanceDashboard from './pages/FinanceDashboard';

function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen w-full bg-slate-50 font-sans">
        <Sidebar />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/finance" element={<FinanceDashboard />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
