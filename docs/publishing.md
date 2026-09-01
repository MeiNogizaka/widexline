# Publishing this repo

## What is safe to put on GitHub

These files have no account names, emails, tokens, or timeline dumps:

- `manifest.json`
- `content.js`, `styles.css`
- `popup.html`, `popup.js`, `popup.css`
- `icons/*.png`
- `README.md`, `PRIVACY.md`, `LICENSE`
- `docs/`
- `.gitignore`

A scan of those sources found no email addresses, no X handles, and no API keys. The extension does not embed credentials.

## What must stay local

| Path | Why |
| --- | --- |
| `スクリーンショット/` | Logged-in Home screenshots, account chrome, other people's posts and avatars, saved Edge HTML (full timeline DOM). |
| `ホーム _ X*.html` and `*_files/` | Same dumps, plus downloaded X JS bundles. |
| `*:Zone.Identifier` | Windows download ADS; not useful in git. |
| `logs/` | Local session notes. Currently empty templates. |

`.gitignore` already excludes them. Before the first `git push`, run:

```bash
git status
git ls-files
```

If any `スクリーンショット`, `ホーム _ X`, or `Zone.Identifier` path appears, abort and unstage it.

Do not add “before/after” screenshots from a logged-in account. If you want a README image later, capture a throwaway account or crop out the sidebar, display name, and avatar.

## Create the GitHub repo

From this folder, after reviewing `git status`:

```bash
git init
git add manifest.json content.js styles.css popup.html popup.js popup.css icons README.md PRIVACY.md LICENSE docs .gitignore
git status   # review the index
git commit -m "Initial public snapshot of Widex 1.6.21"
```

Then create an empty GitHub repository (no README, so you do not merge a second root file) and:

```bash
git remote add origin git@github.com:<you>/widex.git
git branch -M main
git push -u origin main
```

Use your own GitHub account in the remote URL. This document does not name a user.

Suggested GitHub extras: Description “Widen the x.com timeline and cap media height”, topic `browser-extension`, license MIT. Do not upload the private debug folder as a Release asset.

## Store listing later

GitHub is source hosting only. An Edge Add-ons or Chrome Web Store listing needs a privacy declaration; copy from `PRIVACY.md`. Host permissions stay `https://x.com/*` and `https://twitter.com/*`.
