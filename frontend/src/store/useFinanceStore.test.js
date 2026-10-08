import { describe, it, expect } from 'vitest';
import useFinanceStore from './useFinanceStore';
import { API_URL } from '../config';
import { mockFetch, jsonResponse } from '../test/fetchMock';

const financeRoutes = ({ month, year, summary, categories, currencies, transactions }) => ({
  [`GET /api/finances/summary?month=${month}&year=${year}`]: jsonResponse(summary),
  'GET /api/finances/categories': jsonResponse(categories),
  'GET /api/finances/currencies': jsonResponse(currencies),
  [`GET /api/finances/transactions?month=${month}&year=${year}&page=1&pageSize=15`]: jsonResponse(transactions)
});

describe('useFinanceStore', () => {
  it('fetchCurrencies loads available currencies into store', async () => {
    const mockCurrencies = [
      { id: 'c1', code: 'USD', name: 'US Dollar', symbol: '$', isDefault: true },
      { id: 'c2', code: 'EUR', name: 'Euro', symbol: '€', isDefault: false }
    ];
    const fetchMock = mockFetch({ 'GET /api/finances/currencies': jsonResponse(mockCurrencies) });

    await useFinanceStore.getState().fetchCurrencies();

    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/finances/currencies`);
    expect(useFinanceStore.getState().currencies).toEqual(mockCurrencies);
  });

  it('fetchFinanceData aggregates summary, categories, currencies, and transactions for the current month', async () => {
    useFinanceStore.setState({ currentMonth: 7, currentYear: 2026 });
    const mockSummary = {
      monthlyBudget: 1500,
      totalSpent: 450,
      categories: [{ categoryId: 'cat1', spent: 450 }]
    };
    const mockCategories = [{ id: 'cat1', name: 'Food', monthlyBudget: 500 }];
    const mockCurrencies = [{ id: 'c1', code: 'USD' }];
    const mockTransactions = [{ id: 'tx1', amount: 450, categoryId: 'cat1' }];
    mockFetch(financeRoutes({
      month: 7,
      year: 2026,
      summary: mockSummary,
      categories: mockCategories,
      currencies: mockCurrencies,
      transactions: { items: mockTransactions, totalCount: 1, hasMore: false }
    }));

    await useFinanceStore.getState().fetchFinanceData();

    const state = useFinanceStore.getState();
    expect(state.budgetSummary).toEqual(mockSummary);
    expect(state.categories).toEqual(mockCategories);
    expect(state.currencies).toEqual(mockCurrencies);
    expect(state.transactions).toEqual(mockTransactions);
    expect(state.isLoaded).toBe(true);
  });

  it('setDate changes month/year and reloads data for the new month from page 1', async () => {
    useFinanceStore.setState({ currentMonth: 7, currentYear: 2026, transactionsPage: 3 });
    const novemberSummary = { monthlyBudget: 900, totalSpent: 10, categories: [] };
    const novemberTransactions = [{ id: 'tx-nov', amount: 10 }];
    const fetchMock = mockFetch(financeRoutes({
      month: 11,
      year: 2027,
      summary: novemberSummary,
      categories: [],
      currencies: [],
      transactions: { items: novemberTransactions, totalCount: 1, hasMore: false }
    }));

    await useFinanceStore.getState().setDate(11, 2027);

    const state = useFinanceStore.getState();
    expect(state.currentMonth).toBe(11);
    expect(state.currentYear).toBe(2027);
    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/finances/summary?month=11&year=2027`);
    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/finances/transactions?month=11&year=2027&page=1&pageSize=15`);
    expect(state.budgetSummary).toEqual(novemberSummary);
    expect(state.transactions).toEqual(novemberTransactions);
    expect(state.isLoaded).toBe(true);
  });
});
