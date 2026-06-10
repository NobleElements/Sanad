import { create } from 'zustand';
import { API_BASE } from '../config';
import useUIStore from './useUIStore';

const useFinanceStore = create((set, get) => ({
  categories: [],
  transactions: [],
  budgetSummary: { categories: [], monthlyBudget: 0, totalSpent: 0 },
  assets: [],
  isLoaded: false,

  currentMonth: new Date().getMonth() + 1,
  currentYear: new Date().getFullYear(),

  setDate: (month, year) => {
    set({ currentMonth: month, currentYear: year });
    get().fetchFinanceData();
  },

  fetchFinanceData: async () => {
    const { currentMonth, currentYear } = get();
    try {
      const [sumRes, catRes, txRes] = await Promise.all([
        fetch(`${API_BASE}/api/finances/summary?month=${currentMonth}&year=${currentYear}`),
        fetch(`${API_BASE}/api/finances/categories`),
        fetch(`${API_BASE}/api/finances/transactions?month=${currentMonth}&year=${currentYear}`)
      ]);

      if (sumRes.ok && catRes.ok && txRes.ok) {
        const sumData = await sumRes.json();
        const catData = await catRes.json();
        const txData = await txRes.json();
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
        fetch(`${API_BASE}/api/finances/assets`),
        fetch(`${API_BASE}/api/finances/assets/history`)
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
          
          assetLatestValue[name] = snapshot.amount;
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

  addAsset: async (name, type, amount) => {
    try {
      const res = await fetch(`${API_BASE}/api/finances/assets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type, currentAmount: amount })
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
      const res = await fetch(`${API_BASE}/api/finances/assets/${asset.id}`, {
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

  deleteAsset: async (id) => {
    try {
      const res = await fetch(`${API_BASE}/api/finances/assets/${id}`, { method: 'DELETE' });
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

  addTransaction: async (amount, categoryId, description, type = 'Expense') => {
    try {
      const res = await fetch(`${API_BASE}/api/finances/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, categoryId, description, type, date: new Date().toISOString() })
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
      const res = await fetch(`${API_BASE}/api/finances/transactions/${id}`, { method: 'DELETE' });
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
      const res = await fetch(`${API_BASE}/api/finances/categories`, {
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
      const res = await fetch(`${API_BASE}/api/finances/categories/${id}`, {
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
      const res = await fetch(`${API_BASE}/api/finances/budget`, {
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
  }
}));

export default useFinanceStore;
