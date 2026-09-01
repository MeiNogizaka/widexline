# Contributing

Please read [docs/architecture.en.md](docs/architecture.en.md) and [docs/maintenance.en.md](docs/maintenance.en.md) first (Japanese: [architecture](docs/architecture.md), [maintenance](docs/maintenance.md)). The two media paths (flatten vs native-cap) and the padding-bottom trap are easy to break.

## Pull requests

- Keep changes scoped. A selector fix does not need a popup redesign.
- Bump `manifest.json` `version` when behavior changes.
- Do not commit screenshots, saved `ホーム _ X.html` dumps, or `logs/`.
- Do not add network calls, extra host permissions, or analytics.

## Local run

Load the folder as an unpacked extension (see README). There is no compile step.
