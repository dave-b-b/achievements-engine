/**
 * AsyncStorageAdapter Tests
 */

import { AsyncStorageAdapter } from '../../src/storage/AsyncStorageAdapter';
import type { AsyncAchievementStorage, AchievementMetrics } from '../../src/types';

// Mock async storage
class MockAsyncStorage implements AsyncAchievementStorage {
  private metrics: AchievementMetrics = {};
  private unlocked: string[] = [];
  private delay: number;

  constructor(delay = 0) {
    this.delay = delay;
  }

  async getMetrics(): Promise<AchievementMetrics> {
    await this.wait();
    return this.metrics;
  }

  async setMetrics(metrics: AchievementMetrics): Promise<void> {
    await this.wait();
    this.metrics = metrics;
  }

  async getUnlockedAchievements(): Promise<string[]> {
    await this.wait();
    return this.unlocked;
  }

  async setUnlockedAchievements(achievements: string[]): Promise<void> {
    await this.wait();
    this.unlocked = achievements;
  }

  async clear(): Promise<void> {
    await this.wait();
    this.metrics = {};
    this.unlocked = [];
  }

  private async wait(): Promise<void> {
    if (this.delay > 0) {
      return new Promise((resolve) => setTimeout(resolve, this.delay));
    }
  }
}

describe('AsyncStorageAdapter', () => {
  let mockStorage: MockAsyncStorage;
  let adapter: AsyncStorageAdapter;

  beforeEach(() => {
    mockStorage = new MockAsyncStorage(10);
    adapter = new AsyncStorageAdapter(mockStorage);
  });

  test('should wrap async storage with sync interface', async () => {
    // Wait for initialization
    await new Promise((resolve) => setTimeout(resolve, 50));

    const metrics: AchievementMetrics = { score: [100] };
    adapter.setMetrics(metrics);

    // Should return immediately from cache
    const retrieved = adapter.getMetrics();
    expect(retrieved).toEqual(metrics);
  });

  test('should use optimistic caching', async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Set metrics should update cache immediately
    adapter.setMetrics({ score: [100] });

    // Should be available immediately (before async write completes)
    expect(adapter.getMetrics()).toEqual({ score: [100] });
  });

  test('should return cached values immediately', async () => {
    // Pre-populate storage
    await mockStorage.setMetrics({ score: [100] });
    await mockStorage.setUnlockedAchievements(['achievement1']);

    // Create new adapter
    const newAdapter = new AsyncStorageAdapter(mockStorage);

    // Wait for cache to load
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Should return immediately from cache
    const metrics = newAdapter.getMetrics();
    const unlocked = newAdapter.getUnlockedAchievements();

    expect(metrics).toEqual({ score: [100] });
    expect(unlocked).toEqual(['achievement1']);
  });

  test('should persist in background', async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));

    adapter.setMetrics({ score: [100] });

    // Flush pending writes
    await (adapter as any).flush();

    // Verify persisted
    const persisted = await mockStorage.getMetrics();
    expect(persisted).toEqual({ score: [100] });
  });

  test('should handle async errors with callback', async () => {
    const errorCallback = jest.fn();
    const failingStorage: AsyncAchievementStorage = {
      getMetrics: jest.fn().mockRejectedValue(new Error('Storage error')),
      setMetrics: jest.fn().mockRejectedValue(new Error('Write error')),
      getUnlockedAchievements: jest.fn().mockResolvedValue([]),
      setUnlockedAchievements: jest.fn().mockRejectedValue(new Error('Write error')),
      clear: jest.fn().mockRejectedValue(new Error('Clear error')),
    };

    const errorAdapter = new AsyncStorageAdapter(failingStorage, { onError: errorCallback });

    // Wait for initialization error
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Should have called error callback during initialization
    expect(errorCallback).toHaveBeenCalled();
  });

  test('should not block on read operations', async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));

    // This should return immediately even though async storage is slow
    const start = Date.now();
    const metrics = adapter.getMetrics();
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(10);
    expect(metrics).toEqual({});
  });

  test('should handle unlocked achievements', async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));

    adapter.setUnlockedAchievements(['achievement1', 'achievement2']);

    // Should be available immediately
    const unlocked = adapter.getUnlockedAchievements();
    expect(unlocked).toEqual(['achievement1', 'achievement2']);

    // Wait for background write
    await (adapter as any).flush();

    // Verify persisted
    const persisted = await mockStorage.getUnlockedAchievements();
    expect(persisted).toEqual(['achievement1', 'achievement2']);
  });

  test('should clear cache and storage', async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));

    adapter.setMetrics({ score: [100] });
    adapter.setUnlockedAchievements(['achievement1']);

    adapter.clear();

    // Cache should be cleared immediately
    expect(adapter.getMetrics()).toEqual({});
    expect(adapter.getUnlockedAchievements()).toEqual([]);

    // Wait for background clear
    await (adapter as any).flush();

    // Verify storage cleared
    expect(await mockStorage.getMetrics()).toEqual({});
    expect(await mockStorage.getUnlockedAchievements()).toEqual([]);
  });
});
