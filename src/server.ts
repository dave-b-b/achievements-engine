export { AchievementService } from './AchievementService';
export { MemoryAchievementRepository } from './repository/MemoryAchievementRepository';

export type {
    AchievementApiSnapshot,
    AchievementClient,
    AchievementDto,
    AchievementEventInput,
    AchievementMutationResult,
    AchievementProgress,
    AchievementRepository,
    AchievementServiceConfig,
    AchievementSubjectId,
    IncrementAchievementInput,
    StoredAchievementState,
    TrackAchievementInput,
    TrackManyAchievementsInput,
} from './contracts';

import type { AchievementService } from './AchievementService';
import type {
    AchievementEventInput,
    AchievementSubjectId,
    IncrementAchievementInput,
    TrackAchievementInput,
    TrackManyAchievementsInput,
} from './contracts';

export interface AchievementFetchHandlerOptions {
    service: AchievementService;
    getSubjectId: (request: Request) => AchievementSubjectId | Promise<AchievementSubjectId>;
    basePath?: string;
}

const jsonResponse = (body: unknown, status = 200): Response => new Response(
    JSON.stringify(body),
    {
        status,
        headers: { 'Content-Type': 'application/json' },
    }
);

const readJsonBody = async <T>(request: Request): Promise<T> => {
    try {
        return await request.json() as T;
    } catch (_error) {
        return {} as T;
    }
};

const stripBasePath = (pathname: string, basePath: string): string => {
    const normalizedBase = basePath.replace(/\/$/, '');

    if (!normalizedBase || !pathname.startsWith(normalizedBase)) {
        return pathname.replace(/^\//, '');
    }

    return pathname.slice(normalizedBase.length).replace(/^\//, '');
};

export const createAchievementFetchHandler = ({
    service,
    getSubjectId,
    basePath = '',
}: AchievementFetchHandlerOptions) => {
    return async (request: Request): Promise<Response> => {
        try {
            const subjectId = await getSubjectId(request);
            const url = new URL(request.url);
            const route = stripBasePath(url.pathname, basePath);

            if (request.method === 'GET' && route === '') {
                return jsonResponse(await service.getSnapshot(subjectId));
            }

            if (request.method === 'POST' && route === 'track') {
                const body = await readJsonBody<TrackAchievementInput | TrackManyAchievementsInput>(request);
                return jsonResponse(await service.track(subjectId, body));
            }

            if (request.method === 'POST' && route === 'increment') {
                const body = await readJsonBody<IncrementAchievementInput>(request);
                return jsonResponse(await service.increment(subjectId, body));
            }

            if (request.method === 'POST' && route === 'event') {
                const body = await readJsonBody<AchievementEventInput>(request);
                return jsonResponse(await service.event(subjectId, body));
            }

            if (request.method === 'POST' && route === 'reset') {
                return jsonResponse(await service.reset(subjectId));
            }

            return jsonResponse({ error: 'Not found' }, 404);
        } catch (error) {
            return jsonResponse(
                { error: error instanceof Error ? error.message : 'Achievement request failed' },
                500
            );
        }
    };
};
