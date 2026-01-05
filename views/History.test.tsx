
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import History from './History';
import { repository } from '../services/repository';
import { createMockWorkoutSession, createMockPillarEntry } from '../tests/factories';

vi.mock('../services/repository', () => ({
  repository: {
    getAllSessions: vi.fn(),
    deleteSession: vi.fn(),
    updateSession: vi.fn(),
  },
}));

describe('History Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty state when no sessions', async () => {
    (repository.getAllSessions as any).mockResolvedValue([]);
    render(<History />);

    await waitFor(() => {
      expect(screen.getByText(/No workouts logged yet/)).toBeInTheDocument();
    });
  });

  it('renders list of sessions', async () => {
    const sessions = [
      createMockWorkoutSession({ 
        id: 's1', 
        date: new Date('2023-01-01').getTime(),
        pillarsPerformed: [createMockPillarEntry({ name: 'Squat', weight: 100 })]
      }),
    ];
    (repository.getAllSessions as any).mockResolvedValue(sessions);

    render(<History />);

    await waitFor(() => {
      expect(screen.getByText('Squat')).toBeInTheDocument();
      expect(screen.getByText('100lb')).toBeInTheDocument();
    });
  });

  it('calls deleteSession when delete button is clicked and confirmed', async () => {
    const sessions = [createMockWorkoutSession({ id: 's1' })];
    (repository.getAllSessions as any).mockResolvedValue(sessions);
    window.confirm = vi.fn().mockReturnValue(true);

    const { container } = render(<History />);

    await waitFor(() => expect(screen.getByText('Test Pillar Entry')).toBeInTheDocument());
    
    const deleteBtn = container.querySelector('.lucide-trash2')?.closest('button');
    await userEvent.click(deleteBtn!);

    expect(window.confirm).toHaveBeenCalled();
    expect(repository.deleteSession).toHaveBeenCalledWith('s1');
  });

  it('enters editing mode and updates notes on blur', async () => {
    const sessions = [createMockWorkoutSession({ id: 's1', notes: 'Old Notes' })];
    (repository.getAllSessions as any).mockResolvedValue(sessions);

    const { container } = render(<History />);

    await waitFor(() => expect(screen.getByText(/Old Notes/i)).toBeInTheDocument());
    
    // Lucide Edit2 often renders as lucide-pen
    const editBtn = container.querySelector('.lucide-pen, .lucide-edit2')?.closest('button');
    await userEvent.click(editBtn!);

    const textarea = screen.getByPlaceholderText(/Add notes.../i);
    await userEvent.clear(textarea);
    await userEvent.type(textarea, 'New Updated Notes');
    fireEvent.blur(textarea);

    expect(repository.updateSession).toHaveBeenCalledWith('s1', { notes: 'New Updated Notes' });
  });

  it('updates session date on blur', async () => {
    // Use a specific time to avoid timezone issues in tests
    const date = new Date(2023, 0, 1).getTime(); // Jan 1, 2023 Local
    const sessions = [createMockWorkoutSession({ id: 's1', date })];
    (repository.getAllSessions as any).mockResolvedValue(sessions);

    const { container } = render(<History />);
    await waitFor(() => expect(screen.getByText(/Jan 1, 2023/i)).toBeInTheDocument());

    const editBtn = container.querySelector('.lucide-pen, .lucide-edit2')?.closest('button');
    await userEvent.click(editBtn!);

    const dateInput = container.querySelector('input[type="date"]');
    fireEvent.change(dateInput!, { target: { value: '2023-01-02' } });
    fireEvent.blur(dateInput!);

    expect(repository.updateSession).toHaveBeenCalledWith('s1', expect.objectContaining({
      date: new Date('2023-01-02').getTime()
    }));
  });

  it('updates pillar weight on blur', async () => {
    const sessions = [
      createMockWorkoutSession({ 
        id: 's1', 
        pillarsPerformed: [createMockPillarEntry({ pillarId: 'p1', name: 'Squat', weight: 100 })]
      }),
    ];
    (repository.getAllSessions as any).mockResolvedValue(sessions);

    const { container } = render(<History />);
    await waitFor(() => expect(screen.getByText('Squat')).toBeInTheDocument());

    const editBtn = container.querySelector('.lucide-pen, .lucide-edit2')?.closest('button');
    await userEvent.click(editBtn!);

    // Find the input by value
    const weightInput = screen.getByDisplayValue('100');
    await userEvent.clear(weightInput);
    await userEvent.type(weightInput, '110');
    fireEvent.blur(weightInput);

    expect(repository.updateSession).toHaveBeenCalledWith('s1', expect.objectContaining({
      pillarsPerformed: expect.arrayContaining([
        expect.objectContaining({ pillarId: 'p1', weight: 110 })
      ])
    }));
  });
});
