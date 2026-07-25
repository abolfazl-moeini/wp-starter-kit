import fs, { readFileSync } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { getOrgNameSync, readProjectConfig } from "@core/utils";

// @copyright https://raw.githubusercontent.com/WordPress/gutenberg/trunk/packages/dependency-extraction-webpack-plugin/lib/util.js

const WORDPRESS_NAMESPACE = "@wordpress/";

// Resolve INTERNAL_NAMESPACE synchronously at load time.
// Precedence:
//   1. project.config.json → npmScope (if file exists and field is set)
//   2. ROOT_NAME env var or root package.json name
//   3. Fallback: @wpdev/
// Build scripts should set `cross-env ROOT_NAME=$npm_package_name ...` (or equivalent) before importing.
export const INTERNAL_NAMESPACE = (() => {
  // Try project.config.json first (config-driven override)
  try {
    const config = readProjectConfig();
    if (config?.npmScope) {
      const scope = config.npmScope.startsWith("@")
        ? config.npmScope
        : `@${config.npmScope}`;
      return `${scope}/`;
    }
  } catch {
    // Config file doesn't exist or is invalid — fall through
  }

  // Fallback to org name from env or package.json
  try {
    return `@${getOrgNameSync()}/`;
  } catch (err) {
    // Safe fallback for development / placeholder package names.
    // Real builds must provide correct ROOT_NAME to get proper internal package filtering.
    if (process.env.NODE_ENV !== "test") {
      console.warn(
        "[dependency-extraction-esbuild-plugin] INTERNAL_NAMESPACE fallback used (@wpdev/). Set ROOT_NAME env for correct org.",
      );
    }
    return "@wpdev/";
  }
})();

// !!
// This list must be kept in sync with the same list in tools/webpack/packages.js
// !!
const BUNDLED_PACKAGES = [
  "@wordpress/dataviews",
  "@wordpress/dataviews/wp",
  "@wordpress/icons",
  "@wordpress/interface",
  "@wordpress/sync",
  "@wordpress/undo-manager",
  "@wordpress/upload-media",
  "@wordpress/fields",
];

/**
 * Cached project `uiFramework` (`preact` | `react`).
 * Null until first resolve. Use {@link __setUiFrameworkForTests} in unit tests.
 * @type {'preact'|'react'|null}
 */
let uiFrameworkCache = null;

/**
 * Resolve project UI framework for extraction maps.
 * Defaults to `preact` (kit default) when config is missing.
 *
 * @returns {'preact'|'react'}
 */
export function resolveUiFramework() {
  if (uiFrameworkCache === "preact" || uiFrameworkCache === "react") {
    return uiFrameworkCache;
  }
  if (
    process.env.WPDEV_UI_FRAMEWORK === "preact" ||
    process.env.WPDEV_UI_FRAMEWORK === "react"
  ) {
    uiFrameworkCache = process.env.WPDEV_UI_FRAMEWORK;
    return uiFrameworkCache;
  }
  try {
    const config = readProjectConfig();
    uiFrameworkCache = config?.uiFramework === "react" ? "react" : "preact";
  } catch {
    uiFrameworkCache = "preact";
  }
  return uiFrameworkCache;
}

/**
 * True when shared Preact vendor should back `react` / `react-dom` imports.
 * @returns {boolean}
 */
export function usesPreactVendor() {
  return resolveUiFramework() !== "react";
}

/**
 * Test-only: pin or reset cached uiFramework (null clears cache).
 * @param {'preact'|'react'|null} value
 */
export function __setUiFrameworkForTests(value) {
  uiFrameworkCache = value;
}

/**
 * Default request to global transformation
 *
 * Transform @wordpress dependencies:
 * - request `@wordpress/api-fetch` becomes `[ 'wp', 'apiFetch' ]`
 * - request `@wordpress/i18n` becomes `[ 'wp', 'i18n' ]`
 *
 * When `uiFramework` is `preact`, bare `react` / `react-dom` / jsx-runtime
 * map to the shared Preact vendor globals (importAsGlobals intercepts before
 * esbuild aliases can rewrite paths).
 *
 * @param {string} request Module request (the module name in `import from`) to be transformed
 * @return {string|string[]|undefined} The resulting external definition. Return `undefined`
 *   to ignore the request. Return `string|string[]` to map the request to an external.
 */
export function defaultRequestToExternal(request) {
  const preactMode = usesPreactVendor();

  switch (request) {
    case "moment":
      return request;

    case "@babel/runtime/regenerator":
      return "regeneratorRuntime";

    case "lodash":
    case "lodash-es":
      return "lodash";

    case "jquery":
      return "jQuery";

    case "react":
      // Preact mode: compat global from assets/bundles/preact.js (not WP React).
      return preactMode ? "preactCompat" : "React";

    case "react-dom":
      return preactMode ? "preactCompat" : "ReactDOM";

    case "react/jsx-runtime":
    case "react/jsx-dev-runtime":
      return preactMode ? "preactJsxRuntime" : "ReactJSXRuntime";

    // Shared Preact vendor (handle: preact) — not shipped by WordPress core.
    case "preact":
      return "preact";

    case "preact/hooks":
      return "preactHooks";

    case "preact/compat":
      return "preactCompat";

    case "preact/jsx-runtime":
    case "preact/jsx-dev-runtime":
      return "preactJsxRuntime";
  }

  if (request.includes("react-refresh/runtime")) {
    return "ReactRefreshRuntime";
  }

  if (BUNDLED_PACKAGES.includes(request)) {
    return undefined;
  }

  if (request.startsWith(WORDPRESS_NAMESPACE)) {
    return ["wp", camelCaseDash(request.substring(WORDPRESS_NAMESPACE.length))];
  }
}

/**
 * Default request to WordPress script handle transformation
 *
 * Transform @wordpress dependencies:
 * - request `@wordpress/i18n` becomes `wp-i18n`
 * - request `@wordpress/escape-html` becomes `wp-escape-html`
 *
 * @param {string} request Module request (the module name in `import from`) to be transformed
 * @return {string|undefined} WordPress script handle to map the request to. Return `undefined`
 *   to use the same name as the module.
 */
export function defaultRequestToHandle(request) {
  const preactMode = usesPreactVendor();

  switch (request) {
    case "@babel/runtime/regenerator":
      return "wp-polyfill";

    case "lodash-es":
      return "lodash";

    // WordPress core script handles (script-loader.php) — or shared preact.
    case "react":
      return preactMode ? "preact" : "react";

    case "react-dom":
      return preactMode ? "preact" : "react-dom";

    case "react/jsx-runtime":
    case "react/jsx-dev-runtime":
      return preactMode ? "preact" : "react-jsx-runtime";

    // Local shared vendor — register once as handle "preact".
    case "preact":
    case "preact/hooks":
    case "preact/compat":
    case "preact/jsx-runtime":
    case "preact/jsx-dev-runtime":
      return "preact";
  }

  if (request.includes("react-refresh/runtime")) {
    return "wp-react-refresh-runtime";
  }

  if (request.startsWith(WORDPRESS_NAMESPACE)) {
    return "wp-" + request.substring(WORDPRESS_NAMESPACE.length);
  }
}

/**
 * Given a string, returns a new string with dash separators converted to
 * camelCase equivalent. This is not as aggressive as `_.camelCase` in
 * converting to uppercase, where Lodash will also capitalize letters
 * following numbers.
 *
 * @param {string} string Input dash-delimited string.
 * @return {string} Camel-cased string.
 */
export function camelCaseDash(string) {
  return string.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

export function onlyUnique(value, index, array) {
  return array.indexOf(value) === index;
}

export function writeFile(filePath, content) {
  return new Promise((resolve, reject) => {
    fs.writeFile(filePath, content, (error) => {
      error ? reject(error) : resolve(filePath);
    });
  });
}

export function assetFilePath(assetFilePath) {
  const dirName = path.dirname(assetFilePath);
  const basenameInfo = path.basename(assetFilePath).match(/(.+)\.(?:js|css)$/);

  return path.join(dirName, `${basenameInfo[1]}.asset.php`);
}

export function internalRequestToHandle(request) {
  if (request.startsWith(INTERNAL_NAMESPACE)) {
    return request.substring(INTERNAL_NAMESPACE.length);
  }
}

export function filterInternalRootPackages(packages) {
  const org = INTERNAL_NAMESPACE.replace(/^@/, "").replace(/\/$/, "");

  // Escape special regex chars in org name
  const escaped = org.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`@${escaped}/([^/]+)`);

  return packages
    .map((packageName) => {
      const matched = packageName.match(re);
      return matched ? matched[1] : null;
    })
    .filter(Boolean)
    .filter(onlyUnique);
}

export function generateChecksum(str, algorithm, encoding) {
  return crypto
    .createHash(algorithm || "md5")
    .update(str, "utf8")
    .digest(encoding || "hex");
}

export function fileCheckSum(filePath) {
  const data = readFileSync(filePath);

  return generateChecksum(data.toString());
}
