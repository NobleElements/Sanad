import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Lightbulb, CheckSquare, Book, DollarSign, BookOpen, Menu, LogOut } from 'lucide-react';
import useAuthStore from '../store/useAuthStore';

export default function Sidebar() {
  const location = useLocation();
  const logout = useAuthStore((state) => state.logout);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Auto collapse on small screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsCollapsed(true);
      } else {
        setIsCollapsed(false);
      }
    };
    window.addEventListener('resize', handleResize);
    // initial check
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getLinkClass = (path) => {
    const isActive = location.pathname === path;
    return `flex items-center gap-3 p-3 rounded transition-colors ${isActive ? 'bg-slate-800 text-slate-100 hover:bg-slate-700' : 'text-slate-300 hover:bg-slate-800 hover:text-slate-100'}`;
  };

  const handleLogout = async () => {
    await logout();
    window.location.reload();
  };

  return (
    <div className={`bg-slate-900 text-slate-100 flex flex-col transition-all duration-300 ease-in-out border-r border-slate-800 ${isCollapsed ? 'w-20' : 'w-64'}`}>
      <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} p-4 mb-4 border-b border-slate-800`}>
        {!isCollapsed && <div className="text-xl font-bold tracking-wider text-indigo-400">SANAD</div>}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)} 
          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors"
        >
          {isCollapsed ? <Menu className="w-6 h-6" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>
      
      <nav className="flex flex-col gap-2 flex-1 px-3 overflow-y-auto">
        <Link to="/" className={getLinkClass('/')} title="Dashboard">
          <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span className="font-medium">Dashboard</span>}
        </Link>
        <Link to="/thoughts" className={getLinkClass('/thoughts')} title="Thoughts">
          <Lightbulb className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span className="font-medium">Thoughts</span>}
        </Link>
        <Link to="/tasks" className={getLinkClass('/tasks')} title="Tasks">
          <CheckSquare className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span className="font-medium">Tasks</span>}
        </Link>
        <Link to="/notebook" className={getLinkClass('/notebook')} title="Notebook">
          <Book className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span className="font-medium">Notebook</span>}
        </Link>
        <Link to="/finance" className={getLinkClass('/finance')} title="Finance">
          <DollarSign className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span className="font-medium">Finance</span>}
        </Link>
        <Link to="/books" className={getLinkClass('/books')} title="Reading">
          <BookOpen className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span className="font-medium">Reading</span>}
        </Link>
      </nav>
      
      <div className="p-3 border-t border-slate-800">
        <button 
          onClick={handleLogout}
          className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} p-3 rounded transition-colors text-slate-400 hover:bg-red-900/40 hover:text-red-300`}
          title="Log Out"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span className="font-medium">Log Out</span>}
        </button>
      </div>
    </div>
  );
}
