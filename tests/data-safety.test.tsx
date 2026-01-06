import { describe, it, expect, vi, beforeEach } from 'vitest';
import { repository } from '../services/repository';
import { uploadToCloud, downloadFromCloud } from '../services/cloud-rest';
import { auth } from '../services/firebase-config';

// Mock Firebase
vi.mock('../services/firebase-config', () => ({
  auth: {
    currentUser: { uid: 'test-user', email: 'test@example.com' }
  }
}));

vi.mock('../services/auth', () => ({
  getToken: vi.fn().mockResolvedValue('mock-token')
}));

// Mock fetch for Cloud tests
global.fetch = vi.fn();

describe('Data Safety & Sync Integration', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Clear tables instead of deleting DB to avoid closure issues
    await repository.clearPillars();
    await repository.clearAccessories();
    await repository.clearSessions();
    
    // Initialize with a default config
    await repository.putConfig({ 
        id: 'main', 
        targetExercisesPerSession: 4 
    });
  });

  it('updates lastSyncedAt after a successful cloud upload', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({})
    });

    const now = Date.now();
    // We mock the upload, but cloud-rest.ts uses Date.now() for updatedAt
    // To be precise, let's just check it's updated to roughly now
    await uploadToCloud();
    
    const config = await repository.getConfig();
    expect(config?.lastSyncedAt).toBeDefined();
    expect(config!.lastSyncedAt).toBeGreaterThanOrEqual(now);
  });

  it('restores lastSyncedAt and overwrites local data after cloud download', async () => {
    const cloudTimestamp = 987654321;
    const cloudData = {
      pillars: [{ id: 'p1', name: 'Cloud Pillar', muscleGroup: 'Push', cadenceDays: 7, prWeight: 0, minWorkingWeight: 0, regressionFloorWeight: 0, lastCountedAt: null, lastLoggedAt: null }],
      accessories: [],
      sessions: [],
      config: { targetExercisesPerSession: 6, lastSyncedAt: cloudTimestamp },
      updatedAt: cloudTimestamp
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => cloudData
    });

    const result = await downloadFromCloud();
    expect(result).toBe(true);

    const pillars = await repository.getAllPillars();
    expect(pillars).toHaveLength(1);
    expect(pillars[0].name).toBe('Cloud Pillar');

    const config = await repository.getConfig();
    expect(config?.targetExercisesPerSession).toBe(6);
    expect(config?.lastSyncedAt).toBe(cloudTimestamp);
  });

  it('preserves data integrity during local JSON export and import', async () => {
    // 1. Setup local data
    await repository.createPillar({ name: 'Bench', muscleGroup: 'Push', cadenceDays: 7 });
    await repository.createAccessory('Dips');
    await repository.addSession({
        date: Date.now(),
        pillarsPerformed: [{ pillarId: 'any', name: 'Bench', weight: 100, counted: true, isPR: true, warning: false }],
        accessoriesPerformed: []
    });

    const originalPillars = await repository.getAllPillars();
    const originalAccessories = await repository.getAllAccessories();
    const originalSessions = await repository.getAllSessions();
    const originalConfig = await repository.getConfig();

    // 2. Simulate Export Payload creation (similar to Settings.tsx)
    const payload = {
        exportVersion: 2,
        data: {
            pillars: originalPillars,
            accessories: originalAccessories,
            sessions: originalSessions,
            config: originalConfig
        }
    };

    // 3. Wipe and Import
    await repository.runTransaction('rw', ['pillars', 'accessories', 'workout_sessions', 'config'], async () => {
        await repository.clearPillars();
        await repository.bulkPutPillars(payload.data.pillars);
        await repository.clearAccessories();
        await repository.bulkPutAccessories(payload.data.accessories);
        await repository.clearSessions();
        await repository.bulkPutSessions(payload.data.sessions);
        if (payload.data.config) {
            await repository.putConfig({ ...payload.data.config, id: 'main' });
        }
    });

    // 4. Verify
    expect(await repository.getAllPillars()).toHaveLength(originalPillars.length);
    expect(await repository.getAllAccessories()).toHaveLength(originalAccessories.length);
    expect(await repository.getAllSessions()).toHaveLength(originalSessions.length);
    
    const finalConfig = await repository.getConfig();
    expect(finalConfig?.targetExercisesPerSession).toBe(originalConfig?.targetExercisesPerSession);
  });

  it('rolls back all changes if a transaction fails halfway', async () => {
    // 1. Seed with data
    await repository.createPillar({ name: 'Survivor', muscleGroup: 'Push', cadenceDays: 7 });
    
    // 2. Attempt a transaction that clears then fails
    try {
        await repository.runTransaction('rw', ['pillars'], async () => {
            await repository.clearPillars();
            throw new Error('Atomic Failure');
        });
    } catch (e) {
        // Expected
    }

    // 3. Verify 'Survivor' pillar still exists (it should have been restored by rollback)
    const pillars = await repository.getAllPillars();
    expect(pillars.length).toBe(1);
    expect(pillars[0].name).toBe('Survivor');
  });
});
