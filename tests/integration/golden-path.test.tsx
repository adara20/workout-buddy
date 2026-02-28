
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import React from 'react';
import App from '../../App';
import { repository } from '../../services/repository';
import { db } from '../../db';
import { createMockPillar, createMockAccessory } from '../factories';

// We want to test the REAL repository and DB logic as much as possible,
// so we don't mock 'repository' or 'db' here.
// 'fake-indexeddb' is already handled by tests/setup.ts

describe('Golden Path Integration', () => {
  beforeEach(async () => {
    // Wait for initial DB setup to complete
    await db.open();
    
    // Clear everything
    await Promise.all([
      db.pillars.clear(),
      db.table('workout_sessions').clear(),
      db.accessories.clear(),
      db.config.clear(),
    ]);

    // Seed specific test data (avoiding canonical data interference)
    const testPillar = createMockPillar({ 
        id: 'squat', 
        name: 'Back Squat', 
        muscleGroup: 'Legs', 
        prWeight: 0, // 0 ensure first logging is a PR
        minWorkingWeight: 80,
        cadenceDays: 7,
        lastCountedAt: null,
        preferredAccessoryIds: ['curls']
    });
    await repository.putPillar(testPillar);
    await repository.putAccessory(createMockAccessory({ id: 'curls', name: 'Bicep Curls' }));
    await repository.putAccessory(createMockAccessory({ id: 'legs', name: 'Leg Press' }));
    await repository.putConfig({ id: 'main', targetExercisesPerSession: 4, appDataVersion: 999 }); // High version prevents re-seeding
  });

  it('completes a full workout flow from start to history', async () => {
    render(<App />);

    // 1. Dashboard
    await waitFor(() => expect(screen.getAllByText(/Back Squat/i)[0]).toBeInTheDocument());
    expect(screen.getByText('START WORKOUT')).toBeInTheDocument();
    
    fireEvent.click(screen.getByText('START WORKOUT'));

    // 2. Setup
    await waitFor(() => expect(screen.getByText('Setup Session')).toBeInTheDocument());
    
    // Wait for pillars to load in setup (may be multiple)
    await screen.findAllByText(/Back Squat/i);
    
    // Find the Back Squat button in the rotation list
    const squatButtons = await screen.findAllByRole('button');
    const squatBtn = squatButtons.find(btn => within(btn).queryByText('Back Squat'));
    
    expect(squatBtn).toBeDefined();

    if (!within(squatBtn!).queryByText('ACTIVE')) {
        fireEvent.click(squatBtn!);
    }
    
    const startWorkoutBtn = screen.getByText('START WORKOUT');
    fireEvent.click(startWorkoutBtn);

    // 3. Active Session
    await waitFor(() => expect(screen.getByText('Logging Pillars')).toBeInTheDocument());
    
    const squatEntry = screen.getByText('Back Squat').closest('.bg-gray-900');
    expect(squatEntry).toBeInTheDocument();

    // Increment weight: 80 -> 105 (5 clicks of +5)
    const plusFive = within(squatEntry as HTMLElement).getByText('+5');
    fireEvent.click(plusFive);
    fireEvent.click(plusFive);
    fireEvent.click(plusFive);
    fireEvent.click(plusFive);
    fireEvent.click(plusFive);
    await waitFor(() => expect(within(squatEntry as HTMLElement).getByText('105')).toBeInTheDocument());

    // Verify Recommended Accessories
    expect(screen.getByText('Bicep Curls')).toBeInTheDocument();
    expect(screen.queryByText('Leg Press')).not.toBeInTheDocument();

    // Toggle Show All to see everything
    fireEvent.click(screen.getByText('Show All'));
    await waitFor(() => expect(screen.getByText('Leg Press')).toBeInTheDocument());

    // Add accessory
    const curlsBtn = screen.getByText('Bicep Curls');
    fireEvent.click(curlsBtn);

    // Finish
    fireEvent.click(screen.getByText('FINISH & SAVE SESSION'));

    // 4. Summary
    await waitFor(() => expect(screen.getByText('Workout Complete!')).toBeInTheDocument());
    expect(screen.getByText(/NEW PR/i)).toBeInTheDocument();
    expect(screen.getAllByText(/105\s*lb/i)[0]).toBeInTheDocument();

    fireEvent.click(screen.getByText(/BACK TO DASHBOARD/));

    // 5. Verify Dashboard update
    await waitFor(() => expect(screen.getByText('Workout Buddy')).toBeInTheDocument());
    
    // Wait for pillars to load on return — pillar just counted, cadenceDays=7, so daysRemaining=7
    await waitFor(() => {
        const sevenDayElements = screen.queryAllByText('7d');
        expect(sevenDayElements.length).toBeGreaterThan(0);
    }, { timeout: 2000 });

    // 6. Check History
    fireEvent.click(screen.getByText('History'));
    await waitFor(() => expect(screen.getByText('Workout History')).toBeInTheDocument());
    
    // Wait for at least one session to appear in the list
    await waitFor(() => {
        expect(screen.queryByText(/No workouts logged yet/i)).not.toBeInTheDocument();
        expect(screen.getAllByText(/Back Squat/i).length).toBeGreaterThan(0);
    }, { timeout: 2000 });

    expect(screen.getAllByText(/105lb/i)[0]).toBeInTheDocument();
    expect(screen.getByText('Bicep Curls')).toBeInTheDocument();
  });
});
