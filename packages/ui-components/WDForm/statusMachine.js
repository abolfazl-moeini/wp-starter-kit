/**
 * Submit lifecycle transitions for WDForm.
 */

export const WD_FORM_STATUSES = [
  "idle",
  "loading",
  "submitting",
  "success",
  "error",
];

/**
 * @param {string} current
 * @param {string} next
 * @returns {boolean}
 */
export function canTransitionStatus(current, next) {
  if (current === next) return true;
  if (next === "idle") return true;
  if (current === "idle" && (next === "loading" || next === "submitting")) {
    return true;
  }
  if (current === "loading" && next === "idle") return true;
  if (current === "submitting" && (next === "success" || next === "error")) {
    return true;
  }
  if ((current === "success" || current === "error") && next === "idle") {
    return true;
  }
  if (current === "success" && next === "submitting") return true;
  if (current === "error" && next === "submitting") return true;
  return false;
}

/**
 * @param {string} current
 * @param {string} next
 * @returns {string}
 */
export function transitionStatus(current, next) {
  if (!WD_FORM_STATUSES.includes(next)) {
    throw new Error(`Invalid WDForm status: ${next}`);
  }
  if (!canTransitionStatus(current, next)) {
    return current;
  }
  return next;
}
