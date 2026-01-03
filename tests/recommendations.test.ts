import { describe, it, expect } from 'vitest';
import { getRecommendedPillars } from '../services/recommendations';
import { Pillar } from '../types';

describe('getRecommendedPillars', () => {
  const NOW = 10000;
  const ONE_DAY = 24 * 60 * 60 * 1000;

  // Helper to create simple mock pillars
  const createPillar = (id: string, group: string, daysAgo: number, cadence = 5): Pillar => ({
    id,
    name: `Pillar ${id}`,
    muscleGroup: group as any,
    cadenceDays: cadence,
    lastCountedAt: NOW - (daysAgo * ONE_DAY),
    minWorkingWeight: 10,
    regressionFloorWeight: 5,
    prWeight: 20,
    lastLoggedAt: null
  });

  const p1 = createPillar('1', 'Push', 5); // Score 1.0
  const p2 = createPillar('2', 'Pull', 10); // Score 2.0 (Most overdue)
  const p3 = createPillar('3', 'Legs', 2);  // Score 0.4
  const p4 = createPillar('4', 'Push', 0);  // Score 0.0

  const allPillars = [p1, p2, p3, p4];

  it('sorts by overdue score descending when no focus is selected', () => {
    const result = getRecommendedPillars(allPillars, null, NOW);
    expect(result.map(p => p.id)).toEqual(['2', '1', '3', '4']);
  });

  it('prioritizes selected focus group', () => {
    const result = getRecommendedPillars(allPillars, 'Push', NOW);
    
    // Push pillars should come first, sorted by score descending
    // Non-Push pillars follow, sorted by score descending
    // Push: p1 (1.0), p4 (0.0)
    // Others: p2 (2.0), p3 (0.4)
    expect(result.map(p => p.id)).toEqual(['1', '4', '2', '3']);
  });

  it('prioritizes another focus group', () => {
    const result = getRecommendedPillars(allPillars, 'Pull', NOW);
    // Pull: p2 (2.0)
    // Others: p1 (1.0), p3 (0.4), p4 (0.0)
    expect(result.map(p => p.id)).toEqual(['2', '1', '3', '4']);
  });

  it('handles empty list', () => {
    expect(getRecommendedPillars([], null, NOW)).toEqual([]);
  });
});
