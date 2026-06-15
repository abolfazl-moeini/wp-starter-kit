/**
 * @wpsk/create-wp-project — phpTest generator (Phase 21).
 *
 * PHPUnit scaffolding: phpunit.xml at the project root +
 * tests/phpunit/bootstrap.php. Phase 21 emits a minimal
 * PHPUnit 10 configuration that points at `tests/phpunit/`
 * for the test suite and a bootstrap that pulls in the kit's
 * test helpers (mirroring the kit's own phpunit.xml).
 *
 * The full PHPUnit wiring (config block, groups, coverage,
 * fixtures) lands in Phase 25. The `phpTest: phpunit` variant
 * is the only one the generator handles — the `phpTest: none`
 * variant is a no-op (the generator is filtered out by the
 * registry).
 *
 * NOTE: this generator only ships the SCAFFOLD side of the
 * PHPUnit story. The kit's own `tests/phpunit/` is the test
 * harness for the kit's own classes; the consumer's
 * `tests/phpunit/` is a separate directory the user owns.
 * The generator does NOT copy the kit's tests into the
 * consumer — it emits a minimal bootstrap that the consumer
 * extends with their own tests.
 */

export function run(ctx) {
  if (ctx.features.phpTest !== "phpunit") {
    return { files: {}, dirs: [], deps: {}, devDeps: {} };
  }
  return {
    files: {
      "phpunit.xml": `<?xml version="1.0" encoding="UTF-8"?>
<phpunit xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:noNamespaceSchemaLocation="https://schema.phpunit.de/10.5/phpunit.xsd"
         bootstrap="tests/phpunit/bootstrap.php"
         colors="true"
         cacheDirectory=".phpunit.cache">
  <testsuites>
    <testsuite name="project">
      <directory>tests/phpunit</directory>
    </testsuite>
  </testsuites>
  <source>
    <include>
      <directory>src</directory>
    </include>
  </source>
</phpunit>
`,
      "tests/phpunit/bootstrap.php": `<?php
/**
 * PHPUnit bootstrap — minimal WordPress-free loader.
 *
 * Phase 21 stub. Replace with the kit's full bootstrap (see
 * the kit's own tests/phpunit/bootstrap.php) when integrating
 * the wp-starter-kit test harness.
 */

declare(strict_types=1);

// Pull in Composer's autoloader for the project itself.
\$autoload = __DIR__ . '/../../vendor/autoload.php';
if (!file_exists(\$autoload)) {
    throw new RuntimeException(
        'vendor/autoload.php not found. Run composer install first.'
    );
}
require \$autoload;
`,
    },
    dirs: ["tests/phpunit"],
    deps: {},
    devDeps: {},
  };
}

export const descriptor = {
  id: "phpTest",
  feature: "phpTest",
  owns: ["phpunit.xml", "tests/phpunit/bootstrap.php"],
  run,
};
