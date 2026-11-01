<?php
/**
 * Split V2 Settings Migration (P4).
 *
 * Slices the legacy shared wpdev_v2_settings blob into dedicated options
 * named by panel ID (option_name = {panel_id}). Preserves the legacy blob
 * as a backup.
 *
 * @package WPDevFramework\Modules\SettingsPanelBuilder
 * @since   2.15.0
 */

declare( strict_types=1 );

namespace WPDevFramework\Modules\SettingsPanelBuilder;

use WPDevFramework\Database\Migration\Migration;
use WPDevFramework\Database\Migration\Migration_Result;

defined( 'ABSPATH' ) || exit;

/**
 * Split_V2_Settings_Migration moves shared settings to per-panel options idempotently.
 */
class Split_V2_Settings_Migration implements Migration {

	/**
	 * Target semver for this migration.
	 *
	 * @return string
	 */
	public function get_version(): string {
		return '2.15.0';
	}

	/**
	 * Description of changes applied by this migration.
	 *
	 * @return string
	 */
	public function get_description(): string {
		return 'Split wpdev_v2_settings into dedicated options per panel';
	}

	/**
	 * Whether this migration is resource-intensive and should run asynchronously.
	 *
	 * @return bool
	 */
	public function is_async(): bool {
		return false;
	}

	/**
	 * Slices legacy v2_settings blob into per-panel options.
	 *
	 * @param int $batch_size Batch size (unused as settings are lightweight).
	 * @return Migration_Result
	 */
	public function up( int $batch_size = 100 ): Migration_Result {
		$legacy = null;

		if ( function_exists( 'wpdev_get_option' ) ) {
			$legacy = wpdev_get_option( 'v2_settings', null );
		}

		if ( ( null === $legacy || false === $legacy ) && function_exists( 'get_option' ) ) {
			$legacy = get_option( 'wpdev_v2_settings', null );
		}

		if ( ! is_array( $legacy ) || empty( $legacy ) ) {
			return Migration_Result::success( 0, 'No legacy settings to split' );
		}

		$sections = [];
		if ( function_exists( 'wpdev_ensure_settings' ) ) {
			$settings_obj = wpdev_ensure_settings();
			if ( $settings_obj && method_exists( $settings_obj, 'get_sections' ) ) {
				$sections = $settings_obj->get_sections();
			}
		}

		if ( class_exists( Settings_Section_Registry::class ) ) {
			foreach ( Settings_Section_Registry::all() as $slug => $config ) {
				if ( ! isset( $sections[ $slug ] ) ) {
					$sections[ $slug ] = $config;
				} else {
					$sections[ $slug ] = array_merge( $sections[ $slug ], $config );
					if ( ! empty( $config['fields'] ) ) {
						$sections[ $slug ]['fields'] = array_merge(
							is_array( $sections[ $slug ]['fields'] ?? null ) ? $sections[ $slug ]['fields'] : [],
							$config['fields']
						);
					}
				}
			}
		}

		$migrated_count = 0;

		foreach ( $sections as $section_slug => $section_config ) {
			if ( empty( $section_config['fields'] ) || ! is_array( $section_config['fields'] ) ) {
				continue;
			}

			$option_name = ! empty( $section_config['option_name'] ) ? (string) $section_config['option_name'] : (string) $section_slug;

			try {
				$store = Option_Store::for( $section_slug, $option_name );
			} catch ( \InvalidArgumentException $e ) {
				// Reserved name - skip or log
				continue;
			}

			$panel_values = [];
			foreach ( array_keys( $section_config['fields'] ) as $field_key ) {
				if ( array_key_exists( $field_key, $legacy ) ) {
					$panel_values[ $field_key ] = $legacy[ $field_key ];
				}
			}

			if ( ! empty( $panel_values ) ) {
				$store->save( $panel_values );
				$migrated_count++;
			}
		}

		return Migration_Result::success( $migrated_count, sprintf( 'Migrated %d panels from shared blob', $migrated_count ) );
	}

	/**
	 * Rollback changes applied by this migration.
	 *
	 * Since legacy blob was kept intact, down is a safe verification no-op.
	 *
	 * @return Migration_Result
	 */
	public function down(): Migration_Result {
		return Migration_Result::success( 1, 'Reverted split: legacy blob remains authoritative' );
	}
}
