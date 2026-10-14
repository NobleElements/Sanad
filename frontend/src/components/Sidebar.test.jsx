import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import useUIStore from '../store/useUIStore';

describe('Sidebar state persistence and navigation', () => {
  beforeEach(() => {
    useUIStore.setState({ isSidebarCollapsed: false });
    window.innerWidth = 1200;
  });

  const TestApp = ({ initialEntry = '/notebook' }) => {
    const NavButtons = () => {
      const navigate = useNavigate();
      return (
        <div>
          <button onClick={() => navigate('/notebook/n-1')}>Go to Note 1</button>
          <button onClick={() => navigate('/notebook/n-2')}>Go to Note 2</button>
          <button onClick={() => navigate('/notebook')}>Go to Notebook Root</button>
        </div>
      );
    };

    return (
      <MemoryRouter initialEntries={[initialEntry]}>
        <Sidebar isMobileMenuOpen={false} setIsMobileMenuOpen={vi.fn()} />
        <NavButtons />
        <Routes>
          <Route path="/notebook" element={<div>Notebook page</div>} />
          <Route path="/notebook/:noteId" element={<div>Note detail page</div>} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('renders expanded by default on desktop', () => {
    const { container } = render(<TestApp />);
    const sidebarDiv = container.querySelector('.bg-slate-900.text-slate-100');
    expect(sidebarDiv.className).toContain('w-64');
    expect(sidebarDiv.className).not.toContain('md:w-20');
  });

  it('collapses sidebar when toggle button is clicked', () => {
    const { container } = render(<TestApp />);
    const sidebarDiv = container.querySelector('.bg-slate-900.text-slate-100');
    const toggleBtn = screen.getByRole('button', { name: '' });

    fireEvent.click(toggleBtn);

    expect(sidebarDiv.className).toContain('md:w-20');
    expect(useUIStore.getState().isSidebarCollapsed).toBe(true);
  });

  it('remembers closed sidebar state across notebook navigation', () => {
    useUIStore.setState({ isSidebarCollapsed: true });
    const { container } = render(<TestApp initialEntry="/notebook" />);
    const sidebarDiv = container.querySelector('.bg-slate-900.text-slate-100');

    // Initially closed because of global store state
    expect(sidebarDiv.className).toContain('md:w-20');

    // Navigate to note 1
    fireEvent.click(screen.getByText('Go to Note 1'));
    expect(screen.getByText('Note detail page')).toBeInTheDocument();
    expect(sidebarDiv.className).toContain('md:w-20');

    // Navigate to note 2
    fireEvent.click(screen.getByText('Go to Note 2'));
    expect(sidebarDiv.className).toContain('md:w-20');

    // Navigate back to notebook root
    fireEvent.click(screen.getByText('Go to Notebook Root'));
    expect(sidebarDiv.className).toContain('md:w-20');
  });

  it('re-expands when toggle button is clicked again', () => {
    useUIStore.setState({ isSidebarCollapsed: true });
    const { container } = render(<TestApp />);
    const sidebarDiv = container.querySelector('.bg-slate-900.text-slate-100');
    const toggleBtn = screen.getByRole('button', { name: '' });

    expect(sidebarDiv.className).toContain('md:w-20');

    fireEvent.click(toggleBtn);

    expect(sidebarDiv.className).not.toContain('md:w-20');
    expect(sidebarDiv.className).toContain('w-64');
    expect(useUIStore.getState().isSidebarCollapsed).toBe(false);

    // Navigate to note 1 and ensure it remains open
    fireEvent.click(screen.getByText('Go to Note 1'));
    expect(sidebarDiv.className).not.toContain('md:w-20');
  });
});
