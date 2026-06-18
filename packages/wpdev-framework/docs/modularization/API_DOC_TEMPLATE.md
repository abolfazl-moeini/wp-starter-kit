# API_DOC.md template (all WPDev modules)

Use this **exact section order** in every `modules/{module-id}/API_DOC.md`. Generator-agnostic Markdown only.

---

## Overview

One paragraph: what the module owns and when to load it.

## Standalone usage

```php
wpdev_load_module( '{module-id}' );
```

**Declared dependencies:** (from `module.json`)

## Lifecycle

| Hook | Purpose |
|------|--------|
| `wpdev_load` | Register entities |
| `wpdev_admin_pages` | Admin page classes |
| `wpdev_init` | Early services |

## Public API

Document each public function with signature, params, return, and `@since`.

## Hooks and filters

| Hook | Args | When |
|------|------|------|

## Storage and option keys

Document **where** data persists (network option vs site option), **slugified key** names, and save/read functions. Required for settings and fixture-backed demos.

## Capabilities and context

| Capability | Context | Pages |
|------------|---------|-------|

## Registration and menu context

How admin pages register (`wpdev_register_module_admin_pages`, `wpdev_register_admin_page`), default network menu vs playground parity (`parent` => `wpdev`, `context` => `admin`).

## Playground

| | |
|--|--|
| **Mode** | `sandbox` (`wpdev-pg-*`) or `production parity` (real page class) |
| **Admin URL** | |
| **Panel / page slug** | |
| **Render** | Callback or production class name |
| **Requires modules** | |
| **Acceptance markers** | |
| **Core-only** | Skipped when `WPDEV_PLAYGROUND_CORE_ONLY=1` |

Kill switch: `WPDEV_PLAYGROUND_SANDBOX_PANELS=1` forces sandbox panels. Filter: `wpdev_playground_use_real_production_pages`.

## Examples

Runnable, self-contained snippets.

## Recipes

Common integration patterns (list + edit, settings save, modal add).

## Migration

Version notes and preferred APIs.
