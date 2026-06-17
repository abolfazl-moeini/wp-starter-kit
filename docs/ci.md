# GitHub Actions CI / CD

> The `.github/workflows/` setup that runs the test matrix, the
> nightly smoke tests, and the release build on tag push.

## What's here

| File          | Trigger                          | What it does                                       |
| ------------- | -------------------------------- | -------------------------------------------------- |
| `ci.yml`      | Push / PR to `main`              | Test matrix (Node 20/22, PHP 7.4-8.3), lint, build |
| `nightly.yml` | Cron 02:00 UTC + manual dispatch | Scaffold smoke test, translation E2E, coverage     |
| `release.yml` | Tag push (`v*.*.*`)              | Build release artifacts, create GitHub Release     |

## CI (`ci.yml`)

Runs on every push and PR to `main`. The `concurrency` block cancels
in-progress runs when a new commit lands on the same branch/PR, so
you don't queue up duplicate runs.

**Matrix:**

- **JS tests:** Node 20 + Node 22, `npx jest --ci --maxWorkers=2`.
- **PHP tests:** PHP 7.4, 8.0, 8.1, 8.2, 8.3, `composer test`.
- **Lint (PHP 8.2 only):** `composer validate:cs`,
  `composer validate:phpstan`, `npx prettier --check`.
- **Build (after tests pass):** `npm run release` + `composer translation`.
  Uploads `assets/bundles`, `assets/stylesheets`, `assets/translations`,
  and `assets/map` as the build artifact.

**Why cancel in-progress:** if you push two commits within a
minute, only the latest runs.

**Status check job:** `ci-pass` is a tiny aggregator that fails the
overall status if any required job failed. This is the "required"
check on the branch protection rule. `js-test` and `php-test` do not
use `continue-on-error` — a failing test suite blocks the PR.

**Coverage:** the nightly `coverage-report` job (see [nightly.yml](../.github/workflows/nightly.yml))
uploads JS and PHP coverage to Codecov. Use it to spot regressions; the
main CI path does not gate on coverage percentage.

## Nightly (`nightly.yml`)

Runs at 02:00 UTC every day, plus `workflow_dispatch` for ad-hoc
triggers. Three jobs:

1. **`scaffold-smoke`** — runs `@wpdev/create-wp-project` in a temp
   dir, verifies the output tree and the generated
   `project.config.json`. Catches scaffold regressions that unit
   tests can miss.
2. **`translation-e2e`** — runs the full `composer translation`
   pipeline against the real source tree. Catches drift between
   the JS-side `.pot` generation and the PHP-side `.pot` generation.
3. **`coverage-report`** — runs both test suites with coverage,
   uploads to Codecov. Coverage badge on the README points here.

**Why cron-only:** these jobs take 5-10 minutes each and aren't
needed on every PR. If they fail, the next morning's run will
report to the team.

## Release (`release.yml`)

Triggered by a tag push matching `v*.*.*`. The pattern is
[SemVer](https://semver.org/):

- `v0.1.0` — patch / minor / major release
- `v0.1.0-prefixed` — release with vendor prefix (rarer; only if
  the project needs marketplace distribution)

**Steps:**

1. Checkout, install deps.
2. `npm run release` — full build.
3. `composer translation` — regenerate translation bundles.
4. **If `-prefixed` tag:** `composer rector:prefix` (see
   `release-checklist.md`).
5. Create `wpdev-starter-<version>.tar.gz` and `.zip` archives.
6. Upload as workflow artifacts.
7. Download artifacts, create GitHub Release with the
   CHANGELOG.md section for this version, attach the archives.

**Required secrets:** none. The `GITHUB_TOKEN` is auto-provided.

**`prerelease` flag:** any tag containing `-` (e.g. `v0.2.0-rc.1`)
is marked as a prerelease on GitHub, so it doesn't notify users
on the stable channel.

## Branch protection

The `main` branch should be protected with:

- ✅ Require status checks: `CI Status` (the `ci-pass` job).
- ✅ Require branches to be up to date.
- ✅ Require 2 approvals (see `contributing.md`).
- ✅ Require linear history (squash merges).
- ✅ Include administrators.

The `release.yml` workflow runs on `main` after a tag push, so the
`main` branch must be pushable by `GITHUB_TOKEN` (default) for the
release to land.

## Why no Dependabot / Renovate?

The starter's deps update via two paths:

1. **`npm` workspaces** — `package.json` is auto-updated by
   `npm-check-updates` (run via `composer ncu` once a quarter).
2. **`composer` deps** — `composer.json` is updated manually
   during the release prep phase (see `release-checklist.md`).

Dependabot-style auto-PRs would create noise without much value
for a starter: the framework has a small set of deps, and a
breaking change in `esbuild` is best handled as a one-line PR
during the next release cycle, not as a Dependabot bot's
auto-merge.

## Local equivalent

If you want to run the CI matrix locally:

```bash
# JS tests:
npx jest --maxWorkers=2 --forceExit

# PHP tests:
composer test

# Lint:
composer validate:cs
composer validate:phpstan
npx prettier --check '**/*.{js,json,md,yml,yaml}'

# Build + translation:
npm run release
composer translation
```

If all of those are green locally, the CI will be green.

## Debugging a failed CI run

1. **Open the failed job's logs** in the GitHub Actions UI.
2. **Re-run the job** with "Re-run failed jobs" — sometimes
   a transient network blip (Composer / npm) is the cause.
3. **Reproduce locally** — every job runs a single command
   (e.g. `composer test`, `npx jest`). If it fails locally,
   the issue is in the code, not the workflow.
4. **If it's a flaky test**, mark it as flaky in the README
   and open an issue. Don't `git commit --no-verify` to make
   CI pass.
