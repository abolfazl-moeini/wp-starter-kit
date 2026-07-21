/**
 * Production release packaging helpers for scaffolded projects.
 */
import { describe, test, expect } from "@jest/globals";

import {
  prepareComposerForRelease,
  releaseCopyExcludeNames,
  releaseStripDirNames,
  releaseStripFileNames,
  releaseStripFileGlobs,
  shouldStripRelativePath,
  matchSimpleGlob,
} from "../../packages/create-wp-project/src/release/prepareComposer.js";

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

  test("strip files include agent docs and package.json", () => {
    const names = releaseStripFileNames();
    expect(names).toEqual(
      expect.arrayContaining([
        "CLAUDE.md",
        "context.md",
        "AGENTS.md",
        "package.json",
        "package-lock.json",
      ]),
    );
  });

  test("strip globs cover coverage and phpunit xml", () => {
    expect(releaseStripFileGlobs()).toEqual(
      expect.arrayContaining(["coverage.xml*", "phpunit.xml*"]),
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
    ["package.json", true],
    ["package-lock.json", true],
    ["phpunit.xml.dist", true],
    ["coverage.xml", true],
    ["coverage.xml.bak", true],
    ["src/Modules/Foo/Module.php", false],
    ["assets/bundles/Foo-bar.js", false],
    ["composer.json", false],
    ["vendor/autoload.php", false],
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
