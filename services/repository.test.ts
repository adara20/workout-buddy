import { describe, it, expect } from 'vitest';
import { repository } from './repository';

describe('repository history extensions', () => {
  it('can add and retrieve a session', async () => {
    const id = await repository.addSession({
      date: Date.now(),
      pillarsPerformed: [],
      accessoriesPerformed: []
    });
    expect(typeof id).toBe('string');
    expect(await repository.getSessionCount()).toBe(1);
    await repository.deleteSession(id);
    expect(await repository.getSessionCount()).toBe(0);
  });

  it('can update a session', async () => {
    const id = await repository.addSession({
      date: Date.now(),
      pillarsPerformed: [],
      accessoriesPerformed: [],
      notes: 'old note'
    });
    await repository.updateSession(id, { notes: 'new note' });
    const sessions = await repository.getAllSessions();
    expect(sessions[0].notes).toBe('new note');
    await repository.deleteSession(id);
  });

  it('can filter sessions by pillar', async () => {
    await repository.addSession({
      date: Date.now(),
      pillarsPerformed: [{ pillarId: 'p1', name: 'P1', weight: 100, counted: true, isPR: false, warning: false }],
      accessoriesPerformed: []
    });
    await repository.addSession({
      date: Date.now(),
      pillarsPerformed: [{ pillarId: 'p2', name: 'P2', weight: 100, counted: true, isPR: false, warning: false }],
      accessoriesPerformed: []
    });

    const results = await repository.getSessionsByPillar('p1');
    expect(results.length).toBe(1);
    expect(results[0].pillarsPerformed[0].pillarId).toBe('p1');

    await repository.clearSessions();
  });

  it('can archive and restore a pillar', async () => {
    const pillarId = 'archive-test';
    await repository.putPillar({
      id: pillarId,
      name: 'Archive Test',
      muscleGroup: 'Push',
      cadenceDays: 5,
      minWorkingWeight: 10,
      regressionFloorWeight: 5,
      prWeight: 0,
      lastCountedAt: null,
      lastLoggedAt: null
    });

    const initial = await repository.getPillarById(pillarId);
    expect(initial?.isActive).toBe(true);

    await repository.archivePillar(pillarId);
    const archived = await repository.getPillarById(pillarId);
    expect(archived?.isActive).toBe(false);

    await repository.restorePillar(pillarId);
    const restored = await repository.getPillarById(pillarId);
    expect(restored?.isActive).toBe(true);

    await repository.clearPillars();
  });

  it('treats undefined isActive as active', async () => {
    await repository.putPillar({
      id: 'legacy-p',
      name: 'Legacy Pillar',
      muscleGroup: 'Push',
      cadenceDays: 5,
      minWorkingWeight: 10,
      regressionFloorWeight: 5,
      prWeight: 0,
      lastCountedAt: null,
      lastLoggedAt: null,
      isActive: undefined // Force undefined
    });

    const active = await repository.getActivePillars();
    expect(active.some(p => p.id === 'legacy-p')).toBe(true);
    await repository.clearPillars();
  });
});