---
sidebar_position: 5
---

# Event-Based Tracking

`achievements-engine` is built on an event-driven architecture. This guide explains how to leverage the event system for tracking achievements and reacting to state changes.

There are two main ways to use events:
1.  **Listening to built-in events**: React to events that the engine emits, such as `achievement:unlocked`.
2.  **Using `eventMapping`**: Emit your own custom events to update metrics, decoupling your application logic from the achievement system.

## Listening to Built-in Events

The engine emits four core events:

- **`achievement:unlocked`**: Fired when an achievement is unlocked.
- **`metric:updated`**: Fired when a metric value changes.
- **`state:changed`**: Fired after any state change (metrics or achievements).
- **`error`**: Fired when an error occurs.

### Subscribing to Events

You can use `engine.on()` to subscribe to these events.

```typescript
import { AchievementEngine } from 'achievements-engine';

const engine = new AchievementEngine({
  achievements,
  storage: 'localStorage'
});

// Listen for achievement unlocks
engine.on('achievement:unlocked', (event) => {
  console.log(`🎉 ${event.achievementTitle}`);
  // e.g., show a notification
});

// Listen for metric updates
engine.on('metric:updated', (event) => {
  console.log(`${event.metric}: ${event.oldValue} → ${event.newValue}`);
});
```

### Unsubscribing from Events

It's important to unsubscribe from events to prevent memory leaks. The `on` method returns an `unsubscribe` function.

```typescript
const unsubscribe = engine.on('achievement:unlocked', (event) => {
  console.log('Achievement unlocked!');
});

// Later, to stop listening:
unsubscribe();
```

### One-Time Listeners

Use `engine.once()` to listen for an event just once.

```typescript
engine.once('achievement:unlocked', (event) => {
  console.log('First achievement unlocked!', event.achievementTitle);
});
```

### Event Types

Each event has a specific payload with detailed information. For example, the `AchievementUnlockedEvent`:

```typescript
interface AchievementUnlockedEvent {
  achievementId: string;
  achievementTitle: string;
  achievementDescription: string;
  achievementIconKey?: string;
  timestamp: number;
}
```

## Using `eventMapping` for Metric Updates

The `eventMapping` feature allows you to automatically update metrics by emitting your own custom events. This is a powerful way to decouple your application logic from the achievement system.

### Direct String Mapping

Map an event name directly to a metric name.

**Configuration:**
```typescript
const engine = new AchievementEngine({
  achievements,
  storage: 'localStorage',
  eventMapping: {
    'enemy:defeated': 'enemiesDefeated',
    'item:collected': 'itemsCollected'
  }
});
```

**Emitting Events:**
Instead of `engine.update()`, you use `engine.emit()`.

```typescript
// This will update the 'enemiesDefeated' metric
engine.emit('enemy:defeated', 10); // The new value is 10

// This will update the 'itemsCollected' metric
let items = 0;
items++;
engine.emit('item:collected', items);
```

### MetricUpdater Function

For more complex logic, use a function to transform event data into metric updates.

**Configuration:**
```typescript
import type { MetricUpdater } from 'achievements-engine';

const levelUpUpdater: MetricUpdater = (eventData, currentMetrics) => {
  const currentLevel = currentMetrics.level || 0;
  return {
    level: currentLevel + 1,
    experience: 0 // Reset experience on level up
  };
};

const engine = new AchievementEngine({
  achievements,
  storage: 'localStorage',
  eventMapping: {
    'player:levelup': levelUpUpdater,
    'player:gain_exp': (eventData, currentMetrics) => {
      const currentExp = currentMetrics.experience || 0;
      return { experience: currentExp + eventData.amount };
    }
  }
});
```

**Emitting Events:**
```typescript
engine.emit('player:levelup');
engine.emit('player:gain_exp', { amount: 50 });
```

---

## Complete Example

Here's a full example that uses both listening to events and `eventMapping`.

```typescript
// achievements.ts
export const gameAchievements = {
  enemiesDefeated: {
    10: { title: 'Novice Slayer', description: 'Defeat 10 enemies' },
  },
  level: {
    5: { title: 'Level 5', description: 'Reach level 5' },
  }
};

// engine.ts
import { AchievementEngine } from 'achievements-engine';
import { gameAchievements } from './achievements';

const engine = new AchievementEngine({
  achievements: gameAchievements,
  storage: 'localStorage',
  eventMapping: {
    'enemy:defeated': 'enemiesDefeated',
    'player:levelup': (eventData, currentMetrics) => {
      const currentLevel = currentMetrics.level || 0;
      return { level: currentLevel + 1 };
    }
  }
});

// Listen for unlocks
engine.on('achievement:unlocked', (event) => {
  console.log(`🎉 Achievement Unlocked: ${event.achievementTitle}`);
});

export default engine;

// game.ts
import engine from './engine';

class Game {
  private enemiesDefeated = 0;

  defeatEnemy() {
    this.enemiesDefeated++;
    engine.emit('enemy:defeated', this.enemiesDefeated);
  }

  levelUp() {
    engine.emit('player:levelup');
  }
}

// Usage
const game = new Game();
game.defeatEnemy(); // emits 'enemy:defeated', which updates the metric
game.levelUp(); // emits 'player:levelup', which updates the metric
```
