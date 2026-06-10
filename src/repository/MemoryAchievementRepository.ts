import type {
    AchievementRepository,
    AchievementSubjectId,
    StoredAchievementState,
} from '../contracts';

const cloneState = (state: StoredAchievementState): StoredAchievementState => ({
    metrics: { ...state.metrics },
    unlockedIds: [...state.unlockedIds],
    unlockedAt: { ...(state.unlockedAt || {}) },
});

export class MemoryAchievementRepository implements AchievementRepository {
    private states = new Map<AchievementSubjectId, StoredAchievementState>();

    async getState(subjectId: AchievementSubjectId): Promise<StoredAchievementState | undefined> {
        const state = this.states.get(subjectId);
        return state ? cloneState(state) : undefined;
    }

    async saveState(
        subjectId: AchievementSubjectId,
        state: StoredAchievementState
    ): Promise<void> {
        this.states.set(subjectId, cloneState(state));
    }

    async clearState(subjectId: AchievementSubjectId): Promise<void> {
        this.states.delete(subjectId);
    }

    async withTransaction<T>(_subjectId: AchievementSubjectId, run: () => Promise<T>): Promise<T> {
        return run();
    }
}
