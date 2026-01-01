# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.2] - 2025-12-30
- Add tests for achievement builder
- fix documentation for achievement builder

## [1.1.1] 2025-12-30
- Add docs to npm package

## [1.1.0] - 2025-12-29

### Added
- **AchievementBuilder**: Three-tier builder API for creating achievement configurations
  - Tier 1: Simple static methods with smart defaults (`createScoreAchievement`, `createLevelAchievement`, `createBooleanAchievement`, `createValueAchievement`)
  - Tier 2: Chainable customization via `.withAward()` method
  - Tier 3: Full builder pattern for complex custom logic via `AchievementBuilder.create()`
- **AwardDetails** interface for cleaner achievement award definitions
- `combine()` utility method for merging multiple achievement configurations
- Comprehensive test suite for all builder functionality (14 tests)

## [1.0.0] - 2025-12-21

### Added
- Initial release of achievements-engine
- Core AchievementEngine class with event-based architecture
- Multiple storage implementations (Memory, LocalStorage, IndexedDB, RestAPI, OfflineQueue)
- Simple and Complex API for achievement configuration
- Data import/export functionality
- Comprehensive error handling system
- Framework-agnostic design for use with any JavaScript framework
