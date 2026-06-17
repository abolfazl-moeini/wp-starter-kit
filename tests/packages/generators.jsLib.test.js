/**
 * jsLib feature wiring — engine derives uiFramework + package.json deps.
 */

import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

import { scaffoldProject } from "../../packages/create-wp-project/src/index.js";
import { defaultFeatures } from "../../packages/create-wp-project/src/features.js";
import { addFeature } from "../../packages/create-wp-project/src/addFeature.js";
import {
  buildManifest,
  writeManifest,
} from "../../packages/create-wp-project/src/manifest.js";
import { deriveUiFramework } from "../../packages/create-wp-project/src/derive-ui-framework.js";

const goodAnswers = {
  slug: "my-project",
  npmScope: "myorg",
  globalName: "MyProject",
  localizeVar: "MyProjectLoc",
  textDomain: "my-project",
  hookPrefix: "my-project",
  depsBundle: "my-project-deps.js",
  phpFunctionPrefix: "myprj_",
};

describe("deriveUiFramework()", () => {
  test("features.jsLib=react wins over answers.uiFramework=preact", () => {
    expect(
      deriveUiFramework({ jsLib: "react" }, { uiFramework: "preact" }),
    ).toBe("react");
  });

  test("features.jsLib=none with no answers override returns null", () => {
    expect(deriveUiFramework({ jsLib: "none" }, {})).toBe(null);
  });
});

describe("jsLib scaffold + addFeature", () => {
  let tmp;

  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), "wpdev-jslib-"));
  });
  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
  });

  test("scaffold with jsLib=react emits react deps (not preact aliases)", async () => {
    const res = await scaffoldProject(tmp, goodAnswers, {
      features: { ...defaultFeatures(), jsLib: "react" },
    });
    expect(res.ok).toBe(true);
    const pkg = JSON.parse(
      await fs.readFile(path.join(tmp, "package.json"), "utf8"),
    );
    expect(pkg.dependencies.react).toMatch(/^[\^~]?18\./);
    expect(pkg.dependencies.preact).toBeUndefined();
    const cfg = JSON.parse(
      await fs.readFile(path.join(tmp, "project.config.json"), "utf8"),
    );
    expect(cfg.uiFramework).toBe("react");
    const tsconfig = JSON.parse(
      await fs.readFile(path.join(tmp, "tsconfig.json"), "utf8"),
    );
    expect(tsconfig.compilerOptions.jsxImportSource).toBe("react");
  });

  test("scaffold with jsLib=preact sets jsxImportSource preact in tsconfig", async () => {
    const res = await scaffoldProject(tmp, goodAnswers, {
      features: { ...defaultFeatures(), jsLib: "preact" },
    });
    expect(res.ok).toBe(true);
    const tsconfig = JSON.parse(
      await fs.readFile(path.join(tmp, "tsconfig.json"), "utf8"),
    );
    expect(tsconfig.compilerOptions.jsxImportSource).toBe("preact");
  });

  test("addFeature(jsLib, react) updates package.json and marker file", async () => {
    const features = { ...defaultFeatures(), jsLib: "none" };
    await fs.writeFile(
      path.join(tmp, "project.config.json"),
      JSON.stringify(
        {
          slug: "my-project",
          globalName: "MyProject",
          npmScope: "@myorg",
          uiFramework: "preact",
          features,
        },
        null,
        2,
      ) + "\n",
      "utf8",
    );
    await fs.writeFile(
      path.join(tmp, "package.json"),
      JSON.stringify(
        {
          name: "@myorg/my-project",
          dependencies: {
            preact: "^10.0.0",
            react: "npm:@preact/compat",
          },
        },
        null,
        2,
      ) + "\n",
      "utf8",
    );
    await writeManifest(tmp, buildManifest({ kitVersion: "0.1.0", features }));

    const res = await addFeature(tmp, "jsLib", "react");
    expect(res.ok).toBe(true);
    const pkg = JSON.parse(
      await fs.readFile(path.join(tmp, "package.json"), "utf8"),
    );
    expect(pkg.dependencies.react).toMatch(/^[\^~]?18\./);
    expect(pkg.dependencies.preact).toBeUndefined();
    const marker = await fs.readFile(
      path.join(tmp, ".wpdev/ui-framework"),
      "utf8",
    );
    expect(marker.trim()).toBe("react");
  });

  test("husky:off scaffold omits prepare script from package.json", async () => {
    const res = await scaffoldProject(tmp, goodAnswers, {
      features: { ...defaultFeatures(), husky: "off" },
    });
    expect(res.ok).toBe(true);
    const pkg = JSON.parse(
      await fs.readFile(path.join(tmp, "package.json"), "utf8"),
    );
    expect(pkg.scripts.prepare).toBeUndefined();
  });
});
