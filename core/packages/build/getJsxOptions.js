import { existsSync } from "node:fs";
import path from "node:path";

/**
 * Esbuild JSX options aligned with project.config.json `uiFramework`
 * and root tsconfig (`react-jsx` + `jsxImportSource`).
 *
 * @param {'preact'|'react'|string} [uiFramework]
 * @returns {{ jsx: 'automatic', jsxImportSource: 'preact'|'react' }}
 */
export function getJsxOptions(uiFramework = "preact") {
  const source = uiFramework === "react" ? "react" : "preact";
  return {
    jsx: "automatic",
    jsxImportSource: source,
  };
}

/**
 * Preact projects alias `react` imports to `preact/compat` at bundle time.
 *
 * @param {'preact'|'react'|string} [uiFramework]
 * @returns {Record<string, string>}
 */
export function getReactAliases(uiFramework = "preact") {
  if (uiFramework !== "preact") {
    return {};
  }
  return {
    react: "preact/compat",
    "react-dom": "preact/compat",
  };
}

/**
 * Project-local package aliases so module entries never need deep relative
 * imports (e.g. `../../../../polaris`). Prefer package names:
 * `@wpdev/polaris-stack`, `@/*` → `src/*`.
 *
 * Aliases are only registered when the target path exists on disk.
 *
 * @param {string} [cwd=process.cwd()]
 * @returns {Record<string, string>}
 */
export function getProjectAliases(cwd = process.cwd()) {
  /** @type {Record<string, string>} */
  const aliases = {};
  const polarisRoot = path.join(cwd, "src", "polaris");
  if (existsSync(polarisRoot)) {
    const indexTs = path.join(polarisRoot, "index.ts");
    const indexJs = path.join(polarisRoot, "index.js");
    aliases["@wpdev/polaris-stack"] = existsSync(indexTs)
      ? indexTs
      : existsSync(indexJs)
        ? indexJs
        : polarisRoot;
    const styles = path.join(polarisRoot, "styles.css");
    if (existsSync(styles)) {
      aliases["@wpdev/polaris-stack/styles.css"] = styles;
    }
  }
  return aliases;
}

/**
 * Merge react-compat + project package aliases for esbuild.
 *
 * @param {'preact'|'react'|string} [uiFramework]
 * @param {string} [cwd]
 * @returns {Record<string, string>}
 */
export function getBuildAliases(uiFramework = "preact", cwd = process.cwd()) {
  return {
    ...getReactAliases(uiFramework),
    ...getProjectAliases(cwd),
  };
}
