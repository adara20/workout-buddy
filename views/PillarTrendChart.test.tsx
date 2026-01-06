import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import PillarTrendChart from './PillarTrendChart';

describe('PillarTrendChart', () => {
  it('renders "needs more history" when data is empty', () => {
    render(<PillarTrendChart data={[]} />);
    expect(screen.getByText(/Needs more history/i)).toBeInTheDocument();
  });

  it('renders "needs more history" when data has 1 point', () => {
    render(<PillarTrendChart data={[{ date: 1000, weight: 100, isPR: true }]} />);
    expect(screen.getByText(/Needs more history/i)).toBeInTheDocument();
  });

  it('renders chart and weight labels when data has 2+ points', () => {
    const data = [
      { date: 1000, weight: 100, isPR: false },
      { date: 2000, weight: 150, isPR: true }
    ];
    render(<PillarTrendChart data={data} />);
    
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('150')).toBeInTheDocument();
    expect(screen.queryByText(/Needs more history/i)).not.toBeInTheDocument();
  });

  it('handles zero weight range (same weight multiple times)', () => {
    const data = [
      { date: 1000, weight: 100, isPR: false },
      { date: 2000, weight: 100, isPR: false }
    ];
    render(<PillarTrendChart data={data} />);
    
    // Should still render 100 as max/min
    expect(screen.getAllByText('100')).toHaveLength(2);
    expect(screen.queryByText(/Needs more history/i)).not.toBeInTheDocument();
  });
});
