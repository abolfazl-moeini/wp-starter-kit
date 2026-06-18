<?php
/**
 * Component registry for menu-builder.
 *
 * @package WPDevFramework\Modules\MenuBuilder
 * @since   2.4.0
 */

namespace WPDevFramework\Modules\MenuBuilder;

use WPDevFramework\Core\Contracts\Component_Registry_Contract;
use WPDevFramework\Core\Traits\Delegates_Component_Registry;

defined( 'ABSPATH' ) || exit;

/**
 * Registers builder components for menu-builder.
 */
class Component_Registry implements Component_Registry_Contract {

	use Delegates_Component_Registry;

	/**
	 * {@inheritdoc}
	 */
	protected static function registry_module_id() {

		return 'menu-builder';

	} // end registry_module_id;

} // end class Component_Registry;
