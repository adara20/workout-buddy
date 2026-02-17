import { describe, it, expect } from 'vitest';
import { extractPillarHistory, calculateWeeksMetYTD } from './stats';
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

describe('calculateWeeksMetYTD', () => {
  const now = new Date(2026, 1, 16).getTime(); // Monday, Feb 16, 2026

  it('returns 0 if no sessions', () => {
    expect(calculateWeeksMetYTD([], now)).toBe(0);
  });

  it('counts a week if it has 5 counted pillars', () => {
    const sessions: WorkoutSession[] = [
      {
        date: new Date(2026, 1, 16).getTime(), // Monday
        pillarsPerformed: [
          { pillarId: 'p1', name: 'P1', weight: 100, counted: true, isPR: false, warning: false },
          { pillarId: 'p2', name: 'P2', weight: 100, counted: true, isPR: false, warning: false },
          { pillarId: 'p3', name: 'P3', weight: 100, counted: true, isPR: false, warning: false },
          { pillarId: 'p4', name: 'P4', weight: 100, counted: true, isPR: false, warning: false },
          { pillarId: 'p5', name: 'P5', weight: 100, counted: true, isPR: false, warning: false },
        ],
        accessoriesPerformed: []
      }
    ];
    expect(calculateWeeksMetYTD(sessions, now)).toBe(1);
  });

  it('does not count a week if it has fewer than 5 counted pillars', () => {
    const sessions: WorkoutSession[] = [
      {
        date: new Date(2026, 1, 16).getTime(), // Monday
        pillarsPerformed: [
          { pillarId: 'p1', name: 'P1', weight: 100, counted: true, isPR: false, warning: false },
          { pillarId: 'p2', name: 'P2', weight: 100, counted: true, isPR: false, warning: false },
          { pillarId: 'p3', name: 'P3', weight: 100, counted: true, isPR: false, warning: false },
          { pillarId: 'p4', name: 'P4', weight: 100, counted: true, isPR: false, warning: false },
          { pillarId: 'p5', name: 'P5', weight: 100, counted: false, isPR: false, warning: false }, // Not counted
        ],
        accessoriesPerformed: []
      }
    ];
    expect(calculateWeeksMetYTD(sessions, now)).toBe(0);
  });

  it('aggregates pillars across multiple sessions in the same week', () => {
    const sessions: WorkoutSession[] = [
      {
        date: new Date(2026, 1, 16).getTime(), // Monday
        pillarsPerformed: [
          { pillarId: 'p1', name: 'P1', weight: 100, counted: true, isPR: false, warning: false },
          { pillarId: 'p2', name: 'P2', weight: 100, counted: true, isPR: false, warning: false },
        ],
        accessoriesPerformed: []
      },
      {
        date: new Date(2026, 1, 18).getTime(), // Wednesday
        pillarsPerformed: [
          { pillarId: 'p3', name: 'P3', weight: 100, counted: true, isPR: false, warning: false },
          { pillarId: 'p4', name: 'P4', weight: 100, counted: true, isPR: false, warning: false },
          { pillarId: 'p5', name: 'P5', weight: 100, counted: true, isPR: false, warning: false },
        ],
        accessoriesPerformed: []
      }
    ];
    expect(calculateWeeksMetYTD(sessions, now)).toBe(1);
  });

  it('filters out sessions from previous years', () => {
     const sessions: WorkoutSession[] = [
      {
        date: new Date(2025, 11, 29).getTime(), // Monday of last week of 2025
        pillarsPerformed: [
          { pillarId: 'p1', name: 'P1', weight: 100, counted: true, isPR: false, warning: false },
          { pillarId: 'p2', name: 'P2', weight: 100, counted: true, isPR: false, warning: false },
          { pillarId: 'p3', name: 'P3', weight: 100, counted: true, isPR: false, warning: false },
          { pillarId: 'p4', name: 'P4', weight: 100, counted: true, isPR: false, warning: false },
          { pillarId: 'p5', name: 'P5', weight: 100, counted: true, isPR: false, warning: false },
        ],
        accessoriesPerformed: []
      }
    ];
    expect(calculateWeeksMetYTD(sessions, now)).toBe(0);
  });

  it('handles week boundaries correctly (Sunday to Monday transition)', () => {
    const sessions: WorkoutSession[] = [
      {
        date: new Date(2026, 1, 15).getTime(), // Sunday
        pillarsPerformed: [
          { pillarId: 'p1', name: 'P1', weight: 100, counted: true, isPR: false, warning: false },
        ],
        accessoriesPerformed: []
      },
      {
        date: new Date(2026, 1, 16).getTime(), // Monday (Next Week)
        pillarsPerformed: [
          { pillarId: 'p2', name: 'P2', weight: 100, counted: true, isPR: false, warning: false },
          { pillarId: 'p3', name: 'P3', weight: 100, counted: true, isPR: false, warning: false },
          { pillarId: 'p4', name: 'P4', weight: 100, counted: true, isPR: false, warning: false },
          { pillarId: 'p5', name: 'P5', weight: 100, counted: true, isPR: false, warning: false },
          { pillarId: 'p6', name: 'P6', weight: 100, counted: true, isPR: false, warning: false },
        ],
        accessoriesPerformed: []
      }
    ];
    // Week starting 2026-02-09 (containing 2026-02-15 Sunday) has 1 pillar.
    // Week starting 2026-02-16 (containing 2026-02-16 Monday) has 5 pillars.
    expect(calculateWeeksMetYTD(sessions, now)).toBe(1);
  });
});
