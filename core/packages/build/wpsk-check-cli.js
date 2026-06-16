#!/usr/bin/env node
/**
 * @wpsk/build — wpsk-check bin (Phase 23.B6).
 *
 * Thin CLI shim that delegates to `@core/utils`'s `checkProject`.
 * The actual check logic lives in `core/packages/utils/check.js`
 * (an internal workspace package) — we keep that package internal
 * (it is NOT in the 8-package publishable list) and expose the
 * `wpsk-check` bin from `@wpsk/build` instead, which is the
 * publishable package consumers install.
 *
 * Usage:
 *   $ wpsk-check
 *   Check passed.
 *   # or
 *   Check failed:
 *     - <reason>
 *
 * Exit codes:
 *   0 — all checks pass
 *   1 — at least one check failed
 */
import { fileURLToPath } from "node:url";
import { checkProject } from "@core/utils";

function runCheckCli() {
  let issues;
  try {
    issues = checkProject();
  } catch (e) {
    process.stderr.write(
      "Check error: " + (e && e.message ? e.message : e) + "\n",
    );
    process.exit(2);
  }

  if (!Array.isArray(issues)) {
    process.stderr.write(
      "Check error: checkProject() did not return an array\n",
    );
    process.exit(2);
  }

  if (issues.length > 0) {
    const msg = issues.join("\n  - ");
    process.stderr.write("Check failed:\n  - " + msg + "\n");
    process.exit(1);
  }

  process.stdout.write("Check passed.\n");
  process.exit(0);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runCheckCli();
}
