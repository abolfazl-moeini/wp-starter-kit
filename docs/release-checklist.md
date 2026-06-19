# Release Checklist

> Pre-release and publish runbook for cutting a new version of wp-starter-kit
> and its `@wpdev/*` npm packages.

Use this document end-to-end before tagging or publishing. Every step should be
checked off in order. Do not skip the verification matrix — a green local run
prevents most registry and consumer breakage.

---

## Overview

A kit release has two surfaces:

1. **The monorepo** (`wp-starter-kit/`) — source of truth, tests, docs, bundles.
2. **Published npm packages** — what consumers install via `npm create @wpdev/plugin@latest`.

The `npm create @wpdev/plugin@latest` flow depends on three CLI packages being
published **in order** before the wrapper can resolve its dependency chain from
the public registry.

| Package                    | Role                                                                     |
| -------------------------- | ------------------------------------------------------------------------ |
| `@wpdev/create-wp-project` | Installer engine (features, generators, migrations)                      |
| `@wpdev/cli`               | `wpdev` binary (`create`, `add`, `remove`, `set`, `update`, `doctor`, …) |
| `@wpdev/create-plugin`     | `npm create` entry shim (`create-wpdev-plugin.js` → `@wpdev/cli`)        |

Other `@wpdev/*` packages (`hooks`, `utils`, `rest-utils`, `rule-engine`,
`ui-components`, `translation`, `polaris-stack`, `build`, …) ship on their own
cadence but must resolve from the public registry when a consumer project runs
`npm install`.

---

## Pre-release verification matrix

Run every command from `wp-starter-kit/`. All must pass before you bump versions
or publish.

| Intent                    | Command                                       | Must pass |
| ------------------------- | --------------------------------------------- | --------- |
| Project config validation | `npm run check`                               | Yes       |
| TypeScript check          | `npm run typecheck`                           | Yes       |
| Lint JS                   | `npm run lint:js`                             | Yes       |
| Full JS test suite        | `npm test`                                    | Yes       |
| Single publishable test   | `npx jest tests/packages/publishable.test.js` | Yes       |
| Version alignment test    | `npx jest tests/cli/versionSync.test.js`      | Yes       |
| Wrapper contract test     | `npx jest tests/cli/createWrapper.test.js`    | Yes       |
| Full PHP test suite       | `composer test`                               | Yes       |
| Architecture test         | `composer test:architecture`                  | Yes       |
| PHPStan                   | `composer validate:phpstan`                   | Yes       |
| Code style                | `composer validate:cs`                        | Yes       |
| Full build                | `npm run build`                               | Yes       |
| Release build             | `npm run release`                             | Yes       |
| Docs index enforcement    | `npx jest tests/docs/docsIndex.test.js`       | Yes       |

### Additional pre-release checks

- [ ] `project.config.json` `version` is bumped to the target release.
- [ ] `CHANGELOG.md` has an entry for this version with:
  - Bullet list of new features
  - Bullet list of bug fixes
  - Bullet list of breaking changes
- [ ] `composer.lock` is committed and reviewed.
- [ ] `package-lock.json` is committed and reviewed.
- [ ] `@wpdev/cli` is **not** `private: true` (GP-020 — blocks wrapper publish).
- [ ] All publishable packages have `README.md` with Install, Usage, API, and
      Part of wp-starter-kit sections.
- [ ] All publishable packages have a non-empty `files` whitelist in
      `package.json` (no `tests/`, `node_modules/`, or `*.test.js` entries).
- [ ] `prepublishOnly` scripts exist on `@wpdev/cli`, `@wpdev/create-wp-project`,
      and `@wpdev/create-plugin`.

---

## Version bump procedure

Bump versions in lockstep across the CLI chain. The single source of truth for
the kit version reported by `wpdev --version` is
`packages/create-wp-project/package.json`.

### Files to update (in order)

1. `packages/create-wp-project/package.json` — `version` field (engine).
2. `packages/cli/package.json` — `version` field and
   `dependencies["@wpdev/create-wp-project"]` range.
3. `packages/cli/create-plugin/package.json` — `version` field and
   `dependencies["@wpdev/cli"]` range.
4. Root `package.json` — `version` field (monorepo aggregator; stays private).
5. `composer.json` — if PHP package version is surfaced to consumers.
6. `CHANGELOG.md` — new `## [X.Y.Z]` section.
7. `project.config.json` — consumer-facing version marker.
8. Regenerate lockfiles: `npm install` at root, `composer update --lock` if needed.

### Version alignment rules

- `@wpdev/cli` depends on `@wpdev/create-wp-project` with a matching `^X.Y.Z` range.
- `@wpdev/create-plugin` depends on `@wpdev/cli` with a matching `^X.Y.Z` range.
- Run `npx jest tests/cli/versionSync.test.js` after every bump.

### Semantic versioning policy

The starter follows [Semantic Versioning 2.0.0](https://semver.org/):

- **MAJOR** (1.0.0 → 2.0.0) — breaking API change, hook prefix change,
  namespace change, removal of a public function.
- **MINOR** (1.0.0 → 1.1.0) — new component, new package, new endpoint,
  additive hook.
- **PATCH** (1.0.0 → 1.0.1) — bug fix, doc fix, internal refactor,
  test addition.

---

## Build artifacts

- [ ] `npm run release` runs without errors.
- [ ] `dist/` is gitignored — verify `.gitignore` includes it.
- [ ] `assets/bundles/` is fresh (not stale from a prior build).
- [ ] `composer translation:build` produces a clean `assets/translations/` folder
      (no stale `.json` files).
- [ ] Vendored framework version recorded in `getDepVersions()` (`wpdevFramework`
      key matches `packages/wpdev-framework/constants.php`).
- [ ] Companion-plugin installer smoke passes:
      `wpdev create --yes --js=none --php-framework=wpdev` writes
      `companion-plugins/wpdev/wpdev.php` and `FrameworkBridge.php` lint clean.

### Common build mistakes

| Mistake                                | Symptom                                        | Fix                                        |
| -------------------------------------- | ---------------------------------------------- | ------------------------------------------ |
| Skipped `npm run build` before publish | Stale `assets/bundles/*.js` in tarball         | Run `npm run build` then `npm run release` |
| Stale `package-lock.json`              | CI or consumer install resolves wrong versions | `npm install` at root, commit lock         |
| Version mismatch across CLI chain      | `wpdev --version` ≠ engine version             | Re-run version bump procedure              |
| `@wpdev/cli` still `private: true`     | Wrapper publish fails or dep unresolved        | Remove `private` from CLI pkg              |
| Missing `files` whitelist              | Test fixtures leak into npm tarball            | Add explicit `files` array                 |
| Forgot `prepublishOnly`                | Broken package ships to registry               | Add hook, verify locally                   |

---

## Order of npm publication

Publish from each package directory (or use `npm publish --workspace`). **Order
matters** because downstream packages depend on upstream packages being on the
registry first.

```
1. @wpdev/create-wp-project   (engine — no npm dep on other @wpdev/cli packages)
2. @wpdev/cli                 (depends on create-wp-project)
3. @wpdev/create-plugin        (depends on cli — enables npm create @wpdev/plugin)
4. Other @wpdev/* libraries   (hooks, utils, rest-utils, build, … — any order)
```

### Per-package publish commands

```bash
# From wp-starter-kit/ root (workspace publish)
npm publish --workspace @wpdev/create-wp-project
npm publish --workspace @wpdev/cli
npm publish --workspace @wpdev/create-plugin

# Library packages (example)
npm publish --workspace @wpdev/hooks
npm publish --workspace @wpdev/utils
```

### npm 2FA and automation tokens

- Enable **2FA** on your npm account (auth-and-writes or auth-only).
- For CI publishes, create an **Automation** access token (not a classic token).
- Store the token in GitHub Actions secrets as `NPM_TOKEN`.
- Scoped packages (`@wpdev/*`) require `npm publish --access public` on first publish.
- Verify you are logged in: `npm whoami` before publishing.

---

## Post-publish smoke test

After all three CLI packages are on the registry, verify the consumer path:

```bash
# In a temp directory outside the monorepo
cd /tmp
rm -rf wpdev-smoke-test
mkdir wpdev-smoke-test && cd wpdev-smoke-test

npm create @wpdev/plugin@latest -- --yes my-smoke-plugin
cd my-smoke-plugin
npm install
composer install
npm run build
```

Expected outcomes:

- [ ] `npm create` resolves `@wpdev/create-plugin` from the registry (not workspace).
- [ ] Generated project has `wpdev-kit.json` and `project.config.json`.
- [ ] `npm install` and `composer install` complete without errors.
- [ ] `npm run build` produces `assets/bundles/` output.

Also verify the direct CLI install path:

```bash
npx @wpdev/cli@latest --version
# Must match packages/create-wp-project/package.json version
```

---

## GitHub Release notes template

When tagging the monorepo release, use this template for GitHub Release notes:

```markdown
## wp-starter-kit vX.Y.Z

### Highlights

- <one-line summary of the release>

### New

- <feature>

### Fixed

- <bug fix>

### Breaking

- <breaking change, migration steps>

### Published npm packages

| Package                  | Version |
| ------------------------ | ------- |
| @wpdev/create-wp-project | X.Y.Z   |
| @wpdev/cli               | X.Y.Z   |
| @wpdev/create-plugin     | X.Y.Z   |

### Upgrade

Consumers on an older kit: `wpdev update --yes` (see updating-projects.md).
```

---

## Tag and push

```bash
git tag -a v1.0.0 -m "Release 1.0.0"
git push origin v1.0.0
```

CI will build artifacts and attach them to the GitHub Release.

---

## Rollback procedure

If a published npm version is broken:

### npm unpublish (use sparingly)

npm allows unpublish within 72 hours for packages with few downloads:

```bash
npm unpublish @wpdev/cli@1.0.1
npm unpublish @wpdev/create-plugin@1.0.1
```

**Warning:** unpublishing breaks anyone who already installed that version.
Prefer a patch release instead.

### Preferred rollback: publish a patch

```bash
# Bump to 1.0.2 with the fix, publish in order (engine → cli → wrapper)
npm version patch --workspace @wpdev/create-wp-project
# ... repeat version bump procedure ...
npm publish --workspace @wpdev/create-wp-project
npm publish --workspace @wpdev/cli
npm publish --workspace @wpdev/create-plugin
```

### Git tag rollback

If a **git tag** is broken but npm packages are fine:

```bash
git tag -d v1.0.0
git push origin :refs/tags/v1.0.0
```

Then either revert the merge commit or push a follow-up `1.0.1` tag.
**Never** rewrite history on a tag that consumers already pulled.

---

## Rector namespace rename (if scope changed)

If you renamed the project's namespace (`@wpdev` → `@myorg`), Rector
will rewrite the imports:

```bash
composer rector
```

Rector uses `core/packages/php-test-tools/rector.php` as the
config. The config has 3 dry-runs baked in:

1. `Rector\Renaming\Rector\Namespace_\RenameNamespaceRector`
2. `Rector\Renaming\Rector\Class_\RenameClassRector` (for
   namespace-as-class renames)
3. `Rector\Renaming\Rector\Function_\RenameFunctionRector` (for
   `wp_*` global renames if needed)

Run `composer rector` in **dry-run** mode first, review the diff,
then run for real.

> **Note:** Rector 1.x dropped `RenameNamespaceRector`. The starter
> uses `RenameClassRector` for namespaces — you may need to
> hand-edit the namespace declarations in the renamed files
> because the auto-rename only catches class references, not
> `namespace ...;` declarations.

---

## Vendor prefix (optional)

If the project needs to ship to a marketplace (ThemeForest,
CodeCanyon), the starter can produce a prefixed build:

```bash
composer prefix
```

This runs `thomasgriffin/PHP-Prefixer` against `dist/`. Output is
`dist/prefixed/<slug>-prefixed.js` and `dist/prefixed/functions.php`.
The unprefixed source remains untouched.

---

## Hotfix flow

A hotfix is a patch release (`1.0.1`) on top of a tagged release:

```bash
git checkout v1.0.0
git checkout -b hotfix/1.0.1
# ... fix the bug ...
git commit -m "Fix: <short description>"
git tag -a v1.0.1 -m "Hotfix 1.0.1"
git push origin v1.0.1
```

Then merge the hotfix back to `main` and (if a maintenance branch
exists) into `release/1.0.x`. Publish npm packages in the standard
order before announcing the hotfix.

---

## Post-release

- [ ] Update the README's "Latest release" badge.
- [ ] Open a `release/1.0.x` branch for backports.
- [ ] Notify stakeholders (Slack, email, the project's RSS feed).
- [ ] Close the milestone on GitHub.
- [ ] Bump `project.config.json` `version` to `1.1.0-dev` so the
      next iteration starts at the right number.
- [ ] Confirm `npm create @wpdev/plugin@latest` smoke test passes from a
      clean machine (not the monorepo workspace).

---

## Quick reference: publish readiness checklist

| Check                                      | Command / location                            |
| ------------------------------------------ | --------------------------------------------- |
| `@wpdev/cli` not private                   | `packages/cli/package.json`                   |
| Version alignment                          | `npx jest tests/cli/versionSync.test.js`      |
| README + files on all publishable packages | `npx jest tests/packages/publishable.test.js` |
| Wrapper forwards to CLI                    | `npx jest tests/cli/createWrapper.test.js`    |
| Full test suite                            | `npm test && composer test`                   |
| Release build fresh                        | `npm run release`                             |
| Post-publish smoke                         | `npm create @wpdev/plugin@latest -- --yes`    |

Await explicit user instruction before tagging or publishing to npm.
