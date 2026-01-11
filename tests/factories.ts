
import { Pillar, Accessory, PillarEntry, AccessoryEntry, WorkoutSession } from '../types';
import { generateUUID } from '../utils';

export const createMockPillar = (overrides: Partial<Pillar> = {}): Pillar => ({
  id: generateUUID(),
  name: 'Test Pillar',
  muscleGroup: 'Legs',
  cadenceDays: 7,
  minWorkingWeight: 100,
  regressionFloorWeight: 80,
  prWeight: 120,
  lastCountedAt: Date.now() - (3 * 24 * 60 * 60 * 1000), // 3 days ago
  lastLoggedAt: Date.now() - (1 * 24 * 60 * 60 * 1000),  // 1 day ago
  isActive: true,
  preferredAccessoryIds: [],
  enableOverloadTracking: false,
  overloadThreshold: 5,
  ...overrides
});

export const createMockAccessory = (overrides: Partial<Accessory> = {}): Accessory => ({
  id: generateUUID(),
  name: 'Test Accessory',
  tags: ['Core'],
  ...overrides
});

export const createMockPillarEntry = (overrides: Partial<PillarEntry> = {}): PillarEntry => ({
  pillarId: generateUUID(),
  name: 'Test Pillar Entry',
  weight: 100,
  counted: true,
  isPR: false,
  warning: false,
  ...overrides
});

export const createMockAccessoryEntry = (overrides: Partial<AccessoryEntry> = {}): AccessoryEntry => ({
  accessoryId: generateUUID(),
  name: 'Test Accessory Entry',
  didPerform: true,
  ...overrides
});

export const createMockWorkoutSession = (overrides: Partial<WorkoutSession> = {}): WorkoutSession => ({
  id: generateUUID(),
  date: Date.now(),
  pillarsPerformed: [createMockPillarEntry()],
  accessoriesPerformed: [createMockAccessoryEntry()],
  ...overrides
});
