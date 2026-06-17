/**
 * Polaris Stack template mirror.
 *
 * Reads source from packages/polaris-stack/src/ at generation time so
 * generated projects stay in sync with the self-contained package.
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

function createWpProjectSrcDir() {
  if (typeof __dirname !== "undefined" && __dirname) {
    return path.dirname(__dirname);
  }
  return path.join(process.cwd(), "packages/create-wp-project/src");
}

function polarisSrcRoot() {
  const srcDir = createWpProjectSrcDir();
  const candidates = [
    path.join(path.dirname(path.dirname(srcDir)), "polaris-stack", "src"),
    path.join(process.cwd(), "packages/polaris-stack/src"),
  ];
  for (const candidate of candidates) {
    if (existsSync(path.join(candidate, "theme", "tokens.css"))) {
      return candidate;
    }
  }
  throw new Error(
    "Polaris Stack source not found. Expected packages/polaris-stack/src beside create-wp-project.",
  );
}

function walkDir(dir, base = dir) {
  /** @type {Record<string, string>} */
  const files = {};
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith(".")) continue;
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "node_modules" || entry === "dist") continue;
      Object.assign(files, walkDir(full, base));
      continue;
    }
    if (entry.endsWith(".test.ts") || entry.endsWith(".test.tsx")) continue;
    const rel = path.relative(base, full).replace(/\\/g, "/");
    files[rel] = readFileSync(full, "utf8");
  }
  return files;
}

/**
 * @param {object} _ctx
 * @returns {Record<string, string>}
 */
export function polarisFiles(_ctx) {
  const files = walkDir(polarisSrcRoot());
  files["index.ts"] = [
    'export * from "./theme";',
    'export * from "./layout";',
    'export * from "./components";',
    "",
  ].join("\n");
  files["styles.css"] = [
    "/* Polaris Stack global styles */",
    files["theme/tokens.css"],
    files["theme/themes.css"],
    files["theme/base.css"],
    files["layout/layout.css"],
    files["components/components.css"],
    "",
  ].join("\n");
  return files;
}

/**
 * @param {object} ctx
 * @returns {string}
 */
export function polarisDemoEntry(ctx) {
  const framework = ctx.features?.["jsLib"] === "react" ? "react" : "preact";
  return [
    `// uiFramework: ${framework}`,
    'import "../../../../polaris/styles.css";',
    'import { mountComponent } from "@wpdev/html-utils";',
    'import { Button, Card, Heading, Stack, Text, setPolarisTheme } from "../../../../polaris";',
    "",
    'setPolarisTheme("system");',
    "",
    "function PolarisDemoApp() {",
    "  return (",
    '    <Stack gap="4">',
    "      <Card>",
    "        <Heading>Polaris Stack</Heading>",
    "        <Text>Layout and style are separated.</Text>",
    '        <Button onClick={() => setPolarisTheme("dark")}>Dark</Button>',
    '        <Button variant="ghost" onClick={() => setPolarisTheme("light")}>Light</Button>',
    "      </Card>",
    "    </Stack>",
    "  );",
    "}",
    "",
    'mountComponent("polaris-demo-root", PolarisDemoApp);',
    "",
  ].join("\n");
}
