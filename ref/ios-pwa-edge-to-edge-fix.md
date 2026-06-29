# Fixing iOS PWA Edge-to-Edge Rendering (Notch + Home Indicator Simultaneously)

**Handoff document for Claude Code.** This describes how to make the app render truly fullscreen on iOS — content painted behind the notch/Dynamic Island, the rounded corners, AND the home indicator at the same time — and why previous attempts appeared to allow only one or the other.

---

## TL;DR — The Fix

1. Keep `viewport-fit=cover` and `apple-mobile-web-app-status-bar-style: black-translucent`. Do NOT revert to `default`.
2. **Find and eliminate `height: 100%` and `100dvh` on `html`, `body`, or the root app container.** Use `height: 100vh`. This is almost certainly the root cause (details below).
3. Render the full-bleed background (the wave layer) as `position: fixed; inset: 0;` with an **opaque `background-color`** at its base. Semi-transparent layers stacked on "nothing" let the native fill show through.
4. Make `html`/`body` **non-scrolling** (`overflow: hidden`). Move all scrolling into an inner container (`position: fixed; inset: 0; overflow-y: auto;`). This removes the overscroll/rubber-band region — the only place where the native body-color fill is genuinely uncoverable.
5. **Delete all `body.backgroundColor` color-matching machinery** (the JS that computes a blended wave color and assigns it to `document.body.style.backgroundColor`, including any `router.beforeEach` timing hooks). It becomes unnecessary.

---

## Background: Correcting a Previous Misdiagnosis

A previous analysis concluded there is a hard platform tradeoff:

> `default` status bar style → seamless bottom but dimmed top; `black-translucent` → transparent top but iOS always paints body color into the home-indicator area, and "CSS cannot z-index over the native fill — the fill wins."

**This is incorrect.** The native UIScrollView background layer that iOS paints (sampled from `body.backgroundColor`) sits **behind** the web content layer, not above it. It is only visible where web content is **transparent, absent, or where the document doesn't reach** (overscroll bounce). Opaque web content pixels cover it completely. Fullscreen PWA games use exactly this pattern — game canvases render edge-to-edge behind the notch and home indicator routinely.

The reason "fixed elements stop short of the safe area" in various framework bug reports (Material UI, shadcn, etc.) is usually NOT the native fill winning. It's a much sneakier layout collapse, described next.

## The Real Root Cause: The Height Declaration Trap

This is a documented, widely-reproduced WebKit gotcha. With `viewport-fit=cover` + `black-translucent` active, the value used for full height on the root elements matters enormously:

```css
html, body {
  /* ❌ height: 100%;
     Silently BREAKS viewport-fit=cover entirely. Content never extends
     behind the notch/home indicator. Safari falls back to the non-cover
     layout. Your CSS looks correct; the layout just collapses. */

  /* ❌ height: 100dvh;
     Wrong values on PWA cold start. Only self-corrects after the user
     physically rotates the device portrait → landscape → portrait.
     Cannot be fixed programmatically. */

  /* ✅ height: 100vh;
     The ONLY value correct from cold start. In standalone PWA mode
     there is no browser toolbar, so 100vh == 100dvh == window.innerHeight
     anyway — but only 100vh initializes correctly. */
  height: 100vh;
}
```

**Why this explains the "top OR bottom but never both" symptom:** depending on which height/positioning combination was active during each experiment, the cover layout silently collapsed in one direction or the other. It looked like a platform tradeoff between status-bar styles; it was actually the layout engine bailing out of `viewport-fit=cover`.

### Where to look in the codebase

- `index.html` — viewport meta tag (must contain `viewport-fit=cover`).
- Global CSS / `main.css` / `App.vue` root styles — any `height: 100%`, `min-height: 100%`, `100dvh`, `100svh` on `html`, `body`, `#app`.
- **Tailwind classes**: `h-full` (= `height: 100%`), `min-h-full`, `h-dvh`, `min-h-dvh`, `h-screen` (this one is `100vh`, OK) on the root layout chain.
- Any CSS reset / normalize that sets `html, body { height: 100% }` — very common in boilerplates.
- Vue/Vite PWA plugin templates that may inject their own root styles.

---

## The Target Architecture (App Shell)

```html
<!-- index.html -->
<meta name="viewport"
      content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
```

```css
html, body {
  margin: 0;
  padding: 0;
  height: 100vh;            /* NOT 100% / 100dvh */
  overflow: hidden;         /* body never scrolls */
  overscroll-behavior: none;
}

/* Full-bleed background layer — spans the entire physical screen */
.app-background {
  position: fixed;          /* fixed = relative to the visual viewport,
                               which with viewport-fit=cover IS the full
                               screen incl. both safe areas */
  inset: 0;
  background-color: #faf9f7; /* OPAQUE base — critical. The semi-transparent
                                wave SVGs render on top of this. */
  z-index: 0;
}

/* All scrolling happens INSIDE this container, never on body */
.app-scroll {
  position: fixed;
  inset: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  z-index: 1;
}

/* Interactive content respects safe areas via padding —
   the BACKGROUND goes to the physical edges, the CONTENT does not */
.app-content {
  padding-top: env(safe-area-inset-top, 0px);
  padding-bottom: env(safe-area-inset-bottom, 0px);
  padding-left: env(safe-area-inset-left, 0px);
  padding-right: env(safe-area-inset-right, 0px);
}
```

### Why each piece matters

**`position: fixed` for the background, not `absolute`.** `absolute; inset: 0` is relative to the nearest positioned ancestor — if any ancestor in the chain has collapsed height (see the trap above) or doesn't span the safe areas, the background stops short. `fixed` is relative to the viewport itself and is guaranteed full coverage once `viewport-fit=cover` is actually working.

**Opaque base color on the background layer.** The current wave SVGs have ~0.35 opacity each. Stacked on a container with no background, the native fill shows through the gaps. With an opaque cream base under them, nothing native is ever visible — including under the home indicator. This also dissolves the "the native fill can only be one flat color, but our wave bottom is a gradient" problem: the real wave SVG is now what's painted there.

**Non-scrolling body + inner scroll container.** When the document itself scrolls, rubber-band overscroll reveals the area *beyond* the document — and that region shows the native UIScrollView background (body color). That is the one region opaque content cannot cover, because there's no content there. Freezing the body and scrolling an inner `overflow-y: auto` container means the bounce happens inside the container, over our own fixed background. `overscroll-behavior: none` alone is NOT sufficient on iOS standalone; the structural fix is required.

**Delete the body-color machinery.** With the above in place, `document.body.style.backgroundColor` is never visible anywhere. Remove: the blended-color computation, the `router.beforeEach` hook that updates it, and any related state. Body can keep a static cream as a harmless fallback.

### Wave component placement

Since the background must be `fixed` and screen-wide, it likely needs to move from per-view components into `App.vue` (rendered once, behind `<router-view>`). Per-view props (progress / flip / colors) then need to come from shared state (Pinia store or `provide/inject`) instead of local props. This was previously labeled "Approach B — significant refactor"; it is the reliable approach. If moving it is too disruptive right now, an interim option: keep per-view instances but change them from `absolute inset-0` to `fixed inset-0` with the opaque base — visually identical, and fixes coverage immediately.

---

## Debugging Checklist (On a Physical Device — Simulators Are Unreliable for Safe Areas)

Run these in order. Each isolates one failure mode.

1. **Sanity-check `viewport-fit=cover` is live.** Temporarily set `html { background: hotpink; }` and give the fixed background layer `background: lime`. Launch the PWA from the home screen (cold start, after a re-add if the meta tags changed — iOS caches manifest/meta aggressively; delete the home-screen icon and re-add when in doubt).
   - Lime reaches the very top (behind the clock/notch) and very bottom (behind the home indicator) → cover works; any remaining issue is layering/opacity.
   - Lime stops at the notch line or above the home indicator, hotpink or white visible → cover is broken → hunt the `height: 100%`/`dvh` on the root chain.
2. **Verify insets resolve.** Add a temporary debug overlay printing the measured insets (use a DOM probe, not a CSS variable bridge — the variable bridge has known stale-value WebKit bugs):
   ```js
   function measureEnv(prop) {
     const el = document.createElement('div');
     el.style.cssText = `position:fixed;top:0;left:0;width:0;height:env(${prop},0px);visibility:hidden;pointer-events:none`;
     document.body.appendChild(el);
     const v = el.offsetHeight;
     el.remove();
     return v;
   }
   // Expect on a Face ID iPhone in portrait: top 44–62, bottom 34, left/right 0
   ```
   All zeros in standalone mode → `viewport-fit=cover` is not active (meta tag missing, cached old install, or the height trap).
3. **Check opacity coverage.** With cover confirmed, if a flat cream strip still shows at the bottom: the background layer isn't opaque there, or it isn't `fixed`. Inspect via Safari → Develop → [device] → [PWA] remote inspector; select the background element and confirm its computed box extends to the full screen height (e.g. 852pt on a 14 Pro, not 852 − 34).
4. **Check overscroll.** Scroll hard past the top and bottom. If a flat color flashes during the bounce: the body is still the scroller. Confirm `document.scrollingElement` doesn't move (`window.scrollY` stays 0 while scrolling) — if it moves, the inner-scroll-container refactor isn't complete.
5. **Cold-start test.** Force-quit the PWA, relaunch. iOS has known cold-start timing bugs where `env()` values populate late. If layout is wrong only on cold start and fixes itself on rotation, add the viewport-fit toggle workaround:
   ```js
   // Force WebKit to recalculate env() values without device rotation
   if (window.navigator.standalone) {
     const meta = document.querySelector('meta[name="viewport"]');
     const original = meta.getAttribute('content');
     meta.setAttribute('content', original.replace('viewport-fit=cover', 'viewport-fit=auto'));
     requestAnimationFrame(() => {
       meta.setAttribute('content', original);
     });
   }
   ```
   (Only needed if you read insets in JS or see cold-start layout glitches; the pure-CSS layout above usually doesn't need it.)

---

## Other Things That Can Interfere (Check If the Above Doesn't Fully Resolve It)

- **Stale home-screen install.** Meta tag / manifest changes do NOT apply to an already-installed PWA reliably. Delete the icon, clear Safari website data for the origin if needed, re-add to home screen, then test.
- **`display` in manifest.json.** Should be `"standalone"` (`"fullscreen"` silently falls back to standalone on iOS — fine, but don't expect it to do more).
- **A parent with `transform`, `filter`, `contain`, or `will-change`.** Any of these on an ancestor turns `position: fixed` descendants into being fixed relative to that ancestor instead of the viewport. If the fixed background mysteriously doesn't span the screen, walk up the DOM looking for these properties (Vue transition wrappers sometimes add transforms).
- **Vue `<Transition>` on router views.** During route transitions, transform-based animations can temporarily re-anchor fixed children (previous point). If glitches appear only during navigation, that's why — keep the background outside the transitioned subtree.
- **`100vw` horizontal overflow.** If anything uses `100vw` and a scrollbar context exists, you can get 1–2px horizontal shifts. Prefer `inset: 0` / `width: 100%` on fixed elements.
- **Keyboard.** When the on-screen keyboard opens, iOS resizes/offsets the visual viewport; fixed elements can jump. Out of scope for the background fix, but don't mistake keyboard-induced jumps for safe-area bugs while testing forms.
- **iPadOS.** Safe-area env() behavior on iPadOS 26 windowed mode is broken/different. Scope expectations to iPhone unless iPad is a target.
- **Landscape top dead zone.** Recent iOS versions reserve a touch dead zone along the top edge in landscape that `env(safe-area-inset-top)` does NOT report (returns 0). Don't place interactive elements flush to the top edge in landscape; keep ~20px buffer. Purely a touch issue — backgrounds render fine there.

---

## Acceptance Criteria

- [ ] Cold-start launch from home screen: wave colors visible behind the notch/Dynamic Island AND behind the home indicator, no cream/white strip at either end.
- [ ] Overscroll bounce at top and bottom shows the wave background, never a flat color flash.
- [ ] Route navigation: no flash of wrong color in the safe areas during transitions.
- [ ] All interactive UI (buttons, nav) sits inside the safe areas via `env()` padding.
- [ ] `body.backgroundColor` JS machinery removed; no `router.beforeEach` color hooks remain.
- [ ] No `height: 100%` / `dvh` on `html`, `body`, or root container (incl. Tailwind `h-full`, `h-dvh`).

## References

- WebKit: "Designing Websites for iPhone X" — original `viewport-fit=cover` + `env()` reference: https://webkit.org/blog/7929/designing-websites-for-iphone-x/
- iOS PWA fullscreen guide incl. the height trap, cold-start env() bugs, device inset tables: https://gist.github.com/fozzedout/5e77925381991a9570151550992baf14
- Overscroll/app-shell pattern (scrollable wrapper instead of body scroll): https://www.bram.us/2016/05/02/prevent-overscroll-bounce-in-ios-mobilesafari-pure-css/
