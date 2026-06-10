import { Link, useLocation } from 'react-router-dom';

import useAuthStore from '../store/useAuthStore';

export default function Sidebar() {
  const location = useLocation();
  const logout = useAuthStore((state) => state.logout);

  const getLinkClass = (path) => {
    const isActive = location.pathname === path;
    return `p-2 rounded transition ${isActive ? 'bg-slate-800 text-slate-100 hover:bg-slate-700' : 'text-slate-300 hover:bg-slate-800'}`;
  };

  const handleLogout = async () => {
    await logout();
    window.location.reload();
  };

  return (
    <div className="w-64 bg-slate-900 text-slate-100 flex flex-col p-4">
      <div className="text-2xl font-bold mb-8 tracking-wider">SANAD</div>
      <nav className="flex flex-col gap-2 flex-1">
        <Link to="/" className={getLinkClass('/')}>Dashboard</Link>
        <Link to="/thoughts" className={getLinkClass('/thoughts')}>Thoughts</Link>
        <Link to="/tasks" className={getLinkClass('/tasks')}>Tasks</Link>
        <Link to="/notebook" className={getLinkClass('/notebook')}>Notebook</Link>
        <Link to="/finance" className={getLinkClass('/finance')}>Finance</Link>
        <Link to="/books" className={getLinkClass('/books')}>Reading</Link>
      </nav>
      
      <button 
        onClick={handleLogout}
        className="mt-4 p-2 rounded transition text-slate-300 hover:bg-red-900/50 hover:text-red-200 text-left flex items-center gap-2"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
        Log Out
      </button>
    </div>
  );
}
