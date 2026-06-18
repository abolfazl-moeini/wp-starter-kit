# WPDev Documentation

All non-runtime documentation for the WPDev Framework plugin lives under this directory.

## Start here

| Document | Purpose |
|----------|---------|
| [`STRUCTURE.md`](STRUCTURE.md) | Repository folder layout and release boundaries |
| [`RELEASE-PREP.md`](RELEASE-PREP.md) | Pre-release checklist and packaging steps |
| [`CONTEXT.md`](CONTEXT.md) | Canonical AI/developer handoff after major changes |
| [`framework/README.md`](framework/README.md) | Human-written module usage guides |
| [`api/README.md`](api/README.md) | Generated API reference index |
| [`modularization/AI-PROJECT-CONTEXT.md`](modularization/AI-PROJECT-CONTEXT.md) | Modularization history and agent rules |

## Sections

| Path | Contents |
|------|----------|
| [`api/`](api/) | Generated manifest, hooks, functions, classes |
| [`framework/`](framework/) | Per-module guides (`modules/*.md`) |
| [`modularization/`](modularization/) | Migration inventory, changelog, sign-off notes |
| [`code-review/`](code-review/) | Review reports |
| [`site/`](site/) | Static documentation site (`index.html` + assets) |

## Dev-only (not in minimal release zip)

- `docs/` (except what you choose to ship with GitHub releases)
- `bin/`, `tests/`, `vendor/`, `skills/`, `.cursor/`, `.github/`
- `composer.json`, `phpunit.xml.dist`

See [`.distignore`](../.distignore) and [`RELEASE-PREP.md`](RELEASE-PREP.md).
