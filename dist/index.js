'use strict';

/**
 * Lightweight, type-safe event emitter for the achievements engine
 * Zero dependencies, memory-leak safe implementation
 */
class EventEmitter {
    constructor() {
        this.listeners = new Map();
        this.onceListeners = new Map();
    }
    /**
     * Subscribe to an event
     * @param event - Event name
     * @param handler - Event handler function
     * @returns Unsubscribe function
     */
    on(event, handler) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(handler);
        // Return unsubscribe function
        return () => this.off(event, handler);
    }
    /**
     * Subscribe to an event once (auto-unsubscribes after first emission)
     * @param event - Event name
     * @param handler - Event handler function
     * @returns Unsubscribe function
     */
    once(event, handler) {
        if (!this.onceListeners.has(event)) {
            this.onceListeners.set(event, new Set());
        }
        this.onceListeners.get(event).add(handler);
        // Return unsubscribe function
        return () => {
            const onceSet = this.onceListeners.get(event);
            if (onceSet) {
                onceSet.delete(handler);
            }
        };
    }
    /**
     * Unsubscribe from an event
     * @param event - Event name
     * @param handler - Event handler function to remove
     */
    off(event, handler) {
        const regularListeners = this.listeners.get(event);
        if (regularListeners) {
            regularListeners.delete(handler);
            // Clean up empty sets to prevent memory leaks
            if (regularListeners.size === 0) {
                this.listeners.delete(event);
            }
        }
        const onceSet = this.onceListeners.get(event);
        if (onceSet) {
            onceSet.delete(handler);
            // Clean up empty sets
            if (onceSet.size === 0) {
                this.onceListeners.delete(event);
            }
        }
    }
    /**
     * Emit an event to all subscribers
     * @param event - Event name
     * @param data - Event payload
     */
    emit(event, data) {
        // Call regular listeners
        const regularListeners = this.listeners.get(event);
        if (regularListeners) {
            // Create a copy to avoid issues if listeners modify the set during iteration
            const listenersCopy = Array.from(regularListeners);
            listenersCopy.forEach(handler => {
                try {
                    handler(data);
                }
                catch (error) {
                    // Prevent one handler's error from stopping other handlers
                    console.error(`Error in event handler for "${event}":`, error);
                }
            });
        }
        // Call once listeners and remove them
        const onceSet = this.onceListeners.get(event);
        if (onceSet) {
            const onceListenersCopy = Array.from(onceSet);
            // Clear the set before calling handlers to prevent re-entry issues
            this.onceListeners.delete(event);
            onceListenersCopy.forEach(handler => {
                try {
                    handler(data);
                }
                catch (error) {
                    console.error(`Error in once event handler for "${event}":`, error);
                }
            });
        }
    }
    /**
     * Remove all listeners for a specific event, or all events if no event specified
     * @param event - Optional event name. If not provided, removes all listeners.
     */
    removeAllListeners(event) {
        if (event) {
            this.listeners.delete(event);
            this.onceListeners.delete(event);
        }
        else {
            this.listeners.clear();
            this.onceListeners.clear();
        }
    }
    /**
     * Get the number of listeners for an event
     * @param event - Event name
     * @returns Number of listeners
     */
    listenerCount(event) {
        var _a, _b;
        const regularCount = ((_a = this.listeners.get(event)) === null || _a === void 0 ? void 0 : _a.size) || 0;
        const onceCount = ((_b = this.onceListeners.get(event)) === null || _b === void 0 ? void 0 : _b.size) || 0;
        return regularCount + onceCount;
    }
    /**
     * Get all event names that have listeners
     * @returns Array of event names
     */
    eventNames() {
        const regularEvents = Array.from(this.listeners.keys());
        const onceEvents = Array.from(this.onceListeners.keys());
        // Combine and deduplicate
        return Array.from(new Set([...regularEvents, ...onceEvents]));
    }
}

// Type guard to check if config is simple format
function isSimpleConfig(config) {
    if (!config || typeof config !== 'object')
        return false;
    const firstKey = Object.keys(config)[0];
    if (!firstKey)
        return true; // Empty config is considered simple
    const firstValue = config[firstKey];
    // Check if it's the current complex format (array of AchievementCondition)
    if (Array.isArray(firstValue))
        return false;
    // Check if it's the simple format (object with string keys)
    return typeof firstValue === 'object' && !Array.isArray(firstValue);
}
// Generate a unique ID for achievements
function generateId() {
    return Math.random().toString(36).substr(2, 9);
}
// Check if achievement details has a custom condition
function hasCustomCondition(details) {
    return 'condition' in details && typeof details.condition === 'function';
}
// Convert simple config to complex config format
function normalizeAchievements(config) {
    if (!isSimpleConfig(config)) {
        // Already in complex format, return as-is
        return config;
    }
    const normalized = {};
    Object.entries(config).forEach(([metric, achievements]) => {
        normalized[metric] = Object.entries(achievements).map(([key, achievement]) => {
            if (hasCustomCondition(achievement)) {
                // Custom condition function
                return {
                    isConditionMet: (_value, _state) => {
                        // Convert internal metrics format (arrays) to simple format for custom conditions
                        const simpleMetrics = {};
                        Object.entries(_state.metrics).forEach(([key, val]) => {
                            simpleMetrics[key] = Array.isArray(val) ? val[0] : val;
                        });
                        return achievement.condition(simpleMetrics);
                    },
                    achievementDetails: {
                        achievementId: `${metric}_custom_${generateId()}`,
                        achievementTitle: achievement.title,
                        achievementDescription: achievement.description || '',
                        achievementIconKey: achievement.icon || 'default'
                    }
                };
            }
            else {
                // Threshold-based achievement
                const threshold = parseFloat(key);
                const isValidThreshold = !isNaN(threshold);
                let conditionMet;
                if (isValidThreshold) {
                    // Numeric threshold
                    conditionMet = (value) => {
                        const numValue = Array.isArray(value) ? value[0] : value;
                        return typeof numValue === 'number' && numValue >= threshold;
                    };
                }
                else {
                    // String or boolean threshold
                    conditionMet = (value) => {
                        const actualValue = Array.isArray(value) ? value[0] : value;
                        // Handle boolean thresholds
                        if (key === 'true')
                            return actualValue === true;
                        if (key === 'false')
                            return actualValue === false;
                        // Handle string thresholds
                        return actualValue === key;
                    };
                }
                return {
                    isConditionMet: conditionMet,
                    achievementDetails: {
                        achievementId: `${metric}_${key}`,
                        achievementTitle: achievement.title,
                        achievementDescription: achievement.description || (isValidThreshold ? `Reach ${threshold} ${metric}` : `Achieve ${key} for ${metric}`),
                        achievementIconKey: achievement.icon || 'default'
                    }
                };
            }
        });
    });
    return normalized;
}

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
function exportAchievementData(metrics, unlocked, configHash) {
    const data = Object.assign({ version: '3.3.0', timestamp: Date.now(), metrics, unlockedAchievements: unlocked }, (configHash && { configHash }));
    return JSON.stringify(data, null, 2);
}
/**
 * Creates a simple hash of the achievement configuration
 * Used to validate that imported data matches the current configuration
 *
 * @param config - Achievement configuration object
 * @returns Simple hash string
 */
function createConfigHash(config) {
    // Simple hash based on stringified config
    // In production, you might want to use a more robust hashing algorithm
    const str = JSON.stringify(config);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
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
function importAchievementData(jsonString, currentMetrics, currentUnlocked, options = {}) {
    const { mergeStrategy = 'replace', validate = true, expectedConfigHash } = options;
    const warnings = [];
    // Parse JSON
    let data;
    try {
        data = JSON.parse(jsonString);
    }
    catch (_a) {
        return {
            success: false,
            imported: { metrics: 0, achievements: 0 },
            errors: ['Invalid JSON format']
        };
    }
    // Validate structure
    if (validate) {
        const validationErrors = validateExportedData(data, expectedConfigHash);
        if (validationErrors.length > 0) {
            return {
                success: false,
                imported: { metrics: 0, achievements: 0 },
                errors: validationErrors
            };
        }
    }
    // Version compatibility check
    if (data.version && data.version !== '3.3.0') {
        warnings.push(`Data exported from version ${data.version}, current version is 3.3.0`);
    }
    // Merge metrics based on strategy
    let mergedMetrics;
    let mergedUnlocked;
    switch (mergeStrategy) {
        case 'replace':
            // Replace all existing data
            mergedMetrics = data.metrics;
            mergedUnlocked = data.unlockedAchievements;
            break;
        case 'merge':
            // Union of both datasets, keeping higher metric values
            mergedMetrics = mergeMetrics(currentMetrics, data.metrics);
            mergedUnlocked = Array.from(new Set([...currentUnlocked, ...data.unlockedAchievements]));
            break;
        case 'preserve':
            // Keep existing values, only add new ones
            mergedMetrics = preserveMetrics(currentMetrics, data.metrics);
            mergedUnlocked = Array.from(new Set([...currentUnlocked, ...data.unlockedAchievements]));
            break;
        default:
            return {
                success: false,
                imported: { metrics: 0, achievements: 0 },
                errors: [`Invalid merge strategy: ${mergeStrategy}`]
            };
    }
    return Object.assign(Object.assign({ success: true, imported: {
            metrics: Object.keys(mergedMetrics).length,
            achievements: mergedUnlocked.length
        } }, (warnings.length > 0 && { warnings })), { mergedMetrics,
        mergedUnlocked });
}
/**
 * Validates the structure and content of exported data
 */
function validateExportedData(data, expectedConfigHash) {
    const errors = [];
    // Check required fields
    if (!data.version) {
        errors.push('Missing version field');
    }
    if (!data.timestamp) {
        errors.push('Missing timestamp field');
    }
    if (!data.metrics || typeof data.metrics !== 'object') {
        errors.push('Missing or invalid metrics field');
    }
    if (!Array.isArray(data.unlockedAchievements)) {
        errors.push('Missing or invalid unlockedAchievements field');
    }
    // Validate config hash if provided
    if (expectedConfigHash && data.configHash && data.configHash !== expectedConfigHash) {
        errors.push('Configuration mismatch: imported data may not be compatible with current achievement configuration');
    }
    // Validate metrics structure
    if (data.metrics && typeof data.metrics === 'object') {
        for (const [key, value] of Object.entries(data.metrics)) {
            if (!Array.isArray(value)) {
                errors.push(`Invalid metric format for "${key}": expected array, got ${typeof value}`);
            }
        }
    }
    // Validate achievement IDs are strings
    if (Array.isArray(data.unlockedAchievements)) {
        const invalidIds = data.unlockedAchievements.filter((id) => typeof id !== 'string');
        if (invalidIds.length > 0) {
            errors.push('All achievement IDs must be strings');
        }
    }
    return errors;
}
/**
 * Merges two metrics objects, keeping higher values for overlapping keys
 */
function mergeMetrics(current, imported) {
    const merged = Object.assign({}, current);
    for (const [key, importedValues] of Object.entries(imported)) {
        if (!merged[key]) {
            // New metric, add it
            merged[key] = importedValues;
        }
        else {
            // Existing metric, merge values
            merged[key] = mergeMetricValues(merged[key], importedValues);
        }
    }
    return merged;
}
/**
 * Merges two metric value arrays, keeping higher numeric values
 */
function mergeMetricValues(current, imported) {
    // For simplicity, we'll use the imported values if they're "higher"
    // This works for numeric values; for other types, we prefer imported
    const currentValue = current[0];
    const importedValue = imported[0];
    // If both are numbers, keep the higher one
    if (typeof currentValue === 'number' && typeof importedValue === 'number') {
        return currentValue >= importedValue ? current : imported;
    }
    // For non-numeric values, prefer imported (assume it's newer)
    return imported;
}
/**
 * Preserves existing metrics, only adding new ones from imported data
 */
function preserveMetrics(current, imported) {
    const preserved = Object.assign({}, current);
    for (const [key, value] of Object.entries(imported)) {
        if (!preserved[key]) {
            // Only add if it doesn't exist
            preserved[key] = value;
        }
        // If it exists, keep current value (preserve strategy)
    }
    return preserved;
}

/**
 * Type definitions for the achievements engine
 * Framework-agnostic achievement system types
 */
const isDate = (value) => {
    return value instanceof Date;
};
// Type guard to detect async storage
function isAsyncStorage(storage) {
    // Check if methods return Promises
    const testResult = storage.getMetrics();
    return testResult && typeof testResult.then === 'function';
}
exports.StorageType = void 0;
(function (StorageType) {
    StorageType["Local"] = "local";
    StorageType["Memory"] = "memory";
    StorageType["IndexedDB"] = "indexeddb";
    StorageType["RestAPI"] = "restapi"; // Asynchronous REST API storage
})(exports.StorageType || (exports.StorageType = {}));

/**
 * Base error class for all achievement-related errors
 */
class AchievementError extends Error {
    constructor(message, code, recoverable, remedy) {
        super(message);
        this.code = code;
        this.recoverable = recoverable;
        this.remedy = remedy;
        this.name = 'AchievementError';
        // Maintains proper stack trace for where our error was thrown (only available on V8)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, AchievementError);
        }
    }
}
/**
 * Error thrown when browser storage quota is exceeded
 */
class StorageQuotaError extends AchievementError {
    constructor(bytesNeeded) {
        super('Browser storage quota exceeded. Achievement data could not be saved.', 'STORAGE_QUOTA_EXCEEDED', true, 'Clear browser storage, reduce the number of achievements, or use an external database backend. You can export your current data using exportData() before clearing storage.');
        this.bytesNeeded = bytesNeeded;
        this.name = 'StorageQuotaError';
    }
}
/**
 * Error thrown when imported data fails validation
 */
class ImportValidationError extends AchievementError {
    constructor(validationErrors) {
        super(`Imported data failed validation: ${validationErrors.join(', ')}`, 'IMPORT_VALIDATION_ERROR', true, 'Check that the imported data was exported from a compatible version and matches your current achievement configuration.');
        this.validationErrors = validationErrors;
        this.name = 'ImportValidationError';
    }
}
/**
 * Error thrown when storage operations fail
 */
class StorageError extends AchievementError {
    constructor(message, originalError) {
        super(message, 'STORAGE_ERROR', true, 'Check browser storage permissions and available space. If using custom storage, verify the implementation is correct.');
        this.originalError = originalError;
        this.name = 'StorageError';
    }
}
/**
 * Error thrown when configuration is invalid
 */
class ConfigurationError extends AchievementError {
    constructor(message) {
        super(message, 'CONFIGURATION_ERROR', false, 'Review your achievement configuration and ensure it follows the correct format.');
        this.name = 'ConfigurationError';
    }
}
/**
 * Error thrown when network sync operations fail
 */
class SyncError extends AchievementError {
    constructor(message, details) {
        super(message, 'SYNC_ERROR', true, // recoverable (can retry)
        'Check your network connection and try again. If the problem persists, achievements will sync when connection is restored.');
        this.name = 'SyncError';
        this.statusCode = details === null || details === void 0 ? void 0 : details.statusCode;
        this.timeout = details === null || details === void 0 ? void 0 : details.timeout;
    }
}
/**
 * Type guard to check if an error is an AchievementError
 */
function isAchievementError(error) {
    return error instanceof AchievementError;
}
/**
 * Type guard to check if an error is recoverable
 */
function isRecoverableError(error) {
    return isAchievementError(error) && error.recoverable;
}

class LocalStorage {
    constructor(storageKey) {
        this.storageKey = storageKey;
    }
    serializeValue(value) {
        if (isDate(value)) {
            return { __type: 'Date', value: value.toISOString() };
        }
        return value;
    }
    deserializeValue(value) {
        if (value && typeof value === 'object' && value.__type === 'Date') {
            return new Date(value.value);
        }
        return value;
    }
    serializeMetrics(metrics) {
        const serialized = {};
        for (const [key, values] of Object.entries(metrics)) {
            serialized[key] = values.map(this.serializeValue);
        }
        return serialized;
    }
    deserializeMetrics(metrics) {
        if (!metrics)
            return {};
        const deserialized = {};
        for (const [key, values] of Object.entries(metrics)) {
            deserialized[key] = values.map(this.deserializeValue);
        }
        return deserialized;
    }
    getStorageData() {
        const data = localStorage.getItem(this.storageKey);
        if (!data)
            return { metrics: {}, unlockedAchievements: [] };
        try {
            const parsed = JSON.parse(data);
            return {
                metrics: this.deserializeMetrics(parsed.metrics || {}),
                unlockedAchievements: parsed.unlockedAchievements || []
            };
        }
        catch (_a) {
            return { metrics: {}, unlockedAchievements: [] };
        }
    }
    setStorageData(data) {
        try {
            const serialized = {
                metrics: this.serializeMetrics(data.metrics),
                unlockedAchievements: data.unlockedAchievements
            };
            const jsonString = JSON.stringify(serialized);
            localStorage.setItem(this.storageKey, jsonString);
        }
        catch (error) {
            // Throw proper error instead of silently failing
            if (error instanceof DOMException &&
                (error.name === 'QuotaExceededError' ||
                    error.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
                const serialized = {
                    metrics: this.serializeMetrics(data.metrics),
                    unlockedAchievements: data.unlockedAchievements
                };
                const bytesNeeded = JSON.stringify(serialized).length;
                throw new StorageQuotaError(bytesNeeded);
            }
            if (error instanceof Error) {
                if (error.message && error.message.includes('QuotaExceeded')) {
                    const serialized = {
                        metrics: this.serializeMetrics(data.metrics),
                        unlockedAchievements: data.unlockedAchievements
                    };
                    const bytesNeeded = JSON.stringify(serialized).length;
                    throw new StorageQuotaError(bytesNeeded);
                }
                throw new StorageError(`Failed to save achievement data: ${error.message}`, error);
            }
            throw new StorageError('Failed to save achievement data');
        }
    }
    getMetrics() {
        return this.getStorageData().metrics;
    }
    setMetrics(metrics) {
        const data = this.getStorageData();
        this.setStorageData(Object.assign(Object.assign({}, data), { metrics }));
    }
    getUnlockedAchievements() {
        return this.getStorageData().unlockedAchievements;
    }
    setUnlockedAchievements(achievements) {
        const data = this.getStorageData();
        this.setStorageData(Object.assign(Object.assign({}, data), { unlockedAchievements: achievements }));
    }
    clear() {
        localStorage.removeItem(this.storageKey);
    }
}

class MemoryStorage {
    constructor() {
        this.metrics = {};
        this.unlockedAchievements = [];
    }
    getMetrics() {
        return this.metrics;
    }
    setMetrics(metrics) {
        this.metrics = metrics;
    }
    getUnlockedAchievements() {
        return this.unlockedAchievements;
    }
    setUnlockedAchievements(achievements) {
        this.unlockedAchievements = achievements;
    }
    clear() {
        this.metrics = {};
        this.unlockedAchievements = [];
    }
}

/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
/* global Reflect, Promise, SuppressedError, Symbol, Iterator */


function __awaiter(thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
}

typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
};

class IndexedDBStorage {
    constructor(dbName = 'react-achievements') {
        this.storeName = 'achievements';
        this.db = null;
        this.dbName = dbName;
        this.initPromise = this.initDB();
    }
    /**
     * Initialize IndexedDB database and object store
     */
    initDB() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                const request = indexedDB.open(this.dbName, 1);
                request.onerror = () => {
                    reject(new StorageError('Failed to open IndexedDB'));
                };
                request.onsuccess = () => {
                    this.db = request.result;
                    resolve();
                };
                request.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    // Create object store if it doesn't exist
                    if (!db.objectStoreNames.contains(this.storeName)) {
                        db.createObjectStore(this.storeName);
                    }
                };
            });
        });
    }
    /**
     * Generic get operation from IndexedDB
     */
    get(key) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.initPromise;
            if (!this.db)
                throw new StorageError('Database not initialized');
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([this.storeName], 'readonly');
                const store = transaction.objectStore(this.storeName);
                const request = store.get(key);
                request.onsuccess = () => {
                    resolve(request.result || null);
                };
                request.onerror = () => {
                    reject(new StorageError(`Failed to read from IndexedDB: ${key}`));
                };
            });
        });
    }
    /**
     * Generic set operation to IndexedDB
     */
    set(key, value) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.initPromise;
            if (!this.db)
                throw new StorageError('Database not initialized');
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);
                const request = store.put(value, key);
                request.onsuccess = () => {
                    resolve();
                };
                request.onerror = () => {
                    reject(new StorageError(`Failed to write to IndexedDB: ${key}`));
                };
            });
        });
    }
    /**
     * Delete operation from IndexedDB
     */
    delete(key) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.initPromise;
            if (!this.db)
                throw new StorageError('Database not initialized');
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);
                const request = store.delete(key);
                request.onsuccess = () => {
                    resolve();
                };
                request.onerror = () => {
                    reject(new StorageError(`Failed to delete from IndexedDB: ${key}`));
                };
            });
        });
    }
    getMetrics() {
        return __awaiter(this, void 0, void 0, function* () {
            const metrics = yield this.get('metrics');
            return metrics || {};
        });
    }
    setMetrics(metrics) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.set('metrics', metrics);
        });
    }
    getUnlockedAchievements() {
        return __awaiter(this, void 0, void 0, function* () {
            const unlocked = yield this.get('unlocked');
            return unlocked || [];
        });
    }
    setUnlockedAchievements(achievements) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.set('unlocked', achievements);
        });
    }
    clear() {
        return __awaiter(this, void 0, void 0, function* () {
            yield Promise.all([
                this.delete('metrics'),
                this.delete('unlocked')
            ]);
        });
    }
}

class RestApiStorage {
    constructor(config) {
        this.config = Object.assign({ timeout: 10000, headers: {} }, config);
    }
    /**
     * Generic fetch wrapper with timeout and error handling
     */
    fetchWithTimeout(url, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
            try {
                const response = yield fetch(url, Object.assign(Object.assign({}, options), { headers: Object.assign(Object.assign({ 'Content-Type': 'application/json' }, this.config.headers), options.headers), signal: controller.signal }));
                clearTimeout(timeoutId);
                if (!response.ok) {
                    throw new SyncError(`HTTP ${response.status}: ${response.statusText}`, { statusCode: response.status });
                }
                return response;
            }
            catch (error) {
                clearTimeout(timeoutId);
                if (error instanceof Error && error.name === 'AbortError') {
                    throw new SyncError('Request timeout', { timeout: this.config.timeout });
                }
                throw error;
            }
        });
    }
    getMetrics() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const url = `${this.config.baseUrl}/users/${this.config.userId}/achievements/metrics`;
                const response = yield this.fetchWithTimeout(url, { method: 'GET' });
                const data = yield response.json();
                return data.metrics || {};
            }
            catch (error) {
                // Re-throw SyncError and other AchievementErrors (but not StorageError)
                // Multiple checks for Jest compatibility
                const err = error;
                if (((_a = err === null || err === void 0 ? void 0 : err.constructor) === null || _a === void 0 ? void 0 : _a.name) === 'SyncError' || (err === null || err === void 0 ? void 0 : err.name) === 'SyncError') {
                    throw error;
                }
                // Also check instanceof for normal cases
                if (error instanceof AchievementError && !(error instanceof StorageError)) {
                    throw error;
                }
                throw new StorageError('Failed to fetch metrics from API', error);
            }
        });
    }
    setMetrics(metrics) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const url = `${this.config.baseUrl}/users/${this.config.userId}/achievements/metrics`;
                yield this.fetchWithTimeout(url, {
                    method: 'PUT',
                    body: JSON.stringify({ metrics })
                });
            }
            catch (error) {
                const err = error;
                if (((_a = err === null || err === void 0 ? void 0 : err.constructor) === null || _a === void 0 ? void 0 : _a.name) === 'SyncError' || (err === null || err === void 0 ? void 0 : err.name) === 'SyncError')
                    throw error;
                if (error instanceof AchievementError && !(error instanceof StorageError))
                    throw error;
                throw new StorageError('Failed to save metrics to API', error);
            }
        });
    }
    getUnlockedAchievements() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const url = `${this.config.baseUrl}/users/${this.config.userId}/achievements/unlocked`;
                const response = yield this.fetchWithTimeout(url, { method: 'GET' });
                const data = yield response.json();
                return data.unlocked || [];
            }
            catch (error) {
                const err = error;
                if (((_a = err === null || err === void 0 ? void 0 : err.constructor) === null || _a === void 0 ? void 0 : _a.name) === 'SyncError' || (err === null || err === void 0 ? void 0 : err.name) === 'SyncError')
                    throw error;
                if (error instanceof AchievementError && !(error instanceof StorageError))
                    throw error;
                throw new StorageError('Failed to fetch unlocked achievements from API', error);
            }
        });
    }
    setUnlockedAchievements(achievements) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const url = `${this.config.baseUrl}/users/${this.config.userId}/achievements/unlocked`;
                yield this.fetchWithTimeout(url, {
                    method: 'PUT',
                    body: JSON.stringify({ unlocked: achievements })
                });
            }
            catch (error) {
                const err = error;
                if (((_a = err === null || err === void 0 ? void 0 : err.constructor) === null || _a === void 0 ? void 0 : _a.name) === 'SyncError' || (err === null || err === void 0 ? void 0 : err.name) === 'SyncError')
                    throw error;
                if (error instanceof AchievementError && !(error instanceof StorageError))
                    throw error;
                throw new StorageError('Failed to save unlocked achievements to API', error);
            }
        });
    }
    clear() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const url = `${this.config.baseUrl}/users/${this.config.userId}/achievements`;
                yield this.fetchWithTimeout(url, { method: 'DELETE' });
            }
            catch (error) {
                const err = error;
                if (((_a = err === null || err === void 0 ? void 0 : err.constructor) === null || _a === void 0 ? void 0 : _a.name) === 'SyncError' || (err === null || err === void 0 ? void 0 : err.name) === 'SyncError')
                    throw error;
                if (error instanceof AchievementError && !(error instanceof StorageError))
                    throw error;
                throw new StorageError('Failed to clear achievements via API', error);
            }
        });
    }
}

class AsyncStorageAdapter {
    constructor(asyncStorage, options) {
        this.pendingWrites = [];
        this.asyncStorage = asyncStorage;
        this.onError = options === null || options === void 0 ? void 0 : options.onError;
        this.cache = {
            metrics: {},
            unlocked: [],
            loaded: false
        };
        // Eagerly load data from async storage (non-blocking)
        this.initializeCache();
    }
    /**
     * Initialize cache by loading from async storage
     * This happens in the background during construction
     */
    initializeCache() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const [metrics, unlocked] = yield Promise.all([
                    this.asyncStorage.getMetrics(),
                    this.asyncStorage.getUnlockedAchievements()
                ]);
                this.cache.metrics = metrics;
                this.cache.unlocked = unlocked;
                this.cache.loaded = true;
            }
            catch (error) {
                // Handle initialization errors
                console.error('Failed to initialize async storage:', error);
                if (this.onError) {
                    const storageError = error instanceof AchievementError
                        ? error
                        : new StorageError('Failed to initialize storage', error);
                    this.onError(storageError);
                }
                // Set to empty state on error
                this.cache.loaded = true; // Mark as loaded even on error to prevent blocking
            }
        });
    }
    /**
     * Wait for cache to be loaded (used internally)
     * Returns immediately if already loaded, otherwise waits
     */
    ensureCacheLoaded() {
        return __awaiter(this, void 0, void 0, function* () {
            while (!this.cache.loaded) {
                yield new Promise(resolve => setTimeout(resolve, 10));
            }
        });
    }
    /**
     * SYNC READ: Returns cached metrics immediately
     * Cache is loaded eagerly during construction
     */
    getMetrics() {
        return this.cache.metrics;
    }
    /**
     * SYNC WRITE: Updates cache immediately, writes to storage in background
     * Uses optimistic updates - assumes write will succeed
     */
    setMetrics(metrics) {
        // Update cache immediately (optimistic update)
        this.cache.metrics = metrics;
        // Write to async storage in background
        const writePromise = this.asyncStorage.setMetrics(metrics).catch(error => {
            console.error('Failed to write metrics to async storage:', error);
            if (this.onError) {
                const storageError = error instanceof AchievementError
                    ? error
                    : new StorageError('Failed to write metrics', error);
                this.onError(storageError);
            }
        });
        // Track pending write for cleanup/testing
        this.pendingWrites.push(writePromise);
    }
    /**
     * SYNC READ: Returns cached unlocked achievements immediately
     */
    getUnlockedAchievements() {
        return this.cache.unlocked;
    }
    /**
     * SYNC WRITE: Updates cache immediately, writes to storage in background
     */
    setUnlockedAchievements(achievements) {
        // Update cache immediately (optimistic update)
        this.cache.unlocked = achievements;
        // Write to async storage in background
        const writePromise = this.asyncStorage.setUnlockedAchievements(achievements).catch(error => {
            console.error('Failed to write unlocked achievements to async storage:', error);
            if (this.onError) {
                const storageError = error instanceof AchievementError
                    ? error
                    : new StorageError('Failed to write achievements', error);
                this.onError(storageError);
            }
        });
        // Track pending write
        this.pendingWrites.push(writePromise);
    }
    /**
     * SYNC CLEAR: Clears cache immediately, clears storage in background
     */
    clear() {
        // Clear cache immediately
        this.cache.metrics = {};
        this.cache.unlocked = [];
        // Clear async storage in background
        const clearPromise = this.asyncStorage.clear().catch(error => {
            console.error('Failed to clear async storage:', error);
            if (this.onError) {
                const storageError = error instanceof AchievementError
                    ? error
                    : new StorageError('Failed to clear storage', error);
                this.onError(storageError);
            }
        });
        // Track pending write
        this.pendingWrites.push(clearPromise);
    }
    /**
     * Wait for all pending writes to complete (useful for testing/cleanup)
     * NOT part of AchievementStorage interface - utility method
     */
    flush() {
        return __awaiter(this, void 0, void 0, function* () {
            yield Promise.all(this.pendingWrites);
            this.pendingWrites = [];
        });
    }
}

/**
 * AchievementEngine - Framework-agnostic achievement system
 * Event-based core with support for multiple storage backends
 */
class AchievementEngine extends EventEmitter {
    constructor(config) {
        super();
        this.metrics = {};
        this.unlockedAchievements = [];
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
    initializeStorage(config) {
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
        const storageInstance = storage;
        if (typeof storageInstance.getMetrics === 'function') {
            // Check if async storage
            const testResult = storageInstance.getMetrics();
            if (testResult && typeof testResult.then === 'function') {
                return new AsyncStorageAdapter(storageInstance, { onError });
            }
            return storageInstance;
        }
        throw new Error('Invalid storage configuration');
    }
    /**
     * Load state from storage
     */
    loadFromStorage() {
        try {
            const savedMetrics = this.storage.getMetrics() || {};
            const savedUnlocked = this.storage.getUnlockedAchievements() || [];
            // Convert metrics from array format to simple format
            Object.entries(savedMetrics).forEach(([key, value]) => {
                this.metrics[key] = Array.isArray(value) ? value[0] : value;
            });
            this.unlockedAchievements = savedUnlocked;
        }
        catch (error) {
            this.handleError(error, 'loadFromStorage');
        }
    }
    /**
     * Save state to storage
     */
    saveToStorage() {
        try {
            // Convert metrics to array format for storage
            const metricsForStorage = {};
            Object.entries(this.metrics).forEach(([key, value]) => {
                metricsForStorage[key] = Array.isArray(value) ? value : [value];
            });
            this.storage.setMetrics(metricsForStorage);
            this.storage.setUnlockedAchievements(this.unlockedAchievements);
        }
        catch (error) {
            this.handleError(error, 'saveToStorage');
        }
    }
    /**
     * Handle errors with optional callback
     */
    handleError(error, context) {
        const errorEvent = {
            error,
            context,
            timestamp: Date.now()
        };
        // Emit error event
        this.emit('error', errorEvent);
        // Call config error handler if provided
        if (this.config.onError) {
            this.config.onError(error);
        }
    }
    /**
     * Emit a custom event and optionally update metrics based on event mapping
     * @param eventName - Name of the event
     * @param data - Event data
     */
    emit(eventName, data) {
        // If this is a mapped event, update metrics
        if (this.config.eventMapping && eventName in this.config.eventMapping) {
            const mapping = this.config.eventMapping[eventName];
            if (typeof mapping === 'string') {
                // Direct mapping: event name -> metric name
                this.update({ [mapping]: data });
            }
            else if (typeof mapping === 'function') {
                // Custom transformer function
                const metricsUpdate = mapping(data, Object.assign({}, this.metrics));
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
    update(newMetrics) {
        Object.assign({}, this.metrics);
        // Update metrics
        Object.entries(newMetrics).forEach(([key, value]) => {
            const oldValue = this.metrics[key];
            this.metrics[key] = value;
            // Emit metric updated event
            if (oldValue !== value) {
                const metricEvent = {
                    metric: key,
                    oldValue,
                    newValue: value,
                    timestamp: Date.now()
                };
                super.emit('metric:updated', metricEvent);
            }
        });
        // Evaluate achievements
        this.evaluateAchievements();
        // Save to storage
        this.saveToStorage();
        // Emit state changed event
        const stateEvent = {
            metrics: this.getMetricsAsArray(),
            unlocked: [...this.unlockedAchievements],
            timestamp: Date.now()
        };
        super.emit('state:changed', stateEvent);
    }
    /**
     * Evaluate all achievements and unlock any newly met conditions
     * This is the core evaluation logic extracted from AchievementProvider
     */
    evaluateAchievements() {
        const newlyUnlockedAchievements = [];
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
                        const unlockEvent = {
                            achievementId,
                            achievementTitle: achievement.achievementDetails.achievementTitle || 'Achievement Unlocked!',
                            achievementDescription: achievement.achievementDetails.achievementDescription || '',
                            achievementIconKey: achievement.achievementDetails.achievementIconKey,
                            timestamp: Date.now()
                        };
                        super.emit('achievement:unlocked', unlockEvent);
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
    getMetricsAsArray() {
        const metricsInArrayFormat = {};
        Object.entries(this.metrics).forEach(([key, value]) => {
            metricsInArrayFormat[key] = Array.isArray(value) ? value : [value];
        });
        return metricsInArrayFormat;
    }
    /**
     * Get current metrics (readonly to prevent external modification)
     */
    getMetrics() {
        return Object.freeze(Object.assign({}, this.metrics));
    }
    /**
     * Get unlocked achievement IDs (readonly)
     */
    getUnlocked() {
        return Object.freeze([...this.unlockedAchievements]);
    }
    /**
     * Get all achievements with their unlock status
     */
    getAllAchievements() {
        const result = [];
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
    reset() {
        this.metrics = {};
        this.unlockedAchievements = [];
        try {
            this.storage.clear();
        }
        catch (error) {
            this.handleError(error, 'reset');
        }
        // Emit state changed event
        const stateEvent = {
            metrics: {},
            unlocked: [],
            timestamp: Date.now()
        };
        super.emit('state:changed', stateEvent);
    }
    /**
     * Clean up resources and event listeners
     */
    destroy() {
        this.removeAllListeners();
    }
    /**
     * Export achievement data as JSON string
     */
    export() {
        const metricsInArrayFormat = this.getMetricsAsArray();
        return exportAchievementData(metricsInArrayFormat, this.unlockedAchievements, this.configHash);
    }
    /**
     * Import achievement data from JSON string
     * @param jsonString - Exported achievement data
     * @param options - Import options
     */
    import(jsonString, options) {
        const metricsInArrayFormat = this.getMetricsAsArray();
        const result = importAchievementData(jsonString, metricsInArrayFormat, this.unlockedAchievements, Object.assign(Object.assign({}, options), { expectedConfigHash: this.configHash }));
        if (result.success && 'mergedMetrics' in result && 'mergedUnlocked' in result) {
            // Convert metrics from array format to simple format
            const mergedMetrics = {};
            Object.entries(result.mergedMetrics).forEach(([key, value]) => {
                mergedMetrics[key] = Array.isArray(value) ? value[0] : value;
            });
            this.metrics = mergedMetrics;
            this.unlockedAchievements = result.mergedUnlocked || [];
            // Save to storage
            this.saveToStorage();
            // Emit state changed event
            const stateEvent = {
                metrics: this.getMetricsAsArray(),
                unlocked: [...this.unlockedAchievements],
                timestamp: Date.now()
            };
            super.emit('state:changed', stateEvent);
        }
        return result;
    }
    /**
     * Subscribe to engine events
     * @param event - Event name
     * @param handler - Event handler
     */
    on(event, handler) {
        return super.on(event, handler);
    }
    /**
     * Subscribe to an event once
     * @param event - Event name
     * @param handler - Event handler
     */
    once(event, handler) {
        return super.once(event, handler);
    }
    /**
     * Unsubscribe from an event
     * @param event - Event name
     * @param handler - Event handler
     */
    off(event, handler) {
        return super.off(event, handler);
    }
}

class OfflineQueueStorage {
    constructor(innerStorage) {
        this.queue = [];
        this.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
        this.isSyncing = false;
        this.queueStorageKey = 'achievements_offline_queue';
        this.handleOnline = () => {
            this.isOnline = true;
            console.log('[OfflineQueue] Back online, processing queue...');
            this.processQueue();
        };
        this.handleOffline = () => {
            this.isOnline = false;
            console.log('[OfflineQueue] Offline mode activated');
        };
        this.innerStorage = innerStorage;
        // Load queued operations from localStorage
        this.loadQueue();
        // Listen for online/offline events (only in browser environment)
        if (typeof window !== 'undefined') {
            window.addEventListener('online', this.handleOnline);
            window.addEventListener('offline', this.handleOffline);
        }
        // Process queue if already online
        if (this.isOnline) {
            this.processQueue();
        }
    }
    loadQueue() {
        try {
            if (typeof localStorage !== 'undefined') {
                const queueData = localStorage.getItem(this.queueStorageKey);
                if (queueData) {
                    this.queue = JSON.parse(queueData);
                }
            }
        }
        catch (error) {
            console.error('Failed to load offline queue:', error);
            this.queue = [];
        }
    }
    saveQueue() {
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem(this.queueStorageKey, JSON.stringify(this.queue));
            }
        }
        catch (error) {
            console.error('Failed to save offline queue:', error);
        }
    }
    processQueue() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.isSyncing || this.queue.length === 0 || !this.isOnline) {
                return;
            }
            this.isSyncing = true;
            try {
                // Process operations in order
                while (this.queue.length > 0 && this.isOnline) {
                    const operation = this.queue[0];
                    try {
                        switch (operation.type) {
                            case 'setMetrics':
                                yield this.innerStorage.setMetrics(operation.data);
                                break;
                            case 'setUnlockedAchievements':
                                yield this.innerStorage.setUnlockedAchievements(operation.data);
                                break;
                            case 'clear':
                                yield this.innerStorage.clear();
                                break;
                        }
                        // Operation succeeded, remove from queue
                        this.queue.shift();
                        this.saveQueue();
                    }
                    catch (error) {
                        console.error('Failed to sync queued operation:', error);
                        // Stop processing on error, will retry later
                        break;
                    }
                }
            }
            finally {
                this.isSyncing = false;
            }
        });
    }
    queueOperation(type, data) {
        const operation = {
            id: `${Date.now()}_${Math.random()}`,
            type,
            data,
            timestamp: Date.now()
        };
        this.queue.push(operation);
        this.saveQueue();
        // Try to process queue if online
        if (this.isOnline) {
            this.processQueue();
        }
    }
    getMetrics() {
        return __awaiter(this, void 0, void 0, function* () {
            // Reads always try to hit the server first
            try {
                return yield this.innerStorage.getMetrics();
            }
            catch (error) {
                if (!this.isOnline) {
                    throw new StorageError('Cannot read metrics while offline');
                }
                throw error;
            }
        });
    }
    setMetrics(metrics) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.isOnline) {
                try {
                    yield this.innerStorage.setMetrics(metrics);
                    return;
                }
                catch (error) {
                    // Failed while online, queue it
                    console.warn('Failed to set metrics, queuing for later:', error);
                }
            }
            // Queue operation if offline or if online operation failed
            this.queueOperation('setMetrics', metrics);
        });
    }
    getUnlockedAchievements() {
        return __awaiter(this, void 0, void 0, function* () {
            // Reads always try to hit the server first
            try {
                return yield this.innerStorage.getUnlockedAchievements();
            }
            catch (error) {
                if (!this.isOnline) {
                    throw new StorageError('Cannot read achievements while offline');
                }
                throw error;
            }
        });
    }
    setUnlockedAchievements(achievements) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.isOnline) {
                try {
                    yield this.innerStorage.setUnlockedAchievements(achievements);
                    return;
                }
                catch (error) {
                    // Failed while online, queue it
                    console.warn('Failed to set unlocked achievements, queuing for later:', error);
                }
            }
            // Queue operation if offline or if online operation failed
            this.queueOperation('setUnlockedAchievements', achievements);
        });
    }
    clear() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.isOnline) {
                try {
                    yield this.innerStorage.clear();
                    // Also clear the queue
                    this.queue = [];
                    this.saveQueue();
                    return;
                }
                catch (error) {
                    console.warn('Failed to clear, queuing for later:', error);
                }
            }
            // Queue operation if offline or if online operation failed
            this.queueOperation('clear');
        });
    }
    /**
     * Manually trigger queue processing (useful for testing)
     */
    sync() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.processQueue();
        });
    }
    /**
     * Get current queue status (useful for debugging)
     */
    getQueueStatus() {
        return {
            pending: this.queue.length,
            operations: [...this.queue]
        };
    }
    /**
     * Cleanup listeners (call on unmount)
     */
    destroy() {
        if (typeof window !== 'undefined') {
            window.removeEventListener('online', this.handleOnline);
            window.removeEventListener('offline', this.handleOffline);
        }
    }
}

exports.AchievementEngine = AchievementEngine;
exports.AchievementError = AchievementError;
exports.AsyncStorageAdapter = AsyncStorageAdapter;
exports.ConfigurationError = ConfigurationError;
exports.EventEmitter = EventEmitter;
exports.ImportValidationError = ImportValidationError;
exports.IndexedDBStorage = IndexedDBStorage;
exports.LocalStorage = LocalStorage;
exports.MemoryStorage = MemoryStorage;
exports.OfflineQueueStorage = OfflineQueueStorage;
exports.RestApiStorage = RestApiStorage;
exports.StorageError = StorageError;
exports.StorageQuotaError = StorageQuotaError;
exports.SyncError = SyncError;
exports.createConfigHash = createConfigHash;
exports.exportAchievementData = exportAchievementData;
exports.importAchievementData = importAchievementData;
exports.isAchievementError = isAchievementError;
exports.isAsyncStorage = isAsyncStorage;
exports.isRecoverableError = isRecoverableError;
exports.normalizeAchievements = normalizeAchievements;
//# sourceMappingURL=index.js.map
