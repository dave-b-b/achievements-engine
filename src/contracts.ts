import type {
    AchievementConfetti,
    AchievementConfigurationType,
    EventMapping,
} from './types';

export type AchievementSubjectId = string;

export interface AchievementProgress {
    current: number;
    target: number;
    percent: number;
}

export interface AchievementDto<TConfetti = AchievementConfetti> {
    id: string;
    title: string;
    description?: string;
    icon?: string;
    iconKey?: string;
    isUnlocked: boolean;
    unlockedAt?: string | null;
    progress?: AchievementProgress;
    metadata?: Record<string, unknown>;
    confetti?: TConfetti;
}

export interface AchievementApiSnapshot<TConfetti = AchievementConfetti> {
    achievements: AchievementDto<TConfetti>[];
    unlockedIds: string[];
    unlockedAchievements: AchievementDto<TConfetti>[];
    unlockedCount: number;
    totalCount: number;
    metrics?: Record<string, unknown>;
}

export interface AchievementMutationResult<TConfetti = AchievementConfetti> {
    snapshot: AchievementApiSnapshot<TConfetti>;
    newlyUnlocked: AchievementDto<TConfetti>[];
}

export interface TrackAchievementInput {
    metric: string;
    value: unknown;
}

export interface TrackManyAchievementsInput {
    metrics: Record<string, unknown>;
}

export interface IncrementAchievementInput {
    metric: string;
    amount?: number;
}

export interface AchievementEventInput {
    name: string;
    payload?: unknown;
}

export interface StoredAchievementState {
    metrics: Record<string, unknown>;
    unlockedIds: string[];
    unlockedAt?: Record<string, string>;
}

export interface AchievementRepository {
    getState(subjectId: AchievementSubjectId): Promise<StoredAchievementState | undefined>;
    saveState(subjectId: AchievementSubjectId, state: StoredAchievementState): Promise<void>;
    clearState?(subjectId: AchievementSubjectId): Promise<void>;
    withTransaction?<T>(subjectId: AchievementSubjectId, run: () => Promise<T>): Promise<T>;
}

export interface AchievementServiceConfig {
    achievements: AchievementConfigurationType;
    repository: AchievementRepository;
    eventMapping?: EventMapping;
    clock?: () => Date;
}

export interface AchievementClient<TConfetti = AchievementConfetti> {
    getSnapshot(): Promise<AchievementApiSnapshot<TConfetti>>;
    track(metric: string, value: unknown): Promise<AchievementMutationResult<TConfetti>>;
    trackMany?(metrics: Record<string, unknown>): Promise<AchievementMutationResult<TConfetti>>;
    increment(metric: string, amount?: number): Promise<AchievementMutationResult<TConfetti>>;
    event(name: string, payload?: unknown): Promise<AchievementMutationResult<TConfetti>>;
    reset?(): Promise<AchievementApiSnapshot<TConfetti>>;
}

/** Snapshot and mutation aliases shared with React client integrations. */
export type AchievementClientSnapshot<TConfetti = AchievementConfetti> = AchievementApiSnapshot<TConfetti>;
export type AchievementClientMutationResult<TConfetti = AchievementConfetti> = AchievementMutationResult<TConfetti>;
