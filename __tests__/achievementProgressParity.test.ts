import { AchievementEngine, AchievementService, MemoryAchievementRepository } from '../src';

const achievements = {
  score: {
    10: { title: 'Ten' },
    0: { title: 'Zero' },
    custom: { title: 'Custom', condition: (metrics: Record<string, unknown>) => metrics.done === true },
  },
  done: { true: { title: 'Done' } },
};

describe('canonical snapshot progress', () => {
  it.each([undefined, -5, 4, 15, [4], Number.NaN, Number.POSITIVE_INFINITY])(
    'keeps local and service progress equal for metric %p', async (value) => {
      const engine = new AchievementEngine({ achievements });
      const service = new AchievementService({ achievements, repository: new MemoryAchievementRepository() });
      await engine.ready();
      if (value !== undefined) {
        engine.update({ score: value });
        await service.track('subject', { metric: 'score', value });
      }
      const local = engine.getSnapshot().allAchievements;
      const remote = (await service.getSnapshot('subject')).achievements;
      expect(local.map(({ achievementId, progress, isUnlocked }) => ({ id: achievementId, progress, isUnlocked })))
        .toEqual(remote.map(({ id, progress, isUnlocked }) => ({ id, progress, isUnlocked })));
      for (const achievement of remote) {
        if (achievement.progress) {
          expect(Number.isFinite(achievement.progress.percent)).toBe(true);
          expect(achievement.progress.percent).toBeGreaterThanOrEqual(0);
          expect(achievement.progress.percent).toBeLessThanOrEqual(100);
        }
      }
      expect(remote.find(({ id }) => id === 'score_custom_custom')?.progress).toBeUndefined();
      expect(remote.find(({ id }) => id === 'done_true')?.progress).toBeUndefined();
      engine.destroy();
    }
  );
});
