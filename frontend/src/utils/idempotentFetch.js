import { ERROR_CODES } from '../constants/errorCodes';
import { API_BASE } from '../config';

const DEFAULT_KEY_TTL_MS = 5 * 60 * 1000; // 5 minutes

export const isInternalUrl = (url) => {
  if (!url) return false;
  const urlStr = typeof url === 'string' ? url : url.url || url.toString();
  if (urlStr.startsWith('/') || urlStr.startsWith('./') || urlStr.startsWith('../')) return true;
  try {
    const parsed = new URL(urlStr, window.location.origin);
    if (parsed.origin === window.location.origin) return true;
    if (API_BASE && parsed.origin === new URL(API_BASE, window.location.origin).origin) return true;
  } catch (e) {
    return false;
  }
  return false;
};

export const generateIdempotencyKey = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
};

const getNormalizedPath = (resource) => {
  const urlStr = typeof resource === 'string' ? resource : resource?.url || String(resource);
  try {
    const parsed = new URL(urlStr, window.location.origin);
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return urlStr;
  }
};

export const normalizeBodyForFingerprint = (path, body) => {
  if (body === undefined || body === null || body === '') return '';
  if (typeof body !== 'string') return null;

  try {
    const parsed = JSON.parse(body);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const clone = { ...parsed };
      // Strip second/millisecond jitter added by getDateToLog() when logging transactions
      if (
        path.endsWith('/finances/transactions') &&
        typeof clone.date === 'string' &&
        /^\d{4}-\d{2}-\d{2}T/.test(clone.date)
      ) {
        clone.date = clone.date.slice(0, 10);
      }
      return JSON.stringify(clone);
    }
  } catch {
    // Non-JSON string body
  }

  return body;
};

const getExistingIdempotencyKey = (headers) => {
  if (!headers) return null;
  if (typeof Headers !== 'undefined' && headers instanceof Headers) {
    return headers.get('Idempotency-Key') || headers.get('X-Idempotency-Key');
  }
  if (Array.isArray(headers)) {
    const found = headers.find(
      ([k]) => k.toLowerCase() === 'idempotency-key' || k.toLowerCase() === 'x-idempotency-key'
    );
    return found ? found[1] : null;
  }
  if (typeof headers === 'object') {
    for (const [k, v] of Object.entries(headers)) {
      if (k.toLowerCase() === 'idempotency-key' || k.toLowerCase() === 'x-idempotency-key') {
        return v;
      }
    }
  }
  return null;
};

const withIdempotencyKeyHeader = (headers, key) => {
  if (typeof Headers !== 'undefined' && headers instanceof Headers) {
    const next = new Headers(headers);
    if (!next.has('Idempotency-Key') && !next.has('X-Idempotency-Key')) {
      next.set('Idempotency-Key', key);
    }
    return next;
  }
  if (Array.isArray(headers)) {
    return [...headers, ['Idempotency-Key', key]];
  }
  return {
    ...(headers || {}),
    'Idempotency-Key': key
  };
};

/**
 * Wraps a fetch implementation with:
 * 1. Automatic `credentials: 'include'` for internal API requests
 * 2. Automatic `Idempotency-Key` header injection on internal POST requests
 * 3. In-flight POST request coalescing (prevents duplicate submissions on slow connections)
 * 4. Retry key persistence across transient network failures so re-submitting a failed POST
 *    reuses the same `Idempotency-Key` and is deduplicated by the backend.
 */
export const createIdempotentFetch = (baseFetch, { keyTtlMs = DEFAULT_KEY_TTL_MS } = {}) => {
  const inFlightRequests = new Map();
  const pendingKeys = new Map();

  const checkMigrationStatus = async (response) => {
    if (response && response.status === 503 && typeof response.clone === 'function') {
      const clone = response.clone();
      try {
        const data = await clone.json();
        if (data.error === ERROR_CODES.ACCOUNT_MIGRATING) {
          window.dispatchEvent(new Event('account_migrating'));
        }
      } catch (e) {}
    }
  };

  return async (...args) => {
    let [resource, config] = args;
    config = config ? { ...config } : {};

    const internal = isInternalUrl(resource);

    // Only inject credentials for internal/API requests to prevent CORS wildcard conflicts on external CDNs
    if (internal && !config.credentials) {
      config.credentials = 'include';
    }

    const method = (config.method || (typeof resource === 'object' && resource?.method) || 'GET').toUpperCase();

    if (!internal || method !== 'POST') {
      const response = await baseFetch(resource, config);
      await checkMigrationStatus(response);
      return response;
    }

    const path = getNormalizedPath(resource);
    const isStreamingChunk = /\/upload\/[^/]+\/chunk$/i.test(path) || path.startsWith('/mcp');
    const normalizedBody = !isStreamingChunk ? normalizeBodyForFingerprint(path, config.body) : null;
    const fingerprint = normalizedBody !== null ? `${method} ${path} ${normalizedBody}` : null;

    // Coalesce identical in-flight POST requests while waiting on a slow connection
    if (fingerprint && inFlightRequests.has(fingerprint)) {
      const response = await inFlightRequests.get(fingerprint);
      return typeof response?.clone === 'function' ? response.clone() : response;
    }

    const now = Date.now();
    for (const [k, entry] of pendingKeys.entries()) {
      if (now - entry.timestamp >= keyTtlMs) {
        pendingKeys.delete(k);
      }
    }

    let idempotencyKey = getExistingIdempotencyKey(config.headers);
    if (!idempotencyKey) {
      if (fingerprint) {
        const existingEntry = pendingKeys.get(fingerprint);
        if (existingEntry && now - existingEntry.timestamp < keyTtlMs) {
          idempotencyKey = existingEntry.key;
        } else {
          idempotencyKey = generateIdempotencyKey();
          pendingKeys.set(fingerprint, { key: idempotencyKey, timestamp: now });
        }
      } else {
        idempotencyKey = generateIdempotencyKey();
      }
      config.headers = withIdempotencyKeyHeader(config.headers, idempotencyKey);
    }

    const executeRequest = async () => {
      const response = await baseFetch(resource, config);
      await checkMigrationStatus(response);

      // Once the server responds with a non-5xx status, the request was definitively handled;
      // clear the pending key so future intentional submissions get a fresh Idempotency-Key.
      if (fingerprint && response && response.status < 500) {
        pendingKeys.delete(fingerprint);
      }

      return response;
    };

    const requestPromise = executeRequest();

    if (fingerprint) {
      inFlightRequests.set(fingerprint, requestPromise);
    }

    try {
      const response = await requestPromise;
      return typeof response?.clone === 'function' ? response.clone() : response;
    } finally {
      if (fingerprint) {
        inFlightRequests.delete(fingerprint);
      }
    }
  };
};
