# Features reference

> Full catalog of all 19 installer features (including `ci`). For the
> manifest model and ownership rules, see
> [features-and-manifest.md](features-and-manifest.md).

Each feature has: **variants**, **default**, **toggle command**, and
**what it enables**.

## Summary table

| ID               | Variants                      | Default    | Command    |
| ---------------- | ----------------------------- | ---------- | ---------- |
| `js`             | typescript, pure, flow, none  | typescript | add/remove |
| `jsLib`          | none, preact, react           | none       | add/remove |
| `jsTest`         | jest, vitest, none            | jest       | add/remove |
| `phpMinVersion`  | 7.4–8.3                       | 7.4        | **set**    |
| `phpFramework`   | none, wpdev                   | none       | add/remove |
| `phpTest`        | phpunit, none                 | phpunit    | add/remove |
| `restBatch`      | off, on                       | off        | add/remove |
| `faultTolerance` | off, on                       | off        | add/remove |
| `vendorScoping`  | on, off                       | on         | add/remove |
| `husky`          | on, off                       | on         | add/remove |
| `css`            | none, sass, tailwind, postcss | none       | add/remove |
| `blocks`         | off, on                       | off        | add/remove |
| `license`        | gpl2, gpl3, mit               | gpl2       | **set**    |
| `wpMinVersion`   | 5.8, 6.0, 6.2, 6.4, 6.6       | 6.0        | **set**    |
| `exampleFeature` | on, off                       | on         | add/remove |
| `i18n`           | on, off                       | on         | add/remove |
| `frontendStack`  | none, polaris                 | none       | add/remove |
| `mcpAbilities`   | off, on                       | off        | add/remove |
| `ci`             | auto, off                     | auto       | **set**    |

---

## `js`

|                 |                                                           |
| --------------- | --------------------------------------------------------- |
| **Variants**    | `typescript`, `pure`, `flow`, `none`                      |
| **Default**     | `typescript`                                              |
| **Command**     | `wpdev add js` / `wpdev remove js`                        |
| **Enables**     | esbuild pipeline, `package.json`, JS test runner          |
| **Owned paths** | `package.json`, build config, `assets/entries/`           |
| **Conflicts**   | `none` disables `jsLib`, `jsTest`, `css`, `frontendStack` |

## `jsLib`

|              |                                                          |
| ------------ | -------------------------------------------------------- |
| **Variants** | `none`, `preact`, `react`                                |
| **Default**  | `none`                                                   |
| **Command**  | `wpdev add jsLib` / `wpdev remove jsLib`                 |
| **Requires** | `js ≠ none`                                              |
| **Enables**  | Preact/React via esbuild alias (`uiFramework` in config) |

## `jsTest`

|              |                                            |
| ------------ | ------------------------------------------ |
| **Variants** | `jest`, `vitest`, `none`                   |
| **Default**  | `jest`                                     |
| **Command**  | `wpdev add jsTest` / `wpdev remove jsTest` |
| **Requires** | `js ≠ none`                                |
| **Enables**  | Jest or Vitest config + test scripts       |

## `phpMinVersion`

|               |                                                                    |
| ------------- | ------------------------------------------------------------------ |
| **Variants**  | `7.4`, `8.0`, `8.1`, `8.2`, `8.3`                                  |
| **Default**   | `7.4`                                                              |
| **Command**   | `wpdev set phpMinVersion <ver>`                                    |
| **Enables**   | Rector downgrade target, `composer.json` PHP constraint            |
| **Conflicts** | `faultTolerance:on` requires `≥ 8.1`; `blocks:on` warns if `< 8.2` |

## `phpFramework`

|                |                                                            |
| -------------- | ---------------------------------------------------------- |
| **Variants**   | `none`, `wpdev`                                            |
| **Default**    | `none`                                                     |
| **Command**    | `wpdev add phpFramework` / `wpdev remove phpFramework`     |
| **Enables**    | `companion-plugins/wpdev/`, `FrameworkBridge.php`, adapter |
| **Validation** | `hookPrefix ≠ wpdev`, `phpFunctionPrefix ≠ wpdev_`         |

## `phpTest`

|              |                                              |
| ------------ | -------------------------------------------- |
| **Variants** | `phpunit`, `none`                            |
| **Default**  | `phpunit`                                    |
| **Command**  | `wpdev add phpTest` / `wpdev remove phpTest` |
| **Enables**  | PHPUnit config, `tests/phpunit/` scaffold    |

## `restBatch`

|              |                                                        |
| ------------ | ------------------------------------------------------ |
| **Variants** | `off`, `on`                                            |
| **Default**  | `off`                                                  |
| **Command**  | `wpdev add restBatch` / `wpdev remove restBatch`       |
| **Enables**  | REST batch endpoint + `@wpdev/rest-utils` batch client |

## `faultTolerance`

|              |                                                            |
| ------------ | ---------------------------------------------------------- |
| **Variants** | `off`, `on`                                                |
| **Default**  | `off`                                                      |
| **Command**  | `wpdev add faultTolerance` / `wpdev remove faultTolerance` |
| **Requires** | `phpMinVersion ≥ 8.1`                                      |
| **Enables**  | `@wpdev/php-fault-tolerance` Composer dep                  |

## `vendorScoping`

|              |                                                          |
| ------------ | -------------------------------------------------------- |
| **Variants** | `on`, `off`                                              |
| **Default**  | `on`                                                     |
| **Command**  | `wpdev add vendorScoping` / `wpdev remove vendorScoping` |
| **Enables**  | Strauss config in `composer.json`                        |

## `husky`

|              |                                          |
| ------------ | ---------------------------------------- |
| **Variants** | `on`, `off`                              |
| **Default**  | `on`                                     |
| **Command**  | `wpdev add husky` / `wpdev remove husky` |
| **Enables**  | `.husky/`, `prepare` script              |

## `css`

|              |                                       |
| ------------ | ------------------------------------- |
| **Variants** | `none`, `sass`, `tailwind`, `postcss` |
| **Default**  | `none`                                |
| **Command**  | `wpdev add css` / `wpdev remove css`  |
| **Requires** | `js ≠ none`                           |
| **Enables**  | CSS build step in esbuild pipeline    |

## `blocks`

|              |                                              |
| ------------ | -------------------------------------------- |
| **Variants** | `off`, `on`                                  |
| **Default**  | `off`                                        |
| **Command**  | `wpdev add blocks` / `wpdev remove blocks`   |
| **Enables**  | Blockstudio 7, `blocks/` directory           |
| **Requires** | PHP 8.2+ runtime for Blockstudio vendor code |

## `license`

|              |                                             |
| ------------ | ------------------------------------------- |
| **Variants** | `gpl2`, `gpl3`, `mit`                       |
| **Default**  | `gpl2`                                      |
| **Command**  | `wpdev set license <id>`                    |
| **Enables**  | `LICENSE` file, plugin header license field |

## `wpMinVersion`

|              |                                   |
| ------------ | --------------------------------- |
| **Variants** | `5.8`, `6.0`, `6.2`, `6.4`, `6.6` |
| **Default**  | `6.0`                             |
| **Command**  | `wpdev set wpMinVersion <ver>`    |
| **Enables**  | `Requires at least` plugin header |

## `exampleFeature`

|              |                                                            |
| ------------ | ---------------------------------------------------------- |
| **Variants** | `on`, `off`                                                |
| **Default**  | `on`                                                       |
| **Command**  | `wpdev add exampleFeature` / `wpdev remove exampleFeature` |
| **Enables**  | `src/Modules/ExampleFeature/` demo module                  |

## `i18n`

|              |                                        |
| ------------ | -------------------------------------- |
| **Variants** | `on`, `off`                            |
| **Default**  | `on`                                   |
| **Command**  | `wpdev add i18n` / `wpdev remove i18n` |
| **Enables**  | Translation pipeline scripts           |

## `frontendStack`

|              |                                                          |
| ------------ | -------------------------------------------------------- | ------ |
| **Variants** | `none`, `polaris`                                        |
| **Default**  | `none`                                                   |
| **Command**  | `wpdev add frontendStack` / `wpdev remove frontendStack` |
| **Requires** | `js=typescript`, `jsLib=preact                           | react` |
| **Enables**  | `@wpdev/polaris-stack` design system                     |

## `mcpAbilities`

|              |                                                        |
| ------------ | ------------------------------------------------------ |
| **Variants** | `off`, `on`                                            |
| **Default**  | `off`                                                  |
| **Command**  | `wpdev add mcpAbilities` / `wpdev remove mcpAbilities` |
| **Enables**  | WordPress Abilities API integration (WP 6.9+)          |

## `ci`

|              |                                                       |
| ------------ | ----------------------------------------------------- |
| **Variants** | `auto`, `off`                                         |
| **Default**  | `auto`                                                |
| **Command**  | `wpdev set ci <auto\|off>`                            |
| **Enables**  | `.github/workflows/ci.yml` when any test runner is on |

---

## Validation rules

`validateFeatureSet()` enforces cross-feature dependencies before any
generator writes. Key rules:

- `js:none` → `jsLib`, `jsTest`, `css` must be off/none
- `faultTolerance:on` → `phpMinVersion ≥ 8.1`
- `frontendStack:polaris` → `js=typescript`, `jsLib ∈ {preact, react}`
- `phpFramework:wpdev` → prefixes must not collide with `wpdev` / `wpdev_`

## See also

- [features-and-manifest.md](features-and-manifest.md) — manifest schema
- [cli-reference.md](cli-reference.md) — commands and flags
