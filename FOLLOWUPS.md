# Release follow-ups (minor bugs — non-blocking)

Tracked from `.mavis/plans/bugs-php-runtime.md` and `.mavis/plans/bugs-js-runtime.md`.
Critical and Major items were fixed in WS-A; these remain for a future patch release.

## PHP (B-10..B-15)

| ID   | Summary                                                           | Location                                                |
| ---- | ----------------------------------------------------------------- | ------------------------------------------------------- |
| B-10 | `HttpPool::get_status_message()` only knows 7 status codes        | `packages/php-fault-tolerance/src/HttpPool.php`         |
| B-11 | `HttpPool::parse_headers()` loses duplicate headers               | `packages/php-fault-tolerance/src/HttpPool.php`         |
| B-12 | `DeferredCall::queue()` priority drift across calls               | `packages/framework/src/Support/Queue/DeferredCall.php` |
| B-13 | `RestSetup::rest_init()` instantiates handlers with no DI         | `packages/framework/src/Support/Rest/RestSetup.php`     |
| B-14 | Legacy `wpdev_enqueue_stylesheet()` resolves against active theme | `functions.php`                                         |
| B-15 | `RestHandler::rest_response()` 4xx message echo policy leaky      | `packages/framework/src/Support/Rest/`                  |

## JS (B-10..B-16)

| ID   | Summary                                                            | Location                                                      |
| ---- | ------------------------------------------------------------------ | ------------------------------------------------------------- |
| B-10 | `JSON.parse` of CLI env in legacy `main()` lacks try/catch         | `packages/create-wp-project/src/index.js`                     |
| B-11 | `html-utils/MLForm` `useState()` setter never extracted            | `packages/ui-components/MLForm/MLForm.js`                     |
| B-12 | `cli/src/main.js` `isBinInvocation()` may false-positive on `wpsk` | `packages/cli/src/main.js`                                    |
| B-13 | `esbuild-styles.js` unused `dirname` import                        | `core/packages/build/esbuild-styles.js`                       |
| B-14 | Redundant `readFileSync` import in dep-extraction utils            | `core/packages/dependency-extraction-esbuild-plugin/utils.js` |
| B-15 | `assetFilePath` crashes on non-.js/.css basename                   | same utils file                                               |
| B-16 | `esbuild-components.js` crashes when `depsBundle` missing          | `core/packages/build/esbuild-components.js`                   |
