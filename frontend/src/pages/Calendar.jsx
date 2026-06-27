import React, { useState, useEffect, useRef } from 'react';
import { 
  format, addDays, subDays, startOfWeek, endOfWeek, startOfMonth, 
  endOfMonth, addWeeks, subWeeks, addMonths, subMonths, addYears, subYears, isSameDay
} from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, PanelLeftClose, PanelLeft, LayoutList, Search, Bell, Settings, PanelRightClose } from 'lucide-react';
import useCalendarStore from '../store/useCalendarStore';
import useTaskStore from '../store/useTaskStore';
import CalendarGrid from '../components/Calendar/CalendarGrid';
import EventModal from '../components/Calendar/EventModal';
import CalendarSettingsModal from '../components/Calendar/CalendarSettingsModal';
import CalendarLeftSidebar from '../components/Calendar/CalendarLeftSidebar';
import CategoryEditModal from '../components/Calendar/CategoryEditModal';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

export default function Calendar() {
  const { 
    events, fetchEvents, viewDate, setViewDate, viewMode, setViewMode, categories, fetchCategories,
    todoTasks, fetchTodoTasks
  } = useCalendarStore();
  
  const [showTaskSidebar, setShowTaskSidebar] = useState(true);
  const [showLeftSidebar, setShowLeftSidebar] = useState(true);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedDateSlot, setSelectedDateSlot] = useState(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  
  const [taskSearch, setTaskSearch] = useState('');
  const [taskProjectFilter, setTaskProjectFilter] = useState('');
  
  const isDraggingRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouse = (e) => {
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handleMouse);
    window.addEventListener('mouseup', handleMouse);
    return () => {
      window.removeEventListener('mousemove', handleMouse);
      window.removeEventListener('mouseup', handleMouse);
    };
  }, []);

  useEffect(() => {
    fetchTodoTasks();
    fetchCategories();
  }, [fetchTodoTasks, fetchCategories]);

  useEffect(() => {
    // Fetch events for current view
    // Simplified for now: just fetch a wide range
    const start = new Date(viewDate.getFullYear() - 1, 0, 1);
    const end = new Date(viewDate.getFullYear() + 1, 11, 31);
    fetchEvents(start, end);
  }, [viewDate, viewMode, fetchEvents]);

  // Request Notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  }, []);

  const handleNavigate = (direction) => {
    let newDate = new Date(viewDate);
    if (direction === 'today') {
      newDate = new Date();
    } else {
      const isNext = direction === 'next';
      switch (viewMode) {
        case 'today': newDate = isNext ? addDays(newDate, 1) : subDays(newDate, 1); break;
        case '3days': newDate = isNext ? addDays(newDate, 3) : subDays(newDate, 3); break;
        case 'week': newDate = isNext ? addWeeks(newDate, 1) : subWeeks(newDate, 1); break;
        case 'month': newDate = isNext ? addMonths(newDate, 1) : subMonths(newDate, 1); break;
        case 'year': newDate = isNext ? addYears(newDate, 1) : subYears(newDate, 1); break;
      }
    }
    setViewDate(newDate);
  };

  const handleDragStart = () => {
    isDraggingRef.current = true;
  };

  const handleDragEnd = async (result) => {
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 100);

    if (!result.destination) return;
    const { source, destination, draggableId } = result;

    if (source.droppableId === 'tasks-sidebar' && destination.droppableId.startsWith('cal-')) {
      const taskIdStr = draggableId.replace('task-', '');
      const task = todoTasks.find(t => t.id === taskIdStr);
      if (task) {
        const dateStr = destination.droppableId.replace('cal-', '');
        
        const colsEl = document.getElementById('calendar-timeline-columns');
        let droppedHour = 9;
        let droppedMinutes = 0;
        if (colsEl) {
          const rect = colsEl.getBoundingClientRect();
          const relativeY = lastMousePosRef.current.y - rect.top;
          droppedHour = Math.max(0, Math.min(23, Math.floor(relativeY / 60)));
          droppedMinutes = Math.max(0, Math.min(45, Math.floor((relativeY % 60) / 15) * 15));
        }

        const startD = new Date(dateStr);
        startD.setHours(droppedHour, droppedMinutes, 0, 0);
        const endD = new Date(startD.getTime() + 60 * 60 * 1000); // +1 hr default

        // create new event on dateStr
        await useCalendarStore.getState().createEvent({
          title: task.title,
          description: task.content || '',
          startDate: startD.toISOString(),
          endDate: endD.toISOString(),
          isAllDay: false,
          taskItemId: task.id
        });
        
        // Refresh events
        const start = new Date(viewDate.getFullYear() - 1, 0, 1);
        const end = new Date(viewDate.getFullYear() + 1, 11, 31);
        fetchEvents(start, end);
      }
    } else if (source.droppableId.startsWith('cal-') && destination.droppableId.startsWith('cal-')) {
      const eventId = draggableId.replace('cal-evt-', '').split('_')[0];
      const targetDateStr = destination.droppableId.replace('cal-', '');
      const event = events.find(e => e.id === eventId);
      
      if (event) {
        const newDate = new Date(targetDateStr);
        const originalStart = new Date(event.startDate);
        const originalEnd = new Date(event.endDate);
        
        const durationMs = originalEnd.getTime() - originalStart.getTime();
        
        const newStart = new Date(newDate);
        
        const colsEl = document.getElementById('calendar-timeline-columns');
        if (colsEl) {
          const rect = colsEl.getBoundingClientRect();
          const offset = window.__dragOffset || 0;
          const topEdgeY = lastMousePosRef.current.y - offset;
          const relativeY = topEdgeY - rect.top;
          
          const droppedHour = Math.max(0, Math.min(23, Math.floor(relativeY / 60)));
          const droppedMinutes = Math.max(0, Math.min(45, Math.floor((relativeY % 60) / 15) * 15));
          
          newStart.setHours(droppedHour, droppedMinutes, 0, 0);
          window.__dragOffset = 0; // cleanup
        } else {
          // Month view fallback: keep original time
          newStart.setHours(originalStart.getHours(), originalStart.getMinutes(), 0, 0);
        }
        
        const newEnd = new Date(newStart.getTime() + durationMs);
        
        await useCalendarStore.getState().updateEvent(event.id, {
          ...event,
          startDate: newStart.toISOString(),
          endDate: newEnd.toISOString()
        });
      }
    }
  };
  
  const handleSlotClick = (slotData) => {
    if (isDraggingRef.current) return;
    setSelectedEvent(null);
    setSelectedDateSlot(slotData);
    setIsEventModalOpen(true);
  };
  
  const filteredTasks = todoTasks.filter(t => {
    if (taskSearch && !t.title.toLowerCase().includes(taskSearch.toLowerCase())) return false;
    if (taskProjectFilter && t.project !== taskProjectFilter) return false;
    return true;
  });

  const projects = [...new Set(todoTasks.map(t => t.project).filter(Boolean))];

  return (
    <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex h-screen w-full overflow-hidden bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200">
        
        {/* Left Sidebar (Mini Calendar & Categories) */}
        {showLeftSidebar && (
          <CalendarLeftSidebar 
            onClose={() => setShowLeftSidebar(false)}
            onEditCategory={(id) => setEditingCategoryId(id)}
          />
        )}

        {/* Main Calendar Area */}
        <div className="flex-1 flex flex-col min-w-0">
          
          {/* Header */}
          <div className="h-16 border-b border-slate-200 dark:border-slate-800 px-4 flex items-center justify-between bg-white dark:bg-slate-800 shrink-0">
            <div className="flex items-center gap-4">
              {!showLeftSidebar && (
                <button onClick={() => setShowLeftSidebar(true)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-500">
                  <PanelLeft className="w-5 h-5" />
                </button>
              )}
              
              <div className="flex items-center gap-2">
                <button onClick={() => handleNavigate('prev')} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button onClick={() => handleNavigate('today')} className="px-3 py-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-sm font-medium">
                  Today
                </button>
                <button onClick={() => handleNavigate('next')} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              <h2 className="text-xl font-bold ml-4">
                {format(viewDate, viewMode === 'year' ? 'yyyy' : 'MMMM yyyy')}
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex bg-slate-100 dark:bg-slate-900 rounded p-1">
                {['today', '3days', 'week', 'month', 'year'].map(mode => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`px-3 py-1 rounded text-sm capitalize ${viewMode === mode ? 'bg-white dark:bg-slate-700 shadow-sm font-medium' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                  >
                    {mode === 'today' ? 'Day' : mode === '3days' ? '3 Days' : mode}
                  </button>
                ))}
              </div>

              <button 
                onClick={() => { setSelectedEvent(null); setSelectedDateSlot(new Date()); setIsEventModalOpen(true); }}
                className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Event
              </button>

              <button 
                onClick={() => setIsSettingsModalOpen(true)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-500"
                title="Calendar Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
              
              {!showTaskSidebar && (
                <button 
                  onClick={() => setShowTaskSidebar(true)} 
                  className="ml-2 flex items-center gap-1 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-sm font-medium text-slate-600 dark:text-slate-300"
                >
                  <LayoutList className="w-4 h-4" /> Tasks
                </button>
              )}
            </div>
          </div>

          {/* Grid Area */}
          <div className="flex-1 overflow-auto relative bg-white dark:bg-slate-900">
            <CalendarGrid 
              viewMode={viewMode} 
              viewDate={viewDate} 
              onEventClick={(evt) => { setSelectedEvent(evt); setIsEventModalOpen(true); }}
              onSlotClick={handleSlotClick}
              onNavigateToDay={(date) => {
                setViewDate(date);
                setViewMode('today');
              }}
            />
          </div>
        </div>

        {/* Task Sidebar (Right) */}
        {showTaskSidebar && (
          <div className="w-72 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 flex flex-col transition-all shrink-0">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center pb-[23px]">
              <h2 className="font-semibold flex items-center gap-2"><LayoutList className="w-5 h-5" /> Tasks</h2>
              <button onClick={() => setShowTaskSidebar(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-500">
                <PanelRightClose className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-4 flex-1 overflow-y-auto flex flex-col gap-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search tasks..." 
                  value={taskSearch}
                  onChange={(e) => setTaskSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-sm focus:ring-1 focus:ring-blue-500"
                />
              </div>
              
              <select 
                value={taskProjectFilter} 
                onChange={(e) => setTaskProjectFilter(e.target.value)}
                className="w-full p-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-sm focus:ring-1 focus:ring-blue-500"
              >
                <option value="">All Projects</option>
                {projects.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>

              <Droppable droppableId="tasks-sidebar" isDropDisabled={true}>
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="flex flex-col gap-2 flex-1">
                    {filteredTasks.map((task, index) => (
                      <Draggable key={task.id} draggableId={`task-${task.id}`} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`p-3 rounded border border-slate-200 dark:border-slate-700 shadow-sm text-sm cursor-grab ${snapshot.isDragging ? 'bg-blue-50 dark:bg-slate-700 ring-2 ring-blue-500' : 'bg-white dark:bg-slate-800'}`}
                          >
                            <div className="font-medium">{task.title}</div>
                            {task.project && <div className="text-xs text-slate-500 mt-1">{task.project}</div>}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          </div>
        )}

        {/* Modals */}
        {isEventModalOpen && (
          <EventModal 
            isOpen={isEventModalOpen}
            onClose={() => setIsEventModalOpen(false)}
            eventToEdit={selectedEvent}
            initialDate={selectedDateSlot}
          />
        )}
        
        {isSettingsModalOpen && (
          <CalendarSettingsModal 
            isOpen={isSettingsModalOpen}
            onClose={() => setIsSettingsModalOpen(false)}
          />
        )}

        <CategoryEditModal 
          isOpen={!!editingCategoryId}
          categoryId={editingCategoryId}
          onClose={() => setEditingCategoryId(null)}
        />
      </div>
    </DragDropContext>
  );
}
