<?php
/**
 * Component registry for metabox-builder.
 *
 * @package WPDevFramework\Modules\MetaboxBuilder
 * @since   2.4.0
 */

namespace WPDevFramework\Modules\MetaboxBuilder;

use WPDevFramework\Core\Contracts\Component_Registry_Contract;
use WPDevFramework\Core\Traits\Delegates_Component_Registry;

defined( 'ABSPATH' ) || exit;

/**
 * Registers builder components for metabox-builder.
 */
class Component_Registry implements Component_Registry_Contract {

	use Delegates_Component_Registry;

	/**
	 * {@inheritdoc}
	 */
	protected static function registry_module_id() {

		return 'metabox-builder';

	} // end registry_module_id;

} // end class Component_Registry;
