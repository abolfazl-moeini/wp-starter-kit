# Project Scaffold (`@wpdev/create-wp-project`)

> Phase 8 of `plan.md` — generate a new wp-starter-kit-based project
> from a small set of answers. **No Plop, no Yeoman, no extra
> dependency** — pure Node ESM, ~300 LOC, fully unit-tested (16 tests).

## Why no generator framework?

The mrlogistic/scaffold playbook in `context.md` considered Yeoman
and Plop. Both add runtime weight to the starter (one more thing
`npm install` has to fetch) for what is fundamentally a templating
problem. The wp-starter-kit scaffold is a **tiny pure Node script**
that:

1. Validates a small answer set (`validateAnswers`)
2. Renders 5 templates with `{{token}}` substitution (`renderTemplate`)
3. Writes `project.config.json`, `functions.php`, `assets/dependencies.js`,
   `package.json`, `README.md` to the target directory.

Tests live in `tests/packages/create-wp-project.test.js`.

## TDD-first scaffold

Generated projects include **test stubs before implementation**:

- `phpTest: phpunit` + `exampleFeature: on` →
  `tests/phpunit/Modules/ExampleFeature/ModuleTest.php` (slug contract test).
- `jsTest: jest` + `exampleFeature: on` →
  `src/Modules/ExampleFeature/assets/entries/__tests__/admin.test.ts`
  (`test.todo` placeholder).
- `e2eTest: playwright` →
  `.wp-env.json`, `playwright.config.js`, `tests/e2e/**` smoke specs
  (real browser; see [e2e-tests.md](e2e-tests.md)).

Workflow:

1. Run `composer test` or `npm test` — stubs should pass (or show `todo`).
2. Add failing tests for the behavior you want.
3. Implement until green, then refactor.
4. Optional: `npm run test:e2e` when Playwright is enabled (Docker required).

See [contributing.md](contributing.md#red--green--refactor) for the full loop.

## Production release package

Every scaffolded project ships a release packager under `dev/release/`:

```bash
# JS projects: production asset build + clean package under dist/{slug}/
npm run release

# Packaging only (after a prior build), also available when package.json is absent:
composer release:dist
# equivalent: node dev/release/prepare-release.js
```

The packager **never mutates the source tree**. It copies into `dist/{slug}/`, then:

1. **Composer** (if `composer.json` exists): ensures `require.php` is `>={phpMinVersion}`, sets `config.platform.php`, forces path repositories to `options.symlink: false`, runs `composer install --no-dev`.
2. **Strip** dev-only paths: `tests/`, `docs/`, `packages/`, `docker-phpunit/`, `dev/`, `node_modules/`, root `composer.json` / `composer.lock`, `package.json` (+ lockfiles), `coverage.xml*`, `phpunit.xml*`, `playwright.config.*`, `CLAUDE.md` / `context.md` / `AGENTS.md`, and hidden (`.*/`) directories (includes `.wp-env.json`).
3. **Zip** `dist/{slug}/` → `dist/{slug}.zip` (WordPress-style: `{slug}/…` as archive root). Pass `--skip-zip` to keep the folder only.

Existing projects can pick this up via `wpdev update` (migrations `2.1.0`–`2.5.0`).
Migration **2.5.0** backfills `features.e2eTest=none` without scaffolding files.

## Usage

### 1. As a one-shot from a project dir

```bash
WPDEV_ANSWERS_JSON='{
  "slug":          "my-project",
  "npmScope":      "myorg",
  "globalName":    "MyProject",
  "textDomain":    "my-project",
  "hookPrefix":    "my-project",
  "phpFunctionPrefix": "myprj_",
  "uiFramework":   "preact"
}' node packages/create-wp-project/src/index.js /path/to/new-project
```

### 2. With flags

```bash
node packages/create-wp-project/src/index.js \
  --target=/path/to/new-project \
  --slug=my-project \
  --scope=myorg \
  --global=MyProject \
  --domain=my-project \
  --hook=my-project \
  --php=myprj_ \
  --ui=preact
```

### 3. From another Node program

```js
import { scaffoldProject } from "@wpdev/create-wp-project/src/index.js";
const res = await scaffoldProject("/path/to/dir", {
  slug: "my-project",
  npmScope: "myorg",
  // …
});
if (res.ok) console.log("Wrote", res.written);
```

## Answer contract (`ScaffoldAnswers`)

| Key                 | Required | Pattern                                        | Example                     |
| ------------------- | -------- | ---------------------------------------------- | --------------------------- |
| `slug`              | yes      | `^[a-z0-9][a-z0-9-]*$`                         | `my-project`                |
| `npmScope`          | yes      | `^[a-z0-9][a-z0-9-]*$` (no `@`)                | `myorg`                     |
| `globalName`        | yes      | JS identifier                                  | `MyProject`                 |
| `localizeVar`       | no       | JS identifier (inferred: `globalName + 'Loc'`) | `MyProjectLoc`              |
| `textDomain`        | yes      | `^[a-z0-9][a-z0-9-]*$`                         | `my-project`                |
| `hookPrefix`        | yes      | `^[a-z0-9][a-z0-9-]*$`                         | `my-project`                |
| `depsBundle`        | no       | `*.js` (inferred: `slug + '-deps.js'`)         | `my-project-deps.js`        |
| `phpFunctionPrefix` | no       | `^[a-z][a-z0-9_]*_$`                           | `myprj_` (default `wpdev_`) |
| `uiFramework`       | yes      | `preact` \| `react`                            | `preact`                    |

## Output

```
/path/to/new-project/
├── project.config.json
├── functions.php
├── package.json
├── README.md
└── assets/
    └── dependencies.js
```

The scaffold **refuses to overwrite** an existing `project.config.json`
(useful guard for accidental re-runs).

## Validation rules (from `validateAnswers`)

- Empty required field → `errors[field] = '...'`
- `slug` with spaces or uppercase → invalid (kebab-case only)
- `uiFramework` not in `preact`/`react` → invalid
- `phpFunctionPrefix` not ending in `_` → invalid (e.g. `myprj_`)

`validateAnswers` returns `{ ok: bool, errors: Record<string, string> }`.
`{ ok: true, errors: {} }` means the answer set is ready.

## What it does NOT do

- **No `npm install`** — the scaffolded `package.json` is just text.
  The user runs `npm install` themselves.
- **No git init** in the target — the user runs it themselves.
- **No composer install** — same.
- **No Plop / Yeoman** — deliberately, to keep the starter lean.
- **No interactive prompts** — answers are passed as JSON or flags.
  A future iteration could add an `inquirer`-style interactive mode.

## Adding new templates

Templates are inline string constants in `src/index.js` (`TEMPLATE_*`).
The substitution engine is `renderTemplate(tmpl, vars)` — `{{token}}`
becomes `vars[token]`. Unknown tokens are left verbatim so missing
config is loud at scaffold time.

To add a template:

1. Add a `TEMPLATE_FOO` constant.
2. Add a `renderTemplate(TEMPLATE_FOO, vars)` + `fs.writeFile` line
   in the `files` map in `scaffoldProject`.
3. Add a test in `tests/packages/create-wp-project.test.js`.
