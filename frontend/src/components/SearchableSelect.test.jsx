import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SearchableSelect from './SearchableSelect';
import { useState } from 'react';

describe('SearchableSelect Component', () => {
  function ControlledSearchableSelect(props) {
    const [value, setValue] = useState(props.initialValue || '');
    return (
      <SearchableSelect
        value={value}
        onChange={(val) => {
          setValue(val);
          props.onChange?.(val);
        }}
        options={props.options || []}
        onCreate={props.onCreate}
      />
    );
  }

  it('displays the selected option name', () => {
    const options = [{ id: 'proj1', name: 'Project 1' }];
    render(<ControlledSearchableSelect initialValue="proj1" options={options} />);
    const input = screen.getByRole('textbox');
    expect(input.value).toBe('Project 1');
  });

  it('allows typing and clicking Create without clearing the input', async () => {
    const options = [{ id: 'proj1', name: 'Project 1' }];
    const handleCreate = vi.fn();
    render(
      <ControlledSearchableSelect
        initialValue="proj1"
        options={options}
        onCreate={handleCreate}
      />
    );
    const input = screen.getByRole('textbox');
    expect(input.value).toBe('Project 1');

    // Type a new project name
    fireEvent.change(input, { target: { value: 'New Proj' } });
    expect(input.value).toBe('New Proj');

    // The create button should be visible
    const createBtn = screen.getByText('+ Create "New Proj"');
    expect(createBtn).toBeInTheDocument();

    fireEvent.click(createBtn);
    expect(handleCreate).toHaveBeenCalledWith('New Proj');
  });
});
