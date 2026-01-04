
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
    
    // Find button with lucide-trash2 icon
    const deleteBtn = container.querySelector('.lucide-trash2')?.closest('button');
    fireEvent.click(deleteBtn!);

    expect(window.confirm).toHaveBeenCalled();
    expect(repository.deleteSession).toHaveBeenCalledWith('s1');
  });

  it('enters editing mode and updates notes on blur', async () => {
    const sessions = [createMockWorkoutSession({ id: 's1', notes: 'Old Notes' })];
    (repository.getAllSessions as any).mockResolvedValue(sessions);

    const { container } = render(<History />);

    await waitFor(() => expect(screen.getByText(/Old Notes/i)).toBeInTheDocument());
    
    const editBtn = container.querySelector('.lucide-pen')?.closest('button');
    fireEvent.click(editBtn!);

    const textarea = screen.getByPlaceholderText(/Add notes.../i);
    fireEvent.change(textarea, { target: { value: 'New Updated Notes' } });
    fireEvent.blur(textarea);

    expect(repository.updateSession).toHaveBeenCalledWith('s1', { notes: 'New Updated Notes' });
  });
});
