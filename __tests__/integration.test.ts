/**
 * Integration Tests
 * End-to-end tests covering complete user journeys and complex scenarios
 */

import { AchievementEngine } from '../src/AchievementEngine';
import { MemoryStorage } from '../src/storage/MemoryStorage';
import { LocalStorage } from '../src/storage/LocalStorage';

describe('Integration Tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('End-to-End Achievement Flow', () => {
    test('complete user journey from zero to unlocked achievement', () => {
      // Create engine with multiple achievements
      const engine = new AchievementEngine({
        achievements: {
          score: {
            '50': { title: 'Beginner', description: 'Reach 50 points' },
            '100': { title: 'Intermediate', description: 'Reach 100 points' },
            '200': { title: 'Advanced', description: 'Reach 200 points' },
          },
          level: {
            '5': { title: 'Level 5', description: 'Reach level 5' },
            '10': { title: 'Level 10', description: 'Reach level 10' },
          },
        },
      });

      // Track unlocked achievements
      const unlockedAchievements: string[] = [];
      engine.on('achievement:unlocked', (data) => {
        unlockedAchievements.push(data.achievementId);
      });

      // Progressively update metrics
      engine.update({ score: 25, level: 1 });
      expect(unlockedAchievements.length).toBe(0);

      engine.update({ score: 50, level: 3 });
      expect(unlockedAchievements).toContain('score_50');

      engine.update({ score: 75, level: 5 });
      expect(unlockedAchievements).toContain('level_5');

      engine.update({ score: 100, level: 7 });
      expect(unlockedAchievements).toContain('score_100');

      engine.update({ score: 200, level: 10 });
      expect(unlockedAchievements).toContain('score_200');
      expect(unlockedAchievements).toContain('level_10');

      // Export state
      const exported = engine.export();
      expect(exported).toBeTruthy();

      // Import into new engine
      const engine2 = new AchievementEngine({
        achievements: {
          score: {
            '50': { title: 'Beginner' },
            '100': { title: 'Intermediate' },
            '200': { title: 'Advanced' },
          },
          level: {
            '5': { title: 'Level 5' },
            '10': { title: 'Level 10' },
          },
        },
      });

      const result = engine2.import(exported, { validate: false });
      expect(result.success).toBe(true);

      // Verify state preserved
      expect(engine2.getMetrics().score).toBe(200);
      expect(engine2.getMetrics().level).toBe(10);
      expect(engine2.getUnlocked().length).toBe(5);
    });
  });

  describe('Event-Based Flow', () => {
    test('event-based tracking with multiple event types', () => {
      const engine = new AchievementEngine({
        achievements: {
          score: { '100': { title: 'Century Club' } },
          level: { '10': { title: 'Level Master' } },
        },
        eventMapping: {
          scoreChanged: 'score',
          levelUp: 'level',
          bonusPoints: (eventData, currentMetrics) => ({
            score: (currentMetrics.score || 0) + eventData,
          }),
        },
      });

      const unlocked: string[] = [];
      engine.on('achievement:unlocked', (data) => {
        unlocked.push(data.achievementId);
      });

      // Emit various events
      engine.emit('scoreChanged', 50);
      expect(engine.getMetrics().score).toBe(50);

      engine.emit('bonusPoints', 30);
      expect(engine.getMetrics().score).toBe(80);

      engine.emit('bonusPoints', 20);
      expect(engine.getMetrics().score).toBe(100);
      expect(unlocked).toContain('score_100');

      engine.emit('levelUp', 10);
      expect(engine.getMetrics().level).toBe(10);
      expect(unlocked).toContain('level_10');
    });
  });

  describe('Storage Persistence', () => {
    test('state persists across engine instances', () => {
      const storage = new MemoryStorage();

      // Engine A: unlock achievements
      const engineA = new AchievementEngine({
        achievements: {
          score: {
            '50': { title: 'Beginner' },
            '100': { title: 'Intermediate' },
          },
        },
        storage,
      });

      engineA.update({ score: 100 });
      expect(engineA.getUnlocked().length).toBe(2);

      // Destroy Engine A
      engineA.destroy();

      // Engine B (same storage): verify state loaded
      const engineB = new AchievementEngine({
        achievements: {
          score: {
            '50': { title: 'Beginner' },
            '100': { title: 'Intermediate' },
          },
        },
        storage,
      });

      expect(engineB.getMetrics().score).toBe(100);
      expect(engineB.getUnlocked().length).toBe(2);

      // Continue unlocking in B
      engineB.update({ score: 150 });

      // Engine C: verify all state present
      const engineC = new AchievementEngine({
        achievements: {
          score: {
            '50': { title: 'Beginner' },
            '100': { title: 'Intermediate' },
          },
        },
        storage,
      });

      expect(engineC.getMetrics().score).toBe(150);
      expect(engineC.getUnlocked().length).toBe(2);
    });

    test('LocalStorage persistence across page reloads', () => {
      const storageKey = 'test-persistence';

      // First "session"
      const engine1 = new AchievementEngine({
        achievements: {
          score: { '100': { title: 'Test' } },
        },
        storage: new LocalStorage(storageKey),
      });

      engine1.update({ score: 100 });

      // Simulate page reload by creating new engine
      const engine2 = new AchievementEngine({
        achievements: {
          score: { '100': { title: 'Test' } },
        },
        storage: new LocalStorage(storageKey),
      });

      expect(engine2.getMetrics().score).toBe(100);
      expect(engine2.getUnlocked()).toContain('score_100');
    });
  });

  describe('Error Recovery', () => {
    test('engine continues working after storage error', () => {
      const failingStorage = new MemoryStorage();
      const originalSetMetrics = failingStorage.setMetrics;

      // Make storage fail once
      let failCount = 0;
      failingStorage.setMetrics = jest.fn((metrics) => {
        if (failCount === 0) {
          failCount++;
          throw new Error('Storage error');
        }
        originalSetMetrics.call(failingStorage, metrics);
      });

      const errors: any[] = [];
      const engine = new AchievementEngine({
        achievements: {
          score: { '100': { title: 'Test' } },
        },
        storage: failingStorage,
        onError: (error) => errors.push(error),
      });

      // First update should fail storage but not crash
      engine.update({ score: 50 });
      expect(errors.length).toBeGreaterThan(0);

      // Second update should succeed
      engine.update({ score: 100 });
      expect(engine.getMetrics().score).toBe(100);
    });
  });

  describe('Complex Achievement Scenarios', () => {
    test('custom conditions with multiple metric dependencies', () => {
      const engine = new AchievementEngine({
        achievements: {
          combo: {
            combo1: {
              title: 'Power Player',
              description: 'High score and level',
              condition: (metrics) => metrics.score >= 100 && metrics.level >= 10,
            },
            combo2: {
              title: 'Survivor',
              description: 'High health and armor',
              condition: (metrics) => metrics.health >= 75 && metrics.armor >= 50,
            },
          },
        },
      });

      const unlocked: string[] = [];
      engine.on('achievement:unlocked', (data) => {
        unlocked.push(data.achievementTitle);
      });

      // Update only score
      engine.update({ score: 100, level: 5 });
      expect(unlocked).not.toContain('Power Player');

      // Update level to meet condition
      engine.update({ score: 100, level: 10 });
      expect(unlocked).toContain('Power Player');

      // Update health and armor
      engine.update({ score: 100, level: 10, health: 80, armor: 60 });
      expect(unlocked).toContain('Survivor');
    });

    test('achievements should not unlock multiple times', () => {
      const engine = new AchievementEngine({
        achievements: {
          score: { '100': { title: 'Century Club' } },
        },
      });

      let unlockCount = 0;
      engine.on('achievement:unlocked', () => {
        unlockCount++;
      });

      engine.update({ score: 100 });
      engine.update({ score: 150 });
      engine.update({ score: 200 });
      engine.update({ score: 100 }); // Back to 100

      expect(unlockCount).toBe(1);
    });
  });

  describe('Multiple Concurrent Engines', () => {
    test('should handle multiple independent engines', () => {
      const engine1 = new AchievementEngine({
        achievements: {
          score: { '100': { title: 'Test' } },
        },
        storage: new MemoryStorage(),
      });

      const engine2 = new AchievementEngine({
        achievements: {
          level: { '10': { title: 'Test' } },
        },
        storage: new MemoryStorage(),
      });

      engine1.update({ score: 100 });
      engine2.update({ level: 10 });

      expect(engine1.getUnlocked().length).toBe(1);
      expect(engine2.getUnlocked().length).toBe(1);
      expect(engine1.getUnlocked()[0]).toContain('score');
      expect(engine2.getUnlocked()[0]).toContain('level');
    });
  });

  describe('Import/Export Round-Trip', () => {
    test('should preserve all state through export/import cycle', () => {
      const config = {
        achievements: {
          score: {
            '50': { title: 'Beginner' },
            '100': { title: 'Intermediate' },
            '200': { title: 'Advanced' },
          },
          level: {
            '5': { title: 'Level 5' },
            '10': { title: 'Level 10' },
          },
        },
      };

      const engine1 = new AchievementEngine(config);

      // Set complex state
      engine1.update({ score: 175, level: 8, health: 90 });

      // Export
      const exported = engine1.export();

      // Import into new engine
      const engine2 = new AchievementEngine(config);
      const result = engine2.import(exported);

      expect(result.success).toBe(true);

      // Verify exact state match
      expect(engine2.getMetrics()).toEqual(engine1.getMetrics());
      expect(engine2.getUnlocked()).toEqual(engine1.getUnlocked());
      expect(engine2.getAllAchievements()).toEqual(engine1.getAllAchievements());
    });
  });
});
