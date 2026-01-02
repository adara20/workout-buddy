import { db } from '../db';
import { Pillar, Accessory, WorkoutSession, AppConfig } from '../types';

export const repository = {
  // Pillars
  async getAllPillars(): Promise<Pillar[]> {
    return db.pillars.toArray();
  },
  async getPillarById(id: string): Promise<Pillar | undefined> {
    return db.pillars.get(id);
  },
  async updatePillar(id: string, updates: Partial<Pillar>): Promise<number> {
    return db.pillars.update(id, updates);
  },
  async putPillar(pillar: Pillar): Promise<string> {
    return db.pillars.put(pillar);
  },
  async clearPillars(): Promise<void> {
    return db.pillars.clear();
  },
  async bulkPutPillars(pillars: Pillar[]): Promise<string> {
    return db.pillars.bulkPut(pillars);
  },

  // Accessories
  async getAllAccessories(): Promise<Accessory[]> {
    return db.accessories.toArray();
  },
  async getAccessoryCount(): Promise<number> {
    return db.accessories.count();
  },
  async clearAccessories(): Promise<void> {
    return db.accessories.clear();
  },
  async bulkPutAccessories(accessories: Accessory[]): Promise<string> {
    return db.accessories.bulkPut(accessories);
  },

  // Sessions
  async getAllSessions(): Promise<WorkoutSession[]> {
    return db.sessions.orderBy('date').reverse().toArray();
  },
  async addSession(session: WorkoutSession): Promise<number> {
    return db.sessions.add(session);
  },
  async updateSession(id: number, updates: Partial<WorkoutSession>): Promise<number> {
    return db.sessions.update(id, updates);
  },
  async deleteSession(id: number): Promise<void> {
    return db.sessions.delete(id);
  },
  async getSessionsByPillar(pillarId: string): Promise<WorkoutSession[]> {
    // Note: This is an unoptimized scan because pillars are in a nested array.
    // For small local history, this is acceptable.
    return db.sessions.filter(s => 
      s.pillarsPerformed.some(p => p.pillarId === pillarId)
    ).toArray();
  },
  async getSessionCount(): Promise<number> {
    return db.sessions.count();
  },
  async clearSessions(): Promise<void> {
    return db.sessions.clear();
  },
  async bulkPutSessions(sessions: WorkoutSession[]): Promise<number> {
    return db.sessions.bulkPut(sessions);
  },

  // Config
  async getConfig(): Promise<AppConfig | undefined> {
    return db.config.get('main');
  },
  async putConfig(config: AppConfig): Promise<string> {
    return db.config.put(config);
  },
  async updateConfig(updates: Partial<AppConfig>): Promise<number> {
    return db.config.update('main', updates);
  },

  // Database actions
  async deleteDatabase(): Promise<void> {
    return db.delete();
  },

  /**
   * Run a transaction.
   * Note: This still exposes the internal tables but allows us to group operations.
   */
  async runTransaction<T>(
    mode: 'r' | 'rw',
    tables: ('pillars' | 'accessories' | 'sessions' | 'config')[],
    fn: () => Promise<T>
  ): Promise<T> {
    return db.transaction(mode, tables.map(t => db[t]), fn);
  }
};
