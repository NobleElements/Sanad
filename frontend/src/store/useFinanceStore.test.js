import { describe, it, expect, beforeEach, vi } from 'vitest';
import useFinanceStore from './useFinanceStore';
import useUIStore from './useUIStore';
import { API_URL } from '../config';
import { mockFetch, jsonResponse, errorResponse, jsonBody } from '../test/fetchMock';

const hasToast = (message, type) =>
  useUIStore.getState().toasts.some(t => t.message === message && (!type || t.type === type));

const financeRoutes = ({ month, year, summary, categories, currencies, transactions }) => ({
  [`GET /api/finances/summary?month=${month}&year=${year}`]: jsonResponse(summary),
  'GET /api/finances/categories': jsonResponse(categories),
  'GET /api/finances/currencies': jsonResponse(currencies),
  [`GET /api/finances/transactions?month=${month}&year=${year}&page=1&pageSize=15`]: jsonResponse(transactions)
});

describe('useFinanceStore', () => {
  beforeEach(() => {
    useUIStore.setState({ toasts: [] });
    useFinanceStore.setState({
      categories: [],
      transactions: [],
      budgetSummary: { categories: [], monthlyBudget: 0, totalSpent: 0 },
      assets: [],
      debts: [],
      currencies: [],
      isLoaded: false
    });
  });
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

  it('addAsset calls POST, refreshes assets, and adds success toast', async () => {
    const fetchMock = mockFetch({
      'POST /api/finances/assets': jsonResponse({ id: 'a1' }, { status: 201 }),
      'GET /api/finances/assets': jsonResponse([{ id: 'a1', name: 'Savings', currentAmount: 1000 }]),
      'GET /api/finances/assets/history': jsonResponse([]),
      'GET /api/finances/debts': jsonResponse([]),
      'GET /api/finances/debts/history': jsonResponse([])
    });

    const success = await useFinanceStore.getState().addAsset('Savings', 'Bank', 1000, 'c1', 'wallet');

    expect(success).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/finances/assets`, expect.objectContaining({
      method: 'POST',
      body: jsonBody({ name: 'Savings', type: 'Bank', currentAmount: 1000, currencyId: 'c1', icon: 'wallet' })
    }));
    expect(hasToast('Asset created', 'success')).toBe(true);
    expect(useFinanceStore.getState().assets).toEqual([{ id: 'a1', name: 'Savings', currentAmount: 1000 }]);
  });

  it('reorderAssets updates optimistically and reverts on error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const a1 = { id: 'a1', name: 'First' };
    const a2 = { id: 'a2', name: 'Second' };
    useFinanceStore.setState({ assets: [a1, a2] });

    mockFetch({
      'PUT /api/finances/assets/reorder': errorResponse(500)
    });

    await useFinanceStore.getState().reorderAssets(['a2', 'a1']);

    expect(useFinanceStore.getState().assets).toEqual([a1, a2]);
    expect(hasToast('Failed to save asset order', 'error')).toBe(true);
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('addDebt calls POST, refreshes assets/debts, and adds success toast', async () => {
    const fetchMock = mockFetch({
      'POST /api/finances/debts': jsonResponse({ id: 'd1' }, { status: 201 }),
      'GET /api/finances/assets': jsonResponse([]),
      'GET /api/finances/assets/history': jsonResponse([]),
      'GET /api/finances/debts': jsonResponse([{ id: 'd1', name: 'Car Loan', currentAmount: 5000 }]),
      'GET /api/finances/debts/history': jsonResponse([])
    });

    const success = await useFinanceStore.getState().addDebt('Car Loan', 'Loan', 5000, 'c1', 'car');

    expect(success).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/finances/debts`, expect.objectContaining({
      method: 'POST',
      body: jsonBody({ name: 'Car Loan', type: 'Loan', currentAmount: 5000, currencyId: 'c1', icon: 'car' })
    }));
    expect(hasToast('Debt created', 'success')).toBe(true);
  });

  it('deleteDebt calls DELETE and refreshes', async () => {
    const fetchMock = mockFetch({
      'DELETE /api/finances/debts/d1': jsonResponse(null, { status: 204 }),
      'GET /api/finances/assets': jsonResponse([]),
      'GET /api/finances/assets/history': jsonResponse([]),
      'GET /api/finances/debts': jsonResponse([]),
      'GET /api/finances/debts/history': jsonResponse([])
    });

    const success = await useFinanceStore.getState().deleteDebt('d1');

    expect(success).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/finances/debts/d1`, { method: 'DELETE' });
    expect(hasToast('Debt deleted', 'success')).toBe(true);
  });

  it('setDefaultCurrency calls PUT and updates store with success toast', async () => {
    const fetchMock = mockFetch({
      'PUT /api/finances/currencies/c2/set-default': jsonResponse({ success: true }),
      'GET /api/finances/currencies': jsonResponse([{ id: 'c2', code: 'EUR', isDefault: true }]),
      'GET /api/finances/assets': jsonResponse([]),
      'GET /api/finances/assets/history': jsonResponse([]),
      'GET /api/finances/debts': jsonResponse([]),
      'GET /api/finances/debts/history': jsonResponse([])
    });

    const success = await useFinanceStore.getState().setDefaultCurrency('c2');

    expect(success).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/finances/currencies/c2/set-default`, { method: 'PUT' });
    expect(hasToast('Default currency changed', 'success')).toBe(true);
  });

  it('shows error toast when fetchFinanceData fails', async () => {
    const month = useFinanceStore.getState().currentMonth;
    const year = useFinanceStore.getState().currentYear;

    mockFetch({
      [`GET /api/finances/summary?month=${month}&year=${year}`]: errorResponse(500),
      'GET /api/finances/categories': jsonResponse([])
    });

    await useFinanceStore.getState().fetchFinanceData();

    expect(hasToast('Failed to load financial data', 'error')).toBe(true);
  });
});
