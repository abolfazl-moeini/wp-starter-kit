# JS packages map (generated plugin)

Prefer **package name** imports. Never deep relative paths into packages.

| Import                            | Source on disk (typical)                           | Role                                |
| --------------------------------- | -------------------------------------------------- | ----------------------------------- |
| `@wpdev/polaris-stack`            | `src/polaris/` (file:) or `packages/polaris-stack` | Components + layout + theme API     |
| `@wpdev/polaris-stack/styles.css` | same                                               | Global design-system CSS            |
| `@wpdev/hooks`                    | `packages/hooks`                                   | Action/filter bridge to deps bundle |
| `@wpdev/utils`                    | `packages/utils`                                   | localize.api() REST helpers         |
| `@wpdev/rest-utils`               | `packages/rest-utils`                              | Batch fetch / cache                 |
| `@wpdev/ui-components`            | `packages/ui-components`                           | WDForm and related UI               |
| `@wpdev/html-utils`               | `packages/html-utils`                              | DOM helpers                         |
| `@wpdev/translation`              | `packages/translation`                             | Client i18n helpers                 |
| `@wpdev/rule-engine`              | `packages/rule-engine`                             | Client rules                        |
| `@/*`                             | `src/*`                                            | Project-local path alias (tsconfig) |
| `@wordpress/*`                    | WP script deps                                     | Official WP packages                |

## Entry → bundle contract

```
src/Modules/{Module}/assets/entries/{entry}.ts(x)
  → assets/bundles/{Module}-{entry}.js
  → optional assets/bundles/{Module}-{entry}.css
  → .asset.php sidecar for WP dependencies
```

## Polaris import template

```ts
import "@wpdev/polaris-stack/styles.css";
import { Stack, Card, Button, setPolarisTheme } from "@wpdev/polaris-stack";
```

## Anti-patterns

```ts
// BAD
import "../../../../polaris/styles.css";
import { Stack } from "../../../../polaris";

// GOOD
import "@wpdev/polaris-stack/styles.css";
import { Stack } from "@wpdev/polaris-stack";
```
