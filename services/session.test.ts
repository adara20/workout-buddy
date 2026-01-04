
import { describe, it, expect } from 'vitest';
import { calculatePillarEntryUpdate } from './session';
import { Pillar, PillarEntry } from '../types';

describe('calculatePillarEntryUpdate', () => {
  const mockPillar: Pillar = {
    id: '1',
    name: 'Walking Lunge',
    muscleGroup: 'Legs',
    cadenceDays: 2,
    minWorkingWeight: 40,
    regressionFloorWeight: 30,
    prWeight: 50,
    lastCountedAt: null,
    lastLoggedAt: null
  };

  const initialEntry: PillarEntry = {
    pillarId: '1',
    name: 'Walking Lunge',
    weight: 40,
    counted: false,
    isPR: false,
    warning: false
  };

  it('should mark as counted if new weight is >= minWorkingWeight', () => {
    const result = calculatePillarEntryUpdate(initialEntry, mockPillar, 0);
    expect(result.counted).toBe(true);
    expect(result.weight).toBe(40);
  });

  it('should mark as not counted if new weight is < minWorkingWeight', () => {
    const result = calculatePillarEntryUpdate(initialEntry, mockPillar, -5);
    expect(result.counted).toBe(false);
    expect(result.weight).toBe(35);
  });

  it('should mark as warning if new weight is < regressionFloorWeight', () => {
    const result = calculatePillarEntryUpdate(initialEntry, mockPillar, -15);
    expect(result.warning).toBe(true);
    expect(result.weight).toBe(25);
  });

  it('should mark as isPR if new weight is > prWeight', () => {
    const result = calculatePillarEntryUpdate(initialEntry, mockPillar, 15);
    expect(result.isPR).toBe(true);
    expect(result.weight).toBe(55);
  });
});
