import { describe, it, expect } from 'vitest';
import { extractPillarHistory } from './stats';
import { WorkoutSession } from '../types';

describe('extractPillarHistory', () => {
  const pillarId = 'p1';
  
  it('extracts weight and PR status correctly', () => {
    const sessions: WorkoutSession[] = [
      {
        date: 1000,
        pillarsPerformed: [{ pillarId, name: 'P1', weight: 100, counted: true, isPR: false, warning: false }],
        accessoriesPerformed: []
      },
      {
        date: 2000,
        pillarsPerformed: [{ pillarId, name: 'P1', weight: 110, counted: true, isPR: true, warning: false }],
        accessoriesPerformed: []
      }
    ];

    const result = extractPillarHistory(sessions, pillarId);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ date: 1000, weight: 100, isPR: false });
    expect(result[1]).toEqual({ date: 2000, weight: 110, isPR: true });
  });

  it('filters out sessions that do not contain the pillar', () => {
    const sessions: WorkoutSession[] = [
      {
        date: 1000,
        pillarsPerformed: [{ pillarId: 'other', name: 'Other', weight: 100, counted: true, isPR: false, warning: false }],
        accessoriesPerformed: []
      },
      {
        date: 2000,
        pillarsPerformed: [{ pillarId, name: 'P1', weight: 110, counted: true, isPR: true, warning: false }],
        accessoriesPerformed: []
      }
    ];

    const result = extractPillarHistory(sessions, pillarId);
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe(2000);
  });

  it('returns empty array if no sessions contain the pillar', () => {
    const sessions: WorkoutSession[] = [];
    const result = extractPillarHistory(sessions, pillarId);
    expect(result).toHaveLength(0);
  });
});
