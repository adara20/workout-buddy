
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import App from '../App';
import { initOnce } from '../db';

vi.mock('../db', () => ({
  initOnce: vi.fn(),
}));

describe('Error Handling and Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders error screen when database fails to initialize', async () => {
    (initOnce as any).mockRejectedValue(new Error('IndexedDB blocked'));

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Database Error')).toBeInTheDocument();
      expect(screen.getByText('IndexedDB blocked')).toBeInTheDocument();
    });

    expect(screen.getByText('RETRY')).toBeInTheDocument();
  });

  it('allows retrying when database initialization fails', async () => {
    (initOnce as any).mockRejectedValue(new Error('Failed'));
    
    // Use vi.stubGlobal or spyOn for location
    const reloadSpy = vi.fn();
    vi.stubGlobal('location', { reload: reloadSpy });

    render(<App />);

    await waitFor(() => screen.getByText('RETRY'));
    fireEvent.click(screen.getByText('RETRY'));

    expect(reloadSpy).toHaveBeenCalled();
    
    vi.unstubAllGlobals();
  });

  it('shows storage volatile warning on Dashboard when storage is not persisted', async () => {
    const { repository } = await import('../services/repository');
    vi.mock('../services/repository', () => ({
      repository: {
        getConfig: vi.fn(),
        getActivePillars: vi.fn().mockResolvedValue([]),
        getAllSessions: vi.fn().mockResolvedValue([]),
        setSyncListener: vi.fn()
      }
    }));

    (initOnce as any).mockResolvedValue(undefined);
    (repository.getConfig as any).mockResolvedValue({ 
        id: 'main', 
        targetExercisesPerSession: 4, 
        storagePersisted: false 
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Storage is volatile/i)).toBeInTheDocument();
    });
    
    expect(screen.getByText(/Back Up/i)).toBeInTheDocument();
  });
});
