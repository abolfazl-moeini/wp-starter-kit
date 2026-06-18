# Release Checklist

> Pre-release steps for cutting a new version of a project based on
> the wp-starter-kit.

## Pre-release

- [ ] All tests pass: `composer test` AND `npm test` (CI does this,
      but verify locally if it's been a while).
- [ ] `composer lint` is clean (PHPCS + PHPStan level 5).
- [ ] `project.config.json` `version` is bumped.
- [ ] `CHANGELOG.md` has an entry for this version with:
  - Bullet list of new features
  - Bullet list of bug fixes
  - Bullet list of breaking changes
- [ ] `composer.lock` is committed and the lockfile is reviewed.
- [ ] `package-lock.json` is committed and the lockfile is reviewed.

## Build artifacts

- [ ] `npm run release` runs without errors.
- [ ] `dist/` is gitignored — verify `.gitignore` includes it.
- [ ] `composer translation:build` produces a clean
      `assets/translations/` folder (no stale `.json` files).
- [ ] Smoke test: spin up a local WP, activate the theme/plugin,
      verify all components render.
- [ ] Vendored framework version recorded in `getDepVersions()` (`wpdevFramework`
      key matches `packages/wpdev-framework/constants.php`).
- [ ] Companion-plugin installer smoke passes:
      `wpdev create --yes --js=none --php-framework=wpdev` writes
      `companion-plugins/wpdev/wpdev.php` and `FrameworkBridge.php` lint clean.

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

## Vendor prefix (optional)

If the project needs to ship to a marketplace (ThemeForest,
CodeCanyon), the starter can produce a prefixed build:

```bash
composer prefix
```

This runs `thomasgriffin/PHP-Prefixer` against `dist/`. Output is
`dist/prefixed/<slug>-prefixed.js` and `dist/prefixed/functions.php`.
The unprefixed source remains untouched.

## Tag and push

```bash
git tag -a v0.2.0 -m "Release 0.2.0"
git push origin v0.2.0
```

CI will build the artifacts and attach them to the GitHub Release.

## Post-release

- [ ] Update the README's "Latest release" badge.
- [ ] Open a `release/0.2.x` branch for backports.
- [ ] Notify stakeholders (Slack, email, the project's RSS feed).
- [ ] Close the milestone on GitHub.
- [ ] Bump `project.config.json` `version` to `0.3.0-dev` so the
      next iteration starts at the right number.

## Hotfix flow

A hotfix is a patch release (`0.2.1`) on top of a tagged release:

```bash
git checkout v0.2.0
git checkout -b hotfix/0.2.1
# ... fix the bug ...
git commit -m "Fix: <short description>"
git tag -a v0.2.1 -m "Hotfix 0.2.1"
git push origin v0.2.1
```

Then merge the hotfix back to `main` and (if a maintenance branch
exists) into `release/0.2.x`.

## Versioning policy

The starter follows [Semantic Versioning 2.0.0](https://semver.org/):

- **MAJOR** (1.0.0 → 2.0.0) — breaking API change, hook prefix change,
  namespace change, removal of a public function.
- **MINOR** (0.1.0 → 0.2.0) — new component, new package, new
  endpoint, additive hook.
- **PATCH** (0.1.0 → 0.1.1) — bug fix, doc fix, internal refactor,
  test addition.

Pre-1.0, the rules are looser. Treat 0.x.y as "could break in
0.x.z+1".

## Rollback

If a release is broken:

```bash
git tag -d v0.2.0
git push origin :refs/tags/v0.2.0
```

Then either revert the merge commit or push a follow-up `0.2.1`
that fixes the regression. **Never** rewrite history on a
released tag — it breaks everyone who already pulled the artifact.
