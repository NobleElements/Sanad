import { describe, it, expect, beforeEach } from 'vitest';
import useUIStore from './useUIStore';

describe('useUIStore', () => {
  beforeEach(() => {
    // Reset store state
    useUIStore.setState({
      theme: 'light',
      toasts: [],
      isOffline: false,
      isGlobalSearchOpen: false
    });
  });

  it('manages offline status correctly', () => {
    expect(useUIStore.getState().isOffline).toBe(false);

    useUIStore.getState().setOfflineStatus(true);
    expect(useUIStore.getState().isOffline).toBe(true);

    useUIStore.getState().setOfflineStatus(false);
    expect(useUIStore.getState().isOffline).toBe(false);
  });

  it('adds and removes toasts', () => {
    expect(useUIStore.getState().toasts).toHaveLength(0);

    useUIStore.getState().addToast('File uploaded', 'success');
    const toasts = useUIStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0].message).toBe('File uploaded');
    expect(toasts[0].type).toBe('success');

    // Remove toast by id
    useUIStore.getState().removeToast(toasts[0].id);
    expect(useUIStore.getState().toasts).toHaveLength(0);
  });

  it('toggles theme between light and dark', () => {
    expect(useUIStore.getState().theme).toBe('light');

    useUIStore.getState().toggleTheme();
    expect(useUIStore.getState().theme).toBe('dark');

    useUIStore.getState().toggleTheme();
    expect(useUIStore.getState().theme).toBe('light');
  });

  it('toggles global search modal', () => {
    expect(useUIStore.getState().isGlobalSearchOpen).toBe(false);

    useUIStore.getState().openGlobalSearch();
    expect(useUIStore.getState().isGlobalSearchOpen).toBe(true);

    useUIStore.getState().closeGlobalSearch();
    expect(useUIStore.getState().isGlobalSearchOpen).toBe(false);
  });
});
