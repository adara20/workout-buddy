import { describe, it, expect, vi } from 'vitest';
import { getDaysSince, getOverdueScore, getStatusColor, generateUUID, getStatusHex, getStatusBg } from '../utils';
import { Pillar } from '../types';

describe('utils', () => {
  const NOW = 1704067200000; // 2024-01-01T00:00:00.000Z
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  describe('generateUUID', () => {
    it('uses crypto.randomUUID if available', () => {
      const mockUUID = '1234-5678';
      vi.stubGlobal('crypto', {
        randomUUID: vi.fn().mockReturnValue(mockUUID)
      });

      expect(generateUUID()).toBe(mockUUID);
      expect(global.crypto.randomUUID).toHaveBeenCalled();

      vi.unstubAllGlobals();
    });

    it('uses fallback if crypto.randomUUID is NOT available', () => {
      vi.stubGlobal('crypto', {
        randomUUID: undefined
      });

      const uuid = generateUUID();
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);

      vi.unstubAllGlobals();
    });
  });

  describe('getStatusHex', () => {
    it('returns correct hex for colors', () => {
      expect(getStatusHex('green')).toBe('#22c55e');
      expect(getStatusHex('yellow')).toBe('#eab308');
      expect(getStatusHex('red')).toBe('#ef4444');
    });
  });

  describe('getStatusBg', () => {
    it('returns correct bg class for colors', () => {
      expect(getStatusBg('green')).toBe('bg-green-500');
      expect(getStatusBg('yellow')).toBe('bg-yellow-500');
      expect(getStatusBg('red')).toBe('bg-red-500');
    });
  });

  describe('getDaysSince', () => {
    it('returns 999 if timestamp is null', () => {
      expect(getDaysSince(null, NOW)).toBe(999);
    });

    it('returns 0 if timestamp is now', () => {
      expect(getDaysSince(NOW, NOW)).toBe(0);
    });

    it('returns 1 if timestamp is 24 hours ago', () => {
      expect(getDaysSince(NOW - ONE_DAY_MS, NOW)).toBe(1);
    });

    it('returns 0 if timestamp is 23 hours ago', () => {
      expect(getDaysSince(NOW - (23 * 60 * 60 * 1000), NOW)).toBe(0);
    });

    it('returns 10 if timestamp is 10 days ago', () => {
      expect(getDaysSince(NOW - (10 * ONE_DAY_MS), NOW)).toBe(10);
    });
  });

  describe('getOverdueScore', () => {
    it('calculates score correctly', () => {
      const pillar: Pillar = {
        id: '1',
        name: 'Test',
        cadenceDays: 5,
        lastCountedAt: NOW - (5 * ONE_DAY_MS), // 5 days ago
        muscleGroup: 'Push',
        minWorkingWeight: 10,
        regressionFloorWeight: 5,
        prWeight: 20,
        lastLoggedAt: null
      };
      // 5 days ago / 5 cadence = 1.0
      expect(getOverdueScore(pillar, NOW)).toBe(1.0);
    });

    it('returns 2.0 if double the cadence', () => {
      const pillar: Pillar = {
        id: '1',
        name: 'Test',
        cadenceDays: 5,
        lastCountedAt: NOW - (10 * ONE_DAY_MS), // 10 days ago
        muscleGroup: 'Push',
        minWorkingWeight: 10,
        regressionFloorWeight: 5,
        prWeight: 20,
        lastLoggedAt: null
      };
      expect(getOverdueScore(pillar, NOW)).toBe(2.0);
    });
    
    it('returns high score if never done', () => {
        const pillar: Pillar = {
          id: '1',
          name: 'Test',
          cadenceDays: 5,
          lastCountedAt: null,
          muscleGroup: 'Push',
          minWorkingWeight: 10,
          regressionFloorWeight: 5,
          prWeight: 20,
          lastLoggedAt: null
        };
        // 999 / 5 = 199.8
        expect(getOverdueScore(pillar, NOW)).toBeCloseTo(199.8);
      });
  });

  describe('getStatusColor', () => {
    const createPillar = (daysAgo: number, cadence: number): Pillar => ({
      id: '1',
      name: 'Test',
      cadenceDays: cadence,
      lastCountedAt: NOW - (daysAgo * ONE_DAY_MS),
      muscleGroup: 'Push',
      minWorkingWeight: 10,
      regressionFloorWeight: 5,
      prWeight: 20,
      lastLoggedAt: null
    });

    it('returns green if score < 0.7', () => {
      // 3 days ago / 5 cadence = 0.6
      const pillar = createPillar(3, 5);
      expect(getStatusColor(pillar, NOW)).toBe('green');
    });

    it('returns yellow if 0.7 <= score < 1.0', () => {
      // 4 days ago / 5 cadence = 0.8
      const pillar = createPillar(4, 5);
      expect(getStatusColor(pillar, NOW)).toBe('yellow');
    });

    it('returns red if score >= 1.0', () => {
      // 5 days ago / 5 cadence = 1.0
      const pillar = createPillar(5, 5);
      expect(getStatusColor(pillar, NOW)).toBe('red');
    });
  });
});
