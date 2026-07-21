/**
 * @wpdev/create-wp-project — faultTolerance generator (Phase 25).
 *
 * When `faultTolerance:on` (and `phpMinVersion ≥ 8.1`, enforced by
 * `validateFeatureSet`), wires the optional `wpdev/php-fault-tolerance`
 * Composer package into the consumer project.
 */

export function run(ctx) {
  if (ctx.features.faultTolerance !== "on") {
    return { files: {}, dirs: [], deps: {}, devDeps: {} };
  }

  const tpl = ctx.vars || { ...ctx.answers, ...(ctx.cfg || {}) };
  // Optional local path only when the caller explicitly sets
  // faultTolerancePath (kit monorepo). Real consumers resolve the
  // package from Packagist/VCS — never default to ../packages/*.
  const pkgPath =
    typeof tpl.faultTolerancePath === "string"
      ? tpl.faultTolerancePath.trim()
      : "";

  /** @type {{ require: Record<string,string>, repositories?: object[] }} */
  const composerPatches = {
    require: {
      "wpdev/php-fault-tolerance": "*",
    },
  };
  if (pkgPath) {
    composerPatches.repositories = [
      {
        type: "path",
        url: pkgPath,
        options: { symlink: true },
      },
    ];
  }

  return {
    files: {
      "docs/fault-tolerance.md": `# Fault tolerance

This project has \`faultTolerance: on\`.

## Composer dependency

\`composer.json\` requires \`wpdev/php-fault-tolerance\` (PHP ≥ 8.1).
Run \`composer install\` after scaffolding.

## Usage

\`\`\`php
use WPDev\\FaultTolerance\\CircuitBreaker;
use WPDev\\FaultTolerance\\HttpClient;
use WPDev\\FaultTolerance\\FaultTolerance;
\`\`\`

See the kit doc \`docs/fault-tolerance.md\` for patterns.
`,
    },
    dirs: ["docs"],
    deps: {},
    devDeps: {},
    composerPatches,
  };
}

export const descriptor = {
  id: "faultTolerance",
  feature: "faultTolerance",
  owns: ["docs/fault-tolerance.md"],
  run,
};
