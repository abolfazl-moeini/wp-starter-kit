<?php
/**
 * Component registry for table-builder.
 *
 * @package WPDevFramework\Modules\TableBuilder
 * @since   2.4.0
 */

namespace WPDevFramework\Modules\TableBuilder;

use WPDevFramework\Core\Contracts\Component_Registry_Contract;
use WPDevFramework\Core\Traits\Delegates_Component_Registry;

defined( 'ABSPATH' ) || exit;

/**
 * Registers builder components for table-builder.
 */
class Component_Registry implements Component_Registry_Contract {

	use Delegates_Component_Registry;

	/**
	 * {@inheritdoc}
	 */
	protected static function registry_module_id() {

		return 'table-builder';

	} // end registry_module_id;

} // end class Component_Registry;
