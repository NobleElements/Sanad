import React, { useState } from 'react';
import SearchableSelect from './SearchableSelect';
import useFinanceStore from '../store/useFinanceStore';
import { hslToHex } from '../utils/colorUtils';

export default function CategorySelector({ value, onChange, disabled, placeholder, className }) {
  const { categories, createCategory } = useFinanceStore();
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async (name) => {
    setIsCreating(true);
    try {
      const hue = Math.floor(Math.random() * 360);
      const colorHex = hslToHex(hue, 65, 55);
      const newCat = await createCategory(name, colorHex);
      if (newCat) {
        onChange(newCat.id);
      }
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <SearchableSelect
      className={className}
      options={categories}
      value={value}
      onChange={onChange}
      onCreate={handleCreate}
      isCreating={isCreating}
      disabled={disabled}
      placeholder={placeholder || "Type to search..."}
      renderOption={(c) => (
        <>
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: c.colorHex || '#CBD5E1' }} />
          {c.name}
        </>
      )}
    />
  );
}
