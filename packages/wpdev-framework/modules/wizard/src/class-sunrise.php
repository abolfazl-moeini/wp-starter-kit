<?php
/**
 * WPDev activation and deactivation hooks
 *
 * @package WPDev
 * @subpackage Sunrise
 * @since 2.0.0
 */

namespace WPDevFramework;

use WPDevFramework\Dependencies\Psr\Log\LogLevel;

// Exit if accessed directly
defined('ABSPATH') || exit;

/**
 * WPDev activation and deactivation hooks
 *
 * @since 2.0.0
 */
class Sunrise {

	/**
	 * Keeps the current sunrise.php version.
	 *
	 * @var string
	 */
	static $version = '2.5.0';

	/**
	 * Keeps the sunrise meta cached after the first read.
	 *
	 * @var null|array
	 */
	static $sunrise_meta;

	/**
	 * Initializes sunrise and loads additional elements if needed.
	 *
	 * @since 2.0.11
	 * @return void
	 */
	public static function init() {

		$core_functions = dirname( __DIR__, 2 ) . '/core/src/functions';

		require_once $core_functions . '/sunrise.php';

		/**
		 * Load development tools as soon as possible.
		 */
		\WPDevFramework\Sunrise::load_development_mode();

		/**
		 * Load the core apis we need from the start.
		 */
		require_once $core_functions . '/helper.php';

		require_once $core_functions . '/fs.php';

		require_once $core_functions . '/debug.php';

		/**
		 * Domain mapping needs to be loaded
		 * before anything else.
		 */
		\WPDevFramework\Sunrise::load_domain_mapping();

		/**
		 * Enqueue the main hooks that deal with Sunrise
		 * loading and maintenance.
		 */
		add_action('ms_loaded', array('\WPDevFramework\Sunrise', 'load'));

		add_action('ms_loaded', array('\WPDevFramework\Sunrise', 'loaded'), 999);

		add_action('init', array('\WPDevFramework\Sunrise', 'maybe_tap_on_init'));

		add_filter('wpdev_system_info_data', array('\WPDevFramework\Sunrise', 'system_info'));

	} // end init;

	/**
	 * Checks if all the requirements for sunrise loading are in place.
	 *
	 * In order to be completely loaded, we need two
	 * criteria to be fulfilled:
	 *
	 * 1. The setup wizard must have been finalized;
	 * 2. wpdev is active - which is determined by the sunrise meta file.
	 *
	 * @since 2.0.11
	 * @return boolean
	 */
	public static function should_startup() {

		$setup_finished = get_network_option(null, 'wpdev_setup_finished', false);

		$should_load_sunrise = wpdev_should_load_sunrise();

		return $setup_finished && $should_load_sunrise;

	} // end should_startup;

	/**
	 * Load dependencies, if we need them somewhere.
	 *
	 * @since 2.0.11
	 * @return void
	 */
	public static function load_dependencies() {

		$plugin_root = dirname( __DIR__, 3 );

		require_once $plugin_root . '/autoload.php';

		require_once $plugin_root . '/modules/core/src/functions/dependency-bootstrap.php';

		wpdev_bootstrap_dependency_manager( $plugin_root );

		require_once $plugin_root . '/modules/core/src/deprecated/early-deprecated.php';

		require_once $plugin_root . '/modules/core/src/deprecated/mercator.php';

		require_once $plugin_root . '/modules/core/src/class-autoloader.php';

		require_once $plugin_root . '/modules/core/src/class-module-autoloader.php';

		require_once $plugin_root . '/modules/core/src/class-legacy-shim-autoloader.php';

		\WPDevFramework\Core\Module_Autoloader::init();

		\WPDevFramework\Core\Legacy_Shim_Autoloader::init();

		$examples_includes = self::resolve_examples_includes_dir();

		if ( '' !== $examples_includes && is_readable( $examples_includes . '/class-examples-shim-autoloader.php' ) ) {
			require_once $examples_includes . '/class-examples-shim-autoloader.php';

			if ( class_exists( '\WPDevFramework\Core\Examples_Shim_Autoloader' ) ) {
				\WPDevFramework\Core\Examples_Shim_Autoloader::init();
			}
		}

		require_once $plugin_root . '/modules/core/src/functions/fs.php';

		if ( ! function_exists( 'wpdev_examples_file' ) && '' !== $examples_includes && is_readable( $examples_includes . '/examples-paths.php' ) ) {
			require_once $examples_includes . '/examples-paths.php';
		}

		require_once $plugin_root . '/modules/core/src/functions/module-require.php';

		$site_functions = function_exists( 'wpdev_examples_file' )
			? \wpdev_examples_file( 'sites/src/functions/site.php' )
			: '';

		if ( '' !== $site_functions ) {
			wpdev_maybe_boot_examples_autoloader_for_path( $site_functions );
			require_once $site_functions;
		}

		require_once $plugin_root . '/modules/core/src/functions/debug.php';

		require_once $plugin_root . '/modules/core/src/functions/url.php';

		require_once $plugin_root . '/modules/core/src/functions/number-helpers.php';

		require_once $plugin_root . '/modules/core/src/functions/array-helpers.php';

		/*
		 * Setup autoloader
		 */
		\WPDevFramework\Autoloader::init();

	} // end load_dependencies;

	/**
	 * Loads domain mapping before anything else.
	 *
	 * @since 2.0.11
	 * @return void
	 */
	public static function load_domain_mapping() {

		$should_startup = \WPDevFramework\Sunrise::should_startup();

		if ($should_startup) {

			\WPDevFramework\Sunrise::load_dependencies();

			/*
			 * Primary Domain capabilities (optional example: wpdev-domains).
			 */
			if ( class_exists( '\WPDevFramework\Domain_Mapping\Primary_Domain' ) ) {
				\WPDevFramework\Domain_Mapping\Primary_Domain::get_instance();
			}

			if ( class_exists( '\WPDevFramework\Domain_Mapping' ) ) {
				\WPDevFramework\Domain_Mapping::get_instance();
			}

		} // end if;

	} // end load_domain_mapping;

	/**
	 * Loads the Sunrise components, if needed.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public static function load() {

		$should_startup = \WPDevFramework\Sunrise::should_startup();

		if ($should_startup) {
			/**
			 *  Load dependencies and get autoload running
			 */
			\WPDevFramework\Sunrise::load_dependencies();

			/*
			 * Handles WPDev core updates
			 */
			\WPDevFramework\Core_Updates::get_instance();

			/*
			 * Adds backwards compatibility code for the domain mapping.
			 */
			\WPDevFramework\Compat\Domain_Mapping_Compat::get_instance();

			/*
			 * Plugin Limits (optional example: wpdev-platform).
			 */
			if ( class_exists( '\WPDevFramework\Limits\Plugin_Limits' ) ) {
				\WPDevFramework\Limits\Plugin_Limits::get_instance();
			}

			/*
			 * Theme Limits (optional example: wpdev-platform).
			 */
			if ( class_exists( '\WPDevFramework\Limits\Theme_Limits' ) ) {
				\WPDevFramework\Limits\Theme_Limits::get_instance();
			}

			/**
			 * Define the WPDev main debug constant.
			 */
			!defined('WPDEV_DEBUG') && define('WPDEV_DEBUG', false);

			/**
			 * Check if we are using security mode.
			 */
			$security_mode = (bool) (int) wpdev_get_setting_early('security_mode');

			if ($security_mode) {

				if (wpdev_get_isset($_GET, 'wpdev_secure') === wpdev_get_security_mode_key()) {

					wpdev_save_setting_early('security_mode', false);

				} else {
					/**
					 *  Disable all plugins except WPDev
					 */
					add_filter('option_active_plugins', fn() => array());

					add_filter('site_option_active_sitewide_plugins', fn($plugins) => array(basename(dirname(__DIR__, 3)) . '/wpdev.php' => 1));

				} // end if;

			} // end if;

		} // end if;

	} // end load;

	/**
	 * Adds an additional hook that runs after ms_loaded.
	 *
	 * This is needed since there isn't really a good hook we can use
	 * that gets triggered right after ms_loaded. The hook here
	 * only runs on a very high priority number on ms_loaded,
	 * giving other modules time to register their hooks so they
	 * can be run here.
	 *
	 * @since 2.0.11
	 * @return void
	 */
	public static function loaded() {

		do_action('wpdev_sunrise_loaded');

	} // end loaded;

	/**
	 * Checks if we need to upgrade the sunrise version on wp-content
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public static function manage_sunrise_updates() {
		/*
		 * Get current version of the sunrise.php file
		 */
		$old_version = defined('WPDEV_SUNRISE_VERSION') ? WPDEV_SUNRISE_VERSION : '0.0.1';

		if (version_compare($old_version, self::$version, '<')) {

			\WPDevFramework\Sunrise::try_upgrade();

		} // end if;

	} // end manage_sunrise_updates;

	/**
	 * Upgrades the sunrise file, if necessary.
	 *
	 * @todo: lots of logic needs to be here to deal with other plugins' code on sunrise.php
	 * @since 2.0.0
	 * @return true|\WP_Error
	 */
	public static function try_upgrade() {

		$possible_sunrises = array(
			dirname( __DIR__, 3 ) . '/sunrise.php',
			dirname( __DIR__ ) . '/sunrise.php',
		);
		$sunrise_found = false;

		$error = false;

		$location = WP_CONTENT_DIR . '/sunrise.php';

		foreach ($possible_sunrises as $new_file) {

			if (!file_exists($new_file)) {

				continue;

			} // end if;

			$sunrise_found = true;

			$copy_results = @copy($new_file, $location); // phpcs:ignore

			if (!$copy_results) {

				$error = error_get_last();

				continue;

			} // end if;

			wpdev_log_add('sunrise', __('Sunrise upgrade attempt succeeded.', 'wpdev'));

			return true;

		} // end foreach;

		if ($sunrise_found === false) {

			$error = array(
				'message' => __('File not found.', 'wpdev'),
			);

		} // end if;

		if (!empty($error)) {

			wpdev_log_add('sunrise', $error['message'], LogLevel::ERROR);

			/* translators: the placeholder is an error message */
			return new \WP_Error('error', sprintf(__('Sunrise copy failed: %s', 'wpdev'), $error['message']));

		} // end if;

	} // end try_upgrade;

	/**
	 * Reads the sunrise meta file and loads it to the static cache.
	 *
	 * It only reaches the filesystem on the first read, keeping
	 * a cache of the results on a static class property then on.
	 *
	 * @since 2.0.11
	 * @return array
	 */
	protected static function read_sunrise_meta() {

		if (is_array(\WPDevFramework\Sunrise::$sunrise_meta)) {

			return \WPDevFramework\Sunrise::$sunrise_meta;

		} // end if;

		$sunrise_meta = get_network_option(null, 'wpdev_sunrise_meta', null);

		$existing = array();

		if ($sunrise_meta) {

			$existing = $sunrise_meta;

			self::$sunrise_meta = $existing;

		} // end if;

		return $existing;

	} // end read_sunrise_meta;

	/**
	 * Method for imputing Sunrise data at wpdev-system-info table.
	 *
	 * @since 2.0.11
	 * @param array $sys_info Array containing WPDev installation info.
	 * @return array Returns the array, modified with the sunrise data.
	 */
	public static function system_info($sys_info) {

		$data = Sunrise::read_sunrise_meta();

		$sys_info = array_merge($sys_info,
			array(
				'Sunrise Data' => array(
					'sunrise-status'           => array(
						'tooltip' => '',
						'title'   => 'Active',
						'value'   => $data['active'] ? 'Enabled' : 'Disabled',
					),
					'sunrise-data'             => array(
						'tooltip' => '',
						'title'   => 'Version',
						'value'   => Sunrise::$version
					),
					'sunrise-created'          => array(
						'tooltip' => '',
						'title'   => 'Created',
						'value'   => gmdate('Y-m-d @ H:i:s', $data['created']),
					),
					'sunrise-last-activated'   => array(
						'tooltip' => '',
						'title'   => 'Last Activated',
						'value'   => gmdate('Y-m-d @ H:i:s', $data['last_activated']),
					),
					'sunrise-last-deactivated' => array(
						'tooltip' => '',
						'title'   => 'Last Deactivated',
						'value'   => gmdate('Y-m-d @ H:i:s', $data['last_deactivated']),
					),
					'sunrise-last-modified'    => array(
						'tooltip' => '',
						'title'   => 'Last Modified',
						'value'   => gmdate('Y-m-d @ H:i:s', $data['last_modified']),
					)
				),
			)
		);

		return $sys_info;

	} // end system_info;

	/**
	 * Checks if the sunrise extra modules need to be loaded.
	 *
	 * @since 2.0.11
	 * @return boolean
	 */
	public static function should_load_sunrise() {

		$meta = \WPDevFramework\Sunrise::read_sunrise_meta();

		return wpdev_get_isset($meta, 'active', false);

	}  // end should_load_sunrise;

	/**
	 * Makes sure the meta file accurately reflects the state of the main plugin.
	 *
	 * @since 2.0.11
	 * @return void
	 */
	public static function maybe_tap_on_init() {

		$state = function_exists( 'wpdev' ) && wpdev()->is_loaded();

		\WPDevFramework\Sunrise::maybe_tap($state ? 'activating' : 'deactivating');

	} // end maybe_tap_on_init;

	/**
	 * Updates the sunrise meta file, if an update is due.
	 *
	 * @since 2.0.11
	 *
	 * @param string $mode Either activating or deactivating.
	 * @return bool
	 */
	public static function maybe_tap($mode = 'activating') {

		$meta = \WPDevFramework\Sunrise::read_sunrise_meta();

		$is_active = isset($meta['active']) && $meta['active'];

		if ($is_active && $mode === 'activating') {

			return false;

		} elseif (!$is_active && $mode === 'deactivating') {

			return false;

		} // end if;

		return (bool) \WPDevFramework\Sunrise::tap($mode, $meta);

	} // end maybe_tap;

	/**
	 * Updates the sunrise meta file.
	 *
	 * @since 2.0.11
	 *
	 * @param string $mode Either activating or deactivating.
	 * @param array  $existing Existing meta file values.
	 * @return bool
	 */
	protected static function tap($mode = 'activating', $existing = array()) {

		$now = gmdate('U');

		$to_save = wp_parse_args($existing, array(
			'active'           => false,
			'created'          => $now,
			'last_activated'   => 'unknown',
			'last_deactivated' => 'unknown',
		));

		if ($mode === 'activating') {

			$to_save['active']         = true;
			$to_save['last_activated'] = $now;

		} elseif ($mode === 'deactivating') {

			$to_save['active']           = false;
			$to_save['last_deactivated'] = $now;

		} else {

			return false;

		} // end if;

		$to_save['last_modified'] = $now;

		return update_network_option(null, 'wpdev_sunrise_meta', $to_save);

	} // end tap;

	/**
	 * Resolve wpdev-examples includes/ for early sunrise boot.
	 *
	 * Sunrise runs before the wpdev-examples plugin entrypoint, so we cannot rely
	 * on WPDEV_EXAMPLES_DIR alone. Prefer the constant when set; otherwise probe
	 * the sibling wpdev-examples plugin directory.
	 *
	 * @since 2.8.4
	 *
	 * @return string Absolute path to includes/, or empty when unavailable.
	 */
	protected static function resolve_examples_includes_dir() {

		if ( defined( 'WPDEV_EXAMPLES_DIR' ) ) {
			$dir = rtrim( (string) WPDEV_EXAMPLES_DIR, '/\\' ) . '/includes';

			if ( is_dir( $dir ) && is_readable( $dir ) ) {
				return $dir;
			}
		}

		$candidates = array();

		if ( defined( 'WP_PLUGIN_DIR' ) ) {
			$candidates[] = WP_PLUGIN_DIR . '/wpdev-examples/includes';
		}

		$candidates[] = WP_CONTENT_DIR . '/plugins/wpdev-examples/includes';

		$plugin_root = dirname( __DIR__, 3 );
		$candidates[] = dirname( $plugin_root ) . '/wpdev-examples/includes';

		foreach ( $candidates as $candidate ) {
			if ( is_dir( $candidate ) && is_readable( $candidate ) ) {
				return $candidate;
			}
		}

		return '';

	} // end resolve_examples_includes_dir;

	/**
	 * Load development modes, if we need too.
	 *
	 * @since 2.0.11
	 * @return void
	 */
	protected static function load_development_mode() {

		$should_load_tools = wpdev_load_dev_tools();

	} // end load_development_mode;

	// phpcs:ignore
	private function __construct() {} // end __construct;

} // end class Sunrise;

if ( ! class_exists( 'WPDev\Sunrise', false ) ) {
	class_alias( Sunrise::class, 'WPDev\Sunrise' );
}
