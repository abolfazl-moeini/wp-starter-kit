<?php
/**
 * WPDev custom Autoloader.
 *
 * @package WPDev
 * @subpackage Autoloader
 * @since 2.0.0
 */

namespace WPDevFramework;

use WPDevFramework\Dependencies\Pablo_Pacheco\WP_Namespace_Autoloader\WP_Namespace_Autoloader;

// Exit if accessed directly
defined('ABSPATH') || exit;

/**
 * Auto-loads WPDev\* classes from modules/core/src (fallback when Legacy_Shim_Autoloader misses).
 *
 * @since 2.0.0
 */
class Autoloader {

	/**
	 * Makes sure we are only using one instance of the class
	 *
	 * @var object
	 */
	public static $instance;

	/**
	 * Static-only class.
	 */
	private function __construct() {} // end __construct;

	/**
	 * Initializes our custom autoloader
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public static function init() {

		if ( ! static::$instance instanceof static ) {

			if ( ! class_exists( WP_Namespace_Autoloader::class, false ) ) {
				if ( ! class_exists( WP_Namespace_Autoloader::class, true ) ) {
					$file = dirname( __DIR__ ) . '/dependencies/pablo-sg-pacheco/wp-namespace-autoloader/src/WP_Namespace_Autoloader.php';

					if ( is_readable( $file ) ) {
						require_once $file;
						// BC (D1c, 2.8.0): the third-party dependency file
						// declares `namespace WPDev\Dependencies\...` and we
						// can't rename third-party code, so bridge it to the
						// new WPDevFramework\Dependencies\... FQCN.
						if ( ! class_exists( WP_Namespace_Autoloader::class, false ) ) {
							class_alias( 'WPDev\\Dependencies\\Pablo_Pacheco\\WP_Namespace_Autoloader\\WP_Namespace_Autoloader', WP_Namespace_Autoloader::class );
						}
					}
				}
			}

			// BC (D1c, 2.8.0): register a wrapper autoloader that bridges
			// the new WPDevFramework\Dependencies\... FQCN back to the legacy
			// WPDev\Dependencies\... namespace that the third-party
			// dependency files still declare. We can't rename third-party
			// code, so we map new → legacy at load time and then class_alias
			// the loaded class under its new FQCN.
			spl_autoload_register( array( __CLASS__, 'bridge_dependency_namespace' ), true, true );

			static::$instance = new WP_Namespace_Autoloader(array(
				'directory'            => dirname( __DIR__, 3 ),
				'namespace_prefix'     => 'WPDev',
				'classes_dir'          => 'modules/core/src',
				'lowercase'            => array('file', 'folders'),
				'underscore_to_hyphen' => array('file', 'folders'),
				'debug'                => Autoloader::is_debug(),
			));

			static::$instance->init();

		} // end if;

	} // end init;

	/**
	 * BC (D1c, 2.8.0) dependency-namespace bridge.
	 *
	 * Translates the new WPDevFramework\Dependencies\X FQCN back to the
	 * legacy WPDev\Dependencies\X namespace that the third-party files
	 * under modules/core/dependencies and per-example dependencies still
	 * declare. After the file is loaded (declaring the legacy class), we
	 * class_alias() it under the new FQCN so first-party code that uses
	 * the WPDevFramework\Dependencies alias keeps working.
	 *
	 * @param string $class Fully-qualified class name.
	 * @return void
	 */
	public static function bridge_dependency_namespace( $class ) {

		// Only handle the new-namespace FQCN.
		if ( 0 !== strpos( $class, 'WPDevFramework\\Dependencies\\' ) ) {
			return;
		}

		// Skip if already declared.
		if ( class_exists( $class, false ) || interface_exists( $class, false ) || trait_exists( $class, false ) ) {
			return;
		}

		// Map to the legacy FQCN declared by the third-party file.
		$legacy_fqcn = 'WPDev\\Dependencies\\' . substr( $class, strlen( 'WPDevFramework\\Dependencies\\' ) );

		// Ask the existing PHP autoloader chain to load the legacy FQCN.
		// class_exists(..., true) triggers every registered autoloader; the
		// WP_Namespace_Autoloader instance we registered above will find
		// the file under its legacy `WPDev\` namespace prefix.
		if ( ! class_exists( $legacy_fqcn, true ) && ! interface_exists( $legacy_fqcn, true ) && ! trait_exists( $legacy_fqcn, true ) ) {
			return;
		}

		// Mirror under the new FQCN so first-party code that imports
		// `WPDevFramework\Dependencies\X` resolves to the same class.
		if ( ! class_exists( $class, false ) && ! interface_exists( $class, false ) && ! trait_exists( $class, false ) ) {
			class_alias( $legacy_fqcn, $class );
		}

	} // end bridge_dependency_namespace;

	/**
	 * Checks for unit tests and WPDEV_DEBUG.
	 *
	 * @since 2.0.0
	 * @return boolean
	 */
	public static function is_debug() {

		return false; // return wpdev_is_debug();

	} // end is_debug;

} // end class Autoloader;
