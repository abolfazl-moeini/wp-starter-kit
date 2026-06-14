# PHP Test Tools

> The `php-test-tools` package — the PHPUnit + PHPCS + PHPStan
> configuration that ships with the starter, designed to drop into
> any WP plugin or theme with zero config.

## What's in the box

`core/packages/php-test-tools/`:

```
php-test-tools/
├── composer.json             # declares phpunit/phpunit, wp-dev, ...
├── phpunit.xml.dist          # PHPUnit config
├── phpcs.xml.dist            # PHPCS (WordPress-Extra) config
├── phpstan.neon.dist         # PHPStan (level 5) config
├── scripts/
│   ├── test.sh               # runs phpunit with WP test suite
│   ├── coverage.sh           # runs phpunit with --coverage-html
│   └── lint.sh               # runs phpcs + phpstan
└── ruleset.xml               # PHPCS custom ruleset (extends WordPress-Extra)
```

A project uses it by adding to its own `composer.json`:

```jsonc
"require-dev": {
  "@wpsk/php-test-tools": "^0.1.0"
}
```

and then `vendor/bin/test` (or `composer test`) does the right thing.

## PHPUnit

`phpunit.xml.dist`:

```xml
<phpunit
  bootstrap="tests/bootstrap.php"
  backupGlobals="false"
  colors="true"
  cacheResultFile=".phpunit.cache/test-results"
>
  <testsuites>
    <testsuite name="unit">
      <directory suffix="Test.php">tests/phpunit</directory>
    </testsuite>
  </testsuites>
  <coverage>
    <include>
      <directory suffix=".php">core/php</directory>
    </include>
  </coverage>
</phpunit>
```

The `bootstrap.php` loads:

1. `vendor/autoload.php`
2. `wp-tests-config.php` (if running the WP test suite)
3. The plugin/theme's main file (`plugin.php` or `functions.php`)
4. The test helper (`PluginBaseTestCase` or `ThemeBaseTestCase`)

### `PluginBaseTestCase`

A drop-in base class for plugin tests:

```php
class MyPluginTest extends \WPDevTest\PluginBaseTestCase
{
    public function testEnqueue(): void
    {
        do_action('wp_enqueue_scripts');
        $this->assertTrue(wp_style_is('my-plugin', 'enqueued'));
    }
}
```

It provides:

- `setUp()` that creates a fresh WP install
- `tearDown()` that cleans up posts, users, options, transients
- `factory()` access to `WP_UnitTest_Factory` (posts, users, terms)
- `$this->post_id`, `$this->user_id` convenience accessors
- `assertActionsFired($tag)` and `assertFiltersApplied($tag)` helpers

### `RestTestCase`

A specialized base class for REST endpoint tests:

```php
class MyRestTest extends \WPDevTest\RestTestCase
{
    public function testGetItems(): void
    {
        $request = new \WP_REST_Request('GET', '/my-plugin/v1/items');
        $response = rest_do_request($request);
        $this->assertEquals(200, $response->get_status());
    }
}
```

It pre-registers the routes, sets up the REST server, and provides
`$this->dispatch($request)` to run a request and get a normalized
response.

### `BaseAjaxTestCase`

For `wp_ajax_*` action tests:

```php
class MyAjaxTest extends \WPDevTest\BaseAjaxTestCase
{
    public function testAjaxAction(): void
    {
        $this->setAjaxAction('my_action');
        $this->dispatchAjax(['arg' => 'value']);
        $this->assertAjaxResponse(['success' => true]);
    }
}
```

This bypasses the `admin-ajax.php` bootstrap so tests run in <50ms
each.

## PHPCS

`phpcs.xml.dist` extends `WordPress-Extra`:

```xml
<ruleset name="wpsk/php-test-tools">
  <description>WordPress-Extra + WPSK additions</description>
  <rule ref="WordPress-Extra"/>
  <rule ref="WordPress.Security.NonceVerification"/>
  <rule ref="WordPress.Security.ValidatedSanitizedInput"/>
  <rule ref="WordPressVIPMinimum.Performance.WPQueryParams"/>
</ruleset>
```

Plus a few **WPSK-specific rules** (defined in `ruleset.xml`):

- `WPDev.NamingConventions.FunctionPrefix` — every function in
  `core/php/` must start with the project's `phpFunctionPrefix`
  (read from `project.config.json`).
- `WPDev.I18n.TextDomain` — every `__()` / `_e()` / `esc_html__()`
  must use the project's `textDomain` (read from `project.config.json`).
- `WPDev.Files.ClassFileName` — class files must be `class-<name>.php`
  (PSR-4-ish).

The WPSK rules are in `core/packages/php-test-tools/rules/` and total
~300 LOC of PHPCS custom sniff code.

## PHPStan

`phpstan.neon.dist`:

```neon
parameters:
  level: 5
  paths:
    - core/php
  excludePaths:
    - core/php/vendor
  bootstrapFiles:
    - tests/phpstan/bootstrap.php
  treatPhpDocTypesAsCertain: false
```

Level 5 catches:

- Undefined methods
- Wrong argument types
- Missing return types
- Dead code

The bootstrap stubs out `do_action`, `apply_filters`, `get_option`,
`wp_remote_get` etc. so PHPStan can analyze WP code without WP being
loaded.

## Running the tools

```bash
# All tests:
composer test

# Coverage report:
composer coverage         # → coverage/index.html

# Lint (PHPCS + PHPStan):
composer lint

# Just PHPUnit:
vendor/bin/phpunit

# Just PHPCS:
vendor/bin/phpcs

# Just PHPStan:
vendor/bin/phpstan analyse
```

## CI integration

GitHub Actions (Phase 10) runs:

```yaml
- run: composer install
- run: composer test
- run: composer lint
```

Both must pass for the PR to merge. Coverage is reported via
`xdebug`/`pcov` to Codecov; the badge is on the README.

## When to add a custom sniff

If you find yourself repeatedly commenting on the same code-review
nit (e.g. "use `wp_date()` not `date()`"), add a sniff:

1. Create `core/packages/php-test-tools/rules/<Rule>.php`.
2. Register it in `ruleset.xml`.
3. Add a test in `core/packages/php-test-tools/__tests__/`.
4. Document it in this file.

The starter ships with 3 custom sniffs. Most projects can stay on
WordPress-Extra for the first year and add WPSK-specific rules as
they stabilize.
