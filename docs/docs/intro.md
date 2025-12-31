---
sidebar_position: 1
---

# Introduction

Welcome to **achievements-engine** - a framework-agnostic achievement system with event-based architecture.

## What is achievements-engine?

achievements-engine is a lightweight, flexible core engine for building gamification features in any JavaScript/TypeScript application. Whether you're building with React, Vue, Angular, Svelte, or vanilla JavaScript, achievements-engine provides the foundation for tracking user progress and unlocking achievements.

## Key Features

- **Framework-Agnostic**: Works with any JavaScript framework or vanilla JS
- **Event-Based Architecture**: Subscribe to achievement unlocks and metric updates
- **Multiple Storage Options**: Memory, LocalStorage, IndexedDB, REST API, or custom
- **Simple & Complex APIs**: Choose the API that fits your needs
- **TypeScript Support**: Full type safety with comprehensive TypeScript definitions
- **Builder API**: Create achievements with an intuitive, chainable builder pattern
- **Data Import/Export**: Migrate user data between devices or versions
- **Offline Support**: Queue operations when offline and sync when back online

## Quick Example

```typescript
import { AchievementEngine, AchievementBuilder } from 'achievements-engine';

// Create achievements with the builder API
const achievements = AchievementBuilder.createScoreAchievements([
  100,  // Default award
  [500, { title: 'High Scorer!', icon: '⭐' }],  // Custom award
  1000
]);

// Initialize the engine
const engine = new AchievementEngine({
  achievements,
  storage: 'memory'
});

// Listen for achievements
engine.on('achievement:unlocked', (event) => {
  console.log(`Unlocked: ${event.achievementTitle}`);
});

// Update metrics
engine.update({ score: 100 }); // Unlocks "Score 100!" achievement
```

## What You'll Need

- [Node.js](https://nodejs.org/en/download/) version 16.0 or above
- npm or yarn package manager
- Basic knowledge of JavaScript/TypeScript

## Next Steps

- [Getting Started](/docs/getting-started) - Installation and basic usage
- [Builder API](/docs/guides/builder-api) - Learn the achievement builder
- Storage Options (coming soon) - Configure data persistence
- Framework Integrations (coming soon) - Use with React, Vue, etc.

## Related Projects

- [react-achievements](https://github.com/dave-b-b/react-achievements) - React hooks and components built on achievements-engine
- More framework integrations coming soon!

