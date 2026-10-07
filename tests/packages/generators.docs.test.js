import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import {
  run as runDocsGenerator,
  descriptor,
} from "../../packages/create-wp-project/src/generators/docs.js";
import { scaffoldProject } from "../../packages/create-wp-project/src/index.js";
import { defaultFeatures } from "../../packages/create-wp-project/src/features.js";
import { validateAssets } from "../../tools/build-docs.mjs";
import { prepareRelease } from "../../packages/create-wp-project/src/release/prepare-release.js";

describe("generators/docs.js — In-Repo Docs-as-Code", () => {
  let tmp;

  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), "wpdev-docs-test-"));
  });

  afterEach(async () => {
    if (tmp) {
      await fs.rm(tmp, { recursive: true, force: true });
    }
  });

  test("descriptor matches expected id, feature, and ownership", () => {
    expect(descriptor.id).toBe("docs");
    expect(descriptor.feature).toBe("docs");
    expect(descriptor.owns).toContain("docs/user-guide/01-introduction.md");
    expect(descriptor.owns).toContain(
      "docs/user-guide/02-settings-overview.md",
    );
    expect(descriptor.owns).toContain("docs/technical/architecture.md");
    expect(descriptor.owns).toContain("docs/assets/.gitkeep");
    expect(descriptor.owns).toContain("docs/templates/feature-manual.md");
    expect(descriptor.owns).toContain("tools/build-docs.mjs");
  });

  test("run() returns all expected docs files when docs is 'on'", () => {
    const ctx = {
      answers: { slug: "test-docs", name: "Test Docs Plugin" },
      cfg: { slug: "test-docs", globalName: "TestDocs" },
      features: { ...defaultFeatures(), docs: "on" },
      vars: {
        slug: "test-docs",
        name: "Test Docs Plugin",
        wpMinVersion: "6.0",
        phpMinVersion: "7.4",
        hookPrefix: "test_docs",
      },
    };

    const out = runDocsGenerator(ctx);
    expect(Object.keys(out.files)).toEqual(
      expect.arrayContaining(descriptor.owns),
    );
    expect(out.files["docs/user-guide/01-introduction.md"]).toContain(
      "Test Docs Plugin",
    );
    expect(out.files["docs/technical/architecture.md"]).toContain("test_docs");
    expect(out.files["tools/build-docs.mjs"]).toContain(
      "In-Repo Docs-as-Code build runner",
    );
    expect(out.dirs).toEqual(
      expect.arrayContaining([
        "docs",
        "docs/user-guide",
        "docs/technical",
        "docs/assets",
        "docs/templates",
        "tools",
      ]),
    );
  });

  test("run() returns empty files when docs is 'off'", () => {
    const ctx = {
      answers: { slug: "test-docs" },
      cfg: { slug: "test-docs" },
      features: { ...defaultFeatures(), docs: "off" },
    };

    const out = runDocsGenerator(ctx);
    expect(out.files).toEqual({});
    expect(out.dirs).toEqual([]);
  });

  test("scaffoldProject() generates full docs hierarchy and package.json scripts", async () => {
    const answers = {
      slug: "my-doc-plugin",
      name: "My Doc Plugin",
      globalName: "MyDocPlugin",
      hookPrefix: "my-doc-plugin",
      npmScope: "@wpdev",
      textDomain: "my-doc-plugin",
    };

    const res = await scaffoldProject(tmp, answers);
    expect(res.ok).toBe(true);

    // Verify files on disk
    const introPath = path.join(tmp, "docs/user-guide/01-introduction.md");
    const settingsPath = path.join(
      tmp,
      "docs/user-guide/02-settings-overview.md",
    );
    const archPath = path.join(tmp, "docs/technical/architecture.md");
    const runnerPath = path.join(tmp, "tools/build-docs.mjs");
    const wpdevJsonPath = path.join(tmp, "wpdev.json");
    const packageJsonPath = path.join(tmp, "package.json");

    await expect(fs.access(introPath)).resolves.toBeUndefined();
    await expect(fs.access(settingsPath)).resolves.toBeUndefined();
    await expect(fs.access(archPath)).resolves.toBeUndefined();
    await expect(fs.access(runnerPath)).resolves.toBeUndefined();

    // Verify wpdev.json docs config
    const wpdevJson = JSON.parse(await fs.readFile(wpdevJsonPath, "utf8"));
    expect(wpdevJson.docs).toBeDefined();
    expect(wpdevJson.docs.enabled).toBe(true);
    expect(wpdevJson.docs.user_guide_dir).toBe("docs/user-guide");
    expect(wpdevJson.docs.output_dir).toBe("dist/docs");

    // Verify package.json scripts
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, "utf8"));
    expect(packageJson.scripts["docs:build"]).toBe("node tools/build-docs.mjs");
    expect(packageJson.scripts["docs:pdf"]).toBe(
      "node tools/build-docs.mjs --format=pdf",
    );
    expect(packageJson.scripts["docs:docx"]).toBe(
      "node tools/build-docs.mjs --format=docx",
    );
  });

  test("validateAssets() detects missing local images and passes valid/remote assets", async () => {
    const guideDir = path.join(tmp, "docs/user-guide");
    const assetsDir = path.join(tmp, "docs/assets");
    await fs.mkdir(guideDir, { recursive: true });
    await fs.mkdir(assetsDir, { recursive: true });

    // Valid asset on disk
    await fs.writeFile(path.join(assetsDir, "valid-image.png"), "FAKE_PNG");

    // Markdown file with valid local, remote, data-uri, and broken local
    const mdContent = `
# Sample Guide
![Valid Local Image](../assets/valid-image.png)
![Remote Image](https://example.com/banner.png)
<img src="https://cdn.example.com/logo.svg" alt="CDN Logo" />
![Data URI](data:image/png;base64,iVBORw0KGgoAAAANS)
![Image With Title](../assets/valid-image.png "Optional Title")
![Broken Image](../assets/missing-file.png)
<img src="../assets/another-missing.jpg" />
`;
    await fs.writeFile(path.join(guideDir, "01-sample.md"), mdContent, "utf8");

    const missing = validateAssets(tmp, guideDir, ["01-sample.md"]);
    expect(missing).toHaveLength(2);
    expect(missing[0].rawReference).toContain("missing-file.png");
    expect(missing[1].rawReference).toContain("another-missing.jpg");
  });

  test("prepareRelease with withDocs: true compiles client PDF and strips raw docs from zip root", async () => {
    const answers = {
      slug: "doc-release-test",
      name: "Doc Release Test",
      globalName: "DocReleaseTest",
      hookPrefix: "doc-release-test",
      npmScope: "@wpdev",
      textDomain: "doc-release-test",
    };

    const scaffoldRes = await scaffoldProject(tmp, answers);
    expect(scaffoldRes.ok).toBe(true);

    const relRes = await prepareRelease({
      root: tmp,
      out: "dist",
      skipComposer: true,
      skipRector: true,
      skipTests: true,
      skipZip: false,
      withDocs: true,
      useCanonicalAssembler: false,
    });

    // Client manual exists in dist/docs/ and is > 0 bytes
    expect(relRes.docsPdfPath).toBeDefined();
    await expect(fs.access(relRes.docsPdfPath)).resolves.toBeUndefined();
    const stat = await fs.stat(relRes.docsPdfPath);
    expect(stat.size).toBeGreaterThan(0);

    // Raw docs directory is stripped from the WordPress plugin distribution root
    const distDocsDir = path.join(relRes.distRoot, "docs");
    await expect(fs.access(distDocsDir)).rejects.toThrow();
  }, 30000);
});
