import { WorkoutSession } from '../types';

export interface ChartDataPoint {
  date: number;
  weight: number;
  isPR: boolean;
}

/**
 * Extracts and formats weight history for a specific pillar from a list of sessions.
 * Assumes sessions are already sorted by date ascending.
 */
export function extractPillarHistory(sessions: WorkoutSession[], pillarId: string): ChartDataPoint[] {
  return sessions.map(s => {
    const entry = s.pillarsPerformed.find(p => p.pillarId === pillarId);
    if (!entry) return null;
    return {
      date: s.date,
      weight: entry.weight,
      isPR: entry.isPR
    };
  }).filter((p): p is ChartDataPoint => p !== null);
}
