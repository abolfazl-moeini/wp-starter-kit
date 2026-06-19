/**
 * @wpdev/create-wp-project — phpTest generator.
 *
 * PHPUnit scaffolding aligned with wpdev/plugin-core-test and the kit's
 * tests/phpunit/ conventions (PluginBaseTestCase, WPDevTest\Setup, @test).
 */

import { pluginCoreTestPackageFiles } from "./_plugin-core-test-template.js";

const PACKAGE_PREFIX = "packages/plugin-core-test/";

function testNamespaceRoot(vendorNamespace) {
  return `${vendorNamespace}Test\\`;
}

function phpunitXmlDist(tpl) {
  const wpRoot = tpl.wpTestsRoot || "/Users/moeini/Dev/wordpress-develop";
  const pluginRoot = `${wpRoot}/wp-content/plugins/${tpl.slug}`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<phpunit
    bootstrap="tests/phpunit/bootstrap.php"
    backupGlobals="false"
    colors="true"
    verbose="true"
>
    <testsuites>
        <testsuite name="${tpl.slug}">
            <directory suffix=".php">./tests/phpunit</directory>
            <exclude>./tests/phpunit/TestCases</exclude>
            <exclude>./tests/phpunit/fixtures</exclude>
        </testsuite>
    </testsuites>

    <php>
        <env name="WP_TESTS_DIR" value="${wpRoot}/tests/phpunit"/>
        <env name="BOOTSTRAP_FILE" value="${pluginRoot}/${tpl.slug}.php"/>
        <env name="PLUGIN_ROOT" value="${pluginRoot}"/>
    </php>
</phpunit>
`;
}

function pluginBaseTestCasePhp(vendorNamespace) {
  return `<?php
declare(strict_types=1);

namespace ${vendorNamespace}\\Tests\\TestCases;

abstract class PluginBaseTestCase extends \\WPDevTest\\TestCases\\TestCase
{
}
`;
}

function restTestCasePhp(vendorNamespace) {
  return `<?php
declare(strict_types=1);

namespace ${vendorNamespace}\\Tests\\TestCases;

abstract class RestTestCase extends PluginBaseTestCase
{
    public function setUp(): void
    {
        parent::setUp();
        global $wp_rest_server, $wp_actions;
        $wp_rest_server = null;
        unset($wp_actions['rest_api_init']);
        rest_get_server();
    }
}
`;
}

export function run(ctx) {
  if (ctx.features.phpTest !== "phpunit") {
    return { files: {}, dirs: [], deps: {}, devDeps: {} };
  }

  const tpl = ctx.vars || { ...ctx.answers, ...(ctx.cfg || {}) };
  const vendorNamespace = tpl.vendor || tpl.globalName || "WPDev";

  const files = {
    "phpunit.xml.dist": phpunitXmlDist(tpl),
    "tests/phpunit/bootstrap.php": `<?php
declare(strict_types=1);

$root = dirname(__DIR__, 2);

require $root . '/vendor/autoload.php';

if (!defined('WP_TESTS_PHPUNIT_POLYFILLS_PATH')) {
    define('WP_TESTS_PHPUNIT_POLYFILLS_PATH', $root . '/vendor/yoast/phpunit-polyfills');
}

WPDevTest\\Setup::setup();
`,
    "tests/phpunit/TestCases/PluginBaseTestCase.php":
      pluginBaseTestCasePhp(vendorNamespace),
    "tests/phpunit/TestCases/RestTestCase.php":
      restTestCasePhp(vendorNamespace),
  };

  for (const [rel, body] of Object.entries(pluginCoreTestPackageFiles())) {
    files[`${PACKAGE_PREFIX}${rel}`] = body;
  }

  const dirs = [
    "tests/phpunit",
    "tests/phpunit/TestCases",
    "packages/plugin-core-test",
  ];

  return {
    files,
    dirs,
    deps: {},
    devDeps: {},
    composerPatches: {
      repositories: [
        {
          type: "path",
          url: "packages/*",
          options: {
            monorepo: true,
            symlink: false,
          },
        },
      ],
      "require-dev": {
        "wpdev/plugin-core-test": "^1.2",
        "phpunit/phpunit": "^9.6",
        "yoast/phpunit-polyfills": "^2.0",
      },
      "autoload-dev": {
        "psr-4": {
          [testNamespaceRoot(vendorNamespace)]: "tests/phpunit/",
        },
      },
      scripts: {
        test: "phpunit",
      },
    },
  };
}

export const descriptor = {
  id: "phpTest",
  feature: "phpTest",
  owns: [
    "phpunit.xml.dist",
    "tests/phpunit/bootstrap.php",
    "tests/phpunit/TestCases/**",
    "packages/plugin-core-test/**",
  ],
  run,
};
