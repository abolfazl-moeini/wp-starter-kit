/**
 * Integration: prepareRelease copies to dist/{slug}/, hardens composer,
 * and strips dev-only paths without touching the source tree.
 */
import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

import { prepareRelease } from "../../packages/create-wp-project/src/release/prepare-release.js";

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
      JSON.stringify({ name: "demo", scripts: { build: "echo build" } }),
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

    // Stripped.
    await expect(fs.stat(path.join(dist, "tests"))).rejects.toThrow();
    await expect(fs.stat(path.join(dist, "docs"))).rejects.toThrow();
    await expect(fs.stat(path.join(dist, "packages"))).rejects.toThrow();
    await expect(fs.stat(path.join(dist, "docker-phpunit"))).rejects.toThrow();
    await expect(fs.stat(path.join(dist, "dev"))).rejects.toThrow();
    await expect(fs.stat(path.join(dist, "CLAUDE.md"))).rejects.toThrow();
    await expect(fs.stat(path.join(dist, "context.md"))).rejects.toThrow();
    await expect(fs.stat(path.join(dist, "AGENTS.md"))).rejects.toThrow();
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
});
