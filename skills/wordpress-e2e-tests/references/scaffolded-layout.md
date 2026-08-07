# Scaffolded E2E layout (`e2eTest: playwright`)

Emitted by `packages/create-wp-project/src/generators/e2eTest.js` from templates under `generators/templates/e2e/`.

```
{plugin-root}/
├── .wp-env.json
├── playwright.config.js
├── package.json                 # scripts: wp-env, test:e2e (+ Playwright devDeps)
└── tests/e2e/
    ├── config/
    │   └── global-setup.js
    └── specs/
        ├── admin-smoke.spec.js
        └── frontend-smoke.spec.js
```

## Generator `owns`

- `.wp-env.json`
- `playwright.config.js`
- `tests/e2e/**`

Safe for `wpdev add` / `wpdev set e2eTest=none` / `wpdev remove e2eTest`.

## npm scripts (via `packageJsonForAnswers`)

```json
{
  "wp-env": "wp-env",
  "test:e2e": "wp-scripts test-playwright"
}
```

PHP-only plugins (`js:none`) still get a lean `package.json` when E2E is on.

## CI

When `ci` is not `off`, `.github/workflows/ci.yml` includes an `e2e` job
(`playwright install` + `npm run test:e2e`). `refreshGlue` updates this file
after add/remove.

## Release

`tests/`, `.wp-env.json`, and root `playwright.config.js` are stripped from
`dist/` — they must not ship in the plugin zip.

## Sync

Generator templates are **canonical** for scaffolds. Keep the shared skill
repo [wordpress-e2e-tests](https://github.com/abolfazl-moeini/wordpress-e2e-tests)
`assets/templates/` aligned when changing either side.

Human docs: [docs/e2e-tests.md](../../../docs/e2e-tests.md).
