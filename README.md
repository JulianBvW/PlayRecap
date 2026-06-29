# PlayRecap

A mobile-first PWA for catching up on an audiobook before resuming it after time away. You scroll through short per-chapter summaries, open a spoiler-safe AI chat about the story so far, and can have answers read aloud — built for listening while driving.

German UI. One book at a time. No backend.

---

## What it does

- **Chapter summaries** — a long scrollable list of ~5-minute chapters with titles and bullet-point summaries, imported from a prebuilt `library.json`.
- **Scroll-spy highlight** — a sliding tinted block marks the chapter currently at the top of the viewport.
- **Chapter rail** — an iOS-Contacts-style right-edge index for fast jumping in long books. Rail jumps land spoiler-safely (target chapter bottom aligns to screen bottom so the next chapter title stays off-screen).
- **Per-chapter chat** — context-bounded to chapters 1…N (the chapter you opened it from). The model never sees later chapters, so it cannot spoil.
- **Speech mode** — toggle the mic to get spoken-prose answers instead of markdown; answers auto-play via Mistral Voxtral TTS. Every answer has a manual read-aloud button regardless.
- **Series recap** — for sequels, a "previously in the series" sheet feeds the LLM prior-book context and lets you read a bullet recap yourself.
- **Installable PWA** — works offline for reading (summaries are in IndexedDB); AI features require network.

---

## Stack

| Concern | Choice |
|---|---|
| Framework | Vue 3 (Composition API) + Vite |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`) |
| State | Pinia |
| Persistence | IndexedDB via Dexie |
| PWA | `vite-plugin-pwa` |
| LLM / TTS | Mistral API (`mistral-large-latest`, Voxtral) via `fetch` — no SDK |
| Type checking | TypeScript + `vue-tsc` |
| Tests | Vitest + `@vue/test-utils` |
| Linting | oxlint + ESLint + Prettier |

No backend. LLM calls go directly from the browser to the Mistral API. The API key lives in IndexedDB on the device and never leaves it except as an `Authorization` header to Mistral.

---

## Getting started

```sh
npm install
npm run dev        # dev server at http://localhost:5173
npm run build      # type-check + production build
npm run preview    # preview the production build locally
npm run test:unit  # Vitest
npm run lint       # oxlint + eslint (auto-fix)
npm run format     # prettier
```

---

## Adding books

Books come from a `library.json` produced by the offline pipeline (`pipeline.py` → `combine.py`). To load one into the app:

1. Open the app → tap the book switcher → gear icon → **Daten importieren** (first run) or **Bücher hinzufügen** (subsequent books).
2. Select your `library.json`.

**Import vs Add Books:**
- *Daten importieren* — full reset of the books store, then loads the file. API key is preserved.
- *Bücher hinzufügen* — upserts by book `id`: updates existing books, adds new ones, preserves `lastOpenedAt` on existing entries.

Data shape (`library.json`):
```json
{
  "version": 1,
  "books": [
    {
      "id": "erben-des-imperiums",
      "title": "Erben des Imperiums",
      "author": "Timothy Zahn",
      "language": "de",
      "chapterSeconds": 300,
      "cover": "data:image/webp;base64,…",
      "seriesRecap": ["…"],
      "chapters": [
        { "index": 0, "start": 0,   "title": "…", "summary": ["…"] },
        { "index": 1, "start": 300, "title": "…", "summary": ["…"] }
      ]
    }
  ]
}
```

`index` is 0-based (UI displays `index + 1`). `start` is the chapter's offset in seconds — always render from this value, never recompute from the chapter number.

---

## Design tokens

All palette values are CSS custom properties defined via Tailwind v4's `@theme` in `src/assets/main.css`. Use them as Tailwind utilities (`bg-accent`, `text-ink`, etc.) or directly as `var(--color-accent)` in scoped styles.

Core palette: warm paper background (`#F1E9D9`), terracotta accent (`#B0532A`), Spectral serif font throughout.

Full color and typography spec: `ref/PlayRecap-Design-Spec.md`.

---

## iOS PWA safe areas

The app uses `viewport-fit=cover` + `apple-mobile-web-app-status-bar-style: black-translucent` so content paints behind the notch/Dynamic Island and home indicator.

Critical rules baked into the base CSS (`src/assets/main.css`):
- `html, body { height: 100vh }` — **not** `100%` or `100dvh`, which silently break `viewport-fit=cover` on WebKit.
- `body { overflow: hidden }` — all scrolling is inside an inner `position: fixed; inset: 0; overflow-y: auto` container in `App.vue`. This prevents rubber-band overscroll from exposing the native UIScrollView background.
- Interactive content uses `env(safe-area-inset-*)` padding so it never hides behind the notch or home indicator.

Full diagnosis and debugging checklist: `ref/ios-pwa-edge-to-edge-fix.md`.

---

## PWA icons

A placeholder `favicon.ico` is included. Before shipping, add proper PNG icons to `public/icons/`:
- `192.png` — 192×192, standard
- `512.png` — 512×512, also used as maskable (update `vite.config.ts` manifest accordingly)

---

## Reference docs

| File | Contents |
|---|---|
| `ref/PlayRecap-Design-Spec.md` | Full visual spec: palette, typography, layout, motion, copy |
| `ref/PlayRecap-Feature-Spec.md` | Feature spec: data model, storage, LLM context assembly, speech mode, offline behavior |
| `ref/ios-pwa-edge-to-edge-fix.md` | iOS safe-area architecture, the `height: 100vh` trap, debugging checklist |

---

## Open items

- **German TTS voice** — Voxtral's default voices mispronounce German. Resolution: either a language/locale parameter on the audio endpoint, or voice cloning with a German sample (personal use).
- **Prompt wording** — system prompt, shortcut prompts, and speech/markdown mode prefixes are placeholders until finalized in a dedicated prompt-building pass.
- **PWA icons** — see above.
