/**
 * LocalStorage Tests
 */

import { LocalStorage } from '../../src/storage/LocalStorage';
import { StorageQuotaError, StorageError } from '../../src/errors/AchievementErrors';
import type { AchievementMetrics } from '../../src/types';

describe('LocalStorage', () => {
  let storage: LocalStorage;
  const testKey = 'test-achievements';

  beforeEach(() => {
    localStorage.clear();
    storage = new LocalStorage(testKey);
  });

  afterEach(() => {
    localStorage.clear();
  });

  test('should persist to localStorage', () => {
    const metrics: AchievementMetrics = {
      score: [100],
      level: [5],
    };

    storage.setMetrics(metrics);

    // Create new instance to verify persistence
    const storage2 = new LocalStorage(testKey);
    const retrieved = storage2.getMetrics();

    expect(retrieved).toEqual(metrics);
  });

  test('should handle Date serialization', () => {
    const testDate = new Date('2024-01-01T12:00:00Z');
    const metrics: AchievementMetrics = {
      timestamp: [testDate],
      score: [100],
    };

    storage.setMetrics(metrics);

    const retrieved = storage.getMetrics();
    const retrievedDate = retrieved.timestamp[0] as Date;

    expect(retrievedDate).toBeInstanceOf(Date);
    expect(retrievedDate.toISOString()).toBe(testDate.toISOString());
  });

  test('should use correct storage key', () => {
    const metrics: AchievementMetrics = { score: [100] };
    storage.setMetrics(metrics);

    const rawData = localStorage.getItem(testKey);
    expect(rawData).toBeTruthy();

    const parsed = JSON.parse(rawData!);
    expect(parsed.metrics).toBeDefined();
  });

  test('should handle quota exceeded error', () => {
    // Mock localStorage setItem to throw quota exceeded error
    const originalSetItem = localStorage.setItem;

    try {
      localStorage.setItem = function() {
        const error: Error & { name?: string } = new Error('QuotaExceededError');
        error.name = 'QuotaExceededError';
        throw error;
      };

      const largeMetrics: AchievementMetrics = { score: [100] };

      expect(() => {
        storage.setMetrics(largeMetrics);
      }).toThrow(StorageQuotaError);
    } finally {
      // Restore original
      localStorage.setItem = originalSetItem;
    }
  });

  test('should clear localStorage on clear()', () => {
    const metrics: AchievementMetrics = { score: [100] };
    const unlocked = ['achievement1'];

    storage.setMetrics(metrics);
    storage.setUnlockedAchievements(unlocked);

    storage.clear();

    expect(localStorage.getItem(testKey)).toBeNull();
    expect(storage.getMetrics()).toEqual({});
    expect(storage.getUnlockedAchievements()).toEqual([]);
  });

  test('should handle corrupted data gracefully', () => {
    // Set invalid JSON
    localStorage.setItem(testKey, 'invalid json{{{');

    expect(() => {
      const metrics = storage.getMetrics();
      expect(metrics).toEqual({});
    }).not.toThrow();

    expect(() => {
      const unlocked = storage.getUnlockedAchievements();
      expect(unlocked).toEqual([]);
    }).not.toThrow();
  });

  test('should store and retrieve unlocked achievements', () => {
    const unlocked = ['achievement1', 'achievement2', 'achievement3'];

    storage.setUnlockedAchievements(unlocked);

    const storage2 = new LocalStorage(testKey);
    const retrieved = storage2.getUnlockedAchievements();

    expect(retrieved).toEqual(unlocked);
  });

  test('should handle empty storage', () => {
    expect(storage.getMetrics()).toEqual({});
    expect(storage.getUnlockedAchievements()).toEqual([]);
  });

  test('should handle multiple metric types', () => {
    const metrics: AchievementMetrics = {
      score: [100],
      name: ['John'],
      active: [true],
      timestamp: [new Date('2024-01-01')],
      nullable: [null],
    };

    storage.setMetrics(metrics);
    const retrieved = storage.getMetrics();

    expect(retrieved.score).toEqual([100]);
    expect(retrieved.name).toEqual(['John']);
    expect(retrieved.active).toEqual([true]);
    expect(retrieved.timestamp[0]).toBeInstanceOf(Date);
    expect(retrieved.nullable).toEqual([null]);
  });

  test('should preserve metrics when updating unlocked achievements', () => {
    const metrics: AchievementMetrics = { score: [100] };
    storage.setMetrics(metrics);

    storage.setUnlockedAchievements(['achievement1']);

    expect(storage.getMetrics()).toEqual(metrics);
    expect(storage.getUnlockedAchievements()).toEqual(['achievement1']);
  });

  test('should preserve unlocked achievements when updating metrics', () => {
    storage.setUnlockedAchievements(['achievement1']);

    const metrics: AchievementMetrics = { score: [100] };
    storage.setMetrics(metrics);

    expect(storage.getMetrics()).toEqual(metrics);
    expect(storage.getUnlockedAchievements()).toEqual(['achievement1']);
  });

  test('should use different storage keys independently', () => {
    const storage1 = new LocalStorage('key1');
    const storage2 = new LocalStorage('key2');

    storage1.setMetrics({ score: [100] });
    storage2.setMetrics({ score: [200] });

    expect(storage1.getMetrics().score).toEqual([100]);
    expect(storage2.getMetrics().score).toEqual([200]);
  });
});
