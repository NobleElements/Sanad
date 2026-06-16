import { create } from 'zustand';
import { API_BASE, API_URL } from '../config';
import useUIStore from './useUIStore';

const useFinanceStore = create((set, get) => ({
  categories: [],
  transactions: [],
  budgetSummary: { categories: [], monthlyBudget: 0, totalSpent: 0 },
  assets: [],
  currencies: [],
  isLoaded: false,

  currentMonth: new Date().getMonth() + 1,
  currentYear: new Date().getFullYear(),

  setDate: (month, year) => {
    set({ currentMonth: month, currentYear: year });
    get().fetchFinanceData();
  },

  fetchCurrencies: async () => {
    try {
      const res = await fetch(`${API_URL}/finances/currencies`);
      if (res.ok) {
        set({ currencies: await res.json() });
      }
    } catch (err) {
      console.error(err);
    }
  },

  fetchFinanceData: async () => {
    const { currentMonth, currentYear } = get();
    try {
      const [sumRes, catRes, txRes] = await Promise.all([
        fetch(`${API_URL}/finances/summary?month=${currentMonth}&year=${currentYear}`),
        fetch(`${API_URL}/finances/categories`),
        fetch(`${API_URL}/finances/transactions?month=${currentMonth}&year=${currentYear}`)
      ]);

      if (sumRes.ok && catRes.ok && txRes.ok) {
        const sumData = await sumRes.json();
        const catData = await catRes.json();
        const txData = await txRes.json();
        await get().fetchCurrencies();
        set({ budgetSummary: sumData, categories: catData, transactions: txData, isLoaded: true });
      } else {
        useUIStore.getState().showError('Failed to load financial data');
      }
    } catch (err) {
      useUIStore.getState().showError('Network error loading finance data');
    }
  },

  assetHistory: [],
  assetChartLines: [],

  fetchAssets: async () => {
    try {
      const [assetsRes, histRes] = await Promise.all([
        fetch(`${API_URL}/finances/assets`),
        fetch(`${API_URL}/finances/assets/history`)
      ]);
      if (assetsRes.ok && histRes.ok) {
        const assetsData = await assetsRes.json();
        const histData = await histRes.json();
        
        const pointsMap = new Map();
        const assetLatestValue = {};
        const allAssetNames = new Set();
        
        histData.forEach(snapshot => {
          const dateStr = new Date(snapshot.recordedAt).toLocaleDateString();
          const name = snapshot.assetName || snapshot.assetId;
          
          const convertedValue = snapshot.amount * (snapshot.exchangeRateToDefault || 1);
          assetLatestValue[name] = convertedValue;
          allAssetNames.add(name);
          
          const totalNetWorth = Object.values(assetLatestValue).reduce((a, b) => a + b, 0);
          const point = { date: dateStr, netWorth: totalNetWorth };
          
          Object.entries(assetLatestValue).forEach(([k, v]) => {
            point[k] = v;
          });
          
          pointsMap.set(dateStr, point);
        });

        set({ 
          assets: assetsData, 
          assetHistory: Array.from(pointsMap.values()),
          assetChartLines: Array.from(allAssetNames)
        });
      }
    } catch (err) {
      useUIStore.getState().showError('Network error loading assets');
    }
  },

  addAsset: async (name, type, amount, currencyId, icon) => {
    try {
      const res = await fetch(`${API_URL}/finances/assets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type, currentAmount: amount, currencyId, icon })
      });
      if (res.ok) {
        useUIStore.getState().showSuccess('Asset created');
        await get().fetchAssets();
        return true;
      }
      throw new Error('Failed to create');
    } catch (err) {
      useUIStore.getState().showError('Failed to add asset');
      return false;
    }
  },

  updateAsset: async (asset, newAmount) => {
    try {
      const res = await fetch(`${API_URL}/finances/assets/${asset.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...asset, currentAmount: newAmount })
      });
      if (res.ok) {
        useUIStore.getState().showSuccess('Asset updated');
        await get().fetchAssets();
        return true;
      }
      throw new Error('Failed to update');
    } catch (err) {
      useUIStore.getState().showError('Failed to update asset');
      return false;
    }
  },

  reorderAssets: async (orderedIds) => {
    // Optimistic UI update
    const currentAssets = [...get().assets];
    const newAssets = orderedIds.map(id => currentAssets.find(a => a.id === id)).filter(Boolean);
    set({ assets: newAssets });
    
    try {
      const res = await fetch(`${API_URL}/finances/assets/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderedIds)
      });
      if (!res.ok) {
        throw new Error('Failed to reorder assets');
      }
    } catch (err) {
      console.error(err);
      // Revert on failure
      set({ assets: currentAssets });
      useUIStore.getState().showError('Failed to save asset order');
    }
  },

  deleteAsset: async (id) => {
    try {
      const res = await fetch(`${API_URL}/finances/assets/${id}`, { method: 'DELETE' });
      if (res.ok) {
        useUIStore.getState().showSuccess('Asset deleted');
        await get().fetchAssets();
        return true;
      }
      throw new Error('Failed to delete');
    } catch (err) {
      useUIStore.getState().showError('Failed to delete asset');
      return false;
    }
  },

  addTransaction: async (amount, categoryId, description, type = 'Expense', date = null) => {
    try {
      const txDate = date ? new Date(date).toISOString() : new Date().toISOString();
      const res = await fetch(`${API_URL}/finances/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, categoryId, description, type, date: txDate })
      });
      if (res.ok) {
        useUIStore.getState().showSuccess('Transaction logged');
        await get().fetchFinanceData(); // refresh data
        return true;
      }
      throw new Error('Failed to log');
    } catch (err) {
      useUIStore.getState().showError('Failed to log expense');
      return false;
    }
  },

  deleteTransaction: async (id) => {
    try {
      const res = await fetch(`${API_URL}/finances/transactions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        useUIStore.getState().showSuccess('Transaction deleted');
        await get().fetchFinanceData();
      } else {
        throw new Error('Failed to delete');
      }
    } catch (err) {
      useUIStore.getState().showError('Failed to delete transaction');
    }
  },

  createCategory: async (name, colorHex) => {
    try {
      const res = await fetch(`${API_URL}/finances/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, monthlyBudget: 0, colorHex })
      });
      if (res.ok) {
        const newCat = await res.json();
        await get().fetchFinanceData();
        return newCat;
      }
      throw new Error('Failed to create category');
    } catch (err) {
      useUIStore.getState().showError('Failed to create category');
      return null;
    }
  },

  updateCategory: async (id, name, colorHex, monthlyBudget) => {
    try {
      const res = await fetch(`${API_URL}/finances/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, colorHex, monthlyBudget })
      });
      if (res.ok) {
        await get().fetchFinanceData();
        useUIStore.getState().showSuccess('Category updated');
        return true;
      }
      throw new Error('Failed to update');
    } catch (err) {
      useUIStore.getState().showError('Failed to update category');
      return false;
    }
  },

  updateBudget: async (amount) => {
    const { currentMonth, currentYear } = get();
    try {
      const res = await fetch(`${API_URL}/finances/budget`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, month: currentMonth, year: currentYear })
      });
      if (res.ok) {
        await get().fetchFinanceData();
        useUIStore.getState().showSuccess('Budget updated');
        return true;
      }
      throw new Error('Failed to update budget');
    } catch (err) {
      useUIStore.getState().showError('Failed to update budget');
      return false;
    }
  },

  addCurrency: async (code, name, symbol, exchangeRateToDefault) => {
    try {
      const res = await fetch(`${API_URL}/finances/currencies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, name, symbol, exchangeRateToDefault })
      });
      if (res.ok) {
        useUIStore.getState().showSuccess('Currency created');
        await get().fetchCurrencies();
        return true;
      }
      throw new Error('Failed to create');
    } catch (err) {
      useUIStore.getState().showError('Failed to add currency');
      return false;
    }
  },

  updateCurrency: async (id, code, name, symbol, exchangeRateToDefault) => {
    try {
      const res = await fetch(`${API_URL}/finances/currencies/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, name, symbol, exchangeRateToDefault })
      });
      if (res.ok) {
        useUIStore.getState().showSuccess('Currency updated');
        await get().fetchCurrencies();
        return true;
      }
      throw new Error('Failed to update');
    } catch (err) {
      useUIStore.getState().showError('Failed to update currency');
      return false;
    }
  },

  deleteCurrency: async (id) => {
    try {
      const res = await fetch(`${API_URL}/finances/currencies/${id}`, { method: 'DELETE' });
      if (res.ok) {
        useUIStore.getState().showSuccess('Currency deleted');
        await get().fetchCurrencies();
        return true;
      }
      if (res.status === 400) {
        const text = await res.text();
        useUIStore.getState().showError(text.replace(/"/g, ''));
        return false;
      }
      throw new Error('Failed to delete');
    } catch (err) {
      useUIStore.getState().showError('Failed to delete currency');
      return false;
    }
  },

  setDefaultCurrency: async (id) => {
    try {
      const res = await fetch(`${API_URL}/finances/currencies/${id}/set-default`, { method: 'PUT' });
      if (res.ok) {
        useUIStore.getState().showSuccess('Default currency changed');
        await get().fetchCurrencies();
        await get().fetchAssets();
        return true;
      }
      throw new Error('Failed to set default');
    } catch (err) {
      useUIStore.getState().showError('Failed to change default currency');
      return false;
    }
  }
}));

export default useFinanceStore;
