import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Settings from './Settings';
import { repository } from '../services/repository';
import { createMockPillar } from '../tests/factories';
import { onAuthChange, signOut } from '../services/auth';
import { uploadToCloud, downloadFromCloud } from '../services/cloud-rest';

vi.mock('../services/repository', () => ({
  repository: {
    getActivePillars: vi.fn(),
    getAllPillars: vi.fn(),
    getAllAccessories: vi.fn(),
    getConfig: vi.fn(),
    getSessionCount: vi.fn(),
    getAccessoryCount: vi.fn(),
    putConfig: vi.fn(),
    putPillar: vi.fn(),
    isPillarNameUnique: vi.fn(),
    createPillar: vi.fn(),
    isAccessoryNameUnique: vi.fn(),
    createAccessory: vi.fn(),
    updateConfig: vi.fn(),
    archivePillar: vi.fn(),
    restorePillar: vi.fn(),
    deleteDatabase: vi.fn(),
    updateLastSyncedAt: vi.fn(),
  },
}));

vi.mock('../services/auth', () => ({
  onAuthChange: vi.fn(),
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock('../services/cloud-rest', () => ({
  uploadToCloud: vi.fn(),
  downloadFromCloud: vi.fn(),
}));

vi.mock('../db', () => ({
  initOnce: vi.fn(),
}));

describe('Settings Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (repository.getActivePillars as any).mockResolvedValue([
        createMockPillar({ id: 'p1', name: 'Squat', isActive: true })
    ]);
    (repository.getAllAccessories as any).mockResolvedValue([]);
    (repository.getConfig as any).mockResolvedValue({ targetExercisesPerSession: 4 });
    (repository.getSessionCount as any).mockResolvedValue(10);
    (repository.getAccessoryCount as any).mockResolvedValue(5);
    (onAuthChange as any).mockImplementation((cb: any) => {
      cb(null);
      return () => {};
    });
    
    // Mock navigator.storage
    if (!navigator.storage) {
        (navigator as any).storage = {};
    }
    (navigator.storage as any).estimate = vi.fn().mockResolvedValue({ usage: 1024 * 1024 });
    (navigator.storage as any).persisted = vi.fn().mockResolvedValue(true);
  });

  it('renders stats and config', async () => {
    render(<Settings />);
    
    await waitFor(() => {
      expect(screen.getByText(/10\s*Sessions/i)).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument();
      expect(screen.getByText('Squat')).toBeInTheDocument();
    });
  });

  it('shows auth form when Sign In is clicked', async () => {
    render(<Settings />);
    
    await waitFor(() => screen.getByText(/Not Signed In/i));
    const signInBtn = screen.getByRole('button', { name: /Sign In/i });
    fireEvent.click(signInBtn);

    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
  });

  it('shows cloud sync actions when logged in', async () => {
    (onAuthChange as any).mockImplementation((cb: any) => {
      cb({ email: 'test@example.com', uid: '123' });
      return () => {};
    });

    render(<Settings />);
    
    await waitFor(() => screen.getByText(/Cloud Connected/i));
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Push/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Pull/i })).toBeInTheDocument();
  });

  it('calls signOut when Sign Out is clicked', async () => {
    (onAuthChange as any).mockImplementation((cb: any) => {
      cb({ email: 'test@example.com', uid: '123' });
      return () => {};
    });

    render(<Settings />);
    
    await waitFor(() => screen.getByText(/Sign Out/i));
    const signOutBtn = screen.getByText(/Sign Out/i);
    fireEvent.click(signOutBtn);

    expect(signOut).toHaveBeenCalled();
  });

  it('increments target exercises', async () => {
    render(<Settings />);
    
    await waitFor(() => screen.getByText('4'));

    const plusBtn = screen.getByText('+');
    fireEvent.click(plusBtn);

    expect(repository.putConfig).toHaveBeenCalledWith(expect.objectContaining({
      targetExercisesPerSession: 5
    }));
  });

  it('calls archivePillar when archive button is clicked', async () => {
    const { container } = render(<Settings />);
    window.confirm = vi.fn().mockReturnValue(true);

    await waitFor(() => screen.getByText('Squat'));
    
    const archiveBtn = container.querySelector('.lucide-archive')?.closest('button');
    fireEvent.click(archiveBtn!);

    expect(window.confirm).toHaveBeenCalled();
    expect(repository.archivePillar).toHaveBeenCalledWith('p1');
  });

  it('saves changes only when Save is clicked', async () => {
    (repository.getAllAccessories as any).mockResolvedValue([
      { id: 'acc1', name: 'Dips', tags: [] }
    ]);
    (repository.getActivePillars as any).mockResolvedValue([
      createMockPillar({ id: 'p1', name: 'Bench', preferredAccessoryIds: [] })
    ]);

    render(<Settings />);
    
    await waitFor(() => screen.getByText('Bench'));
    
    // Open edit mode
    const editBtn = screen.getByTitle('Edit Pillar');
    fireEvent.click(editBtn);

    // Toggle accessory
    const accBtn = await screen.findByText('Dips');
    fireEvent.click(accBtn);

    // Should NOT have called putPillar yet
    expect(repository.putPillar).not.toHaveBeenCalled();

    // Click Save
    const saveBtn = screen.getByText('Save');
    fireEvent.click(saveBtn);

    // NOW it should be called
    expect(repository.putPillar).toHaveBeenCalledWith(expect.objectContaining({
      id: 'p1',
      preferredAccessoryIds: ['acc1']
    }));
  });

  it('updates overload tracking configuration', async () => {
    (repository.getActivePillars as any).mockResolvedValue([
      createMockPillar({ id: 'p1', name: 'Bench', enableOverloadTracking: false })
    ]);

    render(<Settings />);
    
    await waitFor(() => screen.getByText('Bench'));
    
    // Open edit mode
    const editBtn = screen.getByTitle('Edit Pillar');
    fireEvent.click(editBtn);

    // Find and click the toggle
    const toggle = screen.getByLabelText(/Progressive Overload Tracking/i);
    expect(toggle).not.toBeChecked();
    fireEvent.click(toggle);
    expect(toggle).toBeChecked();

    // Threshold input should appear
    const input = screen.getByLabelText(/Sessions to Mastery/i);
    expect(input).toBeInTheDocument();
    fireEvent.change(input, { target: { value: '8' } });

    // Click Save
    const saveBtn = screen.getByText('Save');
    fireEvent.click(saveBtn);

    // Verify persistence
    expect(repository.putPillar).toHaveBeenCalledWith(expect.objectContaining({
      id: 'p1',
      enableOverloadTracking: true,
      overloadThreshold: 8
    }));
  });

  it('handles sync errors gracefully', async () => {
    (onAuthChange as any).mockImplementation((cb: any) => {
      cb({ email: 'test@example.com', uid: '123' });
      return () => {};
    });
    (uploadToCloud as any).mockRejectedValue(new Error('Network Error'));
    window.confirm = vi.fn().mockReturnValue(true);

    render(<Settings />);
    
    await waitFor(() => screen.getByRole('button', { name: /Push/i }));
    const pushBtn = screen.getByRole('button', { name: /Push/i });
    fireEvent.click(pushBtn);

    await waitFor(() => {
      expect(screen.getByText(/Network Error/i)).toBeInTheDocument();
    });
  });

  it('triggers factory reset flow', async () => {
    window.confirm = vi.fn().mockReturnValue(true);
    render(<Settings />);

    const resetBtn = screen.getByText(/Factory Reset/i);
    fireEvent.click(resetBtn);

    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('Wipe everything?'));
    expect(repository.deleteDatabase).toHaveBeenCalled();
  });

  it('triggers database repair flow', async () => {
    window.confirm = vi.fn().mockReturnValue(true);
    render(<Settings />);

    const repairBtn = screen.getByText(/Repair DB/i);
    fireEvent.click(repairBtn);

    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('integrity check'));
  });

  it('shows success message after successful push', async () => {
    (onAuthChange as any).mockImplementation((cb: any) => {
      cb({ email: 'test@example.com', uid: '123' });
      return () => {};
    });
    (uploadToCloud as any).mockResolvedValue(undefined);
    window.confirm = vi.fn().mockReturnValue(true);

    render(<Settings />);
    
    await waitFor(() => screen.getByRole('button', { name: /Push/i }));
    const pushBtn = screen.getByRole('button', { name: /Push/i });
    fireEvent.click(pushBtn);

    await waitFor(() => {
      expect(screen.getByText(/Pushed to cloud successfully/i)).toBeInTheDocument();
    });
  });

  it('handles successful pull from cloud', async () => {
    (onAuthChange as any).mockImplementation((cb: any) => {
      cb({ email: 'test@example.com', uid: '123' });
      return () => {};
    });
    (downloadFromCloud as any).mockResolvedValue(true);
    window.confirm = vi.fn().mockReturnValue(true);

    render(<Settings />);
    
    await waitFor(() => screen.getByRole('button', { name: /Pull/i }));
    const pullBtn = screen.getByRole('button', { name: /Pull/i });
    fireEvent.click(pullBtn);

    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('OVERWRITE LOCAL DATA'));
    await waitFor(() => {
      expect(screen.getByText(/Cloud data restored/i)).toBeInTheDocument();
    });
  });

  it('adds a new pillar through the form', async () => {
    (repository.isPillarNameUnique as any).mockResolvedValue(true);
    render(<Settings />);

    const addBtn = screen.getByText(/Add Custom Pillar/i);
    fireEvent.click(addBtn);

    const nameInput = screen.getByPlaceholderText(/e.g. Overhead Press/i);
    fireEvent.change(nameInput, { target: { value: 'New Bench' } });
    
    const submitBtn = screen.getByText(/Create Pillar/i);
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(repository.createPillar).toHaveBeenCalledWith(expect.objectContaining({
        name: 'New Bench'
      }));
    });
  });

  it('adds a new accessory through the form', async () => {
    (repository.isAccessoryNameUnique as any).mockResolvedValue(true);
    render(<Settings />);

    const addBtn = screen.getByText(/Add Custom Accessory/i);
    fireEvent.click(addBtn);

    const nameInput = screen.getByPlaceholderText(/e.g. Bicep Curls/i);
    fireEvent.change(nameInput, { target: { value: 'New Curls' } });
    
    const submitBtn = screen.getByText(/Create Accessory/i);
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(repository.createAccessory).toHaveBeenCalledWith('New Curls');
    });
  });

  it('handles unavailable storage estimation safely', async () => {
    // navigator.storage.estimate might return 0 or empty object
    (navigator.storage as any).estimate = vi.fn().mockResolvedValue({});
    (navigator.storage as any).persisted = vi.fn().mockResolvedValue(false);

    render(<Settings />);
    
    await waitFor(() => {
      expect(screen.getByText('0.00 MB')).toBeInTheDocument();
      expect(screen.getByText('Best Effort')).toBeInTheDocument();
    });
  });
});
