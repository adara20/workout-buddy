import { describe, it, expect, beforeEach } from 'vitest';
import Dexie from 'dexie';
import 'fake-indexeddb/auto';
import { db, initOnce } from '../db';

describe('Data Seeding', () => {
  beforeEach(async () => {
    // Clear the database before each test
    await db.pillars.clear();
    await db.accessories.clear();
    await db.config.clear();
    // We can't easily reset the internal initPromise singleton in db.ts
    // but we can manipulate the config to trigger seeding.
  });

  it('seeds new accessories when appDataVersion is incremented', async () => {
    // 1. Setup initial state with an older version
    await db.config.put({
      id: 'main',
      targetExercisesPerSession: 4,
      appDataVersion: 4, // Previous version
      seededAt: Date.now()
    });

    // 2. Add one existing accessory to simulate "already seeded"
    await db.accessories.add({ id: 'acc_dips', name: 'Dips', tags: ['Push', 'Triceps'] });

    // 3. Run initialization
    // Since initOnce is a singleton guard, we call initAppData logic via initOnce
    // Note: In the real app, this runs on load.
    await initOnce();

    // 4. Verify new accessories are present
    const accessories = await db.accessories.toArray();
    
    // Check for some of the new ones
    const hasKBRDL = accessories.some(a => a.id === 'acc_kb_rdl');
    const hasRussianTwist = accessories.some(a => a.id === 'acc_russian_twist');
    const hasShoulderStretch = accessories.some(a => a.id === 'acc_shoulder_stretch');

    expect(hasKBRDL).toBe(true);
    expect(hasRussianTwist).toBe(true);
    expect(hasShoulderStretch).toBe(true);
    
    // 5. Verify config version is updated
    const config = await db.config.get('main');
    expect(config?.appDataVersion).toBe(5);
  });
});
