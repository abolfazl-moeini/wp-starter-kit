import {
  describe,
  test,
  expect,
  jest,
  beforeEach,
  afterEach,
} from "@jest/globals";
import {
  mkdtempSync,
  writeFileSync,
  readFileSync,
  existsSync,
  rmSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("esbuild-styles", () => {
  let tmpRoot;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    tmpRoot = mkdtempSync(join(tmpdir(), "wpsk-styles-"));
  });

  afterEach(() => {
    if (tmpRoot && existsSync(tmpRoot)) {
      rmSync(tmpRoot, { recursive: true, force: true });
    }
  });

  test("buildStyleAssetFile returns asset file path", async () => {
    const cssPath = join(tmpRoot, "style.css");
    writeFileSync(cssPath, "body { color: red; }");

    const mod = await import("@core/build/esbuild-styles.js");
    const result = await mod.buildStyleAssetFile(cssPath);

    expect(result).toBe(join(tmpRoot, "style.asset.php"));
  });

  test("buildStyleAssetFile writes <file>.asset.php with hash", async () => {
    const cssPath = join(tmpRoot, "app.css");
    writeFileSync(cssPath, ".x { margin: 0; }");

    const mod = await import("@core/build/esbuild-styles.js");
    const assetPath = await mod.buildStyleAssetFile(cssPath);

    expect(existsSync(assetPath)).toBe(true);
    const content = readFileSync(assetPath, "utf8");
    // json2php produces array('hash' => '...') (PHP long array syntax)
    expect(content).toMatch(/^<\?php return array\(/);
    expect(content).toMatch(/'hash'\s*=>\s*'[a-f0-9]{32}'/);
    expect(content.trimEnd().endsWith(";")).toBe(true);
  });

  test("buildStyleAssetFile hash changes when file content changes", async () => {
    const cssPath = join(tmpRoot, "hash.css");
    writeFileSync(cssPath, "body { background: white; }");

    const mod = await import("@core/build/esbuild-styles.js");
    const firstPath = await mod.buildStyleAssetFile(cssPath);
    const firstContent = readFileSync(firstPath, "utf8");
    const firstHash = firstContent.match(/'hash'\s*=>\s*'([a-f0-9]+)'/)[1];

    writeFileSync(cssPath, "body { background: black; }");
    const secondPath = await mod.buildStyleAssetFile(cssPath);
    const secondContent = readFileSync(secondPath, "utf8");
    const secondHash = secondContent.match(/'hash'\s*=>\s*'([a-f0-9]+)'/)[1];

    expect(firstHash).not.toBe(secondHash);
  });

  test("buildStyleAssetFile throws a clear error when source file is missing", async () => {
    const missing = join(tmpRoot, "does-not-exist.css");

    const mod = await import("@core/build/esbuild-styles.js");
    await expect(mod.buildStyleAssetFile(missing)).rejects.toThrow(
      /not found|css|ENOENT/i,
    );
  });

  test("buildStyles iterates styleEntryPoints and returns the list of asset files", async () => {
    const css1 = join(tmpRoot, "a.css");
    const css2 = join(tmpRoot, "b.css");
    writeFileSync(css1, "/* a */");
    writeFileSync(css2, "/* b */");

    const mod = await import("@core/build/esbuild-styles.js");
    const results = await mod.buildStyles({
      buildConfig: { styleEntryPoints: [css1, css2] },
    });

    expect(results).toEqual([
      join(tmpRoot, "a.asset.php"),
      join(tmpRoot, "b.asset.php"),
    ]);
    expect(existsSync(results[0])).toBe(true);
    expect(existsSync(results[1])).toBe(true);
  });
});
