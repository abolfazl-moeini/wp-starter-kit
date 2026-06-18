/**
 * @wpdev/create-wp-project — generator registry (Phase 21).
 *
 * The registry is the central dispatch from a feature set to a
 * list of enabled generator descriptors. The scaffold uses
 * `getGenerators(features)` to decide which generators to run;
 * each generator is a small ES module exporting `run(ctx)` plus
 * a descriptor with `{ id, feature, owns, run }`.
 *
 * Three contracts are locked:
 *
 *  1. `getGenerators(features)` returns the enabled descriptors
 *     in a stable order (core first, then the js variant that
 *     matches `features.js`, then every toggle whose gate is
 *     open). Toggles are returned in catalog order so a scaffold
 *     output is deterministic.
 *
 *  2. `listGenerators()` returns EVERY registered generator
 *     (including the disabled ones). Phase 22's `addFeature`
 *     uses this to look up a generator by id+variant without
 *     needing to re-evaluate gates.
 *
 *  3. `findGenerator(id)` is a convenience lookup over the
 *     full catalog. Returns null for an unknown id.
 *
 * The registry NEVER mutates the `features` argument. Tests
 * can call `getGenerators(defaultFeatures())` and then mutate
 * the result without leaking into the next call.
 */

import { descriptor as core } from "./core.js";
import { descriptor as jsTypescript } from "./js/typescript.js";
import { descriptor as jsPure } from "./js/pure.js";
import { descriptor as jsFlow } from "./js/flow.js";
import { descriptor as husky } from "./husky.js";
import { descriptor as vendorScoping } from "./vendorScoping.js";
import { descriptor as exampleFeature } from "./exampleFeature.js";
import { descriptor as restBatch } from "./restBatch.js";
import { descriptor as i18n } from "./i18n.js";
import { descriptor as phpTest } from "./phpTest.js";
import { descriptor as license } from "./license.js";
import { descriptor as blocks } from "./blocks.js";
import { descriptor as css } from "./css.js";
import { descriptor as jsTest } from "./jsTest.js";
import { descriptor as jsLib } from "./jsLib.js";
import { descriptor as phpFramework } from "./phpFramework.js";
import { descriptor as ci } from "./ci.js";
import { descriptor as faultTolerance } from "./faultTolerance.js";
import { descriptor as frontendStack } from "./frontendStack.js";
import { descriptor as mcpAbilities } from "./mcpAbilities.js";

/* -------------------------------------------------------------------- */
/* Full catalog                                                          */
/* -------------------------------------------------------------------- */

/**
 * Every registered generator, in deterministic catalog order.
 * The order is part of the public contract — the scaffold writes
 * files in this order (modulo the enabled-filter) so two runs of
 * `getGenerators(defaultFeatures())` produce the same file list.
 */
const ALL = [
  core,
  jsTypescript,
  jsPure,
  jsFlow,
  husky,
  vendorScoping,
  exampleFeature,
  restBatch,
  i18n,
  phpTest,
  license,
  blocks,
  css,
  jsTest,
  jsLib,
  phpFramework,
  ci,
  faultTolerance,
  frontendStack,
  mcpAbilities,
];

/* -------------------------------------------------------------------- */
/* Public API                                                            */
/* -------------------------------------------------------------------- */

/**
 * Return the full list of registered generators (every id+variant
 * known to the registry, regardless of whether the current feature
 * set enables it). Phase 22's `addFeature` reads from this list.
 *
 * @returns {GeneratorDescriptor[]}
 */
export function listGenerators() {
  return ALL.slice();
}

/**
 * Look up a generator by id+variant key (e.g. "core", "js:typescript",
 * "husky"). Returns `null` when the id is not in the catalog.
 *
 * @param {string} id
 * @returns {GeneratorDescriptor|null}
 */
export function findGenerator(id) {
  for (const g of ALL) {
    if (g.id === id) return g;
  }
  return null;
}

/**
 * Return the enabled generators for a given feature set.
 *
 * The filter is:
 *  - core                  always on
 *  - js:{variant}          enabled iff `features.js === variant`
 *  - husky                 enabled iff `features.husky === "on"`
 *  - vendorScoping         enabled iff `features.vendorScoping === "on"`
 *  - exampleFeature        enabled iff `features.exampleFeature === "on"`
 *  - restBatch             enabled iff `features.restBatch === "on"`
 *                          AND `features.js !== "none"` (JS-half gate)
 *  - i18n                  enabled iff `features.i18n === "on"`
 *  - phpTest               enabled iff `features.phpTest === "phpunit"`
 *  - license               enabled iff `features.license` is truthy
 *                          (every license variant in the catalog is
 *                          a real license — there's no "off" value)
 *  - blocks                enabled iff `features.blocks === "on"`
 *  - css                   enabled iff `features.css !== "none"`
 *                          AND `features.js !== "none"`
 *
 * @param {Record<string,string>|null|undefined} features
 * @returns {GeneratorDescriptor[]}
 */
/**
 * Return the `owns` globs for a feature at a given variant.
 *
 * @param {string} id
 * @param {string} variant
 * @returns {string[]}
 */
export function getOwnedPathsForFeature(id, variant) {
  const out = [];
  for (const g of ALL) {
    if (g.feature !== id) continue;
    if (g.variant !== undefined && g.variant !== variant) continue;
    if (g.owns) out.push(...g.owns);
  }
  return out;
}

export function getGenerators(features) {
  const f = features || {};
  const js = f.js || "none";
  const jsEnabled = js !== "none";

  const enabled = [];
  for (const g of ALL) {
    if (g.id === "core") {
      enabled.push(g);
      continue;
    }
    if (g.id === "js:typescript" && js === "typescript") enabled.push(g);
    else if (g.id === "js:pure" && js === "pure") enabled.push(g);
    else if (g.id === "js:flow" && js === "flow") enabled.push(g);
    else if (g.id === "husky" && f.husky === "on") enabled.push(g);
    else if (g.id === "vendorScoping" && f.vendorScoping === "on")
      enabled.push(g);
    else if (g.id === "exampleFeature" && f.exampleFeature === "on")
      enabled.push(g);
    else if (g.id === "restBatch" && f.restBatch === "on" && jsEnabled)
      enabled.push(g);
    else if (g.id === "i18n" && f.i18n === "on") enabled.push(g);
    else if (g.id === "phpTest" && f.phpTest === "phpunit") enabled.push(g);
    else if (g.id === "license" && f.license) enabled.push(g);
    else if (g.id === "blocks" && f.blocks === "on") enabled.push(g);
    else if (g.id === "css" && f.css && f.css !== "none" && jsEnabled)
      enabled.push(g);
    else if (g.id === "jsTest" && f.jsTest && f.jsTest !== "none" && jsEnabled)
      enabled.push(g);
    else if (g.id === "jsLib" && jsEnabled && f.jsLib && f.jsLib !== "none")
      enabled.push(g);
    else if (g.id === "phpFramework" && f.phpFramework === "wpdev")
      enabled.push(g);
    else if (
      g.id === "ci" &&
      f.ci !== "off" &&
      (f.phpTest === "phpunit" || (f.jsTest && f.jsTest !== "none"))
    )
      enabled.push(g);
    else if (g.id === "faultTolerance" && f.faultTolerance === "on")
      enabled.push(g);
    else if (g.id === "frontendStack" && f["frontendStack"] === "polaris")
      enabled.push(g);
    else if (g.id === "mcpAbilities" && f.mcpAbilities === "on")
      enabled.push(g);
  }
  return enabled;
}

/* -------------------------------------------------------------------- */
/* Public type re-export (typed as JSDoc typedef for downstream callers) */
/* -------------------------------------------------------------------- */

/**
 * @typedef {Object} GeneratorDescriptor
 * @property {string} id          Stable registry id (e.g. "core",
 *                               "js:typescript", "husky").
 * @property {string|null} feature  Feature id this generator is
 *                                 gated on (null for the always-on
 *                                 core).
 * @property {string[]} owns      Paths/globs the generator may
 *                                 overwrite. Empty in Phase 21;
 *                                 Phase 22 wires the additive-
 *                                 safety check.
 * @property {(ctx: GeneratorContext) => GeneratorContribution} run
 *                               Generator function. Pure: takes a
 *                               ctx, returns the file set to
 *                               contribute.
 */

/**
 * @typedef {Object} GeneratorContext
 * @property {Object} answers  The ScaffoldAnswers.
 * @property {Object} cfg      The answersToProjectConfig() result.
 * @property {Object} features The validated feature set.
 * @property {Object} [vars]   Pre-built tplVars (optional; the
 *                             generator builds it from answers+cfg
 *                             if not provided).
 */

/**
 * @typedef {Object} GeneratorContribution
 * @property {Record<string,string>} files  Path → file body.
 * @property {string[]} [dirs]              Dirs to ensure exist
 *                                          (defensive — the scaffold
 *                                          mkdir's parents anyway).
 * @property {Record<string,string>} [deps]    npm dependencies to
 *                                              install (informational;
 *                                              Phase 22 reads these).
 * @property {Record<string,string>} [devDeps] npm devDependencies.
 */
