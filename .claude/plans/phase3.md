Plan: Phase 3 — Navigation Mechanics

Context

Phase 2 is complete (all 4 review findings fixed, 45 tests passing). Phase 3 adds the interactive spine of the reading experience: a scroll-spy composable drives a sliding highlight block + progress bar + chapter rail as the user scrolls.

Critical architectural note from Phase 2 fix: ChapterList's outer div IS the scroll container (scrollContainerRef points to it). useScrollSpy must attach its scroll listener directly to that div — not to app-scroll.

Three steps: composable + row refs + tests → new visual components → full wiring in ChapterList + App.vue.

---

Step 1 of 3 — useScrollSpy composable + row ref collection + tests

New: src/composables/useScrollSpy.ts

// Takes the scroll container and per-chapter row elements.
// Returns currentChapterIndex: the last row whose offsetTop ≤ scrollTop.
export function useScrollSpy(
scrollContainer: Ref<HTMLElement | null>,
rowRefs: Ref<(HTMLElement | null)[]>,
): { currentChapterIndex: Ref<number> }

- Attaches passive scroll listener on scrollContainer in onMounted, removes in onUnmounted
- Rule: iterate rows; currentChapterIndex = last i where rowRefs[i].offsetTop <= scrollContainer.scrollTop. Default 0 if none found.

Update: src/components/ChapterList.vue (row ref collection only — composable called in Step 3)

Add rowRefs:
const rowRefs = ref<(HTMLElement | null)[]>([])

Dynamic ref callback on <ChapterRow> in the v-for:
:ref="(el) => { rowRefs.value[ch.index] = el ? (el as any).$el : null }"

Update defineExpose: { scrollContainerRef, rowRefs }

Tests

src/**tests**/composables/useScrollSpy.spec.ts — mock rows with known offsetTop, set scrollTop on mock container, assert currentChapterIndex:

- scrollTop=0 → index 0
- scrollTop past row 1's offsetTop → index 1
- scrollTop past all rows → last index
- scrollTop exactly at a row boundary → that row's index

Append to src/**tests**/utils/rail.spec.ts — edge cases not yet covered:

- buildRailSubset(1) → [1]
- buildRailSubset(2) → [1, 2]

---

Step 2 of 3 — ScrollHighlight.vue + ChapterRail.vue

New: src/components/ScrollHighlight.vue

Props: top: number, height: number, animate: boolean

Absolutely positioned rectangle inside the scroll container (scroll container needs position: relative):

- position: absolute; left: 8px; right: 6px; border-radius: 14px
- background: var(--color-accent-soft); z-index: 0; pointer-events: none
- CSS transition on top + height: cubic-bezier(.4,0,.2,1) .34s when animate=true, none when false

The animate prop is computed by the parent: |newIndex − prevIndex| ≤ 1 → true (adjacent slide), else false (instant snap for rail jumps).

New: src/components/ChapterRail.vue

Props: totalChapters: number, currentChapterIndex: number, rowRefs: Ref<(HTMLElement|null)[]>, scrollContainer: Ref<HTMLElement|null>

Layout: position: absolute; right: 0; top: 0; bottom: 0; width: 28px; display: flex; flex-direction: column; align-items: center; justify-content: space-between; padding: 8px 0; z-index: 2

Numbers from buildRailSubset(totalChapters) (1-based). Nearest tick to currentChapterIndex + 1 gets: color: var(--color-accent); font-weight: 700; transform: scale(1.18); transition: all .15s ease. All ticks: font-size: 10px; font-variant-numeric: tabular-nums.

Tap → scroll so chapter's bottom aligns to scroll container bottom (spoiler safety):
const row = rowRefs.value[targetIndex]
scrollContainer.value.scrollTop = row.offsetTop + row.offsetHeight - scrollContainer.value.clientHeight

Pointer-capture drag → pointerdown calls setPointerCapture; pointermove maps Y position to nearest tick → scrolls there; pointerup releases.

Magnifier bubble while dragging: position: absolute; right: 28px pill showing the hovered chapter number. Accent bg, var(--color-surface) text, 11px, border-radius 8px.

Tests

src/**tests**/components/ScrollHighlight.spec.ts — verify animate prop controls the CSS transition:

- animate=true → inline style contains cubic-bezier
- animate=false → inline style transition is none

---

Step 3 of 3 — Full wiring: ChapterList + App.vue

Update: src/components/ChapterList.vue

1.  Restructure template — add outer relative wrapper so ChapterRail can be absolutely positioned without scrolling:
<div style="position: relative; flex: 1; min-height: 0; display: flex; flex-direction: column;">
  <div ref="scrollContainerRef" style="flex: 1; min-height: 0; overflow-y: auto; position: relative; -webkit-overflow-scrolling: touch; padding-bottom: env(safe-area-inset-bottom, 0px);">
    <ScrollHighlight :top="highlightTop" :height="highlightHeight" :animate="shouldAnimate" />
    <!-- SeriesRecapEntry, ChapterRow loop, Ende-marker -->
  </div>
  <ChapterRail :total-chapters="book.chapters.length" :current-chapter-index="currentChapterIndex" :row-refs="rowRefs" :scroll-container="scrollContainerRef" />
</div>
1.  scrollContainerRef ref stays on the inner div — defineExpose still works correctly.
1.  Call composable: const { currentChapterIndex } = useScrollSpy(scrollContainerRef, rowRefs)
1.  Compute highlight geometry and animation flag:
    const highlightTop = ref(0)
    const highlightHeight = ref(0)
    const shouldAnimate = ref(false)
    watch(currentChapterIndex, (newIdx, oldIdx) => {
    shouldAnimate.value = Math.abs(newIdx - oldIdx) <= 1
    const row = rowRefs.value[newIdx]
    if (row) {
    highlightTop.value = row.offsetTop
    highlightHeight.value = row.offsetHeight
    }
    })
1.  Add 'chapter-changed': [index: number] to defineEmits; emit in the watch.

Update: src/App.vue

1.  const currentChapterIndex = ref(0)
2.  @chapter-changed="(i: number) => { currentChapterIndex.value = i }" on <ChapterList>
3.  :current-chapter-index="currentChapterIndex.value" on <TopBar> (replaces hardcoded 0)

---

Key reuse

- buildRailSubset at src/utils/rail.ts — already built and tested; used directly in ChapterRail
- scrollContainerRef exposed by ChapterList.vue — the real scroll container after Phase 2 fix
- currentChapterIndex prop already in TopBar.vue — just needs a live value instead of 0

---

Verification

1.  npm run test:unit — all prior 45 tests still pass + new composable/component tests pass
2.  Open app with a real library.json; scroll the chapter list
3.  Highlight block slides smoothly for adjacent chapters, snaps instantly for jumps > 1
4.  TopBar "Kapitel N von N" subtitle and progress bar update as you scroll
5.  Rail ticks on right edge: nearest tick is accented + scaled; others are faint
6.  Tap a rail tick → list scrolls so that chapter's bottom aligns to screen bottom
7.  Drag the rail → magnifier bubble tracks finger and shows chapter number
8.  npm run type-check passes
