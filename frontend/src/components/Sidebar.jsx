import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Lightbulb, CheckSquare, Calendar as CalendarIcon, Book, DollarSign, BookOpen, Menu, LogOut, Repeat, Folder, Shield, CreditCard } from 'lucide-react';
import useAuthStore from '../store/useAuthStore';
import useCalendarStore from '../store/useCalendarStore';

export default function Sidebar({ isMobileMenuOpen, setIsMobileMenuOpen }) {
  const location = useLocation();
  const logout = useAuthStore((state) => state.logout);
  const isAdmin = useAuthStore((state) => state.isAdmin);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Auto collapse on small screens
  useEffect(() => {
    const handleResize = () => {
      const calendarSettings = useCalendarStore.getState().settings;
      const isCalendarAndAutoCollapse = location.pathname === '/calendar' && calendarSettings?.autoCollapseNav;
      
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen && setIsMobileMenuOpen(false);
      }
      if (window.innerWidth < 1024 && window.innerWidth >= 768) {
        setIsCollapsed(true);
      } else if (window.innerWidth >= 1024) {
        setIsCollapsed(isCalendarAndAutoCollapse);
      }
    };
    window.addEventListener('resize', handleResize);
    // initial check
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [setIsMobileMenuOpen, location.pathname]);

  const getLinkClass = (path) => {
    const isActive = location.pathname === path;
    return `flex items-center gap-3 p-3 rounded transition-colors ${isActive ? 'bg-slate-800 text-slate-100 hover:bg-slate-700' : 'text-slate-300 hover:bg-slate-800 hover:text-slate-100'}`;
  };

  const handleLogout = async () => {
    await logout();
    window.location.reload();
  };

  const handleLinkClick = () => {
    if (setIsMobileMenuOpen) {
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-40 transition-opacity" 
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      
      <div className={`fixed md:static inset-y-0 left-0 z-50 bg-slate-900 text-slate-100 flex flex-col transition-all duration-300 ease-in-out border-r border-slate-800 ${isCollapsed ? 'md:w-20 w-64' : 'w-64'} ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className={`flex items-center ${isCollapsed ? 'md:justify-center justify-between' : 'justify-between'} p-4 mb-4 border-b border-slate-800`}>
          {(!isCollapsed || window.innerWidth < 768) && (
            <Link to="/" onClick={handleLinkClick} className="block -m-24 ml-1">
              <img src="/logo.png" alt="Sanad Logo" className="w-24 invert opacity-90" />
            </Link>
          )}
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)} 
            className="hidden md:block p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-100 transition-colors"
          >
            {isCollapsed ? <Menu className="w-6 h-6" /> : <Menu className="w-5 h-5" />}
          </button>
          <button 
            onClick={() => setIsMobileMenuOpen(false)} 
            className="md:hidden p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-100 transition-colors"
          >
            <span className="text-2xl leading-none">×</span>
          </button>
        </div>
      
      <nav className="flex flex-col gap-2 flex-1 px-3 overflow-y-auto">
        <Link to="/" className={getLinkClass('/')} title="Dashboard" onClick={handleLinkClick}>
          <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
          {(!isCollapsed || window.innerWidth < 768) && <span className="font-medium">Dashboard</span>}
        </Link>
        <Link to="/thoughts" className={getLinkClass('/thoughts')} title="Thoughts" onClick={handleLinkClick}>
          <Lightbulb className="w-5 h-5 flex-shrink-0" />
          {(!isCollapsed || window.innerWidth < 768) && <span className="font-medium">Thoughts</span>}
        </Link>
        <Link to="/habits" className={getLinkClass('/habits')} title="Habits" onClick={handleLinkClick}>
          <Repeat className="w-5 h-5 flex-shrink-0" />
          {(!isCollapsed || window.innerWidth < 768) && <span className="font-medium">Habits</span>}
        </Link>
        <Link to="/tasks" className={getLinkClass('/tasks')} title="Tasks" onClick={handleLinkClick}>
          <CheckSquare className="w-5 h-5 flex-shrink-0" />
          {(!isCollapsed || window.innerWidth < 768) && <span className="font-medium">Tasks</span>}
        </Link>
        <Link to="/calendar" className={getLinkClass('/calendar')} title="Calendar" onClick={handleLinkClick}>
          <CalendarIcon className="w-5 h-5 flex-shrink-0" />
          {(!isCollapsed || window.innerWidth < 768) && <span className="font-medium">Calendar</span>}
        </Link>
        <Link to="/notebook" className={getLinkClass('/notebook')} title="Notebook" onClick={handleLinkClick}>
          <Book className="w-5 h-5 flex-shrink-0" />
          {(!isCollapsed || window.innerWidth < 768) && <span className="font-medium">Notebook</span>}
        </Link>
        <Link to="/finance" className={getLinkClass('/finance')} title="Finance" onClick={handleLinkClick}>
          <DollarSign className="w-5 h-5 flex-shrink-0" />
          {(!isCollapsed || window.innerWidth < 768) && <span className="font-medium">Finance</span>}
        </Link>
        <Link to="/books" className={getLinkClass('/books')} title="Reading" onClick={handleLinkClick}>
          <BookOpen className="w-5 h-5 flex-shrink-0" />
          {(!isCollapsed || window.innerWidth < 768) && <span className="font-medium">Reading</span>}
        </Link>
        <Link to="/files" className={getLinkClass('/files')} title="Files" onClick={handleLinkClick}>
          <Folder className="w-5 h-5 flex-shrink-0" />
          {(!isCollapsed || window.innerWidth < 768) && <span className="font-medium">Files</span>}
        </Link>

        <div className="my-2 border-t border-slate-800"></div>

        <Link to="/subscription" className={getLinkClass('/subscription')} title="Subscription & Limits" onClick={handleLinkClick}>
          <CreditCard className="w-5 h-5 flex-shrink-0" />
          {(!isCollapsed || window.innerWidth < 768) && <span className="font-medium">Subscription</span>}
        </Link>

        {isAdmin && (
          <Link to="/admin" className={getLinkClass('/admin')} title="Admin Dashboard" onClick={handleLinkClick}>
            <Shield className="w-5 h-5 flex-shrink-0" />
            {(!isCollapsed || window.innerWidth < 768) && <span className="font-medium">Admin Dashboard</span>}
          </Link>
        )}
      </nav>
      
      <div className="p-3 border-t border-slate-800 dark:bg-slate-900 dark:text-slate-100">
        <button 
          onClick={() => { handleLinkClick(); handleLogout(); }}
          className={`w-full flex items-center ${isCollapsed && window.innerWidth >= 768 ? 'justify-center' : 'gap-3'} p-3 rounded transition-colors text-slate-300 hover:bg-slate-800 hover:text-slate-100`}
          title="Log Out"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {(!isCollapsed || window.innerWidth < 768) && <span className="font-medium">Log Out</span>}
        </button>
      </div>
    </div>
    </>
  );
}
