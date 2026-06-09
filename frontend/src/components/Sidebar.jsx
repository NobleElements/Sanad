import { Link, useLocation } from 'react-router-dom';

export default function Sidebar() {
  const location = useLocation();

  const getLinkClass = (path) => {
    const isActive = location.pathname === path;
    return `p-2 rounded transition ${isActive ? 'bg-slate-800 text-slate-100 hover:bg-slate-700' : 'text-slate-300 hover:bg-slate-800'}`;
  };

  return (
    <div className="w-64 bg-slate-900 text-slate-100 flex flex-col p-4">
      <div className="text-2xl font-bold mb-8 tracking-wider">SANAD</div>
      <nav className="flex flex-col gap-2">
        <Link to="/" className={getLinkClass('/')}>Dashboard</Link>
        <Link to="/tasks" className={getLinkClass('/tasks')}>Tasks</Link>
        <Link to="#" onClick={(e) => e.preventDefault()} className="p-2 rounded hover:bg-slate-800 transition text-slate-400">Notebook (Coming Soon)</Link>
        <Link to="/finance" className={getLinkClass('/finance')}>Finance</Link>
      </nav>
    </div>
  );
}
