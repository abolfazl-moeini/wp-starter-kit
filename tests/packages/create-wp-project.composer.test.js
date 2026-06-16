/**
 * Phase 23.A3 RED — consumer composer.json uses wpsk/framework.
 *
 * The kit is moving from a "copy the framework into the consumer"
 * (vendored) model to a "require wpsk/framework via Composer"
 * (deps) model. The scaffold's emitted composer.json must:
 *
 *   1. `require` wpsk/framework (version `*` is acceptable for a
 *      path-repository-driven scaffold; the path repo is what
 *      actually pins the source).
 *   2. Declare a `repositories` entry of type "path" pointing to
 *      the framework package inside the kit workspace. The exact
 *      path is parameterized — the scaffold accepts it via an
 *      option so the same template can be tested with a fake path
 *      AND used in real kit builds with the real workspace path.
 *   3. Still map the consumer's own namespace → src/ (the user's
 *      modules are still in src/, only the framework moved).
 *
 * The test fails RED while the scaffold's composer.json template
 * doesn't have a `require wpsk/framework` line and a path
 * repository; it goes GREEN once 23.A4 wires the template
 * substitutions and adds the path-repo block.
 */
import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

import { scaffoldProject } from "../../packages/create-wp-project/src/index.js";

describe("@wpsk/create-wp-project — consumer composer.json (Phase 23.A3/A4)", () => {
  let tmp;
  const goodAnswers = {
    slug: "my-project",
    npmScope: "myorg",
    globalName: "MyProject",
    localizeVar: "MyProjectLoc",
    textDomain: "my-project",
    hookPrefix: "my-project",
    depsBundle: "my-project-deps.js",
    phpFunctionPrefix: "myprj_",
    uiFramework: "preact",
  };

  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), "wpsk-scaffold-composer-"));
  });
  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
  });

  async function readComposer() {
    return JSON.parse(
      await fs.readFile(path.join(tmp, "composer.json"), "utf8"),
    );
  }

  test("composer.json requires wpsk/framework", async () => {
    const res = await scaffoldProject(tmp, goodAnswers);
    expect(res.ok).toBe(true);
    const composer = await readComposer();
    expect(composer.require).toBeDefined();
    expect(composer.require["wpsk/framework"]).toBeDefined();
    // The require may be a pinned semver version OR `*` for a
    // path-repository-driven scaffold. Both are acceptable.
    expect(typeof composer.require["wpsk/framework"]).toBe("string");
    expect(composer.require["wpsk/framework"].length).toBeGreaterThan(0);
  });

  test("composer.json declares a path repository for wpsk/framework", async () => {
    const res = await scaffoldProject(tmp, goodAnswers);
    expect(res.ok).toBe(true);
    const composer = await readComposer();
    expect(Array.isArray(composer.repositories)).toBe(true);
    // Find the path repository pointing to the framework package.
    const pathRepo = composer.repositories.find(
      (r) => r && r.type === "path" && typeof r.url === "string",
    );
    expect(pathRepo).toBeDefined();
    expect(pathRepo.url).toMatch(/packages\/framework\/?$/);
  });

  test("composer.json still maps the consumer's own namespace to src/", async () => {
    const res = await scaffoldProject(tmp, goodAnswers);
    expect(res.ok).toBe(true);
    const composer = await readComposer();
    // The user's modules are still in src/. The vendor namespace is
    // derived from the globalName answer (PascalCase form: "MyProject").
    expect(composer.autoload).toBeDefined();
    expect(composer.autoload["psr-4"]).toBeDefined();
    expect(composer.autoload["psr-4"]["MyProject\\"]).toBe("src/");
  });

  test("composer.json path repository URL is overridable via scaffold option", async () => {
    // The path repository URL must be parameterized — the scaffold
    // accepts a `frameworkPath` option (or detects it from a kit
    // config) so the test can use a fake path. We assert the
    // emitted URL matches the value we passed in.
    const customPath = "/tmp/fake-kit-workspace/packages/framework";
    const res = await scaffoldProject(tmp, goodAnswers, {
      frameworkPath: customPath,
    });
    expect(res.ok).toBe(true);
    const composer = await readComposer();
    const pathRepo = composer.repositories.find(
      (r) => r && r.type === "path" && typeof r.url === "string",
    );
    expect(pathRepo).toBeDefined();
    expect(pathRepo.url).toBe(customPath);
  });

  test("composer.json framework require + path repo are emitted as a pair", async () => {
    // If the require is present, the path repo must also be present
    // (and vice versa). A scaffold that emits only one of the two
    // would break downstream `composer install`.
    const res = await scaffoldProject(tmp, goodAnswers);
    expect(res.ok).toBe(true);
    const composer = await readComposer();
    const hasRequire = !!composer.require?.["wpsk/framework"];
    const hasPathRepo =
      Array.isArray(composer.repositories) &&
      composer.repositories.some(
        (r) =>
          r && r.type === "path" && /packages\/framework/.test(r.url || ""),
      );
    expect(hasRequire).toBe(true);
    expect(hasPathRepo).toBe(true);
  });
});
