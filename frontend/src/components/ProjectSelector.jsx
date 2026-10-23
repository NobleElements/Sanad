import React, { useMemo } from 'react';
import SearchableSelect from './SearchableSelect';
import useTaskStore from '../store/useTaskStore';

export default function ProjectSelector({ value, onChange, disabled, placeholder, className, icon }) {
  const { tasks } = useTaskStore();
  
  // Extract unique projects and format for SearchableSelect
  const options = useMemo(() => {
    const projectSet = new Set(tasks.map(t => t.project).filter(Boolean));
    if (value && typeof value === 'string' && value.trim()) {
      projectSet.add(value.trim());
    }
    const projects = [...projectSet].sort();
    return projects.map(p => ({ id: p, name: p }));
  }, [tasks, value]);

  const handleCreate = async (name) => {
    // For tasks, project is just a string stored on the task.
    // So "creating" one just means setting the string value.
    onChange(name);
  };

  return (
    <SearchableSelect
      className={className}
      options={options}
      value={value}
      onChange={onChange}
      onCreate={handleCreate}
      disabled={disabled}
      placeholder={placeholder || "Optional project name"}
      icon={icon}
    />
  );
}
