# WordPress Hook Prefix Convention

> How `project.config.json`'s `hookPrefix` reaches every `add_action` /
> `add_filter` in the project — and why it matters.

## The contract

`project.config.json`:

```json
{
  "hookPrefix": "my-project"
}
```

becomes:

- **JSX/JS:** every component's actions and filters use the `my-project/`
  namespace: `addAction('my-project/enqueue', ...)`,
  `addFilter('my-project/transform', ...)`.
- **PHP:** the `functions.php` scaffold sets the global filter / action
  namespace to `my-project/`, and any `apply_filters('my-project/...', ...)`
  call in `core/php/` matches.

The hook prefix must be **lowercase kebab-case** and unique per project.
The scaffold (`@wpdev/create-wp-project`) validates this with a regex.

## Why a project-specific prefix?

WordPress's global action/filter namespace is shared with every other
plugin and theme. Without a project prefix, two projects on the same site
can register the same action and silently override each other:

```js
// Bad — collides with anything else using this name.
addAction('enqueue', ...);

// Good — namespaced, can't collide.
addAction('my-project/enqueue', ...);
```

This is the same pattern as `@wordpress/hooks` (which the starter uses via
the `hooks` package) and the same pattern that `wp-feature-api` /
`wp-interactivity` adopt.

## Files that read the prefix

| File                                               | What it does                                                                               |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `core/packages/hooks/src/index.js`                 | Re-exports `@wordpress/hooks` with the prefix pre-bound (`createNamespacedHooks(prefix)`). |
| `core/packages/hooks/__tests__/namespaced.test.js` | Asserts `addAction('my-project/...')` flows through.                                       |
| `core/php/functions.php` (scaffolded)              | Defines `apply_filters( 'my-project/...', ... )` constants if any.                         |
| `dev/translation/cli.php`                          | Logs the prefix on each translation run.                                                   |

## Renaming a prefix mid-project

It's painful but possible. The steps:

1. Update `project.config.json` `hookPrefix`.
2. Run `npm run build` (regenerates bundle with the new namespace).
3. `grep -r "<old-prefix>/" core/ core/php/` and rename each call.
4. Update `core/php/functions.php` template.
5. Update tests in `core/packages/hooks/__tests__/`.

If the project is already released, do this in a `MAJOR` version bump and
document the breaking change in the changelog.

## Test surface (Phase 1)

`tests/packages/hooks.test.js` (50 tests, group: `hooks`) covers:

- `createNamespacedHooks('my-project')` returns an `addAction/removeAction`
  pair that **only** fires for `my-project/*` events.
- Listeners registered with one prefix don't fire on another prefix.
- `doAction` / `applyFilters` are the dispatch side.
- `removeAction` correctly cleans up — no leaks on hot-reload.

## Anti-patterns

- **Don't bake the prefix into the bundle** — keep it as a build-time
  constant so different projects can ship the same bundle with different
  prefixes. The `hooks` package does this by accepting a `prefix` argument
  to `createNamespacedHooks`.
- **Don't use the slug** as a hook prefix if the slug can change (e.g.
  fork → fork-2). The hook prefix is more stable than the slug.
