import { describe, it, expect, beforeEach, vi } from 'vitest';
import useSubscriptionStore from './useSubscriptionStore';
import { API_URL } from '../config';
import { mockFetch, jsonResponse } from '../test/fetchMock';

describe('useSubscriptionStore', () => {
  beforeEach(() => {
    useSubscriptionStore.setState({
      tiers: [],
      storageData: { diskUsed: 0, diskLimitBytes: 1 },
      loading: false,
      error: null
    });
  });

  it('fetchSubscriptionData fetches tiers and storage info', async () => {
    const mockTiers = [{ id: 1, name: 'Free', price: 0 }];
    const mockStorage = { diskUsed: 500, diskLimitBytes: 10000 };

    const fetchMock = mockFetch({
      'GET /api/storage/tiers': jsonResponse(mockTiers),
      'GET /api/storage': jsonResponse(mockStorage)
    });

    const promise = useSubscriptionStore.getState().fetchSubscriptionData();
    expect(useSubscriptionStore.getState().loading).toBe(true);

    await promise;

    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/storage/tiers`);
    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/storage`);

    const state = useSubscriptionStore.getState();
    expect(state.tiers).toEqual(mockTiers);
    expect(state.storageData).toEqual(mockStorage);
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('fetchSubscriptionData sets error state on fetch failure', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const fetchMock = vi.fn().mockRejectedValue(new Error('Network error'));
    vi.stubGlobal('fetch', fetchMock);

    await useSubscriptionStore.getState().fetchSubscriptionData();

    const state = useSubscriptionStore.getState();
    expect(state.error).toBe('Failed to load subscription data');
    expect(state.loading).toBe(false);
    expect(consoleSpy).toHaveBeenCalled();
  });
});
