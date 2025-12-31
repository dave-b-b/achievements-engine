---
sidebar_position: 2
---

# Getting Started

Learn how to install and use achievements-engine in your project.

## Installation

Install achievements-engine via npm or yarn:

```bash
npm install achievements-engine
```

or

```bash
yarn add achievements-engine
```

## Basic Usage

### 1. Import the Engine

```typescript
import { AchievementEngine } from 'achievements-engine';
```

### 2. Define Your Achievements

You can define achievements using either the Simple API or the Builder API:

**Simple API:**
```typescript
const achievements = {
  score: {
    100: {
      title: 'Score 100!',
      description: 'Score 100 points',
      icon: '🏆'
    },
    500: {
      title: 'Score 500!',
      description: 'Score 500 points',
      icon: '⭐'
    }
  }
};
```

**Builder API (Recommended):**
```typescript
import { AchievementBuilder } from 'achievements-engine';

const achievements = AchievementBuilder.combine([
  AchievementBuilder.createScoreAchievements([100, 500, 1000]),
  AchievementBuilder.createLevelAchievements([5, 10, 20]),
  AchievementBuilder.createBooleanAchievement('completedTutorial')
]);
```

### 3. Initialize the Engine

```typescript
const engine = new AchievementEngine({
  achievements,
  storage: 'localStorage' // or 'memory', 'indexedDB', etc.
});
```

### 4. Subscribe to Events

```typescript
engine.on('achievement:unlocked', (event) => {
  console.log(`🎉 Unlocked: ${event.achievementTitle}`);
  console.log(`Description: ${event.achievementDescription}`);
});

engine.on('metric:updated', (event) => {
  console.log(`Metric updated: ${event.metric} = ${event.newValue}`);
});
```

### 5. Update Metrics

```typescript
// Update a single metric
engine.update({ score: 100 });

// Update multiple metrics
engine.update({
  score: 500,
  level: 10,
  completedTutorial: true
});
```

### 6. Get Achievement Status

```typescript
// Get all achievements with unlock status
const allAchievements = engine.getAllAchievements();

// Get only unlocked achievements
const unlocked = engine.getUnlocked();

// Get current metrics
const metrics = engine.getMetrics();
```

## Complete Example

Here's a complete example combining everything:

```typescript
import { AchievementEngine, AchievementBuilder } from 'achievements-engine';

// Define achievements using the builder
const achievements = AchievementBuilder.combine([
  AchievementBuilder.createScoreAchievements([
    100,
    [500, { title: 'High Scorer!', description: 'Excellent!', icon: '⭐' }],
    1000
  ]),
  AchievementBuilder.createLevelAchievement(5)
    .withAward({ title: 'Leveling Up!', icon: '📈' }),
  AchievementBuilder.createBooleanAchievement('completedTutorial')
]);

// Initialize engine
const engine = new AchievementEngine({
  achievements,
  storage: 'localStorage'
});

// Subscribe to events
engine.on('achievement:unlocked', (event) => {
  console.log(`🎉 ${event.achievementTitle}`);
});

// Simulate user actions
engine.update({ score: 50 });   // No achievement unlocked yet
engine.update({ score: 100 });  // Unlocks "Score 100!"
engine.update({ level: 5 });    // Unlocks "Leveling Up!"
engine.update({ completedTutorial: true }); // Unlocks tutorial achievement

// Check status
console.log('Unlocked achievements:', engine.getUnlocked());
console.log('Current metrics:', engine.getMetrics());
```

## Storage Options

achievements-engine supports multiple storage backends:

- **`'memory'`**: In-memory storage (data lost on page refresh)
- **`'localStorage'`**: Browser localStorage (persistent)
- **`'indexedDB'`**: IndexedDB for larger data sets
- **`'restApi'`**: Sync with a backend server
- **Custom storage**: Implement your own storage adapter

Example with localStorage:

```typescript
const engine = new AchievementEngine({
  achievements,
  storage: 'localStorage'
});
```

Example with REST API:

```typescript
const engine = new AchievementEngine({
  achievements,
  storage: 'restApi',
  restApiConfig: {
    endpoint: 'https://api.example.com/achievements',
    headers: {
      'Authorization': 'Bearer YOUR_TOKEN'
    }
  }
});
```

## Next Steps

- [Builder API Guide](/docs/guides/builder-api) - Master the achievement builder
- Event System (coming soon) - Learn about all available events
- Storage Options (coming soon) - Deep dive into storage configuration
- TypeScript (coming soon) - Type-safe achievement development
- Framework Integrations (coming soon) - Use with React, Vue, Angular, etc.

