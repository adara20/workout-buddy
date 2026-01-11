
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import ActiveSession from './ActiveSession';
import { repository } from '../services/repository';
import { createMockPillar, createMockAccessory, createMockWorkoutSession } from '../tests/factories';

vi.mock('../services/repository', () => ({
  repository: {
    getAllAccessories: vi.fn(),
    getAllPillars: vi.fn(),
    getConfig: vi.fn(),
    addSession: vi.fn(),
    updatePillar: vi.fn(),
    runTransaction: vi.fn((type, tables, cb) => cb()),
  },
}));

describe('ActiveSession Component', () => {
  const mockOnComplete = vi.fn();
  const mockOnCancel = vi.fn();

  const mockPillars = [
    createMockPillar({ id: 'p1', name: 'Squat', prWeight: 100, minWorkingWeight: 80 }),
  ];
  const mockAccessories = [
    createMockAccessory({ id: 'a1', name: 'Curls' }),
  ];

  const initialSession = createMockWorkoutSession({
    pillarsPerformed: [{
      pillarId: 'p1',
      name: 'Squat',
      weight: 100,
      counted: true,
      isPR: false,
      warning: false
    }],
    accessoriesPerformed: []
  });

  beforeEach(() => {
    vi.clearAllMocks();
    (repository.getAllPillars as any).mockResolvedValue(mockPillars);
    (repository.getAllAccessories as any).mockResolvedValue(mockAccessories);
    (repository.getConfig as any).mockResolvedValue({ targetExercisesPerSession: 4 });
  });

  it('renders initial session data', async () => {
    render(<ActiveSession initialSession={initialSession} onComplete={mockOnComplete} onCancel={mockOnCancel} />);
    
    await waitFor(() => {
      expect(screen.getByText('Squat')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument();
    });
  });

  it('updates weight when +/- buttons are clicked', async () => {
    render(<ActiveSession initialSession={initialSession} onComplete={mockOnComplete} onCancel={mockOnCancel} />);
    
    await waitFor(() => screen.getByText('Squat'));

    const plusFive = screen.getByText('+5');
    fireEvent.click(plusFive);

    expect(screen.getByText('105')).toBeInTheDocument();
  });

  it('toggles accessories', async () => {
    render(<ActiveSession initialSession={initialSession} onComplete={mockOnComplete} onCancel={mockOnCancel} />);
    
    await waitFor(() => screen.getByText('Curls'));

    const curlsButton = screen.getByText('Curls');
    fireEvent.click(curlsButton);

    // Should show checkmark or active state
    expect(curlsButton).toHaveClass('bg-blue-600');
  });

  it('calls handleFinish and saves to repository', async () => {
    render(<ActiveSession initialSession={initialSession} onComplete={mockOnComplete} onCancel={mockOnCancel} />);
    
    await waitFor(() => screen.getByText('Squat'));

    const finishButton = screen.getAllByText(/FINISH/)[0];
    fireEvent.click(finishButton);

    await waitFor(() => {
      expect(repository.addSession).toHaveBeenCalled();
      expect(mockOnComplete).toHaveBeenCalled();
    });
  });

  it('filters accessories based on pillar preferences', async () => {
    const p1 = createMockPillar({ id: 'p1', name: 'Bench', preferredAccessoryIds: ['a1'] });
    const a1 = createMockAccessory({ id: 'a1', name: 'Dips' });
    const a2 = createMockAccessory({ id: 'a2', name: 'Leg Press' });

    (repository.getAllPillars as any).mockResolvedValue([p1]);
    (repository.getAllAccessories as any).mockResolvedValue([a1, a2]);

    const session = createMockWorkoutSession({
      pillarsPerformed: [{ pillarId: 'p1', name: 'Bench', weight: 100, counted: true, isPR: false, warning: false }],
      accessoriesPerformed: []
    });

    render(<ActiveSession initialSession={session} onComplete={mockOnComplete} onCancel={mockOnCancel} />);

    await waitFor(() => screen.getByText('Dips'));
    
    // a1 (Dips) should be visible, a2 (Leg Press) should NOT be visible
    expect(screen.getByText('Dips')).toBeInTheDocument();
    expect(screen.queryByText('Leg Press')).not.toBeInTheDocument();

    // Toggle Show All
    const showAllBtn = screen.getByText('Show All');
    fireEvent.click(showAllBtn);

    // Now both should be visible
    expect(screen.getByText('Dips')).toBeInTheDocument();
    expect(screen.getByText('Leg Press')).toBeInTheDocument();

    // Toggle back
    fireEvent.click(screen.getByText('Show Recommended'));
    expect(screen.queryByText('Leg Press')).not.toBeInTheDocument();
  });
});
