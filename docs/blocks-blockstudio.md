# Blockstudio Blocks

The kit uses [Blockstudio 7](https://blockstudio.dev) for Gutenberg blocks. Blockstudio is PHP-first: each block is a folder with `block.json`, a PHP render template, and optional assets.

## Layout

```text
blockstudio.json              # global Blockstudio settings (plugin root)
blockstudio/
  example-hero/
    block.json                # metadata + blockstudio.attributes fields
    index.php                 # render template ($a holds attribute values)
    init.php                  # optional per-block init hook
    style.scss                # optional; requires assets.process.scss in blockstudio.json
src/Modules/Blocks/
  Module.php                  # kit bridge — boots Blockstudio
```

## Adding a block

1. Copy `blockstudio/example-hero/` to `blockstudio/my-block/`.
2. Edit `block.json`: set `name` to `{slug}/my-block`, `apiVersion` to `3`, and define fields under `blockstudio.attributes`.
3. Render in `index.php` using `$a['fieldName']` and `get_block_wrapper_attributes()`.

Blockstudio discovers and registers blocks from disk — do not call `register_block_type()` manually.

## Requirements

| Requirement | Detail                                                 |
| ----------- | ------------------------------------------------------ |
| PHP         | **8.2+** at runtime (Blockstudio vendor code)          |
| WordPress   | **6.7+** minimum; **7.0** recommended for Block API v3 |
| Blockstudio | `composer require blockstudio/blockstudio`             |

Rector can downlevel **your** plugin PHP source per `phpMinVersion`, but Blockstudio itself requires PHP 8.2 on the server.

## Composer install (kit + generated projects)

```bash
composer require blockstudio/blockstudio
composer install
```

In this kit repo, Composer's `composer/installers` places Blockstudio under
`wp-content/plugins/blockstudio/`. `wpdev-starter.php` loads that bootstrap before
modules boot. Generated projects use the same Composer package; the blocks generator
also emits `src/blocks-register.php` for early `plugins_loaded` registration.

**Release / Strauss:** do not prefix Blockstudio into `vendor-prefixed/` — ship it as a
Composer dependency and run `composer install` on deploy (PHP 8.2+).

## Bridge module

`src/Modules/Blocks/Module.php`:

- Guards with `class_exists(\Blockstudio\Build::class)` — shows admin notice if missing.
- Redirects `blockstudio/settings/path` to the plugin-root `blockstudio.json`.
- Calls `Blockstudio\Build::init(['dir' => ...])` on `init`.

## Blockstudio 7 capabilities

- **30+ field types** in `block.json` (`text`, `textarea`, `toggle`, `color`, `repeater`, …)
- **`init.php`** per block for CPTs, taxonomies, REST routes
- **File-based patterns** and **extensions** for core blocks
- **Post meta storage** via `"storage": "meta"` on attributes
- **Interactivity API** via `"interactivity": true` per block

See [Blockstudio documentation](https://blockstudio.dev/documentation/) for full field and template APIs.

## Installer

Enable with `blocks:on` during `wpdev create` or `wpdev add blocks`. Works with `js:none` (PHP-only plugins).

```bash
wpdev create my-plugin --blocks=on --yes
composer install
```
