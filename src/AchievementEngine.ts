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
    MetricUpdatedEvent,
    StateChangedEvent,
    ErrorEvent,
    EventMapping,
    MetricUpdater,
    isAsyncStorage,
    AchievementConfigurationType
} from './types';

export class AchievementEngine extends EventEmitter {
    private config: EngineConfig;
    private achievements: AchievementConfiguration;
    private storage: AchievementStorage;
    private metrics: Record<string, any> = {};
    private unlockedAchievements: string[] = [];
    private configHash: string;

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

            // Convert metrics from array format to simple format
            Object.entries(savedMetrics).forEach(([key, value]) => {
                this.metrics[key] = Array.isArray(value) ? value[0] : value;
            });

            this.unlockedAchievements = savedUnlocked;
        } catch (error) {
            this.handleError(error as Error, 'loadFromStorage');
        }
    }

    /**
     * Save state to storage
     */
    private saveToStorage(): void {
        try {
            // Convert metrics to array format for storage
            const metricsForStorage: AchievementMetrics = {};
            Object.entries(this.metrics).forEach(([key, value]) => {
                metricsForStorage[key] = Array.isArray(value) ? value : [value];
            });

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
        this.emit<ErrorEvent>('error', errorEvent);

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
    update<T extends Record<string, any>>(newMetrics: Partial<T>): void {
        const oldMetrics = { ...this.metrics };

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
        this.evaluateAchievements();

        // Save to storage
        this.saveToStorage();

        // Emit state changed event
        const stateEvent: StateChangedEvent = {
            metrics: this.getMetricsAsArray(),
            unlocked: [...this.unlockedAchievements],
            timestamp: Date.now()
        };
        super.emit<StateChangedEvent>('state:changed', stateEvent);
    }

    /**
     * Evaluate all achievements and unlock any newly met conditions
     * This is the core evaluation logic extracted from AchievementProvider
     */
    private evaluateAchievements(): void {
        const newlyUnlockedAchievements: string[] = [];

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
                if (this.unlockedAchievements.includes(achievementId)) {
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

                        // Emit achievement unlocked event
                        const unlockEvent: AchievementUnlockedEvent = {
                            achievementId,
                            achievementTitle: achievement.achievementDetails.achievementTitle || 'Achievement Unlocked!',
                            achievementDescription: achievement.achievementDetails.achievementDescription || '',
                            achievementIconKey: achievement.achievementDetails.achievementIconKey,
                            timestamp: Date.now()
                        };
                        super.emit<AchievementUnlockedEvent>('achievement:unlocked', unlockEvent);
                    }
                }
            });
        });

        // Add newly unlocked achievements to the list
        if (newlyUnlockedAchievements.length > 0) {
            this.unlockedAchievements = [...this.unlockedAchievements, ...newlyUnlockedAchievements];
        }
    }

    /**
     * Get metrics in array format (for backward compatibility with storage)
     */
    private getMetricsAsArray(): AchievementMetrics {
        const metricsInArrayFormat: AchievementMetrics = {};
        Object.entries(this.metrics).forEach(([key, value]) => {
            metricsInArrayFormat[key] = Array.isArray(value) ? value : [value];
        });
        return metricsInArrayFormat;
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

                result.push({
                    achievementId: achievementDetails.achievementId,
                    achievementTitle: achievementDetails.achievementTitle || '',
                    achievementDescription: achievementDetails.achievementDescription || '',
                    achievementIconKey: achievementDetails.achievementIconKey,
                    isUnlocked
                });
            });
        });

        return result;
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

        // Emit state changed event
        const stateEvent: StateChangedEvent = {
            metrics: {},
            unlocked: [],
            timestamp: Date.now()
        };
        super.emit<StateChangedEvent>('state:changed', stateEvent);
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

            // Emit state changed event
            const stateEvent: StateChangedEvent = {
                metrics: this.getMetricsAsArray(),
                unlocked: [...this.unlockedAchievements],
                timestamp: Date.now()
            };
            super.emit<StateChangedEvent>('state:changed', stateEvent);
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
