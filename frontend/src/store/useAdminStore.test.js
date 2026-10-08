import { describe, it, expect, beforeEach } from 'vitest';
import useAdminStore from './useAdminStore';
import useConfirmStore from './useConfirmStore';
import useUIStore from './useUIStore';
import { API_URL } from '../config';
import { mockFetch, jsonResponse, errorResponse, jsonBody } from '../test/fetchMock';

const hasToast = (message, type) =>
  useUIStore.getState().toasts.some(t => t.message === message && (!type || t.type === type));

describe('useAdminStore', () => {
  beforeEach(() => {
    useUIStore.setState({ toasts: [] });
    useConfirmStore.setState({ isOpen: false });
    useAdminStore.setState({
      dashboardData: { users: [], totalCount: 0, totalDiskUsage: 0, monthlyRevenue: 0, usersByTier: {} },
      tiers: [],
      datastores: [],
      loading: false,
      error: null
    });
  });

  it('fetchData loads users, tiers, and datastores', async () => {
    const mockUsers = { users: [{ id: 'u1', username: 'alice' }], totalCount: 1 };
    const mockTiers = [{ id: 1, name: 'Free' }];
    const mockDatastores = [{ id: 1, name: 'Default', path: 'Data' }];

    mockFetch({
      'GET /api/admin/users': jsonResponse(mockUsers),
      'GET /api/storage/tiers': jsonResponse(mockTiers),
      'GET /api/admin/datastores': jsonResponse(mockDatastores)
    });

    await useAdminStore.getState().fetchData();

    const state = useAdminStore.getState();
    expect(state.dashboardData).toEqual(mockUsers);
    expect(state.tiers).toEqual(mockTiers);
    expect(state.datastores).toEqual(mockDatastores);
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('fetchData sets error on network failure', async () => {
    mockFetch({
      'GET /api/admin/users': errorResponse(500, 'Server Error')
    });

    await useAdminStore.getState().fetchData();

    const state = useAdminStore.getState();
    expect(state.error).toBe('Failed to load admin data');
    expect(state.loading).toBe(false);
  });

  it('updateUser sends PATCH and refreshes data', async () => {
    const fetchMock = mockFetch({
      'PATCH /api/admin/users/u1': jsonResponse({ success: true }),
      'GET /api/admin/users': jsonResponse({ users: [] }),
      'GET /api/storage/tiers': jsonResponse([]),
      'GET /api/admin/datastores': jsonResponse([])
    });

    await useAdminStore.getState().updateUser('u1', { isAdmin: true });

    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/admin/users/u1`, expect.objectContaining({
      method: 'PATCH',
      body: jsonBody({ isAdmin: true })
    }));
  });

  it('deleteUser prompts confirmation before deleting', async () => {
    const fetchMock = mockFetch({
      'DELETE /api/admin/users/u1': jsonResponse({ success: true }),
      'GET /api/admin/users': jsonResponse({ users: [] }),
      'GET /api/storage/tiers': jsonResponse([]),
      'GET /api/admin/datastores': jsonResponse([])
    });

    await useAdminStore.getState().deleteUser('u1');

    const confirmState = useConfirmStore.getState();
    expect(confirmState.isOpen).toBe(true);
    expect(confirmState.title).toBe('Delete User');

    await confirmState.onConfirm();

    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/admin/users/u1`, expect.objectContaining({
      method: 'DELETE'
    }));
  });

  it('resetPassword sends POST and adds toast', async () => {
    const fetchMock = mockFetch({
      'POST /api/admin/users/u1/reset-password': jsonResponse({ success: true })
    });

    await useAdminStore.getState().resetPassword('u1', 'NewSecret123!');

    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/admin/users/u1/reset-password`, expect.objectContaining({
      method: 'POST',
      body: jsonBody({ newPassword: 'NewSecret123!' })
    }));
    expect(hasToast('Password reset successfully.', 'success')).toBe(true);
  });

  it('recalculateStorage calls endpoint and adds success toast', async () => {
    mockFetch({
      'POST /api/admin/users/alice/recalculate-storage': jsonResponse({ success: true }),
      'GET /api/admin/users': jsonResponse({ users: [] }),
      'GET /api/storage/tiers': jsonResponse([]),
      'GET /api/admin/datastores': jsonResponse([])
    });

    await useAdminStore.getState().recalculateStorage('alice');

    expect(hasToast('Storage recalculated for alice.', 'success')).toBe(true);
  });

  it('createDatastore sends POST and returns true on success', async () => {
    mockFetch({
      'POST /api/admin/datastores': jsonResponse({ id: 2, name: 'Backup' }),
      'GET /api/admin/users': jsonResponse({ users: [] }),
      'GET /api/storage/tiers': jsonResponse([]),
      'GET /api/admin/datastores': jsonResponse([])
    });

    const result = await useAdminStore.getState().createDatastore('Backup', '/mnt/backup', false);
    expect(result).toBe(true);
  });

  it('cancelSubscription prompts confirm and sends POST', async () => {
    mockFetch({
      'POST /api/admin/users/u1/subscription/cancel': jsonResponse({ success: true }),
      'GET /api/admin/users': jsonResponse({ users: [] }),
      'GET /api/storage/tiers': jsonResponse([]),
      'GET /api/admin/datastores': jsonResponse([])
    });

    await useAdminStore.getState().cancelSubscription('u1');

    const confirmState = useConfirmStore.getState();
    expect(confirmState.isOpen).toBe(true);

    await confirmState.onConfirm();
    expect(hasToast('Subscription canceled successfully.', 'success')).toBe(true);
  });

  it('refundSubscription prompts confirm and sends POST', async () => {
    mockFetch({
      'POST /api/admin/users/u1/subscription/refund': jsonResponse({ success: true }),
      'GET /api/admin/users': jsonResponse({ users: [] }),
      'GET /api/storage/tiers': jsonResponse([]),
      'GET /api/admin/datastores': jsonResponse([])
    });

    await useAdminStore.getState().refundSubscription('u1', 15.0);

    const confirmState = useConfirmStore.getState();
    expect(confirmState.isOpen).toBe(true);

    await confirmState.onConfirm();
    expect(hasToast('Refund issued successfully.', 'success')).toBe(true);
  });
});
