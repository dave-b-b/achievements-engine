---
sidebar_position: 3
---

# Builder API

The Builder API provides a three-tier system for configuring achievements, from simple smart defaults to full custom control.

## Overview

achievements-engine offers three levels of configuration:

1. **Tier 1: Smart Defaults** - Zero configuration for common patterns
2. **Tier 2: Chainable Customization** - Fluent API for custom achievements
3. **Tier 3: Full Control** - Complete customization for complex logic

You can mix and match all three tiers in a single configuration!

---

## Tier 1: Smart Defaults

Pre-configured achievements for common patterns with intelligent defaults.

### Score Achievements

**Single Achievement:**
```typescript
import { AchievementBuilder } from 'achievements-engine';

const achievement = AchievementBuilder.createScoreAchievement(100);
// Result: "Score 100!" achievement with 🏆 icon
```

**Multiple Achievements:**
```typescript
const achievements = AchievementBuilder.createScoreAchievements([100, 500, 1000]);
// Creates three score achievements with smart defaults
```

**Smart Defaults:**
- Auto-generated title: "Score \{threshold\}!"
- Auto-generated description: "Score \{threshold\} points"
- Trophy icon: 🏆
- Metric: `score`

### Level Achievements

**Single Achievement:**
```typescript
const achievement = AchievementBuilder.createLevelAchievement(5);
// Result: "Level 5!" achievement with 📈 icon
```

**Multiple Achievements:**
```typescript
const achievements = AchievementBuilder.createLevelAchievements([5, 10, 25]);
// Creates three level achievements
```

**Smart Defaults:**
- Auto-generated title: "Level \{level\}!"
- Auto-generated description: "Reach level \{level\}"
- Chart icon: 📈
- Metric: `level`

### Boolean Achievements

```typescript
const achievements = AchievementBuilder.combine([
  AchievementBuilder.createBooleanAchievement('completedTutorial'),
  AchievementBuilder.createBooleanAchievement('firstLogin'),
  AchievementBuilder.createBooleanAchievement('profileCompleted')
]);
```

**Smart Defaults:**
- Auto-generated title from metric name (camelCase → "Completed Tutorial!")
- Checkmark icon: ✅
- Condition: value === true

### Value-Based Achievements

For achievements based on specific string values:

```typescript
const achievement = AchievementBuilder.createValueAchievement('characterClass', 'wizard');
// Result: "Wizard!" achievement when characterClass === 'wizard'
```

---

## Tier 2: Chainable Customization

Customize smart defaults with a fluent, chainable API.

### Customizing Individual Achievements

```typescript
const achievement = AchievementBuilder.createScoreAchievement(100)
  .withAward({
    title: 'Century!',
    description: 'You scored 100 points!',
    icon: '🎉'
  });
```

### Customizing in Batch

```typescript
const achievements = AchievementBuilder.createScoreAchievements([
  100,  // Uses default award
  [500, { title: 'Half Way!', icon: '⭐' }],  // Custom award
  1000  // Uses default award
]);
```

### Combining Different Achievement Types

```typescript
const achievements = AchievementBuilder.combine([
  AchievementBuilder.createScoreAchievement(100)
    .withAward({ title: 'First Points!', icon: '🎯' }),

  AchievementBuilder.createLevelAchievement(5)
    .withAward({ title: 'Leveling Up!', description: 'You reached level 5!', icon: '🌟' }),

  AchievementBuilder.createBooleanAchievement('completedTutorial')
    .withAward({ title: 'Tutorial Master!', icon: '📚' })
]);
```

---

## Tier 3: Full Control

For complex custom logic and conditions.

### Basic Custom Achievement

```typescript
const achievement = AchievementBuilder.create()
  .withMetric('lastLoginDate')
  .withCondition((metrics) => {
    if (metrics.lastLoginDate instanceof Date) {
      return metrics.lastLoginDate.getTime() > Date.now() - (7 * 24 * 60 * 60 * 1000);
    }
    return false;
  })
  .withAward({
    title: 'Weekly Warrior',
    description: 'Logged in within the last week',
    icon: '📅'
  })
  .build();
```

### Multi-Metric Condition

The `metrics` parameter gives you access to all metrics. **Note**: Even for multi-metric conditions, `.withMetric()` is required (it's used as the config key). The condition function receives the entire metrics object, so you can check any metric:

```typescript
const achievement = AchievementBuilder.create()
  .withMetric('combo_achievement') // Required - used as config key
  .withCondition((metrics) => {
    // Can access all metrics, not just the one specified in withMetric()
    return metrics.score >= 1000 && metrics.level >= 10;
  })
  .withAward({
    title: 'Power Player',
    description: 'Score 1000+ at level 10+',
    icon: '💪'
  })
  .build();
```

### Percentage-Based Achievement

```typescript
const achievement = AchievementBuilder.create()
  .withMetric('questsCompleted')
  .withCondition((metrics) => {
    return metrics.questsCompleted >= metrics.totalQuests * 0.5; // 50% completion
  })
  .withAward({
    title: 'Halfway There',
    description: 'Complete 50% of all quests',
    icon: '🎯'
  })
  .build();
```

---

## Complete Example

Combining all three tiers:

```typescript
import { AchievementEngine, AchievementBuilder } from 'achievements-engine';

const achievements = AchievementBuilder.combine([
  // Tier 1: Smart defaults
  AchievementBuilder.createScoreAchievements([100, 500]),
  AchievementBuilder.createLevelAchievements([5, 10]),

  // Tier 2: Chainable customization
  AchievementBuilder.createScoreAchievement(1000)
    .withAward({ title: 'Master Scorer!', icon: '🏆' }),

  AchievementBuilder.createBooleanAchievement('completedTutorial')
    .withAward({ title: 'Quick Learner!', icon: '📚' }),

  // Tier 3: Full control
  AchievementBuilder.create()
    .withMetric('perfect_combo')
    .withCondition((metrics) => {
      return metrics.score >= 500 && metrics.level >= 5;
    })
    .withAward({
      title: 'Perfect Combo',
      description: 'Score 500+ at level 5+',
      icon: '⚡'
    })
    .build()
]);

// Initialize engine
const engine = new AchievementEngine({
  achievements,
  storage: 'localStorage'
});

// Use the engine
engine.on('achievement:unlocked', (event) => {
  console.log(`🎉 ${event.achievementTitle}`);
});

engine.update({ score: 100, level: 5 });
```

---

## AwardDetails Interface

All achievement awards use the `AwardDetails` interface:

```typescript
interface AwardDetails {
  title?: string;        // Achievement title
  description?: string;  // Achievement description
  icon?: string;         // Icon or emoji
}
```

All fields are optional - the builder provides smart defaults when fields are omitted.

---

## Best Practices

### 1. Use Smart Defaults When Possible
Tier 1 methods provide consistent UX with zero configuration:
```typescript
// Good: Clear and concise
AchievementBuilder.createScoreAchievements([100, 500, 1000])

// Also good, but more verbose for simple cases
AchievementBuilder.createScoreAchievement(100)
  .withAward({ title: 'Score 100!', description: 'Score 100 points', icon: '🏆' })
```

### 2. Combine Related Achievements
Group achievements by type for better organization:
```typescript
const scoreAchievements = AchievementBuilder.createScoreAchievements([...]);
const levelAchievements = AchievementBuilder.createLevelAchievements([...]);
const customAchievements = AchievementBuilder.create()...;

const allAchievements = AchievementBuilder.combine([
  scoreAchievements,
  levelAchievements,
  customAchievements
]);
```

### 3. Use Descriptive Metrics for Custom Achievements
Make custom achievement metrics self-documenting:
```typescript
// Good
.withMetric('weekly_login_streak')
.withMetric('perfect_score_level_10')

// Avoid
.withMetric('achievement1')
.withMetric('custom_ach')
```

### 4. Leverage the Metrics Parameter
For complex conditions, use the metrics parameter to access all metrics. Even though you must specify a metric name with `.withMetric()`, the condition function receives the entire metrics object:

```typescript
AchievementBuilder.create()
  .withMetric('custom_achievement') // Required - used as config key
  .withCondition((metrics) => {
    // Can access ALL metrics, not just 'custom_achievement'
    const level = metrics.level;
    const quests = metrics.questsCompleted;
    const score = metrics.score;

    return level >= 10 && quests >= 5 && score >= 1000;
  })
  .build()
```

---

## Next Steps

- [Event-Based Tracking](/docs/guides/event-based-tracking) - Listen to achievement unlocks
- [Storage](/docs/guides/storage) - Configure persistence
- [Data Portability](/docs/guides/data-portability) - Export and import user data
- [Error Handling](/docs/guides/error-handling) - Handle errors gracefully
