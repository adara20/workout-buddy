import { describe, it, expect, beforeEach, vi } from 'vitest';
import Dexie from 'dexie';
import 'fake-indexeddb/auto';
import { WorkoutDatabase, initAppData, initOnce, db } from '../db';

describe('Database Initialization and Migration', () => {
  const DB_NAME = 'UpgradeTestDB';

  beforeEach(async () => {
    await Dexie.delete('WorkoutBuddyDB');
    await Dexie.delete(DB_NAME);
    if (db.isOpen()) db.close();
  });

  it('successfully handles migration from v1 (auto-increment) to current version', async () => {
    const legacy = new Dexie(DB_NAME);
    legacy.version(1).stores({
      pillars: '++id, name',
      accessories: '++id, name',
      sessions: '++id, date',
      config: 'id'
    });
    await legacy.open();
    await legacy.table('pillars').add({ name: 'Back Squat' });
    await legacy.table('accessories').add({ name: 'Dips' });
    legacy.close();

    // Opening with WorkoutDatabase should trigger the sequence:
    // v2 (pillars -> pillars_v2)
    // v3 (pillars_v2 -> pillars)
    const current = new WorkoutDatabase(DB_NAME);
    await current.open();
    
    const p = await current.pillars.get('back_squat');
    expect(p).toBeDefined();
    expect(p?.id).toBe('back_squat');
    
    const a = await current.accessories.get('acc_dips');
    expect(a).toBeDefined();
    
    current.close();
  });

  it('handles idempotent seeding in initAppData', async () => {
    await initAppData();
    const count1 = await db.pillars.count();
    expect(count1).toBeGreaterThan(0);
    await initAppData();
    const count2 = await db.pillars.count();
    expect(count2).toBe(count1);
  });

  it('updates canonical data fields when version increases', async () => {
     await db.config.put({ id: 'main', targetExercisesPerSession: 4, appDataVersion: 1 });
     await db.pillars.put({ 
       id: 'back_squat', 
       name: 'Old Name', 
       muscleGroup: 'Legs', 
       cadenceDays: 5, 
       prWeight: 500,
       minWorkingWeight: 0,
       regressionFloorWeight: 0,
       lastCountedAt: null,
       lastLoggedAt: null
     });
     await initAppData();
     const squat = await db.pillars.get('back_squat');
     expect(squat?.name).toBe('Back Squat');
     expect(squat?.cadenceDays).toBe(10);
  });

  it('initOnce allows retries on failure', async () => {
    vi.spyOn(db.config, 'get').mockRejectedValueOnce(new Error('DB Locked'));
    await expect(initOnce()).rejects.toThrow('DB Locked');
    vi.spyOn(db.config, 'get').mockResolvedValueOnce({ id: 'main', targetExercisesPerSession: 4, appDataVersion: 100 });
    await expect(initOnce()).resolves.toBeUndefined();
  });
});
