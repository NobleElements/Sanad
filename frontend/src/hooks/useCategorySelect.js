import { useState, useRef } from 'react';
import { hslToHex } from '../utils/colorUtils';
import useFinanceStore from '../store/useFinanceStore';

export default function useCategorySelect() {
  const { categories, createCategory } = useFinanceStore();

  const [spendCategoryId, setSpendCategoryId] = useState('');
  const [catSearch, setCatSearch] = useState('');
  const [catDropdownOpen, setCatDropdownOpen] = useState(false);
  const [isCreatingCat, setIsCreatingCat] = useState(false);
  const catRef = useRef(null);

  const filteredCategories = categories.filter(c =>
    c.name.toLowerCase().includes(catSearch.toLowerCase())
  );
  
  const exactMatch = categories.find(
    c => c.name.toLowerCase() === catSearch.toLowerCase()
  );

  const createCategoryInline = async (name) => {
    setIsCreatingCat(true);
    try {
      const hue = Math.floor(Math.random() * 360);
      const colorHex = hslToHex(hue, 65, 55);
      const newCat = await createCategory(name, colorHex);
      if (newCat) {
        setSpendCategoryId(newCat.id);
        setCatSearch(newCat.name);
        setCatDropdownOpen(false);
      }
    } finally {
      setIsCreatingCat(false);
    }
  };

  const selectCategory = (cat) => {
    setSpendCategoryId(cat.id);
    setCatSearch(cat.name);
    setCatDropdownOpen(false);
  };

  const resetCategorySelect = () => {
    setSpendCategoryId('');
    setCatSearch('');
    setCatDropdownOpen(false);
  };

  return {
    spendCategoryId,
    setSpendCategoryId,
    catSearch,
    setCatSearch,
    catDropdownOpen,
    setCatDropdownOpen,
    isCreatingCat,
    catRef,
    filteredCategories,
    exactMatch,
    createCategoryInline,
    selectCategory,
    resetCategorySelect
  };
}
