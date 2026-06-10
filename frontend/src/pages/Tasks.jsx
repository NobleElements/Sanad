import { useState, useEffect } from 'react';
import { Plus, CheckCircle2, Circle, Clock, Tag, Loader2, GripVertical, Filter, FolderKanban, Timer, Eye, EyeOff, Search } from 'lucide-react';
import useTaskStore from '../store/useTaskStore';
import { formatTime } from '../utils/dateUtils';

const TAG_COLORS = [
  'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
  'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300',
  'bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-300',
  'bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300',
  'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300',
  'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300',
];

const COLUMNS = [
  { status: 0, label: 'To Do', icon: Circle, color: 'text-slate-500 dark:text-slate-400', bgBadge: 'bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-300', headerBorder: 'border-slate-300 dark:border-slate-600' },
  { status: 1, label: 'In Progress', icon: Clock, color: 'text-amber-500 dark:text-amber-400', bgBadge: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300', headerBorder: 'border-amber-300 dark:border-amber-600' },
  { status: 2, label: 'Done', icon: CheckCircle2, color: 'text-emerald-500 dark:text-emerald-400', bgBadge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300', headerBorder: 'border-emerald-300 dark:border-emerald-600' },
];



export default function Tasks() {
  const { tasks, isLoaded, fetchTasks, updateTaskStatus, openTaskModal } = useTaskStore();
  
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);
  const [projectFilter, setProjectFilter] = useState(() => {
    return localStorage.getItem('sanad_project_filter') || '';
  });
  const [tagFilter, setTagFilter] = useState(() => {
    return localStorage.getItem('sanad_tag_filter') || '';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [showCompleted, setShowCompleted] = useState(() => {
    const saved = localStorage.getItem('sanad_show_completed');
    return saved !== null ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    localStorage.setItem('sanad_show_completed', JSON.stringify(showCompleted));
  }, [showCompleted]);

  useEffect(() => {
    localStorage.setItem('sanad_project_filter', projectFilter);
  }, [projectFilter]);

  useEffect(() => {
    localStorage.setItem('sanad_tag_filter', tagFilter);
  }, [tagFilter]);

  useEffect(() => {
    if (!isLoaded) {
      fetchTasks();
    }
  }, [isLoaded, fetchTasks]);

  // Derive unique values for filter dropdowns
  const projects = [...new Set(tasks.map(t => t.project).filter(Boolean))].sort();
  const tags = [...new Set(tasks.flatMap(t => t.tags ? t.tags.split(',').map(tag => tag.trim()).filter(Boolean) : []))].sort();

  // Filtered tasks
  const filteredTasks = tasks.filter(t => {
    if (projectFilter && t.project !== projectFilter) return false;
    
    if (tagFilter) {
      const taskTags = t.tags ? t.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [];
      if (!taskTags.includes(tagFilter)) return false;
    }
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchesTitle = t.title?.toLowerCase().includes(q);
      const matchesContent = t.content?.toLowerCase().includes(q);
      if (!matchesTitle && !matchesContent) return false;
    }
    
    return true;
  });

  // Group tasks by status
  const tasksByStatus = (status) => filteredTasks.filter(t => {
    const s = typeof t.status === 'string'
      ? (t.status === 'Done' ? 2 : t.status === 'InProgress' ? 1 : 0)
      : t.status;
    return s === status;
  });

  // --- Drag and Drop ---
  const handleDragStart = (e, task) => {
    e.dataTransfer.setData('taskId', task.id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggingId(task.id);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e, status) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(status);
  };

  const handleDragLeave = (e, status) => {
    // Only clear if we're actually leaving the column
    if (dragOverColumn === status) {
      setDragOverColumn(null);
    }
  };

  const handleDrop = async (e, newStatus) => {
    e.preventDefault();
    setDragOverColumn(null);
    const taskId = e.dataTransfer.getData('taskId');
    if (!taskId) return;

    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const currentStatus = typeof task.status === 'string'
      ? (task.status === 'Done' ? 2 : task.status === 'InProgress' ? 1 : 0)
      : task.status;

    if (currentStatus === newStatus) return;
    await updateTaskStatus(taskId, { status: newStatus });
  };

  // Quick complete toggle
  const handleQuickComplete = async (e, task) => {
    e.stopPropagation();
    const currentStatus = typeof task.status === 'string'
      ? (task.status === 'Done' ? 2 : task.status === 'InProgress' ? 1 : 0)
      : task.status;
    const newStatus = currentStatus === 2 ? 0 : 2;
    await updateTaskStatus(task.id, { status: newStatus });
  };



  return (
    <div className="max-w-full mx-auto space-y-6 p-4 md:p-6 lg:p-8">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Tasks
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Search Input */}
          <div className="relative flex-1 sm:flex-none sm:w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            />
          </div>
          
          {/* Tag Filter */}
          {tags.length > 0 && (
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <select
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                className="pl-9 pr-4 py-2.5 text-sm bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-indigo-500 focus:border-indigo-500 transition-colors appearance-none cursor-pointer"
              >
                <option value="">All Tags</option>
                {tags.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          )}

          {/* Project Filter */}
          {projects.length > 0 && (
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                className="pl-9 pr-4 py-2.5 text-sm bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-indigo-500 focus:border-indigo-500 transition-colors appearance-none cursor-pointer"
              >
                <option value="">All Projects</option>
                {projects.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          )}
          
          {/* Show/Hide Completed Toggle */}
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="inline-flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all shadow-sm"
            title={showCompleted ? "Hide Done column" : "Show Done column"}
          >
            {showCompleted ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            <span className="hidden sm:inline">{showCompleted ? "Hide Done" : "Show Done"}</span>
          </button>

          <button
            onClick={() => openTaskModal()}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all shadow-sm hover:shadow-md dark:focus:ring-offset-gray-900 active:scale-95"
          >
            <Plus className="w-5 h-5" />
            Create Task
          </button>
        </div>
      </div>

      {/* Main Content */}
      {!isLoaded ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-4" />
          <p>Loading tasks...</p>
        </div>
      ) : (
        <div className="kanban-board">
          {(showCompleted ? COLUMNS : COLUMNS.filter(c => c.status !== 2)).map(col => {
            const colTasks = tasksByStatus(col.status);
            const ColIcon = col.icon;
            const isDragOver = dragOverColumn === col.status;

            return (
              <div
                key={col.status}
                className={`kanban-column ${isDragOver ? 'drag-over' : ''}`}
                onDragOver={(e) => handleDragOver(e, col.status)}
                onDragLeave={(e) => handleDragLeave(e, col.status)}
                onDrop={(e) => handleDrop(e, col.status)}
              >
                {/* Column Header */}
                <div className={`flex items-center justify-between px-4 py-3 border-b-2 ${col.headerBorder}`}>
                  <div className="flex items-center gap-2">
                    <ColIcon className={`w-5 h-5 ${col.color}`} />
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                      {col.label}
                    </h3>
                  </div>
                  <span className={`inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full text-xs font-semibold ${col.bgBadge}`}>
                    {colTasks.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="flex-1 p-3 space-y-3 overflow-y-auto">
                  {colTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-gray-400 dark:text-gray-500 transition-colors">
                      <GripVertical className="w-6 h-6 mb-2 opacity-40" />
                      <p className="text-sm font-medium">Drop tasks here</p>
                    </div>
                  ) : (
                    colTasks.map(task => {
                      const isDone = (typeof task.status === 'number' ? task.status : (task.status === 'Done' ? 2 : task.status === 'InProgress' ? 1 : 0)) === 2;
                      const taskTags = task.tags
                        ? task.tags.split(',').map(t => t.trim()).filter(Boolean)
                        : [];
                      const estTime = formatTime(task.estimatedMinutes);

                      return (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, task)}
                          onDragEnd={handleDragEnd}
                          onClick={() => openTaskModal(task)}
                          className={`kanban-card bg-white dark:bg-gray-800/80 border border-gray-100 dark:border-gray-700/60 p-3.5 ${draggingId === task.id ? 'dragging' : ''}`}
                        >
                          <div className="flex items-start gap-3">
                            {/* Quick Complete Checkbox */}
                            <button
                              onClick={(e) => handleQuickComplete(e, task)}
                              className={`mt-0.5 flex-shrink-0 transition-colors ${isDone ? 'text-emerald-500 hover:text-emerald-600' : 'text-gray-300 dark:text-gray-600 hover:text-emerald-400 dark:hover:text-emerald-500'}`}
                              aria-label={isDone ? 'Mark as to do' : 'Mark as done'}
                            >
                              {isDone ? (
                                <CheckCircle2 className="w-5 h-5" />
                              ) : (
                                <Circle className="w-5 h-5" />
                              )}
                            </button>

                            <div className="flex-1 min-w-0">
                              {/* Title */}
                              <p className={`text-sm font-semibold leading-snug ${isDone ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-gray-900 dark:text-gray-100'}`}>
                                {task.title}
                              </p>

                              {/* Metadata row */}
                              <div className="flex flex-wrap items-center gap-2 mt-2">
                                {/* Project Badge */}
                                {task.project && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-500/10 text-xs font-medium text-indigo-600 dark:text-indigo-400">
                                    <FolderKanban className="w-3 h-3" />
                                    {task.project}
                                  </span>
                                )}

                                {/* Estimated Time Badge */}
                                {estTime && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 text-xs font-medium text-gray-500 dark:text-gray-400">
                                    <Timer className="w-3 h-3" />
                                    {estTime}
                                  </span>
                                )}
                              </div>

                              {/* Tags */}
                              {taskTags.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                  {taskTags.map((tag, i) => (
                                    <span
                                      key={tag}
                                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${TAG_COLORS[i % TAG_COLORS.length]}`}
                                    >
                                      <Tag className="w-2.5 h-2.5" />
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Drag Handle */}
                            <GripVertical className="w-4 h-4 flex-shrink-0 text-gray-300 dark:text-gray-600 mt-0.5" />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
