# PHPUnit Test Suite Refactor Plan

## Problem

`tests/phpunit/bootstrap.php` declares 400+ lines of hand-rolled WordPress function stubs via
`if (!function_exists(...))` guards. This is fundamentally wrong:

- Stubs diverge from real WP silently over time. Tests pass on fakes, fail on real WP.
- Custom `WP_REST_Request`, `WP_REST_Response`, `WP_Error` stub classes lack the real API.
- Global state bags (`$GLOBALS['wpdev_wp_rest_routes']` etc.) replace real WP internals.
- No DB rollback between tests — `wpdev_test_reset_wp_state()` only clears arrays.
- `BootstrapTest.php` tests that stubs exist — this test is itself the bug.

## Target

- Real WordPress loaded via `wordpress-develop` checkout inside Docker.
- Two-container Docker setup (PHP + MySQL), adapted from nikamooz pattern.
- `wpdev/plugin-core-test` package (`WPDevTest\TestCases\TestCase`) as the base class.
- Bootstrap: 4 lines — no stubs, no globals.
- Automatic DB rollback between tests via `WP_UnitTestCase`.

---

## Prerequisites — Verify Before Starting

```bash
# 1. wordpress-develop must exist with tests and src
ls /Users/moeini/Dev/wordpress-develop/tests/phpunit/includes/bootstrap.php
ls /Users/moeini/Dev/wordpress-develop/src/wp-includes/version.php

# If missing, clone it:
# git clone https://github.com/WordPress/wordpress-develop.git \
#   /Users/moeini/Dev/wordpress-develop --depth=1

# 2. Docker Desktop must be running
docker info

# 3. shared_net network must exist (used by nikamooz and our test containers)
docker network ls | grep shared_net
# If missing:
# docker network create shared_net
```

---

## Phase 1 — Copy `plugin-core-test` Package

**Step 1.1** Copy the package from the skill into the project:

```bash
cp -r /Users/moeini/.agents/skills/wordpress-plugin-unit-tests/packages/plugin-core-test \
  /Users/moeini/Documents/ideas/extend-kit/wp-starter-kit/packages/plugin-core-test
```

Result: `wp-starter-kit/packages/plugin-core-test/` with these key files:

- `src/Setup.php` — `WPDevTest\Setup::setup()` loads real WP
- `src/TestCases/TestCase.php` — extends `WP_UnitTestCase`, adds `login()`, `method_call()` etc.
- `src/TestCases/BaseTestCase.php` — extends `WP_UnitTestCase`, adds `expectFilter()`
- `src/functions.php` — `_tests_dir()` helper
- `composer.json` — declares `WPDevTest\` PSR-4 namespace

---

## Phase 2 — Update `composer.json`

File: `wp-starter-kit/composer.json`

**Step 2.1** Add path repository for `plugin-core-test`. In the `"repositories"` array, append:

```json
{
  "type": "path",
  "url": "packages/plugin-core-test",
  "options": { "symlink": false }
}
```

**Step 2.2** Add to `"require-dev"`:

```json
"wpdev/plugin-core-test": "^1.2"
```

**Step 2.3** Add `"autoload-dev"` section (create at the same level as `"autoload"`):

```json
"autoload-dev": {
  "psr-4": {
    "WPDev\\Tests\\": "tests/phpunit/"
  }
}
```

Note: `WPDevTest\` is autoloaded directly from `packages/plugin-core-test/src/` via the path
repository's own `composer.json` (it declares `"WPDevTest\\": "./src/"`). No duplication needed here.

**Step 2.4** Run:

```bash
cd /Users/moeini/Documents/ideas/extend-kit/wp-starter-kit
composer update wpdev/plugin-core-test --ignore-platform-req=php
```

---

## Phase 3 — Create Docker Test Environment

Create directory `wp-starter-kit/tests/docker-phpunit/` and add these files:

### `tests/docker-phpunit/docker-compose.yml`

Adapted from `/Users/moeini/Dev/nikamooz/docker-compose.yml`.
Same images and platform as nikamooz. Container names renamed to avoid collisions.

```yaml
services:
  wpdev-starter-phpunit-db:
    container_name: wpdev-starter-phpunit-db
    image: arm64v8/mysql
    platform: linux/arm64/v8
    networks: [shared_net]
    restart: "no"
    environment:
      MYSQL_DATABASE: ${DB_NAME:-wp_tests}
      MYSQL_USER: ${DB_USER:-wp_test_user}
      MYSQL_PASSWORD: ${DB_PASSWORD:-wp_test_pass}
      MYSQL_ROOT_PASSWORD: ${DB_ROOT_PASSWORD:-root}
    volumes:
      - wpdev-starter-phpunit-db-data:/var/lib/mysql
    healthcheck:
      test:
        [
          "CMD",
          "mysqladmin",
          "ping",
          "-h",
          "localhost",
          "-u",
          "root",
          "-p${DB_ROOT_PASSWORD:-root}",
        ]
      interval: 5s
      timeout: 5s
      retries: 12
      start_period: 20s

  wpdev-starter-phpunit-php:
    container_name: wpdev-starter-phpunit-php
    image: arm64v8/wordpress:php8.1-apache
    platform: linux/arm64/v8
    networks: [shared_net]
    restart: "no"
    depends_on:
      wpdev-starter-phpunit-db:
        condition: service_healthy
    volumes:
      - ${PLUGIN_ROOT}:/var/www/plugin
      - ${WORDPRESS_DEVELOP_ROOT}:/var/www/wordpress-develop
      - ${DOCKER_PHPUNIT_DIR}:/var/www/docker-phpunit
    working_dir: /var/www/plugin
    command: ["bash", "-c", "tail -f /dev/null"]

volumes:
  wpdev-starter-phpunit-db-data:

networks:
  shared_net:
    external: true
```

### `tests/docker-phpunit/env.example`

```bash
# Copy to .env — set absolute paths.
# cp env.example .env

PLUGIN_ROOT=/Users/moeini/Documents/ideas/extend-kit/wp-starter-kit
WORDPRESS_DEVELOP_ROOT=/Users/moeini/Dev/wordpress-develop
DOCKER_PHPUNIT_DIR=/Users/moeini/Documents/ideas/extend-kit/wp-starter-kit/tests/docker-phpunit

PLUGIN_CONTAINER_PATH=/var/www/plugin
WORDPRESS_DEVELOP_CONTAINER_PATH=/var/www/wordpress-develop
DOCKER_PHPUNIT_CONTAINER_PATH=/var/www/docker-phpunit
WP_TESTS_LIB_CONTAINER_PATH=/var/www/wordpress-tests-lib
WORDPRESS_CORE_CONTAINER_PATH=/var/www/wordpress-develop/src

# Must match container_name values in docker-compose.yml
PHP_SERVICE=wpdev-starter-phpunit-php
DB_SERVICE=wpdev-starter-phpunit-db

DB_NAME=wp_tests
DB_USER=wp_test_user
DB_PASSWORD=wp_test_pass
DB_ROOT_PASSWORD=root
MYSQL_HOST_PORT=3309

PHPUNIT_BIN=./vendor/bin/phpunit
```

### `tests/docker-phpunit/wp-tests-config.php.template`

Copy verbatim from the skill:

```bash
cp /Users/moeini/.agents/skills/wordpress-plugin-unit-tests/assets/docker-phpunit/wp-tests-config.php.template \
  /Users/moeini/Documents/ideas/extend-kit/wp-starter-kit/tests/docker-phpunit/wp-tests-config.php.template
```

### `tests/docker-phpunit/run-phpunit.sh`

Copy verbatim from the skill:

```bash
cp /Users/moeini/.agents/skills/wordpress-plugin-unit-tests/assets/docker-phpunit/run-phpunit.sh \
  /Users/moeini/Documents/ideas/extend-kit/wp-starter-kit/tests/docker-phpunit/run-phpunit.sh
chmod +x /Users/moeini/Documents/ideas/extend-kit/wp-starter-kit/tests/docker-phpunit/run-phpunit.sh
```

The script reads `PHP_SERVICE` and `DB_SERVICE` from `.env` — our renamed container names
are picked up automatically.

### `tests/docker-phpunit/teardown.sh`

Copy verbatim from the skill:

```bash
cp /Users/moeini/.agents/skills/wordpress-plugin-unit-tests/assets/docker-phpunit/teardown.sh \
  /Users/moeini/Documents/ideas/extend-kit/wp-starter-kit/tests/docker-phpunit/teardown.sh
chmod +x /Users/moeini/Documents/ideas/extend-kit/wp-starter-kit/tests/docker-phpunit/teardown.sh
```

### `tests/docker-phpunit/.gitignore`

```
.env
wp-tests-config.php
```

### Create `.env` for local use

```bash
cd /Users/moeini/Documents/ideas/extend-kit/wp-starter-kit/tests/docker-phpunit
cp env.example .env
```

Verify that `PLUGIN_ROOT`, `WORDPRESS_DEVELOP_ROOT`, `DOCKER_PHPUNIT_DIR` have the correct
absolute paths (the defaults in `env.example` are already set for this machine).

---

## Phase 4 — Replace `phpunit.xml`

Delete `wp-starter-kit/phpunit.xml` and create `wp-starter-kit/phpunit.xml.dist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<phpunit
    bootstrap="tests/phpunit/bootstrap.php"
    backupGlobals="false"
    colors="true"
    verbose="true"
>
    <testsuites>
        <testsuite name="wp-starter-kit">
            <directory suffix=".php">./tests/phpunit</directory>
            <exclude>./tests/phpunit/TestCases</exclude>
            <exclude>./tests/phpunit/fixtures</exclude>
        </testsuite>
    </testsuites>

    <php>
        <!-- Container paths set by run-phpunit.sh via WP_TESTS_DIR env override -->
        <env name="WP_TESTS_DIR"    value="/var/www/wordpress-tests-lib"/>
        <env name="BOOTSTRAP_FILE"  value="/var/www/plugin/wpdev-starter.php"/>
        <env name="PLUGIN_ROOT"     value="/var/www/plugin"/>
    </php>
</phpunit>
```

Note: `run-phpunit.sh` exports `WP_TESTS_DIR` and `WP_TESTS_CONFIG_FILE_PATH` before calling
PHPUnit, overriding the `<env>` values above for Docker runs. The `<env>` values serve as
documentation for the expected container paths.

---

## Phase 5 — Replace `tests/phpunit/bootstrap.php`

Delete the entire 400-line stub file and replace with:

```php
<?php
declare(strict_types=1);

require dirname(__DIR__, 2) . '/vendor/autoload.php';

WPDevTest\Setup::setup();
```

That is the entire file. `WPDevTest\Setup::setup()` loads `_tests_dir()/includes/bootstrap.php`
(real WordPress), installs the test DB, and fires the WP bootstrap.

---

## Phase 6 — Create Plugin Base Test Classes

### `tests/phpunit/TestCases/PluginBaseTestCase.php`

```php
<?php
declare(strict_types=1);

namespace WPDev\Tests\TestCases;

abstract class PluginBaseTestCase extends \WPDevTest\TestCases\TestCase
{
}
```

### `tests/phpunit/TestCases/RestTestCase.php`

```php
<?php
declare(strict_types=1);

namespace WPDev\Tests\TestCases;

abstract class RestTestCase extends PluginBaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        do_action('rest_api_init');
    }
}
```

---

## Phase 7 — Migrate Test Files

### 7.0 — DELETE `BootstrapTest.php`

`tests/phpunit/BootstrapTest.php` asserts that WP stubs exist. Once real WP is loaded,
this test is meaningless and wrong. Delete the file.

```bash
rm /Users/moeini/Documents/ideas/extend-kit/wp-starter-kit/tests/phpunit/BootstrapTest.php
```

---

### 7.1 — Category A: Base class change only

These tests contain no WP global state assertions. They only need:

1. Remove `use PHPUnit\Framework\TestCase;` import
2. Change `extends TestCase` → `extends \WPDevTest\TestCases\TestCase`
3. Remove `wpdev_test_reset_wp_state();` calls from `setUp()` — WP handles it

Apply to all files in this list:

| File                                                        |
| ----------------------------------------------------------- |
| `tests/phpunit/Core/ModuleInterfaceTest.php`                |
| `tests/phpunit/Core/ModuleLoaderTest.php`                   |
| `tests/phpunit/Core/PluginLifecycleTest.php`                |
| `tests/phpunit/Adapters/WpdevAdapterTest.php`               |
| `tests/phpunit/ArchitectureTest.php`                        |
| `tests/phpunit/AssetFunctionsTest.php`                      |
| `tests/phpunit/Autoload/SrcPsr4Test.php`                    |
| `tests/phpunit/FaultTolerance/CircuitBreakerTest.php`       |
| `tests/phpunit/FaultTolerance/FaultToleranceFacadeTest.php` |
| `tests/phpunit/FaultTolerance/FunctionsAutoloadTest.php`    |
| `tests/phpunit/FaultTolerance/HttpBatchTest.php`            |
| `tests/phpunit/FaultTolerance/HttpPoolGapsTest.php`         |
| `tests/phpunit/FaultTolerance/HttpPoolTest.php`             |
| `tests/phpunit/FaultTolerance/PackageMetadataTest.php`      |
| `tests/phpunit/FaultTolerance/ResilientTest.php`            |
| `tests/phpunit/Framework/PackageMetadataTest.php`           |
| `tests/phpunit/LocalizeTest.php`                            |
| `tests/phpunit/Modules/BlocksModuleTest.php`                |
| `tests/phpunit/Modules/ExampleFeatureAssetsTest.php`        |
| `tests/phpunit/Modules/ExampleFeatureSecurityTest.php`      |
| `tests/phpunit/Modules/McpAbilitiesModuleTest.php`          |
| `tests/phpunit/Modules/WpdevDemoModuleTest.php`             |
| `tests/phpunit/PatchApplyTest.php`                          |
| `tests/phpunit/PluginBootstrapTest.php`                     |
| `tests/phpunit/ReconcilePatchTest.php`                      |
| `tests/phpunit/Release/BuildDistTest.php`                   |
| `tests/phpunit/Release/FrameworkDistTest.php`               |
| `tests/phpunit/Release/FreshnessTest.php`                   |
| `tests/phpunit/Release/ReleaseScriptTest.php`               |
| `tests/phpunit/Release/StraussConfigTest.php`               |
| `tests/phpunit/Release/VendorScopingIntegrationTest.php`    |
| `tests/phpunit/Support/AssetsTest.php`                      |
| `tests/phpunit/Support/Queue/DeferredCallTest.php`          |
| `tests/phpunit/TranslationBootstrapTest.php`                |
| `tests/phpunit/TranslationPipelineTest.php`                 |

**Exact pattern for each file:**

```php
// BEFORE
use PHPUnit\Framework\TestCase;

class FooTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        wpdev_test_reset_wp_state(); // ← remove this line
        ...
    }
}

// AFTER
class FooTest extends \WPDevTest\TestCases\TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        // wpdev_test_reset_wp_state() removed
        ...
    }
}
```

For namespaced test files that `use PHPUnit\Framework\TestCase`, the change is:

```php
// BEFORE
use PHPUnit\Framework\TestCase;

class FooTest extends TestCase

// AFTER
class FooTest extends \WPDevTest\TestCases\TestCase
```

---

### 7.2 — Category B: `WP_REST_Response` property → method access

Real `WP_REST_Response` uses methods, not public properties:

```php
// BEFORE
$response->data   →   // AFTER
$response->get_data()

// BEFORE
$response->status  →  // AFTER
$response->get_status()
```

Apply to these files (in addition to Category A changes):

#### `tests/phpunit/Support/Rest/RestHandlerTest.php`

Every `$response->data` → `$response->get_data()`
Every `$response->status` → `$response->get_status()`

Specific replacements (search-replace in the file):

- `$this->assertSame(['value' => 42], $response->data);` → `$this->assertSame(['value' => 42], $response->get_data());`
- `$this->assertSame(200, $response->status);` → `$this->assertSame(200, $response->get_status());`
- `$this->assertFalse($response->data['success']);` → `$this->assertFalse($response->get_data()['success']);`
- `$this->assertSame('boom', $response->data['message']);` → `$this->assertSame('boom', $response->get_data()['message']);`
- `$this->assertSame(403, $response->status);` → `$this->assertSame(403, $response->get_status());`
- `$this->assertSame(500, $response->status` → `$this->assertSame(500, $response->get_status()`
- `$this->assertSame(500, $response->data['code']);` → `$this->assertSame(500, $response->get_data()['code']);`
- `$this->assertStringNotContainsString('PDOException', $response->data['message'],` → `$response->get_data()['message'],`
- `$this->assertStringNotContainsString('/var/www/secret', $response->data['message'],` → `$response->get_data()['message'],`
- `$this->assertStringNotContainsString('SQLSTATE', $response->data['message'],` → `$response->get_data()['message'],`
- `$this->assertIsString($response->data['message'],` → `$response->get_data()['message'],`
- `$this->assertSame(422, $response->status);` → `$response->get_status());`
- `$this->assertSame('Validation failed: missing field "email"', $response->data['message'],` → `$response->get_data()['message'],`

#### `tests/phpunit/Support/Rest/BatchResponseTest.php`

```php
// BEFORE
$this->assertSame(['fields' => []], $response->data['data']);
$this->assertSame('key-123', $response->data['extra']['cacheKey']);
$this->assertEquals($wrapped->data, $aliased->data);

// AFTER
$this->assertSame(['fields' => []], $response->get_data()['data']);
$this->assertSame('key-123', $response->get_data()['extra']['cacheKey']);
$this->assertEquals($wrapped->get_data(), $aliased->get_data());
```

#### `tests/phpunit/Modules/ExampleFeatureTest.php`

```php
// BEFORE
$this->assertSame('demo-key', $response->data['extra']['cacheKey']);
$this->assertArrayHasKey('items', $response->data['data']);

// AFTER
$this->assertSame('demo-key', $response->get_data()['extra']['cacheKey']);
$this->assertArrayHasKey('items', $response->get_data()['data']);
```

Also apply RestSetup-related changes from Category C below.

#### `tests/phpunit/Modules/ExampleFeature/ModuleTest.php`

Read the file first, then apply the same `->data` → `->get_data()` and `->status` → `->get_status()` pattern.

---

### 7.3 — Category C: Replace `$GLOBALS['wpdev_wp_*']` with real WP

#### `tests/phpunit/Core/PluginTest.php`

This test checks that `Plugin::boot()` registers `on_plugins_loaded` on the correct hooks.
With real WP, use `has_action()` instead of inspecting the global array.

```php
// BEFORE (in test_on_plugins_loaded_is_registered_only_on_plugins_loaded)
$wpActions = $GLOBALS['wpdev_wp_actions'] ?? [];
$this->assertArrayHasKey(
    'plugins_loaded',
    $wpActions,
    'Plugin::boot() must register on_plugins_loaded on plugins_loaded'
);
$this->assertArrayNotHasKey(
    'init',
    $wpActions,
    'Plugin::boot() must NOT register on_plugins_loaded on init ...'
);

// AFTER
$this->assertNotFalse(
    has_action('plugins_loaded', [Plugin::class, 'on_plugins_loaded']),
    'Plugin::boot() must register on_plugins_loaded on plugins_loaded'
);
$this->assertFalse(
    has_action('init', [Plugin::class, 'on_plugins_loaded']),
    'Plugin::boot() must NOT register on_plugins_loaded on init — dual registration causes double boot'
);
```

Also apply Category A changes (remove `use PHPUnit\Framework\TestCase;`, change `extends TestCase`,
remove `wpdev_test_reset_wp_state()`).

Also remove calls to `Plugin::reset_for_tests()` and the manual Reflection reset in `setUp()` —
`WP_UnitTestCase` handles test isolation. **But** if `Plugin` holds static state that WP's DB
rollback won't reset, keep the Reflection reset for `Plugin` static properties specifically.
Check: if `Plugin` has no WP DB side effects (it just registers hooks), keep the Reflection reset.
If tests fail without it, keep it.

#### `tests/phpunit/Support/Rest/RestSetupTest.php`

Replace `$GLOBALS['wpdev_wp_rest_routes']` assertions with real REST server route checks.

With real WP, routes are registered via the real `register_rest_route()`. Check via
`rest_get_server()->get_routes()` after calling `do_action('rest_api_init')`.

Also: call `do_action('rest_api_init')` after `RestSetup::rest_init()` if needed.

```php
// BEFORE (in test_rest_init_uses_dynamic_namespace_from_config)
$this->assertCount(1, $GLOBALS['wpdev_wp_rest_routes']);
$this->assertSame('custom/v2', $GLOBALS['wpdev_wp_rest_routes'][0]['namespace']);
$this->assertSame('test-items', $GLOBALS['wpdev_wp_rest_routes'][0]['route']);

// AFTER
$routes = rest_get_server()->get_routes();
$this->assertArrayHasKey('/custom/v2/test-items', $routes, 'REST route must be registered');
```

```php
// BEFORE (in test_allow_batch_is_passed_through)
$args = $GLOBALS['wpdev_wp_rest_routes'][0]['args'];
$this->assertArrayHasKey('allow_batch', $args);
$this->assertSame(['v1' => true], $args['allow_batch']);

// AFTER
$routes = rest_get_server()->get_routes();
$route_args = $routes['/wpdev/v1/test-items'][0] ?? $routes['/wpdev/v1/test-items'][1] ?? [];
$this->assertArrayHasKey('allow_batch', $route_args, 'allow_batch must be in route args');
$this->assertSame(['v1' => true], $route_args['allow_batch']);
```

Also in `setUp()`:

```php
// BEFORE
protected function setUp(): void
{
    parent::setUp();
    wpdev_test_reset_wp_state();
    RestSetup::flush();
    Plugin::reset_for_tests();
}

// AFTER
protected function setUp(): void
{
    parent::setUp();
    RestSetup::flush();
    Plugin::reset_for_tests(); // keep if Plugin has non-WP static state
}
```

Apply Category A changes too.

#### `tests/phpunit/Modules/ExampleFeatureTest.php`

```php
// BEFORE (in test_module_registers_rest_route_on_boot)
$routes = array_filter(
    $GLOBALS['wpdev_wp_rest_routes'],
    static fn (array $route): bool => $route['route'] === 'items'
);
$this->assertNotEmpty($routes);

// AFTER
do_action('rest_api_init');
$routes = rest_get_server()->get_routes();
// Namespace comes from project.config.json → restNamespace (default: 'wpdev/v1')
$this->assertArrayHasKey('/wpdev/v1/items', $routes, 'REST route for items must be registered');
```

Also remove from `setUp()`:

```php
wpdev_test_reset_wp_state();
RestSetup::flush();
Plugin::reset_for_tests();
```

Replace with just:

```php
protected function setUp(): void
{
    parent::setUp();
    RestSetup::flush();
    Plugin::reset_for_tests();
}
```

Apply Category B changes too (WP_REST_Response property access).

#### `tests/phpunit/Support/Shortcodes/ShortcodesSetupTest.php`

With real WP, `add_shortcode()` registers to the real WP shortcode registry. Use `shortcode_exists()`.

```php
// BEFORE (in test_register_and_render_via_class_handler)
$this->assertArrayHasKey('wpdev_demo', $GLOBALS['wpdev_wp_shortcodes']);

// AFTER
$this->assertTrue(shortcode_exists('wpdev_demo'), 'wpdev_demo shortcode must be registered');
```

Also in `setUp()`:

```php
// BEFORE
protected function setUp(): void
{
    parent::setUp();
    wpdev_test_reset_wp_state();
    ShortcodesSetup::flush();
}

// AFTER
protected function setUp(): void
{
    parent::setUp();
    ShortcodesSetup::flush();
}
```

Apply Category A changes.

#### `tests/phpunit/Support/Auth/CapabilityPolicyTest.php`

Replace manual capability globals with real WordPress users via `$this->login()`.

```php
// BEFORE
public function test_can_returns_true_when_user_has_capability(): void
{
    $GLOBALS['wpdev_wp_current_user_caps']['edit_posts'] = true;
    $this->assertTrue(CapabilityPolicy::can('edit_posts'));
}

// AFTER
public function test_can_returns_true_when_user_has_capability(): void
{
    $this->login('editor'); // WP editor role has 'edit_posts'
    $this->assertTrue(CapabilityPolicy::can('edit_posts'));
}
```

```php
// BEFORE
public function test_can_returns_false_when_user_lacks_capability(): void
{
    unset($GLOBALS['wpdev_wp_current_user_caps']['manage_options']);
    $this->assertFalse(CapabilityPolicy::can('manage_options'));
}

// AFTER
public function test_can_returns_false_when_user_lacks_capability(): void
{
    $this->login('subscriber'); // WP subscriber role lacks 'manage_options'
    $this->assertFalse(CapabilityPolicy::can('manage_options'));
}
```

```php
// BEFORE
public function test_rest_permission_closure_reuses_can(): void
{
    $GLOBALS['wpdev_wp_current_user_caps']['read'] = true;
    $callback = CapabilityPolicy::rest_permission('read');
    $this->assertTrue($callback());
}

// AFTER
public function test_rest_permission_closure_reuses_can(): void
{
    $this->login('subscriber'); // subscriber has 'read'
    $callback = CapabilityPolicy::rest_permission('read');
    $this->assertTrue($callback());
}
```

Also clean up `setUp()` — remove `wpdev_test_reset_wp_state()`. Apply Category A changes.

#### `tests/phpunit/EnqueueTest.php`

With real WP, `wp_enqueue_script()` and `wp_enqueue_style()` register to `$wp_scripts` and
`$wp_styles`. `WP_UnitTestCase` cleans these between tests.

Remove the custom call-tracking system entirely:

- Remove `$GLOBALS['wpdev_test_wp_calls'] = []` from `setUp()`
- Remove `unset($GLOBALS['wpdev_test_wp_calls'])` from `tearDown()`
- Remove the `callsFor()` helper method

Replace each assertion block:

```php
// BEFORE (in test_enqueue_bundle_script_uses_hash_version_and_merged_deps)
$calls = $this->callsFor('wp_enqueue_script');
$this->assertCount(1, $calls);
$args = $calls[0];
$this->assertSame('wpdev-starter-deps', $args[0]);
$this->assertStringContainsString('id=sha-test', $args[1]);
$this->assertSame(['jquery', 'wp-i18n', 'wp-api-fetch'], $args[2]);

// AFTER
global $wp_scripts;
$handle = 'wpdev-starter-deps';
$this->assertArrayHasKey($handle, $wp_scripts->registered, 'Script must be registered');
$registered = $wp_scripts->registered[$handle];
$this->assertStringContainsString('id=sha-test', $registered->src, 'Script src must contain cache-bust id');
$this->assertSame(['jquery', 'wp-i18n', 'wp-api-fetch'], $registered->deps, 'Script deps must be merged');
```

```php
// BEFORE (in test_enqueue_bundle_style_uses_hash_version_and_merged_deps)
$calls = $this->callsFor('wp_enqueue_style');
$this->assertCount(1, $calls);
$args = $calls[0];
$this->assertSame('theme', $args[0]);
$this->assertStringContainsString('id=css-hash', $args[1]);
$this->assertSame(['dashicons', 'bootstrap'], $args[2]);

// AFTER
global $wp_styles;
$handle = 'theme';
$this->assertArrayHasKey($handle, $wp_styles->registered, 'Style must be registered');
$registered = $wp_styles->registered[$handle];
$this->assertStringContainsString('id=css-hash', $registered->src, 'Style src must contain cache-bust id');
$this->assertSame(['dashicons', 'bootstrap'], $registered->deps, 'Style deps must be merged');
```

```php
// BEFORE (in test_enqueue_bundle_script_without_asset_file_still_returns_true)
$calls = $this->callsFor('wp_enqueue_script');
$this->assertCount(1, $calls);
$this->assertSame('no-asset', $calls[0][0]);
$this->assertStringNotContainsString('id=', $calls[0][1]);

// AFTER
global $wp_scripts;
$handle = 'no-asset';
$this->assertArrayHasKey($handle, $wp_scripts->registered, 'Script must be registered even without asset file');
$this->assertStringNotContainsString('id=', $wp_scripts->registered[$handle]->src, 'No version without asset file');
```

Apply Category A changes.

---

## Phase 8 — Verification

### Step 8.1 — Install dependencies

```bash
cd /Users/moeini/Documents/ideas/extend-kit/wp-starter-kit
composer install --ignore-platform-req=php
```

### Step 8.2 — Start Docker test environment

```bash
cd tests/docker-phpunit
./run-phpunit.sh
```

This will:

1. Start `wpdev-starter-phpunit-db` (MySQL) and `wpdev-starter-phpunit-php` (PHP)
2. Copy `wordpress-develop/tests/phpunit` into the PHP container
3. Render `wp-tests-config.php` with the correct DB credentials
4. Install a fresh WordPress test DB
5. Run the full PHPUnit suite

### Step 8.3 — Expected result

All migrated tests pass. If any fail, check:

| Symptom                                              | Fix                                                                                          |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `Class "WP_UnitTestCase" not found`                  | `WP_TESTS_DIR` not set; check `.env` WORDPRESS_DEVELOP_ROOT                                  |
| `WP_TESTS_DIR not defined`                           | `run-phpunit.sh` did not export; re-run the script                                           |
| `Database connection refused`                        | `wpdev-starter-phpunit-db` not healthy; check `docker compose logs wpdev-starter-phpunit-db` |
| `vendor/autoload.php missing`                        | Run `composer install` in `PLUGIN_ROOT` on host                                              |
| Static property bleed between tests                  | Keep the Reflection reset for `Plugin` in `setUp()`                                          |
| Route not found in `rest_get_server()->get_routes()` | Ensure `do_action('rest_api_init')` is called before assertion                               |

### Step 8.4 — Tear down

```bash
cd tests/docker-phpunit
./teardown.sh
```

---

## Quick Reference: Per-File Change Table

| File                                         | Action        | Changes                                        |
| -------------------------------------------- | ------------- | ---------------------------------------------- |
| `BootstrapTest.php`                          | **DELETE**    | Tests stubs that no longer exist               |
| `Core/ModuleLoaderTest.php`                  | Cat A         | extends, remove import                         |
| `Core/ModuleInterfaceTest.php`               | Cat A         | extends, remove import                         |
| `Core/PluginTest.php`                        | Cat A + C     | extends; `$GLOBALS` → `has_action()`           |
| `Core/PluginLifecycleTest.php`               | Cat A         | extends, remove reset                          |
| `Support/Rest/RestHandlerTest.php`           | Cat A + B     | extends; `->data` → `->get_data()`             |
| `Support/Rest/BatchResponseTest.php`         | Cat A + B     | extends; `->data` → `->get_data()`             |
| `Support/Rest/RestSetupTest.php`             | Cat A + C     | extends; `$GLOBALS` → `rest_get_server()`      |
| `Support/Auth/CapabilityPolicyTest.php`      | Cat A + C     | extends; globals → `login()`                   |
| `Support/Queue/DeferredCallTest.php`         | Cat A         | extends, remove import                         |
| `Support/Shortcodes/ShortcodesSetupTest.php` | Cat A + C     | extends; `$GLOBALS` → `shortcode_exists()`     |
| `Support/AssetsTest.php`                     | Cat A         | extends, remove import                         |
| `EnqueueTest.php`                            | Cat A + C     | extends; global tracker → `$wp_scripts`        |
| `LocalizeTest.php`                           | Cat A         | extends, remove import                         |
| `Modules/ExampleFeatureTest.php`             | Cat A + B + C | extends; `->data`; REST routes                 |
| `Modules/ExampleFeature/ModuleTest.php`      | Cat A + B     | extends; `->data` → `->get_data()`             |
| `Modules/ExampleFeatureAssetsTest.php`       | Cat A         | extends                                        |
| `Modules/ExampleFeatureSecurityTest.php`     | Cat A         | extends                                        |
| `Modules/BlocksModuleTest.php`               | Cat A         | extends                                        |
| `Modules/McpAbilitiesModuleTest.php`         | Cat A         | extends                                        |
| `Modules/WpdevDemoModuleTest.php`            | Cat A         | extends                                        |
| `FaultTolerance/*.php` (8 files)             | Cat A         | extends, remove reset calls                    |
| `Framework/PackageMetadataTest.php`          | Cat A         | extends                                        |
| `Autoload/SrcPsr4Test.php`                   | Cat A         | extends                                        |
| `ArchitectureTest.php`                       | Cat A         | extends                                        |
| `Adapters/WpdevAdapterTest.php`              | Cat A         | extends                                        |
| `PluginBootstrapTest.php`                    | Cat A         | extends (file-system test, no WP stubs needed) |
| `AssetFunctionsTest.php`                     | Cat A         | extends                                        |
| `Release/*.php` (6 files)                    | Cat A         | extends                                        |
| `PatchApplyTest.php`                         | Cat A         | extends                                        |
| `ReconcilePatchTest.php`                     | Cat A         | extends                                        |
| `TranslationBootstrapTest.php`               | Cat A         | extends                                        |
| `TranslationPipelineTest.php`                | Cat A         | extends                                        |

---

## Files NOT Touched

- All source PHP under `src/` — test refactor only
- `packages/create-wp-project/` — not in scope
- `packages/framework/` — not in scope
- `packages/php-fault-tolerance/` — not in scope
- `tests/phpunit/fixtures/` — keep as-is
- Jest tests (`tests/**/*.test.[jt]s`) — not in scope

---

## Notes for the Implementing Agent

1. **Do phases in order.** Phase 1 (package copy) must complete before Phase 5 (bootstrap)
   because the bootstrap calls `WPDevTest\Setup::setup()`.

2. **Run `composer install` after Phase 2** before touching any PHP file, so `WPDevTest\`
   is resolvable.

3. **Category A is mechanical.** All 33 files get the same two changes: remove the
   `use PHPUnit\Framework\TestCase;` line; change `extends TestCase` to
   `extends \WPDevTest\TestCases\TestCase`. Nothing else for those files.

4. **Do not invent WP logic.** If unsure how a real WP API works (e.g. `rest_get_server()`),
   follow exactly the pattern in this document. Do not add extra setup calls unless a test fails.

5. **`Plugin::reset_for_tests()` in `setUp()`** — keep it where it exists. It resets static
   PHP state (not DB state) that `WP_UnitTestCase` does not reset.

6. **The `->data` → `->get_data()` change is file-wide.** For each Category B file, do a
   global search-replace of `->data[` with `->get_data()[` and `->status` with `->get_status()`.
   But only on `WP_REST_Response` objects — don't change other `->data` accesses.
