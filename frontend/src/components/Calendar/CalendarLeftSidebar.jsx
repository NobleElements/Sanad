import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, PanelLeftClose, Tag, Check, Edit2, Plus } from 'lucide-react';
import { 
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday 
} from 'date-fns';
import useCalendarStore from '../../store/useCalendarStore';

export default function CalendarLeftSidebar({ onClose, onEditCategory }) {
  const { 
    viewDate, setViewDate, setViewMode, 
    categories, hiddenCategoryIds, toggleCategoryVisibility 
  } = useCalendarStore();
  
  const [miniDate, setMiniDate] = useState(viewDate);

  const monthStart = startOfMonth(miniDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 6 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 6 });

  const dateFormat = "d";
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const handleDayClick = (day) => {
    setViewDate(day);
    setViewMode('today');
  };

  const nextMonth = () => setMiniDate(addMonths(miniDate, 1));
  const prevMonth = () => setMiniDate(subMonths(miniDate, 1));

  return (
    <div className="w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 flex flex-col transition-all shrink-0">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center pb-[23px]">
        <h2 className="font-semibold flex items-center gap-2">Calendar</h2>
        <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
          <PanelLeftClose className="w-4 h-4" />
        </button>
      </div>
      
      <div className="p-4 flex-1 overflow-y-auto flex flex-col gap-6">
        
        {/* Mini Calendar */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-semibold">{format(miniDate, 'MMMM yyyy')}</h3>
            <div className="flex gap-1">
              <button onClick={prevMonth} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"><ChevronLeft className="w-4 h-4" /></button>
              <button onClick={nextMonth} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
          
          <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2 text-slate-500">
            <div>Sa</div><div>Su</div><div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div>
          </div>
          
          <div className="grid grid-cols-7 gap-1 text-sm">
            {days.map((day, i) => {
              const isSelected = isSameDay(day, viewDate);
              const isCurrentMonth = isSameMonth(day, monthStart);
              const isTodayDate = isToday(day);
              
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => handleDayClick(day)}
                  className={`
                    w-7 h-7 rounded flex items-center justify-center text-xs
                    ${!isCurrentMonth ? 'text-slate-400 dark:text-slate-600' : 'text-slate-700 dark:text-slate-300'}
                    ${isSelected ? 'bg-blue-600 text-white font-medium hover:bg-blue-700' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}
                    ${isTodayDate && !isSelected ? 'text-blue-600 font-bold' : ''}
                  `}
                >
                  {format(day, dateFormat)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Categories */}
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Tag className="w-4 h-4" /> Categories
            </h3>
            <button 
              onClick={() => onEditCategory('new')} 
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-500 hover:text-blue-600 transition-colors"
              title="Add Category"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex flex-col gap-1">
            {categories.length === 0 && (
              <div className="text-sm text-slate-500 italic px-2">No categories yet</div>
            )}
            
            {categories.map(cat => {
              const isHidden = hiddenCategoryIds.includes(cat.id);
              return (
                <div key={cat.id} className="flex justify-between items-center group px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded">
                  <label className="flex items-center gap-3 cursor-pointer flex-1">
                    <div 
                      className="w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors"
                      style={{ 
                        borderColor: cat.colorCode, 
                        backgroundColor: isHidden ? 'transparent' : cat.colorCode 
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        toggleCategoryVisibility(cat.id);
                      }}
                    >
                      {!isHidden && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className={`text-sm ${isHidden ? 'text-slate-500' : 'text-slate-700 dark:text-slate-300'}`}>
                      {cat.name}
                    </span>
                  </label>
                  
                  <button 
                    onClick={() => onEditCategory(cat.id)}
                    className="p-1 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-blue-600 transition-opacity"
                    title="Edit Category"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
