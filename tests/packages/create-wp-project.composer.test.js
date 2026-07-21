/**
 * Consumer composer.json — wpdev/framework as a normal Composer dep.
 *
 * Generated projects must NOT ship monorepo path repos like
 * `../packages/framework` — those only work next to a kit checkout
 * and break real scaffolds. Path repos are opt-in via
 * `options.frameworkPath`.
 */
import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

import { scaffoldProject } from "../../packages/create-wp-project/src/index.js";

describe("@wpdev/create-wp-project — consumer composer.json (Phase 23.A3/A4)", () => {
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
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), "wpdev-scaffold-composer-"));
  });
  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
  });

  async function readComposer() {
    return JSON.parse(
      await fs.readFile(path.join(tmp, "composer.json"), "utf8"),
    );
  }

  test("composer.json requires wpdev/framework", async () => {
    const res = await scaffoldProject(tmp, goodAnswers);
    expect(res.ok).toBe(true);
    const composer = await readComposer();
    expect(composer.require).toBeDefined();
    expect(composer.require["wpdev/framework"]).toBeDefined();
    expect(typeof composer.require["wpdev/framework"]).toBe("string");
    expect(composer.require["wpdev/framework"].length).toBeGreaterThan(0);
  });

  test("composer.json does NOT emit monorepo path repos by default", async () => {
    const res = await scaffoldProject(tmp, goodAnswers);
    expect(res.ok).toBe(true);
    const composer = await readComposer();
    const repos = Array.isArray(composer.repositories)
      ? composer.repositories
      : [];
    const monorepoPaths = repos.filter(
      (r) =>
        r &&
        r.type === "path" &&
        typeof r.url === "string" &&
        (r.url.includes("../packages/") ||
          r.url.endsWith("packages/framework") ||
          r.url.includes("php-fault-tolerance")),
    );
    expect(monorepoPaths).toEqual([]);
  });

  test("composer.json still maps the consumer's own namespace to src/", async () => {
    const res = await scaffoldProject(tmp, goodAnswers);
    expect(res.ok).toBe(true);
    const composer = await readComposer();
    expect(composer.autoload).toBeDefined();
    expect(composer.autoload["psr-4"]).toBeDefined();
    expect(composer.autoload["psr-4"]["MyProject\\"]).toBe("src/");
  });

  test("composer.json path repository is opt-in via scaffold option", async () => {
    const customPath = "/tmp/fake-kit-workspace/packages/framework";
    const res = await scaffoldProject(tmp, goodAnswers, {
      frameworkPath: customPath,
    });
    expect(res.ok).toBe(true);
    const composer = await readComposer();
    const pathRepo = (composer.repositories || []).find(
      (r) => r && r.type === "path" && typeof r.url === "string",
    );
    expect(pathRepo).toBeDefined();
    expect(pathRepo.url).toBe(customPath);
  });
});
