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

		// [P1-2 FIX] Wire register_forms hook so subclasses can register
		// wubox modal forms on CPT edit screens, matching Base_Admin_Page behavior.
		add_action( 'wpdev_register_forms', [ $this, 'register_forms' ] );

		if ( did_action( 'wpdev_register_forms' ) ) {
			$this->register_forms();
		}
	}

	/**
	 * Register modal forms for this edit page.
	 * Override in subclasses to register wubox forms.
	 *
	 * @since 2.14.0
	 * @return void
	 */
	public function register_forms() {
		// Override in subclasses.
	}

	public function register_meta_boxes( $post_type ) {

		if ( in_array( $post_type, $this->post_types(), true ) ) {

			// [P1-1 FIX] Ensure wubox + vue-apps are loaded on CPT edit screens.
			// wpdev_page_load only fires on Base_Admin_Page instances, but CPT edit
			// screens use Post_Edit_Admin_Page which does not extend Base_Admin_Page.
			// wpdev-vue-apps depends on wubox, so enqueuing it brings wubox automatically.
			if ( class_exists( '\WPDevFramework\Scripts' ) ) {
				\WPDevFramework\Scripts::ensure_defaults_registered();
			}
			wp_enqueue_style( 'wpdev-styling' );
			wp_enqueue_style( 'wpdev-admin' );
			wp_enqueue_script( 'wpdev-vue-apps' );

			// Hydrate the edited model before widgets call get_object().
			$this->get_object();
			$this->edit = is_object( $this->object ) && method_exists( $this->object, 'exists' )
				? (bool) $this->object->exists()
				: false;

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
	 * Returns the model for the current WordPress post being edited.
	 *
	 * @since 2.8.4
	 * @return \WPDevFramework\Models\Post_Base_Model
	 */
	public function get_object() {

		if ( is_object( $this->object ) ) {
			return $this->object;
		}

		$post_id = 0;

		if ( isset( $_GET['post'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			$post_id = absint( wp_unslash( $_GET['post'] ) ); // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		} elseif ( isset( $_POST['post_ID'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Missing
			$post_id = absint( wp_unslash( $_POST['post_ID'] ) ); // phpcs:ignore WordPress.Security.NonceVerification.Missing
		}

		$post = $post_id ? get_post( $post_id ) : null;

		if ( ! ( $post instanceof \WP_Post ) ) {
			$post = isset( $GLOBALS['post'] ) && $GLOBALS['post'] instanceof \WP_Post
				? $GLOBALS['post']
				: null;
		}

		if ( $post instanceof \WP_Post ) {
			$this->object = new \WPDevFramework\Models\Post_Base_Model(
				array(
					'id'            => (int) $post->ID,
					'date_created'  => $post->post_date,
					'date_modified' => $post->post_modified,
					'title'         => $post->post_title,
					'name'          => $post->post_title,
					'content'       => $post->post_content,
					'excerpt'       => $post->post_excerpt,
					'status'        => $post->post_status,
					'type'          => $post->post_type,
					'author_id'     => (int) $post->post_author,
				)
			);
		} else {
			$this->object = new \WPDevFramework\Models\Post_Base_Model();
		}

		return $this->object;

	} // end get_object;

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
