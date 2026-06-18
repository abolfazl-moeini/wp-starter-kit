/**
 * Blockstudio scaffold mirror for generated projects.
 *
 * THIS FILE MIRRORS the kit reference Blockstudio scaffold.
 * When wp-starter-kit/blockstudio/ or src/Modules/Blocks/ changes, update here.
 */

/**
 * @param {object} ctx
 * @returns {string}
 */
export function blockstudioConfig(_ctx) {
  return JSON.stringify(
    {
      $schema: "https://app.blockstudio.dev/schema/blockstudio",
      assets: {
        process: { scss: true },
      },
      editor: {
        formatOnSave: false,
      },
    },
    null,
    2,
  );
}

/**
 * @param {object} ctx
 * @returns {Record<string, string>}
 */
export function exampleHeroFiles(ctx) {
  const slug = String(ctx.slug || ctx.vars?.slug || "my-plugin").toLowerCase();
  const textDomain = ctx.textDomain || ctx.vars?.textDomain || slug;
  const globalName = ctx.globalName || ctx.vars?.globalName || "MyPlugin";

  return {
    "example-hero/block.json":
      JSON.stringify(
        {
          $schema: "https://schemas.wp.org/trunk/block.json",
          apiVersion: 3,
          name: `${slug}/example-hero`,
          title: "Example Hero",
          category: "widgets",
          icon: "smiley",
          description: `Example Blockstudio block for ${globalName}.`,
          textdomain: textDomain,
          blockstudio: {
            attributes: {
              heading: {
                type: "text",
                label: "Heading",
                default: "Hello",
                role: "content",
              },
              intro: {
                type: "textarea",
                label: "Intro",
                role: "content",
              },
              showCta: {
                type: "toggle",
                label: "Show CTA",
                default: false,
              },
            },
          },
        },
        null,
        2,
      ) + "\n",
    "example-hero/index.php": `<section <?php echo get_block_wrapper_attributes( [ 'class' => 'example-hero' ] ); ?>>
\t<h2><?php echo esc_html( $a['heading'] ?? '' ); ?></h2>
\t<?php if ( ! empty( $a['intro'] ) ) : ?>
\t\t<p><?php echo esc_html( $a['intro'] ); ?></p>
\t<?php endif; ?>
\t<?php if ( ! empty( $a['showCta'] ) ) : ?>
\t\t<p class="example-hero__cta"><?php esc_html_e( 'Call to action', '{{textDomain}}' ); ?></p>
\t<?php endif; ?>
</section>
`,
    "example-hero/init.php": `<?php
/**
 * Optional per-block init hook.
 *
 * Blockstudio runs this file on init for the example-hero block.
 *
 * @package {{textDomain}}
 */
`,
    "example-hero/style.scss": `.example-hero {
\tpadding: 1.5rem;
}

.example-hero__cta {
\tfont-weight: 600;
}
`,
  };
}

/**
 * @param {object} _ctx
 * @returns {string}
 */
export function blocksBridgeModule(_ctx) {
  return `<?php
declare(strict_types=1);

namespace {{vendor}}\\Modules\\Blocks;

use {{frameworkNamespace}}\\Core\\ModuleInterface;

/**
 * Bridge module: enables Blockstudio block discovery for this plugin.
 * Blocks live under /blockstudio/{block-name}/.
 */
final class Module implements ModuleInterface
{
\tpublic function get_slug(): string
\t{
\t\treturn 'blocks';
\t}

\tpublic function boot(): void
\t{
\t\tif (!class_exists(\\Blockstudio\\Build::class)) {
\t\t\tadd_action('admin_notices', [self::class, 'missing_blockstudio_notice']);
\t\t\treturn;
\t\t}

\t\tadd_filter(
\t\t\t'blockstudio/settings/path',
\t\t\tstatic fn (): string => self::plugin_root() . 'blockstudio.json'
\t\t);

\t\tadd_action(
\t\t\t'init',
\t\t\tstatic function (): void {
\t\t\t\t\\Blockstudio\\Build::init([
\t\t\t\t\t'dir' => self::plugin_root() . 'blockstudio',
\t\t\t\t]);
\t\t\t},
\t\t\t10
\t\t);
\t}

\tpublic static function missing_blockstudio_notice(): void
\t{
\t\techo '<div class="notice notice-error"><p>'
\t\t\t. esc_html__('Blockstudio is not available. Run composer install.', '{{textDomain}}')
\t\t\t. '</p></div>';
\t}

\tprivate static function plugin_root(): string
\t{
\t\tif (defined('{{slug_underscore}}_PLUGIN_DIR')) {
\t\t\treturn (string) {{slug_underscore}}_PLUGIN_DIR;
\t\t}

\t\treturn dirname(__DIR__, 3) . DIRECTORY_SEPARATOR;
\t}
}
`;
}

/**
 * Early registration hook so the bridge module loads before Plugin::boot().
 *
 * @param {object} _ctx
 * @returns {string}
 */
export function blocksRegisterBootstrap(_ctx) {
  return `<?php
declare(strict_types=1);

use {{frameworkNamespace}}\\Core\\Plugin;
use {{vendor}}\\Modules\\Blocks\\Module;

/**
 * Registers the Blockstudio bridge module on plugins_loaded (priority 5),
 * before {{frameworkNamespace}}\\Core\\Plugin::boot() at priority 10.
 */
if (!function_exists('add_action')) {
    return;
}

$blockstudioCandidates = [
    (defined('WP_PLUGIN_DIR') ? WP_PLUGIN_DIR : (defined('ABSPATH') ? ABSPATH . 'wp-content/plugins' : '')) . '/blockstudio/blockstudio.php',
    dirname(__DIR__) . '/vendor/blockstudio/blockstudio/blockstudio.php',
];
foreach ($blockstudioCandidates as $blockstudioFile) {
    if (is_file($blockstudioFile)) {
        require_once $blockstudioFile;
        break;
    }
}

\\add_action(
    'plugins_loaded',
    static function (): void {
        Plugin::loader()->register(new Module());
    },
    5
);
if (did_action('plugins_loaded')) {
    Plugin::loader()->register(new Module());
}
`;
}
