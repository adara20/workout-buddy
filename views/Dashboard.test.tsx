
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Dashboard from './Dashboard';
import { repository } from '../services/repository';
import { createMockPillar } from '../tests/factories';

vi.mock('../services/repository', () => ({
  repository: {
    getActivePillars: vi.fn(),
  },
}));

vi.mock('./PillarDetailOverlay', () => ({
  default: ({ pillar, onClose, onStartWorkout }: any) => (
    <div data-testid="mock-overlay">
      <span>Overlay: {pillar.name}</span>
      <button onClick={onClose}>Close</button>
      <button onClick={() => onStartWorkout(pillar)}>Start</button>
    </div>
  )
}));

describe('Dashboard Component', () => {
  const mockOnStart = vi.fn();
  const mockOnStartSpecific = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly with pillars', async () => {
    const mockPillars = [
      createMockPillar({ name: 'Squat', muscleGroup: 'Legs', lastCountedAt: Date.now() }),
      createMockPillar({ name: 'Bench', muscleGroup: 'Push', lastCountedAt: null }),
    ];
    (repository.getActivePillars as any).mockResolvedValue(mockPillars);

    render(<Dashboard onStart={mockOnStart} currentView="dashboard" />);

    expect(screen.getByText('Workout Buddy')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('Squat')).toBeInTheDocument();
      expect(screen.getByText('Bench')).toBeInTheDocument();
    });

    expect(screen.getByText('Legs')).toBeInTheDocument();
    expect(screen.getByText('Push')).toBeInTheDocument();
    expect(screen.getByText('Never')).toBeInTheDocument(); // For Bench (null lastCountedAt)
  });

  it('opens overlay when a pillar is clicked', async () => {
    const mockPillars = [createMockPillar({ name: 'Squat' })];
    (repository.getActivePillars as any).mockResolvedValue(mockPillars);

    render(<Dashboard onStart={mockOnStart} currentView="dashboard" />);

    await waitFor(() => expect(screen.getByText('Squat')).toBeInTheDocument());
    
    fireEvent.click(screen.getByText('Squat').closest('button')!);

    expect(screen.getByTestId('mock-overlay')).toBeInTheDocument();
    expect(screen.getByText('Overlay: Squat')).toBeInTheDocument();
  });

  it('calls onStartSpecificWorkout when start is clicked in overlay', async () => {
    const mockPillars = [createMockPillar({ name: 'Squat' })];
    (repository.getActivePillars as any).mockResolvedValue(mockPillars);

    render(<Dashboard 
      onStart={mockOnStart} 
      onStartSpecificWorkout={mockOnStartSpecific} 
      currentView="dashboard" 
    />);

    await waitFor(() => expect(screen.getByText('Squat')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Squat').closest('button')!);

    fireEvent.click(screen.getByText('Start'));

    expect(mockOnStartSpecific).toHaveBeenCalledWith(mockPillars[0]);
    expect(screen.queryByTestId('mock-overlay')).not.toBeInTheDocument();
  });

  it('calls onStart when START WORKOUT button is clicked', async () => {
    (repository.getActivePillars as any).mockResolvedValue([]);
    render(<Dashboard onStart={mockOnStart} currentView="dashboard" />);

    // Wait for initial load to avoid act warnings on mount
    await waitFor(() => {
      expect(repository.getActivePillars).toHaveBeenCalled();
    });

    const startButton = screen.getByText('START WORKOUT');
    fireEvent.click(startButton);

    expect(mockOnStart).toHaveBeenCalledTimes(1);
  });

  it('sorts pillars by overdue score', async () => {
    const now = Date.now();
    const mockPillars = [
      createMockPillar({ 
        id: '1', 
        name: 'Fresh Pillar', 
        cadenceDays: 7, 
        lastCountedAt: now // Score 0
      }),
      createMockPillar({ 
        id: '2', 
        name: 'Overdue Pillar', 
        cadenceDays: 7, 
        lastCountedAt: now - (14 * 24 * 60 * 60 * 1000) // Score 2
      }),
    ];
    (repository.getActivePillars as any).mockResolvedValue(mockPillars);

    render(<Dashboard onStart={mockOnStart} currentView="dashboard" />);

    await waitFor(() => {
      const pillars = screen.getAllByRole('heading', { level: 4 });
      expect(pillars[0]).toHaveTextContent('Overdue Pillar');
      expect(pillars[1]).toHaveTextContent('Fresh Pillar');
    });
  });
});
