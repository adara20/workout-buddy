import { Pillar, PillarEntry } from '../types';

/**
 * Calculates the updated PillarEntry state when the weight is changed.
 */
export function calculatePillarEntryUpdate(
  currentEntry: PillarEntry,
  pillarInfo: Pillar | undefined,
  delta: number
): PillarEntry {
  const newWeight = Math.max(0, currentEntry.weight + delta);
  
  if (!pillarInfo) {
    return { ...currentEntry, weight: newWeight };
  }

  return {
    ...currentEntry,
    weight: newWeight,
    counted: newWeight >= pillarInfo.minWorkingWeight,
    warning: newWeight < pillarInfo.regressionFloorWeight,
    isPR: newWeight > pillarInfo.prWeight,
  };
}

/**
 * Calculates the updates needed for a Pillar based on the performed entry.
 */
export function calculatePillarUpdate(
  pEntry: PillarEntry,
  now: number
): Partial<Pillar> {
  const updates: Partial<Pillar> = {
    lastLoggedAt: now,
  };

  if (pEntry.counted) {
    updates.lastCountedAt = now;
  }

  if (pEntry.isPR) {
    updates.prWeight = pEntry.weight;
  }

  return updates;
}
