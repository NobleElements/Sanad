import { useState, useEffect } from 'react';
import { Plus, CheckCircle2, Circle, Clock, Tag, MoreVertical, Loader2 } from 'lucide-react';
import TaskDrawer from '../components/TaskDrawer';

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);

  const fetchTasks = async () => {
    try {
      setError(null);
      setLoading(true);
      const res = await fetch('/api/tasks');
      if (!res.ok) throw new Error('Failed to fetch tasks');
      const data = await res.json();
      setTasks(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTasks();
  }, []);

  const getStatusIcon = (status) => {
    if (status === 2 || status === 'Done') return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
    if (status === 1 || status === 'InProgress') return <Clock className="w-5 h-5 text-amber-500" />;
    return <Circle className="w-5 h-5 text-gray-400 dark:text-gray-500" />;
  };

  const getStatusLabel = (status) => {
    if (status === 2 || status === 'Done') return 'Done';
    if (status === 1 || status === 'InProgress') return 'In Progress';
    return 'To Do';
  };

  const getStatusColor = (status) => {
    if (status === 2 || status === 'Done') return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 ring-emerald-600/20';
    if (status === 1 || status === 'InProgress') return 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 ring-amber-600/20';
    return 'bg-gray-50 text-gray-700 dark:bg-gray-500/10 dark:text-gray-400 ring-gray-600/20';
  };

  const handleSaveTask = async (taskData) => {
    try {
      const isNew = taskData.isNew;
      const method = isNew ? 'POST' : 'PUT';
      const url = isNew ? '/api/tasks' : `/api/tasks/${taskData.id}`;
      
      const payload = { ...taskData };
      delete payload.isNew;
      
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) throw new Error('Failed to save task');
      
      await fetchTasks();
      setSelectedTask(null);
    } catch (err) {
      console.error('Save error:', err);
      alert('Failed to save task: ' + err.message);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 p-4 md:p-6 lg:p-8">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Tasks
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage your daily tasks and track progress.
          </p>
        </div>
        <button
          onClick={() => setSelectedTask({ isNew: true, title: '', status: 'ToDo', content: '' })}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all shadow-sm hover:shadow-md dark:focus:ring-offset-gray-900 active:scale-95"
        >
          <Plus className="w-5 h-5" />
          Create Task
        </button>
      </div>

      {/* Main Content */}
      <div className="bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-4" />
            <p>Loading tasks...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-64 text-center px-4">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-500/10 rounded-full flex items-center justify-center mb-3">
              <span className="text-red-600 dark:text-red-400 font-bold text-xl">!</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Failed to load tasks</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{error}</p>
            <button 
              onClick={fetchTasks}
              className="mt-4 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
            >
              Try again
            </button>
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center px-4">
            <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-500/10 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-indigo-500 dark:text-indigo-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">All caught up!</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-sm">
              You don't have any tasks yet. Create one to get started.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800/50">
            {tasks.map((task) => (
              <li 
                key={task.id}
                className="group relative flex items-center justify-between p-4 sm:p-5 hover:bg-gray-50/80 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                onClick={() => setSelectedTask(task)}
              >
                <div className="flex items-start gap-4 min-w-0 flex-1">
                  <div className="mt-1 flex-shrink-0">
                    {getStatusIcon(task.status)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <p className={`text-base font-semibold truncate ${
                        (task.status === 2 || task.status === 'Done') 
                          ? 'text-gray-500 dark:text-gray-400 line-through' 
                          : 'text-gray-900 dark:text-gray-100'
                      }`}>
                        {task.title}
                      </p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset ${getStatusColor(task.status)}`}>
                        {getStatusLabel(task.status)}
                      </span>
                    </div>
                    {typeof task.tags === 'string' && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {task.tags.split(',').map((tag) => {
                          const trimmedTag = tag.trim();
                          if (!trimmedTag) return null;
                          return (
                            <span 
                              key={trimmedTag} 
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-xs font-medium text-gray-600 dark:text-gray-300"
                            >
                              <Tag className="w-3 h-3" />
                              {trimmedTag}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-4 ml-4">
                  <div className="hidden sm:block text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                    {task.createdAt && new Date(task.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log('task actions', task.id);
                    }}
                    className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                    aria-label="More options"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <TaskDrawer 
        key={selectedTask ? (selectedTask.id || 'new') : 'empty'}
        task={selectedTask} 
        onClose={() => setSelectedTask(null)} 
        onSave={handleSaveTask} 
      />
    </div>
  );
}
