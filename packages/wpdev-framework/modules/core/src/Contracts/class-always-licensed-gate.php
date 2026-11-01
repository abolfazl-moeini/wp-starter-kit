<?php
/**
 * Open-core license gate — all local features available without a commercial client.
 *
 * @package WPDevFramework\Core\Contracts
 * @since   2.10.0
 */

namespace WPDevFramework\Core\Contracts;

defined( 'ABSPATH' ) || exit;

if ( class_exists( __NAMESPACE__ . '\Always_Licensed_Gate', false ) ) {
	return;
}

/**
 * Default License_Gate for slim / WordPress.org builds.
 */
class Always_Licensed_Gate implements License_Gate {

	/**
	 * {@inheritdoc}
	 */
	public function is_licensed() {

		/**
		 * Filter license gate result (e.g. tests, staging).
		 *
		 * @since 2.5.0
		 *
		 * @param bool|null $licensed Override, or null to use default.
		 */
		$override = apply_filters( 'wpdev_license_is_licensed', null );

		if ( null !== $override ) {
			return (bool) $override;
		}

		return true;

	} // end is_licensed;

} // end class Always_Licensed_Gate;
