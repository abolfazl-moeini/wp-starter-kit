# WPDev API documentation index

Machine-readable manifest: [`manifest.json`](manifest.json).

Generated: 2026-06-04T07:57:54+00:00

## Read order (AI / RAG / docs site)

1. [`index.md`](index.md) — module and example map
2. [`framework-primitives.md`](framework-primitives.md) — base classes and core helpers
3. [`functions.md`](functions.md) — top framework functions from examples usage
4. [`hooks.md`](hooks.md) — lifecycle and registry hooks
5. [`classes.md`](classes.md) — tracked base/framework classes
6. [`examples-usage.md`](examples-usage.md) — how examples consume APIs
7. [`skills-feed.md`](skills-feed.md) — agent skill extraction notes
8. [`framework-reference.md`](framework-reference.md) — human navigation to colocated API docs
9. Colocated source of truth: `modules/*/API_DOC.md`, `examples/*/API_DOC.md`

## Regenerate

```bash
composer docs:api-inventory
composer docs:api-index
composer docs:api-audit
```
