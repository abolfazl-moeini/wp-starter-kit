<?php
/**
 * Builder component registry contract.
 *
 * @package WPDevFramework\Core\Contracts
 * @since   2.4.0
 */

namespace WPDevFramework\Core\Contracts;

defined( 'ABSPATH' ) || exit;

/**
 * Contract for builder modules that register reusable components.
 */
interface Component_Registry_Contract {

	/**
	 * Register a named component definition.
	 *
	 * @param string               $id   Component id.
	 * @param array<string, mixed> $args Component configuration.
	 * @return void
	 */
	public function register( $id, $args );

	/**
	 * Retrieve a registered component.
	 *
	 * @param string $id Component id.
	 * @return array<string, mixed>|null
	 */
	public function get( $id );

} // end interface Component_Registry_Contract;
