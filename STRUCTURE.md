# wp-starter-kit Structure

Reusable WordPress plugin starter for modular plugin development. Read
`../context.md` (workspace root) and this file before editing.

## Top-level layout

```text
wp-starter-kit/
├── wpdev-starter.php          # Plugin bootstrap
├── project.config.json       # Branding + runtime config (source of truth)
├── build.config.json         # Asset mappings + esbuild options
├── composer.json / package.json
├── src/
│   ├── Core/                 # Plugin, ModuleLoader, ModuleInterface
│   ├── Modules/              # ExampleFeature, Blocks, McpAbilities (+ assets/entries)
│   ├── Support/              # REST, queue, shortcodes, assets, auth
│   └── Adapters/             # Optional wpdev-framework bridge
├── packages/                 # Publishable / standalone packages
│   ├── cli/                  # `wpdev` installer CLI
│   ├── create-wp-project/    # Scaffold engine + manifest + migrations
│   ├── framework/            # wpdev/framework (Core + Support for consumers)
│   ├── fetch/                # Deprecated shim → use rest-utils (batch client)
│   ├── php-fault-tolerance/  # Optional HTTP batch / circuit breaker (PHP 8.1+)
│   ├── hooks, utils, rest-utils, html-utils, ui-components, translation, …
│   ├── mcp-integration/      # wpdev/mcp-integration (Abilities API)
│   └── php-test-tools/       # PHPUnit helpers + patch runner
├── core/packages/            # JS workspaces consumed by the build
│   ├── build/                # esbuild CLIs (deps, components, styles)
│   ├── dependency-extraction-esbuild-plugin/
│   └── utils/                # getOrgName, readProjectConfig, check
├── assets/                   # Built bundles, stylesheets, libraries
├── dev/                      # Rector, Strauss, translation scripts
├── tests/                    # Jest + PHPUnit
├── docs/                     # Full documentation index at docs/index.md
├── dist/                     # Scaffold output (gitignored)
└── .github/workflows/        # CI (test, lint, build, release)
```

## Verification

Run from this directory:

```bash
npm test
composer test
npm run release
npm run check
```

## Polaris Stack

Self-contained frontend design system at `packages/polaris-stack/` — a **git
submodule** of [github.com/abolfazl-moeini/polaris-stack](https://github.com/abolfazl-moeini/polaris-stack). Selectable via the `wpdev` installer (`--frontend-stack=polaris`).

Agent context and implementation rules live in `packages/polaris-stack/context.md`. Generated consumer projects receive a copy of the runtime files under `src/polaris/`.

## Blockstudio (Gutenberg blocks)

[Blockstudio 7](https://blockstudio.dev) powers the kit reference blocks module. Composer
installs `blockstudio/blockstudio` into `wp-content/plugins/blockstudio/` (WordPress
plugin installer). Block definitions live at `blockstudio/{block-name}/`; global settings
in `blockstudio.json`; bridge at `src/Modules/Blocks/Module.php`.

- **Runtime:** PHP **8.2+** (Blockstudio vendor); WordPress **6.7+** (7.0 recommended).
- **Docs:** `docs/blocks-blockstudio.md`, `docs/blocks.md`.
- **Scaffold:** `blocks:on` in `@wpdev/create-wp-project` mirrors this layout (see
  `blockstudio.integration.md`).

Kit dev install when `config.platform.php` is 7.4:

```bash
composer install --ignore-platform-req=php --no-scripts
```

Blockstudio is **not** Strauss-prefixed in the kit reference tree — consumers run
`composer install` on PHP 8.2+ hosts.

## MCP Integration

Self-contained Abilities API library at `packages/mcp-integration/` (`wpdev/mcp-integration`). Selectable via the `wpdev` installer (`--mcp-abilities=on`).

Agent context and implementation rules live in `packages/mcp-integration/context.md`. Generated consumer projects receive a vendored copy of the runtime files under `src/Mcp/` plus a kit bridge module at `src/Modules/McpAbilities/`.

Clone with submodules:

```bash
git clone --recurse-submodules <wp-starter-kit-url>
# or after clone:
git submodule update --init --recursive
```

## Rules for AI agents

1. Read `../context.md` and this file before editing.
2. Prefer TDD: write or update tests first, then implementation.
3. Preserve WordPress security: nonces, capabilities, sanitization, escaping, prepared queries, REST `permission_callback`.
4. For distributed plugins with Composer dependencies, scope/prefix vendors at release time (Strauss / php-scoper) — not a runtime dependency resolver.
5. Detailed how-to docs live under `docs/` — start at `docs/index.md`.

## Integrated research (no longer separate folders)

- `composer-issue-in-wp/` → vendor scoping in `docs/vendor-scoping.md`
- `js-core-libs/` → `packages/rest-utils/` (batch client; `packages/fetch/` is a shim)
- `php-core-libs/` → `src/Support/` + `docs/php-core-libs.md`
- `WordPress Concurrency & Fault Tolerance/` → `packages/php-fault-tolerance/`
- `mrlogistic-laravel/`, `sample-plugin/`, `wpdev-framework/` → build pipeline, Rector, patch tools, optional adapter
