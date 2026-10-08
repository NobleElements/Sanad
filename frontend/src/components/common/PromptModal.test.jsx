import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PromptModal from './PromptModal';

const renderOpen = (props = {}) => {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  render(
    <PromptModal
      isOpen={true}
      title="Edit Item"
      initialValue="Original"
      confirmText="Save"
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...props}
    />
  );
  return { onConfirm, onCancel, input: screen.getByRole('textbox'), submitBtn: screen.getByRole('button', { name: 'Save' }) };
};

describe('PromptModal Component', () => {
  it('does not render when isOpen is false', () => {
    const { container } = render(
      <PromptModal
        isOpen={false}
        title="Rename Project"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders title, message, and initialValue when open', () => {
    render(
      <PromptModal
        isOpen={true}
        title="Rename Folder"
        message="Enter new folder name:"
        initialValue="Documents"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByRole('heading', { name: 'Rename Folder' })).toBeInTheDocument();
    expect(screen.getByText('Enter new folder name:')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveValue('Documents');
  });

  it('disables submit when value is unchanged, enables on edit, and submits new value', () => {
    const { onConfirm, input, submitBtn } = renderOpen();

    // Unchanged -> disabled
    expect(submitBtn).toBeDisabled();

    // Type a new value
    fireEvent.change(input, { target: { value: 'New Name' } });
    expect(submitBtn).toBeEnabled();

    // Submit form
    fireEvent.click(submitBtn);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledWith('New Name');
  });

  it('keeps submit disabled for whitespace-only input and does not confirm', () => {
    const { onConfirm, input, submitBtn } = renderOpen();

    fireEvent.change(input, { target: { value: '   ' } });

    expect(submitBtn).toBeDisabled();
    fireEvent.click(submitBtn);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('submits the typed value on form submission (Enter in the input)', () => {
    const { onConfirm, input } = renderOpen();

    fireEvent.change(input, { target: { value: 'Via Enter' } });
    // jsdom does not implement implicit submission, so dispatch the submit event a browser fires on Enter
    fireEvent.submit(input.form);

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledWith('Via Enter');
  });

  it('calls onCancel when cancel button is clicked', () => {
    const { onCancel, onConfirm } = renderOpen({ cancelText: 'Abort' });

    fireEvent.click(screen.getByRole('button', { name: 'Abort' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('calls onCancel when the header close button is clicked', () => {
    const { onCancel, onConfirm } = renderOpen();

    fireEvent.click(screen.getByRole('button', { name: /close/i }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
