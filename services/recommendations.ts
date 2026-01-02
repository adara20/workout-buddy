import { Pillar } from '../types';
import { getOverdueScore } from '../utils';

export function getRecommendedPillars(
  pillars: Pillar[],
  selectedFocus: string | null,
  now: number = Date.now()
): Pillar[] {
  let filtered = [...pillars];
  
  if (selectedFocus) {
    // Prioritize focus but include others if needed
    filtered.sort((a, b) => {
      if (a.muscleGroup === selectedFocus && b.muscleGroup !== selectedFocus) return -1;
      if (a.muscleGroup !== selectedFocus && b.muscleGroup === selectedFocus) return 1;
      return getOverdueScore(b, now) - getOverdueScore(a, now);
    });
  } else {
    filtered.sort((a, b) => getOverdueScore(b, now) - getOverdueScore(a, now));
  }
  
  return filtered;
}
