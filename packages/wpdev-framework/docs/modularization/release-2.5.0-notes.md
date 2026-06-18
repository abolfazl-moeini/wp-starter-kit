# WPDev 2.5.0 — Release notes

> **Note:** WPDev **2.8.0** moved WaaS domains to `examples/*` and split framework vs optional examples. See [`release-2.8.0-notes.md`](release-2.8.0-notes.md).

## Summary

Modularization release: framework runtime under `modules/`; optional WaaS under `examples/` (since 2.8.0). Phase 2.9 removed `inc/**/*.php` shims (~259 files). Version **2.5.0** introduced modular layout; **2.8.0** completed the examples split.

Plugin bootstrap file is **`wpdev.php`** (canonical). **`wp-dev.php`** remains as a thin back-compat shim.

## Upgrade (multisite)

1. Deploy plugin files.
2. Sunrise updates automatically when `WPDEV_SUNRISE_VERSION` in `wp-content/sunrise.php` is below **2.5.0** (`Sunrise::manage_sunrise_updates` on `wpdev_init`), or copy manually:

   ```bash
   cp wp-content/plugins/wpdev/sunrise.php wp-content/sunrise.php
   ```

3. Verify: `composer audit:sunrise` or `composer regression:docker` (Docker).

## Verification commands

```bash
composer ci                  # CI / no WordPress
composer release:gate        # full P2 (needs wp-load.php)
RUN_DOCKER=1 composer pre-release
composer profile:modules     # module load ms (Docker/WP)
```

## Git (maintainers)

```bash
./bin/git-push-release.sh
# or manually:
git fetch origin && git rebase origin/main
git push origin main
git push origin v2.5.0 --force-with-lease
```

### Commits in this release (after `adad250`)

| Commit | Description |
|--------|-------------|
| `8d94715` | Release 2.5.0: modularization, inc/ shims removed |
| `3aeead2` | Release notes, `.gitignore` `.DS_Store` |
| `b8bccb0` | Stop tracking `.DS_Store` files |
| `681ec30` | Release notes commit list |
| `06af092` | P3 module profiler + baseline |
| `2326945` | Streamline P2 sign-off (13 steps) |
| `d20f68e` | Merge `origin/main` |
| `eca1d15` | `wpdev.php` canonical bootstrap + `wp-dev.php` shim |
| `e9fe865` | Docker regression when setup not finished |

**Tag:** `v2.5.0` (move to latest `main` before publishing — includes merge + `wpdev.php` fixes)

**Repository:** https://github.com/abolfazl-moeini/wpdev-core

## Highlights

- Bootstrap: `wp-dev.php` requires `modules/core/src/class-wpdev.php`
- `WPDevFramework\Autoloader` → `modules/core/src`
- Sunrise `WPDEV_SUNRISE_VERSION` **2.5.0** with auto-copy to `wp-content/`
- Tooling: `composer ci`, `release:gate`, `regression:docker`, `pre-release`
- GitHub Actions: `.github/workflows/plugin-ci.yml`
- **117** PHPUnit tests; Docker wp-load + admin regressions green
