<?php
/**
 * Migration Concurrency Mutex Lock.
 *
 * @package WPDevFramework\Database\Migration
 * @since   2.14.0
 */

declare( strict_types=1 );

namespace WPDevFramework\Database\Migration;

defined( 'ABSPATH' ) || exit;

/**
 * Class Migration_Lock
 *
 * Prevents overlapping migration executions for the same plugin.
 */
final class Migration_Lock {

	public const DEFAULT_TTL_SECONDS = 120;

	/**
	 * Attempt to acquire a mutex lock for the given plugin.
	 *
	 * @param string $plugin_slug Unique plugin identifier.
	 * @param int    $ttl_seconds Lock lease time in seconds.
	 * @return bool True if lock acquired, false if already locked.
	 */
	public static function acquire( string $plugin_slug, int $ttl_seconds = self::DEFAULT_TTL_SECONDS ): bool {
		$lock_key = self::get_lock_key( $plugin_slug );
		$now      = time();

		if ( function_exists( 'get_transient' ) && function_exists( 'set_transient' ) ) {
			$existing = get_transient( $lock_key );
			if ( ! empty( $existing ) ) {
				$lock_time = (int) $existing;
				if ( ( $now - $lock_time ) < $ttl_seconds ) {
					return false;
				}
			}

			set_transient( $lock_key, $now, $ttl_seconds );
			return true;
		}

		return true;
	}

	/**
	 * Release the mutex lock for the given plugin.
	 *
	 * @param string $plugin_slug Unique plugin identifier.
	 * @return void
	 */
	public static function release( string $plugin_slug ): void {
		$lock_key = self::get_lock_key( $plugin_slug );
		if ( function_exists( 'delete_transient' ) ) {
			delete_transient( $lock_key );
		}
	}

	/**
	 * Check whether the plugin currently has an active lock.
	 *
	 * @param string $plugin_slug Unique plugin identifier.
	 * @param int    $ttl_seconds Lock lease time in seconds.
	 * @return bool
	 */
	public static function is_locked( string $plugin_slug, int $ttl_seconds = self::DEFAULT_TTL_SECONDS ): bool {
		$lock_key = self::get_lock_key( $plugin_slug );
		if ( function_exists( 'get_transient' ) ) {
			$existing = get_transient( $lock_key );
			if ( ! empty( $existing ) ) {
				return ( time() - (int) $existing ) < $ttl_seconds;
			}
		}
		return false;
	}

	/**
	 * Format transient key for plugin lock.
	 *
	 * @param string $plugin_slug
	 * @return string
	 */
	private static function get_lock_key( string $plugin_slug ): string {
		$clean = function_exists( 'sanitize_key' ) ? sanitize_key( $plugin_slug ) : strtolower( preg_replace( '/[^a-z0-9_-]/', '', $plugin_slug ) );
		return 'wpdev_mig_lock_' . $clean;
	}
}
