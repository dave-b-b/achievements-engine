/**
 * Lightweight, type-safe event emitter for the achievements engine
 * Zero dependencies, memory-leak safe implementation
 */

export type EventHandler<T = any> = (data: T) => void;
export type UnsubscribeFn = () => void;

export class EventEmitter {
  private listeners: Map<string, Set<EventHandler>>;
  private onceListeners: Map<string, Set<EventHandler>>;

  constructor() {
    this.listeners = new Map();
    this.onceListeners = new Map();
  }

  /**
   * Subscribe to an event
   * @param event - Event name
   * @param handler - Event handler function
   * @returns Unsubscribe function
   */
  on<T = any>(event: string, handler: EventHandler<T>): UnsubscribeFn {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    this.listeners.get(event)!.add(handler as EventHandler);

    // Return unsubscribe function
    return () => this.off(event, handler);
  }

  /**
   * Subscribe to an event once (auto-unsubscribes after first emission)
   * @param event - Event name
   * @param handler - Event handler function
   * @returns Unsubscribe function
   */
  once<T = any>(event: string, handler: EventHandler<T>): UnsubscribeFn {
    if (!this.onceListeners.has(event)) {
      this.onceListeners.set(event, new Set());
    }

    this.onceListeners.get(event)!.add(handler as EventHandler);

    // Return unsubscribe function
    return () => {
      const onceSet = this.onceListeners.get(event);
      if (onceSet) {
        onceSet.delete(handler as EventHandler);
      }
    };
  }

  /**
   * Unsubscribe from an event
   * @param event - Event name
   * @param handler - Event handler function to remove
   */
  off<T = any>(event: string, handler: EventHandler<T>): void {
    const regularListeners = this.listeners.get(event);
    if (regularListeners) {
      regularListeners.delete(handler as EventHandler);

      // Clean up empty sets to prevent memory leaks
      if (regularListeners.size === 0) {
        this.listeners.delete(event);
      }
    }

    const onceSet = this.onceListeners.get(event);
    if (onceSet) {
      onceSet.delete(handler as EventHandler);

      // Clean up empty sets
      if (onceSet.size === 0) {
        this.onceListeners.delete(event);
      }
    }
  }

  /**
   * Emit an event to all subscribers
   * @param event - Event name
   * @param data - Event payload
   */
  emit<T = any>(event: string, data?: T): void {
    // Call regular listeners
    const regularListeners = this.listeners.get(event);
    if (regularListeners) {
      // Create a copy to avoid issues if listeners modify the set during iteration
      const listenersCopy = Array.from(regularListeners);
      listenersCopy.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          // Prevent one handler's error from stopping other handlers
          console.error(`Error in event handler for "${event}":`, error);
        }
      });
    }

    // Call once listeners and remove them
    const onceSet = this.onceListeners.get(event);
    if (onceSet) {
      const onceListenersCopy = Array.from(onceSet);
      // Clear the set before calling handlers to prevent re-entry issues
      this.onceListeners.delete(event);

      onceListenersCopy.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in once event handler for "${event}":`, error);
        }
      });
    }
  }

  /**
   * Remove all listeners for a specific event, or all events if no event specified
   * @param event - Optional event name. If not provided, removes all listeners.
   */
  removeAllListeners(event?: string): void {
    if (event) {
      this.listeners.delete(event);
      this.onceListeners.delete(event);
    } else {
      this.listeners.clear();
      this.onceListeners.clear();
    }
  }

  /**
   * Get the number of listeners for an event
   * @param event - Event name
   * @returns Number of listeners
   */
  listenerCount(event: string): number {
    const regularCount = this.listeners.get(event)?.size || 0;
    const onceCount = this.onceListeners.get(event)?.size || 0;
    return regularCount + onceCount;
  }

  /**
   * Get all event names that have listeners
   * @returns Array of event names
   */
  eventNames(): string[] {
    const regularEvents = Array.from(this.listeners.keys());
    const onceEvents = Array.from(this.onceListeners.keys());

    // Combine and deduplicate
    return Array.from(new Set([...regularEvents, ...onceEvents]));
  }
}
