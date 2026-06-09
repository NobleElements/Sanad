import { Link } from 'react-router-dom';

export default function Sidebar() {
  return (
    <div className="w-64 bg-slate-900 text-slate-100 flex flex-col p-4">
      <div className="text-2xl font-bold mb-8 tracking-wider">SANAD</div>
      <nav className="flex flex-col gap-2">
        <Link to="/" className="p-2 bg-slate-800 rounded hover:bg-slate-700 transition">Dashboard</Link>
        <Link to="#" onClick={(e) => e.preventDefault()} className="p-2 rounded hover:bg-slate-800 transition text-slate-400">Tasks (Coming Soon)</Link>
        <Link to="#" onClick={(e) => e.preventDefault()} className="p-2 rounded hover:bg-slate-800 transition text-slate-400">Notebook (Coming Soon)</Link>
        <Link to="#" onClick={(e) => e.preventDefault()} className="p-2 rounded hover:bg-slate-800 transition text-slate-400">Finance (Coming Soon)</Link>
      </nav>
    </div>
  );
}
