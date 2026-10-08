import { describe, it, expect, beforeEach, vi } from 'vitest';
import useConfirmStore from './useConfirmStore';

describe('useConfirmStore', () => {
  beforeEach(() => {
    useConfirmStore.setState({
      isOpen: false,
      title: 'Confirm Action',
      message: 'Are you sure?',
      confirmText: 'Confirm',
      cancelText: 'Cancel'
    });
  });

  it('shows confirmation dialog with custom options', () => {
    expect(useConfirmStore.getState().isOpen).toBe(false);

    useConfirmStore.getState().showConfirm({
      title: 'Delete Item',
      message: 'Are you sure you want to delete this task?',
      confirmText: 'Yes, Delete',
      cancelText: 'No'
    });

    const state = useConfirmStore.getState();
    expect(state.isOpen).toBe(true);
    expect(state.title).toBe('Delete Item');
    expect(state.message).toBe('Are you sure you want to delete this task?');
    expect(state.confirmText).toBe('Yes, Delete');
    expect(state.cancelText).toBe('No');
  });

  it('triggers onConfirm callback and closes dialog', () => {
    const onConfirmMock = vi.fn();

    useConfirmStore.getState().showConfirm({
      onConfirm: onConfirmMock
    });

    expect(useConfirmStore.getState().isOpen).toBe(true);

    useConfirmStore.getState().onConfirm();

    expect(onConfirmMock).toHaveBeenCalledTimes(1);
    expect(useConfirmStore.getState().isOpen).toBe(false);
  });

  it('triggers onCancel callback and closes dialog', () => {
    const onCancelMock = vi.fn();

    useConfirmStore.getState().showConfirm({
      onCancel: onCancelMock
    });

    expect(useConfirmStore.getState().isOpen).toBe(true);

    useConfirmStore.getState().onCancel();

    expect(onCancelMock).toHaveBeenCalledTimes(1);
    expect(useConfirmStore.getState().isOpen).toBe(false);
  });
});
