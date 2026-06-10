import { normalizeAchievements } from './utils/configNormalizer';
import type {
    AchievementConfiguration,
    AchievementMetricValue,
    AchievementMetrics,
    AchievementCondition,
} from './types';
import type {
    AchievementApiSnapshot,
    AchievementDto,
    AchievementEventInput,
    AchievementMutationResult,
    AchievementRepository,
    AchievementServiceConfig,
    AchievementSubjectId,
    IncrementAchievementInput,
    StoredAchievementState,
    TrackAchievementInput,
    TrackManyAchievementsInput,
} from './contracts';

const emptyState = (): StoredAchievementState => ({
    metrics: {},
    unlockedIds: [],
    unlockedAt: {},
});

const toMetricsForConditions = (metrics: Record<string, unknown>): AchievementMetrics => {
    const result: AchievementMetrics = {};

    Object.entries(metrics).forEach(([key, value]) => {
        result[key] = Array.isArray(value)
            ? (value as AchievementMetricValue[])
            : [value as AchievementMetricValue];
    });

    return result;
};

const normalizeState = (state?: StoredAchievementState): StoredAchievementState => {
    if (!state) {
        return emptyState();
    }

    return {
        metrics: { ...state.metrics },
        unlockedIds: [...state.unlockedIds],
        unlockedAt: { ...(state.unlockedAt || {}) },
    };
};

export class AchievementService {
    private achievements: AchievementConfiguration;
    private repository: AchievementRepository;
    private config: AchievementServiceConfig;
    private clock: () => Date;

    constructor(config: AchievementServiceConfig) {
        this.config = config;
        this.repository = config.repository;
        this.achievements = normalizeAchievements(config.achievements);
        this.clock = config.clock || (() => new Date());
    }

    async getSnapshot(subjectId: AchievementSubjectId): Promise<AchievementApiSnapshot> {
        const state = normalizeState(await this.repository.getState(subjectId));
        return this.toSnapshot(state);
    }

    async track(
        subjectId: AchievementSubjectId,
        input: TrackAchievementInput | TrackManyAchievementsInput
    ): Promise<AchievementMutationResult> {
        const metrics = 'metrics' in input ? input.metrics : { [input.metric]: input.value };
        return this.mutate(subjectId, (state) => this.applyMetricUpdate(state, metrics));
    }

    async increment(
        subjectId: AchievementSubjectId,
        input: IncrementAchievementInput
    ): Promise<AchievementMutationResult> {
        return this.mutate(subjectId, (state) => {
            const currentValue = state.metrics[input.metric];
            const currentNumber = typeof currentValue === 'number' ? currentValue : 0;
            return this.applyMetricUpdate(state, {
                [input.metric]: currentNumber + (input.amount ?? 1),
            });
        });
    }

    async event(
        subjectId: AchievementSubjectId,
        input: AchievementEventInput
    ): Promise<AchievementMutationResult> {
        return this.mutate(subjectId, (state) => {
            const mapping = this.config.eventMapping?.[input.name];

            if (!mapping) {
                return { state, newlyUnlocked: [] };
            }

            const metricsUpdate = typeof mapping === 'string'
                ? { [mapping]: input.payload }
                : mapping(input.payload, { ...state.metrics });

            return this.applyMetricUpdate(state, metricsUpdate);
        });
    }

    async reset(subjectId: AchievementSubjectId): Promise<AchievementApiSnapshot> {
        if (this.repository.clearState) {
            await this.repository.clearState(subjectId);
        } else {
            await this.repository.saveState(subjectId, emptyState());
        }

        return this.getSnapshot(subjectId);
    }

    private async mutate(
        subjectId: AchievementSubjectId,
        apply: (state: StoredAchievementState) => {
            state: StoredAchievementState;
            newlyUnlocked: AchievementDto[];
        }
    ): Promise<AchievementMutationResult> {
        const run = async () => {
            const currentState = normalizeState(await this.repository.getState(subjectId));
            const { state, newlyUnlocked } = apply(currentState);
            await this.repository.saveState(subjectId, state);

            return {
                snapshot: this.toSnapshot(state),
                newlyUnlocked,
            };
        };

        if (this.repository.withTransaction) {
            return this.repository.withTransaction(subjectId, run);
        }

        return run();
    }

    private applyMetricUpdate(
        state: StoredAchievementState,
        metrics: Record<string, unknown>
    ): { state: StoredAchievementState; newlyUnlocked: AchievementDto[] } {
        const nextState = normalizeState(state);
        nextState.metrics = {
            ...nextState.metrics,
            ...metrics,
        };

        const newlyUnlocked = this.evaluate(nextState);

        return { state: nextState, newlyUnlocked };
    }

    private evaluate(state: StoredAchievementState): AchievementDto[] {
        const newlyUnlocked: AchievementDto[] = [];
        const metricsForConditions = toMetricsForConditions(state.metrics);
        const unlockedIds = new Set(state.unlockedIds);
        const unlockedAt = state.unlockedAt || {};
        state.unlockedAt = unlockedAt;

        Object.entries(this.achievements).forEach(([metricName, metricAchievements]) => {
            metricAchievements.forEach((achievement) => {
                const achievementId = achievement.achievementDetails.achievementId;

                if (unlockedIds.has(achievementId)) {
                    return;
                }

                const currentValue = state.metrics[metricName];
                const shouldCheckAchievement = currentValue !== undefined ||
                    achievementId.includes('_custom_');

                if (!shouldCheckAchievement) {
                    return;
                }

                const conditionState = {
                    metrics: metricsForConditions,
                    unlockedAchievements: state.unlockedIds,
                };

                if (achievement.isConditionMet(currentValue as AchievementMetricValue, conditionState)) {
                    const unlockedAtValue = this.clock().toISOString();
                    state.unlockedIds.push(achievementId);
                    unlockedIds.add(achievementId);
                    unlockedAt[achievementId] = unlockedAtValue;
                    newlyUnlocked.push(this.toDto(achievement, true, unlockedAtValue));
                }
            });
        });

        return newlyUnlocked;
    }

    private toSnapshot(state: StoredAchievementState): AchievementApiSnapshot {
        const unlockedIds = [...state.unlockedIds];
        const unlockedIdSet = new Set(unlockedIds);
        const achievements = this.getAchievementConditions().map((achievement) => {
            const id = achievement.achievementDetails.achievementId;
            return this.toDto(achievement, unlockedIdSet.has(id), state.unlockedAt?.[id] || null);
        });
        const unlockedAchievements = achievements.filter((achievement) => achievement.isUnlocked);

        return {
            achievements,
            unlockedIds,
            unlockedAchievements,
            unlockedCount: unlockedAchievements.length,
            totalCount: achievements.length,
            metrics: { ...state.metrics },
        };
    }

    private getAchievementConditions(): AchievementCondition[] {
        return Object.values(this.achievements).flatMap((metricAchievements) => metricAchievements);
    }

    private toDto(
        achievement: AchievementCondition,
        isUnlocked: boolean,
        unlockedAt?: string | null
    ): AchievementDto {
        const details = achievement.achievementDetails;

        return {
            id: details.achievementId,
            title: details.achievementTitle || '',
            description: details.achievementDescription || '',
            icon: details.achievementIconKey,
            iconKey: details.achievementIconKey,
            isUnlocked,
            unlockedAt: unlockedAt || null,
        };
    }
}
