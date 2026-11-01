<?php
/**
 * Migration Contract for WPDev Database Migrations.
 *
 * @package WPDevFramework\Database\Migration
 * @since   2.14.0
 */

declare( strict_types=1 );

namespace WPDevFramework\Database\Migration;

defined( 'ABSPATH' ) || exit;

/**
 * Interface Migration
 *
 * Implemented by database migrations in WPDev and consumer plugins.
 */
interface Migration {

	/**
	 * Target semver or version string for this migration (e.g. '1.1.0').
	 *
	 * @return string
	 */
	public function get_version(): string;

	/**
	 * Human-readable description of changes applied by this migration.
	 *
	 * @return string
	 */
	public function get_description(): string;

	/**
	 * Whether this migration is resource-intensive and should run asynchronously.
	 *
	 * @return bool
	 */
	public function is_async(): bool;

	/**
	 * Run a migration step/batch.
	 *
	 * @param int $batch_size Maximum items to process in this step.
	 * @return Migration_Result
	 */
	public function up( int $batch_size = 100 ): Migration_Result;

	/**
	 * Rollback changes applied by this migration.
	 *
	 * @return Migration_Result
	 */
	public function down(): Migration_Result;
}
