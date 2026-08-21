/**
 * AchievementEngine - Framework-agnostic achievement system
 * Event-based core with support for multiple storage backends
 */

import { EventEmitter, UnsubscribeFn } from './EventEmitter';
import { normalizeAchievements } from './utils/configNormalizer';
import { exportAchievementData, createConfigHash } from './utils/dataExport';
import { importAchievementData } from './utils/dataImport';
import { LocalStorage } from './storage/LocalStorage';
import { MemoryStorage } from './storage/MemoryStorage';
import { IndexedDBStorage } from './storage/IndexedDBStorage';
import { RestApiStorage } from './storage/RestApiStorage';
import { AsyncStorageAdapter } from './storage/AsyncStorageAdapter';
import type {
    EngineConfig,
    EngineEvent,
    AchievementMetrics,
    AchievementWithStatus,
    AchievementStorage,
    AsyncAchievementStorage,
    StorageType,
    ImportOptions,
    ImportResult,
    AchievementConfiguration,
    AchievementUnlockedEvent,
    AchievementSnapshot,
    AchievementUpdateResult,
    MetricUpdatedEvent,
    StateChangedEvent,
    ErrorEvent,
    EventMapping,
    MetricUpdater,
    isAsyncStorage,
    AchievementConfigurationType
} from './types';

interface ReadyStorageState {
    metrics: AchievementMetrics;
    unlocked: string[];
}

type ReadyStorage = AchievementStorage & {
    ready?: () => Promise<ReadyStorageState>;
};

export class AchievementEngine extends EventEmitter {
    private config: EngineConfig;
    private achievements: AchievementConfiguration;
    private storage: AchievementStorage;
    private metrics: Record<string, any> = {};
    private unlockedAchievements: string[] = [];
    private configHash: string;
    private readyPromise: Promise<AchievementSnapshot>;

    constructor(config: EngineConfig) {
        super();
        this.config = config;

        // Normalize achievements configuration
        this.achievements = normalizeAchievements(config.achievements);

        // Create config hash for export/import validation
        this.configHash = createConfigHash(config.achievements);

        // Initialize storage
        this.storage = this.initializeStorage(config);

        // Load initial state from storage
        this.loadFromStorage();

        this.readyPromise = this.initializeReadyState();
    }

    /**
     * Initialize storage based on configuration
     */
    private initializeStorage(config: EngineConfig): AchievementStorage {
        const { storage, onError, restApiConfig } = config;

        // If no storage specified, use memory storage
        if (!storage) {
            return new MemoryStorage();
        }

        // Handle string storage types
        if (typeof storage === 'string') {
            switch (storage) {
                case 'local':
                    return new LocalStorage('achievements');
                case 'memory':
                    return new MemoryStorage();
                case 'indexeddb': {
                    const indexedDB = new IndexedDBStorage('achievements-engine');
                    return new AsyncStorageAdapter(indexedDB, { onError });
                }
                case 'restapi': {
                    if (!restApiConfig) {
                        throw new Error('restApiConfig is required when using StorageType.RestAPI');
                    }
                    const restApi = new RestApiStorage(restApiConfig);
                    return new AsyncStorageAdapter(restApi, { onError });
                }
                default:
                    throw new Error(`Unsupported storage type: ${storage}`);
            }
        }

        // Handle custom storage instances
        const storageInstance = storage as any;
        if (typeof storageInstance.getMetrics === 'function') {
            // Check if async storage
            const testResult = storageInstance.getMetrics();
            if (testResult && typeof testResult.then === 'function') {
                if (typeof testResult.catch === 'function') {
                    testResult.catch(() => undefined);
                }
                return new AsyncStorageAdapter(storageInstance as AsyncAchievementStorage, { onError });
            }
            return storageInstance as AchievementStorage;
        }

        throw new Error('Invalid storage configuration');
    }

    /**
     * Load state from storage
     */
    private loadFromStorage(): void {
        try {
            const savedMetrics = this.storage.getMetrics() || {};
            const savedUnlocked = this.storage.getUnlockedAchievements() || [];

            this.applyStoredState(savedMetrics, savedUnlocked);
        } catch (error) {
            this.handleError(error as Error, 'loadFromStorage');
        }
    }

    /**
     * Wait for async storage hydration to finish, if the configured storage is async.
     */
    private initializeReadyState(): Promise<AchievementSnapshot> {
        const readyStorage = this.storage as ReadyStorage;

        if (typeof readyStorage.ready !== 'function') {
            return Promise.resolve(this.getSnapshot());
        }

        return readyStorage.ready()
            .then(({ metrics, unlocked }) => {
                this.applyStoredState(metrics, unlocked);
                const snapshot = this.getSnapshot();
                this.emitStateChanged(snapshot);
                return snapshot;
            })
            .catch((error) => {
                this.handleError(error as Error, 'ready');
                return this.getSnapshot();
            });
    }

    /**
     * Convert stored array metrics into the engine's simple runtime metric shape.
     */
    private applyStoredState(metrics: AchievementMetrics, unlocked: string[]): void {
        this.metrics = {};

        Object.entries(metrics).forEach(([key, value]) => {
            this.metrics[key] = Array.isArray(value) ? value[0] : value;
        });

        this.unlockedAchievements = [...unlocked];
    }

    /**
     * Save state to storage
     */
    private saveToStorage(): void {
        try {
            // Convert metrics to array format for storage
            const metricsForStorage = this.getMetricsAsArray();

            this.storage.setMetrics(metricsForStorage);
            this.storage.setUnlockedAchievements(this.unlockedAchievements);
        } catch (error) {
            this.handleError(error as Error, 'saveToStorage');
        }
    }

    /**
     * Handle errors with optional callback
     */
    private handleError(error: Error, context?: string): void {
        const errorEvent: ErrorEvent = {
            error,
            context,
            timestamp: Date.now()
        };

        // Emit error event
        super.emit<ErrorEvent>('error', errorEvent);

        // Call config error handler if provided
        if (this.config.onError) {
            this.config.onError(error);
        } else {
            // Fallback to console.error if no error handler provided
            console.error('[AchievementEngine]', context ? `${context}:` : '', error);
        }
    }

    /**
     * Emit a custom event and optionally update metrics based on event mapping
     * @param eventName - Name of the event
     * @param data - Event data
     */
    emit<T = any>(eventName: string, data?: T): void {
        // If this is a mapped event, update metrics
        if (this.config.eventMapping && eventName in this.config.eventMapping) {
            const mapping = this.config.eventMapping[eventName];

            if (typeof mapping === 'string') {
                // Direct mapping: event name -> metric name
                this.update({ [mapping]: data });
            } else if (typeof mapping === 'function') {
                // Custom transformer function
                const metricsUpdate = mapping(data, { ...this.metrics });
                this.update(metricsUpdate);
            }
        }

        // Emit the event to listeners
        super.emit(eventName, data);
    }

    /**
     * Update metrics and evaluate achievements
     * @param newMetrics - Metrics to update
     */
    update<T extends Record<string, any>>(newMetrics: Partial<T>): AchievementUpdateResult {
        // Update metrics
        Object.entries(newMetrics).forEach(([key, value]) => {
            const oldValue = this.metrics[key];
            this.metrics[key] = value;

            // Emit metric updated event
            if (oldValue !== value) {
                const metricEvent: MetricUpdatedEvent = {
                    metric: key,
                    oldValue,
                    newValue: value,
                    timestamp: Date.now()
                };
                super.emit<MetricUpdatedEvent>('metric:updated', metricEvent);
            }
        });

        // Evaluate achievements
        const newlyUnlocked = this.evaluateAchievements();

        // Save to storage
        this.saveToStorage();

        const snapshot = this.getSnapshot();
        this.emitStateChanged(snapshot);

        return {
            newlyUnlocked,
            snapshot
        };
    }

    /**
     * Increment a numeric metric by the provided amount.
     * Non-numeric and missing metric values are treated as 0.
     */
    increment(metric: string, amount: number = 1): AchievementUpdateResult {
        const currentValue = this.metrics[metric];
        const normalizedValue = Array.isArray(currentValue) ? currentValue[0] : currentValue;
        const numericValue = typeof normalizedValue === 'number' ? normalizedValue : 0;

        return this.update({ [metric]: numericValue + amount });
    }

    /**
     * Evaluate all achievements and unlock any newly met conditions
     * This is the core evaluation logic extracted from AchievementProvider
     */
    private evaluateAchievements(): AchievementUnlockedEvent[] {
        const newlyUnlockedAchievements: string[] = [];
        const newlyUnlockedEvents: AchievementUnlockedEvent[] = [];

        // Convert metrics to array format for condition checking
        const metricsInArrayFormat = this.getMetricsAsArray();

        // Iterate through all achievements
        Object.entries(this.achievements).forEach(([metricName, metricAchievements]) => {
            metricAchievements.forEach((achievement) => {
                const state = {
                    metrics: metricsInArrayFormat,
                    unlockedAchievements: this.unlockedAchievements
                };

                const achievementId = achievement.achievementDetails.achievementId;

                // Check if already unlocked
                if (
                    this.unlockedAchievements.includes(achievementId) ||
                    newlyUnlockedAchievements.includes(achievementId)
                ) {
                    return;
                }

                // Get current value for this metric
                const currentValue = this.metrics[metricName];

                // For custom conditions, we always check against all metrics
                // For threshold-based conditions, we check against the specific metric
                const shouldCheckAchievement = currentValue !== undefined ||
                    achievementId.includes('_custom_');

                if (shouldCheckAchievement) {
                    const valueToCheck = currentValue;

                    if (achievement.isConditionMet(valueToCheck, state)) {
                        newlyUnlockedAchievements.push(achievementId);
                        this.unlockedAchievements.push(achievementId);

                        newlyUnlockedEvents.push({
                            achievementId,
                            achievementTitle: achievement.achievementDetails.achievementTitle || 'Achievement Unlocked!',
                            achievementDescription: achievement.achievementDetails.achievementDescription || '',
                            achievementIconKey: achievement.achievementDetails.achievementIconKey,
                            timestamp: Date.now()
                        });
                    }
                }
            });
        });

        // Emit after evaluation so dependent achievements can observe unlocks
        // from earlier conditions in the same update.
        if (newlyUnlockedAchievements.length > 0) {
            newlyUnlockedEvents.forEach((unlockEvent) => {
                super.emit<AchievementUnlockedEvent>('achievement:unlocked', unlockEvent);
            });
        }

        return newlyUnlockedEvents;
    }

    /**
     * Get metrics in array format (for backward compatibility with storage)
     */
    private getMetricsAsArray(): AchievementMetrics {
        const metricsInArrayFormat: AchievementMetrics = {};
        Object.entries(this.metrics).forEach(([key, value]) => {
            metricsInArrayFormat[key] = Array.isArray(value) ? [...value] : [value];
        });
        return metricsInArrayFormat;
    }

    /**
     * Wait until the engine has loaded any async storage state.
     */
    ready(): Promise<AchievementSnapshot> {
        return this.readyPromise;
    }

    /**
     * Get current metrics (readonly to prevent external modification)
     */
    getMetrics<T extends Record<string, any>>(): Readonly<Partial<T>> {
        return Object.freeze({ ...this.metrics }) as Readonly<Partial<T>>;
    }

    /**
     * Get unlocked achievement IDs (readonly)
     */
    getUnlocked(): readonly string[] {
        return Object.freeze([...this.unlockedAchievements]);
    }

    /**
     * Get all achievements with their unlock status
     */
    getAllAchievements(): AchievementWithStatus[] {
        const result: AchievementWithStatus[] = [];

        Object.entries(this.achievements).forEach(([_metricName, metricAchievements]) => {
            metricAchievements.forEach((achievement) => {
                const { achievementDetails } = achievement;
                const isUnlocked = this.unlockedAchievements.includes(achievementDetails.achievementId);
                const progressDefinition = achievement.progress;
                const rawCurrent = progressDefinition
                    ? this.metrics[progressDefinition.metric]
                    : undefined;
                const current = typeof rawCurrent === 'number' ? rawCurrent : 0;
                const target = progressDefinition?.target;

                result.push({
                    ...achievementDetails,
                    achievementTitle: achievementDetails.achievementTitle || '',
                    achievementDescription: achievementDetails.achievementDescription || '',
                    isUnlocked,
                    progress: target === undefined ? undefined : {
                        current,
                        target,
                        percent: isUnlocked
                            ? 100
                            : Math.max(0, Math.min(100, target <= 0 ? 100 : (current / target) * 100)),
                    },
                });
            });
        });

        return result;
    }

    /**
     * Get one React-friendly snapshot of all derived achievement state.
     */
    getSnapshot(): AchievementSnapshot {
        const unlockedIds = [...this.unlockedAchievements];
        const unlockedIdSet = new Set(unlockedIds);
        const allAchievements = this.getAllAchievements();
        const unlockedAchievements = allAchievements.filter((achievement) =>
            unlockedIdSet.has(achievement.achievementId)
        );

        return {
            metrics: this.getMetricsAsArray(),
            unlockedIds,
            unlockedAchievements,
            allAchievements,
            unlockedCount: unlockedIds.length,
            totalCount: allAchievements.length
        };
    }

    private emitStateChanged(snapshot: AchievementSnapshot): void {
        const stateEvent: StateChangedEvent = {
            ...snapshot,
            unlocked: [...snapshot.unlockedIds],
            timestamp: Date.now()
        };

        super.emit<StateChangedEvent>('state:changed', stateEvent);
    }

    /**
     * Reset all achievement data
     */
    reset(): void {
        this.metrics = {};
        this.unlockedAchievements = [];

        try {
            this.storage.clear();
        } catch (error) {
            this.handleError(error as Error, 'reset');
        }

        this.emitStateChanged(this.getSnapshot());
    }

    /**
     * Clean up resources and event listeners
     */
    destroy(): void {
        this.removeAllListeners();
    }

    /**
     * Export achievement data as JSON string
     */
    export(): string {
        const metricsInArrayFormat = this.getMetricsAsArray();
        return exportAchievementData(metricsInArrayFormat, this.unlockedAchievements, this.configHash);
    }

    /**
     * Import achievement data from JSON string
     * @param jsonString - Exported achievement data
     * @param options - Import options
     */
    import(jsonString: string, options?: ImportOptions): ImportResult {
        const metricsInArrayFormat = this.getMetricsAsArray();

        // Transform options from public API format to internal format
        const internalOptions = {
            mergeStrategy: options?.merge ? 'merge' as const :
                          options?.overwrite ? 'replace' as const :
                          'replace' as const,
            validate: options?.validateConfig ?? true,
            expectedConfigHash: this.configHash
        };

        const result = importAchievementData(
            jsonString,
            metricsInArrayFormat,
            this.unlockedAchievements,
            internalOptions
        );

        if (result.success && 'mergedMetrics' in result && 'mergedUnlocked' in result) {
            // Convert metrics from array format to simple format
            const mergedMetrics: Record<string, any> = {};
            Object.entries(result.mergedMetrics!).forEach(([key, value]) => {
                mergedMetrics[key] = Array.isArray(value) ? value[0] : value;
            });

            this.metrics = mergedMetrics;
            this.unlockedAchievements = (result.mergedUnlocked as string[]) || [];

            // Save to storage
            this.saveToStorage();

            this.emitStateChanged(this.getSnapshot());
        }

        return result;
    }

    /**
     * Subscribe to engine events
     * @param event - Event name
     * @param handler - Event handler
     */
    on(event: EngineEvent, handler: (data: any) => void): UnsubscribeFn {
        return super.on(event, handler);
    }

    /**
     * Subscribe to an event once
     * @param event - Event name
     * @param handler - Event handler
     */
    once(event: EngineEvent, handler: (data: any) => void): UnsubscribeFn {
        return super.once(event, handler);
    }

    /**
     * Unsubscribe from an event
     * @param event - Event name
     * @param handler - Event handler
     */
    off(event: EngineEvent, handler: (data: any) => void): void {
        return super.off(event, handler);
    }
}
