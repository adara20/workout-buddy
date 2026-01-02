import { describe, it, expect } from 'vitest';
import { calculatePillarEntryUpdate, calculatePillarUpdate } from '../services/session';
import { Pillar, PillarEntry } from '../types';

describe('session service', () => {
  const pillarInfo: Pillar = {
    id: '1',
    name: 'Bench Press',
    muscleGroup: 'Push',
    cadenceDays: 4,
    minWorkingWeight: 135,
    regressionFloorWeight: 115,
    prWeight: 185,
    lastCountedAt: null,
    lastLoggedAt: null,
    notes: ''
  };

  const initialEntry: PillarEntry = {
    pillarId: '1',
    name: 'Bench Press',
    weight: 135,
    counted: true,
    isPR: false,
    warning: false
  };

  describe('calculatePillarEntryUpdate', () => {
    it('increases weight correctly and maintains counted status', () => {
      const updated = calculatePillarEntryUpdate(initialEntry, pillarInfo, 5);
      expect(updated.weight).toBe(140);
      expect(updated.counted).toBe(true);
      expect(updated.isPR).toBe(false);
      expect(updated.warning).toBe(false);
    });

    it('sets isPR when exceeding prWeight', () => {
      const entry = { ...initialEntry, weight: 185 };
      const updated = calculatePillarEntryUpdate(entry, pillarInfo, 5);
      expect(updated.weight).toBe(190);
      expect(updated.isPR).toBe(true);
    });

    it('sets counted to false when below minWorkingWeight', () => {
      const entry = { ...initialEntry, weight: 135 };
      const updated = calculatePillarEntryUpdate(entry, pillarInfo, -5);
      expect(updated.weight).toBe(130);
      expect(updated.counted).toBe(false);
    });

    it('sets warning to true when below regressionFloorWeight', () => {
      const entry = { ...initialEntry, weight: 115 };
      const updated = calculatePillarEntryUpdate(entry, pillarInfo, -5);
      expect(updated.weight).toBe(110);
      expect(updated.warning).toBe(true);
    });

    it('prevents negative weight', () => {
      const entry = { ...initialEntry, weight: 5 };
      const updated = calculatePillarEntryUpdate(entry, pillarInfo, -10);
      expect(updated.weight).toBe(0);
    });

    it('handles undefined pillarInfo gracefully', () => {
      const updated = calculatePillarEntryUpdate(initialEntry, undefined, 5);
      expect(updated.weight).toBe(140);
      expect(updated.counted).toBe(true); // preserved from initial
    });
  });

  describe('calculatePillarUpdate', () => {
    const now = 1700000000000;

    it('sets lastLoggedAt always', () => {
      const entry = { ...initialEntry, counted: false, isPR: false };
      const updates = calculatePillarUpdate(entry, now);
      expect(updates.lastLoggedAt).toBe(now);
      expect(updates.lastCountedAt).toBeUndefined();
      expect(updates.prWeight).toBeUndefined();
    });

    it('sets lastCountedAt if entry is counted', () => {
      const entry = { ...initialEntry, counted: true };
      const updates = calculatePillarUpdate(entry, now);
      expect(updates.lastCountedAt).toBe(now);
    });

    it('sets prWeight if entry is PR', () => {
      const entry = { ...initialEntry, isPR: true, weight: 200 };
      const updates = calculatePillarUpdate(entry, now);
      expect(updates.prWeight).toBe(200);
    });
  });
});
