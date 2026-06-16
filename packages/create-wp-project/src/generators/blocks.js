/**
 * @wpsk/create-wp-project — blocks generator (Phase 21).
 *
 * Gutenberg block support. Emits the `src/Modules/Blocks/`
 * skeleton (block.json + Module.php + index.ts entry stub)
 * when the feature is on. The full block templates land in
 * Phase 25 (the kit's own `src/Modules/Blocks/` is the
 * reference — the generator emits a minimal version that
 * compiles out of the box but lacks the full block.json
 * schema and the rendered.tsx output).
 *
 * Three gates:
 *  - blocks === "on"
 *  - js !== "none"
 *  - wpMinVersion ≥ 5.8
 * All three are enforced by the registry filter; the
 * early-return here is defence in depth.
 */

export function run(ctx) {
  if (ctx.features.blocks !== "on") {
    return { files: {}, dirs: [], deps: {}, devDeps: {} };
  }
  if (ctx.features.js === "none") {
    return { files: {}, dirs: [], deps: {}, devDeps: {} };
  }
  const tpl = ctx.vars || { ...ctx.answers, ...(ctx.cfg || {}) };
  const namespace = tpl.vendor || "WPSK";
  return {
    files: {
      "src/Modules/Blocks/block.json":
        JSON.stringify(
          {
            $schema: "https://schemas.wp.org/trunk/block.json",
            apiVersion: 3,
            name: `${namespace.toLowerCase()}/${tpl.slug}-example-block`,
            version: "0.1.0",
            title: `${tpl.globalName} Example Block`,
            category: "widgets",
            icon: "smiley",
            description: `Example Gutenberg block for ${tpl.globalName}.`,
            textdomain: tpl.textDomain || tpl.slug,
            editorScript: "file:./index.ts",
          },
          null,
          2,
        ) + "\n",
      "src/Modules/Blocks/Module.php": `<?php
declare(strict_types=1);

namespace ${namespace}\\Modules\\Blocks;

use ${namespace}\\Core\\ModuleInterface;

final class Module implements ModuleInterface
{
    public function get_slug(): string
    {
        return 'blocks';
    }

    public function boot(): void
    {
        add_action('init', [self::class, 'register_blocks']);
    }

    public static function register_blocks(): void
    {
        $dir = __DIR__;
        if (function_exists('register_block_type_from_metadata')) {
            register_block_type_from_metadata($dir . '/block.json');
        }
    }
}
`,
      "src/Modules/Blocks/index.ts": `/**
 * {{globalName}} — example Gutenberg block entry.
 *
 * Phase 21 stub. Phase 25 fills in the full block.json wiring
 * + the rendered TSX.
 */

import { registerBlockType } from '@wordpress/blocks';
import metadata from './block.json';

registerBlockType(metadata.name, {
  edit: () => null,
  save: () => null,
});
`,
    },
    dirs: ["src/Modules/Blocks"],
    deps: {},
    devDeps: {},
  };
}

export const descriptor = {
  id: "blocks",
  feature: "blocks",
  owns: ["src/Modules/Blocks/**"],
  run,
};
