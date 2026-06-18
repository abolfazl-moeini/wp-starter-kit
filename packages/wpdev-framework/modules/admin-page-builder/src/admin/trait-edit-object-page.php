<?php
/**
 * Shared edit-page state and save/delete pipeline for admin and post edit screens.
 *
 * @package WPDevFramework\Admin_Pages
 * @since   2.5.0
 */

namespace WPDevFramework\Admin_Pages;

defined( 'ABSPATH' ) || exit;

/**
 * Edit object page behaviors shared by Edit_Admin_Page and Post_Edit_Admin_Page.
 */
trait Edit_Object_Page {

	/**
	 * Object slug used in hooks and nonces (e.g. product).
	 *
	 * @var string
	 */
	public $object_id;

	/**
	 * Model instance being edited.
	 *
	 * @var object
	 */
	public $object;

	/**
	 * Validation errors for the current request.
	 *
	 * @var \WP_Error|null
	 */
	protected $errors;

	/**
	 * Returns the errors bag for this page.
	 *
	 * @return \WP_Error
	 */
	public function get_errors() {

		if ( null === $this->errors ) {
			$this->errors = new \WP_Error();
		}

		return $this->errors;

	} // end get_errors;

	/**
	 * Handles saves after nonce verification.
	 *
	 * @return void
	 */
	final public function process_save() {

		$saving_tag = "saving_{$this->object_id}";

		if ( ! isset( $_REQUEST[ $saving_tag ] ) ) {
			return;
		}

		check_admin_referer( $saving_tag, '_wpdev_nonce' );

		/** @noinspection PhpUndefinedMethodInspection */
		do_action( "wpdev_save_{$this->object_id}", $this );

		$status = $this->handle_save();

		if ( $status ) {
			exit;
		}

	} // end process_save;

	/**
	 * Handles delete after nonce verification.
	 *
	 * @return void
	 */
	final public function process_delete() {

		$deleting_tag = "deleting_{$this->object_id}";

		if ( ! isset( $_REQUEST[ $deleting_tag ] ) ) {
			return;
		}

		check_admin_referer( $deleting_tag, 'delete_wpdev_nonce' );

		do_action( "wpdev_delete_{$this->object_id}" );

		$this->handle_delete();

	} // end process_delete;

} // end trait Edit_Object_Page;
