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

export interface AchievementDto {
    id: string;
    title: string;
    description?: string;
    icon?: string;
    iconKey?: string;
    isUnlocked: boolean;
    unlockedAt?: string | null;
    progress?: AchievementProgress;
    metadata?: Record<string, unknown>;
    confetti?: AchievementConfetti;
}

export interface AchievementApiSnapshot {
    achievements: AchievementDto[];
    unlockedIds: string[];
    unlockedAchievements: AchievementDto[];
    unlockedCount: number;
    totalCount: number;
    metrics?: Record<string, unknown>;
}

export interface AchievementMutationResult {
    snapshot: AchievementApiSnapshot;
    newlyUnlocked: AchievementDto[];
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

export interface AchievementClient {
    getSnapshot(): Promise<AchievementApiSnapshot>;
    track(metric: string, value: unknown): Promise<AchievementMutationResult>;
    trackMany?(metrics: Record<string, unknown>): Promise<AchievementMutationResult>;
    increment(metric: string, amount?: number): Promise<AchievementMutationResult>;
    event(name: string, payload?: unknown): Promise<AchievementMutationResult>;
    reset?(): Promise<AchievementApiSnapshot>;
}
