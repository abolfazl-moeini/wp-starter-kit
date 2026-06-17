# Localize Contract (JS ↔ PHP)

> How a JSON blob generated in PHP reaches a JS component, type-checked
> along the way.

## The contract

**PHP side** (`core/php/functions.php`):

```php
add_action('wp_enqueue_scripts', 'myprj_enqueue_bundle_script');
function myprj_enqueue_bundle_script(string $handle): void
{
    wp_enqueue_script(
        'my-project-deps',
        get_template_directory_uri() . '/dist/my-project-deps.js',
        ['wp-element'],
        '0.1.0',
        true
    );
    wp_localize_script(
        'my-project-deps',
        'MyProjectLoc',  // globalName + 'Loc'
        myprj_get_localize_data()
    );
}

function myprj_get_localize_data(): array
{
    return [
        'restUrl'  => esc_url_raw(rest_url('my-project/v1/')),
        'nonce'    => wp_create_nonce('wp_rest'),
        'siteUrl'  => esc_url_raw(site_url()),
        'locale'   => get_user_locale(),
        'version'  => MY_PROJECT_VERSION,
    ];
}
```

**JS side** (any component):

```js
import { getLocalize } from "@wpdev/localize";

const data = getLocalize(); // type: LocalizeData (auto-inferred)
console.log(data.restUrl); // → 'https://example.test/?rest_route=/my-project/v1/'
```

## The `localizeVar` key

`project.config.json`:

```json
{
  "globalName": "MyProject",
  "localizeVar": "MyProjectLoc"
}
```

- `localizeVar` is what `wp_localize_script` writes the data under
  (`window.MyProjectLoc`).
- The `getLocalize()` helper in `@wpdev/localize` reads
  `window[<localizeVar>]` with a typed return.

If `localizeVar` is not set, the scaffold defaults to
`globalName + 'Loc'` (e.g. `MyProject` → `MyProjectLoc`).

## The `LocalizeData` type

`@wpdev/localize/src/types.ts`:

```ts
export interface LocalizeData {
  restUrl: string;
  nonce: string;
  siteUrl: string;
  locale: string;
  version: string;
  // …add new fields here when you add them in PHP
}
```

**Adding a new field is a two-line change:**

1. Add it to the PHP array in `myprj_get_localize_data()`.
2. Add it to the `LocalizeData` interface.

Tests (`tests/packages/localize.test.js`) verify the contract is
synchronized: a JSON fixture with all the required keys is checked
against the type. A missing key fails the test.

## The `wp_localize_script` gotcha

`wp_localize_script` was deprecated in WP 5.7 in favor of
`wp_add_inline_script` + `wp_json_send`. The starter still uses it
because:

1. It's shorter and more readable in the scaffold.
2. It works back to WP 4.x (the project's minimum).
3. The `getLocalize()` helper abstracts the underlying mechanism, so
   a future migration to `wp_add_inline_script` won't break consumers.

If you do migrate, only `core/php/functions.php` (or the scaffolded
copy) needs to change — every consumer still calls `getLocalize()`.

## Common pitfalls

| Symptom                                                       | Cause                                                                                                                                                   | Fix                                                                                                               |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `getLocalize()` returns `undefined`                           | The `wp_localize_script` call hasn't run yet (script enqueued too late)                                                                                 | Move the `add_action('wp_enqueue_scripts', ...)` registration to `functions.php` top level.                       |
| `restUrl` is `null`                                           | `rest_url()` is being called before `rest_api_init` fires                                                                                               | Hook the `getLocalizeData` function on `rest_api_init` (it already runs after init, so this is rare in practice). |
| TypeScript says `data.nonce` is `string` but runtime says `0` | PHP returns `int` and `wp_localize_script` coerces to `string` (good) — this only bites if the field is a number-like string and the JS side parses it. | Stick to strings; the `LocalizeData` interface uses `string` everywhere.                                          |
| `data.version` is stale after a release                       | Browser cached the old `dist/my-project-deps.js` and skipped the new localize call                                                                      | Bump the asset version (`filemtime` or a `MY_PROJECT_VERSION` constant) so the new bundle is fetched.             |

## Test surface (Phase 1, 4 tests)

`tests/packages/localize.test.js` covers:

- `getLocalize()` returns the `window[localizeVar]` value.
- `getLocalize()` returns `{}` if the global is missing (graceful).
- `LocalizeData` interface is in sync with the PHP JSON fixture.
- A consumer using `data.restUrl` is correctly typed in a smoke test.
