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