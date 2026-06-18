<?php
/**
 * Bulk action pipeline — confirm modal + processing.
 *
 * @package WPDevFramework\Modules\TableBuilder
 * @since   2.5.0
 */

namespace WPDevFramework\Modules\TableBuilder;

defined( 'ABSPATH' ) || exit;

/**
 * Centralizes bulk confirm URLs and processing for list tables.
 */
class Bulk_Action_Pipeline {

	/**
	 * Build the wubox confirm URL for a bulk action.
	 *
	 * @since 2.5.0
	 *
	 * @param string               $model      Model slug (from table id prefix).
	 * @param array<string, mixed> $query_args Query args (bulk_action, ids, etc.).
	 * @return string
	 */
	public static function get_confirm_url( $model, array $query_args = array() ) {

		$args = array_merge(
			array(
				'model' => $model,
			),
			$query_args
		);

		if ( function_exists( 'wpdev_services' ) && wpdev_services( 'modal' ) ) {
			$url = wpdev_services( 'modal' )->open( 'bulk_actions', $args );

			if ( $url ) {
				return $url;
			}
		}

		if ( function_exists( 'wpdev_modal_open' ) ) {
			return wpdev_modal_open( 'bulk_actions', $args );
		}

		if ( function_exists( 'wpdev_get_form_url' ) ) {
			return wpdev_get_form_url( 'bulk_actions', $args );
		}

		return '';

	} // end get_confirm_url;

	/**
	 * Process a bulk action after modal confirmation.
	 *
	 * @since 2.5.0
	 *
	 * @param string|null $action Bulk action slug.
	 * @param string|null $model  Model slug.
	 * @param string|null $ids    Comma-separated ids.
	 * @return bool|\WP_Error
	 */
	public static function process( $action = null, $model = null, $ids = null ) {

		if ( null === $action ) {
			$action = wpdev_request( 'bulk_action' );
		}

		if ( null === $model ) {
			$model = wpdev_request( 'model' );
		}

		if ( null === $ids ) {
			$ids = wpdev_request( 'ids', '' );
		}

		/**
		 * Fires before bulk processing runs.
		 *
		 * @since 2.5.0
		 *
		 * @param string $action Bulk action.
		 * @param string $model  Model slug.
		 * @param string $ids    Comma-separated ids.
		 */
		do_action( 'wpdev_bulk_pipeline_before_process', $action, $model, $ids );

		$result = \WPDevFramework\List_Tables\Base_List_Table::process_bulk_action();

		/**
		 * Fires after bulk processing runs.
		 *
		 * @since 2.5.0
		 *
		 * @param bool|\WP_Error $result Processing result.
		 * @param string         $action Bulk action.
		 * @param string         $model  Model slug.
		 */
		do_action( 'wpdev_bulk_pipeline_after_process', $result, $action, $model );

		return $result;

	} // end process;

	/**
	 * Register bulk confirm modal for a model/action pair.
	 *
	 * @since 2.5.0
	 *
	 * @param string $model  Model slug.
	 * @param string $action Bulk action slug.
	 * @return void
	 */
	public static function register_confirm( $model, $action ) {

		if ( function_exists( 'wpdev_services' ) && wpdev_services( 'modal' ) ) {
			wpdev_services( 'modal' )->register_bulk_confirm( $model, $action );
		}

	} // end register_confirm;

	/**
	 * Register bulk confirm modals from a declarative table config (K5-003).
	 *
	 * @since 2.5.0
	 *
	 * @param string       $table_id List table id slug.
	 * @param Table_Config $config   Declarative config.
	 * @return void
	 */
	public static function register_from_config( $table_id, Table_Config $config ) {

		$actions = $config->get_bulk_confirm();

		if ( empty( $actions ) ) {
			return;
		}

		$model = strchr( $table_id, '_', true );

		if ( ! $model ) {
			$model = $table_id;
		}

		foreach ( $actions as $action ) {
			self::register_confirm( $model, $action );
		}

	} // end register_from_config;

} // end class Bulk_Action_Pipeline;
