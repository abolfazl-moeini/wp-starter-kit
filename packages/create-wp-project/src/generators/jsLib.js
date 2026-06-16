/**
 * @wpsk/create-wp-project — jsLib generator (Phase 21).
 *
 * UI library selection (none / preact / react). The package.json
 * react/preact dependency block and project.config `uiFramework`
 * are refreshed via `refreshGlue` after manifest mutations; this
 * generator owns a small marker file so addFeature/removeFeature
 * can target the feature without claiming core-owned glue paths.
 */

const MARKER = ".wpsk/ui-framework";

export function run(ctx) {
  if (ctx.features.js === "none") {
    return { files: {}, dirs: [], deps: {}, devDeps: {} };
  }
  const lib = ctx.features.jsLib || "none";
  if (lib === "none") {
    return { files: {}, dirs: [], deps: {}, devDeps: {} };
  }
  return {
    files: {
      [MARKER]: `${lib}\n`,
    },
    dirs: [".wpsk"],
    deps: {},
    devDeps: {},
  };
}

export const descriptor = {
  id: "jsLib",
  feature: "jsLib",
  owns: [MARKER],
  run,
};
