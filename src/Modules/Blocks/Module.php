<?php
declare(strict_types=1);

namespace WPDev\Modules\Blocks;

use WPDev\Core\ModuleInterface;

/**
 * Bridge module: enables Blockstudio block discovery for this plugin.
 * Blocks live under /blockstudio/{block-name}/.
 */
final class Module implements ModuleInterface
{
	public function get_slug(): string
	{
		return 'blocks';
	}

	public function boot(): void
	{
		if (!class_exists(\Blockstudio\Build::class)) {
			add_action('admin_notices', [self::class, 'missing_blockstudio_notice']);
			return;
		}

		add_filter(
			'blockstudio/settings/path',
			static fn (): string => self::plugin_root() . 'blockstudio.json'
		);

		add_action(
			'init',
			static function (): void {
				\Blockstudio\Build::init([
					'dir' => self::plugin_root() . 'blockstudio',
				]);
			},
			10
		);
	}

	public static function missing_blockstudio_notice(): void
	{
		echo '<div class="notice notice-error"><p>'
			. esc_html__('Blockstudio is not available. Run composer install.', 'wpdev-starter')
			. '</p></div>';
	}

	private static function plugin_root(): string
	{
		if (defined('WPDEV_STARTER_PLUGIN_DIR')) {
			return (string) WPDEV_STARTER_PLUGIN_DIR;
		}

		return dirname(__DIR__, 3) . DIRECTORY_SEPARATOR;
	}
}