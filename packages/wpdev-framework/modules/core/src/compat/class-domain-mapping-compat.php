<?php
/**
 * General Compatibility Layer
 *
 * Handles General Support
 *
 * @package WPDev
 * @subpackage Compat/Domain_Mapping_Compat
 * @since 2.0.0
 */

namespace WPDevFramework\Compat;

// Exit if accessed directly
defined('ABSPATH') || exit;

/**
 * Handles General Support
 *
 * @since 2.0.0
 */
class Domain_Mapping_Compat {

	use \WPDevFramework\Traits\Singleton;

	/**
	 * Instantiate the necessary hooks.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function init() {

	} // end init;

} // end class Domain_Mapping_Compat;
