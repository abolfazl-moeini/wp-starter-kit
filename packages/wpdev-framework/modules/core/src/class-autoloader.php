<?php
/**
 * WPDev custom Autoloader.
 *
 * @package WPDev
 * @subpackage Autoloader
 * @since 2.0.0
 */

namespace WPDevFramework;

use WPDev\Dependencies\Pablo_Pacheco\WP_Namespace_Autoloader\WP_Namespace_Autoloader;

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
						// BC: the third-party dependency file declares
						// `namespace WPDev\Dependencies\...` (its real,
						// canonical namespace) and we can't rename
						// third-party code. First-party code always uses
						// this canonical `WPDev\Dependencies\...` FQCN
						// directly, so this alias only exists to protect
						// any legacy caller that still references the
						// deprecated `WPDevFramework\Dependencies\...` form.
						if ( ! class_exists( WP_Namespace_Autoloader::class, false ) ) {
							class_alias( 'WPDev\\Dependencies\\Pablo_Pacheco\\WP_Namespace_Autoloader\\WP_Namespace_Autoloader', WP_Namespace_Autoloader::class );
						}
					}
				}
			}

			// BC: register a wrapper autoloader that bridges the deprecated
			// `WPDevFramework\Dependencies\...` FQCN back to the canonical
			// `WPDev\Dependencies\...` namespace that all dependency files
			// under modules/core/dependencies and per-example dependencies
			// actually declare. All first-party code now imports
			// `WPDev\Dependencies\...` directly; this bridge is kept only
			// as a defensive fallback for any stray/legacy caller.
			spl_autoload_register( array( __CLASS__, 'bridge_dependency_namespace' ), true, true );

			static::$instance = new WP_Namespace_Autoloader(array(
				'directory'            => dirname( __DIR__, 3 ),
				'namespace_prefix'     => 'WPDevFramework',
				'classes_dir'          => 'modules/core/src',
				'lowercase'            => array('file', 'folders'),
				'underscore_to_hyphen' => array('file', 'folders'),
				'debug'                => Autoloader::is_debug(),
			));

			static::$instance->init();

			$legacy_autoloader = new WP_Namespace_Autoloader(array(
				'directory'            => dirname( __DIR__, 3 ),
				'namespace_prefix'     => 'WPDev',
				'classes_dir'          => 'modules/core/src',
				'lowercase'            => array('file', 'folders'),
				'underscore_to_hyphen' => array('file', 'folders'),
				'debug'                => Autoloader::is_debug(),
			));

			$legacy_autoloader->init();

		} // end if;

	} // end init;

	/**
	 * BC dependency-namespace bridge (deprecated FQCN fallback).
	 *
	 * Translates the deprecated `WPDevFramework\Dependencies\X` FQCN back
	 * to the canonical `WPDev\Dependencies\X` namespace that every
	 * dependency file under modules/core/dependencies and per-example
	 * dependencies actually declares. First-party code always imports
	 * `WPDev\Dependencies\X` directly; this bridge exists only so that any
	 * stray/legacy caller still using the deprecated `WPDevFramework\
	 * Dependencies\X` form does not fatal.
	 *
	 * @param string $class Fully-qualified class name.
	 * @return void
	 */
	public static function bridge_dependency_namespace( $class ) {

		// Only handle the deprecated-namespace FQCN.
		if ( 0 !== strpos( $class, 'WPDevFramework\\Dependencies\\' ) ) {
			return;
		}

		// Skip if already declared.
		if ( class_exists( $class, false ) || interface_exists( $class, false ) || trait_exists( $class, false ) ) {
			return;
		}

		// Map to the canonical FQCN declared by the third-party file.
		$legacy_fqcn = 'WPDev\\Dependencies\\' . substr( $class, strlen( 'WPDevFramework\\Dependencies\\' ) );

		// Ask the existing PHP autoloader chain to load the canonical FQCN.
		// class_exists(..., true) triggers every registered autoloader; the
		// WP_Namespace_Autoloader instance we registered above will find
		// the file under its `WPDev\` namespace prefix.
		if ( ! class_exists( $legacy_fqcn, true ) && ! interface_exists( $legacy_fqcn, true ) && ! trait_exists( $legacy_fqcn, true ) ) {
			return;
		}

		// Mirror under the deprecated FQCN so any stray/legacy caller that
		// still imports `WPDevFramework\Dependencies\X` resolves to the
		// same class.
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
