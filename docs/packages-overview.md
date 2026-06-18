# Packages overview

> Where every npm and Composer package lives, what it does, and whether
> it is published. API details: [api/js-reference.md](api/js-reference.md)
> (JS) and [api/php-reference.md](api/php-reference.md) (PHP).

## npm packages (`@wpdev/*`)

| Package                                       | Type             | Role                                                      | Published | Entry                        | API doc                                                      |
| --------------------------------------------- | ---------------- | --------------------------------------------------------- | --------- | ---------------------------- | ------------------------------------------------------------ |
| `@wpdev/cli`                                  | CLI              | `wpdev` binary (create, add, remove, set, update, doctor) | yes       | `bin/wpdev.js`               | [cli-reference.md](cli-reference.md)                         |
| `@wpdev/create-wp-project`                    | engine           | Templates, features, manifest, migrations                 | yes       | `src/index.js`               | [scaffold.md](scaffold.md)                                   |
| `@wpdev/create-plugin`                        | shim             | `npm create @wpdev/plugin` wrapper                        | yes       | `bin/create-wpdev-plugin.js` | [installer.md](installer.md)                                 |
| `@wpdev/hooks`                                | lib              | Config-driven WP hooks accessor                           | yes       | `index.js`                   | [js-reference.md](api/js-reference.md#wpdevhooks)            |
| `@wpdev/utils`                                | lib              | `localize` REST helpers                                   | yes       | `index.js`                   | [js-reference.md](api/js-reference.md#wpdevutils)            |
| `@wpdev/rest-utils`                           | lib              | REST client + fetch/batch                                 | yes       | `index.js`                   | [js-reference.md](api/js-reference.md#wpdevrest-utils)       |
| `@wpdev/html-utils`                           | lib              | `elementProps`, DOM helpers                               | yes       | `index.js`                   | [js-reference.md](api/js-reference.md#wpdevhtml-utils)       |
| `@wpdev/ui-components`                        | lib              | WDForm CRUD components                                    | yes       | `index.js`                   | [js-reference.md](api/js-reference.md#wpdevui-components)    |
| `@wpdev/fetch`                                | lib (deprecated) | Re-export shim → `rest-utils/fetch`                       | yes       | `src/index.ts`               | [js-reference.md](api/js-reference.md#wpdevfetch-deprecated) |
| `@wpdev/translation`                          | lib              | Translation map helpers                                   | yes       | `src/index.js`               | [js-reference.md](api/js-reference.md#wpdevtranslation)      |
| `@wpdev/rule-engine`                          | lib              | Signal tuple rule engine                                  | yes       | `index.js`                   | [js-reference.md](api/js-reference.md#wpdevrule-engine)      |
| `@wpdev/polaris-stack`                        | lib              | Polaris design system                                     | internal  | `index.js`                   | [polaris-stack README](../packages/polaris-stack/README.md)  |
| `@wpdev/build`                                | tooling          | esbuild build scripts                                     | yes       | `index.js`                   | [build-system.md](build-system.md)                           |
| `@wpdev/dependency-extraction-esbuild-plugin` | tooling          | WP deps extraction plugin                                 | yes       | `index.js`                   | [build-system.md](build-system.md)                           |

## Composer packages

| Package                     | Type      | Role                              | Published | Entry                 | API doc                                  |
| --------------------------- | --------- | --------------------------------- | --------- | --------------------- | ---------------------------------------- |
| `wpdev/framework`           | framework | `WPDev\Core\*`, `WPDev\Support\*` | yes       | `src/Core/Plugin.php` | [php-reference.md](api/php-reference.md) |
| `wpdev/php-fault-tolerance` | lib       | Circuit breaker, HTTP batch       | yes       | `src/functions.php`   | [fault-tolerance.md](fault-tolerance.md) |
| `wpdev/mcp-integration`     | lib       | WordPress Abilities API           | internal  | `src/`                | —                                        |

## Internal / vendored

| Path                        | Role                         | Notes                                                           |
| --------------------------- | ---------------------------- | --------------------------------------------------------------- |
| `packages/wpdev-framework/` | WPDev Admin Framework source | Vendored into `companion-plugins/wpdev/`; excluded from PHPStan |
| `packages/mcp-integration/` | Abilities API bridge         | Feature-gated (`mcpAbilities:on`)                               |
| `packages/polaris-stack/`   | Design system                | Feature-gated (`frontendStack:polaris`)                         |

## Publishability contract

Publishable npm packages are enforced by `tests/packages/publishable.test.js`:
non-empty `files` whitelist, semver `version`, `main` or `exports`, not
`private:true`. The three CLI packages (`create-plugin`, `cli`,
`create-wp-project`) must be on npm for `npm create @wpdev/plugin` to work.
See [release-checklist.md](release-checklist.md#npm-publish-kit-cli-packages).

## Workspace layout

```
wp-starter-kit/
├── packages/           # @wpdev/* libs + CLI + engine
├── core/packages/      # @wpdev/build tooling
└── packages/framework/ # wpdev/framework (Composer)
```

Consumer projects resolve `@wpdev/*` from npm and `wpdev/framework` from
Packagist (or path repos during development).

## See also

- [architecture.md](architecture.md) — how packages fit together
- [framework-as-dependency.md](framework-as-dependency.md) — `distMode` model
