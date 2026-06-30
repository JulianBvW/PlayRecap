---
name: explain-changes
description: >
  Produces a guided walkthrough of all uncommitted git changes — ordered by
  reading logic, not alphabetically — so the developer can review diffs in
  VS Code with context and purpose. Run this after any build or fix session,
  before git commit. Use this whenever code has been written and the developer
  wants to understand what changed and why before committing. Pairs with
  VS Code's Source Control diff viewer: Claude explains the narrative, VS Code
  shows the lines.
argument-hint: "phase and step label + brief description (e.g. 'Phase 2 step 1 — chapter list')"
invocation: user
allowed-tools: Bash(git diff --name-only *), Bash(git diff --stat *), Bash(git diff HEAD *), Bash(git status *), Read, Glob
---

# Change Walkthrough

You are producing a guided companion for a developer about to review diffs in VS Code.

They will use VS Code's Source Control view to see the actual line changes. Your job is not to repeat what lines changed — VS Code does that. Your job is to tell them in what *order* to open files, *why* each was changed, and how each one connects to the next. Think of it as the explanation a teammate would give while walking you through their PR.

Keep it concise — this is a companion card, not a design doc. Bullet points over paragraphs.

---

## Step 1 — Collect the diff

Run `git diff --name-only HEAD` and `git status --short`. If git isn't initialised or there are no changes, say so and stop. Also run `git diff --stat HEAD` for a quick sense of which files are large vs trivial.

---

## Step 2 — Determine reading order

Sort by **logical dependency**, not alphabet. The goal is that each file makes sense given what the developer just read before it.

1. **Stores and composables first** — these define the data model and shared logic everything else depends on
2. **Shared/base components second** — things other components import
3. **Feature components third** — the main new things built this session
4. **Views / App shell fourth** — views and `App.vue` assemble components and make most sense after understanding the pieces
5. **Config and tooling last** — `vite.config.ts`, `package.json`, `index.html`, `main.ts`, CSS files etc. are usually small and independent

Note any deleted files briefly at the end.

---

## Step 3 — Produce the walkthrough

One entry per changed file, in the order from Step 2.

---

### $ARGUMENTS — [N] files changed

> Open each file in VS Code's Source Control diff viewer in this order.

---

#### [N]. `path/to/file.vue` — [one-line role summary]

**Why this changed:**
[1–3 bullets. What problem does this solve or what feature does it enable? Be specific to this project, not generic.]

**What to look for in the diff:**
[1–3 bullets. The non-obvious parts only. E.g. "the context slice `chapters.slice(0, anchorIndex + 1)` — this is the spoiler-safety boundary the LLM never crosses" or "the `height: 100vh` not `100%` — see the iOS safe-area fix doc for why this matters". Not "a new function was added" — they can see that.]

**Connects to →** `path/to/next-file.ts`
[One sentence: why open that file next?]

---

[Repeat for each file]

---

### Trivial changes
List files where the diff is purely mechanical (import additions, export additions, minor formatting) that can be skimmed rather than read carefully.

---

### Mental model check

After seeing all the diffs, the key new things to hold in mind are:
[2–4 bullets. The abstractions and decisions introduced this session. E.g. "the chat store keys conversations by `(bookId, chapterIndex)` — switching chapters preserves each thread independently" or "the scroll-spy fires on `scroll` but only updates `currentChapter` when the leading edge of a new chapter crosses the top of the viewport — adjacent vs jump distinction drives the animation branch". These bullets are the most important part of the whole walkthrough — if someone reads nothing else, these should make the changes make sense.]

---

## Step 4 — Coverage check

Re-run `git diff --name-only HEAD` and confirm every file appears somewhere in the walkthrough above — either as a main entry or in the trivial changes list. If anything was missed, add it now. A changed file that gets no mention is a gap.
