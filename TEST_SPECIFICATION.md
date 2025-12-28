# Achievements Engine - Comprehensive Test Specification

This document provides a complete test specification for the achievements-engine package. Use this to implement a full test suite.

## Test File Structure

```
__tests__/
├── EventEmitter.test.ts
├── AchievementEngine.test.ts
├── storage/
│   ├── MemoryStorage.test.ts
│   ├── LocalStorage.test.ts
│   ├── IndexedDBStorage.test.ts
│   ├── RestApiStorage.test.ts
│   ├── AsyncStorageAdapter.test.ts
│   └── OfflineQueueStorage.test.ts
├── utils/
│   ├── configNormalizer.test.ts
│   ├── dataExport.test.ts
│   └── dataImport.test.ts
└── errors/
    └── AchievementErrors.test.ts
```

## Test Environment Setup

Each test file should include:
- Jest configuration for TypeScript
- Mock implementations where needed
- Setup and teardown for storage cleanup
- Fake timers for time-based tests

---

# 1. EventEmitter Tests (`__tests__/EventEmitter.test.ts`)

## 1.1 Basic Event Subscription

**Test: `on() should subscribe to events`**
- Create EventEmitter instance
- Subscribe to an event with `on()`
- Emit the event with data
- Verify handler was called with correct data

**Test: `on() should return unsubscribe function`**
- Subscribe to an event
- Verify return value is a function
- Call the unsubscribe function
- Emit event and verify handler NOT called

**Test: `on() should support multiple handlers for same event`**
- Subscribe multiple handlers to same event
- Emit event
- Verify all handlers were called

**Test: `on() should pass data to handlers`**
- Subscribe with handler expecting specific data structure
- Emit with complex data object
- Verify handler received exact data

## 1.2 Once Subscription

**Test: `once() should unsubscribe after first emission`**
- Subscribe with `once()`
- Emit event twice
- Verify handler only called once

**Test: `once() should return unsubscribe function`**
- Subscribe with `once()`
- Call unsubscribe immediately
- Emit event
- Verify handler NOT called

**Test: `once() should work with multiple once handlers`**
- Subscribe multiple once handlers
- Emit once
- Verify all handlers called exactly once

## 1.3 Unsubscription

**Test: `off() should remove specific handler`**
- Subscribe two handlers to same event
- Remove one handler with `off()`
- Emit event
- Verify only remaining handler called

**Test: `off() should handle non-existent handler gracefully`**
- Call `off()` with handler that was never subscribed
- Should not throw error

**Test: `removeAllListeners() should remove all handlers for event`**
- Subscribe multiple handlers to an event
- Call `removeAllListeners('eventName')`
- Emit event
- Verify no handlers called

**Test: `removeAllListeners() with no args should remove all handlers`**
- Subscribe handlers to multiple events
- Call `removeAllListeners()` with no args
- Emit all events
- Verify no handlers called

## 1.4 Event Emission

**Test: `emit() should call handlers synchronously`**
- Use synchronous handler that sets a flag
- Emit event
- Verify flag is set immediately after emit()

**Test: `emit() should handle handler errors gracefully`**
- Subscribe handler that throws error
- Subscribe second valid handler
- Emit event
- Verify second handler still called
- Verify error logged to console

**Test: `emit() should handle no listeners gracefully`**
- Emit event with no subscribers
- Should not throw error

**Test: `emit() should work with undefined data`**
- Subscribe handler
- Emit with no data argument
- Verify handler called with undefined

## 1.5 Memory Management

**Test: `should clean up empty listener sets`**
- Subscribe and then unsubscribe handler
- Check internal state (via listenerCount)
- Verify event removed from internal maps

**Test: `listenerCount() should return correct count`**
- Subscribe multiple handlers (both on and once)
- Verify count is accurate
- Unsubscribe some
- Verify count updated

**Test: `eventNames() should return all events with listeners`**
- Subscribe to multiple events
- Verify eventNames() returns all event names
- Remove some listeners
- Verify eventNames() updated

---

# 2. AchievementEngine Core Tests (`__tests__/AchievementEngine.test.ts`)

## 2.1 Initialization

**Test: `constructor should initialize with simple config`**
- Create engine with minimal config (achievements only)
- Verify engine created successfully
- Verify default storage is MemoryStorage

**Test: `constructor should normalize simple achievement config`**
- Provide SimpleAchievementConfig format
- Create engine
- Verify achievements normalized to internal format

**Test: `constructor should accept complex achievement config`**
- Provide AchievementConfiguration format
- Create engine
- Verify achievements stored correctly

**Test: `constructor should initialize with local storage`**
- Create engine with `storage: 'local'`
- Verify LocalStorage instance created
- Verify storage key is 'achievements'

**Test: `constructor should initialize with memory storage`**
- Create engine with `storage: 'memory'`
- Verify MemoryStorage instance used

**Test: `constructor should throw error for RestAPI without config`**
- Create engine with `storage: 'restapi'` but no restApiConfig
- Verify throws ConfigurationError

**Test: `constructor should load existing state from storage`**
- Pre-populate storage with metrics and unlocked achievements
- Create engine
- Verify state loaded correctly

## 2.2 Metric Updates (Direct)

**Test: `update() should update single metric`**
- Create engine
- Call `update({ score: 100 })`
- Verify `getMetrics()` returns `{ score: 100 }`

**Test: `update() should update multiple metrics`**
- Call `update({ score: 100, level: 5, health: 75 })`
- Verify all metrics updated

**Test: `update() should overwrite existing metric values`**
- Update score to 100
- Update score to 200
- Verify final value is 200

**Test: `update() should persist to storage`**
- Update metrics
- Create new engine with same storage
- Verify metrics persisted

**Test: `update() should emit 'metric:updated' event`**
- Subscribe to 'metric:updated'
- Update a metric
- Verify event emitted with correct payload (metric, oldValue, newValue, timestamp)

**Test: `update() should emit 'state:changed' event`**
- Subscribe to 'state:changed'
- Update metrics
- Verify event emitted with full state

## 2.3 Achievement Evaluation

**Test: `update() should unlock threshold-based achievement`**
- Configure achievement for score >= 100
- Subscribe to 'achievement:unlocked'
- Update score to 100
- Verify achievement unlocked event emitted
- Verify achievement in unlocked list

**Test: `update() should unlock boolean achievement`**
- Configure achievement for `completedTutorial: true`
- Update completedTutorial to true
- Verify achievement unlocked

**Test: `update() should unlock custom condition achievement`**
- Configure custom achievement with condition function
- Update metrics to meet condition
- Verify achievement unlocked

**Test: `update() should not unlock same achievement twice`**
- Unlock achievement
- Update metric again to same value
- Verify achievement:unlocked only emitted once

**Test: `update() should unlock multiple achievements simultaneously`**
- Configure multiple achievements for same metric
- Update metric to meet all conditions
- Verify all achievements unlocked

**Test: `update() should not unlock achievement for unmet condition`**
- Configure achievement for score >= 100
- Update score to 50
- Verify achievement NOT unlocked

**Test: `update() should handle undefined metric gracefully`**
- Configure achievement for specific metric
- Update different metric
- Should not throw error
- Achievement should not unlock

## 2.4 Event-Based Tracking (emit)

**Test: `emit() with direct mapping should update metric`**
- Configure eventMapping: `{ 'scoreChanged': 'score' }`
- Call `emit('scoreChanged', 100)`
- Verify score metric set to 100

**Test: `emit() with custom transformer should transform data`**
- Configure eventMapping with transformer function
- Emit event with data
- Verify transformer called with correct arguments
- Verify metrics updated based on transformer return value

**Test: `emit() with no mapping should not update metrics`**
- Emit unmapped event
- Verify metrics unchanged
- Event still emitted to listeners

**Test: `emit() should unlock achievements after metric update`**
- Configure event mapping
- Configure achievement
- Emit event that should unlock achievement
- Verify achievement unlocked

**Test: `emit() with transformer accessing currentMetrics`**
- Set initial metric values
- Use transformer that increments existing value
- Emit event multiple times
- Verify metrics accumulate correctly

## 2.5 State Access

**Test: `getMetrics() should return readonly copy`**
- Update metrics
- Get metrics
- Try to modify returned object
- Verify original metrics unchanged

**Test: `getMetrics() should return current state`**
- Update metrics multiple times
- Each call to getMetrics() should reflect latest state

**Test: `getUnlocked() should return readonly array`**
- Unlock achievements
- Get unlocked list
- Try to modify returned array
- Verify original list unchanged

**Test: `getUnlocked() should return unlocked achievement IDs`**
- Unlock multiple achievements
- Verify getUnlocked() contains all IDs

**Test: `getAllAchievements() should return all with status`**
- Configure 5 achievements
- Unlock 2 of them
- Call getAllAchievements()
- Verify returns 5 items
- Verify 2 have isUnlocked: true
- Verify 3 have isUnlocked: false

**Test: `getAllAchievements() should include achievement details`**
- Get all achievements
- Verify each has: achievementId, achievementTitle, achievementDescription, achievementIconKey, isUnlocked

## 2.6 Reset Functionality

**Test: `reset() should clear all metrics`**
- Update metrics
- Call reset()
- Verify getMetrics() returns empty object

**Test: `reset() should clear unlocked achievements`**
- Unlock achievements
- Call reset()
- Verify getUnlocked() returns empty array

**Test: `reset() should clear storage`**
- Update and persist data
- Call reset()
- Create new engine with same storage
- Verify new engine has empty state

**Test: `reset() should emit state:changed event`**
- Subscribe to state:changed
- Call reset()
- Verify event emitted with empty state

## 2.7 Import/Export

**Test: `export() should return JSON string`**
- Update metrics and unlock achievements
- Call export()
- Verify returns valid JSON string

**Test: `export() should include config hash`**
- Export data
- Parse JSON
- Verify contains configHash field

**Test: `import() should restore state from valid export`**
- Engine A: update metrics and unlock achievements
- Export from Engine A
- Engine B: import data
- Verify Engine B has same state as Engine A

**Test: `import() should validate config hash`**
- Export from engine with config A
- Try to import into engine with config B
- Verify import fails with validation error

**Test: `import() should support merge strategy`**
- Engine A: set score=100, unlock achievement1
- Export from A
- Engine B: set level=5, unlock achievement2
- Import into B with merge strategy
- Verify B has both score and level, both achievements

**Test: `import() should emit state:changed after import`**
- Subscribe to state:changed
- Import data
- Verify event emitted

**Test: `import() should return success result`**
- Import valid data
- Verify result.success === true

**Test: `import() should return error result for invalid JSON`**
- Import invalid JSON string
- Verify result.success === false
- Verify result.errors contains error message

## 2.8 Error Handling

**Test: `should emit error event on storage failure`**
- Use mock storage that throws error
- Subscribe to 'error' event
- Update metrics
- Verify error event emitted

**Test: `should call onError callback on error`**
- Create engine with onError callback
- Trigger storage error
- Verify callback called with error

**Test: `should handle error in achievement condition gracefully`**
- Configure achievement with condition that throws
- Update metrics
- Should not crash
- Verify error event emitted

## 2.9 Destroy/Cleanup

**Test: `destroy() should remove all event listeners`**
- Subscribe to multiple events
- Call destroy()
- Emit events
- Verify no handlers called

**Test: `destroy() should not affect storage`**
- Update metrics
- Call destroy()
- Create new engine with same storage
- Verify data still persisted

## 2.10 Multiple Instances

**Test: `should support multiple independent instances`**
- Create Engine A and Engine B
- Update metrics in A
- Verify B metrics unchanged

**Test: `instances with different storage should be independent`**
- Engine A with memory storage
- Engine B with different memory storage
- Update A
- Verify B unchanged

**Test: `instances with same storage should share state`**
- Create shared LocalStorage instance
- Engine A and Engine B use same storage
- Update metrics in A
- Create new Engine C with same storage
- Verify C has A's state

---

# 3. Storage Tests

## 3.1 MemoryStorage Tests (`__tests__/storage/MemoryStorage.test.ts`)

**Test: `should store and retrieve metrics`**
**Test: `should store and retrieve unlocked achievements`**
**Test: `should clear all data`**
**Test: `should be independent per instance`**
**Test: `should handle empty state`**

## 3.2 LocalStorage Tests (`__tests__/storage/LocalStorage.test.ts`)

**Test: `should persist to localStorage`**
**Test: `should handle Date serialization`**
**Test: `should use correct storage key`**
**Test: `should handle quota exceeded error`**
**Test: `should clear localStorage on clear()`**
**Test: `should handle corrupted data gracefully`**

## 3.3 IndexedDBStorage Tests (`__tests__/storage/IndexedDBStorage.test.ts`)

**Test: `should store and retrieve async`**
**Test: `should handle large datasets`**
**Test: `should create database on first use`**
**Test: `should handle concurrent operations`**
**Test: `should clear database`**

## 3.4 RestApiStorage Tests (`__tests__/storage/RestApiStorage.test.ts`)

**Test: `should make GET request for metrics`**
**Test: `should make POST request to update metrics`**
**Test: `should include userId in API calls`**
**Test: `should handle network timeout`**
**Test: `should include custom headers`**
**Test: `should handle 401/403 errors`**
**Test: `should handle 500 errors`**
**Test: `should retry on network failure`**

## 3.5 AsyncStorageAdapter Tests (`__tests__/storage/AsyncStorageAdapter.test.ts`)

**Test: `should wrap async storage with sync interface`**
**Test: `should use optimistic caching`**
**Test: `should return cached values immediately`**
**Test: `should persist in background`**
**Test: `should handle async errors with callback`**
**Test: `should not block on read operations`**

## 3.6 OfflineQueueStorage Tests (`__tests__/storage/OfflineQueueStorage.test.ts`)

**Test: `should queue operations when offline`**
**Test: `should flush queue when online`**
**Test: `should handle partial flush failures`**
**Test: `should maintain operation order`**
**Test: `should deduplicate operations`**

---

# 4. Utils Tests

## 4.1 configNormalizer Tests (`__tests__/utils/configNormalizer.test.ts`)

**Test: `isSimpleConfig() should detect simple format`**
**Test: `isSimpleConfig() should detect complex format`**
**Test: `normalizeAchievements() should convert simple to complex`**
**Test: `normalizeAchievements() should handle numeric thresholds`**
**Test: `normalizeAchievements() should handle boolean thresholds`**
**Test: `normalizeAchievements() should handle string thresholds`**
**Test: `normalizeAchievements() should handle custom conditions`**
**Test: `normalizeAchievements() should pass through complex config`**
**Test: `normalizeAchievements() should generate unique IDs`**
**Test: `normalizeAchievements() should set default descriptions`**

## 4.2 dataExport Tests (`__tests__/utils/dataExport.test.ts`)

**Test: `exportAchievementData() should create valid JSON`**
**Test: `exportAchievementData() should include version`**
**Test: `exportAchievementData() should include timestamp`**
**Test: `exportAchievementData() should include config hash`**
**Test: `exportAchievementData() should handle empty state`**
**Test: `createConfigHash() should be deterministic`**
**Test: `createConfigHash() should differ for different configs`**

## 4.3 dataImport Tests (`__tests__/utils/dataImport.test.ts`)

**Test: `importAchievementData() should parse valid export`**
**Test: `importAchievementData() should validate JSON format`**
**Test: `importAchievementData() should validate config hash`**
**Test: `importAchievementData() should support replace strategy`**
**Test: `importAchievementData() should support merge strategy`**
**Test: `importAchievementData() should handle version mismatches`**
**Test: `importAchievementData() should return errors for invalid data`**

---

# 5. Error Tests (`__tests__/errors/AchievementErrors.test.ts`)

**Test: `AchievementError should extend Error`**
**Test: `AchievementError should include code and remedy`**
**Test: `StorageQuotaError should calculate bytes needed`**
**Test: `ImportValidationError should list validation errors`**
**Test: `SyncError should include status code and timeout`**
**Test: `isAchievementError() type guard should work`**
**Test: `isRecoverableError() should check recoverable flag`**

---

# 6. Integration Tests

## 6.1 End-to-End Achievement Flow

**Test: `complete user journey from zero to unlocked achievement`**
- Create engine
- Update metrics progressively
- Verify achievements unlock at correct thresholds
- Export state
- Import into new engine
- Verify state preserved

## 6.2 Event-Based Flow

**Test: `event-based tracking with multiple event types`**
- Configure complex event mapping
- Emit various events
- Verify metrics updated correctly
- Verify achievements unlock

## 6.3 Storage Persistence

**Test: `state persists across engine instances`**
- Engine A: unlock achievements
- Destroy Engine A
- Engine B (same storage): verify state loaded
- Continue unlocking in B
- Engine C: verify all state present

## 6.4 Error Recovery

**Test: `engine recovers from storage errors`**
- Simulate storage failure
- Verify error event emitted
- Fix storage
- Verify engine continues working

---

# 7. Performance Tests

**Test: `should handle 1000 metric updates efficiently`**
- Time 1000 sequential updates
- Verify completes in reasonable time (<100ms)

**Test: `should handle 100 achievements efficiently`**
- Configure 100 achievements
- Update metrics to unlock many
- Verify evaluation performance acceptable

**Test: `should not memory leak with many subscriptions`**
- Subscribe and unsubscribe 10,000 times
- Check memory usage

---

# 8. Edge Cases and Regression Tests

**Test: `should handle metric value changing from number to string`**
**Test: `should handle achievement condition always returning false`**
**Test: `should handle rapid successive updates`**
**Test: `should handle emit() during achievement:unlocked handler`**
**Test: `should handle reset() during update()`**
**Test: `should handle destroy() during async storage operation`**
**Test: `should handle null/undefined metric values`**
**Test: `should handle empty achievement config`**
**Test: `should handle circular references in event data`**

---

# Test Coverage Goals

- **Line Coverage**: 95%+
- **Branch Coverage**: 90%+
- **Function Coverage**: 100%

## Critical Paths to Cover

1. All achievement unlock scenarios (threshold, boolean, custom)
2. All event mapping scenarios (direct, transformer, none)
3. All storage implementations (sync and async)
4. All error scenarios with proper error handling
5. State persistence and recovery
6. Import/export round-trips
7. Multiple concurrent engine instances

---

# Mock/Stub Requirements

## Storage Mocks
- Mock localStorage for LocalStorage tests
- Mock indexedDB for IndexedDB tests (use fake-indexeddb package)
- Mock fetch for RestApiStorage tests

## Timer Mocks
- Use Jest fake timers for timeout tests
- Use fake timers for timestamp verification

## Console Mocks
- Mock console.error to verify error logging
- Suppress expected error logs in tests

---

# Test Utilities to Create

## `createTestEngine(config?)`
Helper to create engine with test-friendly defaults

## `waitForAsync()`
Helper to wait for async storage operations

## `createMockStorage()`
Factory for creating mock storage implementations

## `unlockAchievement(engine, achievementId)`
Helper to directly unlock achievement for testing

## `expectAchievementUnlocked(engine, achievementId)`
Custom matcher for verifying achievement state

---

# Running Tests

```bash
npm test                    # Run all tests
npm test -- --watch        # Watch mode
npm test -- --coverage     # With coverage report
npm test EventEmitter      # Run specific test file
```

---

# Notes for Implementation

1. **Use descriptive test names** - Test names should clearly state what is being tested
2. **One assertion per test when possible** - Makes failures easier to diagnose
3. **Use beforeEach/afterEach** - Clean up state between tests
4. **Test error messages** - Verify error messages are helpful
5. **Test TypeScript types** - Where possible, verify type safety
6. **Mock external dependencies** - Don't make real network calls or touch real storage
7. **Test both success and failure paths** - Every feature should have negative tests
8. **Document complex test setups** - Add comments explaining non-obvious test logic

---

**This specification should result in approximately 150-200 test cases covering all aspects of the achievements-engine.**