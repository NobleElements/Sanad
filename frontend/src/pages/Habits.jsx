import { useState, useEffect } from 'react';
import { Plus, Trash, ChevronDown, ChevronUp, Check, X, GripVertical } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import EmojiPicker from 'emoji-picker-react';
import { format, subDays, startOfDay, isSameDay, subMonths, eachDayOfInterval } from 'date-fns';
import useHabitStore from '../store/useHabitStore';
import usePageTitle from '../hooks/usePageTitle';

export default function Habits() {
  usePageTitle('Habits');
  const { habits, isLoaded, fetchHabits, createHabit, deleteHabit, toggleHabitLog, reorderHabits } = useHabitStore();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newHabit, setNewHabit] = useState({ name: '', icon: '🌟', frequency: 'Daily' });
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [expandedHabits, setExpandedHabits] = useState(new Set());

  useEffect(() => {
    fetchHabits();
  }, [fetchHabits]);

  const handleCreate = async () => {
    if (!newHabit.name.trim()) return;
    const success = await createHabit(newHabit);
    if (success) {
      setIsAddModalOpen(false);
      setNewHabit({ name: '', icon: '🌟', frequency: 'Daily' });
      setShowEmojiPicker(false);
    }
  };

  const toggleExpand = (id) => {
    const newSet = new Set(expandedHabits);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedHabits(newSet);
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;
    if (result.destination.index === result.source.index) return;
    reorderHabits(result.source.index, result.destination.index);
  };

  // Helper to check if a habit has a completed log for a specific Date object
  const isCompleted = (habit, date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return habit.logs?.some(l => l.completed && format(new Date(l.date), 'yyyy-MM-dd') === dateStr);
  };

  // Last 7 days including today
  const last7Days = Array.from({ length: 7 }).map((_, i) => subDays(startOfDay(new Date()), 6 - i));
  
  // Last 90 days for the heat map
  const last90Days = eachDayOfInterval({
    start: subDays(startOfDay(new Date()), 89),
    end: startOfDay(new Date())
  });

  if (!isLoaded) return <div className="p-8 text-slate-400 dark:text-slate-500">Loading habits...</div>;

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200">Habits</h1>
            <p className="text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-1">Track your daily routines and build streaks</p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-600 dark:bg-indigo-500 text-white text-sm sm:text-base px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg flex items-center gap-1.5 sm:gap-2 transition-colors font-medium shadow-sm"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            Add Habit
          </button>
        </div>

        <div className="space-y-4">
          {habits.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100">
              <div className="text-5xl mb-4">🌱</div>
              <h3 className="text-xl font-medium text-slate-700 dark:text-slate-300 mb-2">No habits yet</h3>
              <p className="text-slate-500 dark:text-slate-400 dark:text-slate-500 mb-6">Start building good routines today.</p>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:text-indigo-300 font-medium"
              >
                Create your first habit
              </button>
            </div>
          ) : (
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="habits">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                    {habits.map((habit, index) => (
                      <Draggable key={habit.id} draggableId={habit.id} index={index}>
                        {(provided, snapshot) => (
                          <div 
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-all ${snapshot.isDragging ? 'shadow-xl ring-2 ring-indigo-500 scale-[1.02]' : 'hover:shadow-md'}`}
                          >
                            <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                                <div 
                                  {...provided.dragHandleProps} 
                                  className="text-slate-300 hover:text-slate-500 dark:text-slate-400 dark:text-slate-500 cursor-grab active:cursor-grabbing p-1 -ml-1 sm:-ml-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:bg-slate-900 dark:hover:bg-slate-700/50 dark:bg-slate-900 shrink-0"
                                >
                                  <GripVertical className="w-5 h-5" />
                                </div>
                                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-xl sm:text-2xl flex-shrink-0">
                                  {habit.icon}
                                </div>
                                <div className="min-w-0 flex-1 pr-2">
                                  <h3 className="text-base sm:text-lg font-semibold text-slate-800 dark:text-slate-200 truncate" title={habit.name}>{habit.name}</h3>
                                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">{habit.frequency}</p>
                                </div>
                              </div>
                              
                              <div className="flex items-center justify-between md:justify-end w-full md:w-auto gap-4">
                                {/* 7-Day Streak */}
                                <div className="flex items-center justify-start gap-1.5 sm:gap-2 overflow-x-auto pb-1 pr-2 pt-1 scrollbar-hide flex-1 md:flex-none">
                                  {last7Days.map(date => {
                                    const completed = isCompleted(habit, date);
                                    const isToday = isSameDay(date, new Date());
                                    return (
                                      <button
                                        key={date.toISOString()}
                                        onClick={() => toggleHabitLog(habit.id, format(date, 'yyyy-MM-dd'))}
                                        className={`min-w-[28px] w-7 h-7 sm:w-8 sm:h-8 rounded-md flex items-center justify-center text-[10px] sm:text-xs font-medium transition-all cursor-pointer flex-shrink-0
                                          ${completed ? 'bg-green-500 dark:bg-emerald-500 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'}
                                          ${isToday && !completed ? 'ring-2 ring-indigo-200 dark:ring-indigo-500/50 ring-offset-1 dark:ring-offset-slate-800' : ''}
                                        `}
                                        title={format(date, 'MMM d, yyyy')}
                                      >
                                        {completed ? <Check className="w-3 h-3 sm:w-4 sm:h-4" /> : format(date, 'd')}
                                      </button>
                                    );
                                  })}
                                </div>

                                <div className="flex gap-1 sm:gap-2 shrink-0 md:ml-2">
                                  <button
                                    onClick={() => toggleExpand(habit.id)}
                                    className="p-1.5 sm:p-2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:bg-slate-900 dark:hover:bg-slate-700/50 dark:bg-slate-900 rounded-lg transition-colors"
                                  >
                                    {expandedHabits.has(habit.id) ? <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5" /> : <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5" />}
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (confirm('Are you sure you want to delete this habit?')) {
                                        deleteHabit(habit.id);
                                      }
                                    }}
                                    className="p-1.5 sm:p-2 text-red-400 hover:text-red-600 dark:text-red-400 hover:bg-red-50 dark:bg-red-500/10 rounded-lg transition-colors"
                                    title="Delete Habit"
                                  >
                                    <Trash className="w-4 h-4 sm:w-5 sm:h-5" />
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Expanded Section (Heat map & Analysis) */}
                            {expandedHabits.has(habit.id) && (
                              <div className="border-t border-slate-100 p-5 bg-slate-50 dark:bg-slate-900 dark:text-slate-100">
                                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Last 3 Months Activity</h4>
                                <div className="flex flex-wrap gap-1.5">
                                  {last90Days.map(date => {
                                    const completed = isCompleted(habit, date);
                                    return (
                                      <div
                                        key={date.toISOString()}
                                        onClick={() => toggleHabitLog(habit.id, format(date, 'yyyy-MM-dd'))}
                                        className={`w-4 h-4 rounded-[3px] cursor-pointer transition-colors
                                          ${completed ? 'bg-green-500 dark:bg-emerald-500 hover:bg-green-600 dark:hover:bg-emerald-600' : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600'}
                                        `}
                                        title={`${format(date, 'MMM d, yyyy')}${completed ? ' (Completed)' : ''}`}
                                      />
                                    );
                                  })}
                                </div>
                                <div className="mt-4 flex gap-4 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-3 h-3 rounded-[2px] bg-slate-200 dark:bg-slate-700"></div>
                                    <span>Uncompleted</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-3 h-3 rounded-[2px] bg-green-500 dark:bg-emerald-500"></div>
                                    <span>Completed</span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </div>
      </div>

      {/* Add Habit Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:bg-slate-700 dark:text-slate-100">
              <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200">Create New Habit</h2>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-400 dark:text-slate-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Habit Name</label>
                <input
                  type="text"
                  value={newHabit.name}
                  onChange={(e) => setNewHabit({ ...newHabit, name: e.target.value })}
                  placeholder="e.g., Read for 30 minutes"
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all dark:bg-slate-700 dark:text-slate-100"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Icon</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="w-full flex items-center gap-3 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:bg-slate-900 dark:hover:bg-slate-700/50 dark:bg-slate-900 transition-colors text-left focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:text-slate-100"
                  >
                    <span className="text-2xl">{newHabit.icon}</span>
                    <span className="text-slate-500 dark:text-slate-400 dark:text-slate-500 text-sm">Choose an icon...</span>
                  </button>
                  {showEmojiPicker && (
                    <div className="absolute top-full left-0 mt-2 z-10 shadow-xl rounded-lg">
                      <EmojiPicker 
                        onEmojiClick={(emojiData) => {
                          setNewHabit({ ...newHabit, icon: emojiData.emoji });
                          setShowEmojiPicker(false);
                        }} 
                      />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Frequency</label>
                <select
                  value={newHabit.frequency}
                  onChange={(e) => setNewHabit({ ...newHabit, frequency: e.target.value })}
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-800 transition-all dark:text-slate-100"
                >
                  <option value="Daily">Daily</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Monthly">Monthly</option>
                </select>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 dark:bg-slate-800 flex justify-end gap-3 rounded-b-2xl dark:text-slate-100">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!newHabit.name.trim()}
                className="bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-600 dark:bg-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium transition-colors shadow-sm"
              >
                Create Habit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
