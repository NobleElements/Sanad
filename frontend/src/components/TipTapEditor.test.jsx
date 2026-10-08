import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import TipTapEditor from './TipTapEditor';

// TipTap attaches its Editor instance to the contenteditable root; edits made through it run the
// same transaction/onUpdate path as typing (jsdom cannot drive ProseMirror's DOM input handling).
const editorFor = (text) => screen.getByText(text).closest('[contenteditable="true"]').editor;

describe('TipTapEditor', () => {
  it('renders the provided content in an editable area without emitting a change', () => {
    const onChange = vi.fn();
    render(<TipTapEditor content="<p>Initial content</p>" onChange={onChange} />);

    const paragraph = screen.getByText('Initial content');
    expect(paragraph.tagName).toBe('P');
    expect(paragraph.closest('[contenteditable="true"]')).not.toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('reports edits to onChange as HTML', () => {
    const onChange = vi.fn();
    render(<TipTapEditor content="<p>Initial content</p>" onChange={onChange} />);
    const editor = editorFor('Initial content');

    act(() => {
      // Insert at the end of the paragraph
      editor.commands.insertContentAt(editor.state.doc.content.size - 1, ' plus more');
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('<p dir="auto">Initial content plus more</p>');
  });

  it('shows new external content without emitting onChange (no feedback loop)', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <TipTapEditor content="<p>First</p>" onChange={onChange} />
    );
    expect(screen.getByText('First')).toBeInTheDocument();

    // Rerender with new external content
    rerender(
      <TipTapEditor content="<p>Second</p>" onChange={onChange} />
    );

    expect(screen.getByText('Second')).toBeInTheDocument();
    expect(screen.queryByText('First')).not.toBeInTheDocument();
    // Changing content prop programmatically should not trigger onChange callback loop
    expect(onChange).not.toHaveBeenCalled();
  });
});
