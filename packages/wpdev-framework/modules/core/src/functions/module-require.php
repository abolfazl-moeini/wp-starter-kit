<?php
/**
 * Canonical module file loader (Phase 2.9 — bypass inc/ shims at runtime).
 *
 * @package WPDevFramework\Core\Functions
 * @since   2.5.0
 */

defined( 'ABSPATH' ) || exit;

/**
 * Resolve a canonical public-function path from the function map entry.
 *
 * @since 2.8.3
 *
 * @param string $relative Path from wpdev_public_function_map().
 * @return string Absolute path, or empty when unavailable.
 */
if (!function_exists('wpdev_resolve_public_function_path')) {
function wpdev_resolve_public_function_path( $relative ) {
	$path = wpdev_path( ltrim( (string) $relative, '/' ) );
	if ( ! is_readable( $path ) ) {
		$fallback = wpdev_path( 'functions/' . basename( (string) $relative ) );
		if ( is_readable( $fallback ) ) {
			return $fallback;
		}
	}

	$flat_local = __DIR__ . '/' . basename( (string) $relative );
	if ( file_exists( $flat_local ) ) {
		return $flat_local;
	}

	return $path;
}
}
 // end wpdev_resolve_public_function_path;

/**
 * Map of legacy inc/functions basenames to canonical module paths (relative to plugin root).
 *
 * Framework-only entries. Domain function files are loaded by wpdev-examples setup.php.
 *
 * @return array<string, string>
 */
if (!function_exists('wpdev_public_function_map')) {
function wpdev_public_function_map() {

	static $map = null;

	if ( null !== $map ) {
		return $map;
	}

	$map = array(
		'admin.php'           => '/modules/admin-page-builder/src/functions/admin.php',
		'admin-notices.php'   => '/modules/core/src/functions/admin-notices.php',
		'ajax.php'            => '/modules/core/src/functions/ajax.php',
		'array-helpers.php'   => '/modules/core/src/functions/array-helpers.php',
		'assets.php'          => '/modules/core/src/functions/assets.php',
		'context.php'         => '/modules/core/src/functions/context.php',
		'color.php'           => '/modules/core/src/functions/color.php',
		'countries.php'       => '/modules/core/src/functions/countries.php',
		'currency.php'        => '/modules/core/src/functions/currency.php',
		'danger.php'          => '/modules/core/src/functions/danger.php',
		'date.php'            => '/modules/core/src/functions/date.php',
		'debug.php'           => '/modules/core/src/functions/debug.php',
		'documentation.php'   => '/modules/core/src/functions/documentation.php',
		'element.php'         => '/modules/admin-widget-builder/src/functions/element.php',
		'env.php'             => '/modules/core/src/functions/env.php',
		'event-bus.php'       => '/modules/core/src/functions/event-bus.php',
		'form.php'            => '/modules/form-builder/src/functions/form.php',
		'fs.php'              => '/modules/core/src/functions/fs.php',
		'generator.php'       => '/modules/core/src/functions/generator.php',
		'geolocation.php'     => '/modules/core/src/functions/geolocation.php',
		'helper.php'          => '/modules/core/src/functions/helper.php',
		'http.php'            => '/modules/core/src/functions/http.php',
		'legacy.php'          => '/modules/core/src/functions/legacy.php',
		'licensing.php'       => '/modules/core/src/functions/licensing.php',
		'markup-helpers.php'  => '/modules/core/src/functions/markup-helpers.php',
		'model.php'           => '/modules/core/src/functions/model.php',
		'number-helpers.php'  => '/modules/core/src/functions/number-helpers.php',
		'options.php'         => '/modules/settings-panel-builder/src/functions/options.php',
		'pages.php'           => '/modules/admin-page-builder/src/functions/pages.php',
		'reflection.php'      => '/modules/core/src/functions/reflection.php',
		'rest.php'            => '/modules/core/src/functions/rest.php',
		'scheduler.php'       => '/modules/core/src/functions/scheduler.php',
		'session.php'         => '/modules/core/src/functions/session.php',
		'settings.php'        => '/modules/settings-panel-builder/src/functions/settings.php',
		'site-context.php'    => '/modules/core/src/functions/site-context.php',
		'sort.php'            => '/modules/core/src/functions/sort.php',
		'string-helpers.php'  => '/modules/core/src/functions/string-helpers.php',
		'tab-navigation.php'  => '/modules/tab-navigation/src/functions/tab-navigation.php',
		'template.php'        => '/modules/core/src/view/template-functions.php',
		'tour.php'            => '/modules/core/src/functions/tour.php',
		'translation.php'     => '/modules/core/src/functions/translation.php',
		'url.php'             => '/modules/core/src/functions/url.php',
		'wizard.php'          => '/modules/wizard/src/functions/wizard.php',
	);

	return $map;

}
}
 // end wpdev_public_function_map;

/**
 * Require a public function file from its canonical module path.
 *
 * @since 2.5.0
 *
 * @param string $basename Basename under inc/functions (e.g. ajax or ajax.php).
 * @return void
 */
if (!function_exists('wpdev_require_public_function')) {
function wpdev_require_public_function( $basename ) {

	static $loaded = array();

	$file = basename( (string) $basename, '.php' ) . '.php';

	if ( isset( $loaded[ $file ] ) ) {
		return;
	}

	$map = wpdev_public_function_map();

	if ( ! isset( $map[ $file ] ) ) {
		if ( function_exists( '_doing_it_wrong' ) ) {
			_doing_it_wrong(
				__FUNCTION__,
				sprintf( 'Unknown public function file: %s', $file ),
				'2.5.0'
			);
		}
		return;
	}

	$path = wpdev_resolve_public_function_path( $map[ $file ] );

	if ( ! is_readable( $path ) ) {
		if ( function_exists( '_doing_it_wrong' ) ) {
			_doing_it_wrong(
				__FUNCTION__,
				sprintf( 'Canonical module path is not readable: %s', $path ),
				'2.5.0'
			);
		}
		return;
	}

	require_once $path;
	$loaded[ $file ] = true;

}
}
 // end wpdev_require_public_function;

/**
 * Call a static method only if the class (and method) exists, with fallback.
 *
 * @since 2.8.0
 *
 * @param string         $class    Fully qualified class name.
 * @param string         $method   Static method name.
 * @param callable|null  $fallback Callable invoked when the class or method is missing.
 * @param mixed          ...$args  Arguments forwarded to the method.
 * @return mixed
 */
if (!function_exists('wpdev_call_if_static_method_exists')) {
function wpdev_call_if_static_method_exists( $class, $method, $fallback = null, ...$args ) {

	if ( class_exists( $class ) && method_exists( $class, $method ) ) {
		return $class::$method( ...$args );
	}

	return is_callable( $fallback ) ? $fallback( ...$args ) : null;

}
}
 // end wpdev_call_if_static_method_exists;
