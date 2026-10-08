// Zustand stores are module-level singletons, so state set in one test would leak into the next.
// This wraps `create` to remember each store's initial state and restore it after every test.
// Enabled for all tests by vi.mock('zustand') in src/test/setup.js.
// See https://zustand.docs.pmnd.rs/guides/testing
import { act } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

const { create: actualCreate } = await vi.importActual('zustand');

const storeResetFns = new Set();

const createUncurried = (stateCreator) => {
  const store = actualCreate(stateCreator);
  const initialState = store.getInitialState();
  storeResetFns.add(() => store.setState(initialState, true));
  return store;
};

export const create = (stateCreator) =>
  typeof stateCreator === 'function' ? createUncurried(stateCreator) : createUncurried;

afterEach(() => {
  act(() => {
    storeResetFns.forEach((resetFn) => resetFn());
  });
});
