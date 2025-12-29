/**
 * Type definitions for the achievements engine
 * Framework-agnostic achievement system types
 */

export type { UnsubscribeFn } from './EventEmitter';
import type { AchievementEngine } from './AchievementEngine';

// ============================================================================
// Core Achievement Types (from react-achievements)
// ============================================================================

export type AchievementMetricValue = number | string | boolean | Date | null | undefined;
export type AchievementMetricArrayValue = AchievementMetricValue | AchievementMetricValue[];

export const isDate = (value: any): value is Date => {
    return value instanceof Date;
};

export interface AchievementMetrics {
    [key: string]: AchievementMetricValue[];
}

export interface AchievementDetails {
    achievementId: string;
    achievementTitle: string;
    achievementDescription: string;
    achievementIconKey?: string;
}

export interface AchievementWithStatus extends AchievementDetails {
    isUnlocked: boolean;
}

export interface AchievementCondition {
    isConditionMet: (value: AchievementMetricArrayValue, state: AchievementState) => boolean;
    achievementDetails: AchievementDetails | AchievementWithStatus;
}

export interface AchievementConfiguration {
    [key: string]: AchievementCondition[];
}

// Simple API types
export interface SimpleAchievementDetails {
    title: string;
    description?: string;
    icon?: string;
}

export interface CustomAchievementDetails extends SimpleAchievementDetails {
    condition: (metrics: Record<string, any>) => boolean;
}

export interface SimpleAchievementConfig {
    [metric: string]: {
        [threshold: string]: SimpleAchievementDetails | CustomAchievementDetails;
    };
}

// Union type for backward compatibility
export type AchievementConfigurationType = AchievementConfiguration | SimpleAchievementConfig;

export interface InitialAchievementMetrics {
    [key: string]: AchievementMetricValue;
}

export interface AchievementState {
    metrics: AchievementMetrics;
    unlockedAchievements: string[];
}

// ============================================================================
// Storage Interface Types
// ============================================================================

export interface AchievementStorage {
    getMetrics(): AchievementMetrics;
    setMetrics(metrics: AchievementMetrics): void;
    getUnlockedAchievements(): string[];
    setUnlockedAchievements(achievements: string[]): void;
    clear(): void;
}

// Async storage interface - all operations return Promises
export interface AsyncAchievementStorage {
    getMetrics(): Promise<AchievementMetrics>;
    setMetrics(metrics: AchievementMetrics): Promise<void>;
    getUnlockedAchievements(): Promise<string[]>;
    setUnlockedAchievements(achievements: string[]): Promise<void>;
    clear(): Promise<void>;
}

// Union type for provider to accept both sync and async storage
export type AnyAchievementStorage = AchievementStorage | AsyncAchievementStorage;

// Type guard to detect async storage
export function isAsyncStorage(storage: AnyAchievementStorage): storage is AsyncAchievementStorage {
    // Check if methods return Promises
    const testResult = (storage as any).getMetrics();
    return testResult && typeof testResult.then === 'function';
}

export enum StorageType {
    Local = 'local',           // Synchronous localStorage
    Memory = 'memory',         // Synchronous in-memory storage
    IndexedDB = 'indexeddb',   // Asynchronous IndexedDB storage
    RestAPI = 'restapi'        // Asynchronous REST API storage
}

// ============================================================================
// Engine-Specific Types
// ============================================================================

/**
 * Event types emitted by the engine
 */
export type EngineEvent =
    | 'achievement:unlocked'
    | 'metric:updated'
    | 'state:changed'
    | 'error';

/**
 * Event payload when an achievement is unlocked
 */
export interface AchievementUnlockedEvent {
    achievementId: string;
    achievementTitle: string;
    achievementDescription: string;
    achievementIconKey?: string;
    timestamp: number;
}

/**
 * Event payload when a metric is updated
 */
export interface MetricUpdatedEvent {
    metric: string;
    oldValue: any;
    newValue: any;
    timestamp: number;
}

/**
 * Event payload when overall state changes
 */
export interface StateChangedEvent {
    metrics: AchievementMetrics;
    unlocked: string[];
    timestamp: number;
}

/**
 * Event payload when an error occurs
 */
export interface ErrorEvent {
    error: Error;
    context?: string;
    timestamp: number;
}

/**
 * Event handler type
 */
export type EventHandler<T = any> = (data: T) => void;

/**
 * Metric updater function for custom event-to-metric mapping
 */
export type MetricUpdater = (
    eventData: any,
    currentMetrics: Record<string, any>
) => Record<string, any>;

/**
 * Event mapping configuration
 * Maps event names to either:
 * - String (metric name) for direct 1:1 mapping
 * - MetricUpdater function for custom transformation
 */
export interface EventMapping {
    [eventName: string]: string | MetricUpdater;
}

/**
 * REST API storage configuration
 */
export interface RestApiStorageConfig {
    baseUrl: string;
    userId: string;
    headers?: Record<string, string>;
    timeout?: number;
}

/**
 * Configuration for the Achievement Engine
 */
export interface EngineConfig {
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
    restApiConfig?: RestApiStorageConfig;
}

// ============================================================================
// Data Export/Import Types
// ============================================================================

export interface ImportOptions {
    merge?: boolean;
    overwrite?: boolean;
    validateConfig?: boolean;
    expectedConfigHash?: string;
}

export interface ImportResult {
    success: boolean;
    errors?: string[];
    warnings?: string[];
    mergedMetrics?: AchievementMetrics;
    mergedUnlocked?: string[];
}

/**
 * Public API surface of the AchievementEngine
 * This type represents the stable, supported API for external consumers
 * Derived from the AchievementEngine class to prevent duplication
 */
export type AchievementEngineApi = Pick<
  AchievementEngine,
  | 'emit'
  | 'update'
  | 'on'
  | 'once'
  | 'off'
  | 'getMetrics'
  | 'getUnlocked'
  | 'getAllAchievements'
  | 'reset'
  | 'export'
  | 'import'
>;
