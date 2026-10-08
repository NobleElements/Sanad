import '@testing-library/jest-dom';
import { afterEach, vi } from 'vitest';

// Reset every Zustand store to its initial state after each test (see __mocks__/zustand.js).
vi.mock('zustand');

// Global mocks for browser APIs missing in jsdom
class MockIntersectionObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.IntersectionObserver = MockIntersectionObserver;

// Mocks and stubbed globals are restored by restoreMocks/unstubGlobals in vitest.config.js.
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  localStorage.clear();
  sessionStorage.clear();
});
