
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Dashboard from './Dashboard';
import { repository } from '../services/repository';
import { createMockPillar } from '../tests/factories';
import { calculateWeeksMetYTD } from '../services/stats';

vi.mock('../services/repository', () => ({
  repository: {
    getActivePillars: vi.fn(),
    getAllSessions: vi.fn(),
  },
}));

vi.mock('../services/stats', () => ({
  calculateWeeksMetYTD: vi.fn(),
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
    (repository.getAllSessions as any).mockResolvedValue([]);
    (calculateWeeksMetYTD as any).mockReturnValue(0);
  });

  it('renders correctly with pillars and consistency stat', async () => {
    const mockPillars = [
      createMockPillar({ name: 'Squat', muscleGroup: 'Legs', lastCountedAt: Date.now() }),
      createMockPillar({ name: 'Bench', muscleGroup: 'Push', lastCountedAt: null }),
    ];
    (repository.getActivePillars as any).mockResolvedValue(mockPillars);
    (calculateWeeksMetYTD as any).mockReturnValue(12);

    render(<Dashboard onStart={mockOnStart} currentView="dashboard" />);

    expect(screen.getByText('Ready for a session?')).toBeInTheDocument();
    expect(screen.getByText('Yearly Consistency')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('Weeks Met')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('Squat')).toBeInTheDocument();
      expect(screen.getByText('Bench')).toBeInTheDocument();
    });
  });

  it('renders Yearly Consistency at the bottom of the content', async () => {
    const mockPillars = [createMockPillar({ name: 'Squat' })];
    (repository.getActivePillars as any).mockResolvedValue(mockPillars);
    
    const { container } = render(<Dashboard onStart={mockOnStart} currentView="dashboard" />);
    
    await waitFor(() => expect(screen.getByText('Squat')).toBeInTheDocument());

    const sections = container.querySelectorAll('section');
    
    // Structure:
    // 1. section (Pillar Status)
    // 2. section (Yearly Consistency)
    
    expect(sections).toHaveLength(2);
    expect(sections[0]).toHaveTextContent('Pillar Status');
    expect(sections[1]).toHaveTextContent('Yearly Consistency');
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

  it('closes overlay when onClose is called', async () => {
    const mockPillars = [createMockPillar({ name: 'Squat' })];
    (repository.getActivePillars as any).mockResolvedValue(mockPillars);

    render(<Dashboard onStart={mockOnStart} currentView="dashboard" />);

    await waitFor(() => expect(screen.getByText('Squat')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Squat').closest('button')!);
    expect(screen.getByTestId('mock-overlay')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Close'));
    expect(screen.queryByTestId('mock-overlay')).not.toBeInTheDocument();
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

  describe('Progressive Overload Nudge', () => {
    it('shows the progression nudge when pillar meets overload threshold', async () => {
      const mockPillars = [
        createMockPillar({ 
          name: 'Heavy Squat', 
          enableOverloadTracking: true, 
          totalWorkouts: 5, 
          overloadThreshold: 5 
        })
      ];
      (repository.getActivePillars as any).mockResolvedValue(mockPillars);

      render(<Dashboard onStart={mockOnStart} currentView="dashboard" />);

      await waitFor(() => {
        expect(screen.getByText('Heavy Squat')).toBeInTheDocument();
      });

      // ArrowUpCircle is from lucide-react, we check for its presence via data-testid if it had one, 
      // but here we check for the svg or its container if we can't easily find by role.
      // Lucide icons usually render as SVGs with specific classes.
      const icon = document.querySelector('.text-amber-500');
      expect(icon).toBeInTheDocument();
    });

    it('does not show the nudge when threshold is not met', async () => {
      const mockPillars = [
        createMockPillar({ 
          name: 'Light Squat', 
          enableOverloadTracking: true, 
          totalWorkouts: 4, 
          overloadThreshold: 5 
        })
      ];
      (repository.getActivePillars as any).mockResolvedValue(mockPillars);

      render(<Dashboard onStart={mockOnStart} currentView="dashboard" />);

      await waitFor(() => {
        expect(screen.getByText('Light Squat')).toBeInTheDocument();
      });

      const icon = document.querySelector('.text-amber-500');
      expect(icon).not.toBeInTheDocument();
    });

    it('does not show the nudge when tracking is disabled even if count is high', async () => {
      const mockPillars = [
        createMockPillar({ 
          name: 'Untracked Squat', 
          enableOverloadTracking: false, 
          totalWorkouts: 10, 
          overloadThreshold: 5 
        })
      ];
      (repository.getActivePillars as any).mockResolvedValue(mockPillars);

      render(<Dashboard onStart={mockOnStart} currentView="dashboard" />);

      await waitFor(() => {
        expect(screen.getByText('Untracked Squat')).toBeInTheDocument();
      });

      const icon = document.querySelector('.text-amber-500');
      expect(icon).not.toBeInTheDocument();
    });
  });

  describe('Pillar Status Display', () => {
    it('shows "Days Remaining" by default', async () => {
      const now = Date.now();
      const mockPillars = [
        createMockPillar({ 
          name: 'Weekly Squat', 
          cadenceDays: 7, 
          lastCountedAt: now - (5 * 24 * 60 * 60 * 1000) // 5 days ago
        })
      ];
      (repository.getActivePillars as any).mockResolvedValue(mockPillars);

      render(<Dashboard onStart={mockOnStart} currentView="dashboard" />);

      // Default state: 7 - 5 = 2 days left
      await waitFor(() => {
        expect(screen.getByText('2d')).toBeInTheDocument();
        expect(screen.getByText('Remaining')).toBeInTheDocument();
      });
      
      expect(screen.queryByText('Since last count')).not.toBeInTheDocument();
      expect(screen.queryByText('5d')).not.toBeInTheDocument();
    });

    it('shows negative days for overdue items', async () => {
      const now = Date.now();
      const mockPillars = [
        createMockPillar({ 
          name: 'Overdue Squat', 
          cadenceDays: 5, 
          lastCountedAt: now - (7 * 24 * 60 * 60 * 1000) // 7 days ago (2 days overdue)
        })
      ];
      (repository.getActivePillars as any).mockResolvedValue(mockPillars);

      render(<Dashboard onStart={mockOnStart} currentView="dashboard" />);

      // Overdue by 2 days -> "-2d"
      await waitFor(() => {
        expect(screen.getByText('-2d')).toBeInTheDocument();
        expect(screen.getByText('Overdue by')).toBeInTheDocument();
      });
    });

    it('handles "Never Done" pillars with industrial placeholders', async () => {
      const mockPillars = [
        createMockPillar({ 
          name: 'New Squat', 
          cadenceDays: 7, 
          lastCountedAt: null 
        })
      ];
      (repository.getActivePillars as any).mockResolvedValue(mockPillars);

      render(<Dashboard onStart={mockOnStart} currentView="dashboard" />);

      // Should show "---" and "No Data"
      await waitFor(() => {
        expect(screen.getByText('---')).toBeInTheDocument();
        expect(screen.getByText('No Data')).toBeInTheDocument();
      });

      expect(screen.queryByText('Never')).not.toBeInTheDocument();
      expect(screen.queryByText('Start')).not.toBeInTheDocument();
      expect(screen.queryByText('Due now')).not.toBeInTheDocument();
    });
  });
});
