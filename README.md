# achievements-engine

A framework-agnostic achievement system with event-based architecture. Perfect for adding gamification features to any JavaScript application.

## Features

- 🎯 **Event-Based**: Track achievements using custom events or direct metric updates
- 🔄 **Framework Agnostic**: Works with React, Vue, Angular, Node.js, or vanilla JavaScript
- 💾 **Flexible Storage**: Built-in support for Memory, LocalStorage, IndexedDB, and REST API
- 📦 **Zero Dependencies**: Lightweight core with no external dependencies
- 🎨 **TypeScript**: Full TypeScript support with comprehensive type definitions
- 🔌 **Extensible**: Easy to add custom storage backends and achievement conditions

## Installation

```bash
npm install achievements-engine
```

## Quick Start

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

### REST API
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
