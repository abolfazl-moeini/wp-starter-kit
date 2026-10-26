/**
 * Production release packaging helpers for scaffolded projects.
 */
import { describe, test, expect } from "@jest/globals";

import {
  pathIsWithin,
  resolveReleaseContentRoot,
} from "../../packages/create-wp-project/src/release/prepare-release.js";
import {
  prepareComposerForRelease,
  releaseCopyExcludeNames,
  releaseStripDirNames,
  releaseStripFileNames,
  releaseStripFileGlobs,
  shouldStripRelativePath,
  matchSimpleGlob,
  deriveAutoExcludeClassmap,
  extractPsr4PrefixesFromComposerJson,
  extractPsr4PrefixesFromPsr4Php,
  filterClassmapEntries,
  filterAutoloadStaticClassmap,
} from "../../packages/create-wp-project/src/release/prepareComposer.js";

describe("resolveReleaseContentRoot", () => {
  test("requires a directory boundary under WPDEV_CONTENT_ROOT", () => {
    const inside = resolveReleaseContentRoot(
      "/var/wp-content/plugins/sample-plugin",
      "/var/wp-content",
    );
    expect(inside.contentRoot).toBe("/var/wp-content");
    expect(inside.pluginsDir).toBe("/var/wp-content/plugins");

    const sibling = resolveReleaseContentRoot(
      "/var/wp-content-old/plugins/sample-plugin",
      "/var/wp-content",
    );
    expect(sibling.contentRoot).toBe("/var/wp-content-old");
    expect(pathIsWithin("/data/wp-content", "/data/wp")).toBe(false);
    expect(pathIsWithin("/data/wp/plugins/sample", "/data/wp")).toBe(true);
  });
});

describe("prepareComposerForRelease", () => {
  test("sets require.php to >={phpMinVersion}", () => {
    const out = prepareComposerForRelease({ require: {} }, "8.1");
    expect(out.require.php).toBe(">=8.1");
  });

  test("overwrites an existing require.php constraint", () => {
    const out = prepareComposerForRelease(
      { require: { php: ">=7.0", "ext-json": "*" } },
      "7.4",
    );
    expect(out.require.php).toBe(">=7.4");
    expect(out.require["ext-json"]).toBe("*");
  });

  test("sets config.platform.php to the min version", () => {
    const out = prepareComposerForRelease({}, "8.0");
    expect(out.config.platform.php).toBe("8.0");
    expect(out.config["platform-check"]).toBe(false);
  });

  test("preserves other config keys when adding platform", () => {
    const out = prepareComposerForRelease(
      {
        config: {
          "allow-plugins": { "composer/installers": true },
          platform: { "ext-json": "1" },
        },
      },
      "7.4",
    );
    expect(out.config["allow-plugins"]["composer/installers"]).toBe(true);
    expect(out.config.platform.php).toBe("7.4");
    expect(out.config.platform["ext-json"]).toBe("1");
  });

  test("forces symlink:false on path repositories", () => {
    const out = prepareComposerForRelease(
      {
        repositories: [
          {
            type: "path",
            url: "packages/*",
            options: { monorepo: true, symlink: true },
          },
          { type: "composer", url: "https://example.com" },
        ],
      },
      "7.4",
    );
    expect(out.repositories[0].options.symlink).toBe(false);
    expect(out.repositories[0].options.monorepo).toBe(true);
    expect(out.repositories[1]).toEqual({
      type: "composer",
      url: "https://example.com",
    });
  });

  test("adds options.symlink false when path repo has no options", () => {
    const out = prepareComposerForRelease(
      {
        repositories: [{ type: "path", url: "../packages/framework" }],
      },
      "7.4",
    );
    expect(out.repositories[0].options.symlink).toBe(false);
  });

  test("rewrites relative non-glob path urls to absolute under sourceRoot", () => {
    const out = prepareComposerForRelease(
      {
        repositories: [{ type: "path", url: "../packages/framework" }],
      },
      "7.4",
      "/proj/my-plugin",
    );
    expect(out.repositories[0].url).toBe(
      "/proj/my-plugin/../packages/framework",
    );
  });

  test("leaves packages/* monorepo path relative", () => {
    const out = prepareComposerForRelease(
      {
        repositories: [
          {
            type: "path",
            url: "packages/*",
            options: { monorepo: true },
          },
        ],
      },
      "7.4",
      "/proj/my-plugin",
    );
    expect(out.repositories[0].url).toBe("packages/*");
    expect(out.repositories[0].options.symlink).toBe(false);
  });

  test("path repositories enable minimum-stability dev + prefer-stable", () => {
    // Path packages without a stable version resolve as dev-main; Composer
    // rejects require "*" against them unless min-stability allows dev.
    const out = prepareComposerForRelease(
      {
        repositories: [{ type: "path", url: "packages/*" }],
        require: { "wpdev/php-fault-tolerance": "*" },
      },
      "7.4",
    );
    expect(out["minimum-stability"]).toBe("dev");
    expect(out["prefer-stable"]).toBe(true);
  });

  test("no path repositories leaves stability defaults alone", () => {
    const out = prepareComposerForRelease(
      { repositories: [{ type: "composer", url: "https://repo.example" }] },
      "7.4",
    );
    expect(out["minimum-stability"]).toBeUndefined();
  });

  test("does not mutate the input object", () => {
    const input = {
      require: { php: ">=7.0" },
      repositories: [
        { type: "path", url: "packages/*", options: { symlink: true } },
      ],
    };
    const snap = JSON.stringify(input);
    prepareComposerForRelease(input, "8.2");
    expect(JSON.stringify(input)).toBe(snap);
  });
});

describe("release strip / copy lists", () => {
  test("copy exclude includes node_modules vendor dist", () => {
    const names = releaseCopyExcludeNames();
    expect(names).toEqual(
      expect.arrayContaining(["node_modules", "vendor", "dist", ".git"]),
    );
  });

  test("strip dirs include tests docs packages docker-phpunit", () => {
    const names = releaseStripDirNames();
    expect(names).toEqual(
      expect.arrayContaining([
        "tests",
        "docs",
        "packages",
        "docker-phpunit",
        "node_modules",
        "dev",
      ]),
    );
  });

  test("strip files include agent docs, package.json, and composer manifests", () => {
    const names = releaseStripFileNames();
    expect(names).toEqual(
      expect.arrayContaining([
        "CLAUDE.md",
        "context.md",
        "AGENTS.md",
        "package.json",
        "package-lock.json",
        "composer.json",
        "composer.lock",
      ]),
    );
  });

  test("strip globs cover coverage, phpunit xml, and markdown files", () => {
    expect(releaseStripFileGlobs()).toEqual(
      expect.arrayContaining([
        "*.md",
        "*.MD",
        "*.markdown",
        "coverage.xml*",
        "phpunit.xml*",
      ]),
    );
  });
});

describe("shouldStripRelativePath", () => {
  test.each([
    ["tests/phpunit/FooTest.php", true],
    ["docs/index.md", true],
    ["packages/framework/composer.json", true],
    ["docker-phpunit/run.sh", true],
    ["dev/release/prepare-release.mjs", true],
    ["node_modules/left-pad/index.js", true],
    [".github/workflows/ci.yml", true],
    [".husky/pre-commit", true],
    ["CLAUDE.md", true],
    ["context.md", true],
    ["AGENTS.md", true],
    ["README.md", true],
    ["src/README.md", true],
    ["includes/docs/guide.markdown", true],
    ["package.json", true],
    ["package-lock.json", true],
    ["phpunit.xml.dist", true],
    ["coverage.xml", true],
    ["coverage.xml.bak", true],
    ["skills/wpdev-php-modules/SKILL.md", true],
    ["artifacts/test-report.json", true],
    ["commitlint.config.cjs", true],
    ["postcss.config.js", true],
    ["tailwind.config.js", true],
    ["src/Modules/Foo/Module.php", false],
    ["assets/bundles/Foo-bar.js", false],
    ["assets/dist/app.js", false],
    ["composer.json", true],
    ["composer.lock", true],
    ["vendor/autoload.php", false],
    ["vendor/some-pkg/composer.json", false],
    ["my-plugin.php", false],
  ])("%s → %s", (rel, expected) => {
    expect(shouldStripRelativePath(rel)).toBe(expected);
  });
});

describe("matchSimpleGlob", () => {
  test("matches coverage.xml*", () => {
    expect(matchSimpleGlob("coverage.xml", "coverage.xml*")).toBe(true);
    expect(matchSimpleGlob("coverage.xml.bak", "coverage.xml*")).toBe(true);
    expect(matchSimpleGlob("other.xml", "coverage.xml*")).toBe(false);
  });

  test("matches phpunit.xml*", () => {
    expect(matchSimpleGlob("phpunit.xml", "phpunit.xml*")).toBe(true);
    expect(matchSimpleGlob("phpunit.xml.dist", "phpunit.xml*")).toBe(true);
  });
});

describe("classmap isolation & foreign stub protection", () => {
  test("deriveAutoExcludeClassmap includes default safety globs and discovered dirs", () => {
    const excludes = deriveAutoExcludeClassmap(
      ["custom/exclude/"],
      ["src/Modules/Foo/Compatibility/"],
    );
    expect(excludes).toContain("custom/exclude/");
    expect(excludes).toContain("src/Modules/Foo/Compatibility/");
    expect(excludes).toContain("**/[Cc]ompatibility/**");
    expect(excludes).toContain("**/[Ss]tub/**");
  });

  test("extractPsr4PrefixesFromComposerJson extracts and normalizes namespaces", () => {
    const prefixes = extractPsr4PrefixesFromComposerJson({
      autoload: {
        "psr-4": {
          "Acme\\Plugin\\": "src/",
          "Acme\\Plugin\\Sub": "src/Sub/",
        },
      },
    });
    expect(prefixes).toEqual(["Acme\\Plugin\\", "Acme\\Plugin\\Sub\\"]);
  });

  test("extractPsr4PrefixesFromPsr4Php extracts namespaces from PHP array", () => {
    const php = `<?php
return array(
    'WPDev\\\\' => array($baseDir . '/src/FrameworkClosure/Core'),
    'Acme\\\\Plugin\\\\Core\\\\' => array($baseDir . '/src/FrameworkClosure/Core/Core'),
    'Acme\\\\Plugin\\\\' => array($baseDir . '/src'),
);`;
    const prefixes = extractPsr4PrefixesFromPsr4Php(php);
    expect(prefixes).toEqual([
      "WPDev\\",
      "Acme\\Plugin\\Core\\",
      "Acme\\Plugin\\",
    ]);
  });

  test("filterClassmapEntries strips foreign stubs while preserving valid entries", () => {
    const classmapContent = `<?php

$vendorDir = dirname(__DIR__);
$baseDir = dirname($vendorDir);

return array(
    'Composer\\\\InstalledVersions' => $vendorDir . '/composer/InstalledVersions.php',
    'Acme\\\\Plugin\\\\Module' => $baseDir . '/src/Module.php',
    'ThirdParty\\\\Plugin\\\\ForeignStub' => $baseDir . '/src/Modules/Wheel/Compatibility/ForeignStub.php',
    'WPDev\\\\Chameleon\\\\Assets\\\\AssetPipeline' => $baseDir . '/src/FrameworkClosure/Core/Chameleon/Assets/AssetPipeline.php',
    '_c_abcdef12' => $baseDir . '/src/FrameworkClosure/Core/mangled.php',
    'WPDev_Standalone_Container' => $baseDir . '/src/FrameworkClosure/functions-closure.php',
    'ExternalVendor\\\\Package\\\\Class' => $vendorDir . '/vendor/package/Class.php',
);
`;

    const { filteredContent, stripped } = filterClassmapEntries(
      classmapContent,
      {
        allowedPrefixes: ["Acme\\Plugin\\"],
      },
    );

    expect(stripped).toHaveLength(1);
    expect(stripped[0].normalizedClass).toBe("ThirdParty\\Plugin\\ForeignStub");
    expect(stripped[0].relPath).toBe(
      "/src/Modules/Wheel/Compatibility/ForeignStub.php",
    );

    expect(filteredContent).toContain("'Acme\\\\Plugin\\\\Module'");
    expect(filteredContent).toContain("'Composer\\\\InstalledVersions'");
    expect(filteredContent).toContain(
      "'WPDev\\\\Chameleon\\\\Assets\\\\AssetPipeline'",
    );
    expect(filteredContent).toContain("'_c_abcdef12'");
    expect(filteredContent).toContain("'WPDev_Standalone_Container'");
    expect(filteredContent).toContain("'ExternalVendor\\\\Package\\\\Class'");
    expect(filteredContent).not.toContain(
      "ThirdParty\\\\Plugin\\\\ForeignStub",
    );
  });

  test("filterAutoloadStaticClassmap strips matching entries from classMap array", () => {
    const staticContent = `<?php

namespace Composer\\Autoload;

class ComposerStaticInit
{
    public static $classMap = array (
        'Composer\\\\InstalledVersions' => __DIR__ . '/..' . '/composer/InstalledVersions.php',
        'Acme\\\\Plugin\\\\Module' => __DIR__ . '/../..' . '/src/Module.php',
        'ThirdParty\\\\Plugin\\\\ForeignStub' => __DIR__ . '/../..' . '/src/Modules/Wheel/Compatibility/ForeignStub.php',
        'WPDev\\\\Chameleon\\\\Assets\\\\AssetPipeline' => __DIR__ . '/../..' . '/src/FrameworkClosure/Core/Chameleon/Assets/AssetPipeline.php',
    );
}
`;

    const filtered = filterAutoloadStaticClassmap(staticContent, [
      "ThirdParty\\Plugin\\ForeignStub",
    ]);

    expect(filtered).toContain("'Acme\\\\Plugin\\\\Module'");
    expect(filtered).toContain("'Composer\\\\InstalledVersions'");
    expect(filtered).toContain(
      "'WPDev\\\\Chameleon\\\\Assets\\\\AssetPipeline'",
    );
    expect(filtered).not.toContain("ThirdParty\\\\Plugin\\\\ForeignStub");
  });
});
