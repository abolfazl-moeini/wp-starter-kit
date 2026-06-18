<?php
/**
 * Base contract for WPDev core services.
 *
 * @package WPDevFramework\Core\Contracts
 * @since   2.4.0
 */

namespace WPDevFramework\Core\Contracts;

defined( 'ABSPATH' ) || exit;

/**
 * Service contract implemented by all core services.
 */
interface Service_Contract {

	/**
	 * Unique service identifier.
	 *
	 * @return string
	 */
	public function id();

	/**
	 * Boot hooks and listeners for the service.
	 *
	 * @return void
	 */
	public function boot();

} // end interface Service_Contract;
