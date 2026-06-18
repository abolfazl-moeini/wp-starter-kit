<?php
/**
 * Component registry for field-builder.
 *
 * @package WPDevFramework\Modules\FieldBuilder
 * @since   2.4.0
 */

namespace WPDevFramework\Modules\FieldBuilder;

use WPDevFramework\Core\Contracts\Component_Registry_Contract;
use WPDevFramework\Core\Traits\Delegates_Component_Registry;

defined( 'ABSPATH' ) || exit;

/**
 * Registers builder components for field-builder.
 */
class Component_Registry implements Component_Registry_Contract {

	use Delegates_Component_Registry;

	/**
	 * {@inheritdoc}
	 */
	protected static function registry_module_id() {

		return 'field-builder';

	} // end registry_module_id;

} // end class Component_Registry;
