<?php
/**
 * Component registry for admin-widget-builder.
 *
 * @package WPDevFramework\Modules\AdminWidgetBuilder
 * @since   2.4.0
 */

namespace WPDevFramework\Modules\AdminWidgetBuilder;

use WPDevFramework\Core\Contracts\Component_Registry_Contract;
use WPDevFramework\Core\Traits\Delegates_Component_Registry;

defined( 'ABSPATH' ) || exit;

/**
 * Registers builder components for admin-widget-builder.
 */
class Component_Registry implements Component_Registry_Contract {

	use Delegates_Component_Registry;

	/**
	 * {@inheritdoc}
	 */
	protected static function registry_module_id() {

		return 'admin-widget-builder';

	} // end registry_module_id;

} // end class Component_Registry;
