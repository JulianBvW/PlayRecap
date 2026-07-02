Plan: Phase 4 — Sheets & Data Management

Context

Phase 3 is complete (tagged phase-3-done, 51 tests passing). TopBar already emits open-switcher but App.vue discards it with () => {}. This phase wires both bottom sheets (book switcher + settings), adds the file import/export/clear flow, and completes the data loop.
CoverImage.vue was built in Phase 2 and already handles the cover: null placeholder — it's reused at 56px in the switcher rows.

Three steps: base sheet chrome → book switcher + app wiring → settings sheet + file operations + tests.

---

Step 1 of 3 — BottomSheet.vue base component + prc-rise / prc-fade stubs

New: src/components/BottomSheet.vue

Props: modelValue: boolean. Emits: update:modelValue.

Internal state: isClosing = ref(false). Watch modelValue going false → set isClosing = true, clear after 300ms. Render when modelValue || isClosing:

 <Teleport to="body">
   <div v-if="modelValue || isClosing">
     <!-- Backdrop -->
     <div
       :class="['prc-backdrop', { 'prc-backdrop--out': isClosing }]"
       style="position: fixed; inset: 0; background: rgba(20,18,15,0.34); z-index: 20;"
       @click="$emit('update:modelValue', false)"
     />
     <!-- Sheet -->
     <div
       :class="['prc-sheet', { 'prc-sheet--out': isClosing }]"
       style="
         position: fixed; left: 0; right: 0; bottom: 0;
         background: var(--color-surface);
         border-radius: 22px 22px 0 0;
         box-shadow: 0 -10px 44px rgba(0,0,0,0.22);
         z-index: 21;
       "
     >
       <!-- Grab handle -->
       <div style="display: flex; justify-content: center; padding: 12px 0 4px;">
         <div style="width: 38px; height: 4px; border-radius: 2px; background: var(--color-line-strong);" />
       </div>
       <slot />
     </div>
   </div>
 </Teleport>

Update: src/assets/main.css

Add stub keyframes and open/close animation classes (Phase 7 refines the cubic-bezier values):
@keyframes prc-rise {
from { opacity: 0; transform: translateY(14px); }
to { opacity: 1; transform: translateY(0); }
}
@keyframes prc-fade {
from { opacity: 0; }
to { opacity: 1; }
}

.prc-sheet { animation: prc-rise .3s cubic-bezier(.22,1,.36,1) forwards; }
.prc-sheet--out { animation: prc-rise .25s ease reverse forwards; }
.prc-backdrop { animation: prc-fade .3s ease forwards; }
.prc-backdrop--out { animation: prc-fade .25s ease reverse forwards; }

Tests

src/**tests**/components/BottomSheet.spec.ts:

- modelValue=true → backdrop div and slot content present in DOM
- modelValue=false → neither renders
- Clicking backdrop emits update:modelValue with false

---

Step 2 of 3 — BookSwitcherSheet.vue + wiring in App.vue

New: src/components/BookSwitcherSheet.vue

Props: modelValue: boolean. Emits: update:modelValue, open-settings.

Uses BottomSheet as outer wrapper. Reads sortedBooks and activeBook from useBooksStore().

Layout inside <BottomSheet>:

- Outer container: max-height: 82vh; display: flex; flex-direction: column; padding: 0 0 env(safe-area-inset-bottom, 0px)
- Header row (padding: 8px 20px 12px): "Deine Hörbücher" (20px/600/ink) left + gear <button> (faint icon, 36px tap area) right → emits open-settings then closes self
- Scrollable book list: overflow-y: auto; flex: 1
- Each row: <button @click="onSelect(book.id)">:
  - Active row: background: var(--color-accent-soft); border-radius: 14px
  - <CoverImage :cover="book.cover" :title="book.title" :size="56" /> (CoverImage already sets radius)
  - Column: title (16/600/ink), author (13/sub), "${book.chapters.length} Kapitel" (13/faint)
  - Checkmark SVG (accent) only when book.id === activeBook?.id
- onSelect(id): calls booksStore.selectBook(id) then emit('update:modelValue', false)

Update: src/App.vue

Add:
import BookSwitcherSheet from '@/components/BookSwitcherSheet.vue'
const showSwitcher = ref(false)
const showSettings = ref(false)

Wire:
<TopBar @open-switcher="showSwitcher = true" ... />
<BookSwitcherSheet
v-model="showSwitcher"
@open-settings="showSwitcher = false; showSettings = true"
/>

 <!-- SettingsSheet placeholder — added in Step 3 -->

---

Step 3 of 3 — SettingsSheet.vue + file validation + operations + tests

New: src/utils/validateLibrary.ts

import type { Book } from '@/types/library'

export interface LibraryFileRaw {
version: number
books: (Book & { lastOpenedAt?: string | null })[]
}

export function validateLibraryFile(raw: unknown): LibraryFileRaw {
if (typeof raw !== 'object' || raw === null)
throw new Error('Ungültiges Dateiformat')
if ((raw as any).version !== 1)
throw new Error(`Unbekannte Version: ${(raw as any).version}`)
if (!Array.isArray((raw as any).books))
throw new Error('Fehlende Bücherliste')
return raw as LibraryFileRaw
}

New: src/components/SettingsSheet.vue

Props: modelValue: boolean. Emits: update:modelValue.

Uses BottomSheet. Reads useBooksStore() and useSettingsStore().

Internal state:
const apiKeyDraft = ref(settingsStore.apiKey)
const fileMode = ref<'upsert' | 'import'>('upsert')
const fileError = ref('')
const confirmingClear = ref(false)
const filePicker = ref<HTMLInputElement | null>(null)

Layout:

- Header: "Einstellungen" (20/600) + close × button → emit('update:modelValue', false), resets confirmingClear
- Section label "LLM-VERBINDUNG" (11/700/faint, uppercase, .16em tracking):
  - <input type="password"> full-width, panel bg, 1px line border, radius 12, placeholder "API-Schlüssel einfügen", v-model="apiKeyDraft", @blur="settingsStore.setApiKey(apiKeyDraft)"
  - Helper text: "Wird nur lokal auf diesem Gerät gespeichert." (12px/faint)
- Section label "DATEN" — four <button> rows (icon chip 36px circle accentSoft/accent + label):
  a. "Bücher hinzufügen" → triggerPicker('upsert')
  b. "Daten importieren" → triggerPicker('import')
  c. "Daten exportieren" → exportData()
  d. "Alle Daten löschen" → handleClear() — danger text, dangerSoft chip
- Inline error: <p v-if="fileError" style="color: var(--color-danger)">{{ fileError }}</p>
- Confirm row (v-if="confirmingClear"): "Wirklich alles löschen?" + Confirm button → calls doConfirmClear()
- Hidden: <input ref="filePicker" type="file" accept=".json" style="display:none" @change="onFileSelected">

Handlers:
function triggerPicker(mode: 'upsert' | 'import') {
fileMode.value = mode; fileError.value = ''; filePicker.value?.click()
}

async function onFileSelected() {
const file = filePicker.value?.files?.[0]
if (!file) return
try {
const data = validateLibraryFile(JSON.parse(await file.text()))
if (fileMode.value === 'upsert') await booksStore.upsertBooks(data.books)
else await booksStore.importBooks(data.books)
fileError.value = ''
} catch (e) { fileError.value = (e as Error).message }
filePicker.value!.value = ''
}

function exportData() {
const json = JSON.stringify(booksStore.exportBooks(), null, 2)
const a = document.createElement('a')
a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
a.download = 'playrecap-backup.json'; a.click(); URL.revokeObjectURL(a.href)
}

function handleClear() { confirmingClear.value = true }

async function doConfirmClear() {
await booksStore.clearAll()
emit('update:modelValue', false)
confirmingClear.value = false
}

Wire in App.vue:
import SettingsSheet from '@/components/SettingsSheet.vue'
<SettingsSheet v-model="showSettings" />

Also wire FirstRunScreen to trigger file picker on import (the first-run "Daten importieren" button should open the same flow). Current FirstRunScreen just shows a button — update it to trigger the import file picker directly (no sheet needed on first run).

Tests

src/**tests**/utils/validateLibrary.spec.ts:

- { version: 2, books: [] } → throws containing "Unbekannte Version: 2"
- { version: 1 } (no books key) → throws containing "Fehlende Bücherliste"
- non-object input → throws "Ungültiges Dateiformat"
- { version: 1, books: [] } → returns the object (no throw)

src/**tests**/stores/books.spec.ts — check if upsert/import/export/clear tests already exist from Phase 1; add any missing:

- Clear all: after booksStore.clearAll(), booksStore.books is [] AND await db.settings.get('apiKey') is undefined

---

Key reuse

- CoverImage.vue (src/components/CoverImage.vue) — already handles cover: null placeholder; pass :size="56" for switcher rows
- useBooksStore (src/stores/books.ts) — sortedBooks, activeBook, selectBook, upsertBooks, importBooks, exportBooks, clearAll all ready
- useSettingsStore (src/stores/settings.ts) — apiKey, setApiKey ready
- db (src/db/index.ts) — needed only in the clear-all test to verify settings table empty

---

Verification

1.  npm run test:unit — all 51 prior tests pass + new tests pass
2.  Tap TopBar → BookSwitcherSheet slides up with backdrop and prc-rise animation
3.  Tap a different book → sheet closes, TopBar title updates
4.  Tap gear → BookSwitcherSheet closes, SettingsSheet opens
5.  Type an API key → close and reopen settings → key persists
6.  "Bücher hinzufügen" → file picker, pick a library.json → books list grows
7.  "Daten importieren" → full reset, old books gone
8.  "Daten exportieren" → .json downloads; open it; no apiKey field anywhere
9.  "Alle Daten löschen" → first tap: confirm row appears; second tap: app returns to first-run screen
10. Tap backdrop → sheet closes
11. npm run type-check passes
