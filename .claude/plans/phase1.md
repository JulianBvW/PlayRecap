Phase 1 — Step Plan

  ---
  Step 1 of 3 — Types & Dexie DB

  What: The raw data layer. No Pinia, no Vue, just the TypeScript contract and the IndexedDB schema.

  - src/types/library.ts — Chapter, Book, LibraryFile (matches library.json exactly), BookRecord (extends Book with lastOpenedAt: string | null), Message + ChatThread types (needed by Phase 5 store).
  - src/db/index.ts — Dexie subclass, two tables (books keyed by id, settings keyed by key), navigator.storage.persist() called on construction.
  - No tests yet — Dexie itself is trusted; tests come with the store in Step 2.

  Verify: npm run type-check passes. Open browser devtools → Application → IndexedDB → confirm the two object stores appear on first load.

  ---
  Step 2 of 3 — Pinia Stores

  What: All three stores wired to the DB (or memory), plus the store-level tests.

  - Install fake-indexeddb as a dev dep (makes store tests run in Vitest without a real browser).
  - src/stores/books.ts — useBooksStore: init loads from Dexie, exposes activeBook, sortedBooks (by lastOpenedAt desc, nulls last), selectBook(id), upsertBooks(), importBooks(), exportBooks(), clearAll().
  - src/stores/settings.ts — useSettingsStore: apiKey backed by Dexie settings table.
  - src/stores/chat.ts — useChatStore: reactive map ${bookId}:${chapterIndex} → Message[], no Dexie writes.
  - src/__tests__/stores/books.spec.ts — tests using fake-indexeddb:
    - upsert preserves lastOpenedAt on re-add of same id
    - importBooks resets the store; reads lastOpenedAt from input if present
    - exportBooks output has books array, zero apiKey mentions
    - clearAll empties both tables

  Verify: npm run test:unit — all store tests pass. In browser: select a book → lastOpenedAt written to IndexedDB, visible in devtools.

  ---
  Step 3 of 3 — Utilities, Tests & Token Audit

  What: Three pure utility functions, their tests, and a pass over the design tokens CSS.

  - src/utils/time.ts — formatStartTime(seconds: number): string. MM:SS, rolls to H:MM:SS past 3600.
  - src/utils/markdown.ts — stripMarkdown(text: string): string. Strips ### , **...**, - , links, backticks, tables. Plain words survive unchanged.
  - src/utils/rail.ts — buildRailSubset(total: number, max = 13): number[]. Step ≈ Math.round(total / max), always includes 1 and total, dedupes.
  - src/__tests__/utils/time.spec.ts, markdown.spec.ts, rail.spec.ts — the cases from the roadmap plus edge cases (0 seconds, single chapter, total=2).
  - src/assets/main.css token audit — verify every palette name from the spec is present and spelled correctly (--color-line-strong, --color-accent-soft-2, --color-user-bubble, etc.). Add any that are missing.

  Verify: npm run test:unit — full suite green. npm run type-check — clean. Spot-check formatStartTime(3661) in the browser console → '1:01:01'.