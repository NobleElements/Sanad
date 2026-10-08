import { expect, vi } from 'vitest';

/**
 * Builds a fetch Response-like object. `ok` follows `status` unless given explicitly.
 */
export const jsonResponse = (body, { status = 200, ok = status >= 200 && status < 300 } = {}) => ({
  ok,
  status,
  json: async () => body,
  text: async () => (body === undefined ? '' : JSON.stringify(body)),
  clone: () => jsonResponse(body, { status, ok }),
});

export const errorResponse = (status = 500, body = '') => jsonResponse(body, { status });

const requestKey = (input, init = {}) => {
  const rawUrl = typeof input === 'string' ? input : input.url;
  const { pathname, search } = new URL(rawUrl, 'http://localhost');
  const method = (init.method || 'GET').toUpperCase();
  return `${method} ${pathname}${search}`;
};

/**
 * Stubs global fetch with a URL-routed mock so tests don't depend on call order.
 *
 * `routes` maps "METHOD /path?query" (exact match on method, path and query string) to either a
 * response object or a function `(url, init) => response | Promise<response>`.
 * Unrouted requests reject with an error naming the request, and are recorded in `fetchMock.unhandled`.
 */
export const mockFetch = (routes = {}) => {
  const unhandled = [];
  const fetchMock = vi.fn(async (input, init) => {
    const key = requestKey(input, init);
    if (!Object.hasOwn(routes, key)) {
      unhandled.push(key);
      throw new Error(`Unmocked fetch: ${key}`);
    }
    const route = routes[key];
    return typeof route === 'function' ? route(input, init) : route;
  });
  fetchMock.unhandled = unhandled;
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

/** A promise that the test resolves by hand, to observe state while a request is in flight. */
export const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

expect.extend({
  jsonBodyEqual(received, expected) {
    let parsed;
    try {
      parsed = JSON.parse(received);
    } catch {
      return { pass: false, message: () => `expected a JSON request body, received ${this.utils.printReceived(received)}` };
    }
    return {
      pass: this.equals(parsed, expected),
      message: () =>
        `expected JSON body ${this.utils.printExpected(expected)}, received ${this.utils.printReceived(parsed)}`,
    };
  },
});

/** Asymmetric matcher for a JSON-encoded request body, independent of key order. */
export const jsonBody = (expected) => expect.jsonBodyEqual(expected);
