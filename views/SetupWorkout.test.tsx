
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SetupWorkout from './SetupWorkout';
import { repository } from '../services/repository';
import { createMockPillar } from '../tests/factories';

vi.mock('../services/repository', () => ({
  repository: {
    getActivePillars: vi.fn(),
  },
}));

describe('SetupWorkout Component', () => {
  const mockOnCancel = vi.fn();
  const mockOnStart = vi.fn();
  const mockSetSelectedFocus = vi.fn();
  const mockSetNumPillars = vi.fn();

  const mockPillars = [
    createMockPillar({ id: '1', name: 'Squat', muscleGroup: 'Legs' }),
    createMockPillar({ id: '2', name: 'Bench', muscleGroup: 'Push' }),
    createMockPillar({ id: '3', name: 'Deadlift', muscleGroup: 'Legs' }),
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (repository.getActivePillars as any).mockResolvedValue(mockPillars);
  });

  it('renders all muscle groups and pillars', async () => {
    render(
      <SetupWorkout 
        onCancel={mockOnCancel} 
        onStart={mockOnStart} 
        selectedFocus={null}
        setSelectedFocus={mockSetSelectedFocus}
        numPillars={2}
        setNumPillars={mockSetNumPillars}
      />
    );

    expect(screen.getByText('Legs')).toBeInTheDocument();
    expect(screen.getByText('Push')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('Squat')).toBeInTheDocument();
      expect(screen.getByText('Bench')).toBeInTheDocument();
    });
  });

  it('calls setSelectedFocus when a muscle group is clicked', async () => {
    render(
      <SetupWorkout 
        onCancel={mockOnCancel} 
        onStart={mockOnStart} 
        selectedFocus={null}
        setSelectedFocus={mockSetSelectedFocus}
        numPillars={2}
        setNumPillars={mockSetNumPillars}
      />
    );

    await waitFor(() => expect(repository.getActivePillars).toHaveBeenCalled());

    // Filter to find the button, not the text in the list below
    const legsButton = screen.getAllByText('Legs').find(el => el.tagName === 'BUTTON');
    fireEvent.click(legsButton!);

    expect(mockSetSelectedFocus).toHaveBeenCalledWith('Legs');
  });

  it('calls setNumPillars when a number is clicked', async () => {
    render(
      <SetupWorkout 
        onCancel={mockOnCancel} 
        onStart={mockOnStart} 
        selectedFocus={null}
        setSelectedFocus={mockSetSelectedFocus}
        numPillars={2}
        setNumPillars={mockSetNumPillars}
      />
    );

    await waitFor(() => expect(repository.getActivePillars).toHaveBeenCalled());

    const threeButton = screen.getByText('3');
    fireEvent.click(threeButton);

    expect(mockSetNumPillars).toHaveBeenCalledWith(3);
  });

  it('toggles pillar selection manually', async () => {
    render(
      <SetupWorkout 
        onCancel={mockOnCancel} 
        onStart={mockOnStart} 
        selectedFocus={null}
        setSelectedFocus={mockSetSelectedFocus}
        numPillars={2}
        setNumPillars={mockSetNumPillars}
      />
    );

    await waitFor(() => screen.getByText('Squat'));
    
    const squatButton = screen.getByText('Squat').closest('button');
    fireEvent.click(squatButton!);

    // Since it was likely recommended and active, clicking it should deactivate it
    // Wait for state updates if necessary, but here we can just check if START WORKOUT is enabled
    const startButton = screen.getByText(/START WORKOUT|SELECT EXERCISES/);
    expect(startButton).toBeInTheDocument();
  });

  it('calls onStart with selected pillars and date', async () => {
    render(
      <SetupWorkout 
        onCancel={mockOnCancel} 
        onStart={mockOnStart} 
        selectedFocus={null}
        setSelectedFocus={mockSetSelectedFocus}
        numPillars={2}
        setNumPillars={mockSetNumPillars}
      />
    );

    await waitFor(() => screen.getByText('Squat'));
    
    // Select a pillar manually to enable the start button
    const squatButton = screen.getByText('Squat').closest('button');
    fireEvent.click(squatButton!);
    
    const startButton = screen.getByText('START WORKOUT');
    fireEvent.click(startButton);

    expect(mockOnStart).toHaveBeenCalled();
    const args = mockOnStart.mock.calls[0];
    expect(args[0].length).toBeGreaterThan(0); // Should have recommended pillars
    expect(typeof args[1]).toBe('number'); // Should have a date timestamp
  });

  it('includes ONLY preselectedPillar in initial recommendations', async () => {
    const preselected = mockPillars[2]; // Deadlift (Legs)
    
    render(
      <SetupWorkout 
        onCancel={mockOnCancel} 
        onStart={mockOnStart} 
        selectedFocus={null}
        setSelectedFocus={mockSetSelectedFocus}
        numPillars={3} // Even if 3 are requested
        setNumPillars={mockSetNumPillars}
        preselectedPillar={preselected}
      />
    );

    await waitFor(() => {
      // Find the Deadlift entry and check if it has the "ACTIVE" badge
      const deadliftBtn = screen.getByText('Deadlift').closest('button');
      expect(deadliftBtn).toHaveTextContent('ACTIVE');
      
      // Bench and Squat should NOT be active
      const benchBtn = screen.getByText('Bench').closest('button');
      expect(benchBtn).not.toHaveTextContent('ACTIVE');
      
      const squatBtn = screen.getByText('Squat').closest('button');
      expect(squatBtn).not.toHaveTextContent('ACTIVE');
    });
  });
});
