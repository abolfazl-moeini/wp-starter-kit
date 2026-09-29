<?php
/**
 * Cross-request write lock for the shared WPDev settings option.
 *
 * @package WPDevFramework\Modules\SettingsPanelBuilder
 * @since   2.6.1
 */

namespace WPDevFramework\Modules\SettingsPanelBuilder;

defined( 'ABSPATH' ) || exit;

/**
 * Serializes the shared option's read/merge/write critical section.
 */
class Settings_Write_Lock {

	/**
	 * Run a callback with the named option locked for this site/network context.
	 *
	 * MySQL/MariaDB advisory locks are connection-scoped, so a terminated PHP
	 * process releases the lock automatically. We deliberately fail closed when
	 * the host database does not provide the advisory-lock API rather than leave
	 * a stale option/transient lock behind.
	 *
	 * @param string   $option_name Logical WPDev option name.
	 * @param callable $callback    Critical section callback.
	 * @param int      $timeout     Maximum wait in milliseconds.
	 * @return mixed|false Callback result, or false if the lock was unavailable.
	 */
	public static function run( $option_name, $callback, $timeout = 2000 ) {

		static $held_locks = array();

		if ( ! is_callable( $callback ) ) {
			return false;
		}

		global $wpdb;

		if ( ! is_object( $wpdb ) || ! method_exists( $wpdb, 'prepare' ) || ! method_exists( $wpdb, 'get_var' ) ) {
			do_action( 'wpdev_option_lock_unavailable', $option_name, 'database-unavailable' );

			return false;
		}

		$is_site_context = self::uses_site_context();
		$context         = $is_site_context ? 'site' : 'network';
		$context_id      = $is_site_context
			? ( function_exists( 'get_current_blog_id' ) ? (int) get_current_blog_id() : 0 )
			: ( function_exists( 'get_current_network_id' ) ? (int) get_current_network_id() : 0 );
		$lock_key        = 'wpdev:settings-write:' . $context . ':' . $context_id . ':' . $option_name;
		$lock_id         = $context . ':' . $lock_key;

		if ( ! empty( $held_locks[ $lock_id ] ) ) {
			return call_user_func( $callback );
		}

		$wait_seconds = (int) ceil( max( 0, (int) $timeout ) / 1000 );
		$acquired     = 1 === (int) $wpdb->get_var(
			$wpdb->prepare( 'SELECT GET_LOCK(%s, %d)', $lock_key, $wait_seconds )
		);

		if ( ! $acquired ) {
			do_action( 'wpdev_option_lock_unavailable', $option_name, $context );

			return false;
		}

		$held_locks[ $lock_id ] = true;

		try {
			return call_user_func( $callback );
		} finally {
			$wpdb->get_var( $wpdb->prepare( 'SELECT RELEASE_LOCK(%s)', $lock_key ) );
			unset( $held_locks[ $lock_id ] );
		}

	} // end run;

	/**
	 * @return bool
	 */
	private static function uses_site_context() {

		if ( function_exists( 'wpdev_uses_site_admin_context' ) ) {
			return (bool) wpdev_uses_site_admin_context();
		}

		return function_exists( 'wpdev_playground_uses_site_admin_context' )
			&& wpdev_playground_uses_site_admin_context();

	} // end uses_site_context;
}
