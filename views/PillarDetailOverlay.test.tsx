import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PillarDetailOverlay from './PillarDetailOverlay';
import { repository } from '../services/repository';
import { createMockPillar, createMockAccessory } from '../tests/factories';

vi.mock('../services/repository', () => ({
  repository: {
    getAllAccessories: vi.fn(),
    getSessionsByPillar: vi.fn(),
  },
}));

describe('PillarDetailOverlay', () => {
  const mockPillar = createMockPillar({
    id: 'p1',
    name: 'Bench Press',
    muscleGroup: 'Push',
    prWeight: 225,
    minWorkingWeight: 185,
    preferredAccessoryIds: ['a1', 'a2']
  });

  const mockAccessories = [
    createMockAccessory({ id: 'a1', name: 'Tricep Extension' }),
    createMockAccessory({ id: 'a2', name: 'Lateral Raise' }),
    createMockAccessory({ id: 'a3', name: 'Unrelated' }),
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (repository.getAllAccessories as any).mockResolvedValue(mockAccessories);
    (repository.getSessionsByPillar as any).mockResolvedValue([]);
  });

  it('renders pillar details correctly', async () => {
    render(<PillarDetailOverlay pillar={mockPillar} onClose={() => {}} onStartWorkout={() => {}} />);

    expect(screen.getByText('Bench Press')).toBeInTheDocument();
    expect(screen.getByText('Push')).toBeInTheDocument();
    expect(screen.getByText('225')).toBeInTheDocument();
    expect(screen.getByText('185')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Tricep Extension')).toBeInTheDocument();
      expect(screen.getByText('Lateral Raise')).toBeInTheDocument();
    });
    
    expect(screen.queryByText('Unrelated')).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn();
    render(<PillarDetailOverlay pillar={mockPillar} onClose={onClose} onStartWorkout={() => {}} />);

    const closeBtn = screen.getByRole('button', { name: '' }); // The X button usually doesn't have text but has an SVG
    // Better to find by finding the button that contains the X icon or just use a container query if needed.
    // In our implementation, we used <X size={20} /> inside a button.
    
    // Let's find the button by its class if needed, or better, the only button besides the "Start Session" one.
    const buttons = screen.getAllByRole('button');
    const closeButton = buttons[0]; // First button is close
    
    await userEvent.click(closeButton);
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onStartWorkout when start button is clicked', async () => {
    const onStart = vi.fn();
    render(<PillarDetailOverlay pillar={mockPillar} onClose={() => {}} onStartWorkout={onStart} />);

    const startBtn = screen.getByText(/START SESSION/i);
    await userEvent.click(startBtn);

    expect(onStart).toHaveBeenCalledWith(mockPillar);
  });

  it('displays notes when present', async () => {
    const pillarWithNotes = { ...mockPillar, notes: 'Stay tight and **drive** through heels' };
    render(<PillarDetailOverlay pillar={pillarWithNotes} onClose={() => {}} onStartWorkout={() => {}} />);

    expect(screen.getByText(/Coaching Cues/i)).toBeInTheDocument();
    expect(screen.getByText(/Stay tight and/i)).toBeInTheDocument();
    expect(screen.getByText('drive')).toBeInTheDocument(); // Bold text should be rendered
  });

  it('does not display the notes section when absent', () => {
    const pillarWithoutNotes = { ...mockPillar, notes: '' };
    render(<PillarDetailOverlay pillar={pillarWithoutNotes} onClose={() => {}} onStartWorkout={() => {}} />);

    expect(screen.queryByText(/Coaching Cues/i)).not.toBeInTheDocument();
  });

  it('displays the progression trend chart when history is present', async () => {
    const mockHistory = [
      { 
        date: 1000, 
        pillarsPerformed: [{ pillarId: 'p1', name: 'P1', weight: 100, counted: true, isPR: false, warning: false }],
        accessoriesPerformed: []
      },
      { 
        date: 2000, 
        pillarsPerformed: [{ pillarId: 'p1', name: 'P1', weight: 110, counted: true, isPR: true, warning: false }],
        accessoriesPerformed: []
      }
    ];
    (repository.getSessionsByPillar as any).mockResolvedValue(mockHistory);

    render(<PillarDetailOverlay pillar={mockPillar} onClose={() => {}} onStartWorkout={() => {}} />);

    expect(screen.getByText(/Progression Trend/i)).toBeInTheDocument();
    await waitFor(() => {
      // The chart renders an SVG. We can check for existence of trending up icon or chart container
      expect(screen.queryByText(/Needs more history/i)).not.toBeInTheDocument();
    });
  });

  it('displays placeholder when history is insufficient', async () => {
    (repository.getSessionsByPillar as any).mockResolvedValue([]);
    render(<PillarDetailOverlay pillar={mockPillar} onClose={() => {}} onStartWorkout={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText(/Needs more history to chart/i)).toBeInTheDocument();
    });
  });
});
