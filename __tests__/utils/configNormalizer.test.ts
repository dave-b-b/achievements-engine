/**
 * configNormalizer Tests
 */

import { isSimpleConfig, normalizeAchievements } from '../../src/utils/configNormalizer';
import type { SimpleAchievementConfig, AchievementConfiguration } from '../../src/types';

describe('configNormalizer', () => {
  describe('isSimpleConfig', () => {
    test('should detect simple format', () => {
      const simpleConfig: SimpleAchievementConfig = {
        score: {
          '100': { title: 'Century Club' },
        },
      };

      expect(isSimpleConfig(simpleConfig)).toBe(true);
    });

    test('should detect complex format', () => {
      const complexConfig: AchievementConfiguration = {
        score: [
          {
            isConditionMet: (value) => true,
            achievementDetails: {
              achievementId: 'test',
              achievementTitle: 'Test',
              achievementDescription: 'Test',
            },
          },
        ],
      };

      expect(isSimpleConfig(complexConfig)).toBe(false);
    });

    test('should handle empty config', () => {
      expect(isSimpleConfig({})).toBe(true);
    });

    test('should handle invalid config', () => {
      expect(isSimpleConfig(null as any)).toBe(false);
      expect(isSimpleConfig(undefined as any)).toBe(false);
      expect(isSimpleConfig('string' as any)).toBe(false);
    });
  });

  describe('normalizeAchievements', () => {
    test('should convert simple to complex format', () => {
      const simpleConfig: SimpleAchievementConfig = {
        score: {
          '100': { title: 'Century Club', description: 'Reach 100 points' },
        },
      };

      const result = normalizeAchievements(simpleConfig);

      expect(result.score).toBeDefined();
      expect(Array.isArray(result.score)).toBe(true);
      expect(result.score.length).toBe(1);
      expect(result.score[0].achievementDetails.achievementTitle).toBe('Century Club');
    });

    test('should handle numeric thresholds', () => {
      const config: SimpleAchievementConfig = {
        score: {
          '50': { title: 'Halfway' },
          '100': { title: 'Century Club' },
          '200': { title: 'Double Century' },
        },
      };

      const result = normalizeAchievements(config);

      expect(result.score.length).toBe(3);

      // Test numeric threshold condition
      const achievement100 = result.score.find((a) => a.achievementDetails.achievementId === 'score_100');
      expect(achievement100).toBeDefined();

      const mockState = { metrics: {}, unlockedAchievements: [] };
      expect(achievement100!.isConditionMet([100], mockState)).toBe(true);
      expect(achievement100!.isConditionMet([99], mockState)).toBe(false);
      expect(achievement100!.isConditionMet([150], mockState)).toBe(true);
    });

    test('should handle boolean thresholds', () => {
      const config: SimpleAchievementConfig = {
        completedTutorial: {
          'true': { title: 'Tutorial Complete' },
        },
      };

      const result = normalizeAchievements(config);

      expect(result.completedTutorial.length).toBe(1);

      const achievement = result.completedTutorial[0];
      const mockState = { metrics: {}, unlockedAchievements: [] };
      expect(achievement.isConditionMet([true], mockState)).toBe(true);
      expect(achievement.isConditionMet([false], mockState)).toBe(false);
    });

    test('should handle string thresholds', () => {
      const config: SimpleAchievementConfig = {
        difficulty: {
          'hard': { title: 'Hard Mode' },
          'expert': { title: 'Expert Mode' },
        },
      };

      const result = normalizeAchievements(config);

      const hardAchievement = result.difficulty.find(
        (a) => a.achievementDetails.achievementId === 'difficulty_hard'
      );

      expect(hardAchievement).toBeDefined();
      const mockState = { metrics: {}, unlockedAchievements: [] };
      expect(hardAchievement!.isConditionMet(['hard'], mockState)).toBe(true);
      expect(hardAchievement!.isConditionMet(['easy'], mockState)).toBe(false);
    });

    test('should handle custom conditions', () => {
      const config: SimpleAchievementConfig = {
        combo: {
          custom: {
            title: 'Combo Master',
            condition: (metrics) => metrics.score > 100 && metrics.level > 5,
          },
        },
      };

      const result = normalizeAchievements(config);

      expect(result.combo.length).toBe(1);

      const achievement = result.combo[0];

      // Test with state that meets condition
      expect(
        achievement.isConditionMet(undefined, {
          metrics: { score: [101], level: [6] },
          unlockedAchievements: [],
        })
      ).toBe(true);

      // Test with state that doesn't meet condition
      expect(
        achievement.isConditionMet(undefined, {
          metrics: { score: [99], level: [6] },
          unlockedAchievements: [],
        })
      ).toBe(false);
    });

    test('should pass through complex config unchanged', () => {
      const complexConfig: AchievementConfiguration = {
        score: [
          {
            isConditionMet: (value) => {
              const numValue = Array.isArray(value) ? value[0] : value;
              return typeof numValue === 'number' && numValue >= 100;
            },
            achievementDetails: {
              achievementId: 'score_100',
              achievementTitle: 'Test',
              achievementDescription: 'Test description',
            },
          },
        ],
      };

      const result = normalizeAchievements(complexConfig);

      expect(result).toEqual(complexConfig);
    });

    test('should generate unique IDs for custom achievements', () => {
      const config: SimpleAchievementConfig = {
        combo: {
          custom1: {
            title: 'Custom 1',
            condition: (metrics) => metrics.score > 50,
          },
          custom2: {
            title: 'Custom 2',
            condition: (metrics) => metrics.score > 100,
          },
        },
      };

      const result = normalizeAchievements(config);

      const ids = result.combo.map((a) => a.achievementDetails.achievementId);
      expect(ids.length).toBe(2);
      expect(ids[0]).not.toEqual(ids[1]);
      expect(ids[0]).toContain('custom');
      expect(ids[1]).toContain('custom');
    });

    test('should set default descriptions for threshold achievements', () => {
      const config: SimpleAchievementConfig = {
        score: {
          '100': { title: 'Century Club' },
        },
      };

      const result = normalizeAchievements(config);

      expect(result.score[0].achievementDetails.achievementDescription).toContain('100');
      expect(result.score[0].achievementDetails.achievementDescription).toContain('score');
    });

    test('should use provided descriptions when available', () => {
      const config: SimpleAchievementConfig = {
        score: {
          '100': { title: 'Century Club', description: 'Custom description' },
        },
      };

      const result = normalizeAchievements(config);

      expect(result.score[0].achievementDetails.achievementDescription).toBe('Custom description');
    });

    test('should handle default icon key', () => {
      const config: SimpleAchievementConfig = {
        score: {
          '100': { title: 'Century Club' },
        },
      };

      const result = normalizeAchievements(config);

      expect(result.score[0].achievementDetails.achievementIconKey).toBe('default');
    });

    test('should use custom icon key when provided', () => {
      const config: SimpleAchievementConfig = {
        score: {
          '100': { title: 'Century Club', icon: 'trophy' },
        },
      };

      const result = normalizeAchievements(config);

      expect(result.score[0].achievementDetails.achievementIconKey).toBe('trophy');
    });
  });
});
