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
    this.notifyChange();
    return session.id;
  }
  async updateSession(id: string, updates: Partial<WorkoutSession>): Promise<number> {
    const res = await db.table('workout_sessions').update(id, updates);
    this.notifyChange();
    return res;
  }
  async deleteSession(id: string): Promise<void> {
    await db.table('workout_sessions').delete(id);
    this.notifyChange();
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