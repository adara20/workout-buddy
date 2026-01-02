import { describe, it, expect, vi, beforeEach } from 'vitest';
import { uploadToCloud, downloadFromCloud } from './cloud-rest';
import { repository } from './repository';
import { getToken } from './auth';
import { auth } from './firebase-config';

vi.mock('./repository', () => ({
  repository: {
    getAllPillars: vi.fn(),
    getAllAccessories: vi.fn(),
    getAllSessions: vi.fn(),
    getConfig: vi.fn(),
    runTransaction: vi.fn((mode, tables, fn) => fn()),
    clearPillars: vi.fn(),
    bulkPutPillars: vi.fn(),
    clearAccessories: vi.fn(),
    bulkPutAccessories: vi.fn(),
    clearSessions: vi.fn(),
    bulkPutSessions: vi.fn(),
    putConfig: vi.fn()
  }
}));

vi.mock('./auth', () => ({
  getToken: vi.fn()
}));

vi.mock('./firebase-config', () => ({
  auth: {
    currentUser: { uid: 'test-uid' }
  }
}));

// Mock global fetch
global.fetch = vi.fn();

describe('Cloud REST Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getToken as any).mockResolvedValue('test-token');
  });

  describe('uploadToCloud', () => {
    it('successfully uploads data', async () => {
      (repository.getAllPillars as any).mockResolvedValue([{ id: 'p1' }]);
      (repository.getAllAccessories as any).mockResolvedValue([{ id: 'a1' }]);
      (repository.getAllSessions as any).mockResolvedValue([{ date: 123 }]);
      (repository.getConfig as any).mockResolvedValue({ id: 'main' });
      (global.fetch as any).mockResolvedValue({ ok: true });

      await uploadToCloud();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/users/test-uid.json?auth=test-token'),
        expect.objectContaining({
          method: 'PUT',
          body: expect.stringContaining('"pillars":[{"id":"p1"}]')
        })
      );
    });

    it('throws error on failed response', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: () => Promise.resolve('Invalid token')
      });

      await expect(uploadToCloud()).rejects.toThrow('Upload failed: 401 Unauthorized - Invalid token');
    });
  });

  describe('downloadFromCloud', () => {
    it('successfully downloads and overwrites local data', async () => {
      const mockCloudData = {
        pillars: [{ id: 'cloud-p1' }],
        accessories: [{ id: 'cloud-a1' }],
        sessions: [{ date: 456 }],
        config: { targetExercisesPerSession: 5 },
        updatedAt: 999
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockCloudData)
      });

      const result = await downloadFromCloud();

      expect(result).toBe(true);
      expect(repository.clearPillars).toHaveBeenCalled();
      expect(repository.bulkPutPillars).toHaveBeenCalledWith(mockCloudData.pillars);
      expect(repository.putConfig).toHaveBeenCalledWith(expect.objectContaining({
        targetExercisesPerSession: 5,
        id: 'main'
      }));
    });

    it('returns false if no data exists in cloud', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(null)
      });

      const result = await downloadFromCloud();
      expect(result).toBe(false);
      expect(repository.clearPillars).not.toHaveBeenCalled();
    });
  });
});
