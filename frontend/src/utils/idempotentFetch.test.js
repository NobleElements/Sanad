import { describe, it, expect, vi } from 'vitest';
import { createIdempotentFetch } from './idempotentFetch';
import { jsonResponse, deferred } from '../test/fetchMock';

describe('createIdempotentFetch', () => {
  it('injects Idempotency-Key and credentials on internal POST requests', async () => {
    const baseFetch = vi.fn().mockResolvedValue(jsonResponse({ id: 'tx-1' }, { status: 201 }));
    const fetchWithIdempotency = createIdempotentFetch(baseFetch);

    const res = await fetchWithIdempotency('/api/finances/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 50, categoryId: 'c1', description: 'Dinner' })
    });

    expect(res.status).toBe(201);
    expect(baseFetch).toHaveBeenCalledTimes(1);
    const [, passedConfig] = baseFetch.mock.calls[0];
    expect(passedConfig.credentials).toBe('include');
    expect(passedConfig.headers['Idempotency-Key']).toBeTruthy();
  });

  it('coalesces duplicate in-flight POST requests on a slow connection into a single network call', async () => {
    const slowRequest = deferred();
    const baseFetch = vi.fn().mockReturnValue(slowRequest.promise);
    const fetchWithIdempotency = createIdempotentFetch(baseFetch);

    // First and second submissions happen while the request is still in-flight
    // (including slight millisecond differences in the transaction timestamp)
    const call1 = fetchWithIdempotency('/api/finances/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: 25,
        categoryId: 'cat-1',
        description: 'Coffee',
        type: 'Expense',
        date: '2026-10-31T10:00:01.100Z'
      })
    });

    const call2 = fetchWithIdempotency('/api/finances/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: 25,
        categoryId: 'cat-1',
        description: 'Coffee',
        type: 'Expense',
        date: '2026-10-31T10:00:05.950Z'
      })
    });

    expect(baseFetch).toHaveBeenCalledTimes(1);

    slowRequest.resolve(jsonResponse({ id: 'tx-single', amount: 25 }, { status: 201 }));

    const [res1, res2] = await Promise.all([call1, call2]);
    expect(await res1.json()).toEqual({ id: 'tx-single', amount: 25 });
    expect(await res2.json()).toEqual({ id: 'tx-single', amount: 25 });
  });

  it('reuses the same Idempotency-Key when retrying after a network error, then uses a fresh key after success', async () => {
    const baseFetch = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(jsonResponse({ id: 'tx-1' }, { status: 201 }))
      .mockResolvedValueOnce(jsonResponse({ id: 'tx-2' }, { status: 201 }));

    const fetchWithIdempotency = createIdempotentFetch(baseFetch);
    const payload = JSON.stringify({ amount: 40, categoryId: 'c1', description: 'Fuel' });

    // 1. First attempt fails due to network drop
    await expect(
      fetchWithIdempotency('/api/finances/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload
      })
    ).rejects.toThrow('Failed to fetch');

    // 2. Retry of the same submission reuses the exact same Idempotency-Key
    const retryRes = await fetchWithIdempotency('/api/finances/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload
    });
    expect(retryRes.status).toBe(201);

    const key1 = baseFetch.mock.calls[0][1].headers['Idempotency-Key'];
    const key2 = baseFetch.mock.calls[1][1].headers['Idempotency-Key'];
    expect(key1).toBeTruthy();
    expect(key2).toBe(key1);

    // 3. Subsequent intentional submission after success gets a new Idempotency-Key
    await fetchWithIdempotency('/api/finances/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload
    });
    const key3 = baseFetch.mock.calls[2][1].headers['Idempotency-Key'];
    expect(key3).toBeTruthy();
    expect(key3).not.toBe(key1);
  });

  it('does not add Idempotency-Key to GET requests or external URLs', async () => {
    const baseFetch = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    const fetchWithIdempotency = createIdempotentFetch(baseFetch);

    await fetchWithIdempotency('/api/finances/transactions');
    await fetchWithIdempotency('https://cdn.example.com/asset.json', { method: 'POST' });

    expect(baseFetch.mock.calls[0][1].headers).toBeUndefined();
    expect(baseFetch.mock.calls[1][1].headers).toBeUndefined();
    expect(baseFetch.mock.calls[1][1].credentials).toBeUndefined();
  });
});
