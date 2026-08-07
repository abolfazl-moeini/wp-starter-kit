# Writing E2E specs (scaffolded plugins)

## Imports

```js
import { test, expect } from "@wordpress/e2e-test-utils-playwright";
```

Never import `test` / `expect` from `@playwright/test` in specs — fixtures
(`admin`, `editor`, `requestUtils`, `pageUtils`) come from the WordPress package.

## Admin

```js
await admin.visitAdminPage("/"); // Dashboard
await admin.visitAdminPage("/plugins.php");
await admin.visitAdminPage("/admin.php", "my-slug"); // custom menu page
```

Assert with roles:

```js
await expect(
  page.getByRole("heading", { name: "Plugins", level: 1 }),
).toBeVisible();
```

## Front end

```js
await page.goto("/");
await page.goto(`/?p=${post.id}`);
```

Create content via REST first:

```js
await requestUtils.createPost({ title: "Hello", status: "publish" });
```

## Cleanup

```js
test.beforeEach(async ({ requestUtils }) => {
  await requestUtils.deleteAllPosts();
});
```

Global setup already resets posts/blocks/preferences once per suite.

## Page objects

For a plugin settings screen used in many tests, put helpers under
`tests/e2e/pages/` and keep one screen per class. Inline one-off helpers
in the spec when used once.

## Flakiness

- No `page.waitForTimeout()` — use `expect` auto-wait.
- Default wp-env Playwright config uses `workers: 1`.
- Prefer `--ui` when a selector is wrong.

## Safety

Do not point `WP_BASE_URL` at production. Global setup is destructive.
