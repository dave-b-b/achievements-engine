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
  },
  completedLesson: {
    true: { title: 'First Lesson', description: 'Complete a lesson', icon: 'book' },
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
    expect(snapshot.achievements).toHaveLength(2);
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
});
