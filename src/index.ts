/**
 * achievements-engine
 * Framework-agnostic achievement system with event-based architecture
 */

// Core engine
export { AchievementEngine } from './AchievementEngine';
export { EventEmitter } from './EventEmitter';

// Types
export type {
    // Core achievement types
    AchievementMetricValue,
    AchievementMetricArrayValue,
    AchievementMetrics,
    AchievementDetails,
    AchievementWithStatus,
    AchievementCondition,
    AchievementConfiguration,
    SimpleAchievementDetails,
    CustomAchievementDetails,
    SimpleAchievementConfig,
    AchievementConfigurationType,
    InitialAchievementMetrics,
    AchievementState,

    // Storage types
    AchievementStorage,
    AsyncAchievementStorage,
    AnyAchievementStorage,

    // Engine-specific types
    EngineEvent,
    AchievementUnlockedEvent,
    MetricUpdatedEvent,
    StateChangedEvent,
    ErrorEvent,
    EventHandler,
    MetricUpdater,
    EventMapping,
    RestApiStorageConfig,
    EngineConfig,
    AchievementEngineApi,

    // Import/Export types
    ImportOptions,
    ImportResult,

    // Event emitter types
    UnsubscribeFn
} from './types';

// Storage implementations
export { LocalStorage } from './storage/LocalStorage';
export { MemoryStorage } from './storage/MemoryStorage';
export { IndexedDBStorage } from './storage/IndexedDBStorage';
export { RestApiStorage } from './storage/RestApiStorage';
export { AsyncStorageAdapter } from './storage/AsyncStorageAdapter';
export { OfflineQueueStorage } from './storage/OfflineQueueStorage';

// Storage enum
export { StorageType, isAsyncStorage } from './types';

// Utilities
export { normalizeAchievements, isSimpleConfig } from './utils/configNormalizer';
export { exportAchievementData, createConfigHash } from './utils/dataExport';
export type { ExportedData } from './utils/dataExport';
export { importAchievementData } from './utils/dataImport';

// Achievement Builder
export { AchievementBuilder } from './utils/achievementHelpers';
export type { AwardDetails } from './types';

// Errors
export {
    AchievementError,
    StorageError,
    ConfigurationError,
    StorageQuotaError,
    ImportValidationError,
    SyncError,
    isAchievementError,
    isRecoverableError
} from './errors/AchievementErrors';
