Plan: Phase 2 — Reading View (Static)

Context

Phase 1 is complete (types, Dexie DB, Pinia stores, utilities, all tests passing, tagged phase-1-done incoming). Phase 2 delivers the visible reading view: first-run empty state, sticky TopBar with progress bar, and the scrollable chapter list with cover art, chapter rows, and
series recap entry. After this phase you can import a real library.json and read all chapters with correct titles, timestamps, and bullets.

Three steps: atom components → container components → App.vue wiring.

---

Step 1 of 3 — Atom components + tests

Install @vue/test-utils for component tests (npm i -D @vue/test-utils).

New files

src/components/CoverImage.vue

- Props: cover: string | null, title: string, size: 46 | 56 (default 46)
- cover non-null → <img :src="cover"> sized to size×size
- cover null → <div> with background: linear-gradient(135deg, var(--color-accent), var(--color-accent-ink)), centered first letter of title (var(--color-surface), Spectral 600, font-size: size \* 0.48 + 'px')
- Radius: size === 46 ? '9px' : '10px'; shadow: 0 1px 2px rgba(43,38,32,0.06)

src/components/ChapterRow.vue

- Prop: chapter: Chapter; emits: open-chat (no payload — parent reads chapter.index)
- Top to bottom:
  a. Divider <hr> — height 1px, no border, background: var(--color-line), margin: 0 28px 0 24px
  b. Header row — padding: 18px 34px 0 24px, flex justify-between items-start - Left: two adjacent <span>s — "KAPITEL {chapter.index+1}" (11px/700/accent, uppercase, letter-spacing .16em) + " · {formatStartTime(chapter.start)}" (11px/700/faint)
  - Right: 34px circle button (surface bg, 1px line border, accent chat-bubble SVG icon), emits open-chat
    c. Title — padding: 6px 34px 0 24px, 19px/600/ink, line-height 1.3
    d. Bullets — padding: 7px 34px 19px 24px, gap 7px. Each bullet: flex gap-2 items-start; 5px accent circle dot (shrink-0, opacity .85, margin-top 8px) + text (14.5px/400/sub, line-height 1.5)

src/components/SeriesRecapEntry.vue

- No data props; emits open
- Divider <hr> same spec as ChapterRow
- Content row: padding: 17px 34px 17px 24px, flex justify-between items-center, full-row button
  - Left col: "SERIE" (11px/700/faint, letter-spacing .16em) + "Bisher in der Serie" (18px/600/ink italic, overflow ellipsis)
  - Right: inline SVG chevron-right or arrow-right, accent color, 18px

Tests

Two new test files using @vue/test-utils mount():

src/**tests**/components/CoverImage.spec.ts

- cover=null, title="Dune" → rendered text content contains "D"
- cover=null, title="Erben des Imperiums" → text contains "E"
- cover="data:image/png;base64,..." → renders an <img> tag, no letter text

src/**tests**/components/ChapterRow.spec.ts

- mount with { index: 2, start: 65, title: 'Der Angriff', summary: ['Bullet 1', 'Bullet 2'] }:
  - text contains "KAPITEL 3" (1-based)
  - text contains "01:05" (formatStartTime(65))
  - both bullet strings present in DOM
  - chat button present (circle with role=button or <button>)

---

Step 2 of 3 — Container components

src/components/ChapterList.vue

- Prop: book: BookRecord
- Emits: open-chat(chapterIndex: number), open-series-recap
- Template (inside a wrapping div with ref="scrollContainerRef"):
<SeriesRecapEntry v-if="book.seriesRecap !== null" @open="emit('open-series-recap')" />
<ChapterRow v-for="ch in book.chapters" :key="ch.index" :chapter="ch" @open-chat="emit('open-chat', ch.index)" />
<div class="end-marker">Ende des Buches</div>
- End marker style: padding: 32px 0 48px; text-align: center; color: var(--color-faint); font-size: 13px
- defineExpose({ scrollContainerRef }) for Phase 3 scroll-spy

src/components/TopBar.vue

- Props: book: BookRecord, currentChapterIndex: number (default 0)
- Emits: open-switcher
- Element is position: sticky; top: env(safe-area-inset-top, 0px); z-index: 2; background: var(--color-bg) — sticks below the notch as list scrolls
- Switcher row (padding: 2px 18px 10px, gap 12-13px, items-center, full row tappable → emits open-switcher):
  - <CoverImage :cover="book.cover" :title="book.title" :size="46" />
  - Flex col (overflow hidden): title book.title (16.5px/600/ink, whitespace-nowrap overflow-ellipsis) + subtitle "Kapitel {currentChapterIndex+1} von {book.chapters.length}" (12.5px/400/sub)
  - Inline SVG chevron-down (faint, 16px), flex-shrink-0
- Progress bar (directly under switcher row, no padding):
  - Outer container: width 100%, height 3px, background: var(--color-line)
  - Inner fill: height 100%, background: var(--color-accent), width: {progress}%, transition: width .3s ease
  - progress = ((currentChapterIndex + 1) / book.chapters.length) \* 100

src/components/FirstRunScreen.vue

- No props; uses useBooksStore()
- Full-screen centering: position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; background: var(--color-bg)
- Button "Daten importieren": surface bg, 1px line border, accent text, Spectral, border-radius 12px, padding 12px 24px
- Hidden <input type="file" accept=".json" ref="fileInput" @change="onFileChange"> (display none)
- onFileChange: FileReader.readAsText() → JSON.parse() → booksStore.upsertBooks(data.books) — basic only; Phase 4 adds validation + error handling

---

Step 3 of 3 — App.vue wiring + store init

src/App.vue (replace empty <script setup>):

- import { onMounted, computed } from 'vue'
- import { useBooksStore } from '@/stores/books'
- import FirstRunScreen, TopBar, ChapterList from their paths
- const booksStore = useBooksStore()
- onMounted(() => booksStore.init())
- const hasBooks = computed(() => booksStore.sortedBooks.length > 0)
- const activeBook = computed(() => booksStore.activeBook)

Template inside .app-content (keep existing app-bg + app-scroll shell from Phase 1):
<FirstRunScreen v-if="!hasBooks" />
<template v-else>
<TopBar
:book="activeBook!"
:current-chapter-index="0"
@open-switcher="/_ Phase 4 _/"
/>
<ChapterList
:book="activeBook!"
@open-chat="/_ Phase 5 _/"
@open-series-recap="/_ Phase 7 _/"
/>
</template>

activeBook! non-null assertion is safe: v-else branch only renders when hasBooks is true, which means activeBook is non-null (store sets it in init()).

Phase 3 replaces the hardcoded :current-chapter-index="0" with a reactive value from the scroll-spy composable.

---

Key reuse (no reinvention)

- formatStartTime from src/utils/time.ts — ChapterRow formats chapter.start
- useBooksStore (sortedBooks, activeBook, init, upsertBooks) — fully built in Phase 1
- All 16 design tokens in src/assets/main.css — no new tokens needed for Phase 2
- Book, BookRecord, Chapter from src/types/library.ts — used as props throughout

Use inline SVG for the three icons needed (chat-bubble, chevron-down, arrow-right). No icon library dependency — keep bundle lean.

---

Verification

1.  npm run test:unit — all 29 Phase 1 tests + new CoverImage and ChapterRow component tests pass
2.  Open app in browser (dev server): first-run screen visible on empty DB
3.  Click "Daten importieren" → pick a real library.json → chapter list renders
4.  All chapters show correct titles, bullets, and timestamps
5.  cover: null book → gradient placeholder with first letter at 46px (TopBar)
6.  Progress bar shows 1/{n} fill for first chapter
7.  "Ende des Buches" visible after last chapter row
8.  Refresh → Dexie rehydrates books, chapter list reappears without first-run screen
