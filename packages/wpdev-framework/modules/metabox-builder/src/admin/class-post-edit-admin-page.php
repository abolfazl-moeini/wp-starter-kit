<?php
/**
 * WPDev Site Edit New Admin Page.
 *
 * @package WPDev
 * @subpackage Admin_Pages
 * @since 2.0.0
 */

namespace WPDevFramework\Admin_Pages;

// Exit if accessed directly
defined('ABSPATH') || exit;

require_once dirname( dirname( __DIR__ ) ) . '/../admin-page-builder/src/admin/trait-edit-object-page.php';
require_once __DIR__ . '/trait-edit-page-widgets.php';

use \WPDevFramework\Database\Sites\Site_Type;
use \WPDevFramework\Models\Site;

/**
 * WPDev Site Edit New Admin Page.
 */
abstract class Post_Edit_Admin_Page {

	use Edit_Object_Page;
	use Edit_Page_Widgets;

	/**
	 * Whether we are editing an existing object (true) or creating one (false).
	 *
	 * @var bool
	 */
	public $edit = false;

	abstract public function post_types(): array;

	public function __construct() {


		add_action( 'add_meta_boxes', [ $this, 'register_meta_boxes' ] );
	}

	public function register_meta_boxes( $post_type ) {

		if(in_array( $post_type, $this->post_types()) ) {

			$this->register_widgets();
		}
	}


	/**
	 * Register additional hooks to page load such as the action links and the save processing.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function page_loaded() {

		$this->edit = $this->object->exists();

		if ( wpdev_request( 'submit_button' ) === 'delete' ) {

			$this->process_delete();

		} else {

			$this->process_save();

		} // end if;

	} // end page_loaded;

	/**
	 * Registers widgets to the edit page.
	 *
	 * This implementation register the default save widget.
	 * Child classes that wish to inherit that widget while registering other,
	 * can do such by adding a parent::register_widgets() to their own register_widgets() method.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function register_widgets() {

		$screen = get_current_screen();

		$this->add_info_widget('info', array(
			'title'    => __('Timestamps', 'wpdev'),
			'position' => 'side-bottom',
		));

		if ($this->edit) {

			$this->add_delete_widget('delete', array());

		} // end if;

	} // end register_widgets;

	/**
	 * Returns the labels to be used on the edit page.
	 *
	 * @since 2.5.0
	 * @return array
	 */
	public function get_labels() {

		$default_labels = array(
			'edit_label'          => __( 'Edit Object', 'wpdev' ),
			'add_new_label'       => __( 'Add New Object', 'wpdev' ),
			'updated_message'     => __( 'Object updated with success!', 'wpdev' ),
			'title_placeholder'   => __( 'Enter Object Name', 'wpdev' ),
			'title_description'   => '',
			'save_button_label'   => __( 'Save', 'wpdev' ),
			'save_description'    => '',
			'delete_button_label' => __( 'Delete', 'wpdev' ),
			'delete_description'  => __( 'Be careful. This action is irreversible.', 'wpdev' ),
		);

		return apply_filters( 'wpdev_edit_admin_page_labels', $default_labels );

	} // end get_labels;

	/**
	 * Displays the contents of the edit page.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function output() {
		/*
		 * Renders the base edit page layout, with the columns and everything else =)
		 */
		wpdev_get_template('base/edit', array(
			'screen' => get_current_screen(),
			'page'   => $this,
			'labels' => $this->get_labels(),
			'object' => $this->get_object(),
		));

	} // end output;


	/**
	 * Should implement the processes necessary to save the changes made to the object.
	 *
	 * @since 2.0.0
	 * @return boolean
	 */
	public function handle_save() {

		$object = $this->get_object();

		/*
		 * Active fix
		 */
		$_POST['active'] = (bool) wpdev_request('active', false);

		$object->attributes($_POST);

		if (method_exists($object, 'handle_limitations')) {

			$object->handle_limitations($_POST); // @phpstan-ignore-line

		} // end if;

		$save = $object->save();

		if (is_wp_error($save)) {

			$errors = implode('<br>', $save->get_error_messages());

			wpdev()->notices->add($errors, 'error', 'network-admin');

			return false;

		} else {

			$array_params = array(
				'updated' => 1,
			);

			if ($this->edit === false) {

				$array_params['id'] = $object->get_id();

				$array_params['wpdev-new-model'] = true;

			} // end if;

			$url = add_query_arg($array_params);

			wp_redirect($url);

			return true;

		} // end if;

	} // end handle_save;

	/**
	 * Should implement the processes necessary to delete  the object.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function handle_delete() {

		$object = $this->get_object();

		$saved = $object->delete();

		if (is_wp_error($saved)) {

			$errors = implode('<br>', $saved->get_error_messages());

			wpdev()->notices->add($errors, 'error', 'network-admin');

			return;
		} // end if;

		$url = str_replace('_', '-', (string) $object->model);
		$url = wpdev_network_admin_url("wpdev-{$url}s");

		wp_redirect($url);

		exit;

	} // end handle_delete;


} // end class Site_Edit_Admin_Page;
