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

/**
 * Calculates how many weeks in the current year the user has met the goal of 5+ counted pillars.
 * A week starts on Monday.
 */
export function calculateWeeksMetYTD(sessions: WorkoutSession[], now: number = Date.now()): number {
  const currentYear = new Date(now).getFullYear();

  // 1. Filter sessions for the current year
  const ytdSessions = sessions.filter(s => {
    const sessionDate = new Date(s.date);
    return sessionDate.getFullYear() === currentYear;
  });

  // 2. Group counted pillars by week (Monday start)
  const weekPillarCounts = new Map<number, number>();

  ytdSessions.forEach(session => {
    const monday = getMonday(new Date(session.date));
    const countedPillarsInSession = session.pillarsPerformed.filter(p => p.counted).length;

    const currentCount = weekPillarCounts.get(monday) || 0;
    weekPillarCounts.set(monday, currentCount + countedPillarsInSession);
  });

  // 3. Count weeks that met the threshold
  let weeksMet = 0;
  weekPillarCounts.forEach(count => {
    if (count >= 5) {
      weeksMet++;
    }
  });

  return weeksMet;
}

/**
 * Returns the timestamp for the Monday (start of week) for a given date.
 */
function getMonday(d: Date): number {
  const date = new Date(d);
  const day = date.getDay(); // 0 (Sun) to 6 (Sat)
  const diff = date.getDate() - (day === 0 ? 6 : day - 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}
