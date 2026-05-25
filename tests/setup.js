import { vi } from 'vitest';

// Node 22+ native localStorage can cause warnings/errors if --localstorage-file is not provided.
// We override it with a clean in-memory mock to ensure all integration and unit tests run perfectly.
const store = {};

const mockLocalStorage = {
  getItem: vi.fn((key) => store[key] || null),
  setItem: vi.fn((key, value) => { store[key] = String(value); }),
  removeItem: vi.fn((key) => { delete store[key]; }),
  clear: vi.fn(() => {
    Object.keys(store).forEach(k => delete store[k]);
  }),
  key: vi.fn((index) => Object.keys(store)[index] || null),
  get length() {
    return Object.keys(store).length;
  }
};

Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
  configurable: true
});
