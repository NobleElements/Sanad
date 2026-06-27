import React, { useState, useEffect } from 'react';
import { X, Settings } from 'lucide-react';
import useCalendarStore from '../../store/useCalendarStore';

export default function CalendarSettingsModal({ isOpen, onClose }) {
  const { settings, updateSettings } = useCalendarStore();
  
  const [firstDayOfWeek, setFirstDayOfWeek] = useState(6);
  const [workHourStart, setWorkHourStart] = useState(9);
  const [workHourEnd, setWorkHourEnd] = useState(17);
  const [autoCollapseNav, setAutoCollapseNav] = useState(false);
  const [timeFormat, setTimeFormat] = useState('12h');

  useEffect(() => {
    if (settings) {
      setFirstDayOfWeek(settings.firstDayOfWeek);
      setWorkHourStart(settings.workHourStart);
      setWorkHourEnd(settings.workHourEnd);
      setAutoCollapseNav(settings.autoCollapseNav || false);
      setTimeFormat(settings.timeFormat || '12h');
    }
  }, [settings, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    updateSettings({
      firstDayOfWeek: parseInt(firstDayOfWeek),
      workHourStart: parseInt(workHourStart),
      workHourEnd: parseInt(workHourEnd),
      autoCollapseNav: autoCollapseNav,
      timeFormat: timeFormat
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">
            <Settings className="w-5 h-5" /> Calendar Settings
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">First Day of the Week</label>
            <select 
              value={firstDayOfWeek} 
              onChange={(e) => setFirstDayOfWeek(e.target.value)}
              className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-sm"
            >
              <option value="6">Saturday</option>
              <option value="0">Sunday</option>
              <option value="1">Monday</option>
            </select>
          </div>
          
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Time Format</label>
            <select 
              value={timeFormat} 
              onChange={(e) => setTimeFormat(e.target.value)}
              className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-sm"
            >
              <option value="12h">12-hour (e.g., 2:00 PM)</option>
              <option value="24h">24-hour (e.g., 14:00)</option>
            </select>
          </div>

          <div className="flex gap-4">
            <div className="flex flex-col gap-1.5 flex-1">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Work Day Start</label>
              <select 
                value={workHourStart} 
                onChange={(e) => setWorkHourStart(e.target.value)}
                className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-sm"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={`start-${i}`} value={i}>
                    {i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i - 12}:00 PM`}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5 flex-1">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Work Day End</label>
              <select 
                value={workHourEnd} 
                onChange={(e) => setWorkHourEnd(e.target.value)}
                className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-sm"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={`end-${i}`} value={i}>
                    {i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i - 12}:00 PM`}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="flex items-center gap-3 mt-2">
            <label className="flex items-center gap-2 text-sm cursor-pointer font-medium text-slate-700 dark:text-slate-300">
              <input 
                type="checkbox" 
                checked={autoCollapseNav} 
                onChange={(e) => setAutoCollapseNav(e.target.checked)} 
                className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4" 
              />
              Auto-collapse main sidebar on Calendar page
            </label>
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2 bg-slate-50 dark:bg-slate-800/50">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 rounded">
            Cancel
          </button>
          <button onClick={handleSave} className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded hover:bg-blue-700">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
