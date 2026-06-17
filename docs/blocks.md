# Gutenberg Blocks (Blockstudio)

The `blocks` feature (`blocks:on`) scaffolds [Blockstudio 7](https://blockstudio.dev) integration:

- `blockstudio.json` — global Blockstudio settings
- `blockstudio/example-hero/` — example block with `apiVersion: 3`
- `src/Modules/Blocks/Module.php` — bridge that boots Blockstudio
- `src/blocks-register.php` — early `plugins_loaded` registration

See [blocks-blockstudio.md](blocks-blockstudio.md) for layout, adding blocks, and Blockstudio capabilities.

## Requirements

- **PHP 8.2+** at runtime (Blockstudio vendor requirement)
- **WordPress 6.7+** minimum; **7.0** recommended for Block API v3
- **No JS build required** — `blocks:on` works with `js:none`

## Composer

The scaffold adds `blockstudio/blockstudio` to `composer.json`. Run `composer install` after create or `wpdev add blocks`.

## CLI

```bash
wpdev create my-plugin --blocks=on --yes
wpdev add blocks
wpdev remove blocks
```

If `phpMinVersion < 8.2`, the installer warns that Rector downlevels your plugin source but the server must still run PHP 8.2+ for Blockstudio.

## Owned paths

The blocks generator owns:

- `blockstudio.json`
- `blockstudio/**`
- `src/Modules/Blocks/**`
- `src/blocks-register.php`

Custom blocks should live under `blockstudio/` so add/remove stays predictable.
