import { useState, useEffect } from 'react';
import { 
  X, 
  CheckSquare, 
  Book, 
  Search, 
  Plus, 
  GripVertical, 
  Folder, 
  Circle, 
  Clock, 
  CheckCircle2, 
  Sparkles
} from 'lucide-react';
import useTaskStore from '../../store/useTaskStore';
import useNotebookStore from '../../store/useNotebookStore';

const STATUS_ICONS = {
  0: Circle,
  1: Clock,
  2: CheckCircle2
};

const STATUS_COLORS = {
  0: 'text-slate-400',
  1: 'text-amber-500',
  2: 'text-emerald-500'
};

function stripHtml(html) {
  if (!html) return '';
  const tmp = document.createElement('DIV');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

export default function ResourceDrawer({ isOpen, onClose, onInsertResource }) {
  const [activeTab, setActiveTab] = useState('tasks'); // 'tasks' | 'notes'
  const [searchQuery, setSearchQuery] = useState('');

  const { tasks, fetchTasks } = useTaskStore();
  const { notebooks, fetchNotebooks } = useNotebookStore();

  useEffect(() => {
    if (isOpen) {
      fetchTasks();
      fetchNotebooks();
    }
  }, [isOpen, fetchTasks, fetchNotebooks]);

  if (!isOpen) return null;

  // Flatten notes from notebooks
  const allNotes = notebooks.flatMap((nb) =>
    (nb.notes || []).map((n) => ({
      ...n,
      notebookName: nb.name
    }))
  );

  const filteredTasks = tasks.filter((t) =>
    (t.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.project || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredNotes = allNotes.filter((n) =>
    (n.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (n.notebookName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    stripHtml(n.content).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDragStart = (e, type, data) => {
    e.dataTransfer.setData('application/sanad-resource', JSON.stringify({ type, data }));
  };

  return (
    <div className="absolute top-14 right-3 bottom-3 w-80 sm:w-96 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800 z-40 flex flex-col overflow-hidden animate-in slide-in-from-right duration-200 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Sanad Resources</h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">Drag & drop cards onto whiteboard</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex p-2 gap-1.5 bg-slate-100/60 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-700/50">
        <button
          onClick={() => setActiveTab('tasks')}
          className={`flex-1 flex items-center justify-center gap-2 py-1.5 px-3 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'tasks'
              ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <CheckSquare className="w-3.5 h-3.5" />
          <span>Tasks ({tasks.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('notes')}
          className={`flex-1 flex items-center justify-center gap-2 py-1.5 px-3 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'notes'
              ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Book className="w-3.5 h-3.5" />
          <span>Notes ({allNotes.length})</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="p-3 border-b border-slate-100 dark:border-slate-700/50">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder={activeTab === 'tasks' ? 'Search tasks or projects...' : 'Search notes or notebooks...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Items List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {activeTab === 'tasks' ? (
          filteredTasks.length > 0 ? (
            filteredTasks.map((task) => {
              const StatusIcon = STATUS_ICONS[task.status] || Circle;
              const statusColor = STATUS_COLORS[task.status] || 'text-slate-400';

              return (
                <div
                  key={task.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, 'sanad-task', task)}
                  className="group relative p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl shadow-sm hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700 transition-all cursor-grab active:cursor-grabbing select-none"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 min-w-0 flex-1">
                      <StatusIcon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${statusColor}`} />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-slate-800 dark:text-slate-100 line-clamp-2">
                          {task.title}
                        </div>
                        {task.project && (
                          <div className="inline-flex items-center gap-1 mt-1 text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                            <Folder className="w-2.5 h-2.5" />
                            <span className="truncate">{task.project}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onInsertResource('sanad-task', task)}
                        className="opacity-80 group-hover:opacity-100 p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/80 text-indigo-600 dark:text-indigo-300 text-xs font-medium inline-flex items-center gap-1 transition-all"
                        title="Insert into canvas"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      <GripVertical className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 cursor-grab" />
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-6 text-center text-xs text-slate-400 dark:text-slate-500">
              No tasks found.
            </div>
          )
        ) : (
          filteredNotes.length > 0 ? (
            filteredNotes.map((note) => {
              const snippet = stripHtml(note.content);

              return (
                <div
                  key={note.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, 'sanad-note', note)}
                  className="group relative p-3 bg-amber-50/70 dark:bg-slate-800 border border-amber-200/80 dark:border-slate-700/80 rounded-xl shadow-sm hover:shadow-md hover:border-amber-400 dark:hover:border-amber-700 transition-all cursor-grab active:cursor-grabbing select-none"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-semibold text-amber-800 dark:text-amber-400 truncate">
                        {note.notebookName || 'Notebook'}
                      </div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate mt-0.5">
                        {note.title || 'Untitled Note'}
                      </div>
                      {snippet && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                          {snippet}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onInsertResource('sanad-note', note)}
                        className="opacity-80 group-hover:opacity-100 p-1.5 rounded-lg bg-amber-100 hover:bg-amber-200/80 dark:bg-amber-950/60 dark:hover:bg-amber-900/80 text-amber-800 dark:text-amber-300 text-xs font-medium inline-flex items-center gap-1 transition-all"
                        title="Insert into canvas"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      <GripVertical className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 cursor-grab" />
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-6 text-center text-xs text-slate-400 dark:text-slate-500">
              No notes found.
            </div>
          )
        )}
      </div>

      {/* Footer Info */}
      <div className="p-2.5 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-700/60 text-center text-[10px] text-slate-400 dark:text-slate-500">
        Tip: Drag any card and drop it directly onto the canvas!
      </div>
    </div>
  );
}
