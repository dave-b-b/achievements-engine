/**
 * OfflineQueueStorage Tests
 */

import { OfflineQueueStorage } from '../../src/storage/OfflineQueueStorage';
import { MemoryStorage } from '../../src/storage/MemoryStorage';
import { AsyncStorageAdapter } from '../../src/storage/AsyncStorageAdapter';
import type { AsyncAchievementStorage, AchievementMetrics } from '../../src/types';

// Mock async storage for testing
class TestAsyncStorage implements AsyncAchievementStorage {
  private metrics: AchievementMetrics = {};
  private unlocked: string[] = [];

  async getMetrics(): Promise<AchievementMetrics> {
    return this.metrics;
  }

  async setMetrics(metrics: AchievementMetrics): Promise<void> {
    this.metrics = metrics;
  }

  async getUnlockedAchievements(): Promise<string[]> {
    return this.unlocked;
  }

  async setUnlockedAchievements(achievements: string[]): Promise<void> {
    this.unlocked = achievements;
  }

  async clear(): Promise<void> {
    this.metrics = {};
    this.unlocked = [];
  }
}

describe('OfflineQueueStorage', () => {
  let innerStorage: AsyncAchievementStorage;
  let offlineStorage: OfflineQueueStorage;

  beforeEach(() => {
    localStorage.clear();
    innerStorage = new TestAsyncStorage();
    offlineStorage = new OfflineQueueStorage(innerStorage);
  });

  afterEach(() => {
    offlineStorage.destroy();
    localStorage.clear();
  });

  test('should queue operations when offline', async () => {
    // Simulate offline
    (offlineStorage as any).isOnline = false;

    await offlineStorage.setMetrics({ score: [100] });
    await offlineStorage.setUnlockedAchievements(['achievement1']);

    const status = offlineStorage.getQueueStatus();
    expect(status.pending).toBe(2);
    expect(status.operations.length).toBe(2);
  });

  test('should flush queue when online', async () => {
    // Simulate offline
    (offlineStorage as any).isOnline = false;

    await offlineStorage.setMetrics({ score: [100] });
    await offlineStorage.setUnlockedAchievements(['achievement1']);

    // Go back online
    (offlineStorage as any).isOnline = true;
    await offlineStorage.sync();

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 100));

    const status = offlineStorage.getQueueStatus();
    expect(status.pending).toBe(0);

    // Verify data was written
    const metrics = await innerStorage.getMetrics();
    const unlocked = await innerStorage.getUnlockedAchievements();

    expect(metrics).toEqual({ score: [100] });
    expect(unlocked).toEqual(['achievement1']);
  });

  test('should handle partial flush failures', async () => {
    const failingStorage: AsyncAchievementStorage = {
      getMetrics: jest.fn().mockResolvedValue({}),
      setMetrics: jest.fn().mockRejectedValueOnce(new Error('Network error')).mockResolvedValue(undefined),
      getUnlockedAchievements: jest.fn().mockResolvedValue([]),
      setUnlockedAchievements: jest.fn().mockResolvedValue(undefined),
      clear: jest.fn().mockResolvedValue(undefined),
    };

    const storage = new OfflineQueueStorage(failingStorage);

    // Simulate offline
    (storage as any).isOnline = false;

    await storage.setMetrics({ score: [100] });
    await storage.setMetrics({ score: [200] });

    // Go online and try to sync
    (storage as any).isOnline = true;
    await storage.sync();

    // First operation should have failed, so queue should still have items
    const status = storage.getQueueStatus();
    expect(status.pending).toBeGreaterThan(0);

    storage.destroy();
  });

  test('should maintain operation order', async () => {
    const operations: string[] = [];

    const trackingStorage: AsyncAchievementStorage = {
      getMetrics: jest.fn().mockResolvedValue({}),
      setMetrics: jest.fn().mockImplementation(async () => {
        operations.push('setMetrics');
      }),
      getUnlockedAchievements: jest.fn().mockResolvedValue([]),
      setUnlockedAchievements: jest.fn().mockImplementation(async () => {
        operations.push('setUnlocked');
      }),
      clear: jest.fn().mockImplementation(async () => {
        operations.push('clear');
      }),
    };

    const storage = new OfflineQueueStorage(trackingStorage);

    // Simulate offline
    (storage as any).isOnline = false;

    await storage.setMetrics({ score: [100] });
    await storage.setUnlockedAchievements(['achievement1']);
    await storage.clear();

    // Go online and sync
    (storage as any).isOnline = true;
    await storage.sync();

    await new Promise((resolve) => setTimeout(resolve, 100));

    // Operations should be executed in order
    expect(operations).toEqual(['setMetrics', 'setUnlocked', 'clear']);

    storage.destroy();
  });

  test('should persist queue to localStorage', async () => {
    // Simulate offline
    (offlineStorage as any).isOnline = false;

    await offlineStorage.setMetrics({ score: [100] });

    // Create new instance - should load queue from localStorage
    const newStorage = new OfflineQueueStorage(innerStorage);

    const status = newStorage.getQueueStatus();
    expect(status.pending).toBeGreaterThan(0);

    newStorage.destroy();
  });

  test('should handle immediate execution when online', async () => {
    // Storage is online by default
    await offlineStorage.setMetrics({ score: [100] });

    // Wait for async operation
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Should have been executed immediately, not queued
    const status = offlineStorage.getQueueStatus();
    expect(status.pending).toBe(0);

    // Verify data was written
    const metrics = await innerStorage.getMetrics();
    expect(metrics).toEqual({ score: [100] });
  });

  test('should read from storage when online', async () => {
    await innerStorage.setMetrics({ score: [100] });

    const metrics = await offlineStorage.getMetrics();
    expect(metrics).toEqual({ score: [100] });
  });

  test('should throw error when reading offline', async () => {
    // Mock inner storage to fail (simulating network error)
    jest.spyOn(innerStorage, 'getMetrics').mockRejectedValue(new Error('Network error'));

    // Simulate offline
    (offlineStorage as any).isOnline = false;

    await expect(offlineStorage.getMetrics()).rejects.toThrow('Cannot read metrics while offline');
  });

  test('should clear queue on successful clear', async () => {
    // Simulate offline
    (offlineStorage as any).isOnline = false;

    await offlineStorage.setMetrics({ score: [100] });
    await offlineStorage.setUnlockedAchievements(['achievement1']);

    // Go online and clear
    (offlineStorage as any).isOnline = true;
    await offlineStorage.clear();

    await new Promise((resolve) => setTimeout(resolve, 100));

    const status = offlineStorage.getQueueStatus();
    expect(status.pending).toBe(0);
  });
});
