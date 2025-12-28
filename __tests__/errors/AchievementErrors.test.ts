/**
 * AchievementErrors Tests
 */

import {
  AchievementError,
  StorageQuotaError,
  ImportValidationError,
  StorageError,
  ConfigurationError,
  SyncError,
  isAchievementError,
  isRecoverableError,
} from '../../src/errors/AchievementErrors';

describe('AchievementErrors', () => {
  describe('AchievementError', () => {
    test('should extend Error', () => {
      const error = new AchievementError('Test error', 'TEST_CODE', true);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AchievementError);
    });

    test('should include code and remedy', () => {
      const error = new AchievementError('Test error', 'TEST_CODE', true, 'Fix this way');

      expect(error.code).toBe('TEST_CODE');
      expect(error.remedy).toBe('Fix this way');
      expect(error.recoverable).toBe(true);
    });

    test('should have correct name', () => {
      const error = new AchievementError('Test error', 'TEST_CODE', true);

      expect(error.name).toBe('AchievementError');
    });

    test('should have message', () => {
      const error = new AchievementError('Test error message', 'TEST_CODE', true);

      expect(error.message).toBe('Test error message');
    });

    test('should support non-recoverable errors', () => {
      const error = new AchievementError('Fatal error', 'FATAL_CODE', false);

      expect(error.recoverable).toBe(false);
    });
  });

  describe('StorageQuotaError', () => {
    test('should calculate bytes needed', () => {
      const error = new StorageQuotaError(5000);

      expect(error.bytesNeeded).toBe(5000);
    });

    test('should have correct error code', () => {
      const error = new StorageQuotaError(5000);

      expect(error.code).toBe('STORAGE_QUOTA_EXCEEDED');
    });

    test('should be recoverable', () => {
      const error = new StorageQuotaError(5000);

      expect(error.recoverable).toBe(true);
    });

    test('should have helpful message', () => {
      const error = new StorageQuotaError(5000);

      expect(error.message).toContain('quota');
      expect(error.message).toContain('exceeded');
    });

    test('should have remedy', () => {
      const error = new StorageQuotaError(5000);

      expect(error.remedy).toBeDefined();
      expect(error.remedy).toContain('export');
    });

    test('should extend AchievementError', () => {
      const error = new StorageQuotaError(5000);

      expect(error).toBeInstanceOf(AchievementError);
      expect(error).toBeInstanceOf(StorageQuotaError);
    });
  });

  describe('ImportValidationError', () => {
    test('should list validation errors', () => {
      const validationErrors = ['Missing field A', 'Invalid field B', 'Bad format C'];
      const error = new ImportValidationError(validationErrors);

      expect(error.validationErrors).toEqual(validationErrors);
    });

    test('should include errors in message', () => {
      const validationErrors = ['Error 1', 'Error 2'];
      const error = new ImportValidationError(validationErrors);

      expect(error.message).toContain('Error 1');
      expect(error.message).toContain('Error 2');
    });

    test('should have correct error code', () => {
      const error = new ImportValidationError(['Test error']);

      expect(error.code).toBe('IMPORT_VALIDATION_ERROR');
    });

    test('should be recoverable', () => {
      const error = new ImportValidationError(['Test error']);

      expect(error.recoverable).toBe(true);
    });

    test('should extend AchievementError', () => {
      const error = new ImportValidationError(['Test error']);

      expect(error).toBeInstanceOf(AchievementError);
      expect(error).toBeInstanceOf(ImportValidationError);
    });
  });

  describe('StorageError', () => {
    test('should store original error', () => {
      const originalError = new Error('Original error');
      const error = new StorageError('Storage failed', originalError);

      expect(error.originalError).toBe(originalError);
    });

    test('should work without original error', () => {
      const error = new StorageError('Storage failed');

      expect(error.originalError).toBeUndefined();
    });

    test('should have correct error code', () => {
      const error = new StorageError('Storage failed');

      expect(error.code).toBe('STORAGE_ERROR');
    });

    test('should be recoverable', () => {
      const error = new StorageError('Storage failed');

      expect(error.recoverable).toBe(true);
    });

    test('should extend AchievementError', () => {
      const error = new StorageError('Storage failed');

      expect(error).toBeInstanceOf(AchievementError);
      expect(error).toBeInstanceOf(StorageError);
    });
  });

  describe('ConfigurationError', () => {
    test('should have correct error code', () => {
      const error = new ConfigurationError('Bad config');

      expect(error.code).toBe('CONFIGURATION_ERROR');
    });

    test('should not be recoverable', () => {
      const error = new ConfigurationError('Bad config');

      expect(error.recoverable).toBe(false);
    });

    test('should have remedy', () => {
      const error = new ConfigurationError('Bad config');

      expect(error.remedy).toBeDefined();
      expect(error.remedy).toContain('configuration');
    });

    test('should extend AchievementError', () => {
      const error = new ConfigurationError('Bad config');

      expect(error).toBeInstanceOf(AchievementError);
      expect(error).toBeInstanceOf(ConfigurationError);
    });
  });

  describe('SyncError', () => {
    test('should include status code and timeout', () => {
      const error = new SyncError('Network error', { statusCode: 500, timeout: 5000 });

      expect(error.statusCode).toBe(500);
      expect(error.timeout).toBe(5000);
    });

    test('should work without details', () => {
      const error = new SyncError('Network error');

      expect(error.statusCode).toBeUndefined();
      expect(error.timeout).toBeUndefined();
    });

    test('should have correct error code', () => {
      const error = new SyncError('Network error');

      expect(error.code).toBe('SYNC_ERROR');
    });

    test('should be recoverable', () => {
      const error = new SyncError('Network error');

      expect(error.recoverable).toBe(true);
    });

    test('should have remedy', () => {
      const error = new SyncError('Network error');

      expect(error.remedy).toBeDefined();
      expect(error.remedy).toContain('network');
    });

    test('should extend AchievementError', () => {
      const error = new SyncError('Network error');

      expect(error).toBeInstanceOf(AchievementError);
      expect(error).toBeInstanceOf(SyncError);
    });
  });

  describe('isAchievementError', () => {
    test('should return true for AchievementError', () => {
      const error = new AchievementError('Test', 'TEST', true);

      expect(isAchievementError(error)).toBe(true);
    });

    test('should return true for derived errors', () => {
      const storageError = new StorageError('Test');
      const quotaError = new StorageQuotaError(100);
      const importError = new ImportValidationError(['test']);
      const configError = new ConfigurationError('test');
      const syncError = new SyncError('test');

      expect(isAchievementError(storageError)).toBe(true);
      expect(isAchievementError(quotaError)).toBe(true);
      expect(isAchievementError(importError)).toBe(true);
      expect(isAchievementError(configError)).toBe(true);
      expect(isAchievementError(syncError)).toBe(true);
    });

    test('should return false for regular Error', () => {
      const error = new Error('Regular error');

      expect(isAchievementError(error)).toBe(false);
    });

    test('should return false for non-error values', () => {
      expect(isAchievementError(null)).toBe(false);
      expect(isAchievementError(undefined)).toBe(false);
      expect(isAchievementError('error')).toBe(false);
      expect(isAchievementError(123)).toBe(false);
      expect(isAchievementError({})).toBe(false);
    });
  });

  describe('isRecoverableError', () => {
    test('should check recoverable flag', () => {
      const recoverable = new AchievementError('Test', 'TEST', true);
      const nonRecoverable = new AchievementError('Test', 'TEST', false);

      expect(isRecoverableError(recoverable)).toBe(true);
      expect(isRecoverableError(nonRecoverable)).toBe(false);
    });

    test('should return false for non-AchievementError', () => {
      const error = new Error('Regular error');

      expect(isRecoverableError(error)).toBe(false);
    });

    test('should return false for non-error values', () => {
      expect(isRecoverableError(null)).toBe(false);
      expect(isRecoverableError(undefined)).toBe(false);
      expect(isRecoverableError('error')).toBe(false);
    });

    test('should work with derived error types', () => {
      const storageError = new StorageError('Test');
      const configError = new ConfigurationError('Test');

      expect(isRecoverableError(storageError)).toBe(true);
      expect(isRecoverableError(configError)).toBe(false);
    });
  });
});
