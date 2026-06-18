<?php
/**
 * Component registry for tab-navigation.
 *
 * @package WPDevFramework\Modules\TabNavigation
 * @since   2.4.0
 */

namespace WPDevFramework\Modules\TabNavigation;

use WPDevFramework\Core\Contracts\Component_Registry_Contract;
use WPDevFramework\Core\Traits\Delegates_Component_Registry;

defined( 'ABSPATH' ) || exit;

/**
 * Registers builder components for tab-navigation.
 */
class Component_Registry implements Component_Registry_Contract {

	use Delegates_Component_Registry;

	/**
	 * {@inheritdoc}
	 */
	protected static function registry_module_id() {

		return 'tab-navigation';

	} // end registry_module_id;

} // end class Component_Registry;
