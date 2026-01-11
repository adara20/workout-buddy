
import Dexie, { Table } from 'dexie';
import { Pillar, Accessory, WorkoutSession, AppConfig } from './types';
import { generateUUID } from './utils';
import { recalculateAllPillarStats } from './services/repository';

// Incremented when built-in exercises are updated
const CANONICAL_DATA_VERSION = 6;

export class WorkoutDatabase extends Dexie {
  pillars!: Table<Pillar, string>;
  accessories!: Table<Accessory, string>;
  sessions!: Table<WorkoutSession, string>;
  config!: Table<AppConfig, string>;

  constructor(name = 'WorkoutBuddyDB') {
    super(name);
    
    // Version 1: Initial development schema
    this.version(1).stores({
      pillars: '++id, name, muscleGroup, lastCountedAt',
      accessories: '++id, name, *tags',
      sessions: '++id, date',
      config: 'id'
    });

    // Version 2: Stable string IDs and consistent timestamps
    this.version(2).stores({
      pillars: null, // delete v1 auto-increment table
      accessories: null, // delete v1 auto-increment table
      pillars_v2: 'id, name, muscleGroup, lastCountedAt, lastLoggedAt',
      accessories_v2: 'id, name, *tags',
      sessions: '++id, date',
      config: 'id'
    }).upgrade(async tx => {
      // Migrate numeric pillar IDs to string IDs
      const pillars = await tx.table('pillars').toArray();
      const newPillarsTable = tx.table('pillars_v2');
      for (const p of pillars) {
        const stringId = typeof p.id === 'number' ? mapLegacyPillarNameToId(p.name) : p.id;
        await newPillarsTable.add({ ...p, id: stringId });
      }
      // Migrate accessories
      const accs = await tx.table('accessories').toArray();
      const newAccsTable = tx.table('accessories_v2');
      for (const a of accs) {
        const stringId = typeof a.id === 'number' ? `acc_${a.name.toLowerCase().replace(/\s+/g, '_')}` : a.id;
        await newAccsTable.add({ ...a, id: stringId });
      }
    });

    // Version 3: Move back to original names but with new primary key definition
    this.version(3).stores({
      pillars_v2: null,
      accessories_v2: null,
      pillars: 'id, name, muscleGroup, lastCountedAt, lastLoggedAt',
      accessories: 'id, name, *tags',
      sessions: '++id, date',
      workout_sessions: 'id, date',
      config: 'id'
    }).upgrade(async tx => {
      // Restore pillars
      const p2 = await tx.table('pillars_v2').toArray();
      for (const p of p2) await tx.table('pillars').add(p);
      
      // Restore accessories
      const a2 = await tx.table('accessories_v2').toArray();
      for (const a of a2) await tx.table('accessories').add(a);

      // Existing v3 logic: sessions to workout_sessions
      const oldSessions = await tx.table('sessions').toArray();
      const newSessionsTable = tx.table('workout_sessions');
      for (const s of oldSessions) {
        await newSessionsTable.add({ ...s, id: generateUUID() });
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

    // v6: Add notes field to pillars
    this.version(6).stores({
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
  { id: 'acc_ham_curl', name: 'Hamstring Curl', tags: ['Legs'] },
  { id: 'acc_kb_rdl', name: 'Kettlebell RDL', tags: ['Legs', 'Hamstrings'] },
  { id: 'acc_barbell_calf_raise', name: 'Barbell Calf Raises', tags: ['Legs', 'Calves'] },
  { id: 'acc_russian_twist', name: 'Russian Twists', tags: ['Core', 'Obliques'] },
  { id: 'acc_db_lat_raise', name: 'Dumbbell Lateral Raises', tags: ['Shoulders', 'Side Delts'] },
  { id: 'acc_db_rev_fly', name: 'Dumbbell Reverse Flyes', tags: ['Shoulders', 'Rear Delts'] },
  { id: 'acc_planks', name: 'Planks', tags: ['Core', 'Abs'] },
  { id: 'acc_dead_bugs', name: 'Dead Bugs', tags: ['Core', 'Abs'] },
  { id: 'acc_db_ohp', name: 'Dumbbell Overhead Press', tags: ['Push', 'Shoulders'] },
  { id: 'acc_incline_db_press', name: 'Incline Dumbbell Press', tags: ['Push', 'Upper Chest'] },
  { id: 'acc_incline_db_fly', name: 'Incline Dumbbell Flyes', tags: ['Push', 'Upper Chest'] },
  { id: 'acc_band_pull_aparts', name: 'Band Pull-Aparts', tags: ['Pull', 'Rear Delts'] },
  { id: 'acc_band_face_pulls', name: 'Band Face Pulls', tags: ['Pull', 'Rear Delts', 'Shoulders'] },
  { id: 'acc_db_rows', name: 'Dumbbell Rows', tags: ['Pull', 'Back'] },
  { id: 'acc_bb_rows', name: 'Barbell Rows', tags: ['Pull', 'Back'] },
  { id: 'acc_db_shrugs', name: 'Dumbbell Shrugs', tags: ['Pull', 'Traps'] },
  { id: 'acc_shoulder_stretch', name: 'Shoulder Stretches', tags: ['Mobility'] }
];

let initPromise: Promise<void> | null = null;

/**
 * Singleton initialization guard
 */
export async function initOnce() {
  try {
    if (!initPromise) initPromise = initAppData();
    return await initPromise;
  } catch (err) {
    initPromise = null; // Allow retry on next call
    throw err;
  }
}

export async function initAppData() {
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

    // Run recalculation outside transaction to avoid locking tables 
    // and only if we are on a version that has the session table (v3+)
    if (currentDataVer >= 3) {
      await recalculateAllPillarStats();
    }
  }

  // Request persistent storage
  if (navigator.storage && navigator.storage.persist) {
    const isPersisted = await navigator.storage.persist();
    await db.config.update('main', { storagePersisted: isPersisted });
  }
}
