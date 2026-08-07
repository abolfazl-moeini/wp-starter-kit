# WPDev + wp-admin UI pitfalls (Playwright)

Lessons from consumer plugins that soft-depend on **WPDev** (`Requires Plugins: wpdev`) and use React admin UIs (Gutenberg components / WPDev settings).

## Soft-dep: mount `../wpdev` first

wp-env must load the framework **before** the consumer. Alphabetical order of plugin folders is not enough (`my-plugin` often sorts before `wpdev`).

```json
{
  "plugins": ["../wpdev", "."]
}
```

Expect the framework as a **sibling** of the plugin under `wp-content/plugins/`.
Kit generator (`e2eTest` + `phpFramework=wpdev`) writes this automatically.

## Port conflicts

Default wp-env ports `8888` / `8889` are often taken (other plugins’ wp-env, local stacks). Prefer env vars:

```bash
WP_ENV_PORT=8908 WP_ENV_TESTS_PORT=8909 npx wp-env start
WP_ENV_PORT=8908 WP_ENV_TESTS_PORT=8909 WP_BASE_URL=http://localhost:8909 npm run test:e2e
```

Keep `WP_BASE_URL` on the **tests** instance (`WP_ENV_TESTS_PORT`). The scaffolded `playwright.config.js` disables `webServer` whenever `WP_BASE_URL` is set so Playwright does not also try to bind `8888`/`8889`.

## Front-end smoke on block themes

Default WP themes are block themes. Post titles on the blog index are often `h2`, not `h1`. Prefer:

```javascript
const post = await requestUtils.createPost({ title, status: "publish" });
await page.goto(post.link);
await expect(
  page.getByRole("heading", { name: title, level: 1 }),
).toBeVisible();
```

Do not assert the home page title is `/WordPress/i` — wp-env sets the site title from the plugin slug.

## Gutenberg `TextControl` and `fill()`

Playwright `locator.fill()` can set the DOM value without updating React controlled state. Save then fails validation (“required”) even though the field looks filled.

Prefer:

```javascript
await field.click();
await field.fill(""); // or clear()
await field.pressSequentially(value, { delay: 20 });
```

## Create-then-redirect: don’t assert the toast

After “Add New” → save, many screens **redirect** to the edit URL and the success notice is gone. Assert durable outcomes instead:

- URL contains `workflow_id=` / `post=` / `page=`
- Row appears on the list screen
- REST `GET` returns the created entity

## WPDev settings tabs

Tab chrome uses IDs like `#tab-selector-{section}-link`. `getByText( sectionLabel )` often matches a **hidden** label and fails strict mode or clicks the wrong node.

```javascript
await page.locator("#tab-selector-wfa_sms-link").click();
```

## Duplicate admin menu links (strict mode)

WordPress admin often shows the same label twice (top-level + submenu, or “Add New” in menu + page title action).

| Prefer                               | Avoid                                          |
| ------------------------------------ | ---------------------------------------------- |
| `page.locator(".page-title-action")` | `getByRole("link", { name: "Add New" })` alone |
| `page.locator("a.toplevel_page_…")`  | bare `getByText("Plugin Name")`                |
| Scope under `#toplevel_page_…`       | first match of a duplicated submenu label      |

## WPDev list-table status filters

Status chips may call `wpdev_list_table_fetch_ajax_results`. In some wp-env setups that AJAX returns **404** (`list_table_unresolved`). Prefer full navigation over clicking the filter chip:

```javascript
await admin.visitAdminPage("admin.php", "page=your-list-slug&status=draft");
```

## Projects without `wpdev.json`

Hand-copy skill/kit E2E templates and a lean root `package.json`. Do not invent Cypress or a fake local server.
