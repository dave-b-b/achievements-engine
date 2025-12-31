---
sidebar_position: 4
---

# Data Portability

Export and import achievement data for backups, cross-device sync, and cloud storage integration.

## Overview

achievements-engine provides comprehensive data portability:

- **Export** achievement data as JSON
- **Import** data with merge strategies
- **Cloud storage** integration (AWS S3, Azure Blob Storage)
- **Cross-device sync** via REST API
- **Backup and restore** functionality
- **Configuration hash validation** to prevent version mismatches

---

## Basic Export/Import

### Export Data

```typescript
import { AchievementEngine } from 'achievements-engine';

const engine = new AchievementEngine({
  achievements,
  storage: 'localStorage'
});

// Export all data as JSON string
const jsonData = engine.export();
console.log(jsonData);  // JSON string
```

**Exported Format:**

```json
{
  "version": "1.1.0",
  "configHash": "abc123def456",
  "timestamp": 1703337000000,
  "metrics": {
    "score": [100, 150],
    "level": [5],
    "completedTutorial": [true]
  },
  "unlockedAchievements": ["score_100", "level_5", "tutorial_complete"]
}
```

### Import Data

```typescript
import { importAchievementData } from 'achievements-engine';

const result = engine.import(jsonData);

if (result.success) {
  console.log('Import successful!');
  console.log('Warnings:', result.warnings);
} else {
  console.error('Import failed:', result.errors);
}
```

---

## Export API

### Using the Engine

```typescript
// Export from the engine instance
const data = engine.export();
```

### Using the Utility Function

```typescript
import { exportAchievementData, createConfigHash } from 'achievements-engine';

const data = exportAchievementData({
  metrics: engine.getMetrics(),
  unlockedAchievements: engine.getUnlocked(),
  achievements  // Your achievement config
});

console.log(data);  // JSON string
```

### Creating Configuration Hash

The configuration hash helps validate that imported data matches your achievement configuration:

```typescript
import { createConfigHash } from 'achievements-engine';

const hash = createConfigHash(achievements);
console.log(hash);  // "abc123def456"
```

---

## Import Strategies

### Replace Strategy (Default)

Completely replaces existing data:

```typescript
const result = engine.import(jsonData, {
  merge: false,
  overwrite: true
});
```

**Use when:**
- Restoring from a known good backup
- Resetting all achievements
- Initial data load

### Merge Strategy

Combines imported data with existing data:

```typescript
const result = engine.import(jsonData, {
  merge: true,
  overwrite: false
});
```

**Merge rules:**
- Unlocked achievements stay unlocked (union)
- Metrics are combined (arrays merged)
- Preserves all progress from both sources

**Use when:**
- Syncing between devices
- Importing partial backups
- Merging multiple saves

### Validated Import

Validate configuration hash before importing:

```typescript
const result = engine.import(jsonData, {
  merge: true,
  validateConfig: true,
  expectedConfigHash: createConfigHash(achievements)
});

if (!result.success) {
  console.error('Configuration mismatch!', result.errors);
}
```

---

## Import Options

### ImportOptions Interface

```typescript
interface ImportOptions {
  merge?: boolean;              // Combine with existing data (default: false)
  overwrite?: boolean;          // Overwrite existing data (default: true)
  validateConfig?: boolean;     // Validate configuration hash (default: false)
  expectedConfigHash?: string;  // Expected config hash for validation
}
```

### ImportResult Interface

```typescript
interface ImportResult {
  success: boolean;
  errors?: string[];
  warnings?: string[];
  mergedMetrics?: AchievementMetrics;
  mergedUnlocked?: string[];
}
```

---

## Backup to File

### Download as JSON File (Browser)

```typescript
function downloadBackup(engine: AchievementEngine) {
  const data = engine.export();
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `achievements-backup-${Date.now()}.json`;
  link.click();

  URL.revokeObjectURL(url);
}
```

### Upload from File (Browser)

```typescript
function uploadBackup(engine: AchievementEngine, file: File) {
  const reader = new FileReader();

  reader.onload = async (e) => {
    const jsonData = e.target?.result as string;
    const result = engine.import(jsonData, { merge: true });

    if (result.success) {
      console.log('Backup restored!');
      if (result.warnings?.length) {
        console.warn('Import warnings:', result.warnings);
      }
    } else {
      console.error('Import failed:', result.errors);
    }
  };

  reader.readAsText(file);
}

// Usage
const fileInput = document.getElementById('file-input') as HTMLInputElement;
fileInput.addEventListener('change', (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) {
    uploadBackup(engine, file);
  }
});
```

---

## Cloud Storage Integration

### AWS S3 Integration

```typescript
import { S3 } from 'aws-sdk';
import { AchievementEngine } from 'achievements-engine';

class S3BackupService {
  private s3: S3;
  private bucket: string;

  constructor() {
    this.s3 = new S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: 'us-east-1'
    });
    this.bucket = 'my-achievements-backup';
  }

  async backup(engine: AchievementEngine, userId: string): Promise<{ success: boolean; location?: string; error?: any }> {
    const data = engine.export();

    const params = {
      Bucket: this.bucket,
      Key: `users/${userId}/achievements-${Date.now()}.json`,
      Body: data,
      ContentType: 'application/json',
      ServerSideEncryption: 'AES256'  // Encrypt at rest
    };

    try {
      const result = await this.s3.putObject(params).promise();
      console.log('Backed up to S3');
      return { success: true, location: result.ETag };
    } catch (error) {
      console.error('S3 backup failed:', error);
      return { success: false, error };
    }
  }

  async restore(engine: AchievementEngine, backupKey: string): Promise<ImportResult> {
    const params = {
      Bucket: this.bucket,
      Key: backupKey
    };

    try {
      const data = await this.s3.getObject(params).promise();
      const result = engine.import(jsonData, { merge: true });
      console.log('Restored from S3');
      return result;
    } catch (error) {
      console.error('S3 restore failed:', error);
      return { success: false, errors: [error.message] };
    }
  }

  async listBackups(userId: string) {
    const params = {
      Bucket: this.bucket,
      Prefix: `users/${userId}/`
    };

    const data = await this.s3.listObjectsV2(params).promise();

    return data.Contents?.map(item => ({
      key: item.Key,
      size: item.Size,
      lastModified: item.LastModified
    })) || [];
  }

  async deleteOldBackups(userId: string, keepCount: number = 10) {
    const backups = await this.listBackups(userId);

    if (backups.length > keepCount) {
      const toDelete = backups
        .sort((a, b) => (b.lastModified?.getTime() || 0) - (a.lastModified?.getTime() || 0))
        .slice(keepCount);

      for (const backup of toDelete) {
        await this.s3.deleteObject({
          Bucket: this.bucket,
          Key: backup.key!
        }).promise();
      }
    }
  }
}
```

### Usage

```typescript
const backupService = new S3BackupService();

// Backup
await backupService.backup(engine, 'user123');

// Restore
await backupService.restore(engine, 'users/user123/achievements-1703337000000.json');

// List backups
const backups = await backupService.listBackups('user123');

// Prune old backups
await backupService.deleteOldBackups('user123', 10);
```

---

### Azure Blob Storage Integration

```typescript
import { BlobServiceClient } from '@azure/storage-blob';
import { AchievementEngine } from 'achievements-engine';

class AzureBackupService {
  private containerClient;

  constructor() {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING!;
    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    this.containerClient = blobServiceClient.getContainerClient('achievements-backup');
  }

  async backup(engine: AchievementEngine, userId: string) {
    const data = engine.export();
    const blobName = `users/${userId}/achievements-${Date.now()}.json`;
    const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);

    try {
      await blockBlobClient.upload(data, data.length, {
        blobHTTPHeaders: { blobContentType: 'application/json' }
      });

      console.log('Backed up to Azure Blob Storage');
      return { success: true, blobName };
    } catch (error) {
      console.error('Azure backup failed:', error);
      return { success: false, error };
    }
  }

  async restore(engine: AchievementEngine, blobName: string) {
    const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);

    try {
      const downloadResponse = await blockBlobClient.download(0);
      const jsonData = await this.streamToString(downloadResponse.readableStreamBody!);

      const result = engine.import(jsonData, { merge: true });
      console.log('Restored from Azure');
      return result;
    } catch (error) {
      console.error('Azure restore failed:', error);
      return { success: false, errors: [error.message] };
    }
  }

  private async streamToString(readableStream: NodeJS.ReadableStream): Promise<string> {
    return new Promise((resolve, reject) => {
      const chunks: string[] = [];
      readableStream.on('data', (data) => {
        chunks.push(data.toString());
      });
      readableStream.on('end', () => {
        resolve(chunks.join(''));
      });
      readableStream.on('error', reject);
    });
  }
}
```

---

## Automatic Backup Strategies

### Backup on Achievement Unlock

```typescript
const engine = new AchievementEngine({
  achievements,
  storage: 'localStorage'
});

engine.on('achievement:unlocked', async (event) => {
  // Backup to cloud whenever an achievement unlocks
  await backupService.backup(engine, userId);
  console.log(`Backed up after unlocking: ${event.achievementTitle}`);
});
```

### Periodic Auto-Backup

```typescript
// Backup every 5 minutes
const backupInterval = setInterval(async () => {
  await backupService.backup(engine, userId);
  console.log('Auto-backup completed');
}, 5 * 60 * 1000);

// Cleanup on app shutdown
process.on('SIGINT', () => {
  clearInterval(backupInterval);
  process.exit();
});
```

### Backup on State Changes

```typescript
engine.on('state:changed', async (event) => {
  // Backup whenever metrics or achievements change
  await backupService.backup(engine, userId);
});
```

---

## Cross-Device Sync with REST API

Use REST API storage for automatic cross-device synchronization:

```typescript
import { AchievementEngine, RestApiStorage } from 'achievements-engine';

const engine = new AchievementEngine({
  achievements,
  storage: 'restApi',
  restApiConfig: {
    baseUrl: 'https://api.example.com/achievements',
    headers: {
      'Authorization': `Bearer ${userToken}`,
      'X-User-ID': userId
    }
  }
});
```

The REST API storage automatically:
- Syncs on every update
- Pulls latest data on initialization
- Handles server-side conflict resolution

---

## Best Practices

### 1. Encrypt Sensitive Data

```typescript
import CryptoJS from 'crypto-js';

function encryptData(data: string, secret: string): string {
  return CryptoJS.AES.encrypt(data, secret).toString();
}

function decryptData(encryptedData: string, secret: string): string {
  const bytes = CryptoJS.AES.decrypt(encryptedData, secret);
  return bytes.toString(CryptoJS.enc.Utf8);
}

// Export with encryption
const data = engine.export();
const encrypted = encryptData(data, userSecret);
await backupService.backupEncrypted(encrypted, userId);

// Import with decryption
const encrypted = await backupService.restoreEncrypted(backupKey);
const decrypted = decryptData(encrypted, userSecret);
engine.import(decrypted);
```

### 2. Version Your Backups

```typescript
const APP_VERSION = '1.1.0';
const blobName = `users/${userId}/v${APP_VERSION}/achievements-${Date.now()}.json`;
```

### 3. Validate Before Import

```typescript
import { createConfigHash } from 'achievements-engine';

const expectedHash = createConfigHash(achievements);

const result = engine.import(jsonData, {
  merge: true,
  validateConfig: true,
  expectedConfigHash: expectedHash
});

if (!result.success) {
  console.error('Configuration mismatch!', result.errors);
  // Don't import - achievement definitions have changed
} else {
  console.log('Import successful with valid configuration');
}
```

### 4. Handle Import Errors Gracefully

```typescript
async function safeImport(engine: AchievementEngine, jsonData: string) {
  try {
    const result = engine.import(jsonData, { merge: true });

    if (!result.success) {
      console.error('Import failed:', result.errors);
      return false;
    }

    if (result.warnings?.length) {
      console.warn('Import warnings:', result.warnings);
    }

    console.log('Import successful');
    return true;
  } catch (error) {
    console.error('Import error:', error);
    return false;
  }
}
```

### 5. Implement Backup Retention

```typescript
class BackupManager {
  async backupWithRetention(
    engine: AchievementEngine,
    userId: string,
    maxBackups: number = 10
  ) {
    // Create new backup
    await backupService.backup(engine, userId);

    // Prune old backups
    await backupService.deleteOldBackups(userId, maxBackups);
  }
}
```

---

## Complete Backup System Example

```typescript
import { AchievementEngine } from 'achievements-engine';

class AchievementBackupManager {
  private engine: AchievementEngine;
  private backupService: S3BackupService;
  private userId: string;
  private autoBackupInterval?: NodeJS.Timeout;

  constructor(engine: AchievementEngine, userId: string) {
    this.engine = engine;
    this.backupService = new S3BackupService();
    this.userId = userId;
    this.setupAutoBackup();
  }

  private setupAutoBackup() {
    // Backup on achievement unlock
    this.engine.on('achievement:unlocked', () => this.backup());

    // Periodic backup every 5 minutes
    this.autoBackupInterval = setInterval(() => this.backup(), 5 * 60 * 1000);
  }

  async backup() {
    try {
      const result = await this.backupService.backup(this.engine, this.userId);
      if (result.success) {
        console.log('Backup successful');
        await this.backupService.deleteOldBackups(this.userId, 10);
      }
    } catch (error) {
      console.error('Backup failed:', error);
    }
  }

  async restore(backupKey: string) {
    try {
      const result = await this.backupService.restore(this.engine, backupKey);
      if (result.success) {
        console.log('Restore successful');
      } else {
        console.error('Restore failed:', result.errors);
      }
      return result;
    } catch (error) {
      console.error('Restore error:', error);
      return { success: false, errors: [error.message] };
    }
  }

  async listBackups() {
    return await this.backupService.listBackups(this.userId);
  }

  destroy() {
    if (this.autoBackupInterval) {
      clearInterval(this.autoBackupInterval);
    }
  }
}

// Usage
const backupManager = new AchievementBackupManager(engine, 'user123');

// Manual backup
await backupManager.backup();

// List available backups
const backups = await backupManager.listBackups();

// Restore from backup
await backupManager.restore('users/user123/achievements-1703337000000.json');

// Cleanup on shutdown
process.on('SIGINT', () => {
  backupManager.destroy();
  process.exit();
});
```

---

## Next Steps

- [Error Handling](/docs/guides/error-handling) - Handle backup failures gracefully
- [Storage Options](/docs/guides/storage) - Configure different storage backends
- [Event-Based Tracking](/docs/guides/event-based-tracking) - Listen to achievement events

