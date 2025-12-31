---
sidebar_position: 4
---

# Direct Metric Updates

This guide explains how to directly update achievement metrics using the `update()` method. This is the most straightforward way to track progress in `achievements-engine`.

## Overview

The core of direct metric updates is the `engine.update()` method. You pass an object where keys are metric names and values are the new metric values.

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
}

// Usage
const game = new Game();
game.scorePoints(100);
game.handleClick();
game.setDifficulty('hard');
game.completeGame();
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
