import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import React from 'react';
import App from '../../App';
import { repository } from '../../services/repository';
import { db } from '../../db';
import { createMockPillar } from '../factories';

describe('Weight Filtered Workout Count Integration', () => {
  const PILLAR_ID = 'test-pillar';
  
  beforeEach(async () => {
    await db.open();
    await Promise.all([
      db.pillars.clear(),
      db.table('workout_sessions').clear(),
      db.accessories.clear(),
      db.config.clear(),
    ]);

    const testPillar = createMockPillar({ 
        id: PILLAR_ID, 
        name: 'Test Pillar', 
        muscleGroup: 'Push', 
        prWeight: 100,
        minWorkingWeight: 100,
        cadenceDays: 7,
        lastCountedAt: null,
        totalWorkouts: 0
    });
    await repository.putPillar(testPillar);
    await repository.putConfig({ id: 'main', targetExercisesPerSession: 4, appDataVersion: 999 });
  });

  it('correctly filters workout count based on minWorkingWeight', async () => {
    render(<App />);

    // 1. Initial Check (Count should be 0)
    await waitFor(() => expect(screen.getByText('Test Pillar')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Test Pillar'));
    
    // In Detail Overlay
    await waitFor(() => expect(screen.getByText('Count')).toBeInTheDocument());
    const initialCount = within(screen.getByText('Count').closest('.rounded-2xl')!).getByText('0');
    expect(initialCount).toBeInTheDocument();
    
    // Start workout FROM the overlay
    fireEvent.click(screen.getByText(/START SESSION/i));

    // 2. Setup Session
    await waitFor(() => expect(screen.getByText('Setup Session')).toBeInTheDocument());
    
    // Wait for pillar to load and ensure it is selected
    await waitFor(async () => {
        const pillarBtn = screen.getByText('Test Pillar').closest('button');
        expect(pillarBtn).toBeInTheDocument();
        if (!within(pillarBtn!).queryByText('ACTIVE')) {
            fireEvent.click(pillarBtn!);
        }
        expect(within(pillarBtn!).getByText('ACTIVE')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('START WORKOUT'));

    // 3. Active Session
    await waitFor(() => expect(screen.getByText('Logging Pillars')).toBeInTheDocument());
    const entry = screen.getByText('Test Pillar').closest('.bg-gray-900');
    
    // Weight starts at minWorkingWeight (100). Decrease to 80 (4 clicks of -5)
    const minusFive = within(entry as HTMLElement).getByText('-5');
    fireEvent.click(minusFive);
    fireEvent.click(minusFive);
    fireEvent.click(minusFive);
    fireEvent.click(minusFive);
    await waitFor(() => expect(within(entry as HTMLElement).getByText('80')).toBeInTheDocument());

    fireEvent.click(screen.getByText('FINISH & SAVE SESSION'));
    await waitFor(() => expect(screen.getByText('Workout Complete!')).toBeInTheDocument());
    fireEvent.click(screen.getByText(/BACK TO DASHBOARD/));

    // 4. Verify Count is still 0
    await waitFor(() => expect(screen.getByText('Test Pillar')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Test Pillar'));
    await waitFor(() => {
        const countValue = within(screen.getByText('Count').closest('.rounded-2xl')!).getByText('0');
        expect(countValue).toBeInTheDocument();
    });
    
    // Go to setup again
    fireEvent.click(screen.getByText(/START SESSION/i));

    // 5. Setup again
    await waitFor(() => expect(screen.getByText('Setup Session')).toBeInTheDocument());
    // Ensure selected
    await waitFor(async () => {
        const pillarBtn = screen.getByText('Test Pillar').closest('button');
        expect(pillarBtn).toBeInTheDocument();
        if (!within(pillarBtn!).queryByText('ACTIVE')) {
            fireEvent.click(pillarBtn!);
        }
        expect(within(pillarBtn!).getByText('ACTIVE')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('START WORKOUT'));

    // 6. Active Session - Log AT minWorkingWeight (100 lbs)
    await waitFor(() => expect(screen.getByText('Logging Pillars')).toBeInTheDocument());
    // Weight should default to 100 (minWorkingWeight)
    const entry2 = screen.getByText('Test Pillar').closest('.bg-gray-900');
    await waitFor(() => expect(within(entry2 as HTMLElement).getByText('100')).toBeInTheDocument());

    fireEvent.click(screen.getByText('FINISH & SAVE SESSION'));
    await waitFor(() => expect(screen.getByText('Workout Complete!')).toBeInTheDocument());
    fireEvent.click(screen.getByText(/BACK TO DASHBOARD/));

    // 7. Verify Count is now 1
    await waitFor(() => expect(screen.getByText('Test Pillar')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Test Pillar'));
    await waitFor(() => {
        const countValue = within(screen.getByText('Count').closest('.rounded-2xl')!).getByText('1');
        expect(countValue).toBeInTheDocument();
    });
  });
});