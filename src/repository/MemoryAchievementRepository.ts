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
    private transactions = new Map<AchievementSubjectId, Promise<void>>();

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

    async withTransaction<T>(subjectId: AchievementSubjectId, run: () => Promise<T>): Promise<T> {
        const previous = this.transactions.get(subjectId) || Promise.resolve();
        let release: () => void = () => {};
        const current = new Promise<void>((resolve) => {
            release = resolve;
        });

        this.transactions.set(subjectId, current);
        await previous.catch(() => undefined);

        try {
            return await run();
        } finally {
            release();
            if (this.transactions.get(subjectId) === current) {
                this.transactions.delete(subjectId);
            }
        }
    }
}
