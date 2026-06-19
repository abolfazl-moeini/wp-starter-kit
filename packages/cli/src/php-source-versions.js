/**
 * Dynamic PHP source version options for the create prompt.
 */

export const FALLBACK_PHP_SOURCE_VERSIONS = [
  "7.4",
  "8.0",
  "8.1",
  "8.2",
  "8.3",
  "8.4",
  "8.5",
];

const ORDERED_PHP_MINORS = [...FALLBACK_PHP_SOURCE_VERSIONS];

const WP_HAPPY_URL =
  "https://api.wordpress.org/core/serve-happy/1.0/?php_version=7.4";
const PHP_ACTIVE_URL = "https://www.php.net/releases/active.php";

/**
 * @param {string} version
 * @returns {string}
 */
export function normalizePhpMinor(version) {
  if (!version || typeof version !== "string") return "";
  const m = version.trim().match(/^(\d+)\.(\d+)/);
  return m ? `${m[1]}.${m[2]}` : "";
}

/**
 * @param {string} minVersion
 * @param {string} maxVersion
 * @returns {string[]}
 */
export function buildPhpSourceVersionRange(minVersion, maxVersion) {
  const min = normalizePhpMinor(minVersion);
  const max = normalizePhpMinor(maxVersion);
  const minIdx = ORDERED_PHP_MINORS.indexOf(min);
  const maxIdx = ORDERED_PHP_MINORS.indexOf(max);
  if (minIdx < 0 || maxIdx < 0 || minIdx > maxIdx) {
    return [...FALLBACK_PHP_SOURCE_VERSIONS];
  }
  return ORDERED_PHP_MINORS.slice(minIdx, maxIdx + 1);
}

/**
 * @param {Record<string, Record<string, unknown>>} activeJson
 * @returns {string}
 */
export function parseActivePhpMaxVersion(activeJson) {
  const branch = activeJson?.["8"];
  if (!branch || typeof branch !== "object") {
    return FALLBACK_PHP_SOURCE_VERSIONS.at(-1) || "8.5";
  }
  const versions = Object.keys(branch)
    .map(normalizePhpMinor)
    .filter(Boolean)
    .sort(
      (a, b) => ORDERED_PHP_MINORS.indexOf(a) - ORDERED_PHP_MINORS.indexOf(b),
    );
  return versions.at(-1) || FALLBACK_PHP_SOURCE_VERSIONS.at(-1) || "8.5";
}

/**
 * @param {string[]} versions
 * @returns {Array<{label: string, value: string}>}
 */
export function toPhpSourceVersionSelectOptions(versions) {
  const opts = versions.map((v) => ({ label: v, value: v }));
  opts.push({ label: "Other (type a version)", value: "__other__" });
  return opts;
}

/**
 * @param {object} [deps]
 * @param {typeof fetch} [deps.fetch]
 * @returns {Promise<{
 *   versions: string[],
 *   defaultVersion: string,
 *   options: Array<{label: string, value: string}>,
 * }>}
 */
export async function fetchPhpSourceVersionOptions(deps = {}) {
  const fetchFn = deps.fetch || globalThis.fetch;
  const fallbackDefault = FALLBACK_PHP_SOURCE_VERSIONS[0] || "7.4";

  const fallback = () => {
    const versions = [...FALLBACK_PHP_SOURCE_VERSIONS];
    return {
      versions,
      defaultVersion: fallbackDefault,
      options: toPhpSourceVersionSelectOptions(versions),
    };
  };

  if (typeof fetchFn !== "function") {
    return fallback();
  }

  try {
    const [happyRes, activeRes] = await Promise.all([
      fetchFn(WP_HAPPY_URL),
      fetchFn(PHP_ACTIVE_URL),
    ]);
    if (!happyRes?.ok || !activeRes?.ok) {
      return fallback();
    }

    const happy = await happyRes.json();
    const active = await activeRes.json();
    const min = normalizePhpMinor(happy?.minimum_version) || "7.4";
    const max = parseActivePhpMaxVersion(active);
    const versions = buildPhpSourceVersionRange(min, max);
    const defaultVersion = versions.includes(min)
      ? min
      : versions[0] || fallbackDefault;

    return {
      versions,
      defaultVersion,
      options: toPhpSourceVersionSelectOptions(versions),
    };
  } catch {
    return fallback();
  }
}

/**
 * @param {string} version
 * @returns {string|undefined}
 */
export function validatePhpSourceVersionInput(version) {
  const v = normalizePhpMinor(version);
  if (!v || !/^\d+\.\d+$/.test(v)) {
    return "Enter a PHP version like 8.2";
  }
  return undefined;
}
