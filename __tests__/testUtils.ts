/**
 * Test utilities for achievement engine tests
 */

import { AchievementEngine } from '../src/AchievementEngine';
import { MemoryStorage } from '../src/storage/MemoryStorage';
import type { EngineConfig, AchievementStorage, AchievementMetrics } from '../src/types';

/**
 * Create a test engine with default configuration
 */
export function createTestEngine(config?: Partial<EngineConfig>): AchievementEngine {
  const defaultConfig: EngineConfig = {
    achievements: {
      score: [
        {
          isConditionMet: (value) => {
            const numValue = Array.isArray(value) ? value[0] : value;
            return typeof numValue === 'number' && numValue >= 100;
          },
          achievementDetails: {
            achievementId: 'score_100',
            achievementTitle: 'Century Club',
            achievementDescription: 'Reach 100 points',
            achievementIconKey: 'trophy',
          },
        },
      ],
    },
    storage: new MemoryStorage(),
    ...config,
  };

  return new AchievementEngine(defaultConfig);
}

/**
 * Wait for async operations to complete
 */
export async function waitForAsync(ms = 0): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a mock storage implementation
 */
export function createMockStorage(): AchievementStorage {
  const storage = new MemoryStorage();

  return {
    getMetrics: jest.fn(() => storage.getMetrics()),
    setMetrics: jest.fn((metrics: AchievementMetrics) => storage.setMetrics(metrics)),
    getUnlockedAchievements: jest.fn(() => storage.getUnlockedAchievements()),
    setUnlockedAchievements: jest.fn((achievements: string[]) =>
      storage.setUnlockedAchievements(achievements)
    ),
    clear: jest.fn(() => storage.clear()),
  };
}

/**
 * Directly unlock an achievement for testing
 */
export function unlockAchievement(engine: AchievementEngine, achievementId: string): void {
  // Use type assertion to access private properties for testing
  const engineAny = engine as any;
  if (!engineAny.unlockedAchievements.includes(achievementId)) {
    engineAny.unlockedAchievements.push(achievementId);
  }
}

/**
 * Custom matcher to check if achievement is unlocked
 */
export function expectAchievementUnlocked(
  engine: AchievementEngine,
  achievementId: string
): void {
  const unlocked = engine.getUnlocked();
  expect(unlocked).toContain(achievementId);
}

/**
 * Custom matcher to check if achievement is NOT unlocked
 */
export function expectAchievementLocked(
  engine: AchievementEngine,
  achievementId: string
): void {
  const unlocked = engine.getUnlocked();
  expect(unlocked).not.toContain(achievementId);
}
