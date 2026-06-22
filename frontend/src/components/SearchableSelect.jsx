import React, { useState, useRef, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function SearchableSelect({ 
  value, 
  onChange, 
  options = [], // [{ id, name, colorHex? }]
  placeholder = "Type to search...",
  onCreate, // async function (name) => { ... }
  isCreating = false,
  renderOption, // optional function to customize row rendering
  disabled = false,
  icon,
  className = ""
}) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Sync search input with value when it changes externally
  useEffect(() => {
    if (value) {
      const selected = options.find(o => o.id === value);
      if (selected) setSearch(selected.name);
    } else {
      setSearch('');
    }
  }, [value, options]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        // Revert search text to currently selected value
        if (value) {
            const selected = options.find(o => o.id === value);
            if (selected) setSearch(selected.name);
        } else {
            setSearch('');
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [value, options]);

  const filteredOptions = options.filter(o => 
    o.name.toLowerCase().includes(search.toLowerCase())
  );
  
  const exactMatch = options.find(o => 
    o.name.toLowerCase() === search.toLowerCase()
  );

  const handleSelect = (option) => {
    onChange(option.id);
    setSearch(option.name);
    setIsOpen(false);
  };

  const handleCreate = async () => {
    if (onCreate && search.trim() && !exactMatch) {
      await onCreate(search.trim());
      setIsOpen(false);
    }
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <div className="relative flex items-center">
        {icon && <div className="absolute left-3 text-slate-400 dark:text-slate-500 pointer-events-none">{icon}</div>}
        <input
          type="text"
          placeholder={placeholder}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            if (value) onChange(''); // clear selection if they start typing
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className={`w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white dark:bg-slate-800 placeholder-gray-400 ${icon ? 'pl-9' : ''}`}
          disabled={disabled || isCreating}
        />
      </div>
      
      {isOpen && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-48 overflow-y-auto dark:text-slate-100">
          {filteredOptions.length > 0 && filteredOptions.map(o => (
            <button
              key={o.id}
              type="button"
              onClick={() => handleSelect(o)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:bg-slate-900 flex items-center gap-2 transition-colors"
            >
              {renderOption ? renderOption(o) : o.name}
            </button>
          ))}
          {search.trim() && !exactMatch && onCreate && (
            <button
              type="button"
              onClick={handleCreate}
              disabled={isCreating}
              className="w-full text-left px-3 py-2 text-sm text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:bg-indigo-500/10 border-t border-slate-100 flex items-center gap-2"
            >
              {isCreating ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</>
              ) : (
                <>+ Create "{search.trim()}"</>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
