
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Summary from './Summary';
import { createMockWorkoutSession, createMockPillarEntry } from '../tests/factories';

describe('Summary Component', () => {
  const mockOnDone = vi.fn();

  it('renders session summary with PRs', () => {
    const session = createMockWorkoutSession({
      pillarsPerformed: [
        createMockPillarEntry({ name: 'Squat', weight: 150, isPR: true, counted: true }),
        createMockPillarEntry({ name: 'Bench', weight: 100, isPR: false, counted: true }),
      ],
    });

    render(<Summary session={session} onDone={mockOnDone} />);

    expect(screen.getByText('Workout Complete!')).toBeInTheDocument();
    expect(screen.getByText('1 NEW PR!')).toBeInTheDocument();
    expect(screen.getAllByText(/150\s*lb/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/ROTATION RESET/i)[0]).toBeInTheDocument();
  });

  it('calls onDone when button is clicked', () => {
    const session = createMockWorkoutSession();
    render(<Summary session={session} onDone={mockOnDone} />);

    fireEvent.click(screen.getByText(/BACK TO DASHBOARD/));
    expect(mockOnDone).toHaveBeenCalled();
  });
});
