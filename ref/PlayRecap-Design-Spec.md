# PlayRecap — Frontend Design Specification

A design-focused, implementation-ready spec for **PlayRecap**, a mobile-first PWA for catching up on an audiobook before resuming it after time away. German UI. Used mostly on a phone, often right before or during a drive.

This document describes layout, look, interactions, motion, and copy. It deliberately omits data sourcing — wire the UI to your real chapter/recap/LLM data sources. Where the spec says "the chapter summary," that is whatever your backend provides per chapter (a short title plus a list of bullet points).

---

## 1. Product concept

- One book at a time is shown as **one long, scrollable list of chapter summaries**. Each book is split into roughly **5-minute "chapters"** (each chapter's exact start time comes from the data — see §5.2).
- The user scrolls (or uses the right-edge rail) to where they left off and reads short per-chapter summaries to refresh their memory.
- Any chapter exposes a **chat** that is context-bounded to **chapters 1…N** (N = the chapter the chat was opened from). The LLM only ever receives content up to that chapter, so it **cannot spoil** future events.
- A **voice mode ("Sprachmodus")** lets answers be generated as plain spoken prose and read aloud — built for listening while driving.

Design north star: **a calm, premium reading app**, not a dashboard. Content-first, generous serif typography, warm "paper" palette, restrained but deliberate motion.

---

## 2. Platform & layout model

- **Mobile-first PWA**, portrait orientation, designed for typical phone widths and full device height.
- Single full-height column: a fixed top region (book switcher + progress), a flexible scrolling body (the chapter list), and overlays (bottom sheets) that animate in over the whole screen.
- Respect device safe-area insets — content sits below the OS status bar at the top and above the home indicator (`env(safe-area-inset-bottom)`) at the bottom; the chat input bar in particular must clear the bottom inset.

### 2.1 Empty state (no library yet)

Before any book has been imported, the app shows a bare screen: the plain app background (`bg`) with a single **"Daten importieren"** button **centered** (standard button styling — `surface` fill, 1px `line`, `accent` label) and nothing else — no top bar, rail, or chapter list. Tapping it runs the import flow; once at least one book exists, the normal shell (§4–§6) replaces this screen.

---

## 3. Design language

### 3.1 Color palette (warm editorial / "paper")

| Token | Value | Use |
|---|---|---|
| `bg` | `#F1E9D9` | App background; also the background of non-highlighted chapter rows |
| `panel` | `#F6EFE0` | Recessed fills (input fields, track backgrounds) |
| `surface` | `#FCF8F0` | Raised surfaces: bottom sheets, buttons, chips |
| `ink` | `#2B2620` | Primary text |
| `sub` | `#6E6457` | Secondary text (bullets, subtitles) |
| `faint` | `#A99C88` | Tertiary text, inactive rail numbers, meta |
| `line` | `rgba(43,38,32,0.11)` | Hairline dividers, borders |
| `lineStrong` | `rgba(43,38,32,0.20)` | Grab handles, stronger separators |
| `accent` | `#B0532A` | Terracotta — primary accent (chapter numbers, dots, buttons, highlight tint base) |
| `accentInk` | `#7A3417` | Darker accent for text on tinted backgrounds |
| `accentSoft` | `rgba(176,83,42,0.10)` | The **highlight tint** + soft accent fills |
| `accentSoft2` | `rgba(176,83,42,0.20)` | Accent borders, progress track on tint |
| `danger` | `#B23A2E` | Destructive action ("Alle Daten löschen") |
| `dangerSoft` | `rgba(178,58,46,0.10)` | Destructive icon chip background |
| `userBubble` | `#2B2620` | Chat user message bubble background |
| `userInk` | `#FCF8F0` | Chat user message text |

Single dominant palette, light theme. Do not introduce new hues; derive any needed shade from `accent` via opacity.

### 3.2 Typography

- **One typeface: Spectral (serif)**, used for both display and body — this is core to the book-like, premium feel. Weights used: 400, 500, 600, 700 (+ 400 italic available). Load via Google Fonts.
- Type scale (size / weight / notes):
  - Status time: 14 / 700
  - Book switcher title: 16.5 / 600, single line, ellipsis
  - Book switcher subtitle ("Kapitel X von N"): 12.5 / 400, `sub`
  - **Chapter label** ("KAPITEL N · MM:SS"): 11 / 700, uppercase, letter-spacing `.16em`, color `accent`; the time portion is `faint` / 600
  - Chapter title: 19 / 600, line-height 1.3
  - Chapter bullets: 14.5 / 400, line-height 1.5, color `sub`
  - Sheet titles ("Deine Hörbücher", "Einstellungen"): 20 / 600
  - Chat header — book: 12.5 / 400 `faint`; chapter ("Kapitel N"): 22 / 600
  - Chat empty greeting: 20 / 600
  - Reading answer (markdown): 16 / 400, line-height 1.62; `h4` headings 18 / 600
  - Spoken answer (prose): 16 / 400, line-height 1.7
  - Chips / read-aloud label: 13–14 / 600
  - Input field / settings rows: 15 / 400
  - User bubble: 15 / 1.45
  - Rail numbers: 10, tabular numerals

### 3.3 Spacing, radii, shadows

- Radii: bottom sheets `22px` (top corners only), buttons circular (`50%`), pills/chips `999px`, input `22px`, highlight block `14px`, square covers `9–10px`, magnifier bubble `20px`, settings icon chips `10px`.
- Shadow (subtle, warm): `0 1px 2px rgba(43,38,32,0.06)` for raised buttons/chips. Sheets use a soft upward shadow `0 -10px 44px rgba(0,0,0,0.22)`. Magnifier `0 12px 32px rgba(0,0,0,0.28)`.
- Backdrops (behind sheets): `rgba(20,18,15,0.34)`, full-bleed, `z-index: 20`; sheets sit at `z-index: 21`.

### 3.4 Iconography

Thin line icons, `stroke-width` 1.8–2, round line caps/joins, `stroke: currentColor` (so they inherit the contextual color). Icons used: chat bubble, chevron-down, close (×), gear, microphone, speaker, stop (filled square), play/pause, send (up arrow), check, book-with-plus (add books), file-down (import), file-up (export), trash, chevron-right, arrow-right (series recap). No filled illustrations, no emoji.

### 3.5 Motion principles

Motion is purposeful and quiet: entrance reveals, the streaming answer, the sliding highlight, the rail magnifier, and sheet transitions. Easing for "settling" motions is `cubic-bezier(.22,1,.36,1)`; for highlight glide `cubic-bezier(.4,0,.2,1)`; exits use ease-out/ease-in as noted. Never animate gratuitously.

### 3.6 Cover art & fallback

Covers are square, per-book images supplied by the data, but a book **may have no cover**. When it doesn't, render a **generated placeholder** instead of an empty box: a soft gradient in the accent family — echoing the highlighted-chapter tint (e.g. `accent` → `accentInk`) — with the **first letter of the book title** centered in `surface`/white, serif, large, weight 600. Use this same placeholder everywhere a cover appears (compact switcher 46px, book sheet 56px), scaling the letter to the cover size.

---

## 4. Top region (always visible)

### 4.1 Book switcher (compact)

A full-width tappable row (opens the **Book switcher sheet**):
- **Square cover** 46 × 46, radius 9, subtle drop shadow. Cover art is a per-book image; when the book has no cover, use the generated placeholder (§3.6).
- Column: book **title** (16.5 / 600, ellipsis) over **subtitle** "Kapitel {current} von {total}" (12.5, `sub`).
- Trailing **chevron-down** (faint).
- Row padding ~`2px 18px 10px`; 12–13px gap between cover and text.

### 4.2 Progress bar

Directly under the switcher: a 3px track (`line`) with an `accent` fill whose width = `currentChapter / totalChapters`. Width transitions `width .3s ease` as the current chapter changes.

---

## 5. Chapter list (main body)

A vertical scroll container filling the remaining height. The user can scroll it freely (touch / wheel) — scrolling is **never** locked to the rail.

Each chapter summary is whatever the backend provides for that chapter: a short title and a list of bullet points; the layout adapts to any bullet count. For books that are part 2+ of a series, a **series-recap entry** sits above chapter 1 (§5.5).

### 5.1 Chapter row anatomy (top → bottom)

1. **Divider** — 1px `line`, inset `margin: 0 28px 0 24px` (left and right padding so it never runs under the rail numbers and never looks like it strikes through a rail digit).
2. **Header row** (space-between):
   - **Left — chapter label**: `KAPITEL {n} · {MM:SS}`. The "KAPITEL n" part is accent caps; the time is the muted (`faint`) portion after a middle dot. See §5.2.
   - **Right — chat button**: a 34px circle, `surface` background, 1px `line` border, `accent` chat-bubble icon, subtle shadow. Opens the chat for this chapter (§9).
3. **Chapter title** — 19 / 600, line-height 1.3, `ink`.
4. **Bullets** — a list (gap 7). Each item: a 5px `accent` dot (`margin-top: 8px`, opacity .85, non-shrinking) + bullet text (14.5 / 1.5, `sub`).

Row padding `18px 34px 19px 24px` (extra right padding reserves space for the rail). Rows are full-bleed (no card border/background of their own) — separation comes from the inset divider and the sliding highlight.

### 5.2 Chapter start time

Each chapter row shows its **start offset** in the book. This value comes straight from the data — every chapter carries a numeric `start` in **seconds** — and the UI must **render from that**, never recompute it from the chapter number. (Chapters are nominally ~5 minutes apart, but the real offset can differ, so the provided `start` is authoritative.)
- Format the provided seconds as `MM:SS`, rolling into `H:MM:SS` once past one hour. Examples: `00:00`, `05:00`, `10:00`, `1:00:00`.
- Times appear **only in the main list label**, never in the chat view.

### 5.3 Scroll-spy highlight (the "current chapter" marker)

A single **sliding tinted block** marks the chapter currently in view. This replaced any persisted "last heard" marker — it is purely derived from scroll position and is not persisted.

**Visual**
- A rounded rectangle filled with `accentSoft`, radius 14, inset `left: 8px; right: 6px`, rendered **behind** the row content (overlay `z-index: 0`; row content `z-index: 1`). It spans exactly the current chapter row's box (its top and height).

**Which chapter is "current" (exact rule)**
- The current chapter is the one whose **start (top edge) is the topmost start still on screen** — i.e. the first chapter row whose top is at or below the viewport's top edge.
- The moment the current chapter's **start scrolls above the top edge** (off screen), the **next** chapter (whose start is now the topmost visible one) becomes current. Equivalently: a chapter is highlighted only while its start line is visible.
- This applies identically no matter how the user scrolled there: finger, wheel, or rail.

**Motion**
- When the current chapter changes to an **adjacent** one, the highlight block **animates its `top` and `height`** to the new row: `transition: top .34s cubic-bezier(.4,0,.2,1), height .34s cubic-bezier(.4,0,.2,1)`. It reads as the highlight physically sliding to the next chapter.
- On a **large jump** (e.g. a rail jump spanning many chapters), the block **snaps** (no transition) to avoid a long swoop across the page.

The same "current chapter" value drives the top progress bar and the rail's highlighted number.

### 5.4 Session & persistence

The app does **not** track or restore reading position *within* a book across reloads. On open, the chapter list starts at the beginning of the book. The "current chapter" (used by the progress bar and the rail highlight) is derived **live** from scroll position during a session only — it is never saved. Consequently the book selector shows only each book's total chapter count, with **no** "last chapter" indicator.

**Book-level recency (the one thing that *is* remembered).** Each book stores a `lastOpenedAt` timestamp, set to "now" whenever that book is opened. On app load, the **most-recently-opened book is auto-selected**, and the book switcher list is **sorted by `lastOpenedAt`** (most recent first, §7). This is purely *which book* is shown — it does **not** restore the in-book scroll/chapter position, which always starts at the top per the rule above.

### 5.5 Series-recap entry row (sequels only)

For books that are **part 2 or later** of a series, a single row sits **above chapter 1**, mirroring a chapter row's placement (preceded by the same inset divider) but deliberately stripped down:
- It is a button, not a chapter: **no** chapter number, **no** time, **no** chat button, **no** bullets — and the scroll-spy highlight never targets it (it is not a chapter row, so it is skipped by the current-chapter logic).
- Content: a kicker **"SERIE"** (11 / 700, `.16em`, `faint`) over an **italic** title **"Bisher in der Serie"** (18 / 600 italic, `ink`, single line with ellipsis), and a trailing **arrow-right** in `accent`.
- Row padding ~`17px 34px 17px 24px`; transparent background; full row is tappable.
- Tapping it opens the **series-recap sheet** (§10.2). Standalone / part-1 books do not render this row.

---

## 6. Chapter rail (right-edge index)

An iOS-Contacts-style index, but for chapter numbers. This is the primary navigation for books with many chapters.

**Anatomy**
- Absolutely positioned at the right edge, ~22px wide, inset `top/bottom: 10px`, vertically distributed column of chapter numbers.
- Show a **representative subset** of numbers so they stay readable: a regular step (~`round(total / 13)`), always including the first chapter and the last. Numbers are 10px tabular numerals, `faint`.
- The tick **nearest the current chapter** is emphasized: `accent`, weight 700, `transform: scale(1.18)`, with a `.15s` transition.

**Interaction**
- **Drag** along the rail or **tap** a number to jump.
- During a drag, a **magnifier bubble** appears just left of the finger: a 62px squircle (radius 20), `accent` background, white, 26px serif chapter number, with a soft shadow and a quick pop-in (`prc-pop`). It tracks the finger's vertical position and shows the target chapter.
- Use pointer capture so the drag keeps tracking even if the finger strays off the rail.

**Spoiler-safe alignment (important)**
- Rail jumps (drag and tap) scroll so the **bottom of the target chapter aligns to the bottom of the screen**. This keeps the *next* chapter's heading off-screen, so the user is not spoiled by a future chapter title while landing on their target.
- (Programmatic top-alignment is used elsewhere; only rail-driven navigation uses this bottom-alignment. The list opens at the start of the book — there is no saved position to restore.)

---

## 7. Book switcher sheet

A bottom sheet listing the user's audiobooks (the app supports several).

- Grab handle (38 × 4, `lineStrong`, centered) at the top of every sheet.
- Header row: title **"Deine Hörbücher"** (20 / 600) on the left, a **gear** button (settings, `faint`) on the right.
- Book rows: **square cover** 56 × 56 (radius 10; generated placeholder per §3.6 when no cover) + column (title 16 / 600, author 13 `sub`, and a `faint` meta line showing the book's **total chapter count** only — e.g. “N Kapitel”, with no last-position) + a `accent` **check** on the currently-open book. The active row uses an `accentSoft` background and 14px corner radius.
- **Ordering:** rows are sorted by `lastOpenedAt`, most-recently-opened first (see §5.4). On app launch the top/most-recent book is the one shown in the switcher.
- Max height ~82% of the frame; the list scrolls inside.

---

## 8. Settings sheet

Opened from the gear in the Book switcher sheet. Same sheet chrome (grab handle, title row with a close ×).

- Title **"Einstellungen"**.
- Section **"LLM-VERBINDUNG"** (group label: 11 / 700, uppercase, `.16em`, `faint`):
  - **API key** field — full-width input, `type=password`, placeholder `"API-Schlüssel einfügen"`, `panel` background, 1px `line`, radius 12. Helper text below in `faint`: `"Wird nur lokal auf diesem Gerät gespeichert."`
- Section **"DATEN"** — list rows, each = a rounded icon chip (`accentSoft` bg / `accent` icon) + label:
  - **"Bücher hinzufügen"** (book-with-plus icon) — entry to the add-audiobooks flow; sits at the **top** of the section.
  - **"Daten importieren"** (file-down icon)
  - **"Daten exportieren"** (file-up icon)
  - **"Alle Daten löschen"** (trash icon) — rendered in `danger` with a `dangerSoft` icon chip; this is the destructive row.

Product behaviors (design-relevant): the API key persists locally on the device; export produces a portable data file of the app's local data; clear removes the app's local data only. The app does **not** persist or restore reading position (see §5.4).

---

## 9. Chat overlay — the key interaction

Opened from a chapter's chat button. The chat is **context-bounded to chapters 1…N** (N = that chapter). Make that bound visible/implicit through the header (the chapter number), and ensure the backend only receives content up to N — no future chapters.

### 9.1 Sheet & header

- Bottom sheet, **95% height**, `surface` background, top radius 22, grab handle.
- **Header** (bottom border): a column with the **book title** (12.5, `faint`) over **"Kapitel N"** (22 / 600). A **close ×** button (34px circle, `panel` bg, `sub` icon) sits at the top-right. Generous header padding (~`12px 16px 14px 20px`).

### 9.2 Empty state

- A short serif greeting **"Was möchtest du wissen?"** (20 / 600).
- **Shortcut chips** (wrapping pill buttons: 1px `line`, `surface` bg, `ink` text, radius 999, ~9px gap):
  1. **"Bis hier zusammenfassen"** — summarize everything up to chapter N
  2. **"Letzte 3 Kapitel"** — summarize the last three chapters
  3. **"Figuren auflisten"** — list characters encountered so far and who they are
  4. **"Wichtigste Wendungen"** — key turning points so far
- The user can also type a free-text question.

### 9.3 Messages

- **User message**: right-aligned bubble, `userBubble` background, `userInk` text, radius `16 16 5 16`, max-width 80%, 15 / 1.45.
- **Assistant message**: full-width reading text (no bubble).

### 9.4 Answer format — driven by speech mode at send time

Each answer's format is fixed **when it is generated**, based on whether speech mode is on at that moment. Toggling speech mode afterward **does not** restyle existing messages — it only affects newly generated ones (it changes the instruction/prefix sent to the LLM):

- **Speech mode OFF → Markdown (for reading).** Render `### ` headings (as 18 / 600 serif `h4`), `**bold**` (600, `ink`), and `- ` bullets (custom list: each item indented, with a leading `accent` en-dash marker). Body 16 / 1.62.
- **Speech mode ON → Plain spoken prose (for listening/TTS).** No markdown; render as plain paragraphs, 16 / 1.7. The generation prompt asks for natural spoken prose with no formatting.

### 9.5 Streaming

- On send, show a brief **thinking** state: three `accent`/`faint` dots with a staggered bob (`prc-dot`).
- Then the answer **streams in token-by-token**, appending words progressively, with a **blinking accent caret** (8 × 18, radius 1, `prc-blink`) at the end while streaming.
- Keep the message list pinned to the bottom as content grows.

### 9.6 Read-aloud (on every answer)

Every assistant answer — markdown *or* prose — gets a **read-aloud control** below it:
- A pill button (the "iconText" style): `surface` bg, 1px `line`, `accent` text, radius 999, ~13px. Idle: **speaker icon + "Vorlesen"**.
- **Playing**: label becomes **"Wird vorgelesen"**, the leading icon becomes a **stop square**, a small **animated equalizer** (a row of bars pulsing via `prc-eq`) appears, and the button background shifts to `accentSoft`.
- A subtle progress indication advances while "playing"; tapping again stops.
- **Auto-activation**: when speech mode is ON, the read-aloud **starts automatically** as soon as a new answer finishes streaming. (In the real app, this control triggers TTS playback.)
- **Markdown is stripped before TTS.** Because read-aloud can be invoked on a markdown answer (the mode may have changed since it was generated), the control first **strips markdown to plain text** — headings, bold, bullet/dash markers, links, code/backticks, tables — so formatting characters are never read aloud.

### 9.7 Input bar (bottom)

A fixed bar (top border, `surface` bg), three controls left→right:
1. **Mic = speech-mode toggle.** Round 42px. OFF: `surface` bg, `accent` mic icon, 1px `line`. ON: `accent` bg, white icon. No text label (the icon carries the meaning).
2. **Text input** — flexible, `panel` bg, 1px `line`, radius 22, placeholder `"Frage zu Kapitel 1–N …"`. **Enter sends.**
3. **Send button** — 42px `accent` circle, white up-arrow.

### 9.8 Open / close animation

- **Open**: the sheet **slides up from the bottom** — `translateY(100%) → 0`, `~.34s cubic-bezier(.22,1,.36,1)`. Backdrop fades in over the whole screen (`prc-fade`, ~.22s).
- **Close**: the sheet **slides back down** — `translateY(0) → 100%`, `~.3s cubic-bezier(.4,0,1,1)`, and the backdrop fades out. The sheet must **remain mounted through the exit animation**, then unmount (it should not just vanish). Use a transient "closing" state that delays removal by the animation duration (~300ms).

---

## 10. Series recap (sequels only)

For a book that is **part 2 or later** of a series, the backend supplies a `seriesRecap` — a list of roughly **6–18 bullet points** summarizing the previous book(s). Standalone books and part 1 have none and show nothing extra. The recap exists primarily to feed the LLM the prior-book context (so chat answers in a sequel can reference earlier events), but the user can also read it directly for a quick refresher.

### 10.1 Entry point

The **series-recap entry row** above chapter 1 (see §5.5) is the only entry point.

### 10.2 Recap sheet

Tapping the entry row opens a bottom sheet using the **same slide-up motion as the chat** (`prc-sin` in, `prc-sout` out, backdrop fade, and the same delayed-unmount on close). It is **read-only** — no chat, no input bar, no per-bullet actions.
- Sheet chrome: grab handle at the top; `surface` background; top radius 22; max height ~85%.
- **Header** (bottom border): kicker **"BISHER IN DER SERIE"** (11 / 700, `.16em`, `accent`) over the **book title** (22 / 600, `ink`), with a subtitle **"Was in den vorherigen Büchern geschah"** (13, `sub`). A close × (34px circle, `panel` bg, `sub` icon) at the top-right.
- **Body**: a scrollable bullet list in comfortable reading type — each item is a 6px `accent` dot (margin-top ~9, opacity .85, non-shrinking) + text (16 / 1.55, `ink`), ~13px gap between items.

---

## 11. Motion / keyframes reference

| Name | What | Definition (essentials) |
|---|---|---|
| `prc-blink` | Streaming caret | opacity 1 → 0 at 50%, `1s steps(1) infinite` |
| `prc-dot` | Thinking dots | opacity .25/translateY(0) → opacity 1/translateY(-3px) at 40%, staggered delays (0 / .15s / .3s), `1.2s ease-in-out infinite` |
| `prc-eq` | Read-aloud equalizer bars | `scaleY(.3) → 1 → .3`, per-bar varying duration/delay, infinite |
| `prc-sin` / `prc-sout` | Chat & series-recap sheets open / close | `translateY(100% ↔ 0)`; in `.34s` settle ease, out `.3s` ease-in, `forwards` on exit |
| `prc-fade` / `prc-fadeout` | Backdrops | opacity 0↔1; exit uses `forwards` |
| `prc-pop` | Rail magnifier bubble | opacity 0 + `scale(.6) → scale(1)`, with `translateY(-50%)` preserved, `~.14s` |
| `prc-rise` | Book / settings sheets | opacity 0 + `translateY(14px) → 0`, `~.3s cubic-bezier(.22,1,.36,1)` |
| Highlight slide | Scroll-spy block | `transition: top/height .34s cubic-bezier(.4,0,.2,1)` for adjacent moves; none (snap) for big jumps |

Custom list scrollbars are hidden (no visible scrollbar in the chapter list, sheet lists, or chat body).

---

## 12. German copy deck

- Book switcher subtitle: `Kapitel {current} von {total}`
- Book sheet title: `Deine Hörbücher`
- Settings: title `Einstellungen`; groups `LLM-VERBINDUNG`, `DATEN`; rows `Bücher hinzufügen`, `Daten importieren`, `Daten exportieren`, `Alle Daten löschen`; API placeholder `API-Schlüssel einfügen`; helper `Wird nur lokal auf diesem Gerät gespeichert.`
- Chapter label: `KAPITEL {n} · {time}` (time = `MM:SS`, or `H:MM:SS` past one hour; formatted from the chapter's `start` seconds)
- List end marker: `Ende des Buches`
- Chat header: book title + `Kapitel {n}`
- Chat greeting: `Was möchtest du wissen?`
- Chips: `Bis hier zusammenfassen`, `Letzte 3 Kapitel`, `Figuren auflisten`, `Wichtigste Wendungen`
- Input placeholder: `Frage zu Kapitel 1–{n} …`
- Read-aloud: idle `Vorlesen`, playing `Wird vorgelesen`
- Book selector row meta: `{total} Kapitel`
- Series-recap entry row: kicker `SERIE`, title `Bisher in der Serie`
- Series-recap sheet: kicker `BISHER IN DER SERIE`, subtitle `Was in den vorherigen Büchern geschah`

---

## 13. Accessibility & device notes

- Touch targets: mic and send are 42px; the chat-open button is 34px — consider padding its tap area to ≥44px for the driving/one-handed context. Rail numbers are intentionally small but the whole rail is a continuous drag target with the magnifier for feedback.
- Voice mode exists specifically for hands-busy / driving use — keep the mic toggle and the read-aloud control prominent and easy to hit.
- Maintain text contrast: body text uses `ink`/`sub` on the warm `bg`/`surface`; avoid placing `faint` text on tinted (`accentSoft`) backgrounds for anything essential.
- The whole experience is a portrait phone column; sheets are bottom-anchored and thumb-reachable.

---

## 14. Build order suggestion

1. Tokens (color, type, spacing, radii, shadows) + Spectral font.
2. App shell: top region (switcher + progress) + scrolling chapter list with row anatomy and the inset divider.
3. Chapter start-time labels.
4. Scroll-spy current-chapter logic + the sliding highlight block (get the "topmost-visible-start" rule and adjacent-vs-jump animation right).
5. Chapter rail: subset numbers, nearest-tick emphasis, drag/tap, magnifier, bottom-aligned spoiler-safe jumps.
6. Book switcher sheet + Settings sheet (with sheet open/close chrome).
7. Chat overlay: header, empty state + chips, message list, markdown vs prose rendering, token streaming + caret, read-aloud control + equalizer, mic/speech-mode toggle, input + send, slide open/close with delayed unmount.
8. Series recap: the entry row above chapter 1 for sequels, and the read-only recap sheet (reuse the chat slide-up/close motion).
9. Wire chat context to chapters 1…N and the speech-mode prefix behavior; feed the series recap (when present) as prior-book context to the LLM.
