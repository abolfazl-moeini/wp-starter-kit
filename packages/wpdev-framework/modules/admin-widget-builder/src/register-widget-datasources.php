<?php
/**
 * Widget datasource registration hook (domain modules register their own).
 *
 * @package WPDevFramework\Modules\AdminWidgetBuilder
 * @since   2.6.0
 */

defined( 'ABSPATH' ) || exit;

/**
 * Placeholder for future builder-level datasources only.
 *
 * Domain-specific datasources live in their owning wpdev-* modules.
 *
 * @return void
 */
function wpdev_register_default_widget_datasources() {

	/**
	 * Fires when modules may register widget datasources.
	 *
	 * @since 2.6.0
	 */
	do_action( 'wpdev_register_widget_datasources' );

} // end wpdev_register_default_widget_datasources;
