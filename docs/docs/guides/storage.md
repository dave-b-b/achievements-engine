---
sidebar_position: 5
---

# Storage Options

achievements-engine supports multiple storage backends to fit different use cases, from simple in-memory storage to cloud-synchronized REST APIs.

## Overview

Choose the storage backend that fits your needs:

| Storage | Persistence | Capacity | Use Case |
|---------|-------------|----------|----------|
| **Memory** | No | Unlimited | Development, testing, temporary sessions |
| **LocalStorage** | Yes | ~5-10MB | Small datasets, simple persistence |
| **IndexedDB** | Yes | ~50MB+ | Large datasets, complex queries |
| **REST API** | Yes | Unlimited | Cloud sync, multi-device |
| **Offline Queue** | Yes | Unlimited | REST API with offline support |

---

## Memory Storage

Simple in-memory storage. Data is lost when the page refreshes.

### When to Use

- Development and testing
- Temporary sessions
- Server-side rendering (SSR)
- Environments without localStorage

### Configuration

```typescript
import { AchievementEngine } from 'achievements-engine';

const engine = new AchievementEngine({
  achievements,
  storage: 'memory'
});
```

### Characteristics

- **Persistence:** None (data lost on refresh)
- **Capacity:** Unlimited (limited by device RAM)
- **Performance:** Fastest (no I/O operations)
- **Browser Support:** All environments

---

## LocalStorage

Browser localStorage with automatic serialization and quota handling.

### When to Use

- Web applications requiring persistence
- Small to medium datasets (under 5MB)
- Simple key-value storage needs
- No complex queries required

### Configuration

```typescript
const engine = new AchievementEngine({
  achievements,
  storage: 'localStorage'
});
```

### Features

**Date Serialization:**
```typescript
// LocalStorage automatically handles Date objects
engine.update({ lastLogin: new Date() });

// Dates are properly serialized and deserialized
const metrics = engine.getMetrics();
console.log(metrics.lastLogin instanceof Date); // true
```

**Quota Error Handling:**
```typescript
import { StorageQuotaError } from 'achievements-engine';

engine.on('error', (event) => {
  if (event.error instanceof StorageQuotaError) {
    console.error('Storage full!');
    console.log('Bytes needed:', event.error.bytesNeeded);

    // Fallback to IndexedDB
    // or clear old data
  }
});
```

### Characteristics

- **Persistence:** Yes (survives page refresh)
- **Capacity:** ~5-10MB (browser dependent)
- **Performance:** Fast (synchronous API)
- **Browser Support:** All modern browsers

### Best Practices

```typescript
// Monitor storage usage
function checkStorageSize() {
  const data = localStorage.getItem('achievements');
  const sizeInBytes = new Blob([data || '']).size;
  const sizeInKB = (sizeInBytes / 1024).toFixed(2);
  console.log(`Storage size: ${sizeInKB} KB`);
}
```

---

## IndexedDB Storage

Browser IndexedDB for large datasets with better capacity.

### When to Use

- Large achievement datasets
- Need for complex queries
- LocalStorage quota exceeded
- Better performance for large data

### Configuration

```typescript
const engine = new AchievementEngine({
  achievements,
  storage: 'indexedDB'
});
```

### Features

**Async Operations:**
The `AchievementEngine` will automatically handle the asynchronous nature of IndexedDB. The engine will be ready to use after the constructor returns.

```typescript
// IndexedDB operations are asynchronous
const engine = new AchievementEngine({
  achievements,
  storage: 'indexedDB'
});

// The engine is ready to use immediately
engine.update({ score: 100 });
```

### Characteristics

- **Persistence:** Yes (survives page refresh)
- **Capacity:** ~50MB to several GB (browser dependent)
- **Performance:** Fast for large datasets
- **Browser Support:** All modern browsers, IE 10+

### Error Handling

```typescript
engine.on('error', (event) => {
  if (event.error.message.includes('IndexedDB')) {
    console.error('IndexedDB not available');
    // Fallback to localStorage
  }
});
```

---

## REST API Storage

Sync achievements with a backend server for cloud storage and multi-device support.

### When to Use

- Cloud-based achievement tracking
- Multi-device synchronization
- User accounts and profiles
- Analytics and leaderboards

### Configuration

```typescript
const engine = new AchievementEngine({
  achievements,
  storage: 'restApi',
  restApiConfig: {
    baseUrl: 'https://api.example.com',
    userId: 'user123',
    headers: {
      'Authorization': `Bearer ${userToken}`,
      'X-App-Version': '1.0.0'
    },
    timeout: 10000 // 10 seconds (default)
  }
});
```

### API Endpoints

Your backend should implement these endpoints:

**GET Metrics:**
```
GET /users/{userId}/achievements/metrics
Response: { "metrics": { "score": [100, 200], "level": [5] } }
```

**PUT Metrics:**
```
PUT /users/{userId}/achievements/metrics
Body: { "metrics": { "score": [100, 200], "level": [5] } }
Response: 200 OK
```

**GET Unlocked Achievements:**
```
GET /users/{userId}/achievements/unlocked
Response: { "unlocked": ["score_100", "level_5"] }
```

**PUT Unlocked Achievements:**
```
PUT /users/{userId}/achievements/unlocked
Body: { "unlocked": ["score_100", "level_5"] }
Response: 200 OK
```

**DELETE All Data:**
```
DELETE /users/{userId}/achievements
Response: 200 OK
```

### Error Handling

```typescript
import { StorageError, SyncError } from 'achievements-engine';

engine.on('error', (event) => {
  if (event.error instanceof SyncError) {
    console.error('API sync failed:', event.error.message);

    // Check error details
    if (event.error.statusCode === 401) {
      console.log('Authentication failed - refresh token');
    } else if (event.error.statusCode === 429) {
      console.log('Rate limited - retry later');
    }
  }
});
```

### Characteristics

- **Persistence:** Yes (cloud-based)
- **Capacity:** Unlimited (server-dependent)
- **Performance:** Slower (network latency)
- **Browser Support:** All environments with fetch API

### Best Practices

**1. Authentication:**
```typescript
// Refresh token before it expires
async function refreshToken() {
  const newToken = await fetchNewToken();

  // Update engine config
  engine.storage.config.headers['Authorization'] = `Bearer ${newToken}`;
}
```

**2. Error Recovery:**
```typescript
// Retry on network failures
let retryCount = 0;
const maxRetries = 3;

engine.on('error', async (event) => {
  if (event.error instanceof SyncError && retryCount < maxRetries) {
    retryCount++;
    console.log(`Retrying (${retryCount}/${maxRetries})...`);

    await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
    // Retry the update
  }
});
```

**3. Optimistic Updates:**
```typescript
// Update UI immediately, sync in background
function updateScore(newScore: number) {
  // Update local state immediately
  engine.update({ score: newScore });

  // API sync happens automatically in background
  // If it fails, error event will fire
}
```

---

## Offline Queue Storage

Wrapper around REST API storage that queues operations when offline and syncs when back online.

### When to Use

- REST API with unreliable network
- Mobile applications
- Progressive Web Apps (PWAs)
- Offline-first applications

### Configuration

```typescript
import { AchievementEngine, RestApiStorage, OfflineQueueStorage } from 'achievements-engine';

// Create REST API storage
const restStorage = new RestApiStorage({
  baseUrl: 'https://api.example.com',
  userId: 'user123',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// Wrap with offline queue
const offlineStorage = new OfflineQueueStorage(restStorage);

const engine = new AchievementEngine({
  achievements,
  storage: offlineStorage // Use the wrapped storage
});
```

### How It Works

1. **Online:** Operations are sent directly to the API
2. **Offline:** Operations are queued in localStorage
3. **Back Online:** Queue is automatically processed in order

```typescript
// User goes offline
engine.update({ score: 100 }); // Queued locally

// User scores more points while offline
engine.update({ score: 200 }); // Queued locally

// User comes back online
// Queue automatically processes: score:100, then score:200
```

### Monitoring Queue Status

```typescript
// Check queue length
if (offlineStorage.queue.length > 0) {
  console.log(`${offlineStorage.queue.length} operations queued`);
}

// Listen for sync events
offlineStorage.on('sync:start', () => {
  console.log('Starting sync...');
});

offlineStorage.on('sync:complete', () => {
  console.log('Sync complete!');
});

offlineStorage.on('sync:error', (error) => {
  console.error('Sync failed:', error);
});
```

### Characteristics

- **Persistence:** Yes (cloud + local queue)
- **Capacity:** Unlimited (server + localStorage for queue)
- **Performance:** Fast locally, syncs in background
- **Browser Support:** Browsers with online/offline events

---

## Custom Storage Adapter

Implement your own storage backend for special requirements.

### Creating a Custom Adapter

```typescript
import { AchievementStorage, AchievementMetrics } from 'achievements-engine';

class CustomStorage implements AchievementStorage {
  private data: {
    metrics: AchievementMetrics;
    unlocked: string[];
  } = {
    metrics: {},
    unlocked: []
  };

  getMetrics(): AchievementMetrics {
    return this.data.metrics;
  }

  setMetrics(metrics: AchievementMetrics): void {
    this.data.metrics = metrics;
    // Your custom persistence logic
    this.saveToDisk(metrics);
  }

  getUnlockedAchievements(): string[] {
    return this.data.unlocked;
  }

  setUnlockedAchievements(achievements: string[]): void {
    this.data.unlocked = achievements;
    // Your custom persistence logic
    this.saveToDisk(achievements);
  }

  clear(): void {
    this.data = { metrics: {}, unlocked: [] };
    // Your custom clear logic
    this.clearDisk();
  }

  private saveToDisk(data: any) {
    // Implement your persistence
  }

  private clearDisk() {
    // Implement your clear logic
  }
}

// Use custom storage
const engine = new AchievementEngine({
  achievements,
  storage: new CustomStorage()
});
```

### Async Storage Example

```typescript
import { AsyncAchievementStorage, AchievementMetrics } from 'achievements-engine';

class AsyncCustomStorage implements AsyncAchievementStorage {
  async getMetrics(): Promise<AchievementMetrics> {
    const data = await fetch('/api/metrics');
    return data.json();
  }

  async setMetrics(metrics: AchievementMetrics): Promise<void> {
    await fetch('/api/metrics', {
      method: 'PUT',
      body: JSON.stringify(metrics)
    });
  }

  async getUnlockedAchievements(): Promise<string[]> {
    const data = await fetch('/api/unlocked');
    return data.json();
  }

  async setUnlockedAchievements(achievements: string[]): Promise<void> {
    await fetch('/api/unlocked', {
      method: 'PUT',
      body: JSON.stringify(achievements)
    });
  }

  async clear(): Promise<void> {
    await fetch('/api/clear', { method: 'DELETE' });
  }
}
```

---

## Storage Comparison

### Performance

| Storage | Read | Write | Capacity |
|---------|------|-------|----------|
| Memory | Fastest | Fastest | RAM-limited |
| LocalStorage | Fast | Fast | ~5-10MB |
| IndexedDB | Fast | Medium | ~50MB+ |
| REST API | Slow | Slow | Unlimited |
| Offline Queue | Fast* | Fast* | Unlimited |

*Fast locally, syncs in background

### Use Case Matrix

```typescript
// Small web app, no account system
storage: 'localStorage'

// Large dataset, no backend
storage: 'indexedDB'

// User accounts, cloud sync required
storage: 'restApi'

// Mobile app, unreliable network
storage: new OfflineQueueStorage(restApiStorage)

// Server-side rendering
storage: 'memory'

// React Native app
// See simple-api.md for AsyncStorageAdapter example
storage: new AsyncStorageAdapter()
```

---

## Migration Between Storage Types

### Exporting Data Before Migration

```typescript
// Export from current storage
const oldEngine = new AchievementEngine({
  achievements,
  storage: 'localStorage'
});

const exportedData = oldEngine.export();

// Create new engine with different storage
const newEngine = new AchievementEngine({
  achievements,
  storage: 'indexedDB'
});

// Import data to new storage
newEngine.import(exportedData);
```

### Storage Fallback Chain

```typescript
async function createEngineWithFallback(achievements: any) {
  const storageOptions = ['indexedDB', 'localStorage', 'memory'];

  for (const storage of storageOptions) {
    try {
      const engine = new AchievementEngine({
        achievements,
        storage: storage as any
      });

      // Test the storage by doing a write/read operation
      engine.update({ test: 1 });

      console.log(`Using storage: ${storage}`);
      return engine;
    } catch (error) {
      console.warn(`${storage} failed, trying next option`);
    }
  }

  throw new Error('All storage options failed');
}
```

---

## Best Practices

### 1. Choose the Right Storage

```typescript
// For simple web apps
const engine = new AchievementEngine({
  achievements,
  storage: 'localStorage'
});

// For apps with user accounts
const engine = new AchievementEngine({
  achievements,
  storage: 'restApi',
  restApiConfig: { /* ... */ }
});

// For offline-capable apps
const engine = new AchievementEngine({
  achievements,
  storage: new OfflineQueueStorage(restApiStorage)
});
```

### 2. Handle Storage Errors

```typescript
import { StorageError, StorageQuotaError } from 'achievements-engine';

engine.on('error', (event) => {
  if (event.error instanceof StorageQuotaError) {
    // Storage full - clear old data or upgrade to IndexedDB
    console.error('Storage quota exceeded');
  } else if (event.error instanceof StorageError) {
    // Generic storage error - fallback or retry
    console.error('Storage failed:', event.error.message);
  }
});
```

### 3. Monitor Storage Usage

```typescript
// Check localStorage usage
function getStorageUsage() {
  let total = 0;
  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      total += localStorage[key].length + key.length;
    }
  }
  return (total / 1024).toFixed(2) + ' KB';
}

console.log('LocalStorage usage:', getStorageUsage());
```

### 4. Clear Old Data

```typescript
// Clear achievements (useful for testing or reset)
engine.clear();

// Export before clearing (backup)
const backup = engine.export();
localStorage.setItem('achievement_backup', backup);

// Clear
engine.clear();

// Restore if needed
const backup = localStorage.getItem('achievement_backup');
if (backup) {
  engine.import(backup);
}
```

---

## Next Steps

- [Data Portability](/docs/guides/data-portability) - Export and import achievement data
- [Error Handling](/docs/guides/error-handling) - Handle storage failures gracefully
- [Builder API](/docs/guides/builder-api) - Create achievements with the builder API
