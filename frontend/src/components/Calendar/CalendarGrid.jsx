import React, { useMemo } from 'react';
import { 
  format, startOfWeek, endOfWeek, eachDayOfInterval, startOfMonth, 
  endOfMonth, isSameMonth, isSameDay, addDays, getDay, isToday, startOfDay, endOfDay
} from 'date-fns';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import useCalendarStore from '../../store/useCalendarStore';

import { expandEvents } from '../../utils/calendarUtils';

export default function CalendarGrid({ viewMode, viewDate, onEventClick, onSlotClick, onNavigateToDay }) {
  const { events, categories, settings, hiddenCategoryIds, updateEvent } = useCalendarStore();
  const firstDayOfWeek = settings.firstDayOfWeek;
  const scrollRef = React.useRef(null);
  
  // Resizing state
  const [resizingState, setResizingState] = React.useState(null);
  
  // Drag to create state
  const [dragCreateState, setDragCreateState] = React.useState(null);

  // Current time for the red line
  const [currentTime, setCurrentTime] = React.useState(new Date());

  React.useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  React.useEffect(() => {
    if (!dragCreateState) return;

    const handlePointerMove = (e) => {
      e.preventDefault(); // prevent scrolling
      
      const columnEl = document.getElementById(`cal-timeline-col-${dragCreateState.day.toISOString()}`);
      if (!columnEl) return;
      const rect = columnEl.getBoundingClientRect();
      const relativeY = Math.max(0, Math.min(24 * 60, e.clientY - rect.top));
      
      setDragCreateState(prev => ({
        ...prev,
        currentY: relativeY,
        isActive: Math.abs(relativeY - prev.startY) > 5 // Must drag at least 5px
      }));
    };

    const handlePointerUp = () => {
      // Commit creation
      const startY = Math.min(dragCreateState.startY, dragCreateState.currentY);
      const endY = Math.max(dragCreateState.startY, dragCreateState.currentY);
      
      let startHour = Math.floor(startY / 60);
      let startMin = Math.round((startY % 60) / 15) * 15;
      
      // If it wasn't a drag (just a click), default to 1 hour length
      let endHour, endMin;
      if (!dragCreateState.isActive) {
        endHour = startHour + 1;
        endMin = startMin;
      } else {
        endHour = Math.floor(endY / 60);
        endMin = Math.round((endY % 60) / 15) * 15;
      }
      
      const startDate = new Date(dragCreateState.day);
      startDate.setHours(startHour, startMin, 0, 0);
      
      const endDate = new Date(dragCreateState.day);
      endDate.setHours(endHour, endMin, 0, 0);
      
      // Enforce minimum duration of 15 mins
      if (endDate.getTime() <= startDate.getTime()) {
        endDate.setTime(startDate.getTime() + 15 * 60000);
      }
      
      onSlotClick({ start: startDate, end: endDate });
      setDragCreateState(null);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: false });
    window.addEventListener('pointerup', handlePointerUp);
    
    document.body.style.userSelect = 'none';

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      document.body.style.userSelect = '';
    };
  }, [dragCreateState, onSlotClick]);

  React.useEffect(() => {
    if (!resizingState) return;

    const handlePointerMove = (e) => {
      const deltaY = e.clientY - resizingState.startY;
      // 60px = 60 minutes. So 1px = 1 minute.
      // We want to snap to 15-minute increments.
      const rawMinutesDelta = deltaY;
      const minutesDelta = Math.round(rawMinutesDelta / 15) * 15;

      setResizingState(prev => {
        if (!prev) return prev;
        
        let newTempStart = new Date(prev.originalStart);
        let newTempEnd = new Date(prev.originalEnd);

        if (prev.edge === 'top') {
          newTempStart.setMinutes(newTempStart.getMinutes() + minutesDelta);
          // Bound: cannot be after originalEnd (minus 15 mins)
          if (newTempStart.getTime() > newTempEnd.getTime() - 15 * 60000) {
            newTempStart = new Date(newTempEnd.getTime() - 15 * 60000);
          }
        } else {
          newTempEnd.setMinutes(newTempEnd.getMinutes() + minutesDelta);
          // Bound: cannot be before originalStart (plus 15 mins)
          if (newTempEnd.getTime() < newTempStart.getTime() + 15 * 60000) {
            newTempEnd = new Date(newTempStart.getTime() + 15 * 60000);
          }
        }

        return { ...prev, tempStart: newTempStart, tempEnd: newTempEnd };
      });
    };

    const handlePointerUp = async (e) => {
      // Commit changes
      if (resizingState.tempStart.getTime() !== resizingState.originalStart.getTime() || 
          resizingState.tempEnd.getTime() !== resizingState.originalEnd.getTime()) {
        try {
          const evtInstance = visibleEvents.find(e => (e.instanceId || e.id) === resizingState.id);
          if (evtInstance) {
            const eventToUpdate = events.find(e => e.id === evtInstance.id);
            if (eventToUpdate) {
              const startDeltaMs = resizingState.tempStart.getTime() - resizingState.originalStart.getTime();
              const endDeltaMs = resizingState.tempEnd.getTime() - resizingState.originalEnd.getTime();
              
              const newStartDate = new Date(new Date(eventToUpdate.startDate).getTime() + startDeltaMs);
              const newEndDate = new Date(new Date(eventToUpdate.endDate).getTime() + endDeltaMs);

              await updateEvent(eventToUpdate.id, {
                ...eventToUpdate,
                startDate: newStartDate.toISOString(),
                endDate: newEndDate.toISOString()
              });
            }
          }
        } catch (error) {
          console.error("Failed to update resized event", error);
        }
      }
      setResizingState(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    // Disable body text selection during resize
    document.body.style.userSelect = 'none';

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      document.body.style.userSelect = '';
    };
  }, [resizingState, updateEvent]);

  React.useEffect(() => {
    if (scrollRef.current && (viewMode === 'week' || viewMode === '3days' || viewMode === 'today')) {
      // Small delay to ensure render is complete before scrolling
      setTimeout(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = settings.workHourStart * 60 - 10;
      }, 50);
    }
  }, [viewMode, viewDate, settings.workHourStart]);

  const getDaysToRender = () => {
    let start, end;
    if (viewMode === 'month') {
      start = startOfWeek(startOfMonth(viewDate), { weekStartsOn: firstDayOfWeek });
      end = endOfWeek(endOfMonth(viewDate), { weekStartsOn: firstDayOfWeek });
    } else if (viewMode === 'week') {
      start = startOfWeek(viewDate, { weekStartsOn: firstDayOfWeek });
      end = endOfWeek(viewDate, { weekStartsOn: firstDayOfWeek });
    } else if (viewMode === '3days') {
      start = startOfDay(viewDate);
      end = endOfDay(addDays(viewDate, 2));
    } else if (viewMode === 'today') {
      start = startOfDay(viewDate);
      end = endOfDay(viewDate);
    } else if (viewMode === 'year') {
      start = new Date(viewDate.getFullYear(), 0, 1);
      end = new Date(viewDate.getFullYear(), 11, 31, 23, 59, 59);
    } else {
      start = startOfWeek(startOfMonth(viewDate), { weekStartsOn: firstDayOfWeek });
      end = endOfWeek(endOfMonth(viewDate), { weekStartsOn: firstDayOfWeek });
    }
    return eachDayOfInterval({ start, end });
  };

  const days = getDaysToRender();
  const startVisible = days[0];
  const endVisible = endOfDay(days[days.length - 1]);
  
  // Filter events based on hidden categories
  const filteredEvents = useMemo(() => {
    return events.filter(evt => !evt.categoryId || !hiddenCategoryIds.includes(evt.categoryId));
  }, [events, hiddenCategoryIds]);

  const visibleEvents = useMemo(() => {
    return expandEvents(filteredEvents, startVisible, endVisible);
  }, [filteredEvents, startVisible, endVisible]);

  const getCategoryColor = (categoryId) => {
    const cat = categories.find(c => c.id === categoryId);
    return cat ? cat.colorCode : '#3B82F6';
  };

  const renderMonthEvent = (evt, index, isDraggable = true) => {
    const color = getCategoryColor(evt.categoryId);
    const eventId = evt.instanceId || evt.id;
    
    const content = (
      <div 
        onClick={(e) => { e.stopPropagation(); onEventClick(evt); }}
        className="text-xs p-1 rounded mb-1 truncate cursor-pointer hover:opacity-80 text-white shadow-sm"
        style={{ backgroundColor: color }}
        title={evt.title}
      >
        {!evt.isAllDay && format(new Date(evt.startDate), settings.timeFormat === '24h' ? 'HH:mm' : 'h:mm a')} {evt.title}
      </div>
    );

    if (!isDraggable) return <div key={eventId}>{content}</div>;

    return (
      <Draggable key={eventId} draggableId={`cal-evt-${eventId}`} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            style={{ ...provided.draggableProps.style, opacity: snapshot.isDragging ? 0.8 : 1 }}
          >
            {content}
          </div>
        )}
      </Draggable>
    );
  };

  if (viewMode === 'year') {
    const months = Array.from({ length: 12 }, (_, i) => new Date(viewDate.getFullYear(), i, 1));
    
    // Generate day of week labels based on settings.firstDayOfWeek
    // We can use a reference week (e.g. starting Jan 2, 2022 which is a Sunday)
    const weekLabels = Array.from({ length: 7 }, (_, i) => 
      format(new Date(2022, 0, 2 + firstDayOfWeek + i), 'EEEEE') // 'S', 'M', 'T', etc.
    );

    return (
      <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 overflow-y-auto p-4 md:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {months.map(monthDate => {
            const mStart = startOfMonth(monthDate);
            const mEnd = endOfMonth(mStart);
            const gridStart = startOfWeek(mStart, { weekStartsOn: firstDayOfWeek });
            const gridEnd = endOfWeek(mEnd, { weekStartsOn: firstDayOfWeek });
            
            const monthDays = eachDayOfInterval({ start: gridStart, end: gridEnd });
            
            return (
              <div key={monthDate.toISOString()} className="flex flex-col bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm border border-slate-100 dark:border-slate-700">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 ml-1">
                  {format(monthDate, 'MMMM')}
                </h3>
                
                <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2 text-slate-400 font-medium">
                  {weekLabels.map((lbl, i) => <div key={i}>{lbl}</div>)}
                </div>
                
                <div className="grid grid-cols-7 gap-y-2 gap-x-1 text-sm">
                  {monthDays.map(day => {
                    const isCurrentMonth = isSameMonth(day, monthDate);
                    
                    if (!isCurrentMonth) {
                      return <div key={day.toISOString()} className="w-8 aspect-square mx-auto" />;
                    }

                    const isTodayDate = isToday(day);
                    const isSelected = isSameDay(day, viewDate);
                    
                    // Check if there are events for this day
                    const hasEvents = visibleEvents.some(e => isSameDay(new Date(e.renderDate || e.startDate), day));

                    return (
                      <button
                        key={day.toISOString()}
                        onClick={() => {
                          if (onNavigateToDay) onNavigateToDay(day);
                        }}
                        className={`
                          relative flex flex-col items-center justify-center aspect-square rounded-full mx-auto w-8
                          ${!isCurrentMonth ? 'text-slate-300 dark:text-slate-600' : 'text-slate-700 dark:text-slate-300'}
                          ${isSelected && !isTodayDate ? 'bg-slate-100 dark:bg-slate-700' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}
                          ${isTodayDate ? 'bg-blue-600 text-white font-semibold hover:bg-blue-700' : ''}
                        `}
                      >
                        <span className={isTodayDate ? 'text-white' : ''}>{format(day, 'd')}</span>
                        {/* Event Dot */}
                        {hasEvents && (
                          <div className={`absolute bottom-1 w-1 h-1 rounded-full ${isTodayDate ? 'bg-white' : 'bg-blue-500'}`} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (viewMode === 'month') {
    return (
      <div className="flex flex-col h-full">
        {/* Days of week header */}
        <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 shrink-0">
          {days.slice(0, 7).map(day => (
            <div key={day.toISOString()} className="p-2 text-center font-semibold text-sm text-slate-500">
              {format(day, 'EEEE')}
            </div>
          ))}
        </div>
        {/* Month Grid */}
        <div className="flex-1 grid grid-cols-7 grid-rows-5 auto-rows-fr">
          {days.map(day => {
            const dayEvents = visibleEvents.filter(e => isSameDay(new Date(e.renderDate || e.startDate), day));
            return (
              <Droppable key={day.toISOString()} droppableId={`cal-${format(day, 'yyyy-MM-dd')}`}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    onClick={() => onSlotClick(day)}
                    className={`min-h-[100px] border-r border-b border-slate-200 dark:border-slate-800 p-1 transition-colors
                      ${!isSameMonth(day, viewDate) ? 'bg-slate-50 dark:bg-slate-800/50 text-slate-400' : 'bg-white dark:bg-slate-900'}
                      ${snapshot.isDraggingOver ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                      hover:bg-slate-50 dark:hover:bg-slate-800/80 cursor-pointer flex flex-col`}
                  >
                    <div className={`text-right p-1 ${isToday(day) ? 'font-bold' : ''}`}>
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${isToday(day) ? 'bg-blue-600 text-white' : ''}`}>
                        {format(day, 'd')}
                      </span>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                      {dayEvents.filter(e => e.isAllDay).map((evt, idx) => renderMonthEvent(evt, idx))}
                      {dayEvents.filter(e => !e.isAllDay).map((evt, idx) => renderMonthEvent(evt, dayEvents.filter(e => e.isAllDay).length + idx))}
                    </div>
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            );
          })}
        </div>
      </div>
    );
  }

  // Timeline View for week/day/3days
  const hours = Array.from({ length: 24 }, (_, i) => i);
  
  const calculateOverlap = (eventsArray) => {
    const sorted = [...eventsArray].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    const processed = [];
    let currentGroup = [];
    let groupEnd = 0;

    const flushGroup = () => {
      if (currentGroup.length === 0) return;
      const columns = [];
      currentGroup.forEach(ge => {
        let placed = false;
        for (let i = 0; i < columns.length; i++) {
          const col = columns[i];
          const lastE = col[col.length - 1];
          if (ge._start >= lastE._end) {
            col.push(ge);
            ge._col = i;
            placed = true;
            break;
          }
        }
        if (!placed) {
          ge._col = columns.length;
          columns.push([ge]);
        }
      });
      currentGroup.forEach(ge => {
        ge._totalCols = columns.length;
        processed.push(ge);
      });
      currentGroup = [];
    };

    sorted.forEach(evt => {
      const eStart = evt.renderDate ? new Date(evt.renderDate) : new Date(evt.startDate);
      const originalStart = new Date(evt.startDate);
      eStart.setHours(originalStart.getHours(), originalStart.getMinutes(), 0, 0);
      const eStartMs = eStart.getTime();
      const eEndMs = eStartMs + (new Date(evt.endDate).getTime() - originalStart.getTime());

      if (eStartMs >= groupEnd && currentGroup.length > 0) {
        flushGroup();
      }
      
      evt._start = eStartMs;
      evt._end = eEndMs;
      currentGroup.push(evt);
      groupEnd = Math.max(groupEnd, eEndMs);
    });

    flushGroup();
    return processed;
  };
  
  const renderTimelineEvent = (evt, index) => {
    if (evt.isAllDay) return null;
    
    const originalStart = new Date(evt.startDate);
    const originalEnd = new Date(evt.endDate);
    
    const start = evt.renderDate ? new Date(evt.renderDate) : new Date(evt.startDate);
    // Keep the time of the original start date, but use the day of renderDate
    start.setHours(originalStart.getHours(), originalStart.getMinutes(), 0, 0);

    // Calculate end date based on duration to handle recurring instances correctly
    const durationMs = originalEnd.getTime() - originalStart.getTime();
    const end = new Date(start.getTime() + durationMs);
    
    const eventId = evt.instanceId || evt.id;

    // Apply resizing overrides if this event is currently being resized
    const isResizingThis = resizingState && resizingState.id === eventId;
    const effectiveStart = isResizingThis ? resizingState.tempStart : start;
    const effectiveEnd = isResizingThis ? resizingState.tempEnd : end;

    // Calculate top and height in pixels based on hour rows (e.g. 60px per hour)
    const top = (effectiveStart.getHours() + effectiveStart.getMinutes() / 60) * 60;
    let durationHours = (effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60);
    // minimum height for visibility
    if (durationHours < 0.25) durationHours = 0.25; // 15 mins min visually during resize
    const height = durationHours * 60;

    const color = getCategoryColor(evt.categoryId);

    const col = evt._col || 0;
    const totalCols = evt._totalCols || 1;
    const widthPct = 100 / totalCols;
    const leftPct = col * widthPct;

    return (
      <Draggable key={eventId} draggableId={`cal-evt-${eventId}`} index={index}>
        {(provided, snapshot) => (
          <div 
            ref={provided.innerRef}
            {...provided.draggableProps}
            className={`absolute text-xs rounded hover:opacity-90 text-white shadow overflow-hidden leading-tight ${snapshot.isDragging ? 'ring-2 ring-blue-400 opacity-90' : ''} ${isResizingThis ? 'opacity-80 ring-2 ring-white z-50' : ''}`}
            style={{ 
              top: `${top}px`, 
              height: `${height - 2}px`, 
              left: `calc(${leftPct}% + 4px)`,
              width: `calc(${widthPct}% - 8px)`,
              backgroundColor: color, 
              zIndex: (snapshot.isDragging || isResizingThis) ? 50 : 10,
              ...provided.draggableProps.style,
              ...(snapshot.isDropAnimating ? { transitionDuration: '0.001s' } : {})
            }}
            title={evt.title}
          >
            {/* Drag Handle Area (fills entire event but sits under resize handles) */}
            <div 
              {...provided.dragHandleProps}
              className="absolute inset-0 z-10 cursor-grab"
              onClick={(e) => { e.stopPropagation(); onEventClick(evt); }}
              onMouseDown={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                window.__dragOffset = e.clientY - rect.top;
              }}
            >
              <div className="font-semibold truncate pointer-events-none mt-1 px-1">{evt.title}</div>
              {height >= 45 && (
                <div className="opacity-90 truncate text-[10px] pointer-events-none px-1">{format(effectiveStart, settings.timeFormat === '24h' ? 'HH:mm' : 'h:mm a')} - {format(effectiveEnd, settings.timeFormat === '24h' ? 'HH:mm' : 'h:mm a')}</div>
              )}
            </div>

            {/* Top Resize Handle */}
            <div 
              className="absolute top-0 right-0 w-8 h-3 cursor-ns-resize z-20 hover:bg-white/30 rounded-bl"
              onPointerDown={(e) => {
                e.stopPropagation();
                setResizingState({
                  id: eventId,
                  edge: 'top',
                  startY: e.clientY,
                  originalStart: new Date(effectiveStart),
                  originalEnd: new Date(effectiveEnd),
                  tempStart: new Date(effectiveStart),
                  tempEnd: new Date(effectiveEnd)
                });
              }}
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onTouchStart={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            />

            {/* Bottom Resize Handle */}
            <div 
              className="absolute bottom-0 right-0 w-8 h-3 cursor-ns-resize z-20 hover:bg-white/30 rounded-tl"
              onPointerDown={(e) => {
                e.stopPropagation();
                setResizingState({
                  id: eventId,
                  edge: 'bottom',
                  startY: e.clientY,
                  originalStart: new Date(effectiveStart),
                  originalEnd: new Date(effectiveEnd),
                  tempStart: new Date(effectiveStart),
                  tempEnd: new Date(effectiveEnd)
                });
              }}
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onTouchStart={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </Draggable>
    );
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white dark:bg-slate-900">
      
      {/* Timeline Grid */}
      <div className="flex-1 overflow-y-auto relative" ref={scrollRef}>
        
        {/* Sticky Header Group */}
        <div className="sticky top-0 z-30 flex flex-col bg-white dark:bg-slate-900 shadow-sm border-b border-slate-200 dark:border-slate-800">
          {/* Header Row (Days) */}
          <div className="flex shrink-0 ml-16 bg-white dark:bg-slate-900">
            {days.map(day => (
              <div key={day.toISOString()} className={`flex-1 min-w-[120px] p-3 text-center border-l border-slate-200 dark:border-slate-800 font-medium ${isToday(day) ? 'text-blue-600' : 'text-slate-700 dark:text-slate-300'}`}>
                {format(day, 'EEE')} <span className={`text-xl ml-1 ${isToday(day) ? 'bg-blue-600 text-white rounded-full w-8 h-8 inline-flex items-center justify-center' : ''}`}>{format(day, 'd')}</span>
              </div>
            ))}
          </div>

          {/* All Day Section (Optional, sticking under header) */}
          <div className="flex border-t border-slate-200 dark:border-slate-800 shrink-0 ml-16 bg-slate-50 dark:bg-slate-800/50">
            {days.map(day => {
              const dayEvents = visibleEvents.filter(e => isSameDay(new Date(e.renderDate || e.startDate), day));
              return (
                <div key={day.toISOString()} className="flex-1 min-w-[120px] p-1 border-l border-slate-200 dark:border-slate-800 min-h-[30px]">
                  {dayEvents.filter(e => e.isAllDay).map((evt, idx) => renderMonthEvent(evt, idx, false))}
                </div>
              )
            })}
          </div>
        </div>

        <div className="flex min-w-full">
          {/* Time Labels */}
          <div className="w-16 shrink-0 relative bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800" style={{ height: `${24 * 60}px` }}>
            {hours.map(hour => (
              <div 
                key={hour} 
                className={`absolute right-2 text-xs text-slate-400 font-medium ${hour === 0 ? 'translate-y-1' : '-translate-y-1/2'}`} 
                style={{ top: `${hour * 60}px` }}
              >
                {settings.timeFormat === '24h' 
                  ? `${hour.toString().padStart(2, '0')}:00` 
                  : hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
              </div>
            ))}
          </div>

          {/* Columns */}
          <div className="flex flex-1 relative bg-white dark:bg-slate-900" id="calendar-timeline-columns">
            {/* Background Hour Lines */}
            <div className="absolute inset-0 pointer-events-none flex flex-col">
              {hours.map(hour => {
                const isWorkHour = hour >= settings.workHourStart && hour < settings.workHourEnd;
                return (
                  <div key={hour} className={`w-full border-b border-slate-100 dark:border-slate-800/50 ${!isWorkHour ? 'bg-slate-50/70 dark:bg-slate-900/50' : ''}`} style={{ height: '60px' }} />
                );
              })}
            </div>

            {/* Day Columns */}
            {days.map(day => {
              const dayEventsRaw = visibleEvents.filter(e => !e.isAllDay && isSameDay(new Date(e.renderDate || e.startDate), day));
              const dayEvents = calculateOverlap(dayEventsRaw);
              return (
                <Droppable key={day.toISOString()} droppableId={`cal-${format(day, 'yyyy-MM-dd')}`}>
                  {(provided, snapshot) => (
                    <div 
                      ref={provided.innerRef} 
                      {...provided.droppableProps}
                      id={`cal-timeline-col-${day.toISOString()}`}
                      onPointerDown={(e) => {
                        // Only start if clicking the background, not an event
                        if (e.target !== e.currentTarget) return;
                        const rect = e.currentTarget.getBoundingClientRect();
                        const y = Math.max(0, e.clientY - rect.top);
                        setDragCreateState({
                          day,
                          startY: y,
                          currentY: y,
                          isActive: false
                        });
                      }}
                      className={`flex-1 relative min-w-[120px] border-l border-slate-200 dark:border-slate-800 ${snapshot.isDraggingOver ? 'bg-blue-50/50 dark:bg-blue-900/10' : isToday(day) ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}
                      style={{ height: `${24 * 60}px` }}
                    >
                      {dayEvents.map((evt, idx) => renderTimelineEvent(evt, idx))}
                      
                      {isToday(day) && (
                        <div 
                          className="absolute left-0 right-0 h-0.5 bg-red-500 z-30 pointer-events-none"
                          style={{ top: `${(currentTime.getHours() + currentTime.getMinutes() / 60) * 60}px` }}
                        >
                          <div className="absolute left-0 w-2 h-2 bg-red-500 rounded-full -translate-x-1 -translate-y-[3px]" />
                        </div>
                      )}
                      
                      {dragCreateState && dragCreateState.day.getTime() === day.getTime() && (
                        <div 
                          className="absolute left-1 right-1 bg-blue-500/20 border border-blue-500/50 rounded z-40 pointer-events-none shadow-sm"
                          style={{
                            top: `${Math.min(dragCreateState.startY, dragCreateState.currentY)}px`,
                            height: `${Math.max(15, Math.abs(dragCreateState.currentY - dragCreateState.startY))}px`
                          }}
                        />
                      )}
                      
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
