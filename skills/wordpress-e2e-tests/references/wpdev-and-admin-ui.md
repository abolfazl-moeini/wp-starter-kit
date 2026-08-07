# WPDev + wp-admin UI pitfalls (Playwright)

Lessons from consumer plugins that soft-depend on **WPDev** (`Requires Plugins: wpdev`) and use React admin UIs (Gutenberg components / WPDev settings).

## Soft-dep: mount dependencies before the consumer

wp-env must load soft-deps **before** the consumer. Alphabetical folder order is not enough (`my-plugin` often sorts before `wpdev`).

```json
{
  "plugins": ["../wpdev", "."]
}
```

With additional `Requires Plugins:` entries (e.g. WooCommerce), keep **framework → other deps → consumer**:

```json
{
  "plugins": [
    "../wpdev",
    "https://downloads.wordpress.org/plugin/woocommerce.latest-stable.zip",
    "."
  ]
}
```

Expect the framework as a **sibling** under `wp-content/plugins/`.  
Kit generator (`e2eTest` + `phpFramework=wpdev`) writes `["../wpdev", "."]` automatically — append other deps by hand when the header lists them.

Do **not** point wp-env `core` at an unbuilt `wordpress-develop/src` tree.

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

## WPDev list-table status / view filters

Status chips may call `wpdev_list_table_fetch_ajax_results`. In some wp-env setups that AJAX returns **404** (`list_table_unresolved`). Prefer full navigation over clicking the filter chip:

```javascript
await admin.visitAdminPage("admin.php", "page=your-list-slug&status=draft");
```

Same for host “views” that change a query arg (`price_edit_view`, `type`, …): assert via `visitAdminPage` / POM `open({ view })`, not ajax tab clicks that may not update the URL.

## WPDev list table locators

| Prefer                                           | Avoid                                |
| ------------------------------------------------ | ------------------------------------ |
| `[data-table-id="your-table-id"]`                | Fragile nested table markup alone    |
| Scope bulk Apply / checkboxes under that wrapper | Global `#doaction` on the wrong form |

Empty lists still expose `data-table-id` (framework wraps empty state). If a host still omits the wrapper on older WPDev, seed a row in `beforeAll` or fix the framework.

## Wubox / bulk confirm modals

Bulk confirm and many `wpdev_register_form` modals load into **`#WUB_ajaxContent`** (inline admin-ajax), **not** an iframe.

```javascript
const modal = page.locator("#WUB_ajaxContent");
await expect(modal).toBeVisible();
```

WPDev toggle fields: click the **`label[for=…]`** (or associated label), not only the hidden checkbox — iOS / Playwright often miss the input alone.

Bulk confirm POST field name is **`confirm`**; Vue state key is `confirmed`. Assert / fill the named input.

Search on list pages often uses `?s=` via full navigation rather than relying on the search box + ajax.

## Brand menu titles

Brand top-level title defaults to the **site name**. Filter `wpdev_brand_menu_title` (and capability via `wpdev_brand_menu_args`) in the host — e2e should assert the branded label, not `get_bloginfo( 'name' )`.

## Projects without `wpdev.json`

Hand-copy skill/kit E2E templates and a lean root `package.json`. Do not invent Cypress or a fake local server.
