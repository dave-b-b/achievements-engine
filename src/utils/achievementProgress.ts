import type { AchievementCondition } from '../types';
import type { AchievementProgress } from '../contracts';

/** Derive numeric progress from normalized rules for local and server snapshots. */
export const deriveAchievementProgress = (
    definition: AchievementCondition['progress'],
    metrics: Readonly<Record<string, unknown>>,
    isUnlocked: boolean
): AchievementProgress | undefined => {
    if (!definition) {
        return undefined;
    }

    const rawCurrent = metrics[definition.metric];
    const value = Array.isArray(rawCurrent) ? rawCurrent[0] : rawCurrent;
    const current = typeof value === 'number' && Number.isFinite(value) ? value : 0;
    const target = definition.target;

    return {
        current,
        target,
        percent: isUnlocked
            ? 100
            : Math.max(0, Math.min(100, target <= 0 ? 100 : (current / target) * 100)),
    };
};
