# Contributing

> How to add a feature, fix a bug, or improve the starter — and how
> to get it merged.

## TL;DR

1. **TDD first.** Write a failing test, watch it fail, write the
   minimum code to pass, refactor.
2. **One PR per concern.** Don't mix a bug fix and a new feature.
3. **All checks green before review.** `composer test`, `npm test`,
   `composer lint`. CI runs the same; pre-push hook runs them too.
4. **Update the docs** if you add a public API or change a
   developer-facing workflow.

## Branching

We use a lightweight Git Flow:

- `main` — always green, always deployable. Tagged releases only.
- `feat/<short-slug>` — new feature. Squash-merged to `main`.
- `fix/<short-slug>` — bug fix. Squash-merged to `main`.
- `refactor/<short-slug>` — internal cleanup, no behavior change.
- `docs/<short-slug>` — doc-only change.

Examples:

- `feat/wpsk-rule-engine-advance-fix`
- `fix/translation-clean-stale-files`
- `docs/build-system-overview`

## Commit messages

[Conventional Commits 1.0](https://www.conventionalcommits.org/) format:

```
<type>(<scope>): <short description>

<longer description, wrapped at 72 cols>

<footer with refs to issues / PRs>
```

Types:

- `feat` — new feature
- `fix` — bug fix
- `refactor` — internal cleanup
- `test` — test-only change
- `docs` — doc-only change
- `chore` — tooling / config change
- `style` — formatting (no logic change)
- `perf` — performance improvement

Examples:

```
feat(rule-engine): treat undefined condition as truthy

A condition function `() => true` returns `undefined` because the
author forgot to `return`. Treating it as `false` made the rule
silently skip. Treating as `true` matches the author's intent.

Closes #123.
```

## Pre-push checklist

The pre-push hook (`.git/hooks/pre-push`) runs:

```bash
npm test
composer test
composer lint
```

If any fails, the push is rejected. To skip (only if you know what
you're doing):

```bash
git push --no-verify
```

Don't do this on PRs into `main`.

## Code style

### JavaScript

- **ESM** (`import` / `export`, `type: "module"` in `package.json`).
- **Tabs for indent**, 100-char line width (Prettier default).
- **No default exports** for libraries (named exports are
  tree-shake-friendly).
- **JSDoc** for public functions, even in `.js` files (we don't
  ship a `.d.ts` but the JSDoc is what `tsc --allowJs` reads).
- **Jest** for tests, no Vitest (we tried, the aliasing pain
  wasn't worth it).

### PHP

- **PSR-12** baseline, **WordPress-Extra** on top.
- **Tabs** for indent, snake_case for functions/variables,
  PascalCase for classes.
- **Strict types**: `declare(strict_types=1);` at the top of
  every new file.
- **Yoda conditions** (per WordPress-Extra): `if ( 'foo' === $bar )`.
- **All strings escaped** on output (`esc_html`, `esc_attr`,
  `esc_url`), all input sanitized (`sanitize_text_field`,
  `absint`, etc.).

### Naming

- **JS function names**: `camelCase`.
- **PHP function names**: `snake_case`, prefixed with the
  project's `phpFunctionPrefix` (e.g. `myprj_enqueue_bundle`).
- **CSS classes**: `BEM` (`block__element--modifier`), lowercase,
  hyphenated. SCSS variables in `$lowercase-hyphenated`.
- **File names**: kebab-case for files, PascalCase for React/Preact
  component files only if the component is exported as a class
  (we use functional components, so all file names are kebab-case).

## Testing policy

Every PR **must** include tests. The CI check is:

```yaml
- run: npm test -- --coverage
- run: composer test -- --coverage
- name: "Coverage gate"
  run: |
    if [ "$(jq -r .total.lines.pct coverage/coverage-summary.json | cut -d. -f1)" -lt 80 ]; then
      echo "Coverage below 80%"; exit 1
    fi
```

80% line coverage is the floor. New code without tests is
auto-rejected.

**Test types:**

| Type              | Where                               | Tools                 | When                     |
| ----------------- | ----------------------------------- | --------------------- | ------------------------ |
| Unit              | `tests/packages/`, `tests/phpunit/` | Jest, PHPUnit         | All PRs                  |
| Integration       | `tests/integration/`                | Jest (with mocked WP) | All PRs                  |
| E2E               | `tests/e2e/`                        | Playwright            | Optional, runs nightly   |
| Visual regression | `tests/visual/`                     | Percy                 | Optional, runs on demand |

## Reviewing PRs

A PR needs **2 approvals** to merge. Reviewers are auto-assigned
based on the CODEOWNERS file:

```
/core/packages/build/         @build-maintainers
/core/packages/php-test-tools/ @php-maintainers
/docs/                         @docs-maintainers
/packages/translation/        @i18n-maintainers
/packages/create-wp-project/  @tooling-maintainers
```

If you're not on a maintainer list, you're assigned to the
`@wpsk/starter` org reviewers, who triage.

## Release process

See `release-checklist.md`. The TL;DR: tag with semver, push
the tag, CI builds the artifacts, GitHub Release is auto-created.

## What we don't accept

- **PRs that break `composer test` or `npm test`** — including
  pre-existing failures.
- **PRs without tests** for new code paths.
- **PRs that mix formatting changes with logic changes.** Make a
  separate PR for `prettier --write .` style cleanups.
- **PRs that bypass the hookPrefix** — global `add_action` /
  `add_filter` calls without the prefix will be flagged in
  review.
- **PRs that introduce a new dependency** without a justification
  comment ("We considered `lodash` and `ramda`; `lodash` is 24KB
  gzipped and we use 3 functions from it, so we're hand-rolling.").

## Questions?

- Open a GitHub Discussion (preferred for design questions).
- Open a GitHub Issue (for bugs and feature requests).
- Slack `#wpsk-dev` for synchronous chat.

## Recognition

The starter maintains a `CONTRIBUTORS.md` (auto-generated from
`git log`) and adds notable contributors to the
`@wpsk/starter` org with `Maintainer` rights after 5 merged PRs.
