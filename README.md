# achievements-engine

A server-first achievement engine with framework-agnostic rule evaluation, persistence hooks, and REST-contract helpers for React or any other client.

## Features

- 🎯 **Event-Based**: Track achievements using custom events or direct metric updates
- 🖥️ **Server First**: Evaluate achievements on your app server and persist to your database
- 🔄 **Framework Agnostic**: Works behind React, Vue, Angular, Rails, mobile apps, or any REST client
- 💾 **Repository-Based**: Bring your own database adapter or start with `MemoryAchievementRepository`
- 📦 **Zero Dependencies**: Lightweight core with no external dependencies
- 🎨 **TypeScript**: Full TypeScript support with comprehensive type definitions
- 🔌 **Extensible**: Easy to add custom repositories, route handlers, and achievement conditions

## Installation

```bash
npm install achievements-engine
```

## Server Quick Start

```typescript
import {
  AchievementService,
  MemoryAchievementRepository,
  createAchievementFetchHandler,
} from 'achievements-engine/server';

const achievements = {
  score: {
    100: { title: 'Century!', description: 'Score 100 points', icon: 'trophy' },
  },
  completedLesson: {
    true: { title: 'First Lesson', description: 'Complete a lesson', icon: 'book' },
  },
};

const service = new AchievementService({
  achievements,
  repository: new MemoryAchievementRepository(),
  eventMapping: {
    'lesson.completed': () => ({ completedLesson: true }),
  },
});

export const handleAchievementsRequest = createAchievementFetchHandler({
  service,
  basePath: '/api/achievements',
  getSubjectId: (request) => getUserIdFromSession(request),
});
```

The fetch handler implements the shared REST contract used by `react-achievements`:

```http
GET  /api/achievements
POST /api/achievements/track
POST /api/achievements/increment
POST /api/achievements/event
POST /api/achievements/reset
```

You can also call the service directly from Express, Fastify, Next.js route handlers, background jobs, or tests:

```typescript
await service.track(user.id, { metric: 'score', value: 100 });
await service.increment(user.id, { metric: 'score', amount: 10 });
await service.event(user.id, { name: 'lesson.completed', payload: { lessonId: 'intro' } });
const snapshot = await service.getSnapshot(user.id);
```

Numeric Simple API thresholds include progress automatically:

```ts
const century = snapshot.achievements.find(({ id }) => id === 'score_100');
// century.progress => { current: 40, target: 100, percent: 40 }
```

## Repository Interface

Production apps should persist achievement state in their own database:

```typescript
import type { AchievementRepository, StoredAchievementState } from 'achievements-engine/server';

class PrismaAchievementRepository implements AchievementRepository {
  async getState(subjectId: string): Promise<StoredAchievementState | undefined> {
    // Load metrics, unlocked IDs, and unlocked timestamps from your database.
  }

  async saveState(subjectId: string, state: StoredAchievementState): Promise<void> {
    // Persist the updated state in the same database your app already uses.
  }

  async withTransaction(subjectId: string, run: () => Promise<unknown>) {
    // Run mutations for one subject inside a database transaction or lock.
    return run();
  }
}
```

Authentication stays in your app. Pass the authenticated user/account/team ID to `AchievementService` as the `subjectId`.
Production repositories should implement `withTransaction` so concurrent increments cannot overwrite one another. The built-in memory repository serializes mutations per subject.

## Legacy In-Process Engine

The original in-process `AchievementEngine` remains available for browser-only or embedded JavaScript use cases:

```typescript
import { AchievementEngine } from 'achievements-engine';

// Define your achievements
const achievements = {
  score: {
    100: { title: 'Century!', description: 'Score 100 points', icon: '🏆' },
    500: { title: 'High Scorer!', description: 'Score 500 points', icon: '⭐' },
  },
  level: {
    5: { title: 'Level 5', description: 'Reach level 5', icon: '🎮' },
  }
};

// Create the engine
const engine = new AchievementEngine({
  achievements,
  storage: 'local' // Use browser localStorage
});

// Listen for achievement unlocks
engine.on('achievement:unlocked', (achievement) => {
  console.log(`Achievement unlocked: ${achievement.achievementTitle}!`);
});

// Update metrics
engine.update({ score: 100 }); // Unlocks "Century!"
engine.update({ score: 500 }); // Unlocks "High Scorer!"
```

## Event-Based Tracking

The engine supports event-based tracking with automatic metric mapping:

```typescript
const engine = new AchievementEngine({
  achievements,
  // Map events to metrics
  eventMapping: {
    'levelUp': 'level',           // Direct mapping
    'scoreChanged': 'score',      // Event name -> metric name

    // Custom transformer function
    'playerAction': (data, currentMetrics) => ({
      score: currentMetrics.score + data.points,
      combo: data.isCombo ? currentMetrics.combo + 1 : 0
    })
  }
});

// Use events instead of direct updates
engine.emit('levelUp', 5);
engine.emit('scoreChanged', 250);
engine.emit('playerAction', { points: 100, isCombo: true });
```

## Achievement Configuration

### Simple API (Threshold-Based)

```typescript
const achievements = {
  // Numeric thresholds
  score: {
    100: { title: 'Beginner', icon: '🌱' },
    1000: { title: 'Expert', icon: '🏆' },
  },

  // Boolean achievements
  completedTutorial: {
    true: { title: 'Tutorial Complete', icon: '📚' }
  },

  // Custom conditions
  combo: {
    custom: {
      title: 'Perfect Combo',
      description: 'Score 1000+ with 100% accuracy',
      icon: '💎',
      condition: (metrics) => metrics.score >= 1000 && metrics.accuracy === 100
    }
  }
};
```

### Complex API (Advanced)

For more control, use the complex format:

```typescript
const achievements = {
  score: [{
    isConditionMet: (value) => value >= 100,
    achievementDetails: {
      achievementId: 'score_100',
      achievementTitle: 'Century!',
      achievementDescription: 'Score 100 points',
      achievementIconKey: 'trophy'
    }
  }]
};
```

## Storage Options

### Memory Storage (Default)
```typescript
const engine = new AchievementEngine({
  achievements,
  storage: 'memory' // Data lost on page reload
});
```

### Browser LocalStorage
```typescript
const engine = new AchievementEngine({
  achievements,
  storage: 'local' // Persists in browser
});
```

### IndexedDB (Async)
```typescript
const engine = new AchievementEngine({
  achievements,
  storage: 'indexeddb' // For large datasets
});
```

### Legacy REST API Storage

> `RestApiStorage` uses the older split-state `/users/:id/achievements/metrics` and `/unlocked` protocol. It is not the shared REST contract used by `AchievementService`, `createAchievementFetchHandler`, and `react-achievements`. New applications should use the server quick start above.
```typescript
const engine = new AchievementEngine({
  achievements,
  storage: 'restapi',
  restApiConfig: {
    baseUrl: 'https://api.example.com',
    userId: 'user123',
    headers: {
      'Authorization': 'Bearer token'
    }
  }
});
```

### Custom Storage
```typescript
import { AchievementStorage } from 'achievements-engine';

class CustomStorage implements AchievementStorage {
  getMetrics() { /* ... */ }
  setMetrics(metrics) { /* ... */ }
  getUnlockedAchievements() { /* ... */ }
  setUnlockedAchievements(achievements) { /* ... */ }
  clear() { /* ... */ }
}

const engine = new AchievementEngine({
  achievements,
  storage: new CustomStorage()
});
```

## Events

Listen to engine events for real-time updates:

```typescript
// Achievement unlocked
engine.on('achievement:unlocked', (event) => {
  console.log(event.achievementTitle);
  console.log(event.achievementDescription);
  console.log(event.achievementIconKey);
  console.log(event.timestamp);
});

// Metric updated
engine.on('metric:updated', (event) => {
  console.log(`${event.metric}: ${event.oldValue} → ${event.newValue}`);
});

// State changed
engine.on('state:changed', (event) => {
  console.log('Metrics:', event.metrics);
  console.log('Unlocked:', event.unlocked);
});

// Errors
engine.on('error', (event) => {
  console.error(event.error);
  console.error('Context:', event.context);
});

// Unsubscribe
const unsubscribe = engine.on('achievement:unlocked', handler);
unsubscribe(); // Remove listener
```

## State Access

```typescript
// Get current metrics (readonly)
const metrics = engine.getMetrics();
console.log(metrics.score); // 100

// Get unlocked achievement IDs (readonly)
const unlocked = engine.getUnlocked();
console.log(unlocked); // ['score_100', 'level_5']

// Get all achievements with status
const allAchievements = engine.getAllAchievements();
allAchievements.forEach(achievement => {
  console.log(achievement.achievementTitle);
  console.log(achievement.isUnlocked); // true or false
});

// Get one derived state snapshot
const snapshot = engine.getSnapshot();
console.log(snapshot.unlockedIds);
console.log(snapshot.unlockedCount, snapshot.totalCount);

// Increment numeric metrics
const result = engine.increment('score', 50);
console.log(result.newlyUnlocked);
```

For async storage backends such as IndexedDB, REST API, or custom async storage,
wait for hydration before rendering persisted state:

```typescript
const snapshot = await engine.ready();
console.log(snapshot.metrics);
```

## Import/Export

```typescript
// Export achievement data
const data = engine.export(); // Returns JSON string
localStorage.setItem('savedProgress', data);

// Import achievement data
const savedData = localStorage.getItem('savedProgress');
const result = engine.import(savedData, {
  merge: true, // Merge with existing data
  validate: true // Validate config matches
});

if (result.success) {
  console.log('Data imported successfully');
} else {
  console.error('Import errors:', result.errors);
}
```

## Reset

```typescript
// Clear all achievement data
engine.reset();
```

## Cleanup

```typescript
// Remove all event listeners
engine.destroy();
```

## Multiple Instances

You can create multiple independent engines:

```typescript
const playerEngine = new AchievementEngine({
  achievements: playerAchievements,
  storage: 'local'
});

const teamEngine = new AchievementEngine({
  achievements: teamAchievements,
  storage: 'local'
});
```

## TypeScript Support

Full TypeScript support with type inference:

```typescript
import {
  AchievementEngine,
  EngineConfig,
  AchievementUnlockedEvent,
  SimpleAchievementConfig
} from 'achievements-engine';

const config: EngineConfig = {
  achievements: {
    score: {
      100: { title: 'First Score', icon: '🎯' }
    }
  }
};

const engine = new AchievementEngine(config);

engine.on('achievement:unlocked', (event: AchievementUnlockedEvent) => {
  console.log(event.achievementTitle);
});
```

## Error Handling

```typescript
const engine = new AchievementEngine({
  achievements,
  onError: (error) => {
    // Handle async storage errors, etc.
    console.error('Achievement engine error:', error);
  }
});

// Or listen to error events
engine.on('error', (event) => {
  console.error(event.error);
});
```

## Use Cases

- **Games**: Track player progress and unlock achievements
- **Learning Platforms**: Reward course completion and milestones
- **Fitness Apps**: Track workout streaks and personal records
- **Productivity Apps**: Encourage task completion and habits
- **Social Apps**: Gamify user engagement

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Node.js 14+
- Works in Web Workers

## License

MIT

## Contributing

Contributions welcome! Please open an issue or PR.

## Links

- [npm package](https://www.npmjs.com/package/achievements-engine) (to be published)
- [GitHub repository](https://github.com/dave-b-b/achievements-engine) (to be created)
- [Test Specification](./TEST_SPECIFICATION.md)

---

Built with ❤️ for the gamification community
