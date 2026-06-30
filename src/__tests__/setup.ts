// Polyfill IndexedDB for Vitest (jsdom has no real IndexedDB implementation).
// Must run before any Dexie instance performs a table operation.
import 'fake-indexeddb/auto'
