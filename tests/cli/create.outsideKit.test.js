/**
 * Regression: scaffold must work when cwd is an empty folder *outside*
 * the monorepo (the real `create-wpdev-plugin` / `wpdev create` UX).
 *
 * Prior bug: resolveEngineSrcDir walked process.argv[1] without
 * realpath, so nvm-linked global bins never found the engine and
 * fell back to `./packages/create-wp-project/src/release/...` →
 * "Release script missing".
 */
import { describe, test, expect, afterEach } from "@jest/globals";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const KIT_ROOT = process.cwd();
const WPDEV = join(KIT_ROOT, "packages/cli/bin/wpdev.js");

describe("wpdev create from empty folder outside the kit", () => {
  /** @type {string | undefined} */
  let emptyDir;

  afterEach(() => {
    if (emptyDir) {
      rmSync(emptyDir, { recursive: true, force: true });
      emptyDir = undefined;
    }
  });

  test("full-featured create succeeds and emits release packager", () => {
    emptyDir = mkdtempSync(join(tmpdir(), "wpdev-outside-kit-"));
    const target = join(emptyDir, "my-plugin");

    const r = spawnSync(
      process.execPath,
      [
        WPDEV,
        "create",
        "my-plugin",
        "--yes",
        "--preset=full",
        "--scope=acme",
        "--global=AcmePlugin",
        "--domain=my-plugin",
        "--hook=my-plugin",
        `--dir=${target}`,
      ],
      {
        cwd: emptyDir,
        encoding: "utf8",
        env: { ...process.env, FORCE_COLOR: "0" },
      },
    );

    if (r.status !== 0) {
      // Surface the real failure in the assertion message.
      throw new Error(
        `wpdev create failed (status ${r.status})\nstdout:\n${r.stdout}\nstderr:\n${r.stderr}`,
      );
    }

    expect(existsSync(join(target, "wpdev.json"))).toBe(true);
    expect(existsSync(join(target, "my-plugin.php"))).toBe(true);
    expect(existsSync(join(target, "dev/release/prepare-release.js"))).toBe(
      true,
    );
    expect(existsSync(join(target, "dev/release/prepareComposer.js"))).toBe(
      true,
    );

    const bootstrap = readFileSync(join(target, "my-plugin.php"), "utf8");
    expect(bootstrap).toMatch(/Plugin Name:/);
    expect(bootstrap).toMatch(/MY_PLUGIN_VERSION/);

    const pkg = JSON.parse(readFileSync(join(target, "package.json"), "utf8"));
    expect(pkg.scripts.release).toMatch(/run-release\.js/);

    const composer = JSON.parse(
      readFileSync(join(target, "composer.json"), "utf8"),
    );
    expect(composer.scripts["release:dist"]).toMatch(/prepare-release\.js/);
  });
});
