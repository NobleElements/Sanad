import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import GlobalConfirmModal from './GlobalConfirmModal';
import useConfirmStore from '../../store/useConfirmStore';

describe('GlobalConfirmModal Component', () => {
  it('does not render when isOpen is false', () => {
    const { container } = render(<GlobalConfirmModal />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders modal content when triggered via useConfirmStore', () => {
    render(<GlobalConfirmModal />);

    act(() => {
      useConfirmStore.getState().showConfirm({
        title: 'Delete Item',
        message: 'Are you sure you want to delete this?',
        confirmText: 'Yes, Delete',
        cancelText: 'No, Keep'
      });
    });

    expect(screen.getByRole('heading', { name: 'Delete Item' })).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to delete this?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Yes, Delete' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'No, Keep' })).toBeInTheDocument();
  });

  it('calls onConfirm callback and closes modal when confirm button is clicked', () => {
    const onConfirm = vi.fn();
    render(<GlobalConfirmModal />);

    act(() => {
      useConfirmStore.getState().showConfirm({
        title: 'Confirm Operation',
        onConfirm
      });
    });

    const confirmBtn = screen.getByRole('button', { name: 'Confirm' });
    fireEvent.click(confirmBtn);

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(useConfirmStore.getState().isOpen).toBe(false);
    expect(screen.queryByText('Confirm Operation')).not.toBeInTheDocument();
  });

  it('calls onCancel callback and closes modal when cancel button is clicked', () => {
    const onCancel = vi.fn();
    render(<GlobalConfirmModal />);

    act(() => {
      useConfirmStore.getState().showConfirm({
        title: 'Discard Changes',
        onCancel
      });
    });

    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelBtn);

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(useConfirmStore.getState().isOpen).toBe(false);
    expect(screen.queryByText('Discard Changes')).not.toBeInTheDocument();
  });
});
