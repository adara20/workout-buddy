
import { describe, it, expect } from 'vitest';
import { createMockPillar, createMockWorkoutSession } from './factories';

describe('Test Factories', () => {
  it('should create a mock pillar with defaults', () => {
    const pillar = createMockPillar();
    expect(pillar.name).toBe('Test Pillar');
    expect(pillar.id).toBeDefined();
  });

  it('should allow overriding pillar properties', () => {
    const pillar = createMockPillar({ name: 'Custom Name' });
    expect(pillar.name).toBe('Custom Name');
  });

  it('should create a mock workout session', () => {
    const session = createMockWorkoutSession();
    expect(session.pillarsPerformed.length).toBe(1);
    expect(session.date).toBeLessThanOrEqual(Date.now());
  });
});
