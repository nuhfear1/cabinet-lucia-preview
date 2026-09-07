# Early-scroll performance investigation

Date: 2026-09-07  
Base: `origin/main` at `1bb3d682c8c73ae348cacf44b0e344287a8f3a2b`  
Scope: text-only loading and scheduling changes; no editorial, business, visual, or binary asset changes.

## Confirmed root causes

### Render-critical CSS arrived after the first render

On the base revision, none of the 17 HTML documents referenced the five shared stylesheets (`ui.css`, `premium.css`, `navigation-fixes.css`, `footer-credit.css`, and `enhancements.css`) in `<head>`. Four were appended by `site.js`, which itself runs at the end of `<body>`, and the fifth was appended through the `navigation.js` → `enhancements.js` chain. These sheets affect navigation geometry, fixed surfaces, shadows, responsive rules, and form presentation. Their late insertion could therefore trigger style recalculation, layout, and paint after content was already visible.

The retained correction places the five stylesheets in their existing logical order in every document head. The JavaScript injection paths were removed, so there is no duplicate request or second application of those rules.

Static A/B evidence:

| Check | Before | After |
| --- | ---: | ---: |
| Shared stylesheet references in document heads | 0 / 85 | 85 / 85 |
| Runtime CSS injection sites | 5 | 0 |

### Integration scripts formed a network waterfall

`app.js` awaited each dynamically inserted script before creating the next request. Eight integration downloads were consequently serialized even though classic dynamically inserted scripts can be queued in deterministic order with `async = false`.

The retained correction creates all nine integration script elements synchronously and waits for them as a group. Downloads can overlap while execution order remains the declared array order. In particular, `backend-config.js` remains before `public-api.js`, which remains before `public-config.js`, `assistant.js`, and `booking.js`. `enhancements.js` is now part of that same ordered loader rather than starting a second waterfall from `navigation.js`.

Static A/B evidence:

| Check | Before | After |
| --- | ---: | ---: |
| Serial `await load(src)` loop | present | absent |
| Parallel `Promise.all(ordered.map(load))` | absent | present |
| Integration downloads requested per serial turn | 8 | 0 |

### Image work was concentrated at startup

The previous `hydrateImages()` assigned every native photo immediately with `loading="eager"` and fetched, normalized, concatenated, and assigned all Base64-backed images together. On pages containing multiple images, this concentrated text parsing, data-URL construction, image decoding, and texture upload around initial load. The native Morne-à-l'Eau PNG alone is 2,903,248 bytes; it remains read-only.

The retained correction observes existing placeholders with a 1,600 px vertical margin, schedules only images approaching the viewport, and drains a single hydration queue. Every image retains asynchronous decoding and existing layout reservation. Native images near the first viewport receive appropriate high/low fetch priority only when scheduled; distant images keep the placeholder and no large `src` assignment. Split Base64 parts for one image still download together, but different images no longer perform their decode work simultaneously.

No `srcset`, derivative, conversion, or new image was created. Existing CSS aspect ratios/minimum heights and the explicit map dimensions continue to reserve geometry.

## A/B investigation groups

1. **CSS in head:** retained. It deterministically changes late stylesheet application from five runtime injection paths to zero, across all 17 pages.
2. **JavaScript without waterfall:** retained. Dependency order is covered by a source-level test while requests are issued together.
3. **Image strategy:** retained. Immediate all-page eager assignment was replaced by one-at-a-time hydration 1,600 px before visibility.
4. **Base64 scheduling:** retained as part of the same image scheduler. Per-image fetch/text/normalization/data-URL/decode work is serialized; parts belonging to one image remain parallel.
5. **Compositor/paint:** no additional CSS degradation retained. Existing overrides already disable backdrop filters on the persistent header/assistant surfaces, remove scroll-sensitive transitions, and isolate the header and assistant button. Without browser trace evidence, removing further shadows, gradients, sticky behavior, or fixed UI would be speculative and could intentionally alter the design.

## Early-scroll diagnostic recipe

`scripts/early-scroll-diagnostic.cjs` covers:

- `index.html`, `cabinets.html`, `prevention.html`, and `consultations.html`;
- cold early scroll, warm early scroll, and stabilized scroll;
- desktop DPR 1, desktop DPR 2, and mobile DPR 3;
- slow and fast scrolls;
- frame intervals, frames over 25 ms and 50 ms, maximum and p95 frames;
- Long Tasks, layout shifts, resource timings, CSS and image timing, and active resources;
- CDP style-recalculation, layout, script, and task metrics;
- WebGL renderer reporting and explicit software-renderer detection.

Run it with a local server on port 4173 using `npm run test:early-scroll`. Its JSON report defaults to `/tmp/early-scroll-diagnostic.json`, outside the repository. `EARLY_SCROLL_REPORT` can select another local path. Generated reports, traces, screenshots, and other artifacts must not be committed.

## Runtime measurement limitation

Both the baseline attempt and the post-change diagnostic attempt stopped with:

```text
Error: Navigateur Chromium introuvable sur le système de recette.
```

The existing browser and historical scroll recipes fail for the same environment limitation. Therefore no honest frame-count before/after numbers are available from this container:

| Metric | Before | After |
| --- | ---: | ---: |
| Frames >25 ms | unavailable | unavailable |
| Frames >50 ms | unavailable | unavailable |
| Maximum frame | unavailable | unavailable |

No Chromium binary was downloaded or generated because this change is constrained to text only. The static A/B results above establish removal of the late-CSS and serialized-request mechanisms, but they must not be represented as a real-device smoothness measurement.

## GPU limitation

The diagnostic deliberately launches Chrome without forcing `--disable-gpu` and records the exposed WebGL renderer. In this environment Chrome is absent, so hardware acceleration, SwiftShader, and software rendering could not be distinguished. Even when the recipe runs in headless mode, a SwiftShader/software result is not equivalent to a real browser backed by hardware GPU; final validation should repeat the scenarios on representative physical desktop and mobile devices.

## What was not retained

- No global removal of shadows, gradients, fixed layers, sticky positioning, or visual effects: there was no trace proving an individual remaining effect responsible.
- No generalized eager image preload: it moves decode/upload pressure into the initial interaction window.
- No simultaneous hydration of all Base64 images: it clusters large string operations and decodes.
- No binary image optimization: prohibited by this investigation's text-only policy.

## Future binary recommendation (documentation only)

A separately approved binary-asset intervention could benchmark an appropriately sized modern derivative of `assets/cabinet-morne-a-leau-perrin.png`, because transferring and decoding a 2.9 MB PNG remains intrinsically expensive. This PR does **not** create, modify, delete, convert, stage, or reference such a derivative.

## Reversibility and cache alignment

The image scheduling is isolated in `hydrateImages()`, the integration concurrency change is isolated in `app.js`, and the CSS change consists only of technical `<link>` elements plus removal of redundant injectors. All HTML references to the modified textual CSS/JavaScript generation use the fixed cache key `20260907-scroll-stability`; no dynamic timestamp is used.
