// Test setup file for global configuration and mocks

// Mock structuredClone for tests
if (typeof global.structuredClone === 'undefined') {
  global.structuredClone = (obj: any) => JSON.parse(JSON.stringify(obj));
}

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    },
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock console.error to avoid noise in tests
const originalError = console.error;
global.console.error = jest.fn((...args: any[]) => {
  // Only suppress expected error messages
  const message = args[0];
  if (
    typeof message === 'string' &&
    (message.includes('Error in event handler') ||
      message.includes('Error in once event handler'))
  ) {
    return;
  }
  originalError(...args);
});

// Clean up after each test
beforeEach(() => {
  localStorage.clear();
  jest.clearAllTimers();
  jest.clearAllMocks();
});

