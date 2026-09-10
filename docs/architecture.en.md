# Architecture

[日本語](architecture.md) · [English](architecture.en.md)

Widexline is a Manifest V3 content script. It does not replace X's React tree. It patches the already-rendered DOM so the timeline is wider and media is shorter, without breaking playback, sensitive-content blur, or the native photo lightbox.

## Files

| File | Role |
| --- | --- |
| `manifest.json` | MV3. Hosts `x.com` / `twitter.com`. Permission: `storage` only. `run_at: document_start`. |
| `content.js` | Settings, early cap, flatten vs native-cap, observers. |
| `styles.css` | Width CSS variables, sidebar hide, `.widex-row` / `.widex-single`, native-cap overflow. |
| `popup.*` | Reads/writes `chrome.storage.local` and pings the content script. |

There is no background service worker and no build step.

## Settings

Four keys, same defaults in `content.js` and `popup.js`:

```js
{ width: 800, hideSidebar: true, limitHeight: false, maxHeight: 400 }
```

Two stores:

1. `chrome.storage.local` — source of truth. Popup writes here. Content script listens with `chrome.storage.onChanged`.
2. `localStorage["widex.cache.v1"]` on x.com — last-used copy. Read **synchronously** at `document_start` so the first paint is already capped.

`chrome.storage` is async. Without the cache, the first paint uses X's native 510px / padding-bottom boxes, then jumps when storage arrives. The cache exists only to close that gap.

On a first visit with no cache, `content.js` applies an optimistic `limitHeight: true` at 400px, then `chrome.storage` overwrites it.

## When the script runs

```
document_start
  read localStorage cache
  apply CSS variables + inject #widex-early-cap
  (optimistic cap if no cache)
chrome.storage.local.get  →  applySettings → patchTimeline
MutationObserver (subtree)  →  schedulePatch (rAF)  →  patchTimeline
popup message widex-settings / widex-ping
```

`patchTimeline` is the only full pass. It is wrapped in `preserveScroll` so height changes do not jump the tweet under the viewport.

## Two media strategies

X media is an aspect-ratio box: a spacer with `padding-bottom: N%` and an absolutely positioned overlay. That works at X's 600px column. It does **not** work once the column is 800–1200px and the user wants a max height, because:

- `%` padding-bottom is a percentage of the **containing block width**, not of the element itself.
- `max-height` on a content-box element does not clip that padding.
- The “内容の警告 / 成人向けコンテンツ” overlay is a `position: absolute; inset: 0` **sibling** of the collage box (`r-1w2pmg`), not a child of it. Capping the collage alone leaves a tall overlay.

So Widexline splits media into two paths.

### Flatten (still photos only)

Used when it is safe to hide the native collage and insert our own markup.

- `.widex-single` — one still image.
- `.widex-row` — two or more still images in one flex row.

Sources:

- carousel: `[data-testid="ScrollSnap-SwipeableList"]`
- quote 2×2: `[data-testid="testCondensedMedia"]`
- other multi-image groups sharing a tweet/quote root

The native box is hidden with `data-widex-hidden="1"`. Images use `object-fit: contain` and `max-height`. A height-limited row is packed with `fitRow`: each image keeps its aspect ratio at a common height; if the sum of widths exceeds the row, the common height is scaled down so there is no equal-column gap.

Flatten is **skipped** when any of these is true:

- sensitive / content-warning text is present
- the node is playable (video, GIF, `previewInterstitial`, `videoPlayer`, `playButton`, amplify/ext thumbs)
- mixed image + video in the same post
- there is no `/photo/N` link (flatten would break the lightbox)

### Native-cap (everything flatten cannot touch)

Leave X's DOM in place. Zero `padding-bottom`, set `height` / `max-height` to the slider value, `overflow: hidden`, `box-sizing: border-box`. Walk ancestors up to `r-l3hqri` so the overlay sibling is clipped too.

Markers:

- `data-widex-native-cap` / `data-widex-sensitive-native` — collage / warning frames
- `data-widex-cap` + `--widex-media-cap` — playable shells only (outer width). Inner player nodes are never given inline max-height; that clipped the control bar and caused a left-then-center flicker.

CSS and the early `#widex-early-cap` style target

```css
[data-testid="primaryColumn"] [style*="padding-bottom"]:not(.r-13qz1uu)
```

`.r-13qz1uu` is X's inner spacer / avatar class. Applying height:300px to those smashed avatars and inner layout. Do not drop that `:not()`.

X also hard-codes `height: 510px` on some single-image boxes. Both CSS and `applyAspectCap` override that with `height: auto` / `max-height`.

## Width and sidebar

X caps the column with atomic class `r-1ye8kvj` (`max-width: 600px`). `uncap600` clears that. `syncShell` sets `primaryColumn` to `--widex-width` and the `main > div` shell to `width + (hideSidebar ? 0 : 420)`.

The sidebar is **not** `display: none`. Hiding it that way left an empty 420px hole and killed Trend rendering when shown again. Hide is width/opacity/overflow/pointer-events. Showing again removes those properties and resets the huge `margin-top` spacers X uses for virtualization.

## Lightbox

Flattened `<a href="/status/.../photo/N">` must not navigate. A full load of `/photo/N` and Back reloads the timeline. Clicks are captured and forwarded to the original (now hidden) native link via `clickOriginalPhoto`. Modifier-clicks (new tab) still use the href.

## Playable media

`isPlayableMedia` / `looksLikePlayable` / `markPlayable` (`data-widex-playable="1"`). Once marked, flatten will not hide the node. `restorePlayableMedia` undoes a flatten if a video appears later (X hydrates the player after the still).

Cap only the outer shell (`findMediaShell`). Width comes from `maxHeight * 100 / paddingBottomPct`.

## Scroll

`preserveScroll` records the first on-screen `article[data-testid="tweet"]` top, runs the patch, then adds the delta to `scrollTop`. Height-limit changes otherwise shove the timeline.

## Selectors that will rot

Prefer `data-testid` over atomic classes. Classes below are hashed by X and will change:

| Class / testid | Meaning in current X |
| --- | --- |
| `r-1ye8kvj` | 600px max-width |
| `r-1w2pmg` | collage `padding-bottom` box |
| `r-yfv4eo` / `r-l3hqri` | media wrappers; overlay lives here |
| `r-13qz1uu` | inner spacer / avatar (do not cap) |
| `r-1kqtdi0` + `r-1phboty` | bordered media card |
| `r-14gqq1x` | media stack |
| `r-16y2uox` | flex-grow |
| `tweetPhoto` | still (sometimes also the video shell) |
| `ScrollSnap-*` | image carousel |
| `testCondensedMedia` | quote-post collage |
| `card.wrapper` | link card |
| `videoPlayer` / `previewInterstitial` / `playButton` | player |
| `sidebarColumn` / `primaryColumn` | layout |

When a layout bug appears, save the tweet HTML (locally, never commit it) and check which of these still match before adding a new class name.
