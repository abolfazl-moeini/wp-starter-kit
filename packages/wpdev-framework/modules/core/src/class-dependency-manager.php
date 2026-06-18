<?php
/**
 * Per-module scoped dependency autoloader for WPDev.
 *
 * @package WPDevFramework\Core
 * @since   2.7.0
 */

namespace WPDevFramework\Core;

defined( 'ABSPATH' ) || exit;

/**
 * Registers and loads third-party libraries from module-local dependencies/ trees.
 */
class Dependency_Manager {

	/**
	 * Whether init() has run.
	 *
	 * @var bool
	 */
	protected static $initialized = false;

	/**
	 * Legacy Composer ClassLoader (global dependencies/ fallback).
	 *
	 * @var object|null
	 */
	protected static $legacy_loader = null;

	/**
	 * Registered module ids in registration order.
	 *
	 * @var string[]
	 */
	protected static $registered_modules = array();

	/**
	 * Merged PSR-4 prefix => list of absolute directories.
	 *
	 * @var array<string, string[]>
	 */
	protected static $psr4 = array();

	/**
	 * Merged class => absolute file path.
	 *
	 * @var array<string, string>
	 */
	protected static $classmap = array();

	/**
	 * File paths already required.
	 *
	 * @var array<string, bool>
	 */
	protected static $loaded_files = array();

	/**
	 * Attach the global Composer autoloader for hybrid migration.
	 *
	 * @since 2.7.0
	 *
	 * @param object|null $loader Composer ClassLoader instance.
	 * @return void
	 */
	public static function set_legacy_loader( $loader ) {

		self::$legacy_loader = $loader;

	} // end set_legacy_loader;

	/**
	 * Initialize the module dependency autoloader (idempotent).
	 *
	 * @since 2.7.0
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
	 * Register a module manifest array.
	 *
	 * @since 2.7.0
	 *
	 * @param string               $module_id Module slug.
	 * @param array<string, mixed> $manifest  Manifest with psr4, classmap, files keys.
	 * @return void
	 */
	public static function register_module( $module_id, array $manifest ) {

		$module_id = \sanitize_key( (string) $module_id );

		if ( '' === $module_id ) {
			return;
		}

		if ( in_array( $module_id, self::$registered_modules, true ) ) {
			return;
		}

		self::$registered_modules[] = $module_id;

		$base = isset( $manifest['base'] ) ? (string) $manifest['base'] : '';

		if ( ! empty( $manifest['psr4'] ) && is_array( $manifest['psr4'] ) ) {
			foreach ( $manifest['psr4'] as $prefix => $paths ) {
				self::merge_psr4( (string) $prefix, self::normalize_paths( $paths, $base ) );
			}
		}

		if ( ! empty( $manifest['classmap'] ) && is_array( $manifest['classmap'] ) ) {
			foreach ( $manifest['classmap'] as $class => $file ) {
				if ( is_int( $class ) ) {
					continue;
				}

				$resolved = self::resolve_path( (string) $file, $base );

				if ( '' !== $resolved ) {
					self::$classmap[ (string) $class ] = $resolved;
				}
			}
		}

		if ( ! empty( $manifest['files'] ) && is_array( $manifest['files'] ) ) {
			foreach ( $manifest['files'] as $file ) {
				self::require_file( self::resolve_path( (string) $file, $base ) );
			}
		}

	} // end register_module;

	/**
	 * Load dependencies/manifest.php from a module root when present.
	 *
	 * @since 2.7.0
	 *
	 * @param string $module_id   Module slug.
	 * @param string $module_path Absolute module root path.
	 * @return bool True when a manifest was registered.
	 */
	public static function register_module_from_path( $module_id, $module_path ) {

		$module_path = rtrim( (string) $module_path, '/\\' );
		$manifest    = $module_path . '/dependencies/manifest.php';

		if ( ! is_readable( $manifest ) ) {
			return false;
		}

		$data = require $manifest;

		if ( ! is_array( $data ) ) {
			return false;
		}

		if ( empty( $data['base'] ) ) {
			$data['base'] = dirname( $manifest );
		}

		self::register_module( $module_id, $data );

		return true;

	} // end register_module_from_path;

	/**
	 * Return registered module ids.
	 *
	 * @since 2.7.0
	 * @return string[]
	 */
	public static function registered_modules() {

		return self::$registered_modules;

	} // end registered_modules;

	/**
	 * Return merged PSR-4 map (tests/diagnostics).
	 *
	 * @since 2.7.0
	 * @return array<string, string[]>
	 */
	public static function psr4_map() {

		return self::$psr4;

	} // end psr4_map;

	/**
	 * Return merged classmap (tests/diagnostics).
	 *
	 * @since 2.7.0
	 * @return array<string, string>
	 */
	public static function classmap() {

		return self::$classmap;

	} // end classmap;

	/**
	 * Resolve a class via module manifests, then legacy Composer.
	 *
	 * @since 2.7.0
	 *
	 * @param string $class Fully-qualified class name.
	 * @return bool True when the class exists after loading.
	 */
	public static function autoload( $class ) {

		$class = ltrim( (string) $class, '\\' );

		if ( '' === $class ) {
			return false;
		}

		if ( isset( self::$classmap[ $class ] ) ) {
			self::require_file( self::$classmap[ $class ] );

			return self::symbol_exists( $class );
		}

		$file = self::resolve_psr4_file( $class );

		if ( '' !== $file ) {
			self::require_file( $file );

			return self::symbol_exists( $class );
		}

		if ( self::$legacy_loader && method_exists( self::$legacy_loader, 'loadClass' ) ) {
			return (bool) self::$legacy_loader->loadClass( $class );
		}

		return false;

	} // end autoload;

	/**
	 * Reset state (unit tests).
	 *
	 * @since 2.7.0
	 * @return void
	 */
	public static function reset() {

		if ( self::$initialized ) {
			spl_autoload_unregister( array( __CLASS__, 'autoload' ) );
		}

		self::$initialized        = false;
		self::$legacy_loader      = null;
		self::$registered_modules = array();
		self::$psr4               = array();
		self::$classmap           = array();
		self::$loaded_files       = array();

	} // end reset;

	/**
	 * @param string $symbol Class, interface, or trait name.
	 * @return bool
	 */
	protected static function symbol_exists( $symbol ) {

		return class_exists( $symbol, false )
			|| interface_exists( $symbol, false )
			|| trait_exists( $symbol, false );

	} // end symbol_exists;

	/**
	 * @param string        $prefix Namespace prefix.
	 * @param string[]|string $paths  One or more directories.
	 * @return void
	 */
	protected static function merge_psr4( $prefix, $paths ) {

		$prefix = trim( (string) $prefix, '\\' ) . '\\';

		if ( ! isset( self::$psr4[ $prefix ] ) ) {
			self::$psr4[ $prefix ] = array();
		}

		foreach ( (array) $paths as $path ) {
			$path = rtrim( (string) $path, '/\\' ) . '/';

			if ( '' !== $path && ! in_array( $path, self::$psr4[ $prefix ], true ) ) {
				self::$psr4[ $prefix ][] = $path;
			}
		}

	} // end merge_psr4;

	/**
	 * @param string $class Class name.
	 * @return string
	 */
	protected static function resolve_psr4_file( $class ) {

		foreach ( self::$psr4 as $prefix => $dirs ) {
			if ( 0 !== strpos( $class, $prefix ) ) {
				continue;
			}

			$relative = substr( $class, strlen( $prefix ) );
			$relative = str_replace( '\\', '/', $relative ) . '.php';

			foreach ( $dirs as $dir ) {
				$file = $dir . $relative;

				if ( is_readable( $file ) ) {
					return $file;
				}
			}
		}

		return '';

	} // end resolve_psr4_file;

	/**
	 * @param string|string[] $paths Path or list.
	 * @param string          $base  Base directory for relative paths.
	 * @return string[]
	 */
	protected static function normalize_paths( $paths, $base ) {

		$resolved = array();

		foreach ( (array) $paths as $path ) {
			$item = self::resolve_path( (string) $path, $base );

			if ( '' !== $item ) {
				$resolved[] = $item;
			}
		}

		return $resolved;

	} // end normalize_paths;

	/**
	 * @param string $path File or directory path.
	 * @param string $base Base directory.
	 * @return string
	 */
	protected static function resolve_path( $path, $base ) {

		$path = str_replace( '\\', '/', (string) $path );

		if ( '' === $path ) {
			return '';
		}

		if ( $path[0] !== '/' && ! preg_match( '#^[A-Za-z]:/#', $path ) ) {
			$base = rtrim( str_replace( '\\', '/', (string) $base ), '/' );
			$path = ( '' !== $base ? $base . '/' : '' ) . $path;
		}

		return str_replace( '\\', '/', $path );

	} // end resolve_path;

	/**
	 * @param string $file Absolute file path.
	 * @return void
	 */
	protected static function require_file( $file ) {

		$file = (string) $file;

		if ( '' === $file || isset( self::$loaded_files[ $file ] ) ) {
			return;
		}

		if ( ! is_readable( $file ) ) {
			return;
		}

		self::$loaded_files[ $file ] = true;
		require_once $file;

	} // end require_file;

} // end class Dependency_Manager;
