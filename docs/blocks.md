# Gutenberg Blocks Scaffold

The `blocks` feature (`blocks:on`) adds a starter module at
`src/Modules/Blocks/` with:

- `block.json` — block metadata (WP 5.8+)
- `index.ts` — editor entry registered via `@wordpress/blocks`
- `Module.php` — calls `register_block_type_from_metadata()` on `init`

## Requirements

- `js` ≠ `none` (a JS build pipeline is required)
- `wpMinVersion` ≥ `5.8`

## Dependencies

The scaffold adds `@wordpress/blocks` and `@wordpress/block-editor` to
the consumer `package.json` devDependencies.

## Build pipeline

Block editor scripts are built by the standard four-stage esbuild
pipeline (`build:dependencies`, `build:components`, `build:styles`,
`build:assets`). The `block.json` `editorScript` field points at
`file:./index.ts`.

## Turning blocks on later

Use `wpsk add blocks` (or `addFeature(dir, 'blocks', 'on')`) on an
existing project. Only files under `src/Modules/Blocks/**` are owned by
the blocks generator.

## Switching off

Set `blocks:off` via `removeFeature` or the installer. Owned block files
under `src/Modules/Blocks/**` are removed; your other modules are
untouched.
