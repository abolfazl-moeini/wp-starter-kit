<?php
/**
 * WPDev User_Switching
 *
 * Log string messages to a file with a timestamp. Useful for debugging.
 *
 * @package WPDev
 * @subpackage User_Switching
 * @since 2.0.0
 */

namespace WPDevFramework;

// Exit if accessed directly
defined('ABSPATH') || exit;

/**
 * WPDev User_Switching
 *
 * @since 2.0.0
 */
class User_Switching {

	use \WPDevFramework\Traits\Singleton;

	/**
	 * Constructor for the User_Switching.
	 */
	public function __construct() {

		add_action('plugins_loaded', array($this, 'register_forms'));

	} // end __construct;
	/**
	 * Check if Plugin User Switching is activated
	 *
	 * @since 2.0.0
	 */
	public function check_user_switching_is_activated(): bool {

		return class_exists('user_switching');

	} // end check_user_switching_is_activated;

	/**
	 * Register forms
	 *
	 * @since 2.0.0
	 *
	 * @return void
	 */
	public function register_forms() {

		wpdev_register_form('install_user_switching', array(
			'render' => array($this, 'render_install_user_switching'),
		));

	} // end register_forms;

	/**
	 * Create Install Form of User Switching
	 *
	 * @since 2.0.0
	 *
	 * @return void
	 */
	public function render_install_user_switching() {

		$fields = array(
			'title' => array(
				'type'          => 'text-display',
				'title'         => '',
				'display_value' => __('This feature requires the plugin <strong>User Switching</strong> to be installed and active.', 'wpdev'),
				'tooltip'       => '',
			),
			'link'  => array(
				'type'            => 'link',
				'display_value'   => __('Install User Switching', 'wpdev'),
				'classes'         => 'button button-primary wpdev-w-full',
				'wrapper_classes' => 'wpdev-items-end wpdev-text-center wpdev-bg-gray-100',
				'html_attr'       => array(
					'href' => add_query_arg(array(
						's'    => 'user-switching',
						'tab'  => 'search',
						'type' => 'tag'
					), network_admin_url('plugin-install.php')
					),
				),
			),
		);

		$form = new \WPDevFramework\UI\Form('install_user_switching', $fields, array(
			'views'                 => 'admin-pages/fields',
			'classes'               => 'wpdev-modal-form wpdev-widget-list wpdev-striped wpdev-m-0 wpdev-mt-0',
			'field_wrapper_classes' => 'wpdev-w-full wpdev-box-border wpdev-items-center wpdev-flex wpdev-justify-between wpdev-p-4 wpdev-m-0 wpdev-border-t wpdev-border-l-0 wpdev-border-r-0 wpdev-border-b-0 wpdev-border-gray-300 wpdev-border-solid',
			'html_attr'             => array(),
		));

		$form->render();

	} // end render_install_user_switching;

	/**
	 * This function return should return the correct url
	 *
	 * @since 2.0.0
	 *
	 * @param int $user_id User Id.
	 *
	 * @return string
	 */
	public function render($user_id) {

		$user = new \WP_User($user_id);

		if (!$this->check_user_switching_is_activated()) {

			return wpdev_get_form_url('install_user_switching');

		} else {

			$link = \user_switching::switch_to_url($user);

			return $link;

		} // end if;

	}  // end render;

} // end class User_Switching;
