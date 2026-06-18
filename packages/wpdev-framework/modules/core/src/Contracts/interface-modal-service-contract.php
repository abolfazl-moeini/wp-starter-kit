<?php
/**
 * Modal / wubox service contract.
 *
 * @package WPDevFramework\Core\Contracts
 * @since   2.4.0
 */

namespace WPDevFramework\Core\Contracts;

defined( 'ABSPATH' ) || exit;

/**
 * Contract for modal form display via wubox.
 */
interface Modal_Service_Contract extends Service_Contract {

	/**
	 * Open a registered modal form by id.
	 *
	 * @param string               $form_id Registered form id.
	 * @param array<string, mixed> $args    Optional query args.
	 * @return string URL to load the modal content.
	 */
	public function open( $form_id, $args = array() );

	/**
	 * Register confirm modal for bulk actions.
	 *
	 * @param string $model  Model slug.
	 * @param string $action Bulk action slug.
	 * @return void
	 */
	public function register_bulk_confirm( $model, $action );

	/**
	 * Register an AJAX modal content action (J-07/J-11).
	 *
	 * Used for arbitrary modal bodies loaded over AJAX (e.g. Edit Field,
	 * Generate Shortcode) that are not registered forms.
	 *
	 * @param string   $id       Modal id (used in the action slug).
	 * @param callable $callback Echoes or returns the modal HTML.
	 * @param array    $args     { nopriv: bool }.
	 * @return void
	 */
	public function register_ajax_modal_action( $id, $callback, $args = array() );

	/**
	 * Build the URL that loads an AJAX modal content action.
	 *
	 * @param string $id   Modal id registered via register_ajax_modal_action().
	 * @param array  $args Optional query args.
	 * @return string
	 */
	public function ajax_content_url( $id, $args = array() );

	/**
	 * Render an anchor that opens a wubox modal.
	 *
	 * @param array $args { url, label, classes, icon, title, attrs }.
	 * @return string
	 */
	public function render_button( $args = array() );

} // end interface Modal_Service_Contract;
