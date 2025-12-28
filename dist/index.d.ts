/**
 * Lightweight, type-safe event emitter for the achievements engine
 * Zero dependencies, memory-leak safe implementation
 */
type EventHandler$1<T = any> = (data: T) => void;
type UnsubscribeFn = () => void;
declare class EventEmitter {
    private listeners;
    private onceListeners;
    constructor();
    /**
     * Subscribe to an event
     * @param event - Event name
     * @param handler - Event handler function
     * @returns Unsubscribe function
     */
    on<T = any>(event: string, handler: EventHandler$1<T>): UnsubscribeFn;
    /**
     * Subscribe to an event once (auto-unsubscribes after first emission)
     * @param event - Event name
     * @param handler - Event handler function
     * @returns Unsubscribe function
     */
    once<T = any>(event: string, handler: EventHandler$1<T>): UnsubscribeFn;
    /**
     * Unsubscribe from an event
     * @param event - Event name
     * @param handler - Event handler function to remove
     */
    off<T = any>(event: string, handler: EventHandler$1<T>): void;
    /**
     * Emit an event to all subscribers
     * @param event - Event name
     * @param data - Event payload
     */
    emit<T = any>(event: string, data?: T): void;
    /**
     * Remove all listeners for a specific event, or all events if no event specified
     * @param event - Optional event name. If not provided, removes all listeners.
     */
    removeAllListeners(event?: string): void;
    /**
     * Get the number of listeners for an event
     * @param event - Event name
     * @returns Number of listeners
     */
    listenerCount(event: string): number;
    /**
     * Get all event names that have listeners
     * @returns Array of event names
     */
    eventNames(): string[];
}

/**
 * Type definitions for the achievements engine
 * Framework-agnostic achievement system types
 */

type AchievementMetricValue = number | string | boolean | Date | null | undefined;
type AchievementMetricArrayValue = AchievementMetricValue | AchievementMetricValue[];
interface AchievementMetrics {
    [key: string]: AchievementMetricValue[];
}
interface AchievementDetails {
    achievementId: string;
    achievementTitle: string;
    achievementDescription: string;
    achievementIconKey?: string;
}
interface AchievementWithStatus extends AchievementDetails {
    isUnlocked: boolean;
}
interface AchievementCondition {
    isConditionMet: (value: AchievementMetricArrayValue, state: AchievementState) => boolean;
    achievementDetails: AchievementDetails | AchievementWithStatus;
}
interface AchievementConfiguration {
    [key: string]: AchievementCondition[];
}
interface SimpleAchievementDetails {
    title: string;
    description?: string;
    icon?: string;
}
interface CustomAchievementDetails extends SimpleAchievementDetails {
    condition: (metrics: Record<string, any>) => boolean;
}
interface SimpleAchievementConfig {
    [metric: string]: {
        [threshold: string]: SimpleAchievementDetails | CustomAchievementDetails;
    };
}
type AchievementConfigurationType = AchievementConfiguration | SimpleAchievementConfig;
interface InitialAchievementMetrics {
    [key: string]: AchievementMetricValue;
}
interface AchievementState {
    metrics: AchievementMetrics;
    unlockedAchievements: string[];
}
interface AchievementStorage {
    getMetrics(): AchievementMetrics;
    setMetrics(metrics: AchievementMetrics): void;
    getUnlockedAchievements(): string[];
    setUnlockedAchievements(achievements: string[]): void;
    clear(): void;
}
interface AsyncAchievementStorage {
    getMetrics(): Promise<AchievementMetrics>;
    setMetrics(metrics: AchievementMetrics): Promise<void>;
    getUnlockedAchievements(): Promise<string[]>;
    setUnlockedAchievements(achievements: string[]): Promise<void>;
    clear(): Promise<void>;
}
type AnyAchievementStorage = AchievementStorage | AsyncAchievementStorage;
declare function isAsyncStorage(storage: AnyAchievementStorage): storage is AsyncAchievementStorage;
declare enum StorageType {
    Local = "local",// Synchronous localStorage
    Memory = "memory",// Synchronous in-memory storage
    IndexedDB = "indexeddb",// Asynchronous IndexedDB storage
    RestAPI = "restapi"
}
/**
 * Event types emitted by the engine
 */
type EngineEvent = 'achievement:unlocked' | 'metric:updated' | 'state:changed' | 'error';
/**
 * Event payload when an achievement is unlocked
 */
interface AchievementUnlockedEvent {
    achievementId: string;
    achievementTitle: string;
    achievementDescription: string;
    achievementIconKey?: string;
    timestamp: number;
}
/**
 * Event payload when a metric is updated
 */
interface MetricUpdatedEvent {
    metric: string;
    oldValue: any;
    newValue: any;
    timestamp: number;
}
/**
 * Event payload when overall state changes
 */
interface StateChangedEvent {
    metrics: AchievementMetrics;
    unlocked: string[];
    timestamp: number;
}
/**
 * Event payload when an error occurs
 */
interface ErrorEvent {
    error: Error;
    context?: string;
    timestamp: number;
}
/**
 * Event handler type
 */
type EventHandler<T = any> = (data: T) => void;
/**
 * Metric updater function for custom event-to-metric mapping
 */
type MetricUpdater = (eventData: any, currentMetrics: Record<string, any>) => Record<string, any>;
/**
 * Event mapping configuration
 * Maps event names to either:
 * - String (metric name) for direct 1:1 mapping
 * - MetricUpdater function for custom transformation
 */
interface EventMapping {
    [eventName: string]: string | MetricUpdater;
}
/**
 * REST API storage configuration
 */
interface RestApiStorageConfig$1 {
    baseUrl: string;
    userId: string;
    headers?: Record<string, string>;
    timeout?: number;
}
/**
 * Configuration for the Achievement Engine
 */
interface EngineConfig {
    /**
     * Achievement configuration (Simple or Complex API format)
     */
    achievements: AchievementConfigurationType;
    /**
     * Storage implementation or storage type
     * Defaults to memory storage
     */
    storage?: AchievementStorage | AsyncAchievementStorage | StorageType;
    /**
     * Optional event-to-metric mapping
     * Enables event-based tracking with emit()
     */
    eventMapping?: EventMapping;
    /**
     * Error handler for async operations and achievement errors
     */
    onError?: (error: Error) => void;
    /**
     * REST API configuration (required if using StorageType.RestAPI)
     */
    restApiConfig?: RestApiStorageConfig$1;
}
interface ImportOptions$1 {
    merge?: boolean;
    overwrite?: boolean;
    validateConfig?: boolean;
    expectedConfigHash?: string;
}
interface ImportResult$1 {
    success: boolean;
    errors?: string[];
    warnings?: string[];
    mergedMetrics?: AchievementMetrics;
    mergedUnlocked?: string[];
}

/**
 * AchievementEngine - Framework-agnostic achievement system
 * Event-based core with support for multiple storage backends
 */

declare class AchievementEngine extends EventEmitter {
    private config;
    private achievements;
    private storage;
    private metrics;
    private unlockedAchievements;
    private configHash;
    constructor(config: EngineConfig);
    /**
     * Initialize storage based on configuration
     */
    private initializeStorage;
    /**
     * Load state from storage
     */
    private loadFromStorage;
    /**
     * Save state to storage
     */
    private saveToStorage;
    /**
     * Handle errors with optional callback
     */
    private handleError;
    /**
     * Emit a custom event and optionally update metrics based on event mapping
     * @param eventName - Name of the event
     * @param data - Event data
     */
    emit<T = any>(eventName: string, data?: T): void;
    /**
     * Update metrics and evaluate achievements
     * @param newMetrics - Metrics to update
     */
    update(newMetrics: Record<string, any>): void;
    /**
     * Evaluate all achievements and unlock any newly met conditions
     * This is the core evaluation logic extracted from AchievementProvider
     */
    private evaluateAchievements;
    /**
     * Get metrics in array format (for backward compatibility with storage)
     */
    private getMetricsAsArray;
    /**
     * Get current metrics (readonly to prevent external modification)
     */
    getMetrics(): Readonly<Record<string, any>>;
    /**
     * Get unlocked achievement IDs (readonly)
     */
    getUnlocked(): readonly string[];
    /**
     * Get all achievements with their unlock status
     */
    getAllAchievements(): AchievementWithStatus[];
    /**
     * Reset all achievement data
     */
    reset(): void;
    /**
     * Clean up resources and event listeners
     */
    destroy(): void;
    /**
     * Export achievement data as JSON string
     */
    export(): string;
    /**
     * Import achievement data from JSON string
     * @param jsonString - Exported achievement data
     * @param options - Import options
     */
    import(jsonString: string, options?: ImportOptions$1): ImportResult$1;
    /**
     * Subscribe to engine events
     * @param event - Event name
     * @param handler - Event handler
     */
    on(event: EngineEvent, handler: (data: any) => void): UnsubscribeFn;
    /**
     * Subscribe to an event once
     * @param event - Event name
     * @param handler - Event handler
     */
    once(event: EngineEvent, handler: (data: any) => void): UnsubscribeFn;
    /**
     * Unsubscribe from an event
     * @param event - Event name
     * @param handler - Event handler
     */
    off(event: EngineEvent, handler: (data: any) => void): void;
}

declare class LocalStorage implements AchievementStorage {
    private storageKey;
    constructor(storageKey: string);
    private serializeValue;
    private deserializeValue;
    private serializeMetrics;
    private deserializeMetrics;
    private getStorageData;
    private setStorageData;
    getMetrics(): AchievementMetrics;
    setMetrics(metrics: AchievementMetrics): void;
    getUnlockedAchievements(): string[];
    setUnlockedAchievements(achievements: string[]): void;
    clear(): void;
}

declare class MemoryStorage implements AchievementStorage {
    private metrics;
    private unlockedAchievements;
    constructor();
    getMetrics(): AchievementMetrics;
    setMetrics(metrics: AchievementMetrics): void;
    getUnlockedAchievements(): string[];
    setUnlockedAchievements(achievements: string[]): void;
    clear(): void;
}

declare class IndexedDBStorage implements AsyncAchievementStorage {
    private dbName;
    private storeName;
    private db;
    private initPromise;
    constructor(dbName?: string);
    /**
     * Initialize IndexedDB database and object store
     */
    private initDB;
    /**
     * Generic get operation from IndexedDB
     */
    private get;
    /**
     * Generic set operation to IndexedDB
     */
    private set;
    /**
     * Delete operation from IndexedDB
     */
    private delete;
    getMetrics(): Promise<AchievementMetrics>;
    setMetrics(metrics: AchievementMetrics): Promise<void>;
    getUnlockedAchievements(): Promise<string[]>;
    setUnlockedAchievements(achievements: string[]): Promise<void>;
    clear(): Promise<void>;
}

interface RestApiStorageConfig {
    baseUrl: string;
    userId: string;
    headers?: Record<string, string>;
    timeout?: number;
}
declare class RestApiStorage implements AsyncAchievementStorage {
    private config;
    constructor(config: RestApiStorageConfig);
    /**
     * Generic fetch wrapper with timeout and error handling
     */
    private fetchWithTimeout;
    getMetrics(): Promise<AchievementMetrics>;
    setMetrics(metrics: AchievementMetrics): Promise<void>;
    getUnlockedAchievements(): Promise<string[]>;
    setUnlockedAchievements(achievements: string[]): Promise<void>;
    clear(): Promise<void>;
}

/**
 * Base error class for all achievement-related errors
 */
declare class AchievementError extends Error {
    code: string;
    recoverable: boolean;
    remedy?: string | undefined;
    constructor(message: string, code: string, recoverable: boolean, remedy?: string | undefined);
}
/**
 * Error thrown when browser storage quota is exceeded
 */
declare class StorageQuotaError extends AchievementError {
    bytesNeeded: number;
    constructor(bytesNeeded: number);
}
/**
 * Error thrown when imported data fails validation
 */
declare class ImportValidationError extends AchievementError {
    validationErrors: string[];
    constructor(validationErrors: string[]);
}
/**
 * Error thrown when storage operations fail
 */
declare class StorageError extends AchievementError {
    originalError?: Error | undefined;
    constructor(message: string, originalError?: Error | undefined);
}
/**
 * Error thrown when configuration is invalid
 */
declare class ConfigurationError extends AchievementError {
    constructor(message: string);
}
/**
 * Error thrown when network sync operations fail
 */
declare class SyncError extends AchievementError {
    readonly statusCode?: number;
    readonly timeout?: number;
    constructor(message: string, details?: {
        statusCode?: number;
        timeout?: number;
    });
}
/**
 * Type guard to check if an error is an AchievementError
 */
declare function isAchievementError(error: unknown): error is AchievementError;
/**
 * Type guard to check if an error is recoverable
 */
declare function isRecoverableError(error: unknown): boolean;

declare class AsyncStorageAdapter implements AchievementStorage {
    private asyncStorage;
    private cache;
    private pendingWrites;
    private onError?;
    constructor(asyncStorage: AsyncAchievementStorage, options?: {
        onError?: (error: AchievementError) => void;
    });
    /**
     * Initialize cache by loading from async storage
     * This happens in the background during construction
     */
    private initializeCache;
    /**
     * Wait for cache to be loaded (used internally)
     * Returns immediately if already loaded, otherwise waits
     */
    private ensureCacheLoaded;
    /**
     * SYNC READ: Returns cached metrics immediately
     * Cache is loaded eagerly during construction
     */
    getMetrics(): AchievementMetrics;
    /**
     * SYNC WRITE: Updates cache immediately, writes to storage in background
     * Uses optimistic updates - assumes write will succeed
     */
    setMetrics(metrics: AchievementMetrics): void;
    /**
     * SYNC READ: Returns cached unlocked achievements immediately
     */
    getUnlockedAchievements(): string[];
    /**
     * SYNC WRITE: Updates cache immediately, writes to storage in background
     */
    setUnlockedAchievements(achievements: string[]): void;
    /**
     * SYNC CLEAR: Clears cache immediately, clears storage in background
     */
    clear(): void;
    /**
     * Wait for all pending writes to complete (useful for testing/cleanup)
     * NOT part of AchievementStorage interface - utility method
     */
    flush(): Promise<void>;
}

interface QueuedOperation {
    id: string;
    type: 'setMetrics' | 'setUnlockedAchievements' | 'clear';
    data?: any;
    timestamp: number;
}
declare class OfflineQueueStorage implements AsyncAchievementStorage {
    private innerStorage;
    private queue;
    private isOnline;
    private isSyncing;
    private queueStorageKey;
    constructor(innerStorage: AsyncAchievementStorage);
    private loadQueue;
    private saveQueue;
    private handleOnline;
    private handleOffline;
    private processQueue;
    private queueOperation;
    getMetrics(): Promise<AchievementMetrics>;
    setMetrics(metrics: AchievementMetrics): Promise<void>;
    getUnlockedAchievements(): Promise<string[]>;
    setUnlockedAchievements(achievements: string[]): Promise<void>;
    clear(): Promise<void>;
    /**
     * Manually trigger queue processing (useful for testing)
     */
    sync(): Promise<void>;
    /**
     * Get current queue status (useful for debugging)
     */
    getQueueStatus(): {
        pending: number;
        operations: QueuedOperation[];
    };
    /**
     * Cleanup listeners (call on unmount)
     */
    destroy(): void;
}

declare function normalizeAchievements(config: AchievementConfigurationType): AchievementConfiguration;

/**
 * Exports achievement data to a JSON string
 *
 * @param metrics - Current achievement metrics
 * @param unlocked - Array of unlocked achievement IDs
 * @param configHash - Optional hash of achievement configuration for validation
 * @returns JSON string containing all achievement data
 *
 * @example
 * ```typescript
 * const json = exportAchievementData(_metrics, ['score_100', 'level_5']);
 * // Save json to file or send to server
 * ```
 */
declare function exportAchievementData(metrics: AchievementMetrics, unlocked: string[], configHash?: string): string;
/**
 * Creates a simple hash of the achievement configuration
 * Used to validate that imported data matches the current configuration
 *
 * @param config - Achievement configuration object
 * @returns Simple hash string
 */
declare function createConfigHash(config: any): string;

/**
 * Options for importing achievement data
 */
interface ImportOptions {
    /** Strategy for merging imported data with existing data */
    mergeStrategy?: 'replace' | 'merge' | 'preserve';
    /** Whether to validate the imported data */
    validate?: boolean;
    /** Optional config hash to validate against */
    expectedConfigHash?: string;
}
/**
 * Result of an import operation
 */
interface ImportResult {
    success: boolean;
    imported: {
        metrics: number;
        achievements: number;
    };
    errors?: string[];
    warnings?: string[];
}
/**
 * Imports achievement data from a JSON string
 *
 * @param jsonString - JSON string containing exported achievement data
 * @param currentMetrics - Current metrics state
 * @param currentUnlocked - Current unlocked achievements
 * @param options - Import options
 * @returns Import result with success status and any errors
 *
 * @example
 * ```typescript
 * const result = importAchievementData(
 *   jsonString,
 *   currentMetrics,
 *   currentUnlocked,
 *   { mergeStrategy: 'merge', validate: true }
 * );
 *
 * if (result.success) {
 *   console.log(`Imported ${result.imported.achievements} achievements`);
 * } else {
 *   console.error('Import failed:', result.errors);
 * }
 * ```
 */
declare function importAchievementData(jsonString: string, currentMetrics: AchievementMetrics, currentUnlocked: string[], options?: ImportOptions): ImportResult;

export { AchievementCondition, AchievementConfiguration, AchievementConfigurationType, AchievementDetails, AchievementEngine, AchievementError, AchievementMetricArrayValue, AchievementMetricValue, AchievementMetrics, AchievementState, AchievementStorage, AchievementUnlockedEvent, AchievementWithStatus, AnyAchievementStorage, AsyncAchievementStorage, AsyncStorageAdapter, ConfigurationError, CustomAchievementDetails, EngineConfig, EngineEvent, ErrorEvent, EventEmitter, EventHandler, EventMapping, ImportOptions$1 as ImportOptions, ImportResult$1 as ImportResult, ImportValidationError, IndexedDBStorage, InitialAchievementMetrics, LocalStorage, MemoryStorage, MetricUpdatedEvent, MetricUpdater, OfflineQueueStorage, RestApiStorage, RestApiStorageConfig$1 as RestApiStorageConfig, SimpleAchievementConfig, SimpleAchievementDetails, StateChangedEvent, StorageError, StorageQuotaError, StorageType, SyncError, UnsubscribeFn, createConfigHash, exportAchievementData, importAchievementData, isAchievementError, isAsyncStorage, isRecoverableError, normalizeAchievements };
