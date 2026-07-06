import {
  AchievementService,
  MemoryAchievementRepository,
  createAchievementFetchHandler,
} from '../src/server';

const OriginalResponse = globalThis.Response;

class TestResponse {
  status: number;
  private body: string;

  constructor(body: string, init?: { status?: number }) {
    this.body = body;
    this.status = init?.status || 200;
  }

  async json(): Promise<any> {
    return JSON.parse(this.body);
  }
}

const achievements = {
  score: {
    100: { title: 'Century', description: 'Score 100 points', icon: 'trophy' },
    1000: {
      title: 'Grand',
      description: 'Score 1,000 points',
      icon: 'crown',
      confetti: { particleCount: 200 },
    },
  },
  completedLesson: {
    true: { title: 'First Lesson', description: 'Complete a lesson', icon: 'book' },
  },
  combo: {
    perfect: {
      title: 'Perfect Combo',
      icon: 'spark',
      condition: (metrics: Record<string, unknown>) => metrics.score === 1000,
    },
  },
};

describe('AchievementService', () => {
  beforeAll(() => {
    (globalThis as any).Response = TestResponse;
  });

  afterAll(() => {
    globalThis.Response = OriginalResponse;
  });

  it('tracks metrics, persists state, and returns newly unlocked achievements', async () => {
    const service = new AchievementService({
      achievements,
      repository: new MemoryAchievementRepository(),
      clock: () => new Date('2026-01-01T00:00:00.000Z'),
    });

    const result = await service.track('user-1', { metric: 'score', value: 100 });

    expect(result.newlyUnlocked).toEqual([
      expect.objectContaining({
        id: 'score_100',
        title: 'Century',
        isUnlocked: true,
        unlockedAt: '2026-01-01T00:00:00.000Z',
      }),
    ]);
    expect(result.snapshot.unlockedIds).toEqual(['score_100']);
    expect(result.snapshot.metrics).toEqual({ score: 100 });

    const snapshot = await service.getSnapshot('user-1');
    expect(snapshot.unlockedCount).toBe(1);
    expect(snapshot.achievements).toHaveLength(4);
  });

  it('preserves reward confetti and stable custom achievement IDs in snapshots', async () => {
    const service = new AchievementService({
      achievements,
      repository: new MemoryAchievementRepository(),
    });

    const result = await service.track('user-1', { metric: 'score', value: 1000 });

    expect(result.snapshot.achievements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'score_1000',
          confetti: { particleCount: 200 },
        }),
        expect.objectContaining({
          id: 'combo_custom_perfect',
          title: 'Perfect Combo',
        }),
      ])
    );
    expect(result.newlyUnlocked.map((achievement) => achievement.id)).toEqual([
      'score_100',
      'score_1000',
      'combo_custom_perfect',
    ]);
  });

  it('increments metrics and maps semantic events on the server', async () => {
    const service = new AchievementService({
      achievements,
      repository: new MemoryAchievementRepository(),
      eventMapping: {
        'lesson.completed': () => ({ completedLesson: true }),
      },
    });

    await service.increment('user-1', { metric: 'score', amount: 40 });
    const incrementResult = await service.increment('user-1', { metric: 'score', amount: 60 });
    const eventResult = await service.event('user-1', { name: 'lesson.completed' });

    expect(incrementResult.newlyUnlocked.map((achievement) => achievement.id)).toEqual([
      'score_100',
    ]);
    expect(eventResult.newlyUnlocked.map((achievement) => achievement.id)).toEqual([
      'completedLesson_true',
    ]);
    expect(eventResult.snapshot.unlockedIds).toEqual([
      'score_100',
      'completedLesson_true',
    ]);
  });

  it('creates a fetch handler for the shared REST contract', async () => {
    const service = new AchievementService({
      achievements,
      repository: new MemoryAchievementRepository(),
    });
    const handler = createAchievementFetchHandler({
      service,
      basePath: '/api/achievements',
      getSubjectId: () => 'user-1',
    });

    const response = await handler({
      url: 'https://example.com/api/achievements/track',
      method: 'POST',
      json: async () => ({ metric: 'score', value: 100 }),
    } as Request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.newlyUnlocked[0].id).toBe('score_100');
  });

  it('returns 400 for malformed mutation request bodies', async () => {
    const repository = new MemoryAchievementRepository();
    const service = new AchievementService({
      achievements,
      repository,
    });
    const handler = createAchievementFetchHandler({
      service,
      basePath: '/api/achievements',
      getSubjectId: () => 'user-1',
    });

    const response = await handler({
      url: 'https://example.com/api/achievements/track',
      method: 'POST',
      json: async () => ({}),
    } as Request);

    expect(response.status).toBe(400);
    expect(await service.getSnapshot('user-1')).toEqual(
      expect.objectContaining({
        metrics: {},
        unlockedIds: [],
      })
    );
  });
});
