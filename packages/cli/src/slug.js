/**
 * Sanitize a raw string into a valid WordPress plugin slug.
 *
 * Rules (matching the kit's existing `validateAnswers` regex in
 * `packages/create-wp-project/src/index.js`):
 *   - Lowercase
 *   - First char is alphanumeric (a-z0-9)
 *   - Subsequent chars are alphanumeric or `-`
 *   - Multiple non-alphanumeric runs collapse to a single `-`
 *   - Leading and trailing `-` are stripped
 *   - Empty / all-punctuation input returns `""` (caller decides
 *     how to react — usually a validation error downstream)
 *
 * @param {string} raw
 * @returns {string}
 */
export function sanitizeSlug(raw) {
  if (typeof raw !== "string") return "";
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-") // any non-alnum run → "-"
    .replace(/^-+|-+$/g, ""); // strip leading/trailing dashes
}
