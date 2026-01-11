import { describe, it, expect, vi } from 'vitest';
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

  it('recalculates PR and timestamps when sessions are deleted', async () => {
    const pId = 'calc-test';
    await repository.putPillar({
      id: pId,
      name: 'Calc Test',
      muscleGroup: 'Push',
      cadenceDays: 5,
      minWorkingWeight: 10,
      regressionFloorWeight: 5,
      prWeight: 0,
      lastCountedAt: null,
      lastLoggedAt: null
    });

    // 1. First session: 100 lbs (Sets PR)
    const s1Id = await repository.addSession({
      date: 1000,
      pillarsPerformed: [{ pillarId: pId, name: 'P', weight: 100, counted: true, isPR: true, warning: false }],
      accessoriesPerformed: []
    });

    // 2. Second session: 150 lbs (New PR)
    const s2Id = await repository.addSession({
      date: 2000,
      pillarsPerformed: [{ pillarId: pId, name: 'P', weight: 150, counted: true, isPR: true, warning: false }],
      accessoriesPerformed: []
    });

    let pillar = await repository.getPillarById(pId);
    expect(pillar?.prWeight).toBe(150);
    expect(pillar?.lastLoggedAt).toBe(2000);

    // 3. Delete the 150 lbs session
    await repository.deleteSession(s2Id);

    // 4. Verify PR rolled back to 100 lbs
    pillar = await repository.getPillarById(pId);
    expect(pillar?.prWeight).toBe(100);
    expect(pillar?.lastLoggedAt).toBe(1000);

    // 5. Delete the 100 lbs session
    await repository.deleteSession(s1Id);

    // 6. Verify stats are reset
    pillar = await repository.getPillarById(pId);
    expect(pillar?.prWeight).toBe(0);
    expect(pillar?.lastLoggedAt).toBe(null);

    await repository.clearPillars();
  });

  it('recalculates PR correctly when session weights are updated', async () => {
    const pId = 'update-weight-test';
    await repository.putPillar({
      id: pId,
      name: 'Weight Test',
      muscleGroup: 'Push',
      cadenceDays: 5,
      minWorkingWeight: 10,
      regressionFloorWeight: 5,
      prWeight: 0,
      lastCountedAt: null,
      lastLoggedAt: null
    });

    const sId = await repository.addSession({
      date: 1000,
      pillarsPerformed: [{ pillarId: pId, name: 'P', weight: 100, counted: true, isPR: true, warning: false }],
      accessoriesPerformed: []
    });

    let pillar = await repository.getPillarById(pId);
    expect(pillar?.prWeight).toBe(100);

    // Update weight from 100 to 120
    await repository.updateSession(sId, {
      pillarsPerformed: [{ pillarId: pId, name: 'P', weight: 120, counted: true, isPR: true, warning: false }]
    });

    pillar = await repository.getPillarById(pId);
    expect(pillar?.prWeight).toBe(120);

    // Update weight from 120 down to 80
    await repository.updateSession(sId, {
      pillarsPerformed: [{ pillarId: pId, name: 'P', weight: 80, counted: true, isPR: false, warning: false }]
    });

    pillar = await repository.getPillarById(pId);
    expect(pillar?.prWeight).toBe(80);

    await repository.clearPillars();
    await repository.clearSessions();
  });

  describe('totalWorkouts counter', () => {
    it('increments totalWorkouts for tracked sessions', async () => {
      const pId = 'count-test-tracked';
      await repository.putPillar({
        id: pId,
        name: 'Count Test',
        muscleGroup: 'Push',
        cadenceDays: 5,
        minWorkingWeight: 10,
        regressionFloorWeight: 5,
        prWeight: 0,
        lastCountedAt: null,
        lastLoggedAt: null,
        totalWorkouts: 0
      });

      await repository.addSession({
        date: 1000,
        pillarsPerformed: [{ pillarId: pId, name: 'P', weight: 100, counted: true, isPR: true, warning: false }],
        accessoriesPerformed: [],
        isUntracked: false
      });

      let pillar = await repository.getPillarById(pId);
      expect(pillar?.totalWorkouts).toBe(1);

      await repository.addSession({
        date: 2000,
        pillarsPerformed: [{ pillarId: pId, name: 'P', weight: 110, counted: true, isPR: true, warning: false }],
        accessoriesPerformed: []
      });

      pillar = await repository.getPillarById(pId);
      expect(pillar?.totalWorkouts).toBe(2);
    });

    it('does not increment totalWorkouts for untracked sessions', async () => {
      const pId = 'count-test-untracked';
      await repository.putPillar({
        id: pId,
        name: 'Untracked Test',
        muscleGroup: 'Push',
        cadenceDays: 5,
        minWorkingWeight: 10,
        regressionFloorWeight: 5,
        prWeight: 0,
        lastCountedAt: null,
        lastLoggedAt: null,
        totalWorkouts: 0
      });

      await repository.addSession({
        date: 1000,
        pillarsPerformed: [{ pillarId: pId, name: 'P', weight: 100, counted: true, isPR: true, warning: false }],
        accessoriesPerformed: [],
        isUntracked: true
      });

      const pillar = await repository.getPillarById(pId);
      expect(pillar?.totalWorkouts).toBe(0);
    });

    it('decrements totalWorkouts when a session is deleted', async () => {
      const pId = 'count-test-delete';
      await repository.putPillar({
        id: pId,
        name: 'Delete Test',
        muscleGroup: 'Push',
        cadenceDays: 5,
        minWorkingWeight: 10,
        regressionFloorWeight: 5,
        prWeight: 0,
        lastCountedAt: null,
        lastLoggedAt: null,
        totalWorkouts: 0
      });

      const sId = await repository.addSession({
        date: 1000,
        pillarsPerformed: [{ pillarId: pId, name: 'P', weight: 100, counted: true, isPR: true, warning: false }],
        accessoriesPerformed: []
      });

      let pillar = await repository.getPillarById(pId);
      expect(pillar?.totalWorkouts).toBe(1);

      await repository.deleteSession(sId);

      pillar = await repository.getPillarById(pId);
      expect(pillar?.totalWorkouts).toBe(0);
    });

    it('resets totalWorkouts when minWorkingWeight increases above historical session weights', async () => {
      const pId = 'count-test-weight-increase';
      await repository.putPillar({
        id: pId,
        name: 'Weight Filter Test',
        muscleGroup: 'Push',
        cadenceDays: 5,
        minWorkingWeight: 100,
        regressionFloorWeight: 50,
        prWeight: 0,
        lastCountedAt: null,
        lastLoggedAt: null,
        totalWorkouts: 0
      });

      // Session at 100 lbs
      await repository.addSession({
        date: 1000,
        pillarsPerformed: [{ pillarId: pId, name: 'P', weight: 100, counted: true, isPR: true, warning: false }],
        accessoriesPerformed: []
      });

      let pillar = await repository.getPillarById(pId);
      expect(pillar?.totalWorkouts).toBe(1);

      // Increase minWorkingWeight to 110 lbs. 
      // Existing session (100 lbs) should no longer count.
      await repository.updatePillar(pId, { minWorkingWeight: 110 });
      // updatePillar triggers recalculatePillarStats internally
      
      pillar = await repository.getPillarById(pId);
      expect(pillar?.totalWorkouts).toBe(0);

      // New session at 115 lbs should count
      await repository.addSession({
        date: 2000,
        pillarsPerformed: [{ pillarId: pId, name: 'P', weight: 115, counted: true, isPR: true, warning: false }],
        accessoriesPerformed: []
      });

      pillar = await repository.getPillarById(pId);
      expect(pillar?.totalWorkouts).toBe(1);
    });
  });

  it('recalculates latest date correctly when session dates are updated', async () => {
    const pId = 'update-date-test';
    await repository.putPillar({
      id: pId,
      name: 'Date Test',
      muscleGroup: 'Push',
      cadenceDays: 5,
      minWorkingWeight: 10,
      regressionFloorWeight: 5,
      prWeight: 0,
      lastCountedAt: null,
      lastLoggedAt: null
    });

    const sId = await repository.addSession({
      date: 5000,
      pillarsPerformed: [{ pillarId: pId, name: 'P', weight: 100, counted: true, isPR: true, warning: false }],
      accessoriesPerformed: []
    });

    let pillar = await repository.getPillarById(pId);
    expect(pillar?.lastLoggedAt).toBe(5000);

    // Update date to be earlier
    await repository.updateSession(sId, { date: 3000 });
    pillar = await repository.getPillarById(pId);
    expect(pillar?.lastLoggedAt).toBe(3000);

    // Add a second, later session
    await repository.addSession({
      date: 7000,
      pillarsPerformed: [{ pillarId: pId, name: 'P', weight: 100, counted: true, isPR: true, warning: false }],
      accessoriesPerformed: []
    });

    pillar = await repository.getPillarById(pId);
    expect(pillar?.lastLoggedAt).toBe(7000);

    await repository.clearPillars();
    await repository.clearSessions();
  });

  describe('custom exercise creation', () => {
    it('validates pillar name uniqueness case-insensitively', async () => {
      await repository.createPillar({ name: 'Unique Pillar', muscleGroup: 'Push', cadenceDays: 7 });
      expect(await repository.isPillarNameUnique('Unique Pillar')).toBe(false);
      expect(await repository.isPillarNameUnique('unique pillar')).toBe(false);
      expect(await repository.isPillarNameUnique('Different Pillar')).toBe(true);
      await repository.clearPillars();
    });

    it('creates a pillar with correct initial stats', async () => {
      const id = await repository.createPillar({ name: 'New Pillar', muscleGroup: 'Legs', cadenceDays: 10 });
      const p = await repository.getPillarById(id);
      expect(p?.isActive).toBe(true);
      expect(p?.prWeight).toBe(0);
      expect(p?.minWorkingWeight).toBe(0);
      expect(p?.lastCountedAt).toBe(null);
      await repository.clearPillars();
    });

    it('creates a pillar with notes', async () => {
      const id = await repository.createPillar({ 
        name: 'Notes Pillar', 
        muscleGroup: 'Legs', 
        cadenceDays: 10,
        notes: 'These are some coaching notes'
      });
      const p = await repository.getPillarById(id);
      expect(p?.notes).toBe('These are some coaching notes');
      await repository.clearPillars();
    });

    it('updates a pillar with notes using updatePillar', async () => {
      const id = await repository.createPillar({ 
        name: 'Update Notes Pillar', 
        muscleGroup: 'Push', 
        cadenceDays: 7 
      });
      await repository.updatePillar(id, { notes: 'Updated note' });
      const p = await repository.getPillarById(id);
      expect(p?.notes).toBe('Updated note');
      await repository.clearPillars();
    });

    it('validates accessory name uniqueness', async () => {
      await repository.createAccessory('Unique Accessory');
      expect(await repository.isAccessoryNameUnique('Unique Accessory')).toBe(false);
      expect(await repository.isAccessoryNameUnique('New Accessory')).toBe(true);
      await repository.clearAccessories();
    });

    it('creates an accessory correctly', async () => {
      const id = await repository.createAccessory('New Accessory');
      const accs = await repository.getAllAccessories();
      expect(accs.some(a => a.id === id && a.name === 'New Accessory')).toBe(true);
      await repository.clearAccessories();
    });

    it('handles whitespace in uniqueness checks', async () => {
      await repository.createPillar({ name: ' Space Pillar ', muscleGroup: 'Push', cadenceDays: 7 });
      expect(await repository.isPillarNameUnique('Space Pillar')).toBe(false);
      expect(await repository.isPillarNameUnique('  space pillar  ')).toBe(false);
      await repository.clearPillars();
    });

        it('ensures accessories also handle case-insensitive uniqueness', async () => {

          await repository.createAccessory('Case Accessory');

          expect(await repository.isAccessoryNameUnique('case accessory')).toBe(false);

          await repository.clearAccessories();

        });

      });

    

      describe('configuration', () => {

        it('can update and retrieve lastSyncedAt', async () => {

          const initialConfig = await repository.getConfig();

          const testTimestamp = 123456789;

          

          if (initialConfig) {

            await repository.updateLastSyncedAt(testTimestamp);

            const updatedConfig = await repository.getConfig();

            expect(updatedConfig?.lastSyncedAt).toBe(testTimestamp);

          } else {

            // Handle case where config might not exist in test env yet

            await repository.putConfig({ id: 'main', targetExercisesPerSession: 4, lastSyncedAt: testTimestamp });

            const newConfig = await repository.getConfig();

            expect(newConfig?.lastSyncedAt).toBe(testTimestamp);

          }

            });

          });

        

          describe('edge cases and concurrency', () => {

            it('handles "Get" methods with empty database', async () => {

              await repository.clearPillars();

              await repository.clearAccessories();

              await repository.clearSessions();

              

              expect(await repository.getAllPillars()).toEqual([]);

              expect(await repository.getActivePillars()).toEqual([]);

              expect(await repository.getAllAccessories()).toEqual([]);

              expect(await repository.getAllSessions()).toEqual([]);

              expect(await repository.getSessionCount()).toBe(0);

              expect(await repository.getPillarById('non-existent')).toBeUndefined();

            });

        

            it('handles concurrent pillar updates safely', async () => {

              const pId = 'concurrent-test';

              await repository.putPillar({

                id: pId, name: 'Initial', muscleGroup: 'Push', cadenceDays: 5,

                minWorkingWeight: 10, regressionFloorWeight: 5, prWeight: 0,

                lastCountedAt: null, lastLoggedAt: null

              });

        

              // Fire multiple updates in parallel

              await Promise.all([

                repository.updatePillar(pId, { name: 'Update 1' }),

                repository.updatePillar(pId, { notes: 'Note 2' }),

                repository.updatePillar(pId, { minWorkingWeight: 50 })

              ]);

        

              const final = await repository.getPillarById(pId);

              // All fields should ideally be updated (Dexie handles this via internal transactions)

              expect(final?.name).toBe('Update 1');

              expect(final?.notes).toBe('Note 2');

              expect(final?.minWorkingWeight).toBe(50);

            });

        

            it('handles recalculatePillarStats with no sessions', async () => {

                const pId = 'no-sessions-test';

                await repository.putPillar({

                    id: pId, name: 'No Sessions', muscleGroup: 'Push', cadenceDays: 5,

                    minWorkingWeight: 10, regressionFloorWeight: 5, prWeight: 100,

                    lastCountedAt: 500, lastLoggedAt: 500

                });

        

                // Trigger recalculation for a pillar with no actual session data

                // We need to use a private method, so we cast to any or trigger via a delete

                const sId = await repository.addSession({ 

                    date: 1000, 

                    pillarsPerformed: [{ pillarId: pId, name: 'P', weight: 150, counted: true, isPR: true, warning: false }],

                    accessoriesPerformed: []

                });

                

                await repository.deleteSession(sId);

                

                        const pillar = await repository.getPillarById(pId);

                

                        expect(pillar?.prWeight).toBe(0);

                

                        expect(pillar?.lastCountedAt).toBeNull();

                

                    });

                

                

                

                    it('triggers sync listener on changes', async () => {

                

                        const listener = vi.fn().mockResolvedValue(undefined);

                

                        repository.setSyncListener(listener);

                

                        

                

                        await repository.createAccessory('Sync Test Acc');

                

                        expect(listener).toHaveBeenCalled();

                

                        

                

                        repository.setSyncListener(null as any);

                

                    });

                

                

                

                    it('handles clear methods', async () => {

                

                        await repository.createPillar({ name: 'Clear Me', muscleGroup: 'Push', cadenceDays: 7 });

                

                        await repository.clearPillars();

                

                        expect(await repository.getAllPillars()).toHaveLength(0);

                

                        

                

                        await repository.createAccessory('Clear Me Acc');

                

                        await repository.clearAccessories();

                

                        expect(await repository.getAllAccessories()).toHaveLength(0);

                

                    });

                

                

                

                    it('runs transactions correctly', async () => {

                

                        const result = await repository.runTransaction('rw', ['pillars'], async () => {

                

                            await repository.createPillar({ name: 'Tx Pillar', muscleGroup: 'Push', cadenceDays: 7 });

                

                            return 'done';

                

                        });

                

                        expect(result).toBe('done');

                

                        expect(await repository.getAllPillars()).toHaveLength(1);

                

                    });

                

                  });

                

                });

                

                

        

    