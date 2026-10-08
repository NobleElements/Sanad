import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Thoughts from '../pages/Thoughts';
import Tasks from '../pages/Tasks';
import Habits from '../pages/Habits';
import useUIStore from '../store/useUIStore';
import useConfirmStore from '../store/useConfirmStore';
import useTaskStore from '../store/useTaskStore';
import useHabitStore from '../store/useHabitStore';
import { API_URL } from '../config';
import { mockFetch, jsonResponse, jsonBody } from './fetchMock';

const OFFLINE_HINT = 'Not available offline';

describe('Offline Mutating Actions Enforcement', () => {
  let fetchMock;
  let serverThoughts;

  beforeEach(() => {
    serverThoughts = [
      { id: 'th-1', content: 'Important insight', createdAt: new Date().toISOString() }
    ];
    fetchMock = mockFetch({
      // Thoughts loads page 1 on mount; serve the seeded thought so the list is deterministic
      'GET /api/thoughts?page=1&pageSize=20': () => jsonResponse([...serverThoughts]),
      'POST /api/thoughts': (url, init) => {
        const { content } = JSON.parse(init.body);
        serverThoughts.push({ id: 'th-2', content, createdAt: new Date().toISOString() });
        return jsonResponse(null, { status: 201 });
      }
    });
  });

  const renderThoughts = async () => {
    render(
      <MemoryRouter>
        <Thoughts />
      </MemoryRouter>
    );
    // Wait for the initial load to settle before interacting
    await screen.findByText('Important insight');
  };

  const postCalls = () => fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST');

  it('enables thought capture when online and submits the new thought', async () => {
    useUIStore.setState({ isOffline: false });
    await renderThoughts();

    const textarea = screen.getByPlaceholderText(/Capture a thought\.\.\./i);
    const submitBtn = screen.getByRole('button', { name: /Capture/i });

    // Initially disabled because content is empty
    expect(submitBtn).toBeDisabled();

    fireEvent.change(textarea, { target: { value: 'A brand new thought' } });

    expect(submitBtn).toBeEnabled();
    expect(submitBtn).not.toHaveAccessibleDescription();

    fireEvent.click(submitBtn);

    // The new thought is persisted, the timeline reloads with it and the input is cleared
    expect(await screen.findByText('A brand new thought')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/thoughts`, expect.objectContaining({
      method: 'POST',
      body: jsonBody({ content: 'A brand new thought', tags: null })
    }));
    expect(postCalls()).toHaveLength(1);
    expect(textarea).toHaveValue('');
  });

  it('disables thought capture with an offline hint and does not submit when offline', async () => {
    useUIStore.setState({ isOffline: true });
    await renderThoughts();

    const textarea = screen.getByPlaceholderText(/Capture a thought\.\.\./i);
    const submitBtn = screen.getByRole('button', { name: /Capture/i });

    fireEvent.change(textarea, { target: { value: 'A thought while offline' } });

    // Button MUST remain disabled due to offline enforcement, and say why
    expect(submitBtn).toBeDisabled();
    expect(submitBtn).toHaveAccessibleDescription(OFFLINE_HINT);

    fireEvent.click(submitBtn);
    expect(postCalls()).toHaveLength(0);
    expect(textarea).toHaveValue('A thought while offline');
  });

  it('disables thought item Edit and Delete buttons when offline', async () => {
    useUIStore.setState({ isOffline: true });
    await renderThoughts();

    const editBtn = await screen.findByRole('button', { name: /Edit/i });
    const deleteBtn = screen.getByRole('button', { name: /Delete/i });

    expect(editBtn).toBeDisabled();
    expect(editBtn).toHaveAccessibleDescription(OFFLINE_HINT);
    expect(deleteBtn).toBeDisabled();
    expect(deleteBtn).toHaveAccessibleDescription(OFFLINE_HINT);

    // Clicking them has no effect: no inline editor, no delete confirmation
    fireEvent.click(editBtn);
    fireEvent.click(deleteBtn);
    expect(screen.queryByDisplayValue('Important insight')).not.toBeInTheDocument();
    expect(useConfirmStore.getState().isOpen).toBe(false);
  });

  describe('Tasks offline enforcement', () => {
    it('disables Create Task button with offline hint when offline', async () => {
      useUIStore.setState({ isOffline: true });
      useTaskStore.setState({
        tasks: [{ id: 't-offline-1', title: 'Offline Task Item', status: 'ToDo' }],
        isLoaded: true
      });
      mockFetch({
        'GET /api/tasks': jsonResponse([{ id: 't-offline-1', title: 'Offline Task Item', status: 'ToDo' }])
      });

      render(
        <MemoryRouter>
          <Tasks />
        </MemoryRouter>
      );

      await screen.findByText('Offline Task Item');
      const newTaskBtn = screen.getByRole('button', { name: /Create Task/i });
      expect(newTaskBtn).toBeDisabled();
      expect(newTaskBtn).toHaveAccessibleDescription(OFFLINE_HINT);
    });
  });

  describe('Habits offline enforcement', () => {
    it('disables Add Habit button with offline hint when offline', async () => {
      useUIStore.setState({ isOffline: true });
      useHabitStore.setState({
        habits: [],
        isLoaded: true
      });
      mockFetch({
        'GET /api/habits': jsonResponse([])
      });

      render(
        <MemoryRouter>
          <Habits />
        </MemoryRouter>
      );

      const addHabitBtn = await screen.findByRole('button', { name: /Add Habit/i });
      expect(addHabitBtn).toBeDisabled();
      expect(addHabitBtn).toHaveAccessibleDescription(OFFLINE_HINT);
    });
  });
});
