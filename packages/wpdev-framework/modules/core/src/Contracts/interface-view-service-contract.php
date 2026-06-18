<?php
/**
 * View / template service contract.
 *
 * @package WPDevFramework\Core\Contracts
 * @since   2.4.0
 */

namespace WPDevFramework\Core\Contracts;

defined( 'ABSPATH' ) || exit;

/**
 * Contract for rendering WPDev views.
 */
interface View_Service_Contract extends Service_Contract {

	/**
	 * Render a view template.
	 *
	 * @param string               $view         View path relative to views/.
	 * @param array<string, mixed> $args         Template variables.
	 * @param string|false         $default_view Fallback view path.
	 * @return void
	 */
	public function render( $view, $args = array(), $default_view = false );

	/**
	 * Render a view and return HTML string.
	 *
	 * @param string               $view         View path relative to views/.
	 * @param array<string, mixed> $args         Template variables.
	 * @param string|false         $default_view Fallback view path.
	 * @return string
	 */
	public function render_contents( $view, $args = array(), $default_view = false );

} // end interface View_Service_Contract;
