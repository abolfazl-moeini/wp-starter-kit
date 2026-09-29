/**
 * Integration: prepareRelease copies to dist/{slug}/, hardens composer,
 * and strips dev-only paths without touching the source tree.
 */
import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import { promises as fs } from "node:fs";
import { spawnSync } from "node:child_process";
import * as path from "node:path";
import * as os from "node:os";

import {
  prepareRelease,
  parseArgs,
  resolveProjectVersion,
} from "../../packages/create-wp-project/src/release/prepare-release.js";

describe("prepareRelease integration", () => {
  let tmp;

  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), "wpdev-prepare-release-"));

    await fs.writeFile(
      path.join(tmp, "wpdev.json"),
      JSON.stringify({
        slug: "demo-plugin",
        phpMinVersion: "8.0",
        globalName: "DemoPlugin",
      }),
    );
    await fs.writeFile(
      path.join(tmp, "composer.json"),
      JSON.stringify(
        {
          name: "demo/plugin",
          require: { php: ">=7.0" },
          repositories: [
            {
              type: "path",
              url: "packages/*",
              options: { monorepo: true, symlink: true },
            },
          ],
          config: {},
        },
        null,
        2,
      ),
    );
    await fs.writeFile(path.join(tmp, "demo-plugin.php"), "<?php\n// plugin\n");
    await fs.mkdir(path.join(tmp, "src"), { recursive: true });
    await fs.writeFile(path.join(tmp, "src/Module.php"), "<?php\n");
    await fs.mkdir(path.join(tmp, "assets/bundles"), { recursive: true });
    await fs.writeFile(
      path.join(tmp, "assets/bundles/app.js"),
      "console.log(1)\n",
    );
    await fs.mkdir(path.join(tmp, "tests"), { recursive: true });
    await fs.writeFile(path.join(tmp, "tests/FooTest.php"), "<?php\n");
    await fs.mkdir(path.join(tmp, "docs"), { recursive: true });
    await fs.writeFile(path.join(tmp, "docs/index.md"), "# docs\n");
    await fs.mkdir(path.join(tmp, "packages/lib"), { recursive: true });
    await fs.writeFile(
      path.join(tmp, "packages/lib/composer.json"),
      JSON.stringify({ name: "demo/lib" }),
    );
    await fs.mkdir(path.join(tmp, "docker-phpunit"), { recursive: true });
    await fs.writeFile(path.join(tmp, "docker-phpunit/run.sh"), "#!/bin/sh\n");
    await fs.writeFile(path.join(tmp, "CLAUDE.md"), "# claude\n");
    await fs.writeFile(path.join(tmp, "context.md"), "# ctx\n");
    await fs.writeFile(path.join(tmp, "AGENTS.md"), "# agents\n");
    await fs.writeFile(path.join(tmp, "phpunit.xml.dist"), "<phpunit/>\n");
    await fs.writeFile(path.join(tmp, "coverage.xml"), "<coverage/>\n");
    await fs.writeFile(
      path.join(tmp, "package.json"),
      JSON.stringify({
        name: "demo",
        version: "1.2.3",
        scripts: { build: "echo build" },
      }),
    );
    await fs.mkdir(path.join(tmp, "node_modules/left-pad"), {
      recursive: true,
    });
    await fs.writeFile(
      path.join(tmp, "node_modules/left-pad/index.js"),
      "module.exports=1\n",
    );
    await fs.mkdir(path.join(tmp, ".github/workflows"), { recursive: true });
    await fs.writeFile(
      path.join(tmp, ".github/workflows/ci.yml"),
      "name: ci\n",
    );
    await fs.mkdir(path.join(tmp, "skills/test-skill"), { recursive: true });
    await fs.writeFile(
      path.join(tmp, "skills/test-skill/SKILL.md"),
      "# skill\n",
    );
    await fs.mkdir(path.join(tmp, "artifacts"), { recursive: true });
    await fs.writeFile(path.join(tmp, "artifacts/report.json"), "{}\n");
    await fs.writeFile(
      path.join(tmp, "commitlint.config.cjs"),
      "module.exports={};\n",
    );
    await fs.writeFile(
      path.join(tmp, "postcss.config.js"),
      "module.exports={};\n",
    );
    await fs.mkdir(path.join(tmp, "assets/dist"), { recursive: true });
    await fs.writeFile(
      path.join(tmp, "assets/dist/bundle.js"),
      "console.log('dist');\n",
    );
  });

  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
  });

  test("packages into dist/{slug} without mutating source", async () => {
    const result = await prepareRelease({
      root: tmp,
      skipComposer: true,
      skipTests: true,
    });
    expect(result.slug).toBe("demo-plugin");
    expect(result.version).toBe("1.2.3");
    expect(result.distRoot).toBe(path.join(tmp, "dist", "demo-plugin"));

    // Source untouched.
    await expect(
      fs.stat(path.join(tmp, "tests/FooTest.php")),
    ).resolves.toBeTruthy();
    await expect(fs.stat(path.join(tmp, "package.json"))).resolves.toBeTruthy();
    await expect(
      fs.stat(path.join(tmp, "node_modules/left-pad/index.js")),
    ).resolves.toBeTruthy();

    const dist = result.distRoot;
    await expect(fs.stat(path.join(dist, ".dist-built"))).resolves.toBeTruthy();
    await expect(
      fs.stat(path.join(dist, "demo-plugin.php")),
    ).resolves.toBeTruthy();
    await expect(
      fs.stat(path.join(dist, "src/Module.php")),
    ).resolves.toBeTruthy();
    await expect(
      fs.stat(path.join(dist, "assets/bundles/app.js")),
    ).resolves.toBeTruthy();
    await expect(
      fs.stat(path.join(dist, "assets/dist/bundle.js")),
    ).resolves.toBeTruthy();

    // Stripped.
    await expect(fs.stat(path.join(dist, "tests"))).rejects.toThrow();
    await expect(fs.stat(path.join(dist, "docs"))).rejects.toThrow();
    await expect(fs.stat(path.join(dist, "packages"))).rejects.toThrow();
    await expect(fs.stat(path.join(dist, "docker-phpunit"))).rejects.toThrow();
    await expect(fs.stat(path.join(dist, "dev"))).rejects.toThrow();
    await expect(fs.stat(path.join(dist, "CLAUDE.md"))).rejects.toThrow();
    await expect(fs.stat(path.join(dist, "context.md"))).rejects.toThrow();
    await expect(fs.stat(path.join(dist, "AGENTS.md"))).rejects.toThrow();
    await expect(fs.stat(path.join(dist, "skills"))).rejects.toThrow();
    await expect(fs.stat(path.join(dist, "artifacts"))).rejects.toThrow();
    await expect(
      fs.stat(path.join(dist, "commitlint.config.cjs")),
    ).rejects.toThrow();
    await expect(
      fs.stat(path.join(dist, "postcss.config.js")),
    ).rejects.toThrow();
    await expect(
      fs.stat(path.join(dist, "phpunit.xml.dist")),
    ).rejects.toThrow();
    await expect(fs.stat(path.join(dist, "coverage.xml"))).rejects.toThrow();
    await expect(fs.stat(path.join(dist, "package.json"))).rejects.toThrow();
    await expect(fs.stat(path.join(dist, "node_modules"))).rejects.toThrow();
    await expect(fs.stat(path.join(dist, ".github"))).rejects.toThrow();

    // Composer manifests used for install, then stripped from the ship tree.
    await expect(fs.stat(path.join(dist, "composer.json"))).rejects.toThrow();
    await expect(fs.stat(path.join(dist, "composer.lock"))).rejects.toThrow();

    // Zip sits next to the folder (WordPress-style: {slug}/… as archive root).
    expect(result.zipPath).toBe(path.join(tmp, "dist", "demo-plugin.zip"));
    await expect(fs.stat(result.zipPath)).resolves.toBeTruthy();
  });

  test("skipZip leaves folder only", async () => {
    const result = await prepareRelease({
      root: tmp,
      skipComposer: true,
      skipZip: true,
      skipTests: true,
    });
    expect(result.zipPath).toBeNull();
    await expect(
      fs.stat(path.join(tmp, "dist", "demo-plugin.zip")),
    ).rejects.toThrow();
  });

  test("failed suite blocks dist and leaves prior package intact", async () => {
    const prior = path.join(tmp, "dist", "demo-plugin");
    await fs.mkdir(prior, { recursive: true });
    await fs.writeFile(path.join(prior, ".keep"), "prior-dist\n");

    await fs.writeFile(
      path.join(tmp, "wpdev.json"),
      JSON.stringify({
        slug: "demo-plugin",
        phpMinVersion: "8.0",
        globalName: "DemoPlugin",
        features: {
          phpTest: "none",
          jsTest: "jest",
          e2eTest: "none",
        },
      }),
    );
    await fs.writeFile(
      path.join(tmp, "package.json"),
      JSON.stringify({
        name: "demo",
        scripts: {
          build: "echo build",
          test: 'node -e "process.exit(2)"',
        },
      }),
    );

    await expect(
      prepareRelease({ root: tmp, skipComposer: true, skipZip: true }),
    ).rejects.toThrow(/Release blocked|failed/);

    expect(await fs.readFile(path.join(prior, ".keep"), "utf8")).toBe(
      "prior-dist\n",
    );
  });

  test("parseArgs parses --spaghetti and --profile=spaghetti", () => {
    const spagFlag = parseArgs(["--spaghetti"]);
    expect(spagFlag.profile).toBe("spaghetti");
    expect(spagFlag.spaghetti).toBe(true);
    expect(spagFlag.obfuscate).toBe(false);

    const spagProf = parseArgs(["--profile=spaghetti"]);
    expect(spagProf.profile).toBe("spaghetti");
    expect(spagProf.spaghetti).toBe(true);

    const spagSpace = parseArgs(["--profile", "spaghetti"]);
    expect(spagSpace.profile).toBe("spaghetti");
    expect(spagSpace.spaghetti).toBe(true);

    expect(() => parseArgs(["--spaghetti", "--profile=clean"])).toThrow(
      /Conflicting profile flags/,
    );
    expect(() => parseArgs(["--spaghetti", "--obfuscate"])).toThrow(
      /Conflicting profile flags/,
    );
  });

  test("spaghetti profile in wpdev.json flattens namespaces without mangling class names", async () => {
    await fs.writeFile(
      path.join(tmp, "wpdev.json"),
      JSON.stringify({
        slug: "demo-plugin",
        releaseProfile: "spaghetti",
        phpMinVersion: "7.4",
      }),
    );
    await fs.mkdir(path.join(tmp, "src"), { recursive: true });
    await fs.writeFile(
      path.join(tmp, "src/SampleService.php"),
      "<?php\nnamespace DemoPlugin\\Services;\nclass SampleService {\n    public function run() { return 42; }\n}\n",
    );

    const result = await prepareRelease({
      root: tmp,
      skipComposer: true,
      skipRector: true,
      skipTests: true,
      skipZip: true,
      useCanonicalAssembler: false,
    });

    expect(result.slug).toBe("demo-plugin");
    const distCode = await fs.readFile(
      path.join(result.distRoot, "src/SampleService.php"),
      "utf8",
    );
    expect(distCode).toContain("class SampleService");
    expect(distCode).not.toContain("_c_");
  });

  test("preflight rejects conflicting spaghetti and clean/obfuscate options before touching dist", async () => {
    const prior = path.join(tmp, "dist", "demo-plugin");
    await fs.mkdir(prior, { recursive: true });
    await fs.writeFile(path.join(prior, ".keep"), "keep-me\n");

    await expect(
      prepareRelease({
        root: tmp,
        spaghetti: true,
        profile: "clean",
        skipTests: true,
      }),
    ).rejects.toThrow(/Conflicting profile flags/);

    await expect(
      prepareRelease({
        root: tmp,
        spaghetti: true,
        obfuscate: true,
        skipTests: true,
      }),
    ).rejects.toThrow(/Conflicting profile flags/);

    expect(await fs.readFile(path.join(prior, ".keep"), "utf8")).toBe(
      "keep-me\n",
    );
  });

  test("preserves composer require and autoload when dumping classmap after transformation", async () => {
    await fs.writeFile(
      path.join(tmp, "wpdev.json"),
      JSON.stringify({
        slug: "demo-plugin",
        releaseProfile: "spaghetti",
        phpMinVersion: "7.4",
      }),
    );
    await fs.writeFile(
      path.join(tmp, "composer.json"),
      JSON.stringify({
        name: "demo/plugin",
        require: { php: ">=7.4" },
        autoload: {
          "psr-4": { "DemoPlugin\\": "src/" },
        },
      }),
    );
    await fs.mkdir(path.join(tmp, "src"), { recursive: true });
    await fs.writeFile(
      path.join(tmp, "src/SampleService.php"),
      "<?php\nnamespace DemoPlugin;\nclass SampleService {}\n",
    );
    const initDump = spawnSync(
      "composer",
      ["dump-autoload", "--no-scripts", "--no-plugins"],
      {
        cwd: tmp,
        encoding: "utf8",
      },
    );
    expect(initDump.status).toBe(0);

    const result = await prepareRelease({
      root: tmp,
      skipComposer: false,
      skipRector: true,
      skipTests: true,
      skipZip: true,
      useCanonicalAssembler: false,
    });

    const classmapPath = path.join(
      result.distRoot,
      "vendor/composer/autoload_classmap.php",
    );
    expect(await fs.stat(classmapPath)).toBeTruthy();
    const classmapContent = await fs.readFile(classmapPath, "utf8");
    expect(classmapContent).toContain("SampleService");
    await expect(
      fs.stat(path.join(result.distRoot, "composer.json")),
    ).rejects.toThrow();
  });

  test("spaghetti profile preserves comments and docblocks while flattening namespaces", async () => {
    await fs.writeFile(
      path.join(tmp, "wpdev.json"),
      JSON.stringify({
        slug: "demo-plugin",
        releaseProfile: "spaghetti",
        phpMinVersion: "7.4",
      }),
    );
    await fs.mkdir(path.join(tmp, "src"), { recursive: true });
    await fs.writeFile(
      path.join(tmp, "src/SampleDoc.php"),
      "<?php\nnamespace DemoPlugin\\Services;\n/**\n * Important Service Docblock\n */\nclass SampleDoc {\n    // Inline comment explaining logic\n    public function calculate() {\n        return 100;\n    }\n}\n",
    );

    const result = await prepareRelease({
      root: tmp,
      skipComposer: true,
      skipRector: true,
      skipTests: true,
      skipZip: true,
      useCanonicalAssembler: false,
    });

    const distCode = await fs.readFile(
      path.join(result.distRoot, "src/SampleDoc.php"),
      "utf8",
    );
    expect(distCode).toContain("class SampleDoc");
    expect(distCode).toContain("Important Service Docblock");
    expect(distCode).toContain("Inline comment explaining logic");
  });

  test("prepareRelease with custom outDir does not recursively self-copy", async () => {
    const customOut = path.join(tmp, "custom-output");
    await fs.mkdir(customOut, { recursive: true });
    await fs.writeFile(path.join(customOut, "existing.txt"), "pre-existing\n");

    const result = await prepareRelease({
      root: tmp,
      out: "custom-output",
      skipComposer: true,
      skipRector: true,
      skipTests: true,
      skipZip: true,
    });

    expect(result.distRoot).toBe(path.join(customOut, "demo-plugin"));
    await expect(
      fs.stat(path.join(result.distRoot, ".dist-built")),
    ).resolves.toBeTruthy();
    await expect(
      fs.stat(path.join(result.distRoot, "custom-output")),
    ).rejects.toThrow();
  });

  test("resolveProjectVersion extracts version from package.json, header, or raw config", async () => {
    const vDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "wpdev-version-test-"),
    );
    try {
      // 1. package.json wins
      await fs.writeFile(
        path.join(vDir, "package.json"),
        JSON.stringify({ version: "2.3.4" }),
      );
      await fs.writeFile(
        path.join(vDir, "my-plugin.php"),
        "<?php\n/**\n * Version: 1.0.1\n */\n",
      );
      expect(
        resolveProjectVersion(vDir, "my-plugin", { version: "0.9.0" }),
      ).toBe("2.3.4");

      // 2. Main PHP header Version
      await fs.unlink(path.join(vDir, "package.json"));
      expect(
        resolveProjectVersion(vDir, "my-plugin", { version: "0.9.0" }),
      ).toBe("1.0.1");

      // 3. Raw config version
      await fs.unlink(path.join(vDir, "my-plugin.php"));
      expect(
        resolveProjectVersion(vDir, "my-plugin", { version: "0.9.0" }),
      ).toBe("0.9.0");

      // 4. Default fallback 1.0.0
      expect(resolveProjectVersion(vDir, "my-plugin", {})).toBe("1.0.0");
    } finally {
      await fs.rm(vDir, { recursive: true, force: true });
    }
  });
});
