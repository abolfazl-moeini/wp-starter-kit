<?php
/**
 * Module bootstrap contract.
 *
 * @package WPDevFramework\Core\Contracts
 * @since   2.4.0
 */

namespace WPDevFramework\Core\Contracts;

defined( 'ABSPATH' ) || exit;

/**
 * Optional contract for modules that expose a bootstrap class.
 */
interface Module_Contract {

	/**
	 * Module slug.
	 *
	 * @return string
	 */
	public function id();

	/**
	 * Module dependencies (other module slugs).
	 *
	 * @return string[]
	 */
	public function dependencies();

	/**
	 * Register hooks and services.
	 *
	 * @return void
	 */
	public function boot();

} // end interface Module_Contract;
