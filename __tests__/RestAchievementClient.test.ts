/** @jest-environment node */
import {
  AchievementService,
  MemoryAchievementRepository,
  RestAchievementClient,
  createRestAchievementClient,
} from '../src';
import { createAchievementFetchHandler } from '../src/server';

const achievements = {
  score: { 10: { title: 'Ten', confetti: { customCelebration: true } } },
  done: { true: { title: 'Done' } },
};

describe('framework-independent REST client', () => {
  it('round-trips all operations through the real fetch handler without React or browser globals', async () => {
    const service = new AchievementService({
      achievements,
      repository: new MemoryAchievementRepository(),
      eventMapping: { finished: () => ({ done: true }) },
    });
    const handler = createAchievementFetchHandler({
      service,
      basePath: '/api/achievements',
      getSubjectId: () => 'subject',
    });
    const fetcher = jest.fn((input: RequestInfo | URL, init?: RequestInit) =>
      handler(new Request(input, init)));
    const client = createRestAchievementClient({
      baseUrl: 'https://example.test/api/achievements/',
      fetcher,
      credentials: 'include',
      headers: async () => new Headers({ Authorization: 'synthetic-test-token' }),
    });

    expect((await client.getSnapshot()).unlockedIds).toEqual([]);
    const tracked = await client.track('score', 4);
    expect(tracked.snapshot.achievements[0].progress).toEqual({ current: 4, target: 10, percent: 40 });
    const incremented = await client.increment('score', 6);
    expect(incremented.newlyUnlocked[0]).toMatchObject({
      id: 'score_10', confetti: { customCelebration: true }, progress: { percent: 100 },
    });
    expect((await client.event('finished')).newlyUnlocked[0].id).toBe('done_true');
    expect((await client.trackMany!({ score: 12, done: false })).snapshot.metrics).toEqual({ score: 12, done: false });
    expect((await client.reset!()).unlockedIds).toEqual([]);
    expect((await client.increment('score')).snapshot.metrics).toEqual({ score: 1 });

    const requestOptions = fetcher.mock.calls[0][1]!;
    expect(requestOptions.credentials).toBe('include');
    expect(new Headers(requestOptions.headers).get('authorization')).toBe('synthetic-test-token');
    expect(new Headers(requestOptions.headers).get('content-type')).toBe('application/json');
  });

  it('supports tuple headers and preserves an explicit content type', async () => {
    const fetcher = jest.fn().mockResolvedValue(new Response('{}'));
    const client = new RestAchievementClient({
      baseUrl: '/api/achievements', fetcher,
      headers: [['X-Test', 'tuple'], ['Content-Type', 'application/custom+json']],
    });
    await client.getSnapshot();
    const headers = new Headers(fetcher.mock.calls[0][1].headers);
    expect(headers.get('x-test')).toBe('tuple');
    expect(headers.get('content-type')).toBe('application/custom+json');
  });

  it('rejects HTTP errors', async () => {
    const client = new RestAchievementClient({
      baseUrl: '/api/achievements',
      fetcher: async () => new Response('{}', { status: 503 }),
    });
    await expect(client.getSnapshot()).rejects.toThrow('Achievement request failed: HTTP 503');
  });

  it('aborts timed out requests and clears the timeout', async () => {
    jest.useFakeTimers();
    try {
      const fetcher = jest.fn((_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
        }));
      const client = new RestAchievementClient({ baseUrl: '/api', fetcher, timeout: 25 });
      const pending = client.getSnapshot();
      const rejection = expect(pending).rejects.toThrow('aborted');
      await jest.advanceTimersByTimeAsync(25);
      await rejection;
      expect(jest.getTimerCount()).toBe(0);
    } finally {
      jest.useRealTimers();
    }
  });
});
