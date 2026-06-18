<?php
/**
 * Autoloader for WPDev Framework modular namespaces.
 *
 * Maps WPDevFramework\Core\* to modules/core/src/ and
 * WPDevFramework\Modules\{Name}\* to modules/{kebab-name}/src/.
 *
 * BC: also resolves the legacy `WPDev\` namespace to the same files, so
 * external addons and tests that still reference the old FQCN keep
 * working. The new canonical namespace is `WPDevFramework\`.
 *
 * @package WPDevFramework\Core
 * @since   2.4.0
 */

namespace WPDevFramework\Core;

defined( 'ABSPATH' ) || exit;

/**
 * PSR-4-style autoloader for module source directories.
 */
class Module_Autoloader {

	/**
	 * Whether init() has run.
	 *
	 * @var bool
	 */
	protected static $initialized = false;

	/**
	 * Maps PascalCase module segment to kebab-case directory name.
	 *
	 * @var array<string, string>
	 */
	protected static $module_map = array(
		'FieldBuilder'          => 'field-builder',
		'FormBuilder'           => 'form-builder',
		'SettingsPanelBuilder'  => 'settings-panel-builder',
		'MenuBuilder'           => 'menu-builder',
		'AdminPageBuilder'      => 'admin-page-builder',
		'TabNavigation'         => 'tab-navigation',
		'TableBuilder'          => 'table-builder',
		'MetaboxBuilder'        => 'metabox-builder',
		'AdminWidgetBuilder'    => 'admin-widget-builder',
		'WaasEvents'            => 'wpdev-events',
		'WaasPayments'          => 'wpdev-payments',
		'WaasCustomers'         => 'wpdev-customers',
		'WaasProducts'          => 'wpdev-products',
	);

	/**
	 * Register the autoloader.
	 *
	 * @return void
	 */
	public static function init() {

		if ( self::$initialized ) {
			return;
		}

		self::$initialized = true;

		spl_autoload_register( array( __CLASS__, 'autoload' ), true, true );

	} // end init;

	/**
	 * Resolve and load a class file.
	 *
	 * @param string $class Fully-qualified class name.
	 * @return void
	 */
	public static function autoload( $class ) {

		// BC: legacy WPDev\ namespace is mapped to the same files as WPDevFramework\.
		$is_legacy = ( 0 === strpos( $class, 'WPDev\\' ) );
		$is_new    = ( 0 === strpos( $class, 'WPDevFramework\\' ) );

		if ( ! $is_legacy && ! $is_new ) {
			return;
		}

		if ( $is_legacy ) {
			$relative = substr( $class, strlen( 'WPDev\\' ) );
		} else {
			$relative = substr( $class, strlen( 'WPDevFramework\\' ) );
		}

		if ( strpos( $relative, 'Core\\' ) === 0 ) {
			// BC (D1c, 2.8.0): when loading via the legacy WPDev\Core\* FQCN,
			// derive the new FQCN by rewriting the prefix (don't reconstruct
			// from the relative path — that drops the Core\ segment).
			$new_fqcn = $is_legacy ? 'WPDevFramework\\' . substr( $class, strlen( 'WPDev\\' ) ) : $class;
			self::load_core_class( substr( $relative, strlen( 'Core\\' ) ), $is_legacy ? $class : null, $new_fqcn );
			return;
		}

		if ( strpos( $relative, 'Modules\\' ) === 0 ) {
			// BC (D1c, 2.8.0): same rewrite for WPDev\Modules\* — derive the
			// new FQCN from the legacy class so the BC alias points to the
			// right target.
			$new_fqcn = $is_legacy ? 'WPDevFramework\\' . substr( $class, strlen( 'WPDev\\' ) ) : $class;
			self::load_module_class( substr( $relative, strlen( 'Modules\\' ) ), $is_legacy ? $class : null, $new_fqcn );
		}

	} // end autoload;

	/**
	 * Load a WPDevFramework\Core class.
	 *
	 * @param string      $relative   Class path after Core namespace.
	 * @param string|null $legacy_fqcn Optional BC alias target — when set, after
	 *                               loading the new class, class_alias() the legacy
	 *                               FQCN to the new one for backward compatibility.
	 * @param string|null $new_fqcn  The actual FQCN declared in the file (defaults
	 *                               to "WPDevFramework\\Core\\$relative" if not
	 *                               supplied — but the caller should pass the
	 *                               explicit value to avoid the Core\ segment
	 *                               being dropped when the legacy path goes
	 *                               through this branch).
	 * @return void
	 */
	protected static function load_core_class( $relative, $legacy_fqcn = null, $new_fqcn = null ) {

		$base = dirname( __DIR__ ) . '/src/';

		foreach ( self::candidate_filenames( $relative ) as $file ) {
			$path = $base . $file;

			if ( file_exists( $path ) ) {
				require_once $path;
				self::register_legacy_alias( $legacy_fqcn, $new_fqcn ?: 'WPDevFramework\\Core\\' . $relative );
				return;
			}
		}

	} // end load_core_class;

	/**
	 * Load a WPDevFramework\Modules class.
	 *
	 * @param string      $relative   Class path after Modules namespace.
	 * @param string|null $legacy_fqcn Optional BC alias target (see load_core_class).
	 * @param string|null $new_fqcn  The actual FQCN declared in the file (see load_core_class).
	 * @return void
	 */
	protected static function load_module_class( $relative, $legacy_fqcn = null, $new_fqcn = null ) {

		$parts = explode( '\\', $relative );

		if ( empty( $parts[0] ) ) {
			return;
		}

		$module_segment = $parts[0];
		$module_dir     = isset( self::$module_map[ $module_segment ] )
			? self::$module_map[ $module_segment ]
			: self::pascal_to_kebab( $module_segment );

		array_shift( $parts );
		$class_path = implode( '\\', $parts );
		$base       = dirname( dirname( __DIR__ ) ) . '/' . $module_dir . '/src/';

		foreach ( self::candidate_filenames( $class_path ) as $file ) {
			$path = $base . $file;

			if ( file_exists( $path ) ) {
				require_once $path;
				self::register_legacy_alias( $legacy_fqcn, $new_fqcn ?: 'WPDevFramework\\Modules\\' . $relative );
				return;
			}
		}

	} // end load_module_class;

	/**
	 * Register a class_alias for the legacy WPDev\ namespace, when applicable.
	 *
	 * Called after a new-namespace class file is loaded. If the caller supplied
	 * a legacy FQCN and the new class exists, alias it. Safe to call multiple
	 * times for the same FQCN; class_alias is a no-op when the alias already
	 * points to the same target.
	 *
	 * @param string|null $legacy_fqcn Legacy FQCN (with `WPDev\` prefix) or null.
	 * @param string      $new_fqcn   New FQCN (with `WPDevFramework\` prefix).
	 * @return void
	 */
	protected static function register_legacy_alias( $legacy_fqcn, $new_fqcn ) {

		if ( ! $legacy_fqcn || $legacy_fqcn === $new_fqcn ) {
			return;
		}

		if ( ! class_exists( $new_fqcn, false ) && ! interface_exists( $new_fqcn, false ) && ! trait_exists( $new_fqcn, false ) ) {
			return;
		}

		if ( class_exists( $legacy_fqcn, false ) || interface_exists( $legacy_fqcn, false ) || trait_exists( $legacy_fqcn, false ) ) {
			// Already declared (perhaps via the new class's own class_alias at
			// the bottom of the file). Don't redeclare.
			return;
		}

		class_alias( $new_fqcn, $legacy_fqcn );

	} // end register_legacy_alias;

	/**
	 * Build candidate filenames for a relative class path.
	 *
	 * @param string $relative Relative class path.
	 * @return string[]
	 */
	protected static function candidate_filenames( $relative ) {

		$parts = explode( '\\', $relative );
		$class = array_pop( $parts );
		$class = strtolower( str_replace( '_', '-', $class ) );

		$dir = '';

		if ( ! empty( $parts ) ) {
			$dir = strtolower( str_replace( '_', '-', implode( '/', $parts ) ) ) . '/';
		}

		return array(
			$dir . 'interface-' . $class . '.php',
			$dir . 'trait-' . $class . '.php',
			$dir . 'class-' . $class . '.php',
		);

	} // end candidate_filenames;

	/**
	 * Convert PascalCase to kebab-case.
	 *
	 * @param string $name Module segment name.
	 * @return string
	 */
	protected static function pascal_to_kebab( $name ) {

		$kebab = preg_replace( '/([a-z])([A-Z])/', '$1-$2', $name );
		return strtolower( (string) $kebab );

	} // end pascal_to_kebab;

} // end class Module_Autoloader;
