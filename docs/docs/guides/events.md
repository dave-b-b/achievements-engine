---
sidebar_position: 6
---

# Events System

achievements-engine uses an event-driven architecture that allows you to react to achievement unlocks, metric updates, and errors in real-time.

## Overview

The engine emits four core events:

- **`achievement:unlocked`** - Achievement is unlocked
- **`metric:updated`** - Metric value changes
- **`state:changed`** - Overall state changes
- **`error`** - Error occurs

All events are type-safe and provide detailed information about what changed.

---

## Basic Event Listening

### Subscribing to Events

```typescript
import { AchievementEngine } from 'achievements-engine';

const engine = new AchievementEngine({
  achievements,
  storage: 'localStorage'
});

// Listen for achievement unlocks
engine.on('achievement:unlocked', (event) => {
  console.log(`🎉 ${event.achievementTitle}`);
  console.log(event.achievementDescription);
});

// Listen for metric updates
engine.on('metric:updated', (event) => {
  console.log(`${event.metric}: ${event.oldValue} → ${event.newValue}`);
});

// Listen for state changes
engine.on('state:changed', (event) => {
  console.log('State updated:', event.metrics);
});

// Listen for errors
engine.on('error', (event) => {
  console.error('Error:', event.error.message);
});
```

### Unsubscribing from Events

```typescript
// Method 1: Using the unsubscribe function
const unsubscribe = engine.on('achievement:unlocked', (event) => {
  console.log('Achievement unlocked!');
});

// Later: stop listening
unsubscribe();

// Method 2: Using off()
function handleUnlock(event) {
  console.log('Achievement unlocked!');
}

engine.on('achievement:unlocked', handleUnlock);

// Later: stop listening
engine.off('achievement:unlocked', handleUnlock);
```

### One-Time Listeners

Subscribe to an event that auto-unsubscribes after the first emission:

```typescript
// Listen for the first achievement unlock only
engine.once('achievement:unlocked', (event) => {
  console.log('First achievement unlocked!', event.achievementTitle);
  // Automatically unsubscribes after this runs
});

// Trigger some achievements
engine.update({ score: 100 }); // Logs "First achievement unlocked!"
engine.update({ score: 500 }); // Doesn't log (already unsubscribed)
```

---

## Event Types

### achievement:unlocked

Fired when an achievement is unlocked.

**Event Interface:**
```typescript
interface AchievementUnlockedEvent {
  achievementId: string;
  achievementTitle: string;
  achievementDescription: string;
  achievementIconKey?: string;
  timestamp: number;
}
```

**Example:**
```typescript
engine.on('achievement:unlocked', (event) => {
  // Show notification
  showNotification({
    title: event.achievementTitle,
    description: event.achievementDescription,
    icon: event.achievementIconKey,
    timestamp: new Date(event.timestamp)
  });

  // Play sound
  playSound('achievement-unlock.mp3');

  // Log to analytics
  analytics.track('Achievement Unlocked', {
    achievementId: event.achievementId,
    title: event.achievementTitle
  });
});
```

### metric:updated

Fired when a metric value changes.

**Event Interface:**
```typescript
interface MetricUpdatedEvent {
  metric: string;
  oldValue: any;
  newValue: any;
  timestamp: number;
}
```

**Example:**
```typescript
engine.on('metric:updated', (event) => {
  console.log(`${event.metric} changed from ${event.oldValue} to ${event.newValue}`);

  // Update UI
  if (event.metric === 'score') {
    updateScoreDisplay(event.newValue);
  }

  // Check for milestones
  if (event.metric === 'level' && event.newValue > event.oldValue) {
    console.log(`Level up! ${event.oldValue} → ${event.newValue}`);
  }
});
```

### state:changed

Fired after any state change (metrics or achievements).

**Event Interface:**
```typescript
interface StateChangedEvent {
  metrics: AchievementMetrics;
  unlocked: string[];
  timestamp: number;
}
```

**Example:**
```typescript
engine.on('state:changed', (event) => {
  // Sync to server
  fetch('/api/sync', {
    method: 'POST',
    body: JSON.stringify({
      metrics: event.metrics,
      unlocked: event.unlocked,
      timestamp: event.timestamp
    })
  });

  // Update local storage backup
  localStorage.setItem('achievement_backup', JSON.stringify(event));
});
```

### error

Fired when an error occurs.

**Event Interface:**
```typescript
interface ErrorEvent {
  error: Error;
  context?: string;
  timestamp: number;
}
```

**Example:**
```typescript
import { StorageError, SyncError } from 'achievements-engine';

engine.on('error', (event) => {
  console.error('Achievement error:', event.error.message);

  // Handle specific error types
  if (event.error instanceof StorageError) {
    console.error('Storage failed:', event.context);
    // Switch to fallback storage
  } else if (event.error instanceof SyncError) {
    console.error('Sync failed - will retry');
  }

  // Send to error tracking
  if (typeof Sentry !== 'undefined') {
    Sentry.captureException(event.error, {
      tags: { context: event.context },
      timestamp: event.timestamp
    });
  }
});
```

---

## Event Patterns

### Notification System

```typescript
class AchievementNotifier {
  private queue: AchievementUnlockedEvent[] = [];
  private isShowing: boolean = false;

  constructor(private engine: AchievementEngine) {
    engine.on('achievement:unlocked', this.handleUnlock);
  }

  private handleUnlock = (event: AchievementUnlockedEvent) => {
    this.queue.push(event);
    this.showNext();
  };

  private async showNext() {
    if (this.isShowing || this.queue.length === 0) return;

    this.isShowing = true;
    const event = this.queue.shift()!;

    // Show notification UI
    await this.displayNotification(event);

    this.isShowing = false;
    this.showNext(); // Show next in queue
  }

  private async displayNotification(event: AchievementUnlockedEvent) {
    // Your notification UI logic
    console.log(`🎉 ${event.achievementTitle}`);
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
}

// Usage
const notifier = new AchievementNotifier(engine);
```

### Progress Tracking

```typescript
class ProgressTracker {
  private metrics: Map<string, number[]> = new Map();

  constructor(private engine: AchievementEngine) {
    engine.on('metric:updated', this.trackMetric);
  }

  private trackMetric = (event: MetricUpdatedEvent) => {
    if (!this.metrics.has(event.metric)) {
      this.metrics.set(event.metric, []);
    }

    this.metrics.get(event.metric)!.push(event.newValue);

    // Calculate progress
    this.calculateProgress(event.metric);
  };

  private calculateProgress(metric: string) {
    const values = this.metrics.get(metric)!;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const current = values[values.length - 1];

    console.log(`${metric} progress: ${min} → ${current} → ${max}`);
  }

  getHistory(metric: string): number[] {
    return this.metrics.get(metric) || [];
  }
}

// Usage
const tracker = new ProgressTracker(engine);
```

### Analytics Integration

```typescript
class AchievementAnalytics {
  constructor(private engine: AchievementEngine) {
    this.setupEventTracking();
  }

  private setupEventTracking() {
    // Track all unlocks
    this.engine.on('achievement:unlocked', (event) => {
      if (typeof analytics !== 'undefined') {
        analytics.track('Achievement Unlocked', {
          achievementId: event.achievementId,
          title: event.achievementTitle,
          timestamp: event.timestamp
        });
      }
    });

    // Track metric changes
    this.engine.on('metric:updated', (event) => {
      if (typeof analytics !== 'undefined') {
        analytics.track('Metric Updated', {
          metric: event.metric,
          value: event.newValue,
          change: event.newValue - event.oldValue
        });
      }
    });

    // Track errors
    this.engine.on('error', (event) => {
      if (typeof analytics !== 'undefined') {
        analytics.track('Achievement Error', {
          error: event.error.message,
          context: event.context
        });
      }
    });
  }
}

// Usage
const analytics = new AchievementAnalytics(engine);
```

---

## Advanced Usage

### Event Filtering

```typescript
// Only listen to specific metric updates
engine.on('metric:updated', (event) => {
  if (event.metric === 'score') {
    console.log('Score updated:', event.newValue);
  }
});

// Only listen to specific achievement unlocks
engine.on('achievement:unlocked', (event) => {
  if (event.achievementId.startsWith('secret_')) {
    console.log('Secret achievement unlocked!');
  }
});
```

### Conditional Event Handling

```typescript
// Only react to significant changes
engine.on('metric:updated', (event) => {
  const change = Math.abs(event.newValue - event.oldValue);

  if (change >= 100) {
    console.log(`Big ${event.metric} change: +${change}`);
  }
});

// Only react to level increases
engine.on('metric:updated', (event) => {
  if (event.metric === 'level' && event.newValue > event.oldValue) {
    console.log(`Level up! ${event.oldValue} → ${event.newValue}`);
  }
});
```

### Event Aggregation

```typescript
class EventAggregator {
  private achievements: AchievementUnlockedEvent[] = [];
  private flushTimer?: NodeJS.Timeout;

  constructor(private engine: AchievementEngine) {
    engine.on('achievement:unlocked', this.aggregate);
  }

  private aggregate = (event: AchievementUnlockedEvent) => {
    this.achievements.push(event);

    // Clear existing timer
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
    }

    // Flush after 2 seconds of no new events
    this.flushTimer = setTimeout(() => this.flush(), 2000);
  };

  private flush() {
    if (this.achievements.length === 0) return;

    console.log(`Unlocked ${this.achievements.length} achievements:`);
    this.achievements.forEach(a => {
      console.log(`- ${a.achievementTitle}`);
    });

    this.achievements = [];
  }
}
```

### Debugging Events

```typescript
// Log all events
const events: string[] = ['achievement:unlocked', 'metric:updated', 'state:changed', 'error'];

events.forEach(eventName => {
  engine.on(eventName, (event) => {
    console.log(`[${eventName}]`, event);
  });
});

// Count events
const eventCounts = new Map<string, number>();

engine.on('achievement:unlocked', () => {
  eventCounts.set('unlocked', (eventCounts.get('unlocked') || 0) + 1);
});

engine.on('metric:updated', () => {
  eventCounts.set('updated', (eventCounts.get('updated') || 0) + 1);
});

// Later: check counts
console.log('Event counts:', Object.fromEntries(eventCounts));
```

---

## Event Emitter API

### on(event, handler)

Subscribe to an event.

```typescript
const unsubscribe = engine.on('achievement:unlocked', (event) => {
  console.log(event.achievementTitle);
});

// Returns an unsubscribe function
unsubscribe();
```

### once(event, handler)

Subscribe to an event once (auto-unsubscribes after first emission).

```typescript
engine.once('achievement:unlocked', (event) => {
  console.log('First achievement!');
});
```

### off(event, handler)

Unsubscribe from an event.

```typescript
function handler(event) {
  console.log(event);
}

engine.on('achievement:unlocked', handler);
engine.off('achievement:unlocked', handler);
```

### removeAllListeners(event?)

Remove all listeners for an event, or all events if no event specified.

```typescript
// Remove all listeners for specific event
engine.removeAllListeners('achievement:unlocked');

// Remove all listeners for all events
engine.removeAllListeners();
```

### listenerCount(event)

Get the number of listeners for an event.

```typescript
const count = engine.listenerCount('achievement:unlocked');
console.log(`${count} listeners for achievement:unlocked`);
```

### eventNames()

Get all event names that have listeners.

```typescript
const events = engine.eventNames();
console.log('Events with listeners:', events);
// Output: ['achievement:unlocked', 'metric:updated']
```

---

## Best Practices

### 1. Always Unsubscribe

Prevent memory leaks by unsubscribing when done:

```typescript
class GameComponent {
  private unsubscribe?: () => void;

  constructor(private engine: AchievementEngine) {
    this.unsubscribe = engine.on('achievement:unlocked', this.handleUnlock);
  }

  private handleUnlock = (event: AchievementUnlockedEvent) => {
    console.log(event.achievementTitle);
  };

  destroy() {
    // Clean up listener
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }
}
```

### 2. Handle Errors in Event Handlers

The event system catches errors but logs them to console:

```typescript
engine.on('achievement:unlocked', (event) => {
  try {
    // Your code that might throw
    showNotification(event);
  } catch (error) {
    console.error('Failed to show notification:', error);
  }
});
```

### 3. Use Typed Event Handlers

TypeScript provides full type safety for events:

```typescript
import type { AchievementUnlockedEvent } from 'achievements-engine';

engine.on('achievement:unlocked', (event: AchievementUnlockedEvent) => {
  // event is fully typed
  console.log(event.achievementTitle); // ✅ Type-safe
  // console.log(event.invalid);       // This would cause a type error
});
```

### 4. Batch Related Operations

Avoid reacting to every single event:

```typescript
let updateTimer: NodeJS.Timeout | undefined;

engine.on('metric:updated', () => {
  if (updateTimer) clearTimeout(updateTimer);

  updateTimer = setTimeout(() => {
    // Batch update UI once
    updateDashboard();
  }, 100);
});
```

### 5. Monitor Event Performance

Track event handler execution time:

```typescript
engine.on('achievement:unlocked', (event) => {
  const start = performance.now();

  // Your handler logic
  showNotification(event);

  const duration = performance.now() - start;
  if (duration > 16) { // More than one frame
    console.warn(`Slow handler: ${duration}ms`);
  }
});
```

---

## Framework Integration Examples

### React

```typescript
import { useEffect, useRef } from 'react';
import { AchievementEngine } from 'achievements-engine';

function AchievementNotifications({ achievements }) {
  const engineRef = useRef(null);

  useEffect(() => {
    // Create engine instance
    if (!engineRef.current) {
      engineRef.current = new AchievementEngine({
        achievements,
        storage: 'localStorage'
      });
    }

    const unsubscribe = engineRef.current.on('achievement:unlocked', (event) => {
      alert(`🎉 ${event.achievementTitle}`);
    });

    return () => unsubscribe();
  }, [achievements]);

  return null;
}
```

### Vue

```typescript
import { onMounted, onUnmounted, ref } from 'vue';
import { AchievementEngine } from 'achievements-engine';

export default {
  props: ['achievements'],
  setup(props) {
    const engine = ref(null);
    let unsubscribe = null;

    onMounted(() => {
      // Create engine instance
      engine.value = new AchievementEngine({
        achievements: props.achievements,
        storage: 'localStorage'
      });

      unsubscribe = engine.value.on('achievement:unlocked', (event) => {
        alert(`🎉 ${event.achievementTitle}`);
      });
    });

    onUnmounted(() => {
      if (unsubscribe) {
        unsubscribe();
      }
    });
  }
};
```

### Svelte

```typescript
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { AchievementEngine } from 'achievements-engine';

  export let achievements;

  let engine = null;
  let unsubscribe = null;

  onMount(() => {
    // Create engine instance
    engine = new AchievementEngine({
      achievements,
      storage: 'localStorage'
    });

    unsubscribe = engine.on('achievement:unlocked', (event) => {
      alert(`🎉 ${event.achievementTitle}`);
    });
  });

  onDestroy(() => {
    if (unsubscribe) {
      unsubscribe();
    }
  });
</script>
```

---

## Next Steps

- [Error Handling](/docs/guides/error-handling) - Handle error events gracefully
- [Storage Options](/docs/guides/storage) - Configure event-driven storage sync
- [Builder API](/docs/guides/builder-api) - Create achievements that trigger events
