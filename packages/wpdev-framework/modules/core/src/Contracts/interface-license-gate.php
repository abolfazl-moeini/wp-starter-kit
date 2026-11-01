<?php
/**
 * Optional gate for features that require an active license.
 *
 * @package WPDevFramework\Core\Contracts
 * @since   2.5.0
 */

namespace WPDevFramework\Core\Contracts;

defined( 'ABSPATH' ) || exit;

if ( interface_exists( __NAMESPACE__ . '\License_Gate', false ) ) {
	return;
}

/**
 * License gate contract (decouples form/UI registration from License boot order).
 */
interface License_Gate {

	/**
	 * Whether the current install has an active license.
	 *
	 * @return bool
	 */
	public function is_licensed();

} // end interface License_Gate;
