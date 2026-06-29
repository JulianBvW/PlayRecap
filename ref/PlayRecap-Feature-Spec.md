# PlayRecap — Feature Specification

A functional spec for **PlayRecap**, a mobile-first PWA that lets you catch up on an audiobook before resuming it after time away. You read short per-chapter summaries and can open a spoiler-safe AI chat about the story so far, optionally spoken aloud for hands-busy/driving use.

This document describes **features, data, and behavior** — *what* the app does and how the parts work together. Visual/layout details (colors, shapes, motion, exact copy) live in the **Design Spec** (`PlayRecap-Design-Spec.md`); the two are meant to be read together. Where structure matters to a feature it's described here at a high level (e.g. "the top bar switches books") and cross-referenced to the design spec.

---

## 1. Concept & scope

- **One book at a time** is shown as one long, scrollable list of **chapter summaries** (chapters are ~5-minute slices of the audiobook).
- The user scrolls to where they left off and reads summaries to refresh memory.
- From any chapter they can open a **chat** bounded to chapters 1…N, so the AI **cannot spoil** later events.
- A **speech mode** generates spoken-prose answers and reads them aloud (Voxtral TTS).
- Books can be **standalone or part of a series**; sequels carry a "previously in the series" recap.

**In scope (v1):** import a prebuilt book library; browse summaries; per-chapter multi-turn chat; shortcuts; speech mode + read-aloud; series recap; data import/export; installable offline-capable PWA.

**Non-goals (v1):** generating summaries in the app (done offline by the pipeline); a ChatGPT-style continuous voice conversation mode; any server/backend; caching or persistence of AI output; cross-device sync.

---

## 2. Architecture & stack

- **Vue 3 (Composition API) + Vite + Tailwind.** Fully static, **no backend**, deployable to any static host.
- **LLM calls go directly from the browser** to the Mistral API (CORS-verified to work). The API key lives on the device.
- **Mistral access via `fetch`** (chat streaming over SSE; TTS via the audio endpoint) — no SDK dependency.
- **Persistence via IndexedDB**, using a wrapper (e.g. Dexie).
- **PWA**: installable to home screen, offline-capable for reading, `vite-plugin-pwa` + `navigator.storage.persist()`.
- **Model: `mistral-large-latest`** for all text generation.

---

## 3. Data model — the book library (input contract)

The app **consumes** a single `library.json` produced offline by the pipeline (`pipeline.py` → `combine.py`). The app never generates this data. Shape:

```json
{
  "version": 1,
  "books": [
    {
      "id": "erben-des-imperiums",
      "title": "Erben des Imperiums",
      "author": "Timothy Zahn",
      "language": "de",                 // "de" | "en" | "auto"
      "chapterSeconds": 300,            // nominal chapter length (informational)
      "cover": "data:image/webp;base64,…",   // or null
      "seriesRecap": ["…", "…"],        // 6–18 bullet strings, or null (standalone/part 1)
      "chapters": [
        { "index": 0, "start": 0,   "title": "…", "summary": ["…", "…"] },
        { "index": 1, "start": 300, "title": "…", "summary": ["…"] }
      ]
    }
  ]
}
```

Field notes:
- `index` is **0-based**; the UI displays chapter number as `index + 1`.
- `start` is the chapter's **start offset in seconds**; the UI formats it (`MM:SS`, rolling to `H:MM:SS` past an hour). **Render from `start`; never recompute from the chapter number** (real offsets can differ from a flat 5-min grid).
- `summary` is an **array of bullet strings** (no bullet characters inside them — the UI renders the markers). `title` is a short chapter title.
- `cover` may be `null` → the UI shows a generated placeholder (Design Spec §3.6).
- `seriesRecap` is a flat bullet list (like a chapter's `summary`) or `null`. Present ⇒ the book is a sequel ⇒ the series-recap entry/sheet is shown.
- `language` drives **answer language and TTS voice** (see §8). `"auto"` means "match the language of the book's text."

---

## 4. Local storage

One **IndexedDB database** with **two object stores**:

| Store | Contents |
|---|---|
| `books` | One record per book = the book object above **plus** a frontend-owned `lastOpenedAt` (ISO timestamp, nullable). Keyed by `id`. |
| `settings` | App settings, incl. the **Mistral API key**. |

Rules:
- **The API key lives in `settings`** (IndexedDB), not `localStorage`. It is device-local.
- **No AI output is ever stored.** Recaps, chat messages, and generated TTS audio are in-memory only and gone on reload/close (see §7.5).
- The **only** frontend-written per-book field is `lastOpenedAt`.
- Request persistent storage (`navigator.storage.persist()`) so the imported library survives storage pressure; installing the PWA also mitigates eviction (esp. iOS).

### 4.1 `lastOpenedAt` behavior
- Set to "now" whenever a book is opened/selected.
- The book switcher list is **sorted by `lastOpenedAt`, most recent first**.
- On app load, the **most-recently-opened book is auto-selected** and shown. (This is book *selection* only — in-book scroll position is never restored; the list opens at the top.)

---

## 5. Data management (Settings → "DATEN")

Four actions (UI in Design Spec §8). Semantics:

- **Add Books (`Bücher hinzufügen`)** — load a `combine.py` `library.json` and **upsert into `books` by `id`**: update existing books' content, add new ones. **Preserve `lastOpenedAt`** on existing books; new books get `lastOpenedAt = null`. This is the normal "I made another book" flow.
- **Import Data (`Daten importieren`)** — **full reset of the `books` store**, then load the given file. **Does not touch `settings`** (the API key survives). Reads `lastOpenedAt` from the file if present.
- **Export Data (`Daten exportieren`)** — write a portable file of the `books` store (content **including `lastOpenedAt`**). **Excludes the API key.** Used for backup/redundancy.
- **Clear all (`Alle Daten löschen`)** — destructive wipe of **everything**, including `settings` (the API key). The nuclear option, distinct from Import's books-only reset.

Any imported/added file uses the `{ version, books: [...] }` shape; `lastOpenedAt` is treated as optional on input. Importing/adding should validate `version` and skip/merge gracefully.

---

## 6. App structure & navigation

A single portrait column (details in Design Spec §2–§4):

- **Top bar** — shows the current book (cover, title, progress) and is tappable to **switch books** (opens the book switcher sheet). Progress reflects the current chapter, which is derived **live from scroll position** and never persisted.
- **Book switcher sheet** — lists all books (recency-sorted, §4.1); tap to switch the active book; a gear opens **Settings**.
- **Settings sheet** — API key field + the four data actions (§5).
- **Chapter list** — the main scrollable body of per-chapter summaries (§7).
- **Chapter rail** — a right-edge chapter index for fast jumping in long books; rail jumps land **spoiler-safely** (the target chapter's bottom aligns to the screen bottom so the next chapter's title stays off-screen — Design Spec §6).
- **Series-recap entry** — for sequels only, a tappable entry above chapter 1 that opens the read-only series-recap sheet (§9).

### 6.1 First run / empty library
Before any books are imported, the app shows a **bare first-run screen**: a plain background with a single, centered **"Daten importieren"** button — no top bar, rail, or chapter list. Tapping it runs the Import Data flow (§5). Once at least one book exists, the normal shell above replaces this screen. The API key is set afterwards in Settings; reading needs no key, and AI features prompt for one when first used.

---

## 7. Reading & chat

### 7.1 Chapter summaries
Each chapter renders its `title` + `summary` bullets and its start time (formatted from `start`). Reading works **fully offline** from IndexedDB.

### 7.2 Opening a chat
Each chapter has a **chat button**; tapping it opens the chat overlay (swipes up from the bottom — Design Spec §9). The chat is **anchored to that chapter N**.

### 7.3 Context & spoiler-safety (hard requirement)
The model receives **only**:
1. The book's `seriesRecap` (if any), as prior-book context, **and**
2. The **chapter summaries from chapter 1 through N** (the anchor chapter).

It must **never** receive summaries/titles for chapters after N, and is instructed not to reveal or speculate beyond N. Context is **summaries only** — never raw transcript (decided: raw is too large and caused hallucination). Message assembly is specified in §8.2.

### 7.4 Multi-turn chat
- The chat is a real conversation: sending another message **resends the prior messages** of that chapter's chat so the model has the thread.
- **Shortcuts:** four one-tap prompts (exact copy in Design Spec §9.2 / §12): summarize up to here, last 3 chapters, list characters so far, key turning points. A shortcut sends its predefined prompt as a normal user message.
- **Free-text input** is also available.
- Answers **stream in** token-by-token (SSE).

### 7.5 Chat lifetime (no persistence)
- A chat's messages are kept **in memory only**, scoped per **(book, chapter)**. Switching chapters/books keeps each chat's own thread during the session.
- **All chats are discarded when the app is closed/reloaded.** Nothing is written to IndexedDB. This is intentional.

---

## 8. Speech mode, TTS & language

### 8.1 Speech-mode toggle
A toggle sits beside the chat input (the mic — Design Spec §9.7). It controls how the **next sent message** is generated:

- **Toggle OFF →** the outgoing user message is **prefixed** with an instruction to answer in **structured Markdown** (headings, bold, bullet lists).
- **Toggle ON →** the outgoing user message is **prefixed** with an instruction that the answer **will be read aloud verbatim**, so it must be **natural spoken prose — no markdown, lists, tables, or special characters.**

Because the instruction is a per-message prefix, mode can change message-to-message; a single chat can interleave markdown and spoken answers.

### 8.2 Message assembly (contract)
For a chat anchored at chapter N of book B, each request is:
1. **System message:** role + book identity (`title`, `author`); **answer-language rule** (answer in B's `language`; if `"auto"`, match the language of the provided summaries); **spoiler rule** (knowledge ends at chapter N; never reveal later events); then the **context**: the `seriesRecap` bullets (labeled as previous-book recap) followed by chapter summaries 1…N (each with its number, title, and bullets).
2. **Conversation history:** the in-memory user/assistant turns for this chat.
3. **New user message:** the mode-prefix (§8.1) + the user's text (or the shortcut's prompt).

The answer's **language is governed by the system rule**, not by the (German) UI or shortcut wording — so an English book yields English answers even from German-worded chips.

### 8.3 Read-aloud (TTS)
- **Every** assistant message — markdown or prose — has a **read-aloud control** (Design Spec §9.6).
- When a message was sent **in speech mode**, its answer is **auto-read-aloud** once it finishes streaming.
- Read-aloud is also available **manually** on any message. Because an older message may be markdown, the app **strips markdown to plain text before sending it to TTS** (so formatting characters aren't spoken).
- Answer format is **fixed at generation time**; toggling speech mode later does **not** restyle existing messages.

### 8.4 TTS provider & voice
- TTS uses **Mistral Voxtral TTS** via the audio endpoint.
- The **voice/language must follow the book's `language`** (German books read by a German voice, English by English) — not the UI language. If `language` is `"auto"`, **default the TTS voice to German** (the primary use case).
- **Open implementation item:** the default Voxtral voices mispronounce German. Resolution order: (a) use a `language`/locale parameter if the endpoint supports forcing German pronunciation; otherwise (b) **voice cloning** (a German voice sample; optionally the book's own narrator, personal use only). This must be settled during implementation.
- Generated audio is **ephemeral** (not cached) — re-listening regenerates it and **requires network** (no offline audio replay).

---

## 9. Series recap

- For sequels (`seriesRecap != null`), an entry above chapter 1 opens a **read-only** sheet showing the recap bullets (Design Spec §5.5, §10).
- The recap is **always included in chat context** (§7.3, §8.2) regardless of the anchor chapter — a finished prior book is never a spoiler, so it's always safe to include.

---

## 10. LLM integration details

- **Provider/transport:** Mistral REST API directly from the browser via `fetch`. Chat uses streaming (SSE); render tokens as they arrive.
- **Model:** `mistral-large-latest`.
- **Auth:** API key from `settings`. If no key is set, AI actions prompt the user to add one in Settings (reading still works without a key).
- **Errors:** surface network/API errors in the chat without losing the conversation; reading the library is unaffected by AI/network failures.
- **Privacy:** the key never leaves the device except in the Authorization header to Mistral; it is excluded from Export (§5).

---

## 11. Offline & PWA

- **Reading summaries works offline** from IndexedDB.
- **All AI features (chat, recap generation, TTS) require network**; there is no offline fallback and no cached audio.
- Installable PWA (home screen); request persistent storage so the library isn't evicted.
- **Web manifest:** name **"PlayRecap"**, `display: standalone`, `orientation: portrait`, theme/background colors taken from the palette (Design Spec §3.1 — background `bg`, theme `accent`), plus app icons (include a maskable icon). The OS install/splash uses these.

---

## 12. Cross-cutting requirements

- **Spoiler-safety is non-negotiable:** never send chapter content beyond the chat's anchor N; rail navigation also avoids revealing the next chapter's heading.
- **Answer + voice language follow the book**, not the UI (UI is German).
- **No AI output persisted; chats and audio are session-only.**
- **`lastOpenedAt` is the only frontend-written data;** everything else in `books` comes from the imported library.

---

## 13. Open items to resolve during implementation

1. **German TTS voice** for Voxtral (language param vs. voice cloning) — §8.4.
2. Exact `library.json` `version` handling / migration policy if the schema evolves.
3. Behavior when an imported file references a book `id` that already exists during **Add Books** (defined as upsert) vs. any conflict signaling to the user.
4. **Prompt wording is authored separately.** The exact system prompt, the four shortcut prompt strings, and the speech/markdown mode prefixes are finalized in a dedicated prompt-building pass — treat the glosses in §7.4 / §8.1 as placeholders, not final copy.
