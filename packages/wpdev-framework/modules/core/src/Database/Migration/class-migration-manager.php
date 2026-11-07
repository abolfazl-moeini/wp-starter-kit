<?php
/**
 * Central Migration Manager for WPDev and Consumer Plugins.
 *
 * @package WPDevFramework\Database\Migration
 * @since   2.14.0
 */

declare( strict_types=1 );

namespace WPDevFramework\Database\Migration;

defined( 'ABSPATH' ) || exit;

/**
 * Class Migration_Manager
 *
 * Orchestrates plugin migration registration, sequential execution,
 * version tracking, and background async queueing.
 */
class Migration_Manager {

	/**
	 * Registry of migrations per plugin slug.
	 *
	 * @var array<string, Migration[]>
	 */
	private static array $registry = [];

	/**
	 * Reset in-memory registry (used primarily by test suites).
	 *
	 * @return void
	 */
	public static function reset(): void {
		self::$registry = [];
	}

	/**
	 * Register a migration for a plugin.
	 *
	 * @param string    $plugin_slug Unique plugin identifier.
	 * @param Migration $migration   Migration instance.
	 * @return void
	 */
	public static function register( string $plugin_slug, Migration $migration ): void {
		if ( ! isset( self::$registry[ $plugin_slug ] ) ) {
			self::$registry[ $plugin_slug ] = [];
		}

		self::$registry[ $plugin_slug ][] = $migration;

		// Maintain migrations sorted in ascending semver order
		usort(
			self::$registry[ $plugin_slug ],
			static fn( Migration $a, Migration $b ) => version_compare( $a->get_version(), $b->get_version() )
		);
	}

	/**
	 * Get all registered migrations for a plugin, sorted ascending.
	 *
	 * @param string $plugin_slug
	 * @return Migration[]
	 */
	public static function get_migrations( string $plugin_slug ): array {
		return self::$registry[ $plugin_slug ] ?? [];
	}

	/**
	 * Get all registered plugin slugs.
	 *
	 * @return string[]
	 */
	public static function get_registered_plugins(): array {
		return array_keys( self::$registry );
	}

	/**
	 * Boot hooks for async migration runner and WP-CLI.
	 *
	 * @return void
	 */
	public static function boot(): void {
		if ( ! function_exists( 'add_action' ) ) {
			return;
		}

		add_action( 'wpdev_run_async_migration', [ static::class, 'handle_async_action' ] );
		add_action( 'admin_notices', [ static::class, 'render_admin_notices' ] );
		add_action( 'network_admin_notices', [ static::class, 'render_admin_notices' ] );

		if ( defined( 'WP_CLI' ) && \WP_CLI ) {
			\WP_CLI::add_command( 'wpdev migrate', Cli_Migration_Command::class );
		}
	}

	/**
	 * Handle execution of an async migration step via Action Scheduler or WP-Cron.
	 *
	 * Supports both structured associative array argument shapes [ 'plugin_slug' => $slug ]
	 * and legacy string / indexed array arguments.
	 *
	 * @param mixed $arg Plugin slug string or associative array containing 'plugin_slug'.
	 * @return void
	 */
	public static function handle_async_action( $arg ): void {
		$plugin_slug = is_array( $arg ) ? ( $arg['plugin_slug'] ?? ( $arg[0] ?? '' ) ) : (string) $arg;
		$plugin_slug = trim( (string) $plugin_slug );

		if ( '' === $plugin_slug || ! self::needs_migration( $plugin_slug ) ) {
			return;
		}

		$result = self::run_step( $plugin_slug, 100 );

		if ( $result->is_success() && ! $result->is_complete() ) {
			self::schedule_async_migration( $plugin_slug );
		}
	}

	/**
	 * Schedule next async migration action.
	 *
	 * Enforces uniform argument shape between Action Scheduler and WP-Cron.
	 *
	 * @param string $plugin_slug
	 * @return void
	 */
	public static function schedule_async_migration( string $plugin_slug ): void {
		$args = [ 'plugin_slug' => $plugin_slug ];

		if ( function_exists( 'as_enqueue_async_action' ) ) {
			as_enqueue_async_action( 'wpdev_run_async_migration', $args );
		} elseif ( function_exists( 'wp_schedule_single_event' ) ) {
			wp_schedule_single_event( time(), 'wpdev_run_async_migration', $args );
		}
	}


	/**
	 * Get the currently installed database version for a plugin.
	 *
	 * @param string $plugin_slug
	 * @return string
	 */
	public static function get_installed_version( string $plugin_slug ): string {
		$option_key = self::get_version_option_key( $plugin_slug );
		if ( function_exists( 'get_option' ) ) {
			$val = get_option( $option_key, '0.0.0' );
			return is_string( $val ) && $val !== '' ? $val : '0.0.0';
		}
		return '0.0.0';
	}

	/**
	 * Update the installed database version for a plugin.
	 *
	 * @param string $plugin_slug
	 * @param string $version
	 * @return void
	 */
	public static function set_installed_version( string $plugin_slug, string $version ): void {
		$option_key = self::get_version_option_key( $plugin_slug );
		if ( function_exists( 'update_option' ) ) {
			update_option( $option_key, $version, false );
		}
	}

	/**
	 * Get target version (highest registered version) for a plugin.
	 *
	 * @param string $plugin_slug
	 * @return string
	 */
	public static function get_target_version( string $plugin_slug ): string {
		$migrations = self::get_migrations( $plugin_slug );
		if ( empty( $migrations ) ) {
			return self::get_installed_version( $plugin_slug );
		}
		$last = end( $migrations );
		return $last->get_version();
	}

	/**
	 * Check if a plugin has pending migrations to execute.
	 *
	 * @param string $plugin_slug
	 * @return bool
	 */
	public static function needs_migration( string $plugin_slug ): bool {
		$installed = self::get_installed_version( $plugin_slug );
		foreach ( self::get_migrations( $plugin_slug ) as $migration ) {
			if ( version_compare( $migration->get_version(), $installed, '>' ) ) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Run all pending migrations for a plugin in sequence.
	 *
	 * @param string                $plugin_slug
	 * @param array<string, mixed>  $options
	 * @return array<string, Migration_Result>
	 */
	public static function migrate_plugin( string $plugin_slug, array $options = [] ): array {
		$results = [];

		if ( ! Migration_Lock::acquire( $plugin_slug ) ) {
			$results['lock'] = Migration_Result::failure( 'Migration locked by another process' );
			return $results;
		}

		try {
			$installed  = self::get_installed_version( $plugin_slug );
			$migrations = self::get_migrations( $plugin_slug );
			$batch_size = (int) ( $options['batch_size'] ?? 100 );
			$max_steps  = (int) ( $options['max_steps'] ?? 1000 );

			foreach ( $migrations as $migration ) {
				$version = $migration->get_version();
				if ( version_compare( $version, $installed, '<=' ) ) {
					continue;
				}

				$step_count = 0;

				// Run steps until completed or failed, guarded by zero-progress circuit breaker
				do {
					$step_count++;
					$result = $migration->up( $batch_size );

					// Circuit breaker: If incomplete and 0 items processed, stop immediately to prevent infinite loop
					if ( ! $result->is_complete() && $result->get_processed_count() === 0 ) {
						break;
					}
				} while ( $result->is_success() && ! $result->is_complete() && $step_count < $max_steps );

				$results[ $version ] = $result;

				if ( ! $result->is_success() ) {
					$err_msg = $result->get_error() !== '' ? $result->get_error() : $result->get_message();
					self::record_failure( $plugin_slug, $version, $err_msg );
					break;
				}

				// Only bump installed version if the migration actually completed
				if ( $result->is_complete() ) {
					self::clear_failure( $plugin_slug );
					self::set_installed_version( $plugin_slug, $version );
					$installed = $version;
				} else {
					// Migration is incomplete, do not proceed with subsequent migrations
					break;
				}
			}
		} finally {
			Migration_Lock::release( $plugin_slug );
		}

		return $results;
	}

	/**
	 * Execute a single batch step of the next pending migration.
	 * Useful for chunked background runners (Action Scheduler / WP-Cron).
	 *
	 * @param string $plugin_slug
	 * @param int    $batch_size
	 * @return Migration_Result
	 */
	public static function run_step( string $plugin_slug, int $batch_size = 100 ): Migration_Result {
		$installed  = self::get_installed_version( $plugin_slug );
		$migrations = self::get_migrations( $plugin_slug );
		$pending    = null;

		foreach ( $migrations as $migration ) {
			if ( version_compare( $migration->get_version(), $installed, '>' ) ) {
				$pending = $migration;
				break;
			}
		}

		if ( ! $pending ) {
			return Migration_Result::skipped( 'No pending migrations' );
		}

		if ( ! Migration_Lock::acquire( $plugin_slug ) ) {
			return Migration_Result::failure( 'Migration locked by another process' );
		}

		try {
			$result = $pending->up( $batch_size );
			if ( $result->is_success() && $result->is_complete() ) {
				self::clear_failure( $plugin_slug );
				self::set_installed_version( $plugin_slug, $pending->get_version() );
			} elseif ( ! $result->is_success() ) {
				$err_msg = $result->get_error() !== '' ? $result->get_error() : $result->get_message();
				self::record_failure( $plugin_slug, $pending->get_version(), $err_msg );
			}
			return $result;
		} finally {
			Migration_Lock::release( $plugin_slug );
		}
	}

	/**
	 * Rollback the latest installed migration for a plugin.
	 *
	 * @param string $plugin_slug
	 * @return array<string, Migration_Result>
	 */
	public static function rollback_plugin( string $plugin_slug ): array {
		$results = [];

		if ( ! Migration_Lock::acquire( $plugin_slug ) ) {
			$results['lock'] = Migration_Result::failure( 'Migration locked by another process' );
			return $results;
		}

		try {
			$installed  = self::get_installed_version( $plugin_slug );
			$migrations = array_reverse( self::get_migrations( $plugin_slug ) );

			foreach ( $migrations as $index => $migration ) {
				$version = $migration->get_version();
				if ( version_compare( $version, $installed, '=' ) ) {
					$res                  = $migration->down();
					$results[ $version ] = $res;

					if ( $res->is_success() ) {
						// Set version to previous migration in sequence or 0.0.0
						$prev_version = isset( $migrations[ $index + 1 ] ) ? $migrations[ $index + 1 ]->get_version() : '0.0.0';
						self::set_installed_version( $plugin_slug, $prev_version );
					}
					break;
				}
			}
		} finally {
			Migration_Lock::release( $plugin_slug );
		}

		return $results;
	}

	/**
	 * Record a migration failure for administrative visibility.
	 *
	 * @param string $plugin_slug
	 * @param string $version
	 * @param string $message
	 * @return void
	 */
	public static function record_failure( string $plugin_slug, string $version, string $message ): void {
		$option_key = self::get_failure_option_key( $plugin_slug );
		if ( function_exists( 'update_option' ) ) {
			update_option( $option_key, [
				'plugin_slug' => $plugin_slug,
				'version'     => $version,
				'message'     => $message,
				'timestamp'   => time(),
			], false );
		}
	}

	/**
	 * Retrieve a recorded migration failure.
	 *
	 * @param string $plugin_slug
	 * @return array{plugin_slug: string, version: string, message: string, timestamp: int}|null
	 */
	public static function get_failure( string $plugin_slug ): ?array {
		$option_key = self::get_failure_option_key( $plugin_slug );
		if ( function_exists( 'get_option' ) ) {
			$val = get_option( $option_key, null );
			return is_array( $val ) ? $val : null;
		}
		return null;
	}

	/**
	 * Clear a recorded migration failure.
	 *
	 * @param string $plugin_slug
	 * @return void
	 */
	public static function clear_failure( string $plugin_slug ): void {
		$option_key = self::get_failure_option_key( $plugin_slug );
		if ( function_exists( 'delete_option' ) ) {
			delete_option( $option_key );
		}
	}

	/**
	 * Render administrative notices for any active migration failures.
	 *
	 * @return void
	 */
	public static function render_admin_notices(): void {
		foreach ( array_keys( self::$registry ) as $slug ) {
			$failure = self::get_failure( $slug );
			if ( $failure ) {
				$ver = function_exists( 'esc_html' ) ? esc_html( $failure['version'] ?? '' ) : ( $failure['version'] ?? '' );
				$pkg = function_exists( 'esc_html' ) ? esc_html( $failure['plugin_slug'] ?? $slug ) : ( $failure['plugin_slug'] ?? $slug );
				$msg = function_exists( 'esc_html' ) ? esc_html( $failure['message'] ?? 'Unknown error' ) : ( $failure['message'] ?? 'Unknown error' );
				printf(
					'<div class="notice notice-error is-dismissible"><p><strong>[WPDev Migration Error]</strong> Database migration %s failed for %s: %s</p></div>',
					$ver,
					$pkg,
					$msg
				);
			}
		}
	}

	/**
	 * Format option key for plugin failure.
	 *
	 * @param string $plugin_slug
	 * @return string
	 */
	private static function get_failure_option_key( string $plugin_slug ): string {
		$clean = function_exists( 'sanitize_key' ) ? sanitize_key( $plugin_slug ) : strtolower( preg_replace( '/[^a-z0-9_-]/', '', $plugin_slug ) );
		return 'wpdev_db_fail_' . $clean;
	}

	/**
	 * Format option key for plugin version.
	 *
	 * @param string $plugin_slug
	 * @return string
	 */
	private static function get_version_option_key( string $plugin_slug ): string {
		$clean = function_exists( 'sanitize_key' ) ? sanitize_key( $plugin_slug ) : strtolower( preg_replace( '/[^a-z0-9_-]/', '', $plugin_slug ) );
		return 'wpdev_db_ver_' . $clean;
	}
}
