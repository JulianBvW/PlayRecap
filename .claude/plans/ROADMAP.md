# PlayRecap — Build Roadmap

Seven phases, each broken into 2–4 steps. Each step ends with `/explain-changes`, a review/refine loop, and a commit. Each phase ends with `/phase-review`, any fixes, and `git tag phase-N-done`.

Reference docs: `ref/PlayRecap-Design-Spec.md`, `ref/PlayRecap-Feature-Spec.md`, `ref/ios-pwa-edge-to-edge-fix.md`.

---

## Phase 1 — Foundation

**Data model, stores, design tokens, and pure utilities. No visible UI beyond what already exists.**

The entire app reads from this layer. Getting the types, Dexie schema, and Pinia stores right first means every later phase can just import and use — no retrofitting.

### Rough changes

- **TypeScript types** (`src/types/library.ts`): `Book`, `Chapter`, `LibraryFile` matching the `library.json` contract exactly. `BookRecord` extends `Book` with `lastOpenedAt: string | null`.
- **Dexie setup** (`src/db/index.ts`): database with two tables — `books` (keyed by `id`) and `settings` (keyed by `key`). Call `navigator.storage.persist()` on first open.
- **`useBooksStore`** (Pinia): loads all books from Dexie on init, exposes `activeBook`, `sortedBooks` (by `lastOpenedAt` desc), `selectBook(id)` (sets `lastOpenedAt = now`), `upsertBooks(books[])`, `importBooks(books[])`, `exportBooks()`, `clearAll()`.
- **`useSettingsStore`** (Pinia): `apiKey` (read/write to Dexie `settings`).
- **`useChatStore`** (Pinia): in-memory map keyed by `${bookId}:${chapterIndex}` → `Message[]`. No Dexie writes ever.
- **`formatStartTime(seconds: number): string`** (`src/utils/time.ts`): `MM:SS`, rolls to `H:MM:SS` past 3600.
- **`stripMarkdown(text: string): string`** (`src/utils/markdown.ts`): strips headings, bold, bullets, links, code, tables to plain text (for TTS).
- **`buildRailSubset(total: number, max?: number): number[]`** (`src/utils/rail.ts`): regular step ≈ `round(total / 13)`, always includes 1 and total.
- **Design tokens audit** (`src/assets/main.css`): verify all palette tokens are present and named exactly as in the spec (`--color-bg`, `--color-accent-soft`, `--color-line-strong`, etc.). Add any missing.

### Tests (Vitest)

- `formatStartTime`: 0 → `'00:00'`, 65 → `'01:05'`, 3600 → `'1:00:00'`, 3661 → `'1:01:01'`
- `stripMarkdown`: `'**bold**'` → `'bold'`, `'### H'` → `'H'`, `'- item'` → `'item'`, tables stripped
- `buildRailSubset`: total=13,max=13 includes all; total=100 always has 1 and 100; step ≈ round(100/13)
- `useBooksStore` (with a real in-memory Dexie instance via `fake-indexeddb`):
  - upsert preserves `lastOpenedAt` on re-import of same `id`
  - import resets store fully, reads `lastOpenedAt` from file
  - export contains books, no `apiKey` field

### Verification

- `npm run type-check` and `npm run test:unit` both pass
- The Dexie schema creates both tables without errors in the browser console
- `formatStartTime` tested interactively in browser devtools

---

## Phase 2 — Reading View (Static)

**The main UI: app shell, chapter list, cover placeholder, first-run screen. Wired to the store, but using imported mock data.**

After this phase, the app looks and feels right. You can import a real `library.json` and read chapter summaries.

### Rough changes

- **`CoverImage.vue`**: renders `<img>` when `cover` is non-null; otherwise a generated placeholder — gradient from `accent` → `accentInk` with the book title's first letter centered. Same component used at 46px (switcher) and 56px (sheet).
- **`FirstRunScreen.vue`**: centered "Daten importieren" button on plain `bg`, shown when `booksStore.sortedBooks` is empty. Triggers the import file-picker.
- **`TopBar.vue`**: compact switcher row (cover 46px, title + "Kapitel N von N" subtitle, chevron-down), progress bar (3px track, accent fill, `width .3s ease`). Tapping opens the book switcher sheet (sheet built in Phase 4 — TopBar just emits an event for now).
- **`ChapterRow.vue`**: divider, header row (chapter label `KAPITEL N · MM:SS` with accent/faint split + chat button 34px circle), chapter title, bullets list. Chat button emits an event (wired in Phase 5).
- **`SeriesRecapEntry.vue`**: the "Bisher in der Serie" row above chapter 1 for sequels. Emits open event (wired in Phase 8 Series Recap).
- **`ChapterList.vue`**: renders `SeriesRecapEntry` (if `seriesRecap` present) then all `ChapterRow`s. Exposes a `scrollContainerRef` for Phase 3.
- **`App.vue`**: integrates `FirstRunScreen` vs `TopBar` + `ChapterList` based on library state. The inner scroll container (`app-scroll`) wraps `ChapterList`.
- **End-of-list marker**: "Ende des Buches" (faint, centered, small) after the last chapter row.

### Tests

- `CoverImage`: with `cover=null`, renders placeholder with first letter of title (snapshot or text-content check).
- `ChapterRow`: renders correct chapter number (`index + 1`), formats time via `formatStartTime`, renders all summary bullets.

### Verification

- Import a real `library.json` → chapter list renders all chapters with correct titles, bullets, and timestamps
- `cover: null` book shows gradient placeholder (letter visible) at both 46px and 56px
- Progress bar fills proportionally to chapter count
- "Ende des Buches" appears after the last row
- First-run screen shows when DB is empty; disappears after import
- `npm run test:unit` passes

---

## Phase 3 — Navigation Mechanics

**Scroll-spy, sliding highlight, chapter rail. The interactive spine of the reading experience.**

The most algorithmically demanding phase. The scroll-spy drives the progress bar and rail; the rail drives scroll position.

### Rough changes

- **`useScrollSpy` composable** (`src/composables/useScrollSpy.ts`): takes `scrollContainerRef` + array of row refs, returns reactive `currentChapterIndex`. Rule: the chapter whose top edge is the topmost that is still ≥ the scroll container's top edge. Fires on `scroll`.
- **`ScrollHighlight.vue`** (or inline in `ChapterList`): absolutely positioned `accentSoft` rounded rect (`border-radius: 14px`), `left: 8px; right: 6px`, behind row content (`z-index: 0`). Animated `top` + `height` via CSS transition for adjacent changes; transition disabled
  (instant) for jumps of more than 1 chapter index.
- **`TopBar.vue`** update: progress bar width driven by `currentChapterIndex / totalChapters`.
- **`ChapterRail.vue`**: absolutely positioned right edge, distributed subset of chapter numbers (`buildRailSubset`), nearest-tick emphasis (accent, bold, `scale(1.18)`, `.15s` transition). Pointer-capture drag + tap. Magnifier bubble (`prc-pop`). Scroll target: bottom of
  target chapter aligns to bottom of scroll container (`scrollTop = rowBottom - containerHeight`).
- **`App.vue`** / **`ChapterList.vue`** update: pass `currentChapterIndex` down from scroll-spy to `ChapterRail` and `TopBar`.

### Tests

- `useScrollSpy` (jsdom): given rows with known `offsetTop`/`offsetHeight`, scroll position X → assert expected `currentChapterIndex`. Cover: first chapter, last chapter, mid-scroll, exactly at a row boundary.
- `buildRailSubset` edge cases: `total=1` → `[1]`; `total=2` → `[1, 2]`; large totals always include 1 and total.
- Highlight jump detection: index delta > 1 → no transition class; delta ≤ 1 → transition class applied.

### Verification

- Scroll the chapter list: highlight block slides smoothly to the chapter at the top of the viewport
- Rail number nearest to current chapter is accented and scaled
- Tap a rail number: list scrolls so that chapter's bottom aligns to screen bottom (next chapter not visible)
- Drag the rail: magnifier bubble appears, tracks finger, correct chapter number shown
- Progress bar updates as you scroll
- `npm run test:unit` passes

---

## Phase 4 — Sheets & Data Management

**Book switcher sheet, settings sheet, and all four data actions (add, import, export, clear).**

### Rough changes

- **`BottomSheet.vue`** base component: grab handle (38×4, `lineStrong`), backdrop (`rgba(20,18,15,0.34)`, z-20), sheet (z-21, top-radius 22, `surface` bg, upward shadow). Open animation `prc-rise` (opacity 0 + translateY(14px) → 0, ~.3s settle ease); close delayed-unmount via
  `closing` state (300ms). Receives `modelValue` boolean.
- **`BookSwitcherSheet.vue`**: extends `BottomSheet`. Header "Deine Hörbücher" + gear button. Book rows sorted by `lastOpenedAt` (from store): cover 56px, title, author, "N Kapitel", accent check on active book, `accentSoft` bg on active row. Tapping a row calls
  `booksStore.selectBook(id)` and closes. Max height ~82%.
- **`SettingsSheet.vue`**: extends `BottomSheet`. API key password input (saves to `settingsStore`). Four action rows with icon chips: "Bücher hinzufügen", "Daten importieren", "Daten exportieren", "Alle Daten löschen" (danger styling). Each triggers the corresponding
  `booksStore` action. "Alle Daten löschen" requires a confirmation step.
- **File import logic**: `<input type="file" accept=".json">` (hidden), programmatically triggered. Validate `version === 1`, parse books array, call the appropriate store action. Show inline error if invalid.
- **`TopBar.vue`** update: tapping opens `BookSwitcherSheet`.

### Tests

- Library JSON validation: `{ version: 2, books: [] }` → rejected with error; missing `books` key → rejected.
- Upsert (Add Books): existing book keeps its `lastOpenedAt`; new book gets `null`.
- Import: `lastOpenedAt` from file is restored; old books not in file are gone.
- Export: output parses as valid JSON, has `books` array, no `apiKey` anywhere in output.
- Clear all: both `books` and `settings` stores empty after call.

### Verification

- Tap the top bar → book switcher slides up (`prc-rise`)
- Tap a different book → switcher closes, chapter list updates
- Open settings → API key field present; type a key, close, reopen → key persists
- "Daten importieren" → file picker opens, import a `library.json` → books list updates
- "Daten exportieren" → JSON file downloads, inspect it: has books, no API key
- "Alle Daten löschen" → confirmation prompt → after confirm, app returns to first-run screen
- `npm run test:unit` passes

---

## Phase 5 — Chat UI

**Full chat overlay, message rendering, all animations. Mistral not wired yet — responses are simulated.**

After this phase the chat looks and feels complete. The LLM is hooked up in Phase 6.

### Rough changes

- **`ChatSheet.vue`**: 95% height bottom sheet. Slide-up animation `prc-sin` (translateY 100%→0, .34s settle ease); close `prc-sout` (.3s ease-in) with delayed unmount (300ms). Backdrop `prc-fade`. Header: book title (faint, 12.5) + "Kapitel N" (22/600) + close × button.
- **`ChatEmpty.vue`**: "Was möchtest du wissen?" greeting + four shortcut chips (pill buttons, 1px `line`, `surface` bg). Chips send predefined prompt text via `useChatStore`.
- **`ChatMessage.vue`**: user bubble (right-aligned, `userBubble` bg, `userInk`, radius `16 16 5 16`, 15/1.45) or assistant full-width text. Assistant has two render modes fixed at generation time: **markdown** (h4 headings, bold spans, accent en-dash bullet list, 16/1.62) and
  **prose** (plain paragraphs, 16/1.7).
- **`MarkdownRenderer.vue`**: parses `### `, `**...**`, `- ` patterns into structured HTML. Only used for assistant markdown messages.
- **`ReadAloudButton.vue`**: idle (speaker + "Vorlesen") ↔ playing (stop square + "Wird vorgelesen" + `prc-eq` equalizer bars + `accentSoft` bg). No actual TTS yet — plays/stops a visual simulation. Calls `stripMarkdown` before any text is sent to TTS (Phase 7).
- **`ThinkingDots.vue`**: three dots with `prc-dot` staggered bob animation.
- **`StreamingCaret.vue`**: 8×18 accent rect with `prc-blink`.
- **`ChatInput.vue`**: mic toggle (42px circle, speech-mode state, OFF=surface/accent icon, ON=accent bg/white icon), text input (panel bg, radius 22, placeholder "Frage zu Kapitel 1–N …", Enter sends), send button (42px accent circle). Fixed bottom, clears
  `env(safe-area-inset-bottom)`.
- **`useChatStore`** update: `sendMessage(bookId, chapterIndex, text, speechMode)` → appends user message, adds assistant placeholder in `thinking` state, then (for now) after 600ms replaces it with a mock response. Marks message with `format: 'markdown' | 'prose'` based on
  `speechMode` at call time.
- **`ChapterRow.vue`** update: chat button tap emits `open-chat(chapterIndex)` which `App.vue` handles by mounting `ChatSheet`.

### Tests

- `MarkdownRenderer`: `### Heading` → h4 element; `**bold**` → element with weight 600; `- item` → list item with accent dash.
- `stripMarkdown`: comprehensive round-trip — all formatting stripped, plain words remain.
- `useChatStore`: two chats with different `(bookId, chapterIndex)` keys stay independent; messages in one don't appear in the other. Format captured at send time.
- `ReadAloudButton`: idle state shows "Vorlesen"; toggled state shows "Wird vorgelesen" and equalizer.

### Verification

- Tap a chapter's chat button → sheet slides up from bottom with backdrop
- Empty state shows greeting + 4 chips
- Tap a chip → user message appears, thinking dots appear, mock response appears after ~600ms
- Type a message + Enter → same flow
- Markdown response: headings, bold, bullets render correctly
- Close × → sheet slides back down, backdrop fades
- Open chat on a different chapter → independent message thread (no bleed between chapters)
- Mic toggle: OFF state and ON state visually distinct
- `npm run test:unit` passes

---

## Phase 6 — LLM Integration

**Wire Mistral API: context assembly, SSE streaming, error handling, speech mode prefix, language rule.**

### Rough changes

- **`buildSystemPrompt(book: BookRecord, anchorIndex: number): string`** (`src/llm/context.ts`): assembles the system message: role declaration, book title + author, answer-language rule (book `language`; if `"auto"`, match summary language), spoiler rule (knowledge ends at
  chapter `anchorIndex`), then `seriesRecap` bullets (if present) followed by chapters `0..anchorIndex` each with number, title, and summary bullets. Returns a single string.
- **`buildMessages(history, userText, speechMode, systemPrompt): MistralMessage[]`** (`src/llm/context.ts`): `[{role:'system', content: systemPrompt}, ...history, {role:'user', content: modePrefix + userText}]`. Mode prefix: OFF = "Antworte mit strukturiertem Markdown …"; ON =
  "Die Antwort wird vorgelesen. Antworte in natürlicher gesprochener Prosa …" (exact wording TBD in prompt-building pass — use placeholder).
- **`streamChat(messages, apiKey): AsyncIterable<string>`** (`src/llm/mistral.ts`): `fetch` to Mistral chat completions endpoint with `stream: true`, parses SSE `data:` lines, yields token strings. Throws on non-2xx.
- **`useChatStore`** update: replace mock with real `streamChat`. `sendMessage` calls `buildSystemPrompt` + `buildMessages`, then iterates the async iterable to append tokens. On error: marks assistant message as `error` state, surfaces message in chat. Closes the stream reader
  in a `finally` block (ensures cleanup on unmount).
- **No-key guard**: if `settingsStore.apiKey` is empty, show inline "Bitte API-Schlüssel in den Einstellungen hinterlegen." message instead of sending.
- **`onUnmounted`** in `ChatSheet.vue`: abort any in-flight stream (via `AbortController`).

### Tests

- `buildSystemPrompt`: with `seriesRecap = null` → recap section absent from output; with `seriesRecap = ['…']` → recap section present. Chapters beyond `anchorIndex` absent. Chapter at `anchorIndex` present.
- `buildSystemPrompt`: `language = 'de'` → German language instruction; `language = 'en'` → English; `language = 'auto'` → "match the language of the provided summaries" instruction.
- `buildMessages`: speech OFF → prefix contains "Markdown"; speech ON → prefix contains "Prosa" / no-markdown instruction.
- Context boundary: `anchorIndex = 2`, book has 10 chapters → output contains chapters 1, 2, 3 only (0-indexed 0, 1, 2); chapter 4 absent.

### Verification

- With a valid Mistral API key in Settings: open chat, send a message → tokens stream in, caret blinks, response completes
- Close chat mid-stream → stream aborts (no further tokens appear, no console errors)
- With no API key: send → inline error prompt appears (no network call made)
- Network error (bad key / offline): error message appears in chat, prior messages still visible
- English book → answer arrives in English despite German shortcut wording
- Speech mode ON → response is prose (no markdown headers/bullets)
- `npm run test:unit` passes

---

## Phase 7 — TTS, Series Recap & Polish

**Voxtral TTS, series recap sheet, PWA icons, animation audit, accessibility, and final edge cases.**

### Rough changes

**TTS:**

- **`useTTS` composable** (`src/composables/useTTS.ts`): calls Mistral Voxtral audio endpoint with stripped plain text + voice derived from book `language` (`de` → German voice, `en` → English voice, `auto` → German default). Returns `{ play(), stop(), isPlaying }`. Caller
  holds the `HTMLAudioElement` for cleanup.
- **`ReadAloudButton.vue`** update: replace visual simulation with real `useTTS`. On speech-mode answers: `ChatSheet` auto-calls `play()` when stream finishes.
- Investigate German voice: try `language`/`locale` parameter first; document outcome in code comment.

**Series recap:**

- **`SeriesRecapSheet.vue`**: same slide-up motion as `ChatSheet` (`prc-sin`/`prc-sout`, backdrop). Header: kicker "BISHER IN DER SERIE" (11/700, accent), book title (22/600), subtitle "Was in den vorherigen Büchern geschah" (13, sub), close ×. Body: scrollable bullet list (6px
  accent dot + text 16/1.55/ink, 13px gap). Max height ~85%.
- **`SeriesRecapEntry.vue`** update: wire tap → open `SeriesRecapSheet`.

**Polish:**

- All CSS keyframe animations defined in `src/assets/main.css`: `prc-blink`, `prc-dot`, `prc-eq`, `prc-sin`, `prc-sout`, `prc-fade`, `prc-fadeout`, `prc-pop`, `prc-rise`. (Earlier phases add stubs; this phase ensures all are pixel-correct per spec.)
- Touch target audit: chat button 34px → tap area padded to ≥44px; mic and send are already 42px.
- PWA icons: add `public/icons/192.png` and `public/icons/512.png` (maskable); update `vite.config.ts` manifest.
- `navigator.storage.persist()` call in app init (Dexie setup or `main.ts`).
- Edge case: "Letzte 3 Kapitel" shortcut when anchor chapter is 0 or 1 — gracefully references fewer chapters.
- Final `npm run build` check: no type errors, no missing assets.

### Tests

- `useTTS` language→voice mapping: `de` → German voice ID; `en` → English voice ID; `auto` → German voice ID. (Mock the fetch, assert the voice parameter sent.)
- Series recap entry: only rendered when `book.seriesRecap !== null`.
- "Letzte 3 Kapitel" with anchor=0: prompt references only chapter 1 (no negative chapter references).

### Verification

- Open a chat, receive an answer, tap "Vorlesen" → audio plays, equalizer animates, button shows "Wird vorgelesen"
- Tap stop → audio stops
- Speech mode ON: answer auto-plays when stream completes
- German book: TTS is a German voice (or best available; document any known issue)
- Series recap entry row visible for sequel book, absent for standalone
- Tap series recap entry → sheet slides up, bullet list readable
- Cold-start PWA from iOS home screen: app background (`#F1E9D9`) visible behind notch AND home indicator; no white/cream flash on overscroll
- `npm run build` succeeds with no errors
- `npm run test:unit` passes (full suite)

---

## Testing philosophy

**Test these — pure functions and critical data contracts:**

- `formatStartTime` — used in every chapter row label
- `stripMarkdown` — guards TTS from formatting noise
- `buildRailSubset` — navigation correctness
- `buildSystemPrompt` / `buildMessages` — spoiler-safety is non-negotiable; a bug here leaks future chapters to the LLM
- Dexie store operations (upsert, import, export, clear) — data integrity

**Skip these — too brittle or not unit-testable:**

- Vue component snapshot tests (fragile against visual iteration)
- Animation behavior
- SSE streaming (integration territory; test manually with real key)
- Scroll-spy (DOM geometry in jsdom is unreliable; test manually)
