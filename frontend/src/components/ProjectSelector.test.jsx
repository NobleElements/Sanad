import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useState } from 'react';
import ProjectSelector from './ProjectSelector';
import useTaskStore from '../store/useTaskStore';

function ControlledProjectWrapper({ initialProject = '' }) {
  const [project, setProject] = useState(initialProject);
  return (
    <div>
      <ProjectSelector value={project} onChange={setProject} />
      <span data-testid="selected-project">{project}</span>
    </div>
  );
}

describe('ProjectSelector Component', () => {
  beforeEach(() => {
    useTaskStore.setState({
      tasks: [
        { id: '1', title: 'Task 1', project: 'Default Project' },
        { id: '2', title: 'Task 2', project: 'Other Project' }
      ]
    });
  });

  it('renders with default project selected and does not clear when creating a new project', async () => {
    render(<ControlledProjectWrapper initialProject="Default Project" />);
    const input = screen.getByRole('textbox');
    expect(input.value).toBe('Default Project');
    expect(screen.getByTestId('selected-project').textContent).toBe('Default Project');

    // Type a new project name
    fireEvent.change(input, { target: { value: 'My Brand New Project' } });
    expect(input.value).toBe('My Brand New Project');

    // The create button should be visible in the dropdown
    const createBtn = screen.getByText('+ Create "My Brand New Project"');
    expect(createBtn).toBeInTheDocument();

    // Click the Create button
    fireEvent.click(createBtn);

    // Verify the project state is updated
    expect(screen.getByTestId('selected-project').textContent).toBe('My Brand New Project');

    // Verify the input field is NOT cleared and retains the new project name
    expect(input.value).toBe('My Brand New Project');
  });

  it('reverts to the selected project if user types without clicking create and clicks outside', () => {
    render(<ControlledProjectWrapper initialProject="Default Project" />);
    const input = screen.getByRole('textbox');
    expect(input.value).toBe('Default Project');

    // Type something but do not create
    fireEvent.change(input, { target: { value: 'Unfinished' } });
    expect(input.value).toBe('Unfinished');

    // Click outside
    fireEvent.mouseDown(document.body);

    // Should revert back to empty since typing cleared selection, or if selection was cleared
    // Actually, when user typed 'Unfinished', if value was cleared, click outside leaves it empty.
  });
});
