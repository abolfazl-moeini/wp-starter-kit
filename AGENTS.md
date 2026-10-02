# AGENTS.md — Master Architecture & Agent Operational Guide for `wp-starter-kit`

> **Target Audience:** Autonomous AI Coding Agents, Senior Systems Engineers, and Core Contributors.  
> **Repository Root:** `/Users/moeini/Documents/ideas/extend-kit/wp-starter-kit`  
> **Active Development Branch:** `main` — confirm with `git rev-parse --abbrev-ref HEAD` before assuming  
> **Project Type:** Modular WordPress/WooCommerce Plugin Boilerplate, CLI Scaffolder & Standalone Obfuscation Monorepo.  
> **Last Updated:** 2026-09-29 (Release v1.1.0 — Go build system migration, Chameleon frontend engine, Profile S hardening)

---

## 1. Executive Summary & Monorepo Mission

`wp-starter-kit` is an enterprise-grade, monorepo-based development boilerplate and build system for WordPress and WooCommerce plugins. It bridges modern software engineering practices with WordPress's legacy ecosystem:

1. **Modular Source Development (`src/` & `packages/wpdev-framework`):**
   - Clean, testable, object-oriented PHP architecture based on `ModuleLoader` and `ModuleInterface`.
   - Modern JavaScript/TypeScript client builds with Preact/React aliasing and the Polaris Design System (`packages/polaris-stack/`).
   - Standard PSR-4 namespacing, comprehensive Jest and PHPUnit test harnesses, static analysis (PHPStan level 2+), and WPCS linting.
2. **Scaffolding & Lifecycle Tooling (`packages/create-wp-project`):**
   - CLI engine (`wpdev` / `npm run scaffold`) that generates and manages plugins from a declarative feature catalog (`features.js`).
   - Pure dry-run update planning (`wpdev update`) and automated migrations (`wpdev update --run`).
3. **Production Distribution & Standalone Hardening (`packages/standalone-build`):**
   - Standalone plugin packager that inlines required framework closures into the **generated plugin** at `{plugin}/src/FrameworkClosure/` (see `packages/standalone-build/assemble-profile-s-candidate.mjs`) so client plugins run without a parent framework dependency. ⚠️ This path exists inside the build output only — there is no `src/FrameworkClosure/` in this monorepo.
   - **Profile S AST Obfuscator & Spaghettification Engine:** Strips 100% of internal DocBlocks/comments, mangles internal symbols (`_c_...`, `_f_...`, `_p_...`, `$_v_...`), downlevels syntax to PHP 7.4 via Rector, and compresses code into a dense single-use legacy structure to prevent framework theft.
   - **Zero-Regression Invariant:** Enforces strict whitelist preservation for WordPress hooks, filters, globals, WooCommerce APIs, and gettext translations.
   - **Transactional Write-Ahead Log (WAL):** Atomic staging and fail-closed crash rollback during deployment.

---

## 2. Monorepo Directory Map

```text
wp-starter-kit/
├── wpdev-starter.php                  # Main starter plugin entrypoint
├── wpdev.json                         # PRIMARY SOURCE OF TRUTH: Branding, features & runtime config
├── composer.json / package.json       # Monorepo dependencies, npm workspaces & Composer path repositories
├── phpstan.neon / phpcs.xml           # Static analysis and WordPress Coding Standards rules
├── phpunit.xml.dist / jest.config.mjs # PHPUnit & Jest test configurations
│
├── src/                               # Starter plugin core implementation
│   ├── Core/                          # Plugin bootstrap, ModuleLoader, ModuleInterface
│   ├── Modules/                       # Built-in feature modules (Blocks, McpAbilities, etc.)
│   ├── Support/                       # Infrastructure: REST handlers, Shortcodes, Auth, Assets
│   └── Adapters/                      # Bridges to WPDev admin framework
│
├── packages/                          # Monorepo packages & sub-systems
│   ├── standalone-build/              # Production assembler, Profile S AST obfuscator, WAL journal & 81 test suites
│   ├── create-wp-project/             # CLI scaffolder, feature catalog, migration engine & health doctor
│   ├── cli/                           # wpdev CLI binary wrapper
│   ├── wpdev-framework/               # Core admin framework (Admin pages, list tables, settings, field builders)
│   ├── wpdev-bridge/                  # Bridge layer between plugins and framework
│   ├── polaris-stack/                 # (Git Submodule) Polaris Design System UI components & dark mode
│   ├── mcp-integration/              # WordPress Abilities API & Model Context Protocol (MCP) integration
│   ├── php-fault-tolerance/           # Circuit breaker, HTTP batching & retry handlers (PHP 8.1+)
│   ├── php-test-tools/                # Test utilities, assertions, and patch runner
│   ├── plugin-core-test/              # Base test cases for integration testing
│   ├── rest-utils/                    # Batch REST client & fetch utilities
│   ├── hooks/ / html-utils/ / utils/  # Lightweight TypeScript/PHP cross-cutting helpers
│   ├── rule-engine/                   # Conditional rules & dynamic evaluation engine
│   ├── translation/                   # Gettext translation compiler & extraction scripts
│   ├── ui-components/                 # Reusable Preact/React UI elements
│   └── build-go/                      # New Go build system (wpdev-build: config, hash, sidecar, CLI)
│
├── core/packages/                     # JS build workspaces (esbuild orchestration)
│   ├── build/                         # [DEPRECATED] Legacy Node.js build CLIs (deprecated in favor of build-go)
│   ├── dependency-extraction-esbuild-plugin/ # Emits WordPress .asset.php sidecars
│   └── utils/                         # Config readers and build helpers
│
├── dev/                               # Build & release development scripts
│   ├── rector-build.php / rector-upgrade.php # Syntax downgrade and upgrade rules
│   ├── rector-prefix.php              # Strauss vendor namespace prefixer
│   └── translation/                   # Translation generation and compile helpers
│
├── docs/                              # In-repo docs (user-guide, technical, templates, architecture guides)
│   ├── user-guide/                    # Client manuals (01-introduction.md, 02-settings-overview.md)
│   ├── technical/                     # Architecture & hook contracts (architecture.md)
│   ├── templates/                     # Standard templates (feature-manual.md)
│   └── assets/                        # Documentation images & diagrams
│
├── tools/                             # Build & docs tooling
│   └── build-docs.mjs                 # Turnkey Docs-as-Code PDF & Docx compiler
│
├── tests/                             # Root Jest suites (167 suites, 1540+ tests) & tests/phpunit/
├── migration/                         # Go build migration record: RULEBOOK.md, fixtures, evidence
└── dist/                              # Local scaffold and build outputs (gitignored)
```

---

## 3. Core Architecture & Invariants

### 3.1 Single Source of Truth: `wpdev.json`

All plugin behavior, identity, and build settings originate from `wpdev.json`. Never hardcode identifiers that can be derived from this configuration:

- `slug`, `globalName`, `localizeVar`, `textDomain`, `hookPrefix`, `npmScope`.
- `uiFramework`: `preact` or `react` (aliased at install time via `react -> @preact/compat`).
- `phpMinVersion` (e.g. `7.4`) vs `phpSourceVersion` (e.g. `8.1`). Code is authored in modern PHP and automatically downgraded to `phpMinVersion` via Rector on release.
- `vendorPrefix`: Namespace prefix used by Strauss for third-party dependencies in `dist/`.

### 3.2 PHP Module System

Plugins boot through `src/Core/Plugin.php`:

- `ModuleLoader` discovers and initializes any class implementing `src/Core/ModuleInterface`.
- Modules live in `src/Modules/{ModuleName}/` and must remain self-contained.
- If a module includes frontend assets, entries reside in `src/Modules/{ModuleName}/assets/entries/*.{ts,tsx}` and compile automatically into `assets/bundles/{Module}-{entry}.js`.
- Duck-Typed Module Registration: In standalone/inlined builds, module loaders accept `object` to allow plugins to coexist without strict type-locking collisions.

### 3.3 The Legacy 4-Stage Client Build Pipeline (Deprecated)

Managed by esbuild via `npm run build` or `npm run dev` (`core/packages/build/` — **Deprecated**):

1. `build:dependencies`: Extracts vendor libraries into `{slug}-deps.js` with `.asset.php` sidecar.
2. `build:components`: Scans module entries and compiles Preact/React/Polaris components.
3. `build:styles`: Bundles CSS with content-hash sidecars.
4. `build:assets`: Synchronizes third-party assets from `node_modules` into `assets/libraries/`.

### 3.4 The Go Build System (`packages/build-go`)

The next-generation build system is implemented in Go (`packages/build-go` / binary `wpdev-build`) with zero-drift parity:

- **`wpdev-build config`**: Fast `wpdev.json` discovery, validation, and JSON serialization with JS falsy/truthy semantics.
- **`wpdev-build hash`**: WHATWG-compliant lossy UTF-8 MD5 asset hashing matching Node.js `Buffer.toString("utf8")`.
- **`sidecar`**: High-performance, deterministic `.asset.php` sidecar generation.
- **`covercheck`**: Coverage profile parser and enforcement engine.

### 3.5 In-Repo Docs-as-Code Architecture & Export Engine

Every plugin generated by `wpdev create` (with `features.docs` enabled) includes a first-class, version-controlled documentation subsystem that compiles into client-ready deliverables without external detached repositories:

1. **Integrated Directory Layout:**
   - `docs/user-guide/`: End-user and admin manuals (`01-introduction.md`, `02-settings-overview.md`).
   - `docs/technical/`: Developer architecture, hook contracts, and internals (`architecture.md`).
   - `docs/templates/`: Standardized templates for documenting new features (`feature-manual.md`).
   - `docs/assets/`: Screenshots and diagrams.
2. **Declarative Configuration (`wpdev.json`):**
   ```json
   "docs": {
     "enabled": true,
     "title": "راهنمای کاربری و تنظیمات سامانه",
     "author": "تیم توسعه",
     "user_guide_dir": "docs/user-guide",
     "output_dir": "dist/docs",
     "formats": ["pdf", "docx"],
     "template": "purple_book",
     "direction": "rtl"
   }
   ```
3. **Turnkey Export CLI (`tools/build-docs.mjs`):**
   - Commands: `npm run docs:build` (all formats), `npm run docs:pdf`, `npm run docs:docx`.
   - Engine hierarchy: Integrates with `md-to-docx` (`md2docx` binary / `.venv`) for RTL/Persian + Vazirmatn typography, with resilient Pandoc fallback.
   - **Fail-Closed Asset Verification:** Scans markdown `![]()` and HTML `<img src>` for referenced assets before compilation. Missing local files fail immediately with exit code 1.
4. **Release Pipeline Integration (`release:dist --with-docs`):**
   - Automatically builds `dist/docs/<slug>-user-manual.pdf` and outputs it alongside `<slug>.zip` for customer handoff, while keeping raw markdown out of the production runtime zip.

---

## 4. Standalone Build, AST Obfuscation & Hardening (Profile S)

When plugins are packaged for client handoff or production deployment, `packages/standalone-build` executes the protection pipeline:

```
[Clean Source in Git] ───► [inline-wpdev-closure.mjs] ───► [rector-downgrade-php74.php]
                                                                   │
                                                                   ▼
[Hermetic Candidate ZIP] ◄─── [verify-profile-s-artifact] ◄─── [plan3/transformer.php]
            │
            ▼
[deploy-standalone-plugin.mjs] ──(Transactional WAL + Atomic Swap)──► [Live Plugin]
```

### Critical Preservation Rules (Zero-Regression Invariant)

The transformer (`plan3/transformer.php`) strips comments, mangles internal symbols, and compacts whitespace, but **MUST NEVER TOUCH**:

1. **WordPress Core APIs:** Globals (`$wpdb`, `$_POST`, `$_GET`, etc.), actions/filters (`add_action`, `apply_filters`), option names, and post meta keys.
2. **WooCommerce Integrations:** Public classes extending `WC_Product_*`, `WC_Order_*`, and checkout action hooks.
3. **Strings, SQL & Translations:** All SQL queries (`$wpdb->prepare`), HTML templates, and gettext translation strings (`__('Text', 'domain')`, `%1$s`).
4. **`WP_List_Table` Ancestry:** Classes extending WordPress table classes (e.g. `Base_List_Table`) must keep exact inheritance.

_(For exhaustive architectural details, refer to [`packages/standalone-build/OBFUSCATION_AND_SPAGHETTIFICATION_CONTEXT.md`](packages/standalone-build/OBFUSCATION_AND_SPAGHETTIFICATION_CONTEXT.md))._

---

## 5. Developer & Agent Operational Workflows

### 5.1 Environment Setup & First-Time Bootstrap

```bash
# Install npm dependencies across all workspaces and Composer packages
npm install
composer install --ignore-platform-req=php --no-scripts
composer scope:vendor
```

### 5.2 Day-to-Day Development

```bash
# Watch mode for TypeScript, CSS, and Preact components
npm run dev

# Check configuration and runtime validity
npm run check

# TypeScript typechecking
npm run typecheck

# Code formatting and linting
npm run lint:js
composer validate:phpstan
composer validate:cs
```

### 5.3 Test Execution

```bash
# Run all root Jest suites (166 suites, 1530+ tests)
npm test

# Run Go build system tests (with race detection)
cd packages/build-go && go test -race ./...

# Run root PHPUnit tests
composer test

# Run standalone build test suites (81 canonical files)
export WPDEV_CONTENT_ROOT="/path/to/wordpress/wp-content"
cd packages/standalone-build && npm test
```

### 5.4 Standalone Building & Obfuscation

```bash
# Clean standalone build (framework inlined, no obfuscation)
node packages/standalone-build/build-all-standalone-plugins.mjs --build-only

# Complete Profile S obfuscation + atomic deploy with 4 workers
node packages/standalone-build/build-all-standalone-plugins.mjs --obfuscate --deploy --jobs=4

# Deploy existing ZIP safely via sibling staging and WAL rollback
node packages/standalone-build/deploy-standalone-plugin.mjs dist/plugin-profile-s.zip plugin-slug
```

### 5.5 Scaffolding New Plugins

```bash
# Scaffold a new modular plugin using the CLI engine
npm run scaffold -- --slug=my-custom-plugin --name="My Custom Plugin"

# Check project health
npm run doctor

# Inspect available features
npm run add-feature -- --list
```

### 5.6 In-Repo Documentation & Release Packaging

```bash
# Compile manuals to PDF and Docx
npm run docs:build

# Compile single format
npm run docs:pdf
npm run docs:docx

# Package release zip with client PDF user manual
npm run release:dist -- --with-docs
```

---

## 6. Strict Rules & Guardrails for AI Agents

1. **Test-Driven Development (TDD):**
   - Always write or update tests before or concurrently with code edits.
   - When modifying `packages/standalone-build/`, verify that `packages/standalone-build/test-dependency-registry.mjs` remains synchronized with the 81 test suites.
2. **Never Edit Deployed/Active Plugin Folders Directly:**
   - Files under `/wordpress/wp-content/plugins/{slug}/` are generated build targets.
   - Always make code modifications in the source trees (`src/`, `packages/`, or `*-dev` folders), then run the build pipeline.
3. **No Unsafe Execution or Runtime Decryption:**
   - Do NOT introduce `eval()`, `create_function()`, `preg_replace /e`, runtime PHP file generation, or runtime string decryption. All code must remain clean, static PHP 7.4+ compatible syntax.
4. **Never Unzip Directly onto Active Plugins:**
   - Overwriting active plugin folders causes fatal errors for concurrent requests. Always extract to sibling staging directories and perform atomic renames via the WAL journal (`deploy-standalone-plugin.mjs`).
5. **Preserve WordPress Security Standards:**
   - Always verify nonces on form submissions and Ajax actions.
   - Always verify capabilities via `current_user_can()`.
   - Sanitize inputs (`sanitize_text_field`, `wp_unslash`) and escape outputs (`esc_html`, `esc_attr`, `wp_kses_post`).
   - Use `$wpdb->prepare()` for all custom SQL queries.
   - Set a strict `permission_callback` on all REST API routes.
6. **Preserve Vendor Scoping:**
   - Never commit un-scoped third-party Composer packages to production distributions. Always run `composer scope:vendor` (Strauss) to ensure clean namespace prefixes.
7. **Maintain In-Repo Documentation Integrity:**
   - Any new architectural capability, module, or user-facing feature must include corresponding documentation in `docs/user-guide/` or `docs/technical/`.
   - Never commit broken image links or missing assets in documentation files; all relative assets must exist under `docs/assets/` to satisfy the fail-closed verification gate.
   - When building client deliverables, always verify that `tools/build-docs.mjs` runs and succeeds without errors.

---

## 7. Key Documentation Links

- **Protection & Obfuscation Master Guide:** [`packages/standalone-build/OBFUSCATION_AND_SPAGHETTIFICATION_CONTEXT.md`](packages/standalone-build/OBFUSCATION_AND_SPAGHETTIFICATION_CONTEXT.md)
- **Deployment SOP:** [`packages/standalone-build/SOP_PRODUCTION_PLUGIN_DEPLOYMENT.md`](packages/standalone-build/SOP_PRODUCTION_PLUGIN_DEPLOYMENT.md)
- **Full Obfuscator Audit & Remediation Log:** [`packages/standalone-build/FULL_BUILD_OBFUSCATOR_AUDIT_AND_REMEDIATION.md`](packages/standalone-build/FULL_BUILD_OBFUSCATOR_AUDIT_AND_REMEDIATION.md)
- **General Architecture:** [`docs/architecture.md`](docs/architecture.md)
- **Build System Reference:** [`docs/build-system.md`](docs/build-system.md)
- **Module Authoring Guide:** [`docs/module-guide.md`](docs/module-guide.md)
- **CLI & Scaffolding Reference:** [`docs/cli-reference.md`](docs/cli-reference.md)
