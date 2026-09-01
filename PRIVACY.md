# Privacy

Widex does not collect, transmit, or sell personal data.

## What the extension accesses

- Pages on `https://x.com/*` and `https://twitter.com/*` only, via Manifest V3 content scripts.
- `chrome.storage.local` for four settings: timeline width, hide-sidebar, height-limit toggle, max height.
- `localStorage` on those same origins, under the key `widex.cache.v1`, so the last-used settings can apply before `chrome.storage` returns.

## What it does not do

- No network requests of its own.
- No analytics, crash reporting, or telemetry.
- No cookies, account tokens, or post content are read for any purpose other than laying out media already on the page.
- No data is sent to the author or to a third party.

## Permissions

`storage` is the only Chrome permission. Host access is limited to x.com and twitter.com.

## Uninstall

Removing the extension deletes `chrome.storage.local` data for Widex. The `widex.cache.v1` key in the site's `localStorage` may remain until the site data is cleared.
