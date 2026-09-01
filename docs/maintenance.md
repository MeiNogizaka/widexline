# Maintenance

X ships a new frontend often. Most Widex bugs are “a selector stopped matching” or “a new wrapper appeared around the padding-bottom box.” This file is the checklist for changing the code without repeating old mistakes.

## How to work

1. Reproduce on a live x.com tab with the unpacked extension loaded.
2. Save the tweet HTML **locally** if you need a fixture. Put it under `スクリーンショット/` (gitignored). Do not commit timeline dumps; they contain the logged-in account UI.
3. Prefer `data-testid` over `r-*` classes. Add a class only when the testid is missing or too broad.
4. Bump `manifest.json` `version` for any behavior change (current: `1.6.21`).
5. Keep `DEFAULTS` in `content.js` and `popup.js` identical.

There are no unit tests. The “test suite” is the cases below, exercised on Home.

## Regression cases

Run these after any change to flattening, height, or CSS.

| Case | Expect |
| --- | --- |
| Single still | Height = slider (or native if off). Not cropped. Click opens X lightbox, Back stays on Home. |
| 2–4 stills (carousel) | One horizontal row, packed, no 2×2, no huge gap under the text. |
| Quote with 4 stills | Same row inside the quote. No leftover native collage. No width flicker. |
| Link card | Image/video follows the slider. |
| Video / GIF | Plays, controls visible, no left-then-center jump. |
| Mixed image + video | Not flattened. Height capped. Video still plays. |
| Sensitive / 成人向け, still blurred | Overlay and collage both ≤ slider **before** 「表示」. Blur remains. |
| Sensitive, after 「表示」 | Images appear at the same height. |
| Sidebar off | No empty 420px column. |
| Sidebar on | Trends actually render (not a blank column). |
| Height slider live | Existing tweets update without a reload; scroll position holds. |
| First load after install | No one-frame-tall blur then snap. Cache + `#widex-early-cap` should prevent it. |
| Avatar / reply composer | Avatars are not 300px tall (`.r-13qz1uu` exclusion). |

Typical settings while checking: width 1200, sidebar shown, limit height on, max height 300.

## Rules that exist because of past bugs

Do not undo these without a new reason.

- **Do not flatten** playable, sensitive, or mixed posts. Flatten hid the player or removed the blur overlay.
- **Do not set `display: none` on `sidebarColumn`.** Trends stay empty after it is shown again.
- **Do not `max-height` the inner `videoPlayer`.** Controls get clipped; the player flickers.
- **Do not navigate to `/photo/N`.** Use the original hidden `<a>` click so X's SPA lightbox opens.
- **Do not use `zoom` or `getBoundingClientRect` to scale.** Zoom compounded to ~1e-88.
- **Do not `padding-bottom: 0` every `[style*=padding-bottom]`.** Skip `.r-13qz1uu`.
- **Do not rely on `max-height` alone** on a padding-bottom aspect box. Percentage padding is of the **parent width**; `max-height` does not include padding. Zero the padding and set `height`.
- **Cap the overlay's ancestors**, not only `r-1w2pmg`. The warning layer is a sibling covering `r-yfv4eo` / `r-l3hqri`.
- **Do not re-apply `capPlayable` every frame.** Lock with `data-widex-cap-width` / `data-widex-cap-height`.
- **Lock `fitRow` after images have `naturalWidth`.** Quote carousels otherwise oscillate width.

## Where to edit

| Symptom | Start here |
| --- | --- |
| First paint too tall | `writeEarlyCapStyle`, `styles.css` early-cap rules, `widex.cache.v1` |
| Carousel still 2×2 | `flattenCarousel`, `flattenPhotoList`, `ScrollSnap-*` / `testCondensedMedia` |
| Huge gap under text | leftover `padding-bottom` on a flattened box; hide via `data-widex-hidden` |
| Blur overlay taller than images | `capFrameAndShell` / `applyNativeCap`; confirm overlay is sibling |
| Video won't play | `isPlayableMedia`, `restorePlayableMedia`; a flatten hid the player |
| Video flicker / missing controls | `capPlayable`, `findMediaShell`; inner nodes must stay untouched |
| Lightbox reloads Home | `bindNativePhotoClick` / `clickOriginalPhoto` |
| Scroll jumps | `preserveScroll` |
| Sidebar blank | `syncSidebar`; do not use `display: none` |
| Quote overflow | `fitRow`, `rowAvailWidth`, `relocateQuoteSingles` |
| Width stuck at 600 | `uncap600` (`r-1ye8kvj`), `syncShell` |

## Debugging on a live page

In DevTools, on a broken tweet:

```js
$0.closest("[data-testid='tweetPhoto']")
$0.closest("[style*='padding-bottom']")
$0.closest("[data-widex-native-cap], [data-widex-cap], .widex-row, .widex-single")
getComputedStyle($0).paddingBottom
getComputedStyle($0).height
```

Useful attributes Widex writes:

- `data-widex-hidden` — native collage we replaced
- `data-widex-playable` — do not flatten
- `data-widex-native-cap` / `data-widex-sensitive-native` — unflattened height cap
- `data-widex-cap` — playable outer shell
- `data-widex-fit-h` / `data-widex-fit-lock` — packed row cache
- `html.widex-limit-height`, `--widex-max-height`, `--widex-width`, `--widex-sidebar`

`#widex-early-cap` is a `<style>` on `<html>`. If it is missing on first paint, the cache path failed.

## Changing X copy / language

Sensitive detection is string matching (`内容の警告`, `Content warning`, `センシティブな内容`, `Sensitive content`, plus 「表示」 / Show / View). A new locale needs those strings in `isSensitiveText` / `hasSensitiveWarning`. Same for playable aria-labels (`埋め込み動画`, `Play GIF`, …).

## Releasing

1. Confirm the regression table.
2. Bump `version` in `manifest.json`.
3. Commit only source + docs. Never `スクリーンショット/`, `logs/`, `*:Zone.Identifier`, or saved `ホーム _ X*.html`.
4. Tag if you use GitHub Releases. Zip the folder **without** those debug files for people who sideload.

Edge Add-ons / Chrome Web Store listing is separate from GitHub and needs its own privacy text (this repo's `PRIVACY.md` is the source).
