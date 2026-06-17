/**
 * Built-in validation rule runners for WDForm.
 */

const DEFAULT_MESSAGES = {
  required: "This field is required",
  minLength: "Value is too short",
  maxLength: "Value is too long",
  min: "Value is too small",
  max: "Value is too large",
  pattern: "Value format is invalid",
  custom: "Invalid value",
};

function isEmptyValue(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

/**
 * @param {*} value
 * @param {Record<string, *>} rule
 * @param {Record<string, *>} allValues
 * @returns {string|null}
 */
export function validateFieldSync(value, rule = {}, allValues = {}) {
  if (!rule || typeof rule !== "object") return null;

  const message = (key) => rule.message || DEFAULT_MESSAGES[key];

  if (rule.required && isEmptyValue(value)) {
    return message("required");
  }

  if (isEmptyValue(value)) {
    return null;
  }

  if (typeof value === "string") {
    if (rule.minLength != null && value.length < rule.minLength) {
      return message("minLength");
    }
    if (rule.maxLength != null && value.length > rule.maxLength) {
      return message("maxLength");
    }
  }

  const numeric =
    typeof value === "number" ? value : Number.parseFloat(String(value));

  if (!Number.isNaN(numeric)) {
    if (rule.min != null && numeric < rule.min) return message("min");
    if (rule.max != null && numeric > rule.max) return message("max");
  }

  if (rule.pattern && !rule.pattern.test(String(value))) {
    return message("pattern");
  }

  if (typeof rule.custom === "function") {
    const result = rule.custom(value, allValues);
    if (result !== true && result != null) {
      return typeof result === "string" ? result : message("custom");
    }
  }

  return null;
}

/**
 * @param {Record<string, *>} values
 * @param {Record<string, Record<string, *>>} rules
 * @param {string[]} [onlyFields]
 * @returns {Promise<Record<string, string|null>>}
 */
export async function validateAll(values, rules = {}, onlyFields = null) {
  const names =
    onlyFields ??
    Object.keys({
      ...values,
      ...rules,
    });

  /** @type {Record<string, string|null>} */
  const nextErrors = {};

  for (const name of names) {
    const rule = rules[name];
    if (!rule) {
      nextErrors[name] = null;
      continue;
    }

    let error = validateFieldSync(values[name], rule, values);
    if (!error && typeof rule.asyncCustom === "function") {
      const asyncResult = await rule.asyncCustom(values[name], values);
      if (asyncResult !== true) {
        error =
          typeof asyncResult === "string"
            ? asyncResult
            : rule.message || DEFAULT_MESSAGES.pattern;
      }
    }
    nextErrors[name] = error;
  }

  return nextErrors;
}

/**
 * Collect dependent fields that must re-validate when `name` changes.
 *
 * @param {string} changedName
 * @param {Record<string, Record<string, *>>} rules
 * @returns {string[]}
 */
export function getDependentFields(changedName, rules = {}) {
  const deps = [changedName];
  for (const [field, rule] of Object.entries(rules)) {
    if (Array.isArray(rule?.deps) && rule.deps.includes(changedName)) {
      deps.push(field);
    }
  }
  return [...new Set(deps)];
}

/**
 * Infer lightweight input hints from an initial value shape.
 *
 * @param {*} value
 * @returns {Record<string, *>}
 */
export function inferFieldHints(value) {
  if (typeof value === "number") {
    return { type: "number", inputMode: "numeric" };
  }
  if (typeof value === "boolean") {
    return { type: "checkbox" };
  }
  if (value instanceof Date) {
    return { type: "date" };
  }
  return { type: "text" };
}
