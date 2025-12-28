/**
 * dataExport Tests
 */

import { exportAchievementData, createConfigHash } from '../../src/utils/dataExport';
import type { AchievementMetrics } from '../../src/types';

describe('dataExport', () => {
  describe('exportAchievementData', () => {
    test('should create valid JSON', () => {
      const metrics: AchievementMetrics = { score: [100] };
      const unlocked = ['achievement1'];

      const result = exportAchievementData(metrics, unlocked);

      expect(() => JSON.parse(result)).not.toThrow();
    });

    test('should include version', () => {
      const metrics: AchievementMetrics = { score: [100] };
      const unlocked = ['achievement1'];

      const result = exportAchievementData(metrics, unlocked);
      const parsed = JSON.parse(result);

      expect(parsed.version).toBe('3.3.0');
    });

    test('should include timestamp', () => {
      const metrics: AchievementMetrics = { score: [100] };
      const unlocked = ['achievement1'];

      const before = Date.now();
      const result = exportAchievementData(metrics, unlocked);
      const after = Date.now();

      const parsed = JSON.parse(result);

      expect(parsed.timestamp).toBeGreaterThanOrEqual(before);
      expect(parsed.timestamp).toBeLessThanOrEqual(after);
    });

    test('should include config hash when provided', () => {
      const metrics: AchievementMetrics = { score: [100] };
      const unlocked = ['achievement1'];
      const configHash = 'test-hash-123';

      const result = exportAchievementData(metrics, unlocked, configHash);
      const parsed = JSON.parse(result);

      expect(parsed.configHash).toBe(configHash);
    });

    test('should not include config hash when not provided', () => {
      const metrics: AchievementMetrics = { score: [100] };
      const unlocked = ['achievement1'];

      const result = exportAchievementData(metrics, unlocked);
      const parsed = JSON.parse(result);

      expect(parsed.configHash).toBeUndefined();
    });

    test('should handle empty state', () => {
      const result = exportAchievementData({}, []);
      const parsed = JSON.parse(result);

      expect(parsed.metrics).toEqual({});
      expect(parsed.unlockedAchievements).toEqual([]);
    });

    test('should include all metrics', () => {
      const metrics: AchievementMetrics = {
        score: [100],
        level: [5],
        health: [75],
      };
      const unlocked = ['achievement1'];

      const result = exportAchievementData(metrics, unlocked);
      const parsed = JSON.parse(result);

      expect(parsed.metrics).toEqual(metrics);
    });

    test('should include all unlocked achievements', () => {
      const metrics: AchievementMetrics = { score: [100] };
      const unlocked = ['achievement1', 'achievement2', 'achievement3'];

      const result = exportAchievementData(metrics, unlocked);
      const parsed = JSON.parse(result);

      expect(parsed.unlockedAchievements).toEqual(unlocked);
    });

    test('should format JSON with indentation', () => {
      const metrics: AchievementMetrics = { score: [100] };
      const unlocked = ['achievement1'];

      const result = exportAchievementData(metrics, unlocked);

      // Check for newlines and indentation (formatted JSON)
      expect(result).toContain('\n');
      expect(result).toContain('  ');
    });
  });

  describe('createConfigHash', () => {
    test('should be deterministic', () => {
      const config = {
        score: { '100': { title: 'Test' } },
      };

      const hash1 = createConfigHash(config);
      const hash2 = createConfigHash(config);

      expect(hash1).toBe(hash2);
    });

    test('should differ for different configs', () => {
      const config1 = {
        score: { '100': { title: 'Test' } },
      };

      const config2 = {
        score: { '200': { title: 'Test' } },
      };

      const hash1 = createConfigHash(config1);
      const hash2 = createConfigHash(config2);

      expect(hash1).not.toBe(hash2);
    });

    test('should produce different hashes for different config structures', () => {
      const config1 = {
        score: { '100': { title: 'Test' } },
      };

      const config2 = {
        level: { '10': { title: 'Test' } },
      };

      const hash1 = createConfigHash(config1);
      const hash2 = createConfigHash(config2);

      expect(hash1).not.toBe(hash2);
    });

    test('should return a string', () => {
      const config = { test: 'value' };
      const hash = createConfigHash(config);

      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(0);
    });

    test('should handle empty config', () => {
      const hash = createConfigHash({});

      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(0);
    });

    test('should handle nested config', () => {
      const config = {
        level1: {
          level2: {
            level3: {
              value: 'test',
            },
          },
        },
      };

      const hash = createConfigHash(config);

      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(0);
    });
  });
});
