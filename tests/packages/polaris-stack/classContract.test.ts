/** @jest-environment node */
import { describe, test, expect } from "@jest/globals";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const MONOREPO_ROOT = join(process.cwd());
const POLARIS_ROOT = join(MONOREPO_ROOT, "packages/polaris-stack");
const FRAMEWORK_VIEWS = join(
  MONOREPO_ROOT,
  "packages/framework/src/Chameleon/Views",
);
const CORE_CSS_FILE = join(POLARIS_ROOT, "dist/polaris-core.css");

function getAllFiles(dir: string, ext: string[]): string[] {
  let results: string[] = [];
  if (!readdirSync || !statSync) return results;
  const list = readdirSync(dir);
  for (const file of list) {
    const filePath = join(dir, file);
    const stat = statSync(filePath);
    if (stat.isDirectory()) {
      results = results.concat(getAllFiles(filePath, ext));
    } else if (ext.some((e) => file.endsWith(e))) {
      results.push(filePath);
    }
  }
  return results;
}

function extractCssClasses(css: string): Set<string> {
  const classes = new Set<string>();
  const matches = css.matchAll(/\.(ps-[a-zA-Z0-9_-]+)/g);
  for (const m of matches) {
    classes.add(m[1]);
  }
  return classes;
}

function extractSourceClasses(fileContent: string): Set<string> {
  const classes = new Set<string>();
  // Match string literals like "ps-button", 'ps-modal-dialog', etc.
  const staticMatches = fileContent.matchAll(/["'`](ps-[a-zA-Z0-9_-]+)["'`]/g);
  for (const m of staticMatches) {
    classes.add(m[1]);
  }

  // Handle template interpolations like `ps-button-${variant}`
  if (fileContent.includes("ps-button-${variant}")) {
    for (const v of ["solid", "soft", "ghost"]) {
      classes.add(`ps-button-${v}`);
    }
  }
  if (fileContent.includes("ps-button-${size}")) {
    for (const s of ["sm", "md", "lg"]) {
      classes.add(`ps-button-${s}`);
    }
  }
  if (fileContent.includes("ps-badge-${tone}")) {
    for (const t of ["info", "success", "warning", "danger", "neutral"]) {
      classes.add(`ps-badge-${t}`);
    }
  }
  if (fileContent.includes("ps-badge-${size}")) {
    for (const s of ["sm", "md", "lg"]) {
      classes.add(`ps-badge-${s}`);
    }
  }
  if (fileContent.includes("ps-card-elevation-${elevation}")) {
    for (const e of ["1", "2", "3", "4"]) {
      classes.add(`ps-card-elevation-${e}`);
    }
  }
  if (fileContent.includes("ps-alert-${tone}")) {
    for (const t of ["info", "success", "warning", "danger"]) {
      classes.add(`ps-alert-${t}`);
    }
  }
  if (fileContent.includes("ps-heading-${level}")) {
    for (const l of ["1", "2", "3", "4", "5", "6"]) {
      classes.add(`ps-heading-${l}`);
    }
  }

  return classes;
}

describe("Class Contract Parity (CP-1c / G3)", () => {
  const css = readFileSync(CORE_CSS_FILE, "utf8");
  const definedCssClasses = extractCssClasses(css);

  test("polaris-core.css defines essential base components", () => {
    expect(definedCssClasses.has("ps-root")).toBe(true);
    expect(definedCssClasses.has("ps-button")).toBe(true);
    expect(definedCssClasses.has("ps-button-solid")).toBe(true);
    expect(definedCssClasses.has("ps-button-soft")).toBe(true);
    expect(definedCssClasses.has("ps-button-ghost")).toBe(true);
    expect(definedCssClasses.has("ps-card")).toBe(true);
    expect(definedCssClasses.has("ps-badge")).toBe(true);
    expect(definedCssClasses.has("ps-modal")).toBe(true);
    expect(definedCssClasses.has("ps-modal-dialog")).toBe(true);
  });

  test("every ps-* class produced by TSX components is defined in polaris-core.css", () => {
    const tsxFiles = [
      ...getAllFiles(join(POLARIS_ROOT, "src/components"), [".tsx"]),
      ...getAllFiles(join(POLARIS_ROOT, "src/layout"), [".tsx"]),
    ];

    const missingInCss: Array<{ file: string; className: string }> = [];

    for (const file of tsxFiles) {
      const content = readFileSync(file, "utf8");
      const classes = extractSourceClasses(content);

      for (const cls of classes) {
        if (!definedCssClasses.has(cls)) {
          missingInCss.push({
            file: file.replace(MONOREPO_ROOT, ""),
            className: cls,
          });
        }
      }
    }

    expect(missingInCss).toEqual([]);
  });

  test("every ps-* class used in PHP partials (Chameleon/Views) is defined in polaris-core.css", () => {
    const phpFiles = getAllFiles(FRAMEWORK_VIEWS, [".php"]);
    const missingInCss: Array<{ file: string; className: string }> = [];

    for (const file of phpFiles) {
      const content = readFileSync(file, "utf8");
      const classes = extractClassAttributeTokens(content);

      for (const cls of classes) {
        if (!definedCssClasses.has(cls)) {
          missingInCss.push({
            file: file.replace(MONOREPO_ROOT, ""),
            className: cls,
          });
        }
      }
    }

    expect(missingInCss).toEqual([]);
  });

  test("deprecated .ps-btn classes are completely removed from polaris-core.css", () => {
    expect(definedCssClasses.has("ps-btn")).toBe(false);
    expect(definedCssClasses.has("ps-btn-primary")).toBe(false);
    expect(definedCssClasses.has("ps-btn-secondary")).toBe(false);
    expect(definedCssClasses.has("ps-btn-close")).toBe(false);
  });

  test("the class-attribute extractor sees every class of a multi-class attribute", () => {
    const sample = `echo "<button class='ps-button ps-button-ghost {$extra}' data-ps-close>";`;
    expect([...extractClassAttributeTokens(sample)].sort()).toEqual([
      "ps-button",
      "ps-button-ghost",
    ]);
  });

  test("no source file still references the removed .ps-btn vocabulary (CP-1b)", () => {
    const sourceFiles = [
      ...getAllFiles(join(POLARIS_ROOT, "src"), [".css", ".ts", ".tsx"]),
      ...getAllFiles(join(MONOREPO_ROOT, "packages/framework/src/Chameleon"), [
        ".php",
      ]),
    ];
    const offenders = sourceFiles
      .filter((file) =>
        /(?<![\w-])ps-btn(?![\w])/.test(readFileSync(file, "utf8")),
      )
      .map((file) => file.replace(MONOREPO_ROOT, ""));

    expect(offenders).toEqual([]);
  });

  const manifestPath = join(POLARIS_ROOT, "contract/components.manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const manifestClasses = extractManifestClasses(manifest);

  test("CSS ⊆ Manifest: all classes in polaris-core.css are declared in components.manifest.json", () => {
    const undeclaredInManifest: string[] = [];
    for (const cls of definedCssClasses) {
      if (!manifestClasses.has(cls)) {
        undeclaredInManifest.push(cls);
      }
    }
    expect(undeclaredInManifest).toEqual([]);
  });

  test("Manifest ⊆ CSS: all classes declared in components.manifest.json exist in polaris-core.css", () => {
    const missingInCss: string[] = [];
    for (const cls of manifestClasses) {
      if (!definedCssClasses.has(cls)) {
        missingInCss.push(cls);
      }
    }
    expect(missingInCss).toEqual([]);
  });

  test("Source ⊆ Manifest: all classes produced by TSX and PHP are declared in components.manifest.json", () => {
    const sourceFiles = [
      ...getAllFiles(join(POLARIS_ROOT, "src/components"), [".tsx"]),
      ...getAllFiles(join(POLARIS_ROOT, "src/layout"), [".tsx"]),
      ...getAllFiles(FRAMEWORK_VIEWS, [".php"]),
    ];

    const undeclaredSources: Array<{ file: string; className: string }> = [];

    for (const file of sourceFiles) {
      const content = readFileSync(file, "utf8");
      const classes = file.endsWith(".php")
        ? extractClassAttributeTokens(content)
        : extractSourceClasses(content);

      for (const cls of classes) {
        if (!manifestClasses.has(cls)) {
          undeclaredSources.push({
            file: file.replace(MONOREPO_ROOT, ""),
            className: cls,
          });
        }
      }
    }

    expect(undeclaredSources).toEqual([]);
  });

  test("no source file references forbidden double-dash BEM modifiers (--)", () => {
    const sourceFiles = [
      ...getAllFiles(join(POLARIS_ROOT, "src"), [".css", ".ts", ".tsx"]),
      ...getAllFiles(FRAMEWORK_VIEWS, [".php"]),
    ];

    const doubleDashOffenders: string[] = [];
    for (const file of sourceFiles) {
      const content = readFileSync(file, "utf8");
      if (/(?<![\w-])ps-[a-zA-Z0-9]+--[a-zA-Z0-9-]+/.test(content)) {
        doubleDashOffenders.push(file.replace(MONOREPO_ROOT, ""));
      }
    }

    expect(doubleDashOffenders).toEqual([]);
  });
});

function extractManifestClasses(manifest: any): Set<string> {
  const classes = new Set<string>();
  for (const [cName, c] of Object.entries<any>(manifest.components || {})) {
    classes.add(c.rootClass);
    if (c.parts) c.parts.forEach((p: string) => classes.add(p));
    if (c.states) c.states.forEach((s: string) => classes.add(s));
    if (c.variants) {
      for (const [axis, vals] of Object.entries<string[]>(c.variants)) {
        for (const v of vals) {
          if (cName === "card" && axis === "elevation") {
            classes.add(`ps-card-elevation-${v}`);
          } else if (cName === "card" && axis === "interactive") {
            classes.add(`ps-card-interactive`);
          } else if (cName === "heading") {
            classes.add(`ps-heading-${v}`);
          } else if (cName === "text") {
            if (axis === "size") classes.add(`ps-text-${v}`);
            if (axis === "weight") classes.add(`ps-text-weight-${v}`);
            if (axis === "tone") classes.add(`ps-text-tone-${v}`);
            if (axis === "overflow") classes.add(`ps-text-${v}`);
          } else {
            classes.add(`${c.rootClass}-${v}`);
          }
        }
      }
    }
  }
  for (const [_, l] of Object.entries<any>(manifest.layouts || {})) {
    classes.add(l.rootClass);
    if (l.modifiers) l.modifiers.forEach((m: string) => classes.add(m));
  }
  for (const [_, i] of Object.entries<any>(manifest.islands || {})) {
    classes.add(i.rootClass);
    if (i.parts) i.parts.forEach((p: string) => classes.add(p));
    if (i.modifiers) i.modifiers.forEach((m: string) => classes.add(m));
  }
  if (manifest.internal)
    manifest.internal.forEach((cls: string) => classes.add(cls));
  return classes;
}

/**
 * Collect every ps-* token inside class="..." / class='...' attributes, including
 * multi-class values; PHP interpolations such as {$extra} are ignored.
 */
function extractClassAttributeTokens(fileContent: string): Set<string> {
  const classes = new Set<string>();
  for (const attr of fileContent.matchAll(/\bclass=(["'])(.*?)\1/g)) {
    for (const token of attr[2].split(/\s+/)) {
      if (/^ps-[a-zA-Z0-9_-]*[a-zA-Z0-9]$/.test(token)) {
        classes.add(token);
      }
    }
  }
  return classes;
}
