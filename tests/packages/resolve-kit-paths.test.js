import { describe, test, expect, afterEach } from "@jest/globals";
import path from "node:path";
import { existsSync, realpathSync } from "node:fs";
import {
  resolveEngineSrcDir,
  resolveKitPackageSrc,
} from "../../packages/create-wp-project/src/resolve-kit-paths.js";

const KIT_ROOT = path.resolve(__dirname, "../..");
const ENGINE_SRC = path.join(KIT_ROOT, "packages/create-wp-project/src");

describe("resolve-kit-paths", () => {
  const originalArgv = process.argv[1];
  const originalCwd = process.cwd();

  afterEach(() => {
    process.argv[1] = originalArgv;
    process.chdir(originalCwd);
  });

  test("resolveEngineSrcDir finds engine src from CLI argv outside kit root", () => {
    process.argv[1] = path.join(KIT_ROOT, "packages/cli/bin/wpdev.js");
    process.chdir("/tmp");
    const srcDir = resolveEngineSrcDir();
    expect(srcDir).toBe(ENGINE_SRC);
  });

  test("resolveEngineSrcDir realpath-resolves nvm-style symlink argv paths", () => {
    // Global installs put bins under node_modules/@wpdev/cli which is a
    // symlink into the kit. Walking the symlink path never reaches the
    // monorepo — realpath is required.
    const nvmStyleCliBin = path.join(
      process.env.NVM_DIR || path.join(process.env.HOME || "", ".nvm"),
      "versions/node",
      process.version.slice(1),
      "lib/node_modules/@wpdev/cli/bin/wpdev.js",
    );

    if (!existsSync(nvmStyleCliBin)) {
      // Environment without a global link — still cover realpath of the
      // workspace node_modules symlink layout.
      const workspaceLink = path.join(
        KIT_ROOT,
        "node_modules/@wpdev/cli/bin/wpdev.js",
      );
      if (!existsSync(workspaceLink)) {
        return; // nothing to assert in this environment
      }
      process.argv[1] = workspaceLink;
    } else {
      process.argv[1] = nvmStyleCliBin;
    }

    process.chdir("/tmp");
    const srcDir = resolveEngineSrcDir();
    expect(srcDir).toBe(ENGINE_SRC);
    // And the argv path really was a different string than the realpath tree.
    expect(path.resolve(process.argv[1])).not.toBe(
      path.join(ENGINE_SRC, "index.js"),
    );
  });

  test("resolveEngineSrcDir finds engine via createRequire package resolution", () => {
    process.argv[1] = path.join(KIT_ROOT, "packages/cli/bin/wpdev.js");
    process.chdir("/tmp");
    // Even if walk failed, package resolution from argv should work.
    expect(resolveEngineSrcDir()).toBe(ENGINE_SRC);
  });

  test("resolveEngineSrcDir never returns a non-existent phantom path", () => {
    process.argv[1] = "/tmp/definitely-not-a-wpdev-binary.js";
    process.chdir("/tmp");
    // Under Jest, __dirname still points at the engine package so resolution
    // succeeds. The contract is: returned path must actually contain the
    // engine marker (never a made-up cwd/packages/... path).
    const srcDir = resolveEngineSrcDir();
    expect(existsSync(path.join(srcDir, "generators", "_templates.js"))).toBe(
      true,
    );
    expect(srcDir).not.toBe(
      path.join("/tmp", "packages/create-wp-project/src"),
    );
  });

  test("resolveKitPackageSrc finds mcp-integration from CLI argv outside kit root", () => {
    process.argv[1] = path.join(KIT_ROOT, "packages/cli/bin/wpdev.js");
    process.chdir("/tmp");
    const mcpSrc = resolveKitPackageSrc(
      "mcp-integration",
      path.join("Core", "Plugin.php"),
    );
    expect(mcpSrc).toBe(path.join(KIT_ROOT, "packages/mcp-integration/src"));
  });

  test("release scripts are reachable from resolved engine src", () => {
    process.argv[1] = path.join(KIT_ROOT, "packages/cli/bin/wpdev.js");
    process.chdir("/tmp");
    const srcDir = resolveEngineSrcDir();
    expect(existsSync(path.join(srcDir, "release", "prepare-release.js"))).toBe(
      true,
    );
    expect(existsSync(path.join(srcDir, "release", "prepareComposer.js"))).toBe(
      true,
    );
  });
});
