
import Dexie, { Table } from 'dexie';
import { Pillar, Accessory, WorkoutSession, AppConfig } from './types';
import { generateUUID } from './utils';

// Incremented when built-in exercises are updated
const CANONICAL_DATA_VERSION = 4;

export class WorkoutDatabase extends Dexie {
  pillars!: Table<Pillar, string>;
  accessories!: Table<Accessory, string>;
  sessions!: Table<WorkoutSession, string>;
  config!: Table<AppConfig, string>;

  constructor() {
    super('WorkoutBuddyDB');
    
    // Version 1: Initial development schema
    this.version(1).stores({
      pillars: '++id, name, muscleGroup, lastCountedAt',
      accessories: '++id, name, *tags',
      sessions: '++id, date',
      config: 'id'
    });

    // Version 2: Stable string IDs and consistent timestamps
    this.version(2).stores({
      pillars: 'id, name, muscleGroup, lastCountedAt, lastLoggedAt',
      accessories: 'id, name, *tags',
      sessions: '++id, date',
      config: 'id'
    }).upgrade(async tx => {
      // Migrate numeric pillar IDs to string IDs if they exist
      const pillars = await tx.table('pillars').toArray();
      for (const p of pillars) {
        if (typeof p.id === 'number') {
          const stringId = mapLegacyPillarNameToId(p.name);
          if (stringId) {
            const newPillar = { ...p, id: stringId };
            await tx.table('pillars').add(newPillar);
            await tx.table('pillars').delete(p.id);
          }
        }
      }
      // Migrate accessories
      const accs = await tx.table('accessories').toArray();
      for (const a of accs) {
        if (typeof a.id === 'number') {
          const stringId = `acc_${a.name.toLowerCase().replace(/\s+/g, '_')}`;
          const newAcc = { ...a, id: stringId };
          await tx.table('accessories').add(newAcc);
          await tx.table('accessories').delete(a.id);
        }
      }
    });

    // v3: Add workout_sessions, keep sessions for migration
    this.version(3).stores({
      pillars: 'id, name, muscleGroup, lastCountedAt, lastLoggedAt',
      accessories: 'id, name, *tags',
      sessions: '++id, date', // Keep legacy table for migration
      workout_sessions: 'id, date',
      config: 'id'
    }).upgrade(async tx => {
      const oldSessions = await tx.table('sessions').toArray();
      const newSessionsTable = tx.table('workout_sessions');
      for (const s of oldSessions) {
        const newSession = {
          ...s,
          id: generateUUID() // Assign new UUID
        };
        await newSessionsTable.add(newSession);
      }
    });

    // v4: Remove the legacy sessions table
    this.version(4).stores({
      sessions: null
    });

    // v5: Add isActive field to pillars
    this.version(5).stores({
      pillars: 'id, name, muscleGroup, lastCountedAt, lastLoggedAt, isActive'
    });
  }

  // Convenience getter to use 'sessions' name in code but point to 'workout_sessions'
  get sessionsTable() {
    return this.table('workout_sessions');
  }
}

export const db = new WorkoutDatabase();

function mapLegacyPillarNameToId(name: string): string {
  const map: Record<string, string> = {
    'Back Squat': 'back_squat',
    'Bench Press': 'bench_press',
    'Pull-Ups': 'pull_ups',
    'Romanian Deadlift': 'rdl',
    'Walking Lunge': 'walking_lunge',
    'Farmer’s Carry': 'farmers_carry'
  };
  return map[name] || `p_${name.toLowerCase().replace(/\s+/g, '_')}`;
}

const CANONICAL_PILLARS: Pillar[] = [
  { id: 'back_squat', name: 'Back Squat', muscleGroup: 'Legs', cadenceDays: 10, minWorkingWeight: 135, regressionFloorWeight: 115, prWeight: 0, lastCountedAt: null, lastLoggedAt: null, isActive: true, preferredAccessoryIds: ['acc_calf_raise', 'acc_ham_curl'] },
  { id: 'bench_press', name: 'Bench Press', muscleGroup: 'Push', cadenceDays: 7, minWorkingWeight: 95, regressionFloorWeight: 75, prWeight: 0, lastCountedAt: null, lastLoggedAt: null, isActive: true, preferredAccessoryIds: ['acc_dips', 'acc_pushups', 'acc_tricep_press'] },
  { id: 'pull_ups', name: 'Pull-Ups', muscleGroup: 'Pull', cadenceDays: 5, minWorkingWeight: 0, regressionFloorWeight: 0, prWeight: 0, lastCountedAt: null, lastLoggedAt: null, isActive: true, preferredAccessoryIds: ['acc_rows', 'acc_curls'] },
  { id: 'rdl', name: 'Romanian Deadlift', muscleGroup: 'Legs', cadenceDays: 10, minWorkingWeight: 115, regressionFloorWeight: 95, prWeight: 0, lastCountedAt: null, lastLoggedAt: null, isActive: true, preferredAccessoryIds: ['acc_ham_curl'] },
  { id: 'walking_lunge', name: 'Walking Lunge', muscleGroup: 'Legs', cadenceDays: 7, minWorkingWeight: 40, regressionFloorWeight: 30, prWeight: 0, lastCountedAt: null, lastLoggedAt: null, isActive: true, preferredAccessoryIds: ['acc_calf_raise'] },
  { id: 'farmers_carry', name: 'Farmer’s Carry', muscleGroup: 'Conditioning', cadenceDays: 7, minWorkingWeight: 50, regressionFloorWeight: 40, prWeight: 0, lastCountedAt: null, lastLoggedAt: null, isActive: true, preferredAccessoryIds: ['acc_abwheel'] }
];

const CANONICAL_ACCESSORIES: Accessory[] = [
  { id: 'acc_dips', name: 'Dips', tags: ['Push', 'Triceps'] },
  { id: 'acc_pushups', name: 'Push-Ups', tags: ['Push', 'Chest'] },
  { id: 'acc_abwheel', name: 'Ab Wheel', tags: ['Core'] },
  { id: 'acc_lsits', name: 'L-Sits', tags: ['Core'] },
  { id: 'acc_rows', name: 'Rows', tags: ['Pull', 'Back'] },
  { id: 'acc_facepulls', name: 'Face Pulls', tags: ['Pull', 'Shoulders'] },
  { id: 'acc_curls', name: 'Bicep Curls', tags: ['Pull', 'Arms'] },
  { id: 'acc_tricep_press', name: 'Triceps Pressdown', tags: ['Push', 'Arms'] },
  { id: 'acc_calf_raise', name: 'Calf Raise', tags: ['Legs'] },
  { id: 'acc_ham_curl', name: 'Hamstring Curl', tags: ['Legs'] }
];

let initPromise: Promise<void> | null = null;

/**
 * Singleton initialization guard
 */
export async function initOnce() {
  if (!initPromise) initPromise = initAppData();
  return initPromise;
}

async function initAppData() {
  let config = await db.config.get('main');
  
  if (!config) {
    config = { 
      id: 'main', 
      targetExercisesPerSession: 4, 
      deviceId: generateUUID(),
      appDataVersion: 0 
    };
    await db.config.add(config);
  }

  const currentDataVer = config.appDataVersion || 0;

  if (currentDataVer < CANONICAL_DATA_VERSION) {
    await db.transaction('rw', [db.pillars, db.accessories, db.config], async () => {
      // Idempotent seeding
      for (const p of CANONICAL_PILLARS) {
        const existing = await db.pillars.get(p.id);
        if (!existing) {
          await db.pillars.add(p);
        } else {
          // Update only non-state definition fields
          await db.pillars.update(p.id, {
            name: p.name,
            muscleGroup: p.muscleGroup,
            cadenceDays: p.cadenceDays
          });
        }
      }

      for (const a of CANONICAL_ACCESSORIES) {
        const existing = await db.accessories.get(a.id);
        if (!existing) {
          await db.accessories.add(a);
        } else {
          await db.accessories.update(a.id, {
            name: a.name,
            tags: a.tags
          });
        }
      }

      await db.config.update('main', { 
        seededAt: Date.now(), 
        appDataVersion: CANONICAL_DATA_VERSION 
      });
    });
  }

  // Request persistent storage
  if (navigator.storage && navigator.storage.persist) {
    const isPersisted = await navigator.storage.persist();
    await db.config.update('main', { storagePersisted: isPersisted });
  }
}
