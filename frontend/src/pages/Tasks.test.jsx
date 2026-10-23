import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Tasks from './Tasks';
import useTaskStore from '../store/useTaskStore';

describe('Tasks Page Component', () => {
  const sampleTasks = [
    { id: 't-1', title: 'Task One', status: 'ToDo', project: 'SanadProject', tags: 'frontend,bug' },
    { id: 't-2', title: 'Task Two', status: 'InProgress', project: 'BackendProject', tags: 'api' },
    { id: 't-3', title: 'Task Three', status: 'Done', project: 'SanadProject', tags: 'docs' }
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('renders loading spinner when tasks are not loaded', () => {
    useTaskStore.setState({ tasks: [], isLoaded: false });
    render(
      <MemoryRouter>
        <Tasks />
      </MemoryRouter>
    );

    expect(screen.getByText('Loading tasks...')).toBeInTheDocument();
  });

  it('renders kanban columns and tasks when loaded', () => {
    useTaskStore.setState({ tasks: sampleTasks, isLoaded: true });
    render(
      <MemoryRouter>
        <Tasks />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'To Do', level: 3 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'In Progress', level: 3 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Done', level: 3 })).toBeInTheDocument();

    expect(screen.getByText('Task One')).toBeInTheDocument();
    expect(screen.getByText('Task Two')).toBeInTheDocument();
    expect(screen.getByText('Task Three')).toBeInTheDocument();
  });

  it('filters tasks by search query', () => {
    useTaskStore.setState({ tasks: sampleTasks, isLoaded: true });
    render(
      <MemoryRouter>
        <Tasks />
      </MemoryRouter>
    );

    const searchInput = screen.getByPlaceholderText('Search tasks...');
    fireEvent.change(searchInput, { target: { value: 'Task Two' } });

    expect(screen.getByText('Task Two')).toBeInTheDocument();
    expect(screen.queryByText('Task One')).not.toBeInTheDocument();
    expect(screen.queryByText('Task Three')).not.toBeInTheDocument();
  });

  it('filters tasks by project selector', () => {
    useTaskStore.setState({ tasks: sampleTasks, isLoaded: true });
    render(
      <MemoryRouter>
        <Tasks />
      </MemoryRouter>
    );

    // Project select is rendered because projects exist
    const selects = screen.getAllByRole('combobox');
    const projectSelect = selects.find(s => s.querySelector('option[value="SanadProject"]'));
    expect(projectSelect).toBeDefined();

    fireEvent.change(projectSelect, { target: { value: 'SanadProject' } });

    expect(screen.getByText('Task One')).toBeInTheDocument();
    expect(screen.getByText('Task Three')).toBeInTheDocument();
    expect(screen.queryByText('Task Two')).not.toBeInTheDocument();
  });

  it('hides project tag in cards when a project is selected via project filter in kanban view', () => {
    useTaskStore.setState({ tasks: sampleTasks, isLoaded: true });
    render(
      <MemoryRouter>
        <Tasks />
      </MemoryRouter>
    );

    // With All Projects selected, project tag is visible in the card
    const taskOneCard = screen.getByText('Task One').closest('.kanban-card');
    expect(within(taskOneCard).getByText('SanadProject')).toBeInTheDocument();

    // Select SanadProject
    const selects = screen.getAllByRole('combobox');
    const projectSelect = selects.find(s => s.querySelector('option[value="SanadProject"]'));
    fireEvent.change(projectSelect, { target: { value: 'SanadProject' } });

    // The project tag should now be hidden in the card
    expect(within(taskOneCard).queryByText('SanadProject')).not.toBeInTheDocument();

    // Reset back to All Projects
    fireEvent.change(projectSelect, { target: { value: '' } });
    expect(within(taskOneCard).getByText('SanadProject')).toBeInTheDocument();
  });

  it('hides project tag in cards when a project is selected via project filter in list view', () => {
    localStorage.setItem('sanad_tasks_viewMode', 'list');
    useTaskStore.setState({ tasks: sampleTasks, isLoaded: true });
    render(
      <MemoryRouter>
        <Tasks />
      </MemoryRouter>
    );

    // With All Projects selected, project tag is visible in the card container
    const taskOneTitle = screen.getByText('Task One');
    const cardRow = taskOneTitle.closest('.group');
    expect(within(cardRow).getByText('SanadProject')).toBeInTheDocument();

    // Select SanadProject
    const selects = screen.getAllByRole('combobox');
    const projectSelect = selects.find(s => s.querySelector('option[value="SanadProject"]'));
    fireEvent.change(projectSelect, { target: { value: 'SanadProject' } });

    // The project tag should now be hidden in the list card
    expect(within(cardRow).queryByText('SanadProject')).not.toBeInTheDocument();
  });

  it('toggles Done column visibility when hide/show completed button is clicked', () => {
    useTaskStore.setState({ tasks: sampleTasks, isLoaded: true });
    render(
      <MemoryRouter>
        <Tasks />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'Done', level: 3 })).toBeInTheDocument();

    const hideDoneBtn = screen.getByTitle('Hide Done column');
    fireEvent.click(hideDoneBtn);

    expect(screen.queryByRole('heading', { name: 'Done', level: 3 })).not.toBeInTheDocument();

    const showDoneBtn = screen.getByTitle('Show Done column');
    fireEvent.click(showDoneBtn);

    expect(screen.getByRole('heading', { name: 'Done', level: 3 })).toBeInTheDocument();
  });

  it('triggers openTaskModal when Create Task button is clicked', () => {
    const openTaskModalSpy = vi.fn();
    useTaskStore.setState({
      tasks: sampleTasks,
      isLoaded: true,
      openTaskModal: openTaskModalSpy
    });

    render(
      <MemoryRouter>
        <Tasks />
      </MemoryRouter>
    );

    const createBtn = screen.getByRole('button', { name: /Create Task/i });
    fireEvent.click(createBtn);

    expect(openTaskModalSpy).toHaveBeenCalledWith(expect.objectContaining({
      title: '',
      content: '',
      status: 'ToDo',
      isNew: true
    }));
  });

  it('triggers quick complete status update when task checkbox icon is clicked', () => {
    const updateStatusSpy = vi.fn();
    useTaskStore.setState({
      tasks: sampleTasks,
      isLoaded: true,
      updateTaskStatus: updateStatusSpy
    });

    render(
      <MemoryRouter>
        <Tasks />
      </MemoryRouter>
    );

    // Find the complete toggle button on Task One (which is ToDo, status: 0)
    const completeBtns = screen.getAllByRole('button', { name: 'Mark as done' });
    expect(completeBtns.length).toBeGreaterThan(0);

    fireEvent.click(completeBtns[0]);

    expect(updateStatusSpy).toHaveBeenCalledWith('t-1', { status: 2 });
  });
});
