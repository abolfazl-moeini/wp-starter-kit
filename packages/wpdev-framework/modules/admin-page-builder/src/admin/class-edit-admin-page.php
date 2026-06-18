<?php
/**
 * Base admin page class.
 *
 * Abstract class that makes it easy to create new admin pages.
 *
 * Most of WPDev pages are implemented using this class, which means that the filters and hooks
 * listed below can be used to append content to all of our pages at once.
 *
 * @package WPDev
 * @subpackage Admin_Pages
 * @since 2.0.0
 */

namespace WPDevFramework\Admin_Pages;

// Exit if accessed directly
defined('ABSPATH') || exit;

require_once __DIR__ . '/trait-edit-object-page.php';

/*
 * Edit_Page_Widgets (metabox-builder) is resolved on demand via
 * Legacy_Shim_Autoloader (scans modules/metabox-builder/src/admin), so no
 * cross-module require is needed. This keeps admin-page-builder free of a hard
 * file dependency on table-builder/metabox-builder load order.
 */

/**
 * Abstract class that makes it easy to create new admin pages.
 */
abstract class Edit_Admin_Page extends Base_Admin_Page {

	use Edit_Object_Page;
	use Edit_Page_Widgets;

	/**
	 * Register additional hooks to page load such as the action links and the save processing.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function page_loaded() {

		/**
		 * Setups the object
		 */
		$this->object = $this->get_object();

		$this->edit = $this->object->exists();

		/**
		 * Deals with lock statuses.
		 */
		$this->add_lock_notices();

		if (wpdev_request('submit_button') === 'delete') {

			$this->process_delete();

		} elseif (wpdev_request('remove-lock')) {

			$this->remove_lock();

		} else {
			/*
			 * Process save, if necessary
			 */
			$this->process_save();

		} // end if;

	} // end page_loaded;

	/**
	 * Add some other necessary hooks.
	 *
	 * @return void
	 */
	public function hooks() {

		parent::hooks();

		add_filter('removable_query_args', array($this, 'removable_query_args'));

	} // end hooks;

	/**
	 * Adds the wpdev-new-model to the list of removable query args of WordPress.
	 *
	 * @since 2.0.0
	 *
	 * @param array $removable_query_args Existing list of removable query args.
	 * @return array
	 */
	public function removable_query_args($removable_query_args) {

		$removable_query_args[] = 'wpdev-new-model';

		return $removable_query_args;

	} // end removable_query_args;

	/**
	 * Displays lock notices, if necessary.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	protected function add_lock_notices() {

		$locked = $this->get_object()->is_locked();

		if ($locked && $this->edit) {

			// translators: %s is the date, using the site format options
			$message = sprintf(__('This item is locked from editions.<br />This is probably due to a background action being performed (like a transfer between different accounts, for example). You can manually unlock it, but be careful. The lock should be released automatically in %s seconds.', 'wpdev'), wpdev_get_next_queue_run() + 10);

			$actions = array(
				'preview' => array(
					'title' => __('Unlock', 'wpdev'),
					'url'   => add_query_arg(array(
						'remove-lock'           => 1,
						'unlock_wpdev_nonce' => wp_create_nonce(sprintf('unlocking_%s', $this->object_id)),
					)),
				),
			);

			wpdev()->notices->add($message, 'warning', 'network-admin', false, $actions);

		} // end if;

	} // end add_lock_notices;

	/**
	 * Remove the lock from the object.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function remove_lock() {

		$unlock_tag = "unlocking_{$this->object_id}";

		if (isset($_REQUEST['remove-lock'])) {

			check_admin_referer($unlock_tag, 'unlock_wpdev_nonce');

			/**
			 * Allow plugin developers to add actions to the unlocking process.
			 *
			 * @since 1.8.2
			 */
			do_action("wpdev_unlock_{$this->object_id}");

			/**
			 * Unlocks and redirects.
			 */
			$this->get_object()->unlock();

			wp_redirect(remove_query_arg(array(
				'remove-lock',
				'unlock_wpdev_nonce',
			)));

			exit;

		} // end if;

	} // end remove_lock;

	/**
	 * Returns the labels to be used on the admin page.
	 *
	 * @since 2.0.0
	 * @return array
	 */
	public function get_labels() {

		$default_labels = array(
			'edit_label'          => __('Edit Object', 'wpdev'),
			'add_new_label'       => __('Add New Object', 'wpdev'),
			'updated_message'     => __('Object updated with success!', 'wpdev'),
			'title_placeholder'   => __('Enter Object Name', 'wpdev'),
			'title_description'   => '',
			'save_button_label'   => __('Save', 'wpdev'),
			'save_description'    => '',
			'delete_button_label' => __('Delete', 'wpdev'),
			'delete_description'  => __('Be careful. This action is irreversible.', 'wpdev'),
		);

		return apply_filters('wpdev_edit_admin_page_labels', $default_labels);

	} // end get_labels;

	/**
	 * Allow child classes to register scripts and styles that can be loaded on the output function, for example.
	 *
	 * @since 1.8.2
	 * @return void
	 */
	public function register_scripts() {

		parent::register_scripts();

		/*
		 * Enqueue the base Dashboard Scripts
		 */
		wp_enqueue_script('dashboard');

		/*
		 * Adds Vue.
		 */
		wp_enqueue_script('wpdev-vue-apps');

		wp_enqueue_script('wpdev-fields');

		wp_enqueue_style('wp-color-picker');

		wp_enqueue_script('wpdev-selectizer');

	} // end register_scripts;

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
	 * Displays the contents of the edit page.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function output() {
		/*
		 * Renders the base edit page layout, with the columns and everything else =)
		 */
		$template = class_exists( 'WPDev\\Modules\\AdminPageBuilder\\Page_Template_Registry' )
			? \WPDevFramework\Modules\AdminPageBuilder\Page_Template_Registry::resolve( 'edit', 'base/edit' )
			: 'base/edit';

		wpdev_get_template( $template, array(
			'screen' => get_current_screen(),
			'page'   => $this,
			'labels' => $this->get_labels(),
			'object' => $this->get_object(),
		));

	} // end output;

	/**
	 * Wether or not this pages should have a title field.
	 *
	 * @since 2.0.0
	 * @return boolean
	 */
	public function has_title() {

		return false;

	} // end has_title;

	/**
	 * Wether or not this pages should have an editor field.
	 *
	 * @since 2.0.0
	 * @return boolean
	 */
	public function has_editor() {

		return false;

	} // end has_editor;

	/**
	 * Should return the object being edited, or false.
	 *
	 * Child classes need to implement this method, returning an object to be edited,
	 * such as a WPDevFramework\Model, or false, in case this is a 'Add New' page.
	 *
	 * @since 2.0.0
	 * @return \WPDevFramework\Models\Base_Model
	 */
	abstract public function get_object(); // end get_object;

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

} // end class Edit_Admin_Page;
