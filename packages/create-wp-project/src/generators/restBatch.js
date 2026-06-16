/**
 * @wpsk/create-wp-project — restBatch generator (Phase 21).
 *
 * REST batch + `@wpsk/fetch` JS client. The PHP-side batch
 * support ships with the core (RestSetup is in src/Support),
 * so this generator ONLY owns the JS wiring — the `@wpsk/fetch`
 * package dep merged into the consumer's `package.json`.
 *
 * Two gates:
 *  - restBatch === "on"
 *  - js !== "none"  (the registry filter applies; we still
 *                   early-return for defence in depth)
 */

import { getDepVersions } from "../dep-versions.js";

export function run(ctx) {
  if (ctx.features.restBatch !== "on") {
    return { files: {}, dirs: [], deps: {}, devDeps: {} };
  }
  if (ctx.features.js === "none") {
    return { files: {}, dirs: [], deps: {}, devDeps: {} };
  }
  const kitVersions = getDepVersions();
  const fetchVersion = kitVersions.get("@wpsk/fetch") || "*";
  const version =
    fetchVersion.startsWith("^") || fetchVersion === "*"
      ? fetchVersion
      : `^${fetchVersion}`;
  return {
    files: {},
    dirs: [],
    deps: {
      "@wpsk/fetch": version,
    },
    devDeps: {},
  };
}

export const descriptor = {
  id: "restBatch",
  feature: "restBatch",
  owns: ["src/Modules/RestBatch/**"],
  run,
};
