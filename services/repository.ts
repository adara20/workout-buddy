import { db } from '../db';
import { Pillar, Accessory, WorkoutSession, AppConfig } from '../types';
import { generateUUID } from '../utils';

export class Repository {
  private onDataChange: (() => Promise<void>) | null = null;

  setSyncListener(listener: () => Promise<void>) {
    this.onDataChange = listener;
  }

  private async notifyChange() {
    if (this.onDataChange) {
      this.onDataChange().catch(err => console.error('Auto-sync failed:', err));
    }
  }

  // Pillars
  async getAllPillars(): Promise<Pillar[]> {
    return db.pillars.toArray();
  }
  async getActivePillars(): Promise<Pillar[]> {
    // Treat undefined or true as active
    return db.pillars.filter(p => p.isActive !== false).toArray();
  }
  async archivePillar(id: string): Promise<void> {
    await db.pillars.update(id, { isActive: false });
    this.notifyChange();
  }
  async restorePillar(id: string): Promise<void> {
    // We explicitly set it to true now that the user has interacted with it
    await db.pillars.update(id, { isActive: true });
    this.notifyChange();
  }
  async getPillarById(id: string): Promise<Pillar | undefined> {
    return db.pillars.get(id);
  }
  async isPillarNameUnique(name: string): Promise<boolean> {
    const trimmed = name.trim().toLowerCase();
    const count = await db.pillars.filter(p => p.name.trim().toLowerCase() === trimmed).count();
    return count === 0;
  }
  async createPillar(data: Pick<Pillar, 'name' | 'muscleGroup' | 'cadenceDays' | 'notes'>): Promise<string> {
    const newPillar: Pillar = {
      ...data,
      id: generateUUID(),
      isActive: true,
      prWeight: 0,
      minWorkingWeight: 0,
      regressionFloorWeight: 0,
      lastCountedAt: null,
      lastLoggedAt: null
    };
    return this.putPillar(newPillar);
  }
  async updatePillar(id: string, updates: Partial<Pillar>): Promise<number> {
    const res = await db.pillars.update(id, updates);
    this.notifyChange();
    return res;
  }
  async putPillar(pillar: Pillar): Promise<string> {
    if (!pillar.id) pillar.id = generateUUID();
    if (pillar.isActive === undefined) pillar.isActive = true;
    const res = await db.pillars.put(pillar);
    this.notifyChange();
    return res;
  }
  async clearPillars(): Promise<void> {
    await db.pillars.clear();
    this.notifyChange();
  }
  async bulkPutPillars(pillars: Pillar[]): Promise<string> {
    const res = await db.pillars.bulkPut(pillars);
    this.notifyChange();
    return res;
  }

  // Accessories
  async getAllAccessories(): Promise<Accessory[]> {
    return db.accessories.toArray();
  }
  async getAccessoryCount(): Promise<number> {
    return db.accessories.count();
  }
  async clearAccessories(): Promise<void> {
    await db.accessories.clear();
    this.notifyChange();
  }
  async isAccessoryNameUnique(name: string): Promise<boolean> {
    const trimmed = name.trim().toLowerCase();
    const count = await db.accessories.filter(a => a.name.trim().toLowerCase() === trimmed).count();
    return count === 0;
  }
  async createAccessory(name: string): Promise<string> {
    const newAcc: Accessory = {
      id: generateUUID(),
      name: name.trim(),
      tags: []
    };
    return this.putAccessory(newAcc);
  }
  async putAccessory(accessory: Accessory): Promise<string> {
    const res = await db.accessories.put(accessory);
    this.notifyChange();
    return res;
  }
  async bulkPutAccessories(accessories: Accessory[]): Promise<string> {
    const res = await db.accessories.bulkPut(accessories);
    this.notifyChange();
    return res;
  }

  // Sessions
  async getAllSessions(): Promise<WorkoutSession[]> {
    return db.table('workout_sessions').orderBy('date').reverse().toArray();
  }
  async addSession(session: WorkoutSession): Promise<string> {
    if (!session.id) session.id = generateUUID();
    await db.table('workout_sessions').put(session);
    
    // Auto-update pillar stats based on the new session
    const pillarIds = session.pillarsPerformed.map(p => p.pillarId);
    if (pillarIds.length > 0) {
      await this.recalculatePillarStats(pillarIds);
    }

    this.notifyChange();
    return session.id;
  }
  async updateSession(id: string, updates: Partial<WorkoutSession>): Promise<number> {
    const oldSession = await db.table('workout_sessions').get(id);
    const res = await db.table('workout_sessions').update(id, updates);
    
    // Gather all unique pillar IDs affected by this change
    const affectedPillars = new Set<string>();
    if (oldSession) {
      oldSession.pillarsPerformed.forEach((p: any) => affectedPillars.add(p.pillarId));
    }
    if (updates.pillarsPerformed) {
      updates.pillarsPerformed.forEach((p: any) => affectedPillars.add(p.pillarId));
    }

    if (affectedPillars.size > 0) {
      await this.recalculatePillarStats(Array.from(affectedPillars));
    }

    this.notifyChange();
    return res;
  }
  async deleteSession(id: string): Promise<void> {
    const session = await db.table('workout_sessions').get(id);
    if (!session) return;

    await db.table('workout_sessions').delete(id);
    
    // Recalculate stats for all pillars that were in this session
    const pillarIds = session.pillarsPerformed.map((p: any) => p.pillarId);
    if (pillarIds.length > 0) {
      await this.recalculatePillarStats(pillarIds);
    }
    
    this.notifyChange();
  }

  /**
   * Recalculates PRs and timestamps for specific pillars by scanning all history.
   */
  private async recalculatePillarStats(pillarIds: string[]): Promise<void> {
    for (const pillarId of pillarIds) {
      // Find all sessions containing this pillar
      const sessions = await db.table('workout_sessions')
        .filter((s: WorkoutSession) => s.pillarsPerformed.some(p => p.pillarId === pillarId))
        .toArray();

      let maxWeight = 0;
      let lastLoggedAt: number | null = null;
      let lastCountedAt: number | null = null;

      for (const s of sessions) {
        const entry = s.pillarsPerformed.find(p => p.pillarId === pillarId);
        if (!entry) continue;

        if (entry.weight > maxWeight) {
          maxWeight = entry.weight;
        }

        if (!lastLoggedAt || s.date > lastLoggedAt) {
          lastLoggedAt = s.date;
        }

        if (entry.counted && (!lastCountedAt || s.date > lastCountedAt)) {
          lastCountedAt = s.date;
        }
      }

      // Update the pillar with fresh stats from history
      await db.pillars.update(pillarId, {
        prWeight: maxWeight,
        lastLoggedAt: lastLoggedAt,
        lastCountedAt: lastCountedAt
      });
    }
  }
  async getSessionsByPillar(pillarId: string): Promise<WorkoutSession[]> {
    return db.table('workout_sessions').filter(s => 
      s.pillarsPerformed.some(p => p.pillarId === pillarId)
    ).toArray();
  }
  async getSessionCount(): Promise<number> {
    return db.table('workout_sessions').count();
  }
  async clearSessions(): Promise<void> {
    await db.table('workout_sessions').clear();
    this.notifyChange();
  }
  async bulkPutSessions(sessions: WorkoutSession[]): Promise<string> {
    const res = await db.table('workout_sessions').bulkPut(sessions);
    this.notifyChange();
    return res as unknown as string;
  }

  // Config
  async getConfig(): Promise<AppConfig | undefined> {
    return db.config.get('main');
  }
  async putConfig(config: AppConfig): Promise<string> {
    const res = await db.config.put(config);
    this.notifyChange();
    return res;
  }
  async updateConfig(updates: Partial<AppConfig>): Promise<number> {
    const res = await db.config.update('main', updates);
    this.notifyChange();
    return res;
  }

  // Database actions
  async deleteDatabase(): Promise<void> {
    return db.delete();
  }

  async runTransaction<T>(
    mode: 'r' | 'rw',
    tables: ('pillars' | 'accessories' | 'workout_sessions' | 'config')[],
    fn: () => Promise<T>
  ): Promise<T> {
    return db.transaction(mode, tables.map(t => db.table(t)), fn);
  }
}

export const repository = new Repository();