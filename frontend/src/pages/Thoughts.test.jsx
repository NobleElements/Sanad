import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Thoughts from './Thoughts';
import useThoughtsStore from '../store/useThoughtsStore';
import useConfirmStore from '../store/useConfirmStore';
import useUIStore from '../store/useUIStore';

describe('Thoughts Page Component', () => {
  const sampleThought1 = {
    id: 'thought-1',
    content: 'First thought of the day',
    createdAt: new Date().toISOString()
  };

  const sampleThought2 = {
    id: 'thought-2',
    content: 'Second thought of the day',
    createdAt: new Date(Date.now() - 3600000).toISOString()
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    useUIStore.setState({ isOffline: false });
    useThoughtsStore.setState({
      thoughts: [],
      collections: [],
      activeCollectionId: null,
      viewMode: 'timeline',
      hasMore: false,
      isLoaded: true
    });
  });

  it('renders loading state when not loaded', () => {
    useThoughtsStore.setState({ thoughts: [], isLoaded: false });
    render(
      <MemoryRouter>
        <Thoughts />
      </MemoryRouter>
    );

    expect(screen.getByText('Loading thoughts...')).toBeInTheDocument();
  });

  it('renders empty state when no thoughts exist', () => {
    useThoughtsStore.setState({ thoughts: [], isLoaded: true });
    render(
      <MemoryRouter>
        <Thoughts />
      </MemoryRouter>
    );

    expect(screen.getByText('No thoughts captured yet.')).toBeInTheDocument();
  });

  it('renders thought card with group class and group-hover buttons for single thought', () => {
    useThoughtsStore.setState({ thoughts: [sampleThought1], isLoaded: true });
    render(
      <MemoryRouter>
        <Thoughts />
      </MemoryRouter>
    );

    const card = document.getElementById(`thought-${sampleThought1.id}`);
    expect(card).toBeInTheDocument();
    // Card must have group class so buttons reveal on hover
    expect(card.className).toContain('group');

    const editBtn = screen.getByRole('button', { name: /Edit/i });
    const deleteBtn = screen.getByRole('button', { name: /Delete/i });

    expect(editBtn.className).toContain('opacity-0');
    expect(editBtn.className).toContain('group-hover:opacity-100');
    expect(deleteBtn.className).toContain('opacity-0');
    expect(deleteBtn.className).toContain('group-hover:opacity-100');
  });

  it('renders all thought cards with group class when day is expanded with multiple thoughts', () => {
    useThoughtsStore.setState({ thoughts: [sampleThought1, sampleThought2], isLoaded: true });
    render(
      <MemoryRouter>
        <Thoughts />
      </MemoryRouter>
    );

    // Expand the day by clicking the header pill
    const expandBtn = screen.getByTitle('Click to see all thoughts');
    fireEvent.click(expandBtn);

    const card1 = document.getElementById(`thought-${sampleThought1.id}`);
    const card2 = document.getElementById(`thought-${sampleThought2.id}`);

    expect(card1).toBeInTheDocument();
    expect(card2).toBeInTheDocument();
    expect(card1.className).toContain('group');
    expect(card2.className).toContain('group');

    const editBtns = screen.getAllByRole('button', { name: /Edit/i });
    const deleteBtns = screen.getAllByRole('button', { name: /Delete/i });

    expect(editBtns).toHaveLength(2);
    expect(deleteBtns).toHaveLength(2);
    editBtns.forEach((btn) => {
      expect(btn.className).toContain('opacity-0');
      expect(btn.className).toContain('group-hover:opacity-100');
    });
    deleteBtns.forEach((btn) => {
      expect(btn.className).toContain('opacity-0');
      expect(btn.className).toContain('group-hover:opacity-100');
    });
  });

  it('allows entering edit mode when clicking edit', () => {
    useThoughtsStore.setState({ thoughts: [sampleThought1], isLoaded: true });
    render(
      <MemoryRouter>
        <Thoughts />
      </MemoryRouter>
    );

    const editBtn = screen.getByRole('button', { name: /Edit/i });
    fireEvent.click(editBtn);

    expect(screen.getByDisplayValue('First thought of the day')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
  });

  it('renders Google Keep grid view with pinned thoughts section', () => {
    const pinnedThought = {
      id: 'thought-pinned',
      content: 'Pinned crucial note',
      isPinned: true,
      color: 'sand',
      createdAt: new Date().toISOString()
    };
    useThoughtsStore.setState({
      thoughts: [pinnedThought, sampleThought1],
      viewMode: 'grid',
      isLoaded: true
    });

    render(
      <MemoryRouter>
        <Thoughts />
      </MemoryRouter>
    );

    expect(screen.getByText(/Pinned \(1\)/i)).toBeInTheDocument();
    expect(screen.getByText('Pinned crucial note')).toBeInTheDocument();
    expect(screen.getByText('First thought of the day')).toBeInTheDocument();
  });

  it('renders compact view with skim rows', () => {
    useThoughtsStore.setState({
      thoughts: [sampleThought1, sampleThought2],
      viewMode: 'compact',
      isLoaded: true
    });

    render(
      <MemoryRouter>
        <Thoughts />
      </MemoryRouter>
    );

    expect(screen.getByText('First thought of the day')).toBeInTheDocument();
    expect(screen.getByText('Second thought of the day')).toBeInTheDocument();
  });

  it('renders collection tabs and allows switching view mode', () => {
    const mockCollection = { id: 'col-1', name: 'Work', color: '#3B82F6', thoughtCount: 2 };
    useThoughtsStore.setState({
      collections: [mockCollection],
      thoughts: [sampleThought1],
      viewMode: 'grid',
      isLoaded: true
    });

    render(
      <MemoryRouter>
        <Thoughts />
      </MemoryRouter>
    );

    expect(screen.getByText('All Thoughts')).toBeInTheDocument();
    expect(screen.getAllByText('Uncategorized').length).toBeGreaterThan(0);
    expect(screen.getByText('Work')).toBeInTheDocument();

    const timelineToggle = screen.getByTitle('Timeline View');
    fireEvent.click(timelineToggle);
    expect(useThoughtsStore.getState().viewMode).toBe('timeline');
  });

  it('bounds long thought card height and displays See more button in grid view', () => {
    const longThought = {
      id: 'thought-long',
      content: 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5\nLine 6\nLine 7\nLine 8\nLine 9\nLine 10',
      createdAt: new Date().toISOString()
    };

    // Mock scrollHeight to simulate overflow
    vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(450);

    useThoughtsStore.setState({
      thoughts: [longThought],
      viewMode: 'grid',
      isLoaded: true
    });

    render(
      <MemoryRouter>
        <Thoughts />
      </MemoryRouter>
    );

    const seeMoreBtn = screen.getByRole('button', { name: /See more/i });
    expect(seeMoreBtn).toBeInTheDocument();

    // Toggle expand
    fireEvent.click(seeMoreBtn);
    expect(screen.getByRole('button', { name: /See less/i })).toBeInTheDocument();

    // Toggle collapse
    fireEvent.click(screen.getByRole('button', { name: /See less/i }));
    expect(screen.getByRole('button', { name: /See more/i })).toBeInTheDocument();
  });
});
