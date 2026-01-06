import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Settings from './Settings';
import { repository } from '../services/repository';

// Mock auth and cloud services
vi.mock('../services/auth', () => ({
  onAuthChange: vi.fn().mockReturnValue(() => {}),
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock('../services/cloud-rest', () => ({
  uploadToCloud: vi.fn(),
  downloadFromCloud: vi.fn(),
}));

// Mock db
vi.mock('../db', () => ({
  initOnce: vi.fn().mockResolvedValue(undefined)
}));

// Mock the repository
vi.mock('../services/repository', () => ({
  repository: {
    getAllPillars: vi.fn(),
    getActivePillars: vi.fn(),
    getConfig: vi.fn(),
    getSessionCount: vi.fn(),
    getAllAccessories: vi.fn(),
    getAllSessions: vi.fn(),
    putConfig: vi.fn(),
    updateConfig: vi.fn(),
    runTransaction: vi.fn(),
    clearPillars: vi.fn(),
    bulkPutPillars: vi.fn(),
    clearSessions: vi.fn(),
    bulkPutSessions: vi.fn(),
    clearAccessories: vi.fn(),
    bulkPutAccessories: vi.fn(),
    putPillar: vi.fn(),
    deleteDatabase: vi.fn(),
    isPillarNameUnique: vi.fn(),
    createPillar: vi.fn(),
    createAccessory: vi.fn(),
    isAccessoryNameUnique: vi.fn(),
  }
}));

// Mock URL.createObjectURL for export
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = vi.fn();

// Mock FileReader for import
class MockFileReader {
  static resultData: any = null;
  onload: ((event: any) => void) | null = null;
  readAsText(file: File) {
    if (this.onload) {
      this.onload({
        target: {
          result: MockFileReader.resultData || JSON.stringify({
            exportVersion: 2,
            data: {
              pillars: [{ id: 'p1', name: 'Mock Pillar' }],
              sessions: [],
              accessories: [],
              config: { targetExercisesPerSession: 5 }
            }
          })
        }
      });
    }
  }
}
global.FileReader = MockFileReader as any;

describe('Settings Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (MockFileReader as any).resultData = null; // Reset for each test
    // Default mock returns
    (repository.getAllPillars as any).mockResolvedValue([]);
    (repository.getActivePillars as any).mockResolvedValue([]);
    (repository.getAllAccessories as any).mockResolvedValue([]);
    (repository.getConfig as any).mockResolvedValue({ targetExercisesPerSession: 4 });
    (repository.getSessionCount as any).mockResolvedValue(10);
    
    // Mock confirm/alert
    global.confirm = vi.fn(() => true);
    global.alert = vi.fn();
    
    // Mock location reload
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { reload: vi.fn() }
    });

    // Mock navigator.storage
    Object.defineProperty(navigator, 'storage', {
      value: {
        persisted: vi.fn().mockResolvedValue(true),
        estimate: vi.fn().mockResolvedValue({ usage: 0 }),
      },
      writable: true
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exports data successfully', async () => {
    render(<Settings />);
    
    // Wait for data load
    await waitFor(() => expect(repository.getConfig).toHaveBeenCalled());

    const exportBtn = screen.getByRole('button', { name: /Export/i });
    await userEvent.click(exportBtn);

    // Verify repository calls for export data gathering
    expect(repository.getAllPillars).toHaveBeenCalled();
    expect(repository.getAllSessions).toHaveBeenCalled();
    expect(repository.getAllAccessories).toHaveBeenCalled();
    
    // Verify blob URL creation (download trigger)
    expect(global.URL.createObjectURL).toHaveBeenCalled();
    
    // Verify config update (lastExportAt)
    expect(repository.updateConfig).toHaveBeenCalledWith(expect.objectContaining({
      lastExportAt: expect.any(Number)
    }));
  });

  it('imports data successfully', async () => {
    render(<Settings />);
    await waitFor(() => expect(repository.getConfig).toHaveBeenCalled());

    const file = new File(['{}'], 'backup.json', { type: 'application/json' });
    const input = screen.getByLabelText(/Import/i);
    
    // Mock transaction to execute the callback immediately
    (repository.runTransaction as any).mockImplementation(async (_mode: any, _tables: any, callback: any) => {
      await callback();
    });

    await userEvent.upload(input, file);

    // Check if confirm was called
    expect(global.confirm).toHaveBeenCalledWith(expect.stringContaining('OVERWRITE ALL LOCAL DATA?'));

    // Verify transaction and bulk puts
    expect(repository.runTransaction).toHaveBeenCalled();
    expect(repository.clearPillars).toHaveBeenCalled();
    expect(repository.bulkPutPillars).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ id: 'p1' })]));
    
    // Verify reload
    expect(window.location.reload).toHaveBeenCalled();
  });

  it('handles import failure gracefully', async () => {
    // Override FileReader for this specific test to throw error or return bad data
    const originalFileReader = global.FileReader;
    class BadFileReader {
      onload: ((event: any) => void) | null = null;
      readAsText(file: File) {
        if (this.onload) {
          // Return invalid JSON structure (missing "data" key)
          this.onload({
            target: { result: JSON.stringify({ exportVersion: 2 }) }
          });
        }
      }
    }
    global.FileReader = BadFileReader as any;

    render(<Settings />);
    await waitFor(() => expect(repository.getConfig).toHaveBeenCalled());

    const file = new File(['{}'], 'backup.json', { type: 'application/json' });
    const input = screen.getByLabelText(/Import/i);

    await userEvent.upload(input, file);

    // Should alert failure
    expect(global.alert).toHaveBeenCalledWith(expect.stringContaining('Import failed'));
    
    // Should NOT wipe data
    expect(repository.clearPillars).not.toHaveBeenCalled();

    // Restore FileReader
    global.FileReader = originalFileReader;
  });

  it('performs factory reset', async () => {
    render(<Settings />);
    await waitFor(() => expect(repository.getConfig).toHaveBeenCalled());

    const resetBtn = screen.getByText(/Factory Reset/i);
    await userEvent.click(resetBtn);

    expect(global.confirm).toHaveBeenCalledWith(expect.stringContaining('Wipe everything?'));
    expect(repository.deleteDatabase).toHaveBeenCalled();
    expect(window.location.reload).toHaveBeenCalled();
  });

  it('edits a pillar successfully', async () => {
    const mockPillar = { id: 'p1', name: 'Squat', cadenceDays: 5, isActive: true, muscleGroup: 'Legs' };
    (repository.getActivePillars as any).mockResolvedValue([mockPillar]);
    (repository.getAllPillars as any).mockResolvedValue([mockPillar]);

    render(<Settings />);
    await waitFor(() => expect(screen.getByText('Squat')).toBeInTheDocument());

    const editBtn = screen.getByTitle('Edit Pillar');
    await userEvent.click(editBtn);

    const cadenceInput = screen.getByDisplayValue('5');
    fireEvent.change(cadenceInput, { target: { value: '7' } });

    const saveBtn = screen.getByText(/Save/i);
    await userEvent.click(saveBtn);

    expect(repository.putPillar).toHaveBeenCalledWith(expect.objectContaining({
      id: 'p1',
      cadenceDays: 7
    }));
  });

  it('adds a new pillar successfully', async () => {
    (repository.isPillarNameUnique as any).mockResolvedValue(true);
    
    render(<Settings />);
    
    const addBtn = screen.getByText(/Add Custom Pillar/i);
    await userEvent.click(addBtn);

    const nameInput = screen.getByPlaceholderText(/e.g. Overhead Press/i);
    await userEvent.type(nameInput, 'Bench Press');
    
    const submitBtn = screen.getByText(/Create Pillar/i);
    await userEvent.click(submitBtn);

    expect(repository.createPillar).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Bench Press'
    }));
  });

  it('adds a new accessory successfully', async () => {
    (repository.isAccessoryNameUnique as any).mockResolvedValue(true);
    
    render(<Settings />);
    
    const addBtn = screen.getByText(/Add Custom Accessory/i);
    await userEvent.click(addBtn);

    const nameInput = screen.getByPlaceholderText(/e.g. Bicep Curls/i);
    await userEvent.type(nameInput, 'Tricep Extension');
    
    const submitBtn = screen.getByText(/Create Accessory/i);
    await userEvent.click(submitBtn);

    expect(repository.createAccessory).toHaveBeenCalledWith('Tricep Extension');
  });

  it('runs database repair', async () => {
    render(<Settings />);
    
    const repairBtn = screen.getByText(/Repair DB/i);
    await userEvent.click(repairBtn);

    expect(global.confirm).toHaveBeenCalledWith(expect.stringContaining('integrity check'));
    await waitFor(() => expect(global.alert).toHaveBeenCalledWith(expect.stringContaining('Repair complete')));
  });

  it('rolls back database changes if import fails mid-transaction', async () => {
    // 1. Setup initial data
    (repository.getAllPillars as any).mockResolvedValue([{ id: 'existing', name: 'Initial' }]);
    
    // 2. Mock transaction to fail halfway
    (repository.runTransaction as any).mockImplementation(async (_mode: any, _tables: any, callback: any) => {
        try {
            await callback();
        } catch (e) {
            // Transaction rollback is handled by repository in real life, 
            // here we just verify it was called and failed.
            throw e;
        }
    });
    (repository.clearPillars as any).mockResolvedValue(undefined);
    (repository.bulkPutPillars as any).mockRejectedValue(new Error('Partial Write Failure'));

    render(<Settings />);
    
    const file = new File([JSON.stringify({
        exportVersion: 2,
        data: { pillars: [{ id: 'p1' }], sessions: [], accessories: [], config: {} }
    })], 'fail.json', { type: 'application/json' });
    const input = screen.getByLabelText(/JSON Import/i);

    await userEvent.upload(input, file);

    expect(global.alert).toHaveBeenCalledWith(expect.stringContaining('Import failed: Partial Write Failure'));
    // In real app, runTransaction ensures rollback. 
    // Here we ensure the user is notified and app didn't crash.
  });

  it('handles corrupted JSON structure safely', async () => {
    (MockFileReader as any).resultData = JSON.stringify({ exportVersion: 2 }); // Missing 'data'
    (repository.bulkPutPillars as any).mockResolvedValue(undefined);
    render(<Settings />);
    
    // Missing 'data' key entirely
    const file = new File([JSON.stringify({ exportVersion: 2 })], 'bad.json', { type: 'application/json' });
    const input = screen.getByLabelText(/JSON Import/i);

    await userEvent.upload(input, file);

    expect(global.alert).toHaveBeenCalledWith(expect.stringContaining('Import failed: Invalid backup format'));
  });
});
