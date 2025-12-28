/**
 * AchievementEngine Core Tests
 * Comprehensive test suite for the AchievementEngine class
 */

import { AchievementEngine } from '../src/AchievementEngine';
import { MemoryStorage } from '../src/storage/MemoryStorage';
import { LocalStorage } from '../src/storage/LocalStorage';
import { createTestEngine, createMockStorage, expectAchievementUnlocked, expectAchievementLocked } from './testUtils';
import type { EngineConfig, AchievementMetrics } from '../src/types';

describe('AchievementEngine', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('Initialization', () => {
    test('constructor should initialize with simple config', () => {
      const engine = new AchievementEngine({
        achievements: {
          score: {
            '100': { title: 'Century Club' },
          },
        },
      });

      expect(engine).toBeInstanceOf(AchievementEngine);
      expect(engine.getMetrics()).toEqual({});
    });

    test('constructor should normalize simple achievement config', () => {
      const engine = new AchievementEngine({
        achievements: {
          score: {
            '100': { title: 'First 100', description: 'Reach 100 points' },
          },
        },
      });

      const achievements = engine.getAllAchievements();
      expect(achievements.length).toBe(1);
      expect(achievements[0].achievementId).toBe('score_100');
      expect(achievements[0].achievementTitle).toBe('First 100');
    });

    test('constructor should accept complex achievement config', () => {
      const engine = new AchievementEngine({
        achievements: {
          score: [
            {
              isConditionMet: (value) => {
                const numValue = Array.isArray(value) ? value[0] : value;
                return typeof numValue === 'number' && numValue >= 100;
              },
              achievementDetails: {
                achievementId: 'custom_score',
                achievementTitle: 'Custom Achievement',
                achievementDescription: 'Custom description',
              },
            },
          ],
        },
      });

      const achievements = engine.getAllAchievements();
      expect(achievements.length).toBe(1);
      expect(achievements[0].achievementId).toBe('custom_score');
    });

    test('constructor should initialize with local storage', () => {
      const engine = new AchievementEngine({
        achievements: { score: { '100': { title: 'Test' } } },
        storage: new LocalStorage('achievements'),
      });

      engine.update({ score: 50 });
      const metrics = engine.getMetrics();
      expect(metrics.score).toBe(50);

      // Create new engine with same storage to verify persistence
      const engine2 = new AchievementEngine({
        achievements: { score: { '100': { title: 'Test' } } },
        storage: new LocalStorage('achievements'),
      });

      expect(engine2.getMetrics().score).toBe(50);
    });

    test('constructor should initialize with memory storage', () => {
      const engine = new AchievementEngine({
        achievements: { score: { '100': { title: 'Test' } } },
        storage: new MemoryStorage(),
      });

      expect(engine.getMetrics()).toEqual({});
    });

    test('constructor should load existing state from storage', () => {
      const storage = new MemoryStorage();
      const metricsData: AchievementMetrics = { score: [100], level: [5] };
      storage.setMetrics(metricsData);
      storage.setUnlockedAchievements(['score_100']);

      const engine = new AchievementEngine({
        achievements: { score: { '100': { title: 'Test' } } },
        storage,
      });

      expect(engine.getMetrics()).toEqual({ score: 100, level: 5 });
      expect(engine.getUnlocked()).toContain('score_100');
    });
  });

  describe('Metric Updates (Direct)', () => {
    test('update() should update single metric', () => {
      const engine = createTestEngine();
      engine.update({ score: 100 });

      expect(engine.getMetrics()).toEqual({ score: 100 });
    });

    test('update() should update multiple metrics', () => {
      const engine = createTestEngine();
      engine.update({ score: 100, level: 5, health: 75 });

      const metrics = engine.getMetrics();
      expect(metrics.score).toBe(100);
      expect(metrics.level).toBe(5);
      expect(metrics.health).toBe(75);
    });

    test('update() should overwrite existing metric values', () => {
      const engine = createTestEngine();
      engine.update({ score: 100 });
      engine.update({ score: 200 });

      expect(engine.getMetrics().score).toBe(200);
    });

    test('update() should persist to storage', () => {
      const storage = new MemoryStorage();
      const engine = new AchievementEngine({
        achievements: { score: { '100': { title: 'Test' } } },
        storage,
      });

      engine.update({ score: 100 });

      const savedMetrics = storage.getMetrics();
      expect(savedMetrics.score).toEqual([100]);
    });

    test('update() should emit metric:updated event', () => {
      const engine = createTestEngine();
      const handler = jest.fn();

      engine.on('metric:updated', handler);
      engine.update({ score: 100 });

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          metric: 'score',
          oldValue: undefined,
          newValue: 100,
          timestamp: expect.any(Number),
        })
      );
    });

    test('update() should emit state:changed event', () => {
      const engine = createTestEngine();
      const handler = jest.fn();

      engine.on('state:changed', handler);
      engine.update({ score: 100 });

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          metrics: { score: [100] },
          unlocked: expect.any(Array),
          timestamp: expect.any(Number),
        })
      );
    });
  });

  describe('Achievement Evaluation', () => {
    test('update() should unlock threshold-based achievement', () => {
      const engine = new AchievementEngine({
        achievements: {
          score: { '100': { title: 'Century Club' } },
        },
      });

      const handler = jest.fn();
      engine.on('achievement:unlocked', handler);

      engine.update({ score: 100 });

      expect(handler).toHaveBeenCalled();
      expectAchievementUnlocked(engine, 'score_100');
    });

    test('update() should unlock boolean achievement', () => {
      const engine = new AchievementEngine({
        achievements: {
          completedTutorial: { 'true': { title: 'Tutorial Complete' } },
        },
      });

      engine.update({ completedTutorial: true });

      expectAchievementUnlocked(engine, 'completedTutorial_true');
    });

    test('update() should unlock custom condition achievement', () => {
      const engine = new AchievementEngine({
        achievements: {
          combo: {
            custom: {
              title: 'Combo Master',
              condition: (metrics) => metrics.score > 100 && metrics.level > 5,
            },
          },
        },
      });

      engine.update({ score: 101, level: 6 });

      const unlocked = engine.getUnlocked();
      expect(unlocked.length).toBeGreaterThan(0);
      expect(unlocked.some((id) => id.includes('custom'))).toBe(true);
    });

    test('update() should not unlock same achievement twice', () => {
      const engine = new AchievementEngine({
        achievements: {
          score: { '100': { title: 'Century Club' } },
        },
      });

      const handler = jest.fn();
      engine.on('achievement:unlocked', handler);

      engine.update({ score: 100 });
      engine.update({ score: 150 });
      engine.update({ score: 200 });

      expect(handler).toHaveBeenCalledTimes(1);
    });

    test('update() should unlock multiple achievements simultaneously', () => {
      const engine = new AchievementEngine({
        achievements: {
          score: {
            '50': { title: 'Halfway' },
            '100': { title: 'Century Club' },
            '150': { title: 'Overachiever' },
          },
        },
      });

      engine.update({ score: 200 });

      const unlocked = engine.getUnlocked();
      expect(unlocked).toContain('score_50');
      expect(unlocked).toContain('score_100');
      expect(unlocked).toContain('score_150');
    });

    test('update() should not unlock achievement for unmet condition', () => {
      const engine = new AchievementEngine({
        achievements: {
          score: { '100': { title: 'Century Club' } },
        },
      });

      engine.update({ score: 50 });

      expectAchievementLocked(engine, 'score_100');
    });

    test('update() should handle undefined metric gracefully', () => {
      const engine = new AchievementEngine({
        achievements: {
          score: { '100': { title: 'Century Club' } },
        },
      });

      expect(() => {
        engine.update({ level: 5 });
      }).not.toThrow();

      expectAchievementLocked(engine, 'score_100');
    });
  });

  describe('Event-Based Tracking (emit)', () => {
    test('emit() with direct mapping should update metric', () => {
      const engine = new AchievementEngine({
        achievements: {
          score: { '100': { title: 'Century Club' } },
        },
        eventMapping: {
          scoreChanged: 'score',
        },
      });

      engine.emit('scoreChanged', 100);

      expect(engine.getMetrics().score).toBe(100);
    });

    test('emit() with custom transformer should transform data', () => {
      const transformer = jest.fn((eventData, currentMetrics) => ({
        score: eventData.points,
      }));

      const engine = new AchievementEngine({
        achievements: {
          score: { '100': { title: 'Century Club' } },
        },
        eventMapping: {
          pointsEarned: transformer,
        },
      });

      engine.emit('pointsEarned', { points: 100 });

      expect(transformer).toHaveBeenCalledWith({ points: 100 }, {});
      expect(engine.getMetrics().score).toBe(100);
    });

    test('emit() with no mapping should not update metrics', () => {
      const engine = new AchievementEngine({
        achievements: {
          score: { '100': { title: 'Century Club' } },
        },
        eventMapping: {
          scoreChanged: 'score',
        },
      });

      const handler = jest.fn();
      (engine as any).on('unmappedEvent', handler);

      (engine as any).emit('unmappedEvent', { data: 'test' });

      expect(engine.getMetrics()).toEqual({});
      expect(handler).toHaveBeenCalled();
    });

    test('emit() should unlock achievements after metric update', () => {
      const engine = new AchievementEngine({
        achievements: {
          score: { '100': { title: 'Century Club' } },
        },
        eventMapping: {
          scoreChanged: 'score',
        },
      });

      engine.emit('scoreChanged', 100);

      expectAchievementUnlocked(engine, 'score_100');
    });

    test('emit() with transformer accessing currentMetrics', () => {
      const engine = new AchievementEngine({
        achievements: {
          score: { '100': { title: 'Century Club' } },
        },
        eventMapping: {
          addPoints: (eventData, currentMetrics) => ({
            score: (currentMetrics.score || 0) + eventData,
          }),
        },
      });

      engine.emit('addPoints', 30);
      engine.emit('addPoints', 40);
      engine.emit('addPoints', 50);

      expect(engine.getMetrics().score).toBe(120);
    });
  });

  describe('State Access', () => {
    test('getMetrics() should return readonly copy', () => {
      const engine = createTestEngine();
      engine.update({ score: 100 });

      const metrics = engine.getMetrics() as any;
      metrics.score = 999;
      metrics.newMetric = 'test';

      expect(engine.getMetrics().score).toBe(100);
      expect(engine.getMetrics()).not.toHaveProperty('newMetric');
    });

    test('getMetrics() should return current state', () => {
      const engine = createTestEngine();

      engine.update({ score: 50 });
      expect(engine.getMetrics().score).toBe(50);

      engine.update({ score: 100 });
      expect(engine.getMetrics().score).toBe(100);

      engine.update({ score: 150, level: 5 });
      expect(engine.getMetrics().score).toBe(150);
      expect(engine.getMetrics().level).toBe(5);
    });

    test('getUnlocked() should return readonly array', () => {
      const engine = new AchievementEngine({
        achievements: {
          score: { '100': { title: 'Century Club' } },
        },
      });

      engine.update({ score: 100 });

      const unlocked = engine.getUnlocked() as any;

      expect(() => {
        unlocked.push('fake_achievement');
      }).toThrow();
    });

    test('getUnlocked() should return unlocked achievement IDs', () => {
      const engine = new AchievementEngine({
        achievements: {
          score: { '100': { title: 'First' }, '200': { title: 'Second' } },
        },
      });

      engine.update({ score: 100 });
      expect(engine.getUnlocked()).toContain('score_100');
      expect(engine.getUnlocked()).not.toContain('score_200');

      engine.update({ score: 200 });
      expect(engine.getUnlocked()).toContain('score_100');
      expect(engine.getUnlocked()).toContain('score_200');
    });

    test('getAllAchievements() should return all with status', () => {
      const engine = new AchievementEngine({
        achievements: {
          score: {
            '50': { title: 'Beginner' },
            '100': { title: 'Intermediate' },
            '150': { title: 'Advanced' },
            '200': { title: 'Expert' },
            '250': { title: 'Master' },
          },
        },
      });

      engine.update({ score: 120 });

      const all = engine.getAllAchievements();

      expect(all.length).toBe(5);
      expect(all.filter((a) => a.isUnlocked).length).toBe(2);
      expect(all.filter((a) => !a.isUnlocked).length).toBe(3);
    });

    test('getAllAchievements() should include achievement details', () => {
      const engine = new AchievementEngine({
        achievements: {
          score: { '100': { title: 'Century', description: 'Reach 100', icon: 'trophy' } },
        },
      });

      const all = engine.getAllAchievements();

      expect(all[0]).toEqual(
        expect.objectContaining({
          achievementId: expect.any(String),
          achievementTitle: expect.any(String),
          achievementDescription: expect.any(String),
          isUnlocked: expect.any(Boolean),
        })
      );
    });
  });

  describe('Reset Functionality', () => {
    test('reset() should clear all metrics', () => {
      const engine = createTestEngine();
      engine.update({ score: 100, level: 5 });

      engine.reset();

      expect(engine.getMetrics()).toEqual({});
    });

    test('reset() should clear unlocked achievements', () => {
      const engine = new AchievementEngine({
        achievements: {
          score: { '100': { title: 'Century Club' } },
        },
      });

      engine.update({ score: 100 });
      expect(engine.getUnlocked().length).toBeGreaterThan(0);

      engine.reset();
      expect(engine.getUnlocked()).toEqual([]);
    });

    test('reset() should clear storage', () => {
      const storage = new MemoryStorage();
      const engine = new AchievementEngine({
        achievements: { score: { '100': { title: 'Test' } } },
        storage,
      });

      engine.update({ score: 100 });
      engine.reset();

      const engine2 = new AchievementEngine({
        achievements: { score: { '100': { title: 'Test' } } },
        storage,
      });

      expect(engine2.getMetrics()).toEqual({});
      expect(engine2.getUnlocked()).toEqual([]);
    });

    test('reset() should emit state:changed event', () => {
      const engine = createTestEngine();
      engine.update({ score: 100 });

      const handler = jest.fn();
      engine.on('state:changed', handler);

      engine.reset();

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          metrics: {},
          unlocked: [],
        })
      );
    });
  });

  describe('Import/Export', () => {
    test('export() should return JSON string', () => {
      const engine = createTestEngine();
      engine.update({ score: 100 });

      const exported = engine.export();

      expect(typeof exported).toBe('string');
      expect(() => JSON.parse(exported)).not.toThrow();
    });

    test('export() should include config hash', () => {
      const engine = createTestEngine();
      engine.update({ score: 100 });

      const exported = engine.export();
      const parsed = JSON.parse(exported);

      expect(parsed).toHaveProperty('configHash');
      expect(typeof parsed.configHash).toBe('string');
    });

    test('import() should restore state from valid export', () => {
      const config = {
        achievements: {
          score: { '100': { title: 'Century Club' } },
        },
      };

      const engineA = new AchievementEngine(config);
      engineA.update({ score: 100, level: 5 });

      const exported = engineA.export();

      const engineB = new AchievementEngine(config);
      const result = engineB.import(exported);

      expect(result.success).toBe(true);
      expect(engineB.getMetrics().score).toBe(100);
      expect(engineB.getMetrics().level).toBe(5);
      expect(engineB.getUnlocked()).toEqual(engineA.getUnlocked());
    });

    test('import() should validate config hash', () => {
      const engineA = new AchievementEngine({
        achievements: { score: { '100': { title: 'Test A' } } },
      });
      engineA.update({ score: 100 });
      const exported = engineA.export();

      const engineB = new AchievementEngine({
        achievements: { level: { '10': { title: 'Test B' } } },
      });

      const result = engineB.import(exported);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    test('import() should support merge strategy', () => {
      const config = {
        achievements: {
          score: { '100': { title: 'Score' } },
          level: { '10': { title: 'Level' } },
        },
      };

      const engineA = new AchievementEngine(config);
      engineA.update({ score: 100 });
      const exported = engineA.export();

      const engineB = new AchievementEngine(config);
      engineB.update({ level: 5 });

      const result = engineB.import(exported, { merge: true });

      expect(result.success).toBe(true);
      expect(engineB.getMetrics().score).toBe(100);
      expect(engineB.getMetrics().level).toBe(5);
    });

    test('import() should emit state:changed after import', () => {
      const config = {
        achievements: { score: { '100': { title: 'Test' } } },
      };

      const engineA = new AchievementEngine(config);
      engineA.update({ score: 100 });
      const exported = engineA.export();

      const engineB = new AchievementEngine(config);
      const handler = jest.fn();
      engineB.on('state:changed', handler);

      engineB.import(exported);

      expect(handler).toHaveBeenCalled();
    });

    test('import() should return success result', () => {
      const config = { achievements: { score: { '100': { title: 'Test' } } } };
      const engineA = new AchievementEngine(config);
      engineA.update({ score: 100 });
      const exported = engineA.export();

      const engineB = new AchievementEngine(config);
      const result = engineB.import(exported);

      expect(result.success).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    test('import() should return error result for invalid JSON', () => {
      const engine = createTestEngine();
      const result = engine.import('invalid json{{{');

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    test('should emit error event on storage failure', () => {
      const mockStorage = createMockStorage();
      (mockStorage.setMetrics as jest.Mock).mockImplementation(() => {
        throw new Error('Storage error');
      });

      const engine = new AchievementEngine({
        achievements: { score: { '100': { title: 'Test' } } },
        storage: mockStorage,
      });

      const errorHandler = jest.fn();
      engine.on('error', errorHandler);

      engine.update({ score: 100 });

      expect(errorHandler).toHaveBeenCalled();
    });

    test('should call onError callback on error', () => {
      const mockStorage = createMockStorage();
      (mockStorage.setMetrics as jest.Mock).mockImplementation(() => {
        throw new Error('Storage error');
      });

      const onError = jest.fn();
      const engine = new AchievementEngine({
        achievements: { score: { '100': { title: 'Test' } } },
        storage: mockStorage,
        onError,
      });

      engine.update({ score: 100 });

      expect(onError).toHaveBeenCalled();
    });
  });

  describe('Destroy/Cleanup', () => {
    test('destroy() should remove all event listeners', () => {
      const engine = createTestEngine();
      const handler = jest.fn();

      engine.on('metric:updated', handler);
      engine.on('achievement:unlocked', handler);

      engine.destroy();

      engine.emit('metric:updated', {});
      engine.emit('achievement:unlocked', {});

      expect(handler).not.toHaveBeenCalled();
    });

    test('destroy() should not affect storage', () => {
      const storage = new MemoryStorage();
      const engine = new AchievementEngine({
        achievements: { score: { '100': { title: 'Test' } } },
        storage,
      });

      engine.update({ score: 100 });
      engine.destroy();

      const engine2 = new AchievementEngine({
        achievements: { score: { '100': { title: 'Test' } } },
        storage,
      });

      expect(engine2.getMetrics().score).toBe(100);
    });
  });

  describe('Multiple Instances', () => {
    test('should support multiple independent instances', () => {
      const engineA = new AchievementEngine({
        achievements: { score: { '100': { title: 'Test' } } },
        storage: new MemoryStorage(),
      });

      const engineB = new AchievementEngine({
        achievements: { score: { '100': { title: 'Test' } } },
        storage: new MemoryStorage(),
      });

      engineA.update({ score: 100 });

      expect(engineA.getMetrics().score).toBe(100);
      expect(engineB.getMetrics()).toEqual({});
    });

    test('instances with different storage should be independent', () => {
      const storageA = new MemoryStorage();
      const storageB = new MemoryStorage();

      const engineA = new AchievementEngine({
        achievements: { score: { '100': { title: 'Test' } } },
        storage: storageA,
      });

      const engineB = new AchievementEngine({
        achievements: { score: { '100': { title: 'Test' } } },
        storage: storageB,
      });

      engineA.update({ score: 100 });

      expect(engineA.getMetrics().score).toBe(100);
      expect(engineB.getMetrics()).toEqual({});
    });

    test('instances with same storage should share state', () => {
      const sharedStorage = new MemoryStorage();

      const engineA = new AchievementEngine({
        achievements: { score: { '100': { title: 'Test' } } },
        storage: sharedStorage,
      });

      engineA.update({ score: 100 });

      const engineC = new AchievementEngine({
        achievements: { score: { '100': { title: 'Test' } } },
        storage: sharedStorage,
      });

      expect(engineC.getMetrics().score).toBe(100);
    });
  });
});
