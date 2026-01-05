import { describe, it, expect, beforeEach } from 'vitest';
import Dexie from 'dexie';
import 'fake-indexeddb/auto';
import { WorkoutDatabase } from '../db';
import { createMockPillar } from './factories';

describe('Pillar Schema Backward Compatibility', () => {
  const DB_NAME = 'SchemaTestDB';

  beforeEach(async () => {
    await Dexie.delete(DB_NAME);
  });

  it('handles pillars without preferredAccessoryIds field gracefully', async () => {
    // 1. Setup a database and save a pillar without the new field
    const db = new Dexie(DB_NAME);
    db.version(5).stores({
        pillars: 'id, name, muscleGroup, lastCountedAt, lastLoggedAt, isActive'
    });
    await db.open();
    
    const legacyPillar = {
      id: 'legacy_p',
      name: 'Legacy Pillar',
      muscleGroup: 'Push',
      cadenceDays: 7,
      minWorkingWeight: 100,
      regressionFloorWeight: 80,
      prWeight: 120,
      lastCountedAt: null,
      lastLoggedAt: null,
      isActive: true
      // preferredAccessoryIds is missing
    };
    
    await db.table('pillars').add(legacyPillar);
    db.close();

    // 2. Open with current WorkoutDatabase
    const currentDb = new WorkoutDatabase();
    (currentDb as any).name = DB_NAME;
    await currentDb.open();

    // 3. Retrieve and verify
    const pillar = await currentDb.pillars.get('legacy_p');
    expect(pillar).toBeDefined();
    expect(pillar?.preferredAccessoryIds).toBeUndefined();
    
    // Logic that uses it should handle undefined
    const linkedIds = pillar?.preferredAccessoryIds || [];
    expect(linkedIds).toEqual([]);
    
    currentDb.close();
  });
});
