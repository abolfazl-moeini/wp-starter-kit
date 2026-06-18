<?php
/**
 * View / template service.
 *
 * @package WPDevFramework\Core\Services
 * @since   2.4.0
 */

namespace WPDevFramework\Core\Services;

use WPDevFramework\Core\Contracts\View_Service_Contract;
use WPDevFramework\Core\Module_View_Registry;

defined( 'ABSPATH' ) || exit;

/**
 * Boots template helpers and exposes render API.
 */
class View_Service implements View_Service_Contract {

	/**
	 * {@inheritdoc}
	 */
	public function id() {

		return 'view';

	} // end id;

	/**
	 * {@inheritdoc}
	 */
	public function boot() {

		require_once dirname( __DIR__ ) . '/view/template-functions.php';
		require_once dirname( __DIR__ ) . '/view/class-views.php';

		\WPDevFramework\Views::get_instance();

	} // end boot;

	/**
	 * {@inheritdoc}
	 */
	public function render( $view, $args = array(), $default_view = false ) {

		wpdev_get_template( $view, $args, $default_view );

	} // end render;

	/**
	 * {@inheritdoc}
	 */
	public function render_contents( $view, $args = array(), $default_view = false ) {

		return wpdev_get_template_contents( $view, $args, $default_view );

	} // end render_contents;

	/**
	 * Resolve absolute path for a view (for module overrides).
	 *
	 * @since 2.5.0
	 *
	 * @param string $view View slug.
	 * @return string
	 */
	public function locate( $view ) {

		$module_template = Module_View_Registry::locate( $view );

		if ( $module_template ) {
			return $module_template;
		}

		$dir      = wpdev_path( 'views' );
		$template = "$dir/$view.php";

		/**
		 * Filter resolved template path before include.
		 *
		 * @since 2.5.0
		 *
		 * @param string $template Absolute path.
		 * @param string $view     View slug.
		 */
		return (string) apply_filters( 'wpdev_view_locate', $template, $view );

	} // end locate;

} // end class View_Service;
