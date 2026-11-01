<?php
/**
 * WP-CLI Migration Command for WPDev.
 *
 * @package WPDevFramework\Database\Migration
 * @since   2.14.0
 */

declare( strict_types=1 );

namespace WPDevFramework\Database\Migration;

use WP_CLI;

defined( 'ABSPATH' ) || exit;

/**
 * Class Cli_Migration_Command
 *
 * Executes migrations for WPDev and consumer plugins via WP-CLI.
 */
class Cli_Migration_Command {

	/**
	 * Run database migrations for registered plugins.
	 *
	 * ## OPTIONS
	 *
	 * [--plugin=<slug>]
	 * : Target plugin slug (runs all registered plugins if omitted).
	 *
	 * [--batch-size=<int>]
	 * : Number of items per batch for chunked migrations.
	 * ---
	 * default: 100
	 * ---
	 *
	 * [--rollback]
	 * : Rollback the latest migration for the specified plugin.
	 *
	 * [--status]
	 * : Display installed vs target migration versions without executing.
	 *
	 * ## EXAMPLES
	 *
	 *     # Run all pending migrations
	 *     wp wpdev migrate
	 *
	 *     # Run migrations for specific plugin
	 *     wp wpdev migrate --plugin=my-plugin
	 *
	 *     # Check status
	 *     wp wpdev migrate --status
	 *
	 *     # Rollback specific plugin
	 *     wp wpdev migrate --plugin=my-plugin --rollback
	 *
	 * @param array<int, string>   $args
	 * @param array<string, mixed> $assoc_args
	 */
	public function __invoke( array $args, array $assoc_args ): void {
		$plugin     = isset( $assoc_args['plugin'] ) ? (string) $assoc_args['plugin'] : '';
		$batch_size = isset( $assoc_args['batch-size'] ) ? (int) $assoc_args['batch-size'] : 100;
		$rollback   = ! empty( $assoc_args['rollback'] );
		$status     = ! empty( $assoc_args['status'] );

		$plugins = $plugin !== '' ? [ $plugin ] : Migration_Manager::get_registered_plugins();

		if ( empty( $plugins ) ) {
			WP_CLI::line( 'No plugins registered with Migration_Manager.' );
			return;
		}

		if ( $status ) {
			$this->display_status( $plugins );
			return;
		}

		if ( $rollback ) {
			if ( $plugin === '' ) {
				WP_CLI::error( 'The --plugin option is required when using --rollback.' );
				return;
			}
			$this->handle_rollback( $plugin );
			return;
		}

		foreach ( $plugins as $slug ) {
			if ( ! Migration_Manager::needs_migration( $slug ) ) {
				WP_CLI::line( sprintf( '[%s] Database is up to date (%s).', $slug, Migration_Manager::get_installed_version( $slug ) ) );
				continue;
			}

			WP_CLI::log( sprintf( '[%s] Starting migration from %s to %s...', $slug, Migration_Manager::get_installed_version( $slug ), Migration_Manager::get_target_version( $slug ) ) );
			$results = Migration_Manager::migrate_plugin( $slug, [ 'batch_size' => $batch_size ] );

			foreach ( $results as $version => $res ) {
				if ( $res->is_success() ) {
					WP_CLI::success( sprintf( '[%s] v%s applied: %s (%d items processed)', $slug, $version, $res->get_message() ?: 'OK', $res->get_processed_count() ) );
				} else {
					WP_CLI::error( sprintf( '[%s] v%s failed: %s', $slug, $version, $res->get_error() ) );
				}
			}
		}
	}

	/**
	 * @param string[] $plugins
	 */
	private function display_status( array $plugins ): void {
		$rows = [];
		foreach ( $plugins as $slug ) {
			$installed = Migration_Manager::get_installed_version( $slug );
			$target    = Migration_Manager::get_target_version( $slug );
			$needs     = Migration_Manager::needs_migration( $slug ) ? 'Pending' : 'Up to date';

			$rows[] = [
				'plugin'    => $slug,
				'installed' => $installed,
				'target'    => $target,
				'status'    => $needs,
			];
		}

		WP_CLI\Utils\format_items( 'table', $rows, [ 'plugin', 'installed', 'target', 'status' ] );
	}

	/**
	 * @param string $plugin
	 */
	private function handle_rollback( string $plugin ): void {
		WP_CLI::log( sprintf( '[%s] Rolling back latest migration...', $plugin ) );
		$results = Migration_Manager::rollback_plugin( $plugin );

		if ( empty( $results ) ) {
			WP_CLI::warning( sprintf( '[%s] No migration found to rollback.', $plugin ) );
			return;
		}

		foreach ( $results as $version => $res ) {
			if ( $res->is_success() ) {
				WP_CLI::success( sprintf( '[%s] v%s rollback complete.', $plugin, $version ) );
			} else {
				WP_CLI::error( sprintf( '[%s] v%s rollback failed: %s', $plugin, $version, $res->get_error() ) );
			}
		}
	}
}
