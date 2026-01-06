import { describe, it, expect, beforeEach } from 'vitest';
import Dexie from 'dexie';
import 'fake-indexeddb/auto';
import { WorkoutDatabase } from '../db';

describe('Database Migration', () => {
  const DB_NAME = 'MigrationTestDB';

  beforeEach(async () => {
    // Ensure we start with a clean slate for each test
    await Dexie.delete(DB_NAME);
  });

  it('successfully upgrades from v2 (integer IDs) to v3 (string IDs) without crashing', async () => {
    // 1. Setup a legacy v2 database
    const legacyDb = new Dexie(DB_NAME);
    legacyDb.version(2).stores({
      pillars: 'id, name, muscleGroup, lastCountedAt, lastLoggedAt',
      accessories: 'id, name, *tags',
      sessions: '++id, date',
      config: 'id'
    });
    
    await legacyDb.open();
    await legacyDb.table('sessions').add({
      date: 123456789,
      pillarsPerformed: [{ pillarId: 'p1', name: 'Pillar 1' }],
      accessoriesPerformed: [],
      notes: 'test note'
    });
    const count = await legacyDb.table('sessions').count();
    expect(count).toBe(1);
    legacyDb.close();

    // 2. Attempt to open it with the current WorkoutDatabase (v3+)
    const currentDb = new WorkoutDatabase();
    (currentDb as any).name = DB_NAME; 
    
    await currentDb.open();
    
    // 3. Verify data integrity
    const sessions = await currentDb.table('workout_sessions').toArray();
    expect(sessions.length).toBe(1);
    expect(sessions[0].date).toBe(123456789);
    expect(typeof sessions[0].id).toBe('string'); 
    expect(sessions[0].notes).toBe('test note');
    
    currentDb.close();
  });

  it('successfully upgrades from v5 to v6 (adding notes field)', async () => {
    // 1. Setup a v5 database
    const v5Db = new Dexie(DB_NAME);
    v5Db.version(5).stores({
      pillars: 'id, name, muscleGroup, lastCountedAt, lastLoggedAt, isActive'
    });
    
    await v5Db.open();
    await v5Db.table('pillars').add({
      id: 'squat',
      name: 'Back Squat',
      muscleGroup: 'Legs',
      cadenceDays: 10,
      minWorkingWeight: 135,
      regressionFloorWeight: 115,
      prWeight: 0,
      lastCountedAt: null,
      lastLoggedAt: null,
      isActive: true
    });
    v5Db.close();

    // 2. Open with current WorkoutDatabase (v6)
    const currentDb = new WorkoutDatabase();
    (currentDb as any).name = DB_NAME; 
    
    await currentDb.open();
    
    // 3. Verify pillar still exists and we can add notes
    const pillar = await currentDb.pillars.get('squat');
    expect(pillar).toBeDefined();
    expect(pillar?.name).toBe('Back Squat');
    
    await currentDb.pillars.update('squat', { notes: 'New test note' });
    const updatedPillar = await currentDb.pillars.get('squat');
    expect(updatedPillar?.notes).toBe('New test note');
    
    currentDb.close();
  });
});
