/**
 * MemoryStorage Tests
 */

import { MemoryStorage } from '../../src/storage/MemoryStorage';
import type { AchievementMetrics } from '../../src/types';

describe('MemoryStorage', () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
  });

  test('should store and retrieve metrics', () => {
    const metrics: AchievementMetrics = {
      score: [100],
      level: [5],
    };

    storage.setMetrics(metrics);
    const retrieved = storage.getMetrics();

    expect(retrieved).toEqual(metrics);
  });

  test('should store and retrieve unlocked achievements', () => {
    const unlocked = ['achievement1', 'achievement2', 'achievement3'];

    storage.setUnlockedAchievements(unlocked);
    const retrieved = storage.getUnlockedAchievements();

    expect(retrieved).toEqual(unlocked);
  });

  test('should clear all data', () => {
    const metrics: AchievementMetrics = { score: [100] };
    const unlocked = ['achievement1'];

    storage.setMetrics(metrics);
    storage.setUnlockedAchievements(unlocked);

    storage.clear();

    expect(storage.getMetrics()).toEqual({});
    expect(storage.getUnlockedAchievements()).toEqual([]);
  });

  test('should be independent per instance', () => {
    const storage1 = new MemoryStorage();
    const storage2 = new MemoryStorage();

    storage1.setMetrics({ score: [100] });
    storage2.setMetrics({ score: [200] });

    expect(storage1.getMetrics().score).toEqual([100]);
    expect(storage2.getMetrics().score).toEqual([200]);
  });

  test('should handle empty state', () => {
    expect(storage.getMetrics()).toEqual({});
    expect(storage.getUnlockedAchievements()).toEqual([]);
  });

  test('should overwrite existing metrics', () => {
    storage.setMetrics({ score: [100] });
    storage.setMetrics({ level: [5] });

    const metrics = storage.getMetrics();
    expect(metrics).toEqual({ level: [5] });
    expect(metrics).not.toHaveProperty('score');
  });

  test('should handle complex metric values', () => {
    const metrics: AchievementMetrics = {
      score: [100, 200, 300],
      name: ['John Doe'],
      completed: [true],
      timestamp: [new Date('2024-01-01')],
    };

    storage.setMetrics(metrics);
    const retrieved = storage.getMetrics();

    expect(retrieved).toEqual(metrics);
  });
});
