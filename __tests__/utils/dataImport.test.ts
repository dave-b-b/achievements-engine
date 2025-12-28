/**
 * dataImport Tests
 */

import { importAchievementData } from '../../src/utils/dataImport';
import { exportAchievementData } from '../../src/utils/dataExport';
import type { AchievementMetrics } from '../../src/types';

describe('dataImport', () => {
  describe('importAchievementData', () => {
    test('should parse valid export', () => {
      const metrics: AchievementMetrics = { score: [100] };
      const unlocked = ['achievement1'];

      const exported = exportAchievementData(metrics, unlocked);
      const result = importAchievementData(exported, {}, []);

      expect(result.success).toBe(true);
    });

    test('should validate JSON format', () => {
      const result = importAchievementData('invalid json{{{', {}, []);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Invalid JSON format');
    });

    test('should validate config hash when provided', () => {
      const metrics: AchievementMetrics = { score: [100] };
      const unlocked = ['achievement1'];

      const exported = exportAchievementData(metrics, unlocked, 'hash1');
      const result = importAchievementData(exported, {}, [], {
        expectedConfigHash: 'hash2',
      });

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.some((e) => e.includes('Configuration mismatch'))).toBe(true);
    });

    test('should support replace strategy', () => {
      const currentMetrics: AchievementMetrics = { score: [50] };
      const currentUnlocked = ['achievement1'];

      const importedMetrics: AchievementMetrics = { score: [100] };
      const importedUnlocked = ['achievement2'];

      const exported = exportAchievementData(importedMetrics, importedUnlocked);
      const result = importAchievementData(exported, currentMetrics, currentUnlocked, {
        mergeStrategy: 'replace',
      });

      expect(result.success).toBe(true);
      expect((result as any).mergedMetrics).toEqual(importedMetrics);
      expect((result as any).mergedUnlocked).toEqual(importedUnlocked);
    });

    test('should support merge strategy', () => {
      const currentMetrics: AchievementMetrics = { score: [50], level: [5] };
      const currentUnlocked = ['achievement1'];

      const importedMetrics: AchievementMetrics = { score: [100] };
      const importedUnlocked = ['achievement2'];

      const exported = exportAchievementData(importedMetrics, importedUnlocked);
      const result = importAchievementData(exported, currentMetrics, currentUnlocked, {
        mergeStrategy: 'merge',
        validate: false,
      });

      expect(result.success).toBe(true);

      const merged = (result as any).mergedMetrics;
      expect(merged.score).toEqual([100]); // Higher value
      expect(merged.level).toEqual([5]); // Preserved from current

      const mergedUnlocked = (result as any).mergedUnlocked;
      expect(mergedUnlocked).toContain('achievement1');
      expect(mergedUnlocked).toContain('achievement2');
    });

    test('should support preserve strategy', () => {
      const currentMetrics: AchievementMetrics = { score: [50] };
      const currentUnlocked = ['achievement1'];

      const importedMetrics: AchievementMetrics = { score: [100], level: [5] };
      const importedUnlocked = ['achievement2'];

      const exported = exportAchievementData(importedMetrics, importedUnlocked);
      const result = importAchievementData(exported, currentMetrics, currentUnlocked, {
        mergeStrategy: 'preserve',
        validate: false,
      });

      expect(result.success).toBe(true);

      const preserved = (result as any).mergedMetrics;
      expect(preserved.score).toEqual([50]); // Kept current value
      expect(preserved.level).toEqual([5]); // Added new metric
    });

    test('should handle version mismatches with warning', () => {
      const data = {
        version: '1.0.0',
        timestamp: Date.now(),
        metrics: {},
        unlockedAchievements: [],
      };

      const result = importAchievementData(JSON.stringify(data), {}, [], { validate: false });

      expect(result.success).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings!.some((w) => w.includes('version'))).toBe(true);
    });

    test('should return errors for invalid data structure', () => {
      const invalidData = {
        // Missing required fields
        timestamp: Date.now(),
      };

      const result = importAchievementData(JSON.stringify(invalidData), {}, []);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    test('should validate metrics structure', () => {
      const invalidData = {
        version: '3.3.0',
        timestamp: Date.now(),
        metrics: {
          score: 100, // Should be array
        },
        unlockedAchievements: [],
      };

      const result = importAchievementData(JSON.stringify(invalidData), {}, []);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    test('should validate achievement IDs are strings', () => {
      const invalidData = {
        version: '3.3.0',
        timestamp: Date.now(),
        metrics: {},
        unlockedAchievements: [123, 'valid', 456], // Numbers should be rejected
      };

      const result = importAchievementData(JSON.stringify(invalidData), {}, []);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.some((e) => e.includes('strings'))).toBe(true);
    });

    test('should return import counts', () => {
      const metrics: AchievementMetrics = {
        score: [100],
        level: [5],
        health: [75],
      };
      const unlocked = ['achievement1', 'achievement2'];

      const exported = exportAchievementData(metrics, unlocked);
      const result = importAchievementData(exported, {}, [], { validate: false });

      expect(result.success).toBe(true);
      expect(result.imported.metrics).toBe(3);
      expect(result.imported.achievements).toBe(2);
    });

    test('should skip validation when validate: false', () => {
      const invalidData = {
        // Missing required fields but validation is off
        metrics: {},
        unlockedAchievements: [],
      };

      const result = importAchievementData(JSON.stringify(invalidData), {}, [], {
        validate: false,
      });

      // Should succeed because validation is skipped
      expect(result.success).toBe(true);
    });

    test('should handle empty imported data', () => {
      const exported = exportAchievementData({}, []);
      const result = importAchievementData(exported, {}, []);

      expect(result.success).toBe(true);
      expect(result.imported.metrics).toBe(0);
      expect(result.imported.achievements).toBe(0);
    });

    test('should merge numeric values correctly', () => {
      const currentMetrics: AchievementMetrics = { score: [100] };
      const importedMetrics: AchievementMetrics = { score: [50] };

      const exported = exportAchievementData(importedMetrics, []);
      const result = importAchievementData(exported, currentMetrics, [], {
        mergeStrategy: 'merge',
        validate: false,
      });

      expect(result.success).toBe(true);
      const merged = (result as any).mergedMetrics;
      expect(merged.score).toEqual([100]); // Kept higher value
    });

    test('should accept matching config hash', () => {
      const metrics: AchievementMetrics = { score: [100] };
      const unlocked = ['achievement1'];
      const hash = 'matching-hash';

      const exported = exportAchievementData(metrics, unlocked, hash);
      const result = importAchievementData(exported, {}, [], {
        expectedConfigHash: hash,
      });

      expect(result.success).toBe(true);
    });
  });
});
