/**
 * Map `features.jsLib` (+ legacy answers) to project.config `uiFramework`.
 *
 * plan.v3.md §1: jsLib controls the UI library. The CLI derives
 * answers.uiFramework before scaffold; the engine uses this helper
 * so direct `scaffoldProject` / addFeature / refreshGlue callers
 * stay consistent without duplicating the mapping.
 */

/**
 * @param {Record<string,string>|undefined} features
 * @param {{ uiFramework?: string }} [answers]
 * @returns {"preact"|"react"|null}
 */
export function deriveUiFramework(features, answers = {}) {
  const jsLib = features && features.jsLib;
  if (jsLib === "preact" || jsLib === "react") {
    return jsLib;
  }
  if (jsLib === "none") {
    if (answers.uiFramework === "preact" || answers.uiFramework === "react") {
      return answers.uiFramework;
    }
    return null;
  }
  if (answers.uiFramework === "preact" || answers.uiFramework === "react") {
    return answers.uiFramework;
  }
  return "preact";
}
