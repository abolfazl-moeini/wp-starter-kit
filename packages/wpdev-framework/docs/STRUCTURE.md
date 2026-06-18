# WPDev Repository Structure

Root: `wp-content/plugins/wpdev/` (framework plugin).

WordPress requires bootstrap files at the plugin root. Optional WaaS demos and playground panels ship in **sibling plugins**, not inside `wpdev/`.

## Runtime (shipped in release zip)

```
wpdev/
├── wpdev.php              # Main bootstrap
├── wp-dev.php             # Legacy entry shim → wpdev.php
├── constants.php
├── autoload.php
├── sunrise.php            # Copy to wp-content/sunrise.php for domain mapping
├── uninstall.php
├── readme.txt
├── LICENSE
├── loco.xml
│
├── modules/               # Framework — REQUIRED; removing folders may fatal
│   └── */examples/        # Module-local API snippets (not WaaS domains)
│
├── assets/                # Plugin-level CSS/JS/images
├── views/                 # Plugin-level PHP views
├── lang/                  # Translations
├── data/                  # Static data files
├── inc/                   # Legacy artifact (PHP-free; do not add runtime PHP)
└── dependencies/          # Bundled third-party libraries
```

## Sibling plugins (optional, same plugins directory)

```
wp-content/plugins/
├── wpdev/                 # Framework (this repo)
├── wpdev-examples/        # WaaS domain modules — defines WPDEV_EXAMPLES_DIR
└── wpdev-playground/      # Dev playground menu — defines WPDEV_PLAYGROUND_DIR
```

## Documentation (dev / GitHub)

```
docs/
├── README.md
├── STRUCTURE.md           # This file
├── RELEASE-PREP.md
├── CONTEXT.md
├── api/                   # Generated API reference + manifest.json
├── framework/             # Module usage guides (start here)
├── modularization/        # Migration history (some sections superseded)
├── code-review/
└── site/                  # Static docs site (open docs/site/index.html)
```

## Layer contract

| Layer | Path | Delete behavior |
|-------|------|-----------------|
| Framework | `wpdev/modules/` | May fatal — core loaders and builders |
| WaaS examples | `wpdev-examples/{slug}/` | Safe — only that example's admin UI disappears |
| Playground | `wpdev-playground/playground-*/` | Safe — dev menu panels only |
| Module snippets | `modules/*/examples/` | Safe — documentation samples only |
| Docs | `docs/` | Safe — no runtime effect |
| Legacy | `inc/` | Must stay PHP-free |

## Module-local examples

`modules/*/examples/example-*.php` are **API snippets** for a single framework module. Domain implementations belong in **wpdev-examples** (`wpdev-examples/{slug}/setup.php`).

## Naming

- Framework module id: `field-builder`, `admin-page-builder`, …
- WaaS example module id: `wpdev-products`, `wpdev-sites`, …
- Example folder: `wpdev-examples/products/` (not `wpdev-examples/wpdev-products/`)
- Playground panel dir: `wpdev-playground/playground-{module}/`

## Related

- Framework modules: [`../modules/README.md`](../modules/README.md)
- Module guides: [`framework/README.md`](framework/README.md)
- WaaS contract: **wpdev-examples** plugin `README.md`
- Release steps: [`RELEASE-PREP.md`](RELEASE-PREP.md)
