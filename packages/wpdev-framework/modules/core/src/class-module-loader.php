<?php
/**
 * Registry-aware module loader for WPDev.
 *
 * @package WPDevFramework\Core
 * @since   2.4.0
 */

namespace WPDevFramework\Core;

defined( 'ABSPATH' ) || exit;

/**
 * Discovers, orders, and bootstraps WPDev modules.
 */
class Module_Loader {

	/**
	 * Registered module definitions keyed by module id.
	 *
	 * @var array<string, array>
	 */
	protected static $modules = array();

	/**
	 * Module ids that have been bootstrapped.
	 *
	 * @var array<string, bool>
	 */
	protected static $loaded = array();

	/**
	 * Milliseconds spent in the last load_all() call (P3 benchmark).
	 *
	 * @var float|null
	 */
	protected static $last_load_ms = null;

	/**
	 * Absolute path to the modules directory.
	 *
	 * @var string
	 */
	protected static $modules_dir = '';

	/**
	 * Register a module definition.
	 *
	 * @param string               $id   Module slug (e.g. field-builder).
	 * @param array<string, mixed> $args {
	 *     @type string   $path         Absolute path to module root.
	 *     @type string[] $dependencies Module ids that must load first.
	 *     @type callable $bootstrap    Optional callback invoked after setup.php.
	 *     @type bool     $enabled      Whether the module is active. Default true.
	 * }
	 * @return void
	 */
	public static function register( $id, $args = array() ) {

		$defaults = array(
			'path'         => '',
			'dependencies' => array(),
			'bootstrap'    => null,
			'enabled'      => true,
		);

		self::$modules[ $id ] = array_merge( $defaults, $args, array( 'id' => $id ) );

	} // end register;

	/**
	 * Return all registered modules.
	 *
	 * @return array<string, array>
	 */
	public static function all() {

		return self::$modules;

	} // end all;

	/**
	 * Check if a module has been loaded.
	 *
	 * @param string $id Module id.
	 * @return bool
	 */
	public static function is_loaded( $id ) {

		return ! empty( self::$loaded[ $id ] );

	} // end is_loaded;

	/**
	 * Discover and load all modules from the modules directory.
	 *
	 * @param string $modules_dir Absolute path to modules/.
	 * @return void
	 */
	public static function load_all( $modules_dir ) {

		$started = microtime( true );

		self::$modules_dir = rtrim( $modules_dir, '/\\' );

		self::discover_modules();
		self::load_module( 'core' );

		$sorted = self::sort_by_dependencies();

		foreach ( $sorted as $id ) {
			if ( 'core' === $id ) {
				continue;
			}
			self::load_module( $id );
		}

		/**
		 * Fires after all registered modules have been loaded.
		 *
		 * @since 2.4.0
		 */
		do_action( 'wpdev_modules_loaded' );

		self::$last_load_ms = ( microtime( true ) - $started ) * 1000;

	} // end load_all;

	/**
	 * Milliseconds for the last module bootstrap (P3).
	 *
	 * @since 2.5.0
	 * @return float|null
	 */
	public static function get_last_load_ms() {

		return self::$last_load_ms;

	} // end get_last_load_ms;

	/**
	 * Discover setup.php files and auto-register unknown modules.
	 *
	 * @return void
	 */
	protected static function discover_modules() {

		$pattern = self::$modules_dir . '/*/setup.php';
		$setups  = glob( $pattern );

		if ( ! is_array( $setups ) ) {
			return;
		}

		foreach ( $setups as $setup ) {
			$id = basename( dirname( $setup ) );

			if ( isset( self::$modules[ $id ] ) ) {
				if ( empty( self::$modules[ $id ]['path'] ) ) {
					self::$modules[ $id ]['path'] = dirname( $setup );
				}
				continue;
			}

			$path = dirname( $setup );

			self::register(
				$id,
				array(
					'path'         => $path,
					'dependencies' => self::parse_dependencies_from_setup( $setup ),
				)
			);
		}

	} // end discover_modules;

	/**
	 * Parse the dependencies array from a module setup.php without executing it.
	 *
	 * @since 2.7.0
	 *
	 * @param string $setup_path Absolute path to setup.php.
	 * @return string[]
	 */
	protected static function parse_dependencies_from_setup( $setup_path ) {

		if ( ! is_readable( $setup_path ) ) {
			return array();
		}

		$content = (string) file_get_contents( $setup_path );

		if ( ! preg_match( "/'dependencies'\s*=>\s*array\(([^)]*)\)/s", $content, $match ) ) {
			return array();
		}

		preg_match_all( "/'([^']+)'/", $match[1], $items );

		return $items[1] ?? array();

	} // end parse_dependencies_from_setup;

	/**
	 * Topologically sort modules by dependencies.
	 *
	 * @return string[]
	 */
	protected static function sort_by_dependencies() {

		$resolved = array();
		$visiting = array();
		$stack    = array();

		$visit = function ( $id ) use ( &$visit, &$resolved, &$visiting, &$stack ) {
			if ( isset( $resolved[ $id ] ) ) {
				return;
			}

			if ( isset( $visiting[ $id ] ) ) {
				$cycle_start = array_search( $id, $stack, true );
				$cycle       = false === $cycle_start
					? array_merge( $stack, array( $id ) )
					: array_merge( array_slice( $stack, (int) $cycle_start ), array( $id ) );

				throw new \RuntimeException(
					'Module dependency cycle detected: ' . implode( ' -> ', $cycle )
				);
			}

			$visiting[ $id ] = true;
			$stack[]         = $id;
			$module          = self::$modules[ $id ] ?? null;

			if ( $module && ! empty( $module['dependencies'] ) ) {
				foreach ( $module['dependencies'] as $dependency ) {
					if ( isset( self::$modules[ $dependency ] ) ) {
						$visit( $dependency );
					}
				}
			}

			array_pop( $stack );
			unset( $visiting[ $id ] );
			$resolved[ $id ] = true;
		};

		foreach ( array_keys( self::$modules ) as $id ) {
			$visit( $id );
		}

		return array_keys( $resolved );

	} // end sort_by_dependencies;

	/**
	 * Load one module and its declared dependencies (standalone bootstrap).
	 *
	 * @since 2.7.0
	 *
	 * @param string $id          Module id.
	 * @param string $modules_dir Absolute path to modules/.
	 * @return bool True when the target module was loaded.
	 */
	public static function load_standalone( $id, $modules_dir = '' ) {

		if ( '' !== $modules_dir ) {
			self::$modules_dir = rtrim( $modules_dir, '/\\' );
		}

		if ( '' === self::$modules_dir ) {
			return false;
		}

		self::discover_modules();

		if ( ! isset( self::$modules[ $id ] ) ) {
			if ( function_exists( '_doing_it_wrong' ) ) {
				_doing_it_wrong(
					__METHOD__,
					sprintf( 'Unknown module "%s".', $id ),
					'2.7.0'
				);
			}
			return false;
		}

		self::load_module_with_dependencies( $id );

		return self::is_loaded( $id );

	} // end load_standalone;

	/**
	 * Load a module and recurse into its dependencies first.
	 *
	 * @since 2.7.0
	 *
	 * @param string $id Module id.
	 * @return void
	 */
	protected static function load_module_with_dependencies( $id ) {

		if ( self::is_loaded( $id ) ) {
			return;
		}

		$module = self::$modules[ $id ] ?? null;

		if ( ! $module ) {
			return;
		}

		foreach ( (array) ( $module['dependencies'] ?? array() ) as $dependency ) {
			if ( ! isset( self::$modules[ $dependency ] ) ) {
				if ( function_exists( '_doing_it_wrong' ) ) {
					_doing_it_wrong(
						__METHOD__,
						sprintf(
							'Module "%s" requires "%s", which is not registered.',
							$id,
							$dependency
						),
						'2.7.0'
					);
				}
				continue;
			}

			self::load_module_with_dependencies( $dependency );
		}

		self::load_module( $id );

	} // end load_module_with_dependencies;

	/**
	 * Load a single module by id.
	 *
	 * @param string $id Module id.
	 * @return void
	 */
	protected static function load_module( $id ) {

		if ( isset( self::$loaded[ $id ] ) ) {
			return;
		}

		$module = self::$modules[ $id ] ?? null;

		if ( ! $module || empty( $module['enabled'] ) ) {
			return;
		}

		$setup = rtrim( $module['path'], '/\\' ) . '/setup.php';

		if ( ! file_exists( $setup ) ) {
			if ( function_exists( '_doing_it_wrong' ) ) {
				_doing_it_wrong(
					__METHOD__,
					sprintf( 'Module "%s" setup.php is missing at %s', $id, $setup ),
					'2.7.0'
				);
			}
			return;
		}

		if ( class_exists( Dependency_Manager::class ) ) {
			Dependency_Manager::register_module_from_path( $id, $module['path'] );
		}

		require_once $setup;

		if ( is_callable( $module['bootstrap'] ?? null ) ) {
			call_user_func( $module['bootstrap'] );
		}

		self::$loaded[ $id ] = true;

		/**
		 * Fires after a single module is loaded.
		 *
		 * @since 2.4.0
		 *
		 * @param string $id     Module id.
		 * @param array  $module Module definition.
		 */
		do_action( 'wpdev_module_loaded', $id, $module );

	} // end load_module;

	/**
	 * Reset loader state (unit tests).
	 *
	 * @since 2.7.0
	 *
	 * @return void
	 */
	public static function reset() {

		self::$modules      = array();
		self::$loaded       = array();
		self::$modules_dir  = '';
		self::$last_load_ms = null;

	} // end reset;

	/**
	 * Mark a module as loaded without requiring its setup file.
	 *
	 * Used when core bootstraps itself before load_all runs.
	 *
	 * @param string $id Module id.
	 * @return void
	 */
	public static function mark_loaded( $id ) {

		self::$loaded[ $id ] = true;

	} // end mark_loaded;

	/**
	 * Return a relative path inside the modules directory.
	 *
	 * @param string $path Absolute or relative path.
	 * @return string
	 */
	public static function relative_path( $path ) {

		return ltrim( str_replace( self::$modules_dir, '', $path ), '/\\' );

	} // end relative_path;

} // end class Module_Loader;
