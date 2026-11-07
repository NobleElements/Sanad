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
});
