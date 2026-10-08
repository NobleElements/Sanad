import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Habits from './Habits';
import useHabitStore from '../store/useHabitStore';
import useConfirmStore from '../store/useConfirmStore';
import { format } from 'date-fns';

describe('Habits Page Component', () => {
  const sampleHabit = {
    id: 'h-1',
    name: 'Morning Jog',
    icon: '🏃',
    frequency: 'Daily',
    logs: [
      { id: 'l-1', habitId: 'h-1', date: format(new Date(), 'yyyy-MM-dd'), completed: true }
    ]
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders loading state initially when not loaded', () => {
    useHabitStore.setState({ habits: [], isLoaded: false });
    render(
      <MemoryRouter>
        <Habits />
      </MemoryRouter>
    );

    expect(screen.getByText('Loading habits...')).toBeInTheDocument();
  });

  it('renders empty state when no habits exist', () => {
    useHabitStore.setState({ habits: [], isLoaded: true });
    render(
      <MemoryRouter>
        <Habits />
      </MemoryRouter>
    );

    expect(screen.getByText('No habits yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add Habit/i })).toBeInTheDocument();
  });

  it('renders habit items and handles expand toggle', () => {
    useHabitStore.setState({ habits: [sampleHabit], isLoaded: true });
    render(
      <MemoryRouter>
        <Habits />
      </MemoryRouter>
    );

    expect(screen.getByText('Morning Jog')).toBeInTheDocument();
    expect(screen.getByText('🏃')).toBeInTheDocument();
    expect(screen.getByText('Daily')).toBeInTheDocument();

    // Heat map section is initially hidden
    expect(screen.queryByText('Last 3 Months Activity')).not.toBeInTheDocument();

    // Click expand chevron
    const chevronBtn = screen.getAllByRole('button').find(b => b.querySelector('svg.lucide-chevron-down'));
    expect(chevronBtn).toBeDefined();

    fireEvent.click(chevronBtn);
    expect(screen.getByText('Last 3 Months Activity')).toBeInTheDocument();

    // Click collapse (re-query buttons after DOM update)
    const collapseBtn = screen.getAllByRole('button').find(b => b.querySelector('svg.lucide-chevron-up'));
    fireEvent.click(collapseBtn);
    expect(screen.queryByText('Last 3 Months Activity')).not.toBeInTheDocument();
  });

  it('triggers toggleHabitLog when streak day button is clicked', () => {
    const toggleSpy = vi.fn();
    useHabitStore.setState({
      habits: [sampleHabit],
      isLoaded: true,
      toggleHabitLog: toggleSpy
    });

    render(
      <MemoryRouter>
        <Habits />
      </MemoryRouter>
    );

    // Find the today button (check icon since it's completed)
    const today = format(new Date(), 'yyyy-MM-dd');
    const buttons = screen.getAllByRole('button');
    const checkBtn = buttons.find(b => b.querySelector('svg.lucide-check'));
    expect(checkBtn).toBeDefined();

    fireEvent.click(checkBtn);
    expect(toggleSpy).toHaveBeenCalledWith('h-1', today);
  });

  it('opens add modal and submits a new habit', async () => {
    const createSpy = vi.fn().mockResolvedValue(true);
    useHabitStore.setState({
      habits: [sampleHabit],
      isLoaded: true,
      createHabit: createSpy
    });

    render(
      <MemoryRouter>
        <Habits />
      </MemoryRouter>
    );

    // Open modal
    const addBtn = screen.getByRole('button', { name: /Add Habit/i });
    fireEvent.click(addBtn);

    expect(screen.getByRole('heading', { name: 'Create New Habit' })).toBeInTheDocument();

    // Fill in habit name
    const nameInput = screen.getByPlaceholderText(/e.g., Read for 30 minutes/i);
    fireEvent.change(nameInput, { target: { value: 'Meditation' } });

    // Submit
    const submitBtn = screen.getByRole('button', { name: 'Create Habit' });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    expect(createSpy).toHaveBeenCalledWith({
      name: 'Meditation',
      icon: '🌟',
      frequency: 'Daily'
    });
  });

  it('triggers delete confirmation modal when delete button is clicked', () => {
    const deleteSpy = vi.fn();
    useHabitStore.setState({
      habits: [sampleHabit],
      isLoaded: true,
      deleteHabit: deleteSpy
    });

    render(
      <MemoryRouter>
        <Habits />
      </MemoryRouter>
    );

    const deleteBtn = screen.getByTitle('Delete Habit');
    fireEvent.click(deleteBtn);

    // Confirm store should have opened
    const confirmState = useConfirmStore.getState();
    expect(confirmState.isOpen).toBe(true);
    expect(confirmState.title).toBe('Delete Habit');

    // Confirming deletion calls deleteHabit
    act(() => {
      confirmState.onConfirm();
    });
    expect(deleteSpy).toHaveBeenCalledWith('h-1');
  });
});
