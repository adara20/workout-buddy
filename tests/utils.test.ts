import { describe, it, expect } from 'vitest';
import { getDaysSince, getOverdueScore, getStatusColor, StatusColor } from '../utils';
import { Pillar } from '../types';

describe('utils', () => {
  const NOW = 1704067200000; // 2024-01-01T00:00:00.000Z
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

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
        notes: '',
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
        notes: '',
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
          notes: '',
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
      notes: '',
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
