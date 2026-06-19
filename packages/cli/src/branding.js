/**
 * Branding defaults and derived answer fields for `wpdev create`.
 */

import { sanitizeSlug } from "./slug.js";

/**
 * @param {string} slug
 * @returns {string}
 */
export function slugToGlobalName(slug) {
  if (!slug || typeof slug !== "string") return "MyPlugin";
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

/**
 * @param {string} slug
 * @returns {string}
 */
export function slugToPhpFunctionPrefix(slug) {
  if (!slug || typeof slug !== "string") {
    return "my_plugin_";
  }
  return slug.replace(/-/g, "_") + "_";
}

/**
 * @param {string} dirBasename
 * @returns {{
 *   slug: string,
 *   textDomain: string,
 *   globalName: string,
 *   phpFunctionPrefix: string,
 *   npmScope: string,
 * }}
 */
export function deriveBrandingDefaults(dirBasename) {
  const slug = sanitizeSlug(dirBasename) || "my-plugin";
  return {
    slug,
    textDomain: slug,
    globalName: slugToGlobalName(slug),
    phpFunctionPrefix: slugToPhpFunctionPrefix(slug),
    npmScope: slug,
  };
}

/**
 * @param {object} state
 * @param {{ applyPreset?: (name: string) => Record<string, string> }} [engine]
 * @returns {boolean}
 */
export function needsGlobalNamePrompt(state, engine) {
  const preset = state?.runOptions?.preset;
  const eng = engine || {};
  if (preset && preset !== "custom" && typeof eng.applyPreset === "function") {
    const presetFeatures = eng.applyPreset(preset);
    if (presetFeatures?.js === "none") return false;
  }
  if (state?.features?.js === "none") return false;
  return true;
}

/**
 * Fill branding fields that are not prompted (hookPrefix) or that
 * should default when left empty (globalName for PHP-only, etc.).
 *
 * @param {Record<string, string>} answers
 */
export function fillDerivedBranding(answers) {
  if (!answers || typeof answers !== "object") return;

  const slug = answers.slug;
  if (slug && !answers.textDomain) {
    answers.textDomain = slug;
  }
  if (slug && !answers.globalName) {
    answers.globalName = slugToGlobalName(slug);
  }
  if (slug && !answers.npmScope) {
    answers.npmScope = slug;
  }
  if (answers.npmScope && !answers.hookPrefix) {
    answers.hookPrefix = answers.npmScope;
  }
  if (slug && !answers.phpFunctionPrefix) {
    answers.phpFunctionPrefix = slugToPhpFunctionPrefix(slug);
  }
}
