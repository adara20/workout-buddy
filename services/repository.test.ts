import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { repository } from './repository';
import { db } from '../db';

describe('repository history extensions', () => {
  beforeEach(async () => {
    await db.sessions.clear();
    await db.pillars.clear();
  });

  afterEach(async () => {
    await db.sessions.clear();
    await db.pillars.clear();
  });

  it('should delete a session', async () => {
    const id = await repository.addSession({
      date: Date.now(),
      pillarsPerformed: [],
      accessoriesPerformed: []
    });
    
    expect(await repository.getSessionCount()).toBe(1);
    await repository.deleteSession(id);
    expect(await repository.getSessionCount()).toBe(0);
  });

  it('should update a session', async () => {
    const id = await repository.addSession({
      date: Date.now(),
      pillarsPerformed: [],
      accessoriesPerformed: [],
      notes: 'old note'
    });
    
    await repository.updateSession(id, { notes: 'new note' });
    const sessions = await repository.getAllSessions();
    expect(sessions[0].notes).toBe('new note');
  });

  it('should find sessions by pillar ID', async () => {
    await repository.addSession({
      date: 100,
      pillarsPerformed: [{ pillarId: 'p1', name: 'P1', weight: 100, counted: true, isPR: false, warning: false }],
      accessoriesPerformed: []
    });
    await repository.addSession({
      date: 200,
      pillarsPerformed: [{ pillarId: 'p2', name: 'P2', weight: 100, counted: true, isPR: false, warning: false }],
      accessoriesPerformed: []
    });

    const results = await repository.getSessionsByPillar('p1');
    expect(results.length).toBe(1);
    expect(results[0].date).toBe(100);
  });
});
