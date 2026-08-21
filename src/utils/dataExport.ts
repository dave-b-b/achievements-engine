import { AchievementMetrics } from '../types';

/**
 * Structure of exported achievement data
 */
export interface ExportedData {
  version: string;
  timestamp: number;
  metrics: AchievementMetrics;
  unlockedAchievements: string[];
  configHash?: string;
}

/**
 * Exports achievement data to a JSON string
 *
 * @param metrics - Current achievement metrics
 * @param unlocked - Array of unlocked achievement IDs
 * @param configHash - Optional hash of achievement configuration for validation
 * @returns JSON string containing all achievement data
 *
 * @example
 * ```typescript
 * const json = exportAchievementData(_metrics, ['score_100', 'level_5']);
 * // Save json to file or send to server
 * ```
 */
export function exportAchievementData(
  metrics: AchievementMetrics,
  unlocked: string[],
  configHash?: string
): string {
  const data: ExportedData = {
    version: '3.3.0',
    timestamp: Date.now(),
    metrics,
    unlockedAchievements: unlocked,
    ...(configHash && { configHash })
  };

  return JSON.stringify(data, null, 2);
}

/**
 * Creates a simple hash of the achievement configuration
 * Used to validate that imported data matches the current configuration
 *
 * @param config - Achievement configuration object
 * @returns Simple hash string
 */
export function createConfigHash(config: any): string {
  const seen = new WeakSet<object>();
  const serialize = (value: unknown): string => {
    if (typeof value === 'function') return `function:${value.toString()}`;
    if (value === undefined) return 'undefined';
    if (typeof value === 'number' && !Number.isFinite(value)) return `number:${String(value)}`;
    if (value === null || typeof value !== 'object') return JSON.stringify(value);
    if (seen.has(value)) throw new TypeError('Achievement configuration must not be circular');

    seen.add(value);
    const serialized = Array.isArray(value)
      ? `[${value.map(serialize).join(',')}]`
      : `{${Object.keys(value as Record<string, unknown>)
          .sort()
          .map((key) => `${JSON.stringify(key)}:${serialize((value as Record<string, unknown>)[key])}`)
          .join(',')}}`;
    seen.delete(value);
    return serialized;
  };
  const str = serialize(config);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
}
