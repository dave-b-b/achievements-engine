/**
 * EventEmitter Tests
 * Comprehensive test suite for the EventEmitter class
 */

import { EventEmitter } from '../src/EventEmitter';

describe('EventEmitter', () => {
  let emitter: EventEmitter;

  beforeEach(() => {
    emitter = new EventEmitter();
  });

  describe('Basic Event Subscription', () => {
    test('on() should subscribe to events', () => {
      const handler = jest.fn();
      emitter.on('test', handler);

      emitter.emit('test', { data: 'hello' });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({ data: 'hello' });
    });

    test('on() should return unsubscribe function', () => {
      const handler = jest.fn();
      const unsubscribe = emitter.on('test', handler);

      expect(typeof unsubscribe).toBe('function');

      unsubscribe();
      emitter.emit('test', 'data');

      expect(handler).not.toHaveBeenCalled();
    });

    test('on() should support multiple handlers for same event', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      const handler3 = jest.fn();

      emitter.on('test', handler1);
      emitter.on('test', handler2);
      emitter.on('test', handler3);

      emitter.emit('test', 'data');

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
      expect(handler3).toHaveBeenCalledTimes(1);
    });

    test('on() should pass data to handlers', () => {
      const handler = jest.fn();
      const complexData = {
        id: 123,
        name: 'Test',
        nested: { value: 'nested' },
        array: [1, 2, 3],
      };

      emitter.on('test', handler);
      emitter.emit('test', complexData);

      expect(handler).toHaveBeenCalledWith(complexData);
    });
  });

  describe('Once Subscription', () => {
    test('once() should unsubscribe after first emission', () => {
      const handler = jest.fn();
      emitter.once('test', handler);

      emitter.emit('test', 'first');
      emitter.emit('test', 'second');

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith('first');
    });

    test('once() should return unsubscribe function', () => {
      const handler = jest.fn();
      const unsubscribe = emitter.once('test', handler);

      unsubscribe();
      emitter.emit('test', 'data');

      expect(handler).not.toHaveBeenCalled();
    });

    test('once() should work with multiple once handlers', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      const handler3 = jest.fn();

      emitter.once('test', handler1);
      emitter.once('test', handler2);
      emitter.once('test', handler3);

      emitter.emit('test', 'data');

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
      expect(handler3).toHaveBeenCalledTimes(1);

      emitter.emit('test', 'data2');

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
      expect(handler3).toHaveBeenCalledTimes(1);
    });
  });

  describe('Unsubscription', () => {
    test('off() should remove specific handler', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      emitter.on('test', handler1);
      emitter.on('test', handler2);

      emitter.off('test', handler1);
      emitter.emit('test', 'data');

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    test('off() should handle non-existent handler gracefully', () => {
      const handler = jest.fn();

      expect(() => {
        emitter.off('test', handler);
      }).not.toThrow();
    });

    test('removeAllListeners() should remove all handlers for event', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      const handler3 = jest.fn();

      emitter.on('test', handler1);
      emitter.on('test', handler2);
      emitter.once('test', handler3);

      emitter.removeAllListeners('test');
      emitter.emit('test', 'data');

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
      expect(handler3).not.toHaveBeenCalled();
    });

    test('removeAllListeners() with no args should remove all handlers', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      const handler3 = jest.fn();

      emitter.on('event1', handler1);
      emitter.on('event2', handler2);
      emitter.on('event3', handler3);

      emitter.removeAllListeners();

      emitter.emit('event1', 'data');
      emitter.emit('event2', 'data');
      emitter.emit('event3', 'data');

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
      expect(handler3).not.toHaveBeenCalled();
    });
  });

  describe('Event Emission', () => {
    test('emit() should call handlers synchronously', () => {
      let flag = false;
      const handler = () => {
        flag = true;
      };

      emitter.on('test', handler);
      emitter.emit('test');

      expect(flag).toBe(true);
    });

    test('emit() should handle handler errors gracefully', () => {
      const errorHandler = jest.fn(() => {
        throw new Error('Handler error');
      });
      const validHandler = jest.fn();

      emitter.on('test', errorHandler);
      emitter.on('test', validHandler);

      expect(() => {
        emitter.emit('test', 'data');
      }).not.toThrow();

      expect(errorHandler).toHaveBeenCalled();
      expect(validHandler).toHaveBeenCalled();
    });

    test('emit() should handle no listeners gracefully', () => {
      expect(() => {
        emitter.emit('nonexistent', 'data');
      }).not.toThrow();
    });

    test('emit() should work with undefined data', () => {
      const handler = jest.fn();
      emitter.on('test', handler);

      emitter.emit('test');

      expect(handler).toHaveBeenCalledWith(undefined);
    });
  });

  describe('Memory Management', () => {
    test('should clean up empty listener sets', () => {
      const handler = jest.fn();
      const unsubscribe = emitter.on('test', handler);

      expect(emitter.listenerCount('test')).toBe(1);

      unsubscribe();

      expect(emitter.listenerCount('test')).toBe(0);
      expect(emitter.eventNames()).not.toContain('test');
    });

    test('listenerCount() should return correct count', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      const handler3 = jest.fn();

      expect(emitter.listenerCount('test')).toBe(0);

      emitter.on('test', handler1);
      expect(emitter.listenerCount('test')).toBe(1);

      emitter.on('test', handler2);
      expect(emitter.listenerCount('test')).toBe(2);

      emitter.once('test', handler3);
      expect(emitter.listenerCount('test')).toBe(3);

      emitter.off('test', handler1);
      expect(emitter.listenerCount('test')).toBe(2);
    });

    test('eventNames() should return all events with listeners', () => {
      emitter.on('event1', jest.fn());
      emitter.on('event2', jest.fn());
      emitter.once('event3', jest.fn());

      const names = emitter.eventNames();

      expect(names).toContain('event1');
      expect(names).toContain('event2');
      expect(names).toContain('event3');
      expect(names.length).toBe(3);

      emitter.removeAllListeners('event1');

      const updatedNames = emitter.eventNames();
      expect(updatedNames).not.toContain('event1');
      expect(updatedNames.length).toBe(2);
    });
  });

  describe('Edge Cases', () => {
    test('should handle rapid successive emissions', () => {
      const handler = jest.fn();
      emitter.on('test', handler);

      for (let i = 0; i < 1000; i++) {
        emitter.emit('test', i);
      }

      expect(handler).toHaveBeenCalledTimes(1000);
    });

    test('should handle subscription during emission', () => {
      const handler1 = jest.fn(() => {
        emitter.on('test', handler2);
      });
      const handler2 = jest.fn();

      emitter.on('test', handler1);
      emitter.emit('test', 'data');

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).not.toHaveBeenCalled();

      emitter.emit('test', 'data2');

      expect(handler2).toHaveBeenCalledTimes(1);
    });

    test('should handle unsubscription during emission', () => {
      const handler2 = jest.fn();
      const handler1 = jest.fn(() => {
        emitter.off('test', handler2);
      });

      emitter.on('test', handler1);
      emitter.on('test', handler2);

      emitter.emit('test', 'data');

      // Both handlers should be called because we iterate over a copy
      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);

      emitter.emit('test', 'data2');

      // Now handler2 should not be called
      expect(handler1).toHaveBeenCalledTimes(2);
      expect(handler2).toHaveBeenCalledTimes(1);
    });
  });
});
