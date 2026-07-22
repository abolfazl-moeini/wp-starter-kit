/**
 * @wpdev/create-wp-project — faultTolerance generator.
 *
 * When `faultTolerance:on`, vendors `wpdev/php-fault-tolerance` into
 * `packages/php-fault-tolerance/` and wires Composer path-repo install with
 * `symlink: false` (same pattern as plugin-core-test). The package is dual-mode:
 *   PHP >= 8.1 → full Real implementation
 *   PHP <  8.1 → Stub no-op wrappers (same API)
 * so phpMinVersion may be 7.4 without skipping install.
 */

import { phpFaultTolerancePackageFiles } from "./_php-fault-tolerance-template.js";

const PACKAGE_PREFIX = "packages/php-fault-tolerance/";

export function run(ctx) {
  if (ctx.features.faultTolerance !== "on") {
    return { files: {}, dirs: [], deps: {}, devDeps: {} };
  }

  /** @type {Record<string, string>} */
  const files = {
    "docs/fault-tolerance.md": `# Fault tolerance

This project has \`faultTolerance: on\`.

## Composer dependency

\`composer.json\` requires \`wpdev/php-fault-tolerance\` from the local path
package under \`packages/php-fault-tolerance/\` (\`symlink: false\`).
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
  };

  for (const [rel, body] of Object.entries(phpFaultTolerancePackageFiles())) {
    files[`${PACKAGE_PREFIX}${rel}`] = body;
  }

  return {
    files,
    dirs: ["docs", "packages/php-fault-tolerance"],
    deps: {},
    devDeps: {},
    composerPatches: {
      repositories: [
        {
          type: "path",
          url: "packages/*",
          options: {
            monorepo: true,
            symlink: false,
          },
        },
      ],
      require: {
        "wpdev/php-fault-tolerance": "*",
      },
    },
  };
}

export const descriptor = {
  id: "faultTolerance",
  feature: "faultTolerance",
  owns: ["docs/fault-tolerance.md", "packages/php-fault-tolerance/**"],
  run,
};
