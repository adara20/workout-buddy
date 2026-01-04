
import { describe, it, expect } from 'vitest';
import { calculatePillarEntryUpdate } from '../services/session';
import { createMockPillar, createMockPillarEntry } from './factories';

describe('Session Logic Edge Cases', () => {
  it('detects PR only when weight is strictly greater than current PR', () => {
    const pillar = createMockPillar({ prWeight: 100 });
    const entry = createMockPillarEntry({ weight: 100 });

    // Same weight - NOT a PR
    const updated = calculatePillarEntryUpdate(entry, pillar, 0);
    expect(updated.isPR).toBe(false);

    // Greater weight - IS a PR
    const updatedPR = calculatePillarEntryUpdate(entry, pillar, 5);
    expect(updatedPR.isPR).toBe(true);
  });

  it('marks as counted when weight is equal to or greater than min working weight', () => {
    const pillar = createMockPillar({ minWorkingWeight: 100 });
    const entry = createMockPillarEntry({ weight: 95 });

    // Below min - NOT counted
    const updated = calculatePillarEntryUpdate(entry, pillar, 0);
    expect(updated.counted).toBe(false);

    // At min - IS counted
    const updatedAtMin = calculatePillarEntryUpdate(entry, pillar, 5);
    expect(updatedAtMin.counted).toBe(true);
  });

  it('shows warning when weight is below regression floor', () => {
    const pillar = createMockPillar({ regressionFloorWeight: 80 });
    const entry = createMockPillarEntry({ weight: 85 });

    // Above floor - No warning
    const updated = calculatePillarEntryUpdate(entry, pillar, 0);
    expect(updated.warning).toBe(false);

    // Below floor - Warning
    const updatedBelow = calculatePillarEntryUpdate(entry, pillar, -10);
    expect(updatedBelow.warning).toBe(true);
  });

  it('handles zero weight without crashing', () => {
    const pillar = createMockPillar({ minWorkingWeight: 100 });
    const entry = createMockPillarEntry({ weight: 5 });

    const updated = calculatePillarEntryUpdate(entry, pillar, -10);
    expect(updated.weight).toBe(0);
    expect(updated.counted).toBe(false);
  });
});
