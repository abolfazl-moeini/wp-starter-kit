# Legacy `inc/` directory (Phase 2.9)

As of WPDev **2.5.0**, **all PHP under `inc/` has been removed**. Canonical code lives under `modules/`.

Legacy subsystem directories (`models/`, `database/`, `ui/`, etc.) were removed after Phase 2.9. Only non-runtime artifacts remain (`next/phpcs.xml`). Do not add new PHP here — use the appropriate `modules/*` path and `Legacy_Shim_Autoloader` / Composer autoload instead.

Deprecated API notes: `modules/core/src/deprecated/deprecated-apis.md`.
