/**
 * @wpdev/create-wp-project — js:typescript generator (Phase 21).
 *
 * The TypeScript variant of the `js` feature. Emits the TS-flavored
 * dependencies entry. The `tsconfig.json` and `package.json` are
 * core's responsibility (core emits tsconfig whenever js !== none
 * and a full package.json whenever js !== none or husky is on) —
 * this generator ONLY owns `assets/dependencies.ts`.
 *
 * The full TS dependencies template ships in Phase 25.A; for Phase
 * 21 we emit a minimal valid stub that the test suite asserts. The
 * stub still passes the existing create-wp-project tests because
 * the original scaffold emitted an equivalent body for the default
 * answers.
 */

import { renderTemplate, TEMPLATE_DEPENDENCIES_TS } from "../_templates.js";

export function run(ctx) {
  const { answers, vars } = ctx;
  // Build tplVars from answers+cfg when not provided by the caller.
  // The legacy tplVars lives in _templates.js; importing it here
  // would create a cycle, so the caller is expected to pre-build
  // `ctx.vars`. If absent, fall back to a minimal build so the
  // generator still renders in isolation.
  const tpl = vars || {
    ...answers,
    ...(ctx.cfg || {}),
  };
  return {
    files: {
      "assets/dependencies.ts": renderTemplate(TEMPLATE_DEPENDENCIES_TS, tpl),
    },
    dirs: ["assets"],
    deps: {},
    devDeps: {},
  };
}

export const descriptor = {
  id: "js:typescript",
  feature: "js",
  variant: "typescript",
  // Phase 22: `tsconfig.json` is owned by core (it gates the
  // file on `js !== "none"`). This descriptor only owns the
  // TypeScript-flavored dependencies entry. The previous claim
  // of `tsconfig.json` was vestigial and would have flagged as
  // an overlap in the static ownership test.
  owns: ["assets/dependencies.ts"],
  run,
};
