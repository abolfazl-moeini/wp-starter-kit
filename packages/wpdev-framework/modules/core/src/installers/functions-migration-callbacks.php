<?php
/**
 * Migration callback registry.
 *
 * Lets examples (and any other consumer) register a migration callback
 * keyed by the legacy installer slug (e.g. `sites`, `products`, …). The
 * core migrator looks the callback up at runtime, which keeps domain
 * migration logic out of the framework.
 *
 * @package WPDevFramework\Core\Installers
 * @since   2.8.1
 */

defined( 'ABSPATH' ) || exit;

/**
 * Internal storage for registered migration callbacks.
 *
 * @return array<string, callable>
 */
function wpdev_migration_callbacks() {

	static $callbacks = array();

	return $callbacks;

} // end wpdev_migration_callbacks;

/**
 * Register a migration callback for a given installer slug.
 *
 * The framework migrator dispatches to the registered callback in
 * place of the legacy `_install_{slug}()` method. Registering the
 * same slug twice replaces the previous callback.
 *
 * @since 2.8.1
 *
 * @param string   $slug     Installer slug (e.g. 'sites').
 * @param callable $callback Callback that performs the migration step.
 * @return bool True when the callback was registered.
 */
function wpdev_register_migration( $slug, $callback ) {

	$slug = sanitize_key( (string) $slug );

	if ( '' === $slug || ! is_callable( $callback ) ) {
		return false;
	}

	$callbacks             = wpdev_migration_callbacks();
	$callbacks[ $slug ]    = $callback;
	$GLOBALS['_wpdev_migration_callbacks'] = $callbacks;

	return true;

} // end wpdev_register_migration;

/**
 * Run a registered migration callback for the given slug.
 *
 * Returns false when no callback is registered so the core migrator
 * can fall through to its existing `_install_{slug}()` method (kept
 * for backward compatibility with framework-only migration steps).
 *
 * @since 2.8.1
 *
 * @param string $slug Installer slug.
 * @return bool True when a callback ran.
 */
function wpdev_run_migration_callback( $slug ) {

	$slug     = sanitize_key( (string) $slug );
	$callbacks = wpdev_migration_callbacks();

	if ( ! isset( $callbacks[ $slug ] ) ) {
		return false;
	}

	$callback = $callbacks[ $slug ];

	try {
		call_user_func( $callback );
	} catch ( \Throwable $e ) {
		if ( function_exists( 'wpdev_log_add' ) ) {
			wpdev_log_add( 'migrator-errors', sprintf( 'Migration %s failed: %s', $slug, $e->getMessage() ) );
		}
		throw $e;
	}

	return true;

} // end wpdev_run_migration_callback;

/**
 * Reset the migration registry (unit tests).
 *
 * @since 2.8.1
 *
 * @return void
 */
function wpdev_reset_migration_callbacks() {

	$GLOBALS['_wpdev_migration_callbacks'] = array();

} // end wpdev_reset_migration_callbacks;
