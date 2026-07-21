/**
 * @wpdev/create-wp-project — faultTolerance generator.
 *
 * When `faultTolerance:on`, wires `wpdev/php-fault-tolerance` into the
 * consumer project. The package is dual-mode:
 *   PHP >= 8.1 → full Real implementation
 *   PHP <  8.1 → Stub no-op wrappers (same API)
 * so phpMinVersion may be 7.4 without skipping install.
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

\`composer.json\` requires \`wpdev/php-fault-tolerance\` (PHP ≥ 7.4).
Run \`composer install\` after scaffolding.

## Runtime behaviour

| PHP version | Mode | Behaviour |
|-------------|------|-----------|
| ≥ 8.1 | **Real** | Circuit breaker, retries, HTTP pool/batch |
| < 8.1 | **Stub** | Same API; no-op / single-shot / sequential HTTP |

Check: \`wpdev_fault_tolerance_is_active()\` → true only on Real.

## Usage

\`\`\`php
use WPDev\\FaultTolerance\\FaultTolerance;

// Safe on all supported PHP versions (Real on 8.1+, Stub below):
FaultTolerance::resilient(static function () {
    return 'ok';
});
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
