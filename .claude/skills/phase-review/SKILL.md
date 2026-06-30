---
name: phase-review
description: >
  Structured post-phase review for the PlayRecap PWA project. Run this after
  finishing any build phase to catch requirement gaps, code quality issues, and
  regressions before moving on. Invoke as `/phase-review 3` (or whatever phase
  number was just completed). Use this whenever a phase milestone is reached,
  even partially — catching problems early is cheaper than fixing them two phases
  later. Also useful after a fix session to verify the fix didn't introduce new
  issues.
argument-hint: "phase number just completed (e.g. 3). Assumes a git tag `phase-N-done` was created after the previous phase's final commit."
invocation: user
allowed-tools: Read, Grep, Glob, Bash(git diff *), Bash(git log *), Bash(find * -name "*.vue"), Bash(find * -name "*.ts"), Bash(find * -name "*.js")
---

# Phase Review — Phase $ARGUMENTS

You are a reviewer for the PlayRecap PWA. The phase just completed is **Phase $ARGUMENTS**.

Your role here is **reviewer only** — read code, report findings, do not edit anything. The developer will decide what to fix.

---

## Step 0 — Load context

Read the roadmap (wherever it lives — check `ROADMAP.md` or the project root). Extract the task list and milestone for Phase $ARGUMENTS. Note which phases precede it — you'll do a regression check on those too. Everything scoped to phases *after* $ARGUMENTS is out of scope; don't flag missing features that aren't due yet.

For the full feature and design contract, refer to:
- `ref/PlayRecap-Feature-Spec.md` — features, data model, LLM context assembly, storage, offline behavior
- `ref/PlayRecap-Design-Spec.md` — palette tokens, typography, layout, motion, copy

**Determine the diff range.** Each phase ends with a git tag `phase-N-done`. Run:
```
git tag
```
to confirm the previous phase's tag exists (e.g. `phase-2-done` when reviewing Phase 3). Then use `phase-(N-1)-done..HEAD` as the diff range for all git commands in Steps 1 and 2. If Phase $ARGUMENTS is Phase 1 (no prior tag), use the initial commit: `git log --oneline | tail -1` to get the root SHA and diff from there, or simply diff all tracked files.

Remind yourself: each phase is split into multiple steps/commits. The tag ensures you see the *entire* phase in one diff, not just the last commit.

---

## Step 1 — Requirements check

Work through the Phase $ARGUMENTS task list item by item. For each task:

- State the requirement briefly
- Mark it: ✅ implemented / ⚠️ partial / ❌ missing
- For anything not ✅: quote the relevant line from the spec and describe what's actually there instead

Then do a **regression pass**: scan key files from phases 1 through $ARGUMENTS−1 and spot-check that their milestone behaviour still holds. Things break quietly — a store refactor in Phase 3 can silently break the first-run screen from Phase 1.

---

## Step 2 — Code quality

Find the `.vue`, `.ts`, and `.js` files added or modified in Phase $ARGUMENTS using the tag range established in Step 0:
```
git diff --name-only phase-(N-1)-done..HEAD
git diff phase-(N-1)-done..HEAD
```
Fall back to `find` for recently changed files only if git is unavailable.

Look through them for:

**Vue 3 correctness** — missing `:key` on `v-for`, reactivity breaks from destructuring reactive objects, watchers or listeners not cleaned up in `onUnmounted`, props mutated directly instead of emitting.

**Edge cases** — what happens with an empty library (no books imported yet, first-run screen)? With a book whose `cover` is `null` (placeholder rendered in all three sizes: switcher 46px, sheet 56px)? With `seriesRecap: null` (no entry row, not fed to LLM context)? With the "last 3 chapters" shortcut when fewer than 3 chapters precede the anchor? With no API key set (reading still works, AI features prompt to add one)? With a streaming response aborted mid-stream (chat stays in a valid state)? With `lastOpenedAt: null` on a book that has never been opened?

**Code smell** — magic numbers not extracted to constants, logic that appears in two places and belongs in a composable, components over ~200 lines of `<script setup>` (a signal to split), variable names that need a comment to understand.

**Project consistency:**
- Time labels render from the chapter's `start` (seconds) field — never recomputed from the chapter index.
- Chat context array is `chapters[0..N]` only — never includes chapters beyond the anchor.
- `seriesRecap` is always included in chat context when present (prior book is never a spoiler).
- Markdown is stripped to plain text before sending to TTS.
- Speech mode is captured at send time — toggling it later must not restyle existing messages.
- Design-spec color token names are used (`bg`, `panel`, `surface`, `ink`, `sub`, `faint`, `accent`, `accentSoft`, etc.) — no ad-hoc hex values in components.
- No `height: 100%`, `height: 100dvh`, or `min-height: 100dvh` on `html`, `body`, `#app`, or the root `App.vue` container (iOS PWA safe-area trap — see `ref/ios-pwa-edge-to-edge-fix.md`).
- Scrolling only in inner containers (`position: fixed; overflow-y: auto`) — never on body.
- Interactive content uses `env(safe-area-inset-*)` padding; background layers extend to physical edges.
- All IndexedDB access goes through Dexie — no bare `localStorage` or `sessionStorage` calls.
- API key is read from the `settings` store only — never inlined or passed through component props.

Format each finding as:
> **[file:line]** What the problem is → one-sentence suggestion

---

## Step 3 — Security and data integrity

PlayRecap makes direct browser-to-Mistral API calls and renders LLM output, so the surface is worth checking carefully:

- Is `v-html` used anywhere on AI-generated content or user-supplied strings (book titles, chapter titles, bullet text)? Should be `{{ }}` text interpolation only — the markdown renderer is the one exception and must only operate on assistant messages.
- Is the API key ever logged (`console.log`, `console.error`), included in export files, or passed anywhere beyond the `Authorization` header to the Mistral endpoint?
- Is the LLM context array provably sliced to `chapters[0..N]`? Check the message-assembly function: it must not accidentally include a chapter at index N+1 or beyond, even via off-by-one.
- Are `ReadableStream` readers or `EventSource` connections (SSE streaming) closed in `onUnmounted`? Leaking them causes ghost streamed text if a chat is closed mid-stream and reopened.
- Is there a `try/catch` around Dexie operations? IndexedDB throws in private browsing mode on some browsers and when storage is full — a graceful fallback prevents a blank crash screen.
- Are Mistral API error responses surfaced to the user without exposing the raw error object (which may echo back parts of the request, including context)?
- (Phase that adds import/export only) Does the JSON import validate `version` and the shape of `books` before writing to Dexie? A malformed file should warn and bail, not silently corrupt the library.

---

## Step 4 — Summary

| Area | Status | Critical | Minor |
|---|---|---|---|
| Requirements | ✅ / ⚠️ / ❌ | N | N |
| Code quality | ✅ / ⚠️ / ❌ | N | N |
| Security | ✅ / ⚠️ / ❌ | N | N |

**Critical** = causes a bug, data loss, broken milestone, or security issue. Fix before starting Phase $ARGUMENTS+1.
**Minor** = smell or inconsistency. Fine to defer to a polish phase, but log it.

Close with one sentence: either "Safe to proceed to Phase $ARGUMENTS+1" or "Fix the N critical finding(s) above before proceeding."
