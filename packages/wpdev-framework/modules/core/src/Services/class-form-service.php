<?php
/**
 * Form service wrapper.
 *
 * @package WPDevFramework\Core\Services
 * @since   2.4.0
 */

namespace WPDevFramework\Core\Services;

use WPDevFramework\Core\Contracts\Service_Contract;
use WPDevFramework\Managers\Form_Manager;

defined( 'ABSPATH' ) || exit;

/**
 * Boots Form_Manager from modules/core and exposes registration API.
 */
class Form_Service implements Service_Contract {

	/**
	 * Legacy form manager.
	 *
	 * @var Form_Manager|null
	 */
	protected $manager;

	/**
	 * {@inheritdoc}
	 */
	public function id() {

		return 'form';

	} // end id;

	/**
	 * {@inheritdoc}
	 */
	public function boot() {

		require_once dirname( __DIR__ ) . '/form/class-form-manager.php';

		$this->manager = Form_Manager::get_instance();

	} // end boot;

	/**
	 * Register a modal/ajax form.
	 *
	 * @param string               $form_id Form id.
	 * @param array<string, mixed> $args    Form configuration.
	 * @return mixed
	 */
	public function register( $form_id, $args = array() ) {

		return $this->manager()->register_form( $form_id, $args );

	} // end register;

	/**
	 * Return the underlying form manager.
	 *
	 * @return Form_Manager
	 */
	public function manager() {

		if ( ! $this->manager ) {
			require_once dirname( __DIR__ ) . '/form/class-form-manager.php';
			$this->manager = Form_Manager::get_instance();
		}

		return $this->manager;

	} // end manager;

} // end class Form_Service;
