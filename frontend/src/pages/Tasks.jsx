import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactDOM from 'react-dom';
import { Plus, CheckCircle2, Circle, Clock, Tag, Loader2, GripVertical, Filter, FolderKanban, Timer, Eye, EyeOff, Search, LayoutGrid, List } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import useTaskStore from '../store/useTaskStore';
import { formatTime } from '../utils/dateUtils';
import usePageTitle from '../hooks/usePageTitle';
import TaskModal from '../components/TaskModal';

import { getTagColor } from '../utils/colorUtils';

const COLUMNS = [
  { status: 0, label: 'To Do', icon: Circle, color: 'text-slate-500 dark:text-slate-400', bgBadge: 'bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-300', headerBorder: 'border-slate-300 dark:border-slate-600' },
  { status: 1, label: 'In Progress', icon: Clock, color: 'text-amber-500 dark:text-amber-400', bgBadge: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300', headerBorder: 'border-amber-300 dark:border-amber-600' },
  { status: 2, label: 'Done', icon: CheckCircle2, color: 'text-emerald-500 dark:text-emerald-400', bgBadge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300', headerBorder: 'border-emerald-300 dark:border-emerald-600' },
];



export default function Tasks() {
  usePageTitle('Tasks');
  const { tasks, isLoaded, fetchTasks, updateTaskStatus, reorderTasks, openTaskModal, isTaskModalOpen, activeTask, closeTaskModal } = useTaskStore();
  const { taskId } = useParams();
  const navigate = useNavigate();
  
  const [projectFilter, setProjectFilter] = useState(() => {
    return localStorage.getItem('sanad_project_filter') || '';
  });
  const [tagFilter, setTagFilter] = useState(() => {
    return localStorage.getItem('sanad_tag_filter') || '';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [showCompleted, setShowCompleted] = useState(() => {
    const saved = localStorage.getItem('sanad_show_completed');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('sanad_tasks_viewMode') || 'kanban';
  });

  useEffect(() => {
    localStorage.setItem('sanad_tasks_viewMode', viewMode);
  }, [viewMode]);

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

  useEffect(() => {
    if (isLoaded && taskId) {
      const currentState = useTaskStore.getState();
      if (!currentState.isTaskModalOpen || currentState.activeTask?.id?.toString() !== taskId) {
        const t = tasks.find(x => x.id.toString() === taskId);
        if (t) {
          openTaskModal(t);
        }
      }
    }
  }, [taskId, isLoaded, tasks, openTaskModal]);

  useEffect(() => {
    if (isTaskModalOpen && activeTask && activeTask.id) {
      navigate(`/tasks/${activeTask.id}`, { replace: true });
    } else if (!isTaskModalOpen && taskId) {
      navigate(`/tasks`, { replace: true });
    }
  }, [isTaskModalOpen, activeTask, navigate, taskId]);

  useEffect(() => {
    return () => {
      closeTaskModal();
    };
  }, [closeTaskModal]);

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
  const onDragEnd = async (result) => {
    const { source, destination } = result;

    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const sourceStatus = parseInt(source.droppableId, 10);
    const destStatus = parseInt(destination.droppableId, 10);

    const sourceTasks = tasksByStatus(sourceStatus);
    let destTasks = sourceStatus === destStatus ? sourceTasks : tasksByStatus(destStatus);

    const [movedTask] = sourceTasks.splice(source.index, 1);
    
    if (sourceStatus === destStatus) {
      sourceTasks.splice(destination.index, 0, movedTask);
      destTasks = sourceTasks;
    } else {
      destTasks.splice(destination.index, 0, movedTask);
    }

    const updates = destTasks.map((t, i) => ({ id: t.id, status: destStatus, order: i }));
    if (sourceStatus !== destStatus) {
      updates.push(...sourceTasks.map((t, i) => ({ id: t.id, status: sourceStatus, order: i })));
    }

    await reorderTasks(updates);
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
    <div className={`flex flex-col flex-1 max-w-full mx-auto p-4 md:p-6 lg:p-8 ${viewMode === 'kanban' ? 'h-full overflow-hidden' : 'min-h-full'}`}>
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Tasks
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Search Input */}
          <div className={`relative transition-all duration-300 ease-in-out flex-shrink-0 ${isSearchExpanded || searchQuery ? 'w-full sm:w-64' : 'w-10 h-10'}`}>
            <button 
              type="button"
              onClick={() => {
                setIsSearchExpanded(true);
                setTimeout(() => document.getElementById('task-search-input')?.focus(), 50);
              }}
              className={`absolute inset-0 flex items-center justify-center transition-opacity ${isSearchExpanded || searchQuery ? 'opacity-0 pointer-events-none' : 'opacity-100 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 bg-white/60 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl z-10'}`}
              aria-label="Expand search"
            >
              <Search className="w-4 h-4 text-gray-500" />
            </button>
            <div className={`relative transition-all duration-300 ${isSearchExpanded || searchQuery ? 'opacity-100 w-full' : 'opacity-0 w-0 overflow-hidden pointer-events-none'}`}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                id="task-search-input"
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onBlur={() => { if (!searchQuery) setIsSearchExpanded(false); }}
                className="w-full h-10 pl-9 pr-4 py-2.5 text-sm bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              />
            </div>
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
          
          {/* View Mode Toggle */}
          <div className="flex bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl border border-gray-200 dark:border-gray-700 rounded-xl p-1 shadow-sm">
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-lg flex items-center justify-center transition-all ${viewMode === 'kanban' ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
              title="Kanban View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg flex items-center justify-center transition-all ${viewMode === 'list' ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

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
            onClick={() => openTaskModal({ title: '', content: '', status: 'ToDo', isNew: true, project: projectFilter || '' })}
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
        <DragDropContext onDragEnd={onDragEnd}>
          <div className={viewMode === 'kanban' ? "kanban-board" : "flex flex-col gap-6 pb-4"}>
            {(showCompleted ? COLUMNS : COLUMNS.filter(c => c.status !== 2)).map(col => {
              const colTasks = tasksByStatus(col.status);
              const ColIcon = col.icon;

              return (
                <Droppable droppableId={col.status.toString()} key={col.status}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`${viewMode === 'kanban' ? 'kanban-column' : 'flex flex-col rounded-2xl bg-white/60 dark:bg-gray-800/40 backdrop-blur-xl border border-gray-200 dark:border-gray-700 overflow-hidden'} ${snapshot.isDraggingOver ? 'drag-over border-indigo-500/50 dark:border-indigo-400/50 bg-indigo-50/30 dark:bg-indigo-900/10' : ''}`}
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
                      <div className={viewMode === 'kanban' ? "flex-1 p-3 overflow-y-auto" : "p-0 flex flex-col"}>
                        {colTasks.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-gray-400 dark:text-gray-500 transition-colors">
                            <GripVertical className="w-6 h-6 mb-2 opacity-40" />
                            <p className="text-sm font-medium">Drop tasks here</p>
                          </div>
                        ) : (
                          colTasks.map((task, index) => {
                            const isDone = (typeof task.status === 'number' ? task.status : (task.status === 'Done' ? 2 : task.status === 'InProgress' ? 1 : 0)) === 2;
                            const taskTags = task.tags
                              ? task.tags.split(',').map(t => t.trim()).filter(Boolean)
                              : [];
                            const estTime = formatTime(task.estimatedMinutes);

                            return (
                              <Draggable key={task.id} draggableId={task.id.toString()} index={index}>
                                {(provided, snapshot) => {
                                  const child = (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      style={provided.draggableProps.style}
                                      className={viewMode === 'kanban' ? "pb-3" : ""}
                                    >
                                      {viewMode === 'kanban' ? (
                                        <div
                                          className={`kanban-card bg-white dark:bg-gray-800/80 border border-gray-100 dark:border-gray-700/60 p-3.5 cursor-grab active:cursor-grabbing ${snapshot.isDragging ? 'shadow-2xl ring-2 ring-indigo-500' : 'hover:shadow-md'}`}
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

                                            <div className="flex-1 min-w-0" onClick={() => openTaskModal(task)}>
                                              {/* Title */}
                                              <p className={`text-sm font-semibold leading-snug cursor-pointer ${isDone ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-gray-900 dark:text-gray-100'}`}>
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
                                                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getTagColor(tag)}`}
                                                    >
                                                      <Tag className="w-2.5 h-2.5" />
                                                      {tag}
                                                    </span>
                                                  ))}
                                                </div>
                                              )}
                                            </div>

                                            {/* Drag Handle Visual */}
                                            <div className="p-1 -mr-1 rounded-md text-gray-300 dark:text-gray-600">
                                              <GripVertical className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                            </div>
                                          </div>
                                        </div>
                                      ) : (
                                        <div
                                          className={`group flex items-center gap-3 px-4 py-3 bg-white/40 dark:bg-gray-800/20 hover:bg-white dark:hover:bg-gray-800 border-b border-gray-100 dark:border-gray-700/60 last:border-0 cursor-grab active:cursor-grabbing transition-colors ${snapshot.isDragging ? 'shadow-lg ring-1 ring-indigo-500 bg-white dark:bg-gray-800 z-50 rounded-lg' : ''}`}
                                        >
                                          <button
                                            onClick={(e) => handleQuickComplete(e, task)}
                                            className={`flex-shrink-0 transition-colors ${isDone ? 'text-emerald-500 hover:text-emerald-600' : 'text-gray-300 dark:text-gray-600 hover:text-emerald-400 dark:hover:text-emerald-500'}`}
                                          >
                                            {isDone ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                                          </button>
                                          <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 cursor-pointer" onClick={() => openTaskModal(task)}>
                                            <p className={`text-sm font-medium truncate flex-1 ${isDone ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-gray-900 dark:text-gray-100'}`}>
                                              {task.title}
                                            </p>
                                            <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                                              {task.project && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                                                  {task.project}
                                                </span>
                                              )}
                                              {estTime && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                                                  <Timer className="w-3 h-3" />
                                                  {estTime}
                                                </span>
                                              )}
                                              {taskTags.length > 0 && taskTags.slice(0, 2).map((tag) => (
                                                <span key={tag} className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium ${getTagColor(tag)} truncate max-w-[80px]`}>
                                                  {tag}
                                                </span>
                                              ))}
                                              {taskTags.length > 2 && (
                                                <span className="text-[11px] text-gray-400">+{taskTags.length - 2}</span>
                                              )}
                                            </div>
                                          </div>
                                          <div className="p-1 text-gray-300 dark:text-gray-600 md:opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                            <GripVertical className="w-4 h-4" />
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );

                                  if (snapshot.isDragging) {
                                    return ReactDOM.createPortal(child, document.body);
                                  }

                                  return child;
                                }}
                              </Draggable>
                            );
                          })
                        )}
                        {provided.placeholder}
                      </div>
                    </div>
                  )}
                </Droppable>
              );
            })}
          </div>
        </DragDropContext>
      )}
      <TaskModal />
    </div>
  );
}
