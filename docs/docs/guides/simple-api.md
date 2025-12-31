---
sidebar_position: 4
---

# Simple API Guide

The Simple API is the recommended way to configure achievements in achievements-engine. It uses an intuitive object structure that reduces configuration complexity.

## Overview

The Simple API uses an object structure where you define metrics, thresholds, and awards:

```typescript
const achievements = {
  metricName: {
    threshold: { title, description, icon },
    // ... more thresholds
  }
};
```

This configuration works seamlessly with the AchievementEngine:

```typescript
import { AchievementEngine } from 'achievements-engine';

const engine = new AchievementEngine({
  achievements,
  storage: 'localStorage'
});

engine.update({ metricName: value });
```

---

## Basic Patterns

### Score-Based Achievements

Track numeric values that increase over time:

```typescript
const achievements = {
  score: {
    100: { title: 'Century!', description: 'Score 100 points', icon: '🏆' },
    500: { title: 'High Scorer!', description: 'Score 500 points', icon: '⭐' },
    1000: { title: 'Legend!', description: 'Score 1000 points', icon: '💎' },
  },
};

// Usage
const engine = new AchievementEngine({ achievements, storage: 'localStorage' });
engine.update({ score: 150 }); // Unlocks "Century!" achievement
```

### Boolean Achievements

Track completion or state changes:

```typescript
const achievements = {
  completedTutorial: {
    true: { title: 'Tutorial Master', description: 'Complete the tutorial', icon: '📚' }
  },
  firstWin: {
    true: { title: 'First Victory!', description: 'Win your first game', icon: '🎯' }
  },
};

// Usage
engine.update({ completedTutorial: true }); // Unlocks achievement
```

### String-Based Achievements

Track specific values or states:

```typescript
const achievements = {
  difficulty: {
    easy: { title: 'Easy Mode', description: 'Complete on easy', icon: '😌' },
    medium: { title: 'Medium Mode', description: 'Complete on medium', icon: '🤔' },
    hard: { title: 'Hard Mode', description: 'Complete on hard', icon: '💪' },
  },
};

// Usage
engine.update({ difficulty: 'hard' }); // Unlocks "Hard Mode"
```

### Custom Condition Achievements

For complex logic involving multiple metrics:

```typescript
const achievements = {
  perfectGame: {
    custom: {
      title: 'Perfect Game',
      description: 'Score 1000+ with 100% accuracy',
      icon: '🎯',
      condition: (metrics) => metrics.score >= 1000 && metrics.accuracy === 100
    }
  },
  speedRunner: {
    custom: {
      title: 'Speed Runner',
      description: 'Complete in under 5 minutes',
      icon: '⚡',
      condition: (metrics) => metrics.timeElapsed < 300 && metrics.completed === true
    }
  },
};

// Usage - track all relevant metrics
engine.update({ score: 1200 });
engine.update({ accuracy: 100 });
// Both metrics checked, unlocks if condition met
```

---

## Updating Metrics

Use the `update()` method to track metrics:

```typescript
import { AchievementEngine } from 'achievements-engine';

const engine = new AchievementEngine({
  achievements,
  storage: 'localStorage'
});

// Update single metric
engine.update({ score: 100 });

// Update multiple metrics at once
engine.update({
  score: 1200,
  accuracy: 100,
  timeElapsed: 45,
  completed: true
});
```

### Incrementing Values

For metrics that increment over time:

```typescript
// Track current value
let clicks = 0;

function handleClick() {
  clicks++;
  engine.update({ clicks });
}

// Or get current value from engine metrics
function incrementScore(points: number) {
  const currentMetrics = engine.getMetrics<GameMetrics>();
  const currentScore = currentMetrics.score || 0;
  engine.update({ score: currentScore + points });
}
```

---

## Complete Example

Here's a full working example combining multiple achievement types:

```typescript
// achievements.ts
export const gameAchievements = {
  // Score milestones
  score: {
    100: { title: 'Beginner', description: 'Score 100 points', icon: '🥉' },
    500: { title: 'Intermediate', description: 'Score 500 points', icon: '🥈' },
    1000: { title: 'Expert', description: 'Score 1000 points', icon: '🥇' },
  },

  // Completion tracking
  completedTutorial: {
    true: { title: 'Tutorial Complete', description: 'Finished the tutorial', icon: '📚' }
  },

  // Difficulty levels
  difficulty: {
    hard: { title: 'Hardened Warrior', description: 'Beat hard mode', icon: '💪' }
  },

  // Click counter
  clicks: {
    10: { title: 'Clicker', description: 'Click 10 times', icon: '👆' },
    100: { title: 'Super Clicker', description: 'Click 100 times', icon: '👆👆' },
  },

  // Complex achievements
  perfectRun: {
    custom: {
      title: 'Perfectionist',
      description: 'Score 1000+ with 100% accuracy',
      icon: '💎',
      condition: (metrics) => metrics.score >= 1000 && metrics.accuracy === 100
    }
  },

  speedDemon: {
    custom: {
      title: 'Speed Demon',
      description: 'Complete in under 60 seconds',
      icon: '⚡',
      condition: (metrics) => {
        return metrics.completed === true && metrics.timeElapsed < 60;
      }
    }
  },
};
```

```typescript
// game.ts
import { AchievementEngine } from 'achievements-engine';
import { gameAchievements } from './achievements';

class Game {
  private engine: AchievementEngine;
  private score: number = 0;
  private clicks: number = 0;
  private startTime: number = Date.now();

  constructor() {
    // Initialize engine
    this.engine = new AchievementEngine({
      achievements: gameAchievements,
      storage: 'localStorage'
    });

    // Listen for achievements
    this.engine.on('achievement:unlocked', (event) => {
      console.log(`🎉 ${event.achievementTitle}`);
      this.showNotification(event);
    });
  }

  scorePoints(points: number) {
    this.score += points;
    this.engine.update({ score: this.score });
  }

  handleClick() {
    this.clicks++;
    this.engine.update({ clicks: this.clicks });
  }

  completeGame() {
    const timeElapsed = (Date.now() - this.startTime) / 1000; // seconds

    this.engine.update({
      completed: true,
      timeElapsed,
      accuracy: 100 // Your accuracy calculation
    });
  }

  setDifficulty(level: 'easy' | 'medium' | 'hard') {
    this.engine.update({ difficulty: level });
  }

  private showNotification(event: any) {
    // Your notification logic here
    console.log(`Unlocked: ${event.achievementTitle}`);
  }
}

// Usage
const game = new Game();
game.scorePoints(100); // Unlocks "Beginner"
game.handleClick(); // Increments clicks
game.setDifficulty('hard'); // Unlocks "Hardened Warrior"
game.completeGame(); // May unlock "Speed Demon" or "Perfectionist"
```

---

## Browser Integration

### Vanilla JavaScript Example

```html
<!DOCTYPE html>
<html>
<head>
  <title>Achievement Demo</title>
</head>
<body>
  <h1>Score: <span id="score">0</span></h1>
  <button id="scoreBtn">+100 Points</button>
  <button id="clickBtn">Click Me!</button>
  <button id="completeBtn">Complete Game</button>

  <script type="module">
    import { AchievementEngine } from 'achievements-engine';

    const achievements = {
      score: {
        100: { title: 'Century!', icon: '🏆' },
        500: { title: 'High Scorer!', icon: '⭐' }
      },
      clicks: {
        10: { title: 'Clicker', icon: '👆' }
      }
    };

    const engine = new AchievementEngine({
      achievements,
      storage: 'localStorage'
    });

    let score = 0;
    let clicks = 0;

    // Listen for unlocks
    engine.on('achievement:unlocked', (event) => {
      alert(`🎉 ${event.achievementTitle}`);
    });

    // Score button
    document.getElementById('scoreBtn').addEventListener('click', () => {
      score += 100;
      document.getElementById('score').textContent = score;
      engine.update({ score });
    });

    // Click button
    document.getElementById('clickBtn').addEventListener('click', () => {
      clicks++;
      engine.update({ clicks });
    });

    // Complete button
    document.getElementById('completeBtn').addEventListener('click', () => {
      engine.update({ completed: true });
    });
  </script>
</body>
</html>
```

---

## Best Practices

### 1. Use Descriptive Metric Names

```typescript
// ✅ Good - clear and specific
const achievements = {
  questsCompleted: { 10: { title: 'Quest Master', icon: '🎯' } },
  bossesDefeated: { 5: { title: 'Boss Slayer', icon: '⚔️' } },
};

// ❌ Bad - vague names
const achievements = {
  count: { 10: { title: 'Achievement', icon: '🏆' } },
  num: { 5: { title: 'Another', icon: '⭐' } },
};
```

### 2. Provide Meaningful Descriptions

```typescript
// ✅ Good - tells users what to do
{
  title: 'Speed Runner',
  description: 'Complete the game in under 5 minutes',
  icon: '⚡'
}

// ❌ Bad - unhelpful
{
  title: 'Fast',
  description: 'Be fast',
  icon: '⚡'
}
```

### 3. Choose Appropriate Icons

Use emojis that clearly represent the achievement:

```typescript
const achievements = {
  score: {
    100: { title: 'Bronze', icon: '🥉' },   // Bronze medal
    500: { title: 'Silver', icon: '🥈' },   // Silver medal
    1000: { title: 'Gold', icon: '🥇' },    // Gold medal
  },
  combat: {
    10: { title: 'Warrior', icon: '⚔️' },   // Sword for combat
    50: { title: 'Champion', icon: '🏆' },  // Trophy for mastery
  }
};
```

### 4. Group Related Achievements

```typescript
const achievements = {
  // Combat achievements
  enemiesDefeated: {
    10: { title: 'Combatant', icon: '⚔️' },
    50: { title: 'Warrior', icon: '🗡️' },
  },
  bossesDefeated: {
    1: { title: 'Boss Hunter', icon: '🎯' },
    5: { title: 'Boss Master', icon: '👑' },
  },

  // Collection achievements
  itemsCollected: {
    25: { title: 'Collector', icon: '📦' },
    100: { title: 'Hoarder', icon: '💰' },
  },
  treasuresFound: {
    5: { title: 'Treasure Hunter', icon: '💎' },
    25: { title: 'Fortune Finder', icon: '🏴‍☠️' },
  },

  // Progression achievements
  levelsCompleted: {
    5: { title: 'Explorer', icon: '🗺️' },
    25: { title: 'Adventurer', icon: '🧭' },
  },
  questsCompleted: {
    10: { title: 'Quest Starter', icon: '📜' },
    50: { title: 'Quest Master', icon: '⭐' },
  },
};
```

### 5. Use Custom Conditions for Complex Logic

```typescript
const achievements = {
  // Simple threshold
  score: {
    1000: { title: 'High Scorer', icon: '🏆' }
  },

  // Complex multi-metric condition
  masterPlayer: {
    custom: {
      title: 'Master Player',
      description: 'Score 1000+ points with 90%+ accuracy in under 10 minutes',
      icon: '💎',
      condition: (metrics) => {
        return metrics.score >= 1000 &&
               metrics.accuracy >= 90 &&
               metrics.timeElapsed < 600;
      }
    }
  }
};
```

---

## Type Safety with TypeScript

Define your metric types for type-safe updates:

```typescript
interface GameMetrics {
  score: number;
  level: number;
  clicks: number;
  completedTutorial: boolean;
  difficulty: 'easy' | 'medium' | 'hard';
  accuracy: number;
  timeElapsed: number;
  completed: boolean;
}

// Type-safe achievement configuration
const achievements: Record<string, any> = {
  score: {
    100: { title: 'Century!', icon: '🏆' }
  },
  // ... more achievements
};

const engine = new AchievementEngine({
  achievements,
  storage: 'localStorage'
});

// Type-safe updates
engine.update<GameMetrics>({
  score: 100,
  level: 5,
  completedTutorial: true
});
```

---

## Migration from Complex API

If you're using the Complex API (array of achievement objects), you can migrate to the Simple API:

**Complex API (Old):**
```typescript
const achievements = [
  {
    id: 'score_100',
    title: 'Century!',
    description: 'Score 100 points',
    icon: '🏆',
    metric: 'score',
    condition: (value) => value >= 100
  }
];
```

**Simple API (New):**
```typescript
const achievements = {
  score: {
    100: { title: 'Century!', description: 'Score 100 points', icon: '🏆' }
  }
};
```

Or use the AchievementBuilder for even more convenience:

```typescript
import { AchievementBuilder } from 'achievements-engine';

const achievements = AchievementBuilder.createScoreAchievements([100, 500, 1000]);
```

---

## Next Steps

- [Builder API](/docs/guides/builder-api) - Smart defaults and chainable customization
- [Events System](/docs/guides/events) - Listen to achievement events
- [Storage Options](/docs/guides/storage) - Configure persistence
