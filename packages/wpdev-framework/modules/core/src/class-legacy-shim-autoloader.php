<?php
/**
 * Autoload legacy inc classes from modular canonical paths.
 *
 * Resolves legacy WPDev namespaces from modules without inc/ shims.
 *
 * @package WPDevFramework\Core
 * @since   2.5.0
 */

namespace WPDevFramework\Core;

defined( 'ABSPATH' ) || exit;

/**
 * Maps legacy namespaces to module source files.
 */
class Legacy_Shim_Autoloader {

	/**
	 * Legacy namespaces loaded from modules.
	 *
	 * @var string[]
	 */
	protected static $namespace_prefixes = array(
		// BC (D1c, 2.8.0): legacy `WPDev\` prefixes — still recognised so the
		// autoloader keeps resolving them to the renamed files via the
		// class_alias bridge in autoload().
		'WPDev\\Admin_Pages',
		'WPDev\\List_Tables',
		'WPDev\\Managers',
		'WPDev\\Models',
		'WPDev\\Database',
		'WPDev\\UI',
		'WPDev\\Apis',
		'WPDev\\API',
		'WPDev\\Checkout',
		'WPDev\\Gateways',
		'WPDev\\Integrations',
		'WPDev\\Helpers',
		'WPDev\\Objects',
		'WPDev\\Compat',
		'WPDev\\Traits',
		'WPDev\\Installers',
		'WPDev\\Exception',
		'WPDev\\Internal',
		'WPDev\\Loaders',
		'WPDev\\Contracts',
		'WPDev\\Country',
		'WPDev\\Invoices',
		'WPDev\\Domain_Mapping',
		'WPDev\\Development',
		'WPDev\\Builders',
		'WPDev\\Limitations',
		'WPDev\\Limits',
		'WPDev\\SSO',
		'WPDev\\Rollback',
		'WPDev\\Debug',
		'WPDev\\Tax',
		'WPDev\\Site_Templates',
		// New canonical (D1c, 2.8.0): `WPDevFramework\` prefixes — every
		// first-party file declares one of these, so the class map builder
		// picks them up and the autoloader resolves them directly.
		'WPDevFramework\\Admin_Pages',
		'WPDevFramework\\List_Tables',
		'WPDevFramework\\Managers',
		'WPDevFramework\\Models',
		'WPDevFramework\\Database',
		'WPDevFramework\\UI',
		'WPDevFramework\\Apis',
		'WPDevFramework\\API',
		'WPDevFramework\\Checkout',
		'WPDevFramework\\Gateways',
		'WPDevFramework\\Integrations',
		'WPDevFramework\\Helpers',
		'WPDevFramework\\Objects',
		'WPDevFramework\\Compat',
		'WPDevFramework\\Traits',
		'WPDevFramework\\Installers',
		'WPDevFramework\\Exception',
		'WPDevFramework\\Internal',
		'WPDevFramework\\Loaders',
		'WPDevFramework\\Contracts',
		'WPDevFramework\\Country',
		'WPDevFramework\\Invoices',
		'WPDevFramework\\Domain_Mapping',
		'WPDevFramework\\Development',
		'WPDevFramework\\Builders',
		'WPDevFramework\\Limitations',
		'WPDevFramework\\Limits',
		'WPDevFramework\\SSO',
		'WPDevFramework\\Rollback',
		'WPDevFramework\\Debug',
		'WPDevFramework\\Tax',
		'WPDevFramework\\Site_Templates',
		// BC: legacy `WPDevFramework\Modules\*` namespaces whose targets moved to examples/
		// in 2.8.0 are mapped via the BC class map below; the prefix must be
		// recognised by is_legacy_namespace() for the autoloader to fire.
		'WPDev\\Modules',
		// WaaS Examples live under examples/ and use a WPDevFramework\Examples\* namespace
		// (WPDevFramework\Examples\AdminSettingPageDefaults\Sections\*, etc.). The
		// autoloader must know to scan examples/ for these classes.
		'WPDev\\Examples',
		'WPDevFramework\\Examples',
	);

	/**
	 * Cached FQCN => absolute path map.
	 *
	 * @var array<string, string>|null
	 */
	protected static $class_map = null;

	/**
	 * Whether init() has run.
	 *
	 * @var bool
	 */
	protected static $initialized = false;

	/**
	 * Register autoloader (prepended — runs before inc autoloader).
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
	 * Load a legacy class from the module map.
	 *
	 * @param string $class Class name.
	 * @return void
	 */
	public static function autoload( $class ) {

		if ( ! self::is_legacy_namespace( $class ) ) {
			return;
		}

		$map = self::get_class_map();

		if ( isset( $map[ $class ] ) && is_readable( $map[ $class ] ) ) {
			require_once $map[ $class ];
			// After the 2.8.0 D1c bulk rename, the file declares the new
			// WPDevFramework\ namespace, not the legacy WPDev\ one. Bridge them
			// with a class_alias so external code that still uses the legacy
			// FQCN keeps working.
			if ( ! ( class_exists( $class, false ) || interface_exists( $class, false ) || trait_exists( $class, false ) ) ) {
				$new_fqcn = 'WPDevFramework\\' . substr( $class, strlen( 'WPDev\\' ) );
				if ( class_exists( $new_fqcn, false ) || interface_exists( $new_fqcn, false ) || trait_exists( $new_fqcn, false ) ) {
					class_alias( $new_fqcn, $class );
				}
			}
		}

	} // end autoload;

	/**
	 * Whether the class belongs to a supported legacy namespace.
	 *
	 * @param string $class Class name.
	 * @return bool
	 */
	public static function is_legacy_namespace( $class ) {

		if ( preg_match( '/^WPDev(?:Framework)?\\\\[^\\\\]+$/', $class ) ) {
			return true;
		}

		foreach ( self::$namespace_prefixes as $prefix ) {
			if ( 0 === strpos( $class, $prefix ) ) {
				return true;
			}
		}

		return false;

	} // end is_legacy_namespace;

	/**
	 * Return the built class map (for tests and diagnostics).
	 *
	 * @since 2.5.0
	 *
	 * @return array<string, string>
	 */
	public static function get_class_map() {

		if ( null === self::$class_map ) {
			self::$class_map = self::build_class_map();
		}

		return self::$class_map;

	} // end get_class_map;

	/**
	 * Build FQCN map by scanning module directories.
	 *
	 * @return array<string, string>
	 */
	protected static function build_class_map() {

		$plugin_root = dirname( dirname( dirname( __DIR__ ) ) );
		$map         = array();

		$scan_roots = array(
			$plugin_root . '/modules/core/src/managers',
			$plugin_root . '/modules/core/src/form',
			$plugin_root . '/modules/core/src/Model',
			$plugin_root . '/modules/core/src/Database',
			$plugin_root . '/modules/core/src/helpers',
			$plugin_root . '/modules/core/src/objects',
			$plugin_root . '/modules/core/src/api',
			$plugin_root . '/modules/core/src/compat',
			$plugin_root . '/modules/core/src/traits',
			$plugin_root . '/modules/core/src/installers',
			$plugin_root . '/modules/core/src/exception',
			$plugin_root . '/modules/core/src/internal',
			$plugin_root . '/modules/core/src/loaders',
			$plugin_root . '/modules/core/src/contracts',
			$plugin_root . '/modules/core/src/country',
			$plugin_root . '/modules/core/src/tour',
			$plugin_root . '/modules/admin-widget-builder/src/ui',
			$plugin_root . '/modules/field-builder/src/field',
			$plugin_root . '/modules/form-builder/src/form',
			$plugin_root . '/modules/admin-page-builder/src/admin',
			$plugin_root . '/modules/admin-custom-page',
			$plugin_root . '/modules/admin-setting-page',
			$plugin_root . '/modules/wizard',
			$plugin_root . '/modules/metabox-builder/src/admin',
			$plugin_root . '/modules/table-builder/src/table',
		);

		foreach ( glob( $plugin_root . '/modules/admin-*/src/builders', GLOB_ONLYDIR ) ?: array() as $dir ) {
			$scan_roots[] = $dir;
		}

		$root_wpdev_globs = array(
			$plugin_root . '/modules/core/src/class-*.php',
			$plugin_root . '/modules/core/src/ajax/class-*.php',
			$plugin_root . '/modules/core/src/view/class-*.php',
			$plugin_root . '/modules/settings-panel-builder/src/class-*.php',
			$plugin_root . '/modules/admin-widget-builder/src/class-*.php',
			$plugin_root . '/modules/wizard/class-*.php',
		);

		// BC class map: legacy FQCNs that were moved to wpdev-examples/ in 2.8.0
		// still need to resolve from their original namespace. The autoloader
		// points them at the new file and creates a class_alias so external
		// code that imported the old FQCN continues to work.
		$examples_root = defined( 'WPDEV_EXAMPLES_DIR' )
			? rtrim( (string) WPDEV_EXAMPLES_DIR, '/\\' )
			: '';

		if ( '' === $examples_root && function_exists( 'apply_filters' ) ) {
			$filtered = apply_filters( 'wpdev_examples_dir', null );

			if ( is_string( $filtered ) && '' !== $filtered ) {
				$examples_root = rtrim( $filtered, '/\\' );
			}
		}

		$bc_aliases = array();

		if ( '' !== $examples_root ) {
			$bc_aliases = array(
				'WPDev\\Modules\\AdminSettingPage\\WPDev_Settings_Default_Sections'
					=> $examples_root . '/admin-setting-page-defaults/src/class-wpdev-settings-default-sections.php',
			);
		}

		foreach ( $root_wpdev_globs as $pattern ) {
			foreach ( glob( $pattern ) ?: array() as $file ) {
				$parsed = self::parse_class_from_file( $file );

				if ( $parsed ) {
					$map[ $parsed['class'] ] = $parsed['file'];
				}
			}
		}

		// Apply BC aliases: the autoloader will require the new file when the old
		// FQCN is requested, and the file itself runs class_alias() at the bottom.
		foreach ( $bc_aliases as $legacy_fqcn => $new_file ) {
			if ( ! isset( $map[ $legacy_fqcn ] ) && is_readable( $new_file ) ) {
				$map[ $legacy_fqcn ] = $new_file;
			}
		}

		foreach ( $scan_roots as $root ) {
			if ( ! is_dir( $root ) ) {
				continue;
			}

			$iterator = new \RecursiveIteratorIterator(
				new \RecursiveDirectoryIterator( $root, \FilesystemIterator::SKIP_DOTS )
			);

			foreach ( $iterator as $file ) {
				if ( ! $file->isFile() || 'php' !== $file->getExtension() ) {
					continue;
				}

				$parsed = self::parse_class_from_file( $file->getPathname() );

				if ( ! $parsed ) {
					continue;
				}

				$map[ $parsed['class'] ] = $parsed['file'];
			}
		}

		// BC (D1c, 2.8.0): every file in the map declares the new
		// WPDevFramework\ namespace, but external code may still import the
		// legacy WPDev\ FQCN. Mirror each entry to the legacy key so the
		// autoloader can find the file when the legacy FQCN is requested.
		$legacy_map = array();
		foreach ( $map as $new_fqcn => $file ) {
			$legacy_fqcn = 'WPDev\\' . substr( $new_fqcn, strlen( 'WPDevFramework\\' ) );
			if ( ! isset( $map[ $legacy_fqcn ] ) ) {
				$legacy_map[ $legacy_fqcn ] = $file;
			}
		}

		return array_merge( $map, $legacy_map );

	} // end build_class_map;

	/**
	 * Parse namespace and class/trait name from a PHP file header.
	 *
	 * @param string $file Absolute file path.
	 * @return array{class: string, file: string}|null
	 */
	/**
	 * Public wrapper for Examples_Shim_Autoloader and tests.
	 *
	 * @since 2.8.0
	 *
	 * @param string $file Absolute file path.
	 * @return array{class: string, file: string}|null
	 */
	public static function parse_class_from_file_public( $file ) {

		return self::parse_class_from_file( $file );

	} // end parse_class_from_file_public;

	/**
	 * Parse namespace and class/trait name from a PHP file header.
	 *
	 * @param string $file Absolute file path.
	 * @return array{class: string, file: string}|null
	 */
	protected static function parse_class_from_file( $file ) {

		$head = file_get_contents( $file, false, null, 0, 8192 );

		if ( false === $head ) {
			return null;
		}

		if ( ! preg_match( '/namespace\s+([^;]+);/', $head, $namespace_match ) ) {
			return null;
		}

		$namespace = trim( $namespace_match[1] );

		if ( ! self::namespace_is_supported( $namespace ) ) {
			return null;
		}

		$after_ns = substr( $head, strpos( $head, $namespace_match[0] ) + strlen( $namespace_match[0] ) );

		if ( preg_match( '/\n\s*abstract class\s+(\w+)/', $after_ns, $class_match ) ) {
			$class_name = $class_match[1];
		} elseif ( preg_match( '/\n\s*(?:final\s+)?class\s+(\w+)/', $after_ns, $class_match ) ) {
			$class_name = $class_match[1];
		} elseif ( preg_match( '/\n\s*trait\s+(\w+)/', $after_ns, $class_match ) ) {
			$class_name = $class_match[1];
		} elseif ( preg_match( '/\n\s*interface\s+(\w+)/', $after_ns, $class_match ) ) {
			$class_name = $class_match[1];
		} else {
			return null;
		}

		return array(
			'class' => $namespace . '\\' . $class_name,
			'file'  => $file,
		);

	} // end parse_class_from_file;

	/**
	 * Whether a namespace is supported by the legacy autoloader.
	 *
	 * @param string $namespace Namespace string.
	 * @return bool
	 */
	protected static function namespace_is_supported( $namespace ) {

		if ( 'WPDev' === $namespace || 'WPDevFramework' === $namespace ) {
			return true;
		}

		foreach ( self::$namespace_prefixes as $prefix ) {
			if ( 0 === strpos( $namespace, $prefix ) ) {
				return true;
			}
		}

		return false;

	} // end namespace_is_supported;

} // end class Legacy_Shim_Autoloader;
