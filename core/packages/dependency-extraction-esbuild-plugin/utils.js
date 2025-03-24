import fs from "node:fs";
import path from "node:path";
import { readFileSync } from "node:fs";
import crypto from "node:crypto";
import { getOrgName } from '@core/utils';

// @copyright https://raw.githubusercontent.com/WordPress/gutenberg/trunk/packages/dependency-extraction-webpack-plugin/lib/util.js

const WORDPRESS_NAMESPACE = "@wordpress/";
const INTERNAL_NAMESPACE = `@${getOrgName()}/`;

// !!
// This list must be kept in sync with the same list in tools/webpack/packages.js
// !!
const BUNDLED_PACKAGES = [
  '@wordpress/dataviews',
  '@wordpress/dataviews/wp',
  '@wordpress/icons',
  '@wordpress/interface',
  '@wordpress/sync',
  '@wordpress/undo-manager',
  '@wordpress/upload-media',
  '@wordpress/fields',
];

/**
 * Default request to global transformation
 *
 * Transform @wordpress dependencies:
 * - request `@wordpress/api-fetch` becomes `[ 'wp', 'apiFetch' ]`
 * - request `@wordpress/i18n` becomes `[ 'wp', 'i18n' ]`
 *
 * @param {string} request Module request (the module name in `import from`) to be transformed
 * @return {string|string[]|undefined} The resulting external definition. Return `undefined`
 *   to ignore the request. Return `string|string[]` to map the request to an external.
 */
export function defaultRequestToExternal(request) {
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
      return "React";

    case "react-dom":
      return "ReactDOM";

    case 'react/jsx-runtime':
    case 'react/jsx-dev-runtime':
      return 'ReactJSXRuntime';
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
  switch (request) {
    case "@babel/runtime/regenerator":
      return "wp-polyfill";

    case "lodash-es":
      return "lodash";
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
  return packages
    .map((packageName) => {
      const matched = packageName.match(/@moeini\/([^\/]+)/);

      return matched[1] ?? "";
    })
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
