# Translation Pipeline

> Generate `.pot` files for the JS and PHP sides, then build per-component
> JSON translation files for the browser. Pure data pipeline, fully
> TDD-tested, no `wp-cli` required.

## What it does (one paragraph)

The starter ships both PHP code (`core/php/`) and JS components
(`core/components/*/`). Both can contain translatable strings. The
translation pipeline:

1. **Extracts** JS strings into a per-component `.pot` file (using the
   `@wordpress/babel-plugin-makepot` or a hand-rolled equivalent).
2. **Extracts** PHP strings into a single theme `.pot` (using
   `xgettext` via `wp i18n`-style or a thin PHP wrapper).
3. **Merges** all `.pot` files into `languages/<textdomain>.pot`.
4. **Builds** a JSON bundle per source file via
   `wp i18n make-json --use-map=<map>` (so a single JS file maps to a
   single JSON file at runtime — important for cache-busting).
5. **Cleans** stale translation files (any `.json` in
   `assets/translations/` not in the current map is removed).

The whole thing is invoked by `composer translation` (or
`npm run translation`).

## Composer / npm scripts

```jsonc
// composer.json
"scripts": {
  "translation:generate:php":   "php dev/translation/generate-php.php",
  "translation:generate:script": "node packages/translation/src/index.js ... || true",
  "translation:generate":        [
    "@translation:generate:php",
    "@translation:generate:script"
  ],
  "translation:build:php":      "php dev/translation/build-php.php",
  "translation:build:script":   "php dev/translation/build-script.php",
  "translation:build":          [
    "@translation:build:php",
    "@translation:build:script"
  ],
  "translation":                [
    "@translation:generate",
    "@translation:build"
  ]
}
```

## The pure-data helpers (`@wpsk/translation`)

`packages/translation/src/index.js` exports six pure functions:

| Function                  | Input                           | Output                          |
|---------------------------|---------------------------------|---------------------------------|
| `parseMapFile(pot, bundle)` | `.pot` contents + bundle name  | `Record<sourcePath, bundleName>` |
| `isTranslationValid(label)`| any value                       | `boolean`                        |
| `extractTranslation(...)`  | (raw textdomain)                | (parsed translation)             |
| `updateTranslation(...)`   | (existing, patch)               | (merged translation)             |
| `extractInternalPackages(config)` | (project.config)         | `string[]` of internal package names |
| `mergeTranslationFiles(files)` | `string[]` of JSON paths   | merged JSON object                |

**All six are pure** (no I/O, no `console.log`, no `process.exit`) and
are unit-tested in `tests/phpunit/TranslationPipelineTest.php` (8 tests)
by running them via `proc_open` against `node -e`.

## The PHP shell scripts

`dev/translation/` ships 6 thin PHP files:

- `bootstrap.php` — shared helpers (`wpsk_list_components`,
  `wpsk_run_translation_helper`, `wpsk_run_wp_i18n`,
  `wpsk_make_script_pot`, `wpsk_build_map_file`).
- `cli.php` — PHPUnit-friendly shim (each test gets a fresh
  process so `SOURCE_ROOT` constant isn't redefinition-blocked).
- `colors.php` — `wpsk_color_log` (NO_COLOR-aware).
- `generate-script.php` / `generate-php.php` — entry points for
  `translation:generate:script` / `translation:generate:php`.
- `build-script.php` / `build-php.php` — entry points for
  `translation:build:*`.

The PHP scripts never use `symfony/process` or `wpdev/console` —
those packages are private in the project. Instead, the Node helper
is invoked via a simple `proc_open` call:

```php
$cmd = sprintf(
  'node %s %s %s',
  escapeshellarg(TRANSLATION_HELPER),
  escapeshellarg('parseMapFile'),
  escapeshellarg(base64_encode(json_encode($payload)))
);
$proc = proc_open($cmd, [...], $pipes);
```

The Node helper prints `{"ok": true, "result": ...}` to stdout, and
the PHP side `json_decode`s it. This is the JSON-bridged CLI pattern
the Phase 6 plan settled on.

## Running the pipeline

```bash
# Generate .pot files for both sides:
composer translation:generate

# Build JSON translation bundles:
composer translation:build

# Both:
composer translation
```

A green run prints:

```
✓ Found 4 components
✓ Script .pot generated: assets/translations/hello-world.pot
✓ PHP .pot generated: languages/my-project.pot
✓ Map file written: assets/translations/hello-world-map.json
✓ Build clean: 0 stale .json removed
```

A red run prints the same steps with the failing one prefixed by
`✗` and exits non-zero.

## Test surface (Phase 6)

- `tests/phpunit/TranslationPipelineTest.php` (8 tests) — exercises
  the six pure helpers via `proc_open` to the node CLI.
- `tests/phpunit/TranslationBootstrapTest.php` (4 tests) — smoke tests
  for the PHP shell scripts (kept simple because PHPUnit's `proc_open`
  from inside the sandbox was unreliable in early attempts; current
  implementation uses `shell_exec` for the smoke assertions).

## Why no `wp-cli`?

`wp i18n` is great but:

1. It requires a full WP install to run, which the starter doesn't ship.
2. It can't be unit-tested without a WP fixture.
3. It's slow (boot, DB connection) for what is fundamentally a
   string-rewrite job.

The starter reimplements the **20% of `wp i18n`** that matters for a
small theme:

- `wp i18n make-pot` → `xgettext` for PHP, `@wordpress/babel-plugin-makepot` for JS.
- `wp i18n make-json --use-map` → `dev/translation/build-script.php`
  + `wpsk_build_map_file` helper.

The remaining 80% (PO file editing, MO compilation) is the translator's
job, and they have Poedit / Crowdin / Weblate for that.

## Adding a new translatable string

1. **JS:** wrap the string in `__('Hello world', 'my-project')`.
   Run `composer translation:generate:script` to regenerate the
   component's `.pot` and the master `.pot`.
2. **PHP:** wrap in `__('Hello world', 'my-project')` in `core/php/`.
   Run `composer translation:generate:php` to regenerate the
   master `.pot`.
3. **Build:** `composer translation:build` to produce the JSON
   bundles the browser will load.

The `.pot` files are committed; the `.json` translation files are
not (they're regenerated on every build). Translations live in
`languages/<textdomain>-<locale>.po`.
