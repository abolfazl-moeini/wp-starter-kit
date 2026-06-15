/**
 * @wpsk/ui-components — flat-signal form store + MLForm Preact component.
 *
 * Refactored from `mrlogistic/assets/packages/ui-components/MLForm/MLForm.js`:
 * the source uses nested per-field signals (`signal({ weight: signal("") })`).
 * That pattern is non-standard and makes reads/writes awkward from non-Preact
 * callers. This implementation collapses the store into a SINGLE flat signal
 * holding a plain object, with named helpers for read/write/batch.
 *
 *   formStore  → signal({})           (the canonical store)
 *   formState  → signal({})           (metadata: _initialValues, changedInput, …)
 *
 *   setFormData(name, value)
 *   getFormData(name)             → value or undefined
 *   batchSetFormData({...})
 *   batchGetFormData()            → { [name]: value, ... }
 *   updateFormState(values, merge=true)
 *   resetFormData(defaults={})
 *
 * The actual `<MLForm>` Preact component lives in ./MLForm/MLForm.js and
 * consumes the store via these helpers. It is NOT exported here — the test
 * suite asserts the store API, not the component rendering.
 */
import { signal } from "@preact/signals";

/* ---------- The flat signal store -------------------------------------- */

export const formStore = signal({});
export const formState = signal({ _initialValues: {} });

/**
 * Write a single field.
 * @param {string} name
 * @param {*} value
 */
export function setFormData(name, value) {
  if (!name) return;
  formStore.value = { ...formStore.value, [name]: value };
}

/**
 * Read a single field.
 * @param {string} name
 * @returns {*|undefined}
 */
export function getFormData(name) {
  return formStore.value?.[name];
}

/**
 * Write many fields in a single signal mutation.
 * @param {Record<string, *>} values
 */
export function batchSetFormData(values = {}) {
  if (!values || typeof values !== "object") return;
  formStore.value = { ...formStore.value, ...values };
}

/**
 * Read all fields as a plain object snapshot.
 * @returns {Record<string, *>}
 */
export function batchGetFormData() {
  return { ...formStore.value };
}

/**
 * Update the metadata signal (e.g. `_initialValues`, `changedInput`).
 * @param {Record<string, *>} values
 * @param {boolean} [merge=true]  When false, replaces the metadata object.
 */
export function updateFormState(values, merge = true) {
  if (merge) {
    formState.value = { ...formState.value, ...values };
  } else {
    formState.value = { ...values };
  }
}

/**
 * Reset all form fields.
 *
 * - `defaults` is a `Record<string, *>` of name → value.
 * - Keys not present in `defaults` fall back to `formState.value._initialValues[name]`.
 * - Keys present in neither are reset to `""`.
 *
 * @param {Record<string, *>} [defaults]
 */
export function resetFormData(defaults = {}) {
  const initial = formState.value?._initialValues ?? {};
  const next = {};
  // Reset ALL known keys (existing + defaults) — don't leak unknown state.
  const allKeys = new Set([
    ...Object.keys(formStore.value),
    ...Object.keys(defaults),
  ]);
  for (const key of allKeys) {
    if (key in defaults) {
      next[key] = defaults[key];
    } else if (key in initial) {
      next[key] = initial[key];
    } else {
      next[key] = "";
    }
  }
  formStore.value = next;
}
