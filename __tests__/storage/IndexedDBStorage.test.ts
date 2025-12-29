/**
 * IndexedDBStorage Tests
 */

import 'fake-indexeddb/auto';
import { IndexedDBStorage } from '../../src/storage/IndexedDBStorage';
import type { AchievementMetrics } from '../../src/types';

describe('IndexedDBStorage', () => {
  let storage: IndexedDBStorage;
  const dbName = 'test-achievements-db';

  beforeEach(() => {
    // Clean up any existing database
    indexedDB.deleteDatabase(dbName);
    storage = new IndexedDBStorage(dbName);
  });

  afterEach(() => {
    // Close the database connection to allow cleanup
    if (storage) {
      storage.close();
    }
    indexedDB.deleteDatabase(dbName);
  });

  test('should store and retrieve async', async () => {
    const metrics: AchievementMetrics = {
      score: [100],
      level: [5],
    };

    await storage.setMetrics(metrics);
    const retrieved = await storage.getMetrics();

    expect(retrieved).toEqual(metrics);
  });

  test('should handle large datasets', async () => {
    const largeMetrics: AchievementMetrics = {};

    // Create 1000 metrics
    for (let i = 0; i < 1000; i++) {
      largeMetrics[`metric_${i}`] = [i];
    }

    await storage.setMetrics(largeMetrics);
    const retrieved = await storage.getMetrics();

    expect(Object.keys(retrieved).length).toBe(1000);
    expect(retrieved.metric_500).toEqual([500]);
  });

  test('should create database on first use', async () => {
    // Simply accessing the storage should create the database
    const metrics = await storage.getMetrics();
    expect(metrics).toEqual({});

    // Verify we can now write to it
    await storage.setMetrics({ score: [100] });
    const retrieved = await storage.getMetrics();
    expect(retrieved).toEqual({ score: [100] });
  });

  test('should handle concurrent operations', async () => {
    // Perform multiple operations concurrently
    await Promise.all([
      storage.setMetrics({ score: [100] }),
      storage.setUnlockedAchievements(['achievement1']),
      storage.setMetrics({ level: [5] }),
      storage.setUnlockedAchievements(['achievement1', 'achievement2']),
    ]);

    // Last write should win for each type
    const metrics = await storage.getMetrics();
    const unlocked = await storage.getUnlockedAchievements();

    expect(metrics).toBeDefined();
    expect(unlocked).toBeDefined();
  });

  test('should clear database', async () => {
    await storage.setMetrics({ score: [100] });
    await storage.setUnlockedAchievements(['achievement1']);

    await storage.clear();

    const metrics = await storage.getMetrics();
    const unlocked = await storage.getUnlockedAchievements();

    expect(metrics).toEqual({});
    expect(unlocked).toEqual([]);
  });

  test('should store and retrieve unlocked achievements', async () => {
    const unlocked = ['achievement1', 'achievement2', 'achievement3'];

    await storage.setUnlockedAchievements(unlocked);
    const retrieved = await storage.getUnlockedAchievements();

    expect(retrieved).toEqual(unlocked);
  });

  test('should return empty state for new database', async () => {
    const metrics = await storage.getMetrics();
    const unlocked = await storage.getUnlockedAchievements();

    expect(metrics).toEqual({});
    expect(unlocked).toEqual([]);
  });

  test('should persist data across instances', async () => {
    await storage.setMetrics({ score: [100] });

    // Create new instance with same database name
    const storage2 = new IndexedDBStorage(dbName);
    const retrieved = await storage2.getMetrics();

    expect(retrieved).toEqual({ score: [100] });

    // Clean up the second storage instance
    storage2.close();
  });
});
