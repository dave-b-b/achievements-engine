---
sidebar_position: 3
---

# Error Handling

achievements-engine provides comprehensive error handling with type-safe error classes and recovery strategies.

## Overview

The library handles errors gracefully with:

- **Type-safe error classes** for different failure modes
- **Error events** for centralized error handling
- **Graceful degradation** - achievements continue working even if storage fails
- **Recovery guidance** in error messages

---

## Error Event Handling

Handle all achievement-related errors using the error event:

```typescript
import { AchievementEngine } from 'achievements-engine';

const engine = new AchievementEngine({
  achievements,
  storage: 'localStorage'
});

engine.on('error', (event) => {
  console.error('Achievement error:', event.error.message);

  // Send to error tracking service
  if (typeof Sentry !== 'undefined') {
    Sentry.captureException(event.error);
  }
});
```

**Error Event Properties:**

```typescript
{
  type: 'error',
  error: Error,           // The error instance
  context?: string,       // Context where error occurred (e.g., 'storage', 'validation')
  timestamp: Date
}
```

---

## Error Types

### StorageError

Thrown when storage operations fail (localStorage full, IndexedDB unavailable, etc.).

```typescript
import { StorageError } from 'achievements-engine';

engine.on('error', (event) => {
  if (event.error instanceof StorageError) {
    console.error('Storage failed:', event.error.message);
    console.log('Recovery:', event.error.recoveryHint);
  }
});
```

**Common Causes:**
- localStorage quota exceeded
- IndexedDB not available
- Network failure (REST API storage)
- Permission denied

**Recovery Hints:**
```
"Clear old data or switch to IndexedDB for more capacity"
"Check browser settings - IndexedDB may be disabled"
"Check network connection and retry"
```

### ConfigurationError

Thrown when achievement configuration is invalid.

```typescript
// ❌ Invalid configuration
const achievements = {
  score: {
    100: { /* missing title */ }
  }
};

// Error: ConfigurationError
// Message: "Achievement title is required"
```

**Common Causes:**
- Missing required fields (title, icon)
- Invalid threshold values
- Duplicate achievement IDs
- Invalid condition functions

### Metric Validation

Achievement metrics are validated when updated. Invalid values may be ignored or cause errors depending on the storage implementation.

```typescript
engine.update({ score: 'invalid' });  // Should be a number

// May log warning or throw error depending on configuration
```

**Common Validation Issues:**
- Wrong metric type (string instead of number)
- NaN or Infinity values
- Null/undefined values when not expected

---

## Error Handling Patterns

### Basic Error Handling

```typescript
import { AchievementEngine } from 'achievements-engine';

const engine = new AchievementEngine({
  achievements,
  storage: 'localStorage'
});

let lastError: Error | null = null;

engine.on('error', (event) => {
  lastError = event.error;
  console.error('Achievement error:', event.error.message);
});

// Update metrics with error handling
try {
  engine.update({ score: 100 });
} catch (error) {
  console.error('Failed to update achievement:', error);
}
```

### Advanced Error Handling

```typescript
import {
  AchievementEngine,
  StorageError,
  ConfigurationError,
  isAchievementError
} from 'achievements-engine';

function handleAchievementError(error: Error) {
  if (error instanceof StorageError) {
    // Storage failure - try fallback
    console.warn('Storage failed, using memory storage');
    return { action: 'switch_storage', storage: 'memory' };
  }

  if (error instanceof ConfigurationError) {
    // Configuration error - fix and reload
    console.error('Invalid configuration:', error.message);
    return { action: 'fix_config' };
  }

  if (isAchievementError(error)) {
    // Other achievement-related error
    console.warn('Achievement error:', error.message);
    return { action: 'log_error' };
  }

  // Unknown error
  console.error('Unknown achievement error:', error);
  return { action: 'report' };
}

engine.on('error', (event) => {
  const recovery = handleAchievementError(event.error);
  console.log('Recovery action:', recovery.action);
});
```

### Retry Logic

```typescript
async function updateWithRetry(
  engine: AchievementEngine,
  metrics: Record<string, any>,
  maxRetries = 3
) {
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      engine.update(metrics);
      return { success: true };
    } catch (error) {
      attempt++;

      if (error instanceof StorageError && attempt < maxRetries) {
        // Wait and retry
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        continue;
      }

      // Max retries reached or non-retryable error
      return { success: false, error };
    }
  }
}

// Usage
updateWithRetry(engine, { score: 100 }).then(result => {
    if (!result.success) {
        console.error('Update failed after retries:', result.error);
    }
});
```

---

## Graceful Degradation

achievements-engine is designed to degrade gracefully when errors occur:

### Storage Failure

When storage fails, achievements continue to work in memory:

```typescript
const engine = new AchievementEngine({
  achievements,
  storage: 'localStorage'
});

engine.on('error', (event) => {
  if (event.error instanceof StorageError) {
    console.warn('Storage failed, falling back to memory storage');
    // Achievements continue to work in memory
    // Data will be lost on page refresh
  }
});
```

### Configuration Errors

Invalid achievements are skipped, valid ones still work:

```typescript
const achievements = {
  score: {
    100: { title: 'Century', icon: '🏆' },  // ✅ Valid
    500: { /* missing title */ }             // ❌ Skipped
  }
};

// Only the valid achievement (100) will be tracked
const engine = new AchievementEngine({ achievements, storage: 'memory' });
```

### Network Failures (REST API)

Offline queue automatically stores updates locally:

```typescript
const engine = new AchievementEngine({
  achievements,
  storage: 'restApi',
  restApiConfig: {
    baseUrl: 'https://api.example.com/achievements',
    headers: {
      'Authorization': 'Bearer YOUR_TOKEN'
    }
  }
});

engine.on('error', (event) => {
  if (event.error instanceof StorageError && event.context === 'storage') {
    console.error('API sync failed:', event.error.message);
    // Updates are queued locally and will retry
  }
});
```

---

## Type Guards

Use type guards to safely check error types:

```typescript
import {
  StorageError,
  ConfigurationError,
  isAchievementError
} from 'achievements-engine';

function handleError(error: unknown) {
  if (error instanceof StorageError) {
    console.log('Storage error:', error.recoveryHint);
  } else if (error instanceof ConfigurationError) {
    console.log('Config error:', error.message);
  } else if (isAchievementError(error)) {
    console.log('Achievement error:', error.message);
  }
}

engine.on('error', (event) => {
  handleError(event.error);
});
```

---

## Error Properties

### StorageError

```typescript
{
  name: 'StorageError',
  message: 'Failed to save to localStorage',
  recoveryHint: 'Clear old data or switch to IndexedDB',
  originalError: DOMException,  // The underlying error
  storageType: 'localStorage'
}
```

### ConfigurationError

```typescript
{
  name: 'ConfigurationError',
  message: 'Achievement title is required',
  achievementId: 'score_100',
  field: 'title'
}
```

---

## Best Practices

### 1. Always Handle Error Events

```typescript
// ✅ Good: Centralized error handling
const engine = new AchievementEngine({
  achievements,
  storage: 'localStorage'
});

engine.on('error', (event) => {
  logToService(event.error);
  showUserNotification(event.error.message);
});

// ❌ Bad: No error handling
const engine = new AchievementEngine({
  achievements,
  storage: 'localStorage'
});
// No error listener registered
```

### 2. Log Errors to Monitoring Service

```typescript
engine.on('error', (event) => {
  const error = event.error;

  // Send to Sentry, LogRocket, etc.
  if (typeof Sentry !== 'undefined') {
    Sentry.captureException(error, {
      tags: {
        component: 'achievements',
        storage: error.storageType,
        context: event.context
      },
      extra: {
        recoveryHint: error.recoveryHint,
        timestamp: event.timestamp
      }
    });
  }
});
```

### 3. Implement Storage Fallback

```typescript
function createEngineWithFallback(achievements: AchievementConfig) {
  let storage: 'localStorage' | 'memory' = 'localStorage';

  const engine = new AchievementEngine({
    achievements,
    storage
  });

  engine.on('error', (event) => {
    if (event.error instanceof StorageError && storage === 'localStorage') {
      console.warn('localStorage failed, switching to memory storage');
      storage = 'memory';

      // Recreate engine with memory storage
      return createEngineWithFallback(achievements);
    }
  });

  return engine;
}
```

### 4. Validate Configuration Early

```typescript
import { AchievementBuilder } from 'achievements-engine';

// Use the builder to ensure valid configuration
const achievements = AchievementBuilder.combine([
  AchievementBuilder.createScoreAchievements([100, 500, 1000]),
  AchievementBuilder.createLevelAchievements([5, 10, 20])
]);

// Configuration is guaranteed to be valid
const engine = new AchievementEngine({
  achievements,
  storage: 'localStorage'
});
```

---

## Debugging

### Common Issues and Solutions

#### "LocalStorage quota exceeded"

**Solution:**
```typescript
// Switch to IndexedDB (50MB+ capacity)
const engine = new AchievementEngine({
  achievements,
  storage: 'indexedDB'
});
```

#### "Achievement not unlocking"

**Check:**
1. Condition function is correct
2. Metric value is correct type
3. Achievement ID is unique
4. No configuration errors

#### "Storage sync failures"

**Check:**
1. Network connectivity
2. API endpoint is correct
3. Authentication headers are valid
4. CORS is configured on server

```typescript
const engine = new AchievementEngine({
  achievements,
  storage: 'restApi',
  restApiConfig: {
    baseUrl: 'https://api.example.com/achievements',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }
});

engine.on('error', (event) => {
  if (event.error instanceof StorageError) {
    console.error('Storage error details:', {
      message: event.error.message,
      recoveryHint: event.error.recoveryHint,
      originalError: event.error.originalError
    });
  }
});
```

---

## Error Recovery Strategies

### Strategy 1: Automatic Retry

```typescript
class AchievementEngineWithRetry {
  private engine: AchievementEngine;
  private maxRetries = 3;

  constructor(config: AchievementEngineConfig) {
    this.engine = new AchievementEngine(config);
    this.setupErrorHandling();
  }

  private setupErrorHandling() {
    this.engine.on('error', async (event) => {
      if (event.error instanceof StorageError) {
        await this.retryLastOperation();
      }
    });
  }

  private async retryLastOperation() {
    // Implement retry logic
    console.log('Retrying failed operation...');
  }

  update(metrics: Record<string, any>) {
    return this.engine.update(metrics);
  }
}
```

### Strategy 2: Fallback Chain

```typescript
const storageChain = ['indexedDB', 'localStorage', 'memory'] as const;

async function createEngineWithFallback(
  achievements: AchievementConfig,
  storageOptions = [...storageChain]
): Promise<AchievementEngine> {
  if (storageOptions.length === 0) {
    throw new Error('All storage options failed');
  }

  const storage = storageOptions[0];

  try {
    const engine = new AchievementEngine({
      achievements,
      storage
    });

    // Test storage
    engine.update({});

    return engine;
  } catch (error) {
    console.warn(`Storage ${storage} failed, trying next option...`);
    return createEngineWithFallback(achievements, storageOptions.slice(1));
  }
}

// Usage
const engine = await createEngineWithFallback(achievements);
```

### Strategy 3: Error Queue

```typescript
class ErrorQueue {
  private errors: Array<{ error: Error; timestamp: Date; context?: string }> = [];
  private maxSize = 100;

  add(error: Error, context?: string) {
    this.errors.push({ error, timestamp: new Date(), context });

    if (this.errors.length > this.maxSize) {
      this.errors.shift();
    }
  }

  getRecent(count = 10) {
    return this.errors.slice(-count);
  }

  hasRepeatedErrors(errorType: string, threshold = 3) {
    const recent = this.getRecent(5);
    const count = recent.filter(e => e.error.name === errorType).length;
    return count >= threshold;
  }
}

const errorQueue = new ErrorQueue();

engine.on('error', (event) => {
  errorQueue.add(event.error, event.context);

  if (errorQueue.hasRepeatedErrors('StorageError', 3)) {
    console.error('Repeated storage errors detected, switching to fallback');
    // Implement fallback logic
  }
});
```

---

## Next Steps

- [Data Portability](/docs/guides/data-portability) - Export/import for error recovery
- [Storage](/docs/guides/storage) - Configure different storage backends
- [Events](/docs/guides/events) - Listen to achievement events
