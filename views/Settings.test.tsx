import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Settings from './Settings';
import { repository } from '../services/repository';
import { createMockPillar } from '../tests/factories';

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
  },
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
    
    // Mock navigator.storage
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

  it('increments target exercises', async () => {
    render(<Settings />);
    
    await waitFor(() => screen.getByText('4'));

    const plusBtn = screen.getByText('+');
    fireEvent.click(plusBtn);

    expect(repository.putConfig).toHaveBeenCalledWith(expect.objectContaining({
      targetExercisesPerSession: 5
    }));
  });

  it('decrements target exercises', async () => {
    render(<Settings />);
    
    await waitFor(() => screen.getByText('4'));

    const minusBtn = screen.getByText('-');
    fireEvent.click(minusBtn);

    expect(repository.putConfig).toHaveBeenCalledWith(expect.objectContaining({
      targetExercisesPerSession: 3
    }));
  });

  it('shows add pillar form', async () => {
    render(<Settings />);
    
    const addBtn = screen.getByText(/Add Custom Pillar/i);
    fireEvent.click(addBtn);

    expect(screen.getByPlaceholderText(/e.g. Overhead Press/i)).toBeInTheDocument();
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

  it('discards changes when Cancel is clicked', async () => {
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

    // Change something (toggle accessory)
    const accBtn = await screen.findByText('Dips');
    fireEvent.click(accBtn);

    // Click Cancel
    const cancelBtn = screen.getByText('Cancel');
    fireEvent.click(cancelBtn);

    // Should NOT have called putPillar
    expect(repository.putPillar).not.toHaveBeenCalled();

    // The edit form should be closed (we can check by looking for the Save button which should be gone)
    expect(screen.queryByText('Save')).not.toBeInTheDocument();
  });
});