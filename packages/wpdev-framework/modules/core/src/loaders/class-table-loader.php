<?php
/**
 * Custom Table Loader
 *
 * Registers our custom tables.
 *
 * @package WPDev
 * @subpackage Loaders
 * @since 2.0.0
 */

namespace WPDevFramework\Loaders;

// Exit if accessed directly
defined('ABSPATH') || exit;

/**
 * Registers our custom tables.
 *
 * @since 2.0.0
 */
class Table_Loader {

	use \WPDevFramework\Traits\Singleton;

	/**
	 * The Domain Mappings Table
	 *
	 * @since 2.2.0
	 * @var \WPDevFramework\Database\Domains\Domains_Table
	 */
	public $domain_table;

	/**
	 * The Products Table
	 *
	 * @since 2.2.0
	 * @var \WPDevFramework\Database\Products\Products_Table
	 */
	public $product_table;

	/**
	 * Loads the Products Meta Table
	 *
	 * @since 2.2.0
	 * @var \WPDevFramework\Database\Products\Products_Meta_Table
	 */
	public $productmeta_table;

	/**
	 * The Discount Codes Table
	 *
	 * @since 2.2.0
	 * @var \WPDevFramework\Database\Discount_Codes\Discount_Codes_Table
	 */
	public $discount_code_table;

	/**
	 * The Discount Codes Meta Table
	 *
	 * @since 2.2.0
	 * @var \WPDevFramework\Database\Discount_Codes\Discount_Codes_Meta_Table
	 */
	public $discount_codemeta_table;

	/**
	 * The Sites Table
	 *
	 * @since 2.2.0
	 * @var \WPDevFramework\Database\Sites\Sites_Table
	 */
	public $site_table;

	/**
	 * The Sites Meta Table
	 *
	 * @since 2.2.0
	 * @var \WPDevFramework\Database\Sites\Sites_Meta_Table
	 */
	public $sitemeta_table;

	/**
	 * The Customer Table
	 *
	 * @since 2.2.0
	 * @var \WPDevFramework\Database\Customers\Customers_Table
	 */
	public $customer_table;

	/**
	 * The Customer Meta Table
	 *
	 * @since 2.2.0
	 * @var \WPDevFramework\Database\Customers\Customers_Meta_Table
	 */
	public $customermeta_table;

	/**
	 * The Memberships Table
	 *
	 * @since 2.2.0
	 * @var \WPDevFramework\Database\Memberships\Memberships_Table
	 */
	public $membership_table;

	/**
	 * The Memberships Meta Table
	 *
	 * @since 2.2.0
	 * @var \WPDevFramework\Database\Memberships\Memberships_Meta_Table
	 */
	public $membershipmeta_table;

	/**
	 * The Payments Table
	 *
	 * @since 2.2.0
	 * @var \WPDevFramework\Database\Payments\Payments_Table
	 */
	public $payment_table;

	/**
	 * The Payments Meta Table
	 *
	 * @since 2.2.0
	 * @var \WPDevFramework\Database\Payments\Payments_Meta_Table
	 */
	public $paymentmeta_table;

	/**
	 * The Posts Table
	 *
	 * @since 2.2.0
	 * @var \WPDevFramework\Database\Posts\Posts_Table
	 */
	public $post_table;

	/**
	 * The Posts Meta Table
	 *
	 * @since 2.2.0
	 * @var \WPDevFramework\Database\Posts\Posts_Meta_Table
	 */
	public $postmeta_table;

	/**
	 * The Webhook Table
	 *
	 * @since 2.2.0
	 * @var \WPDevFramework\Database\Webhooks\Webhooks_Table
	 */
	public $webhook_table;

	/**
	 * The Event Table
	 *
	 * @since 2.2.0
	 * @var \WPDevFramework\Database\Events\Events_Table
	 */
	public $event_table;

	/**
	 * The Checkout Forms Table
	 *
	 * @since 2.2.0
	 * @var \WPDevFramework\Database\Checkout_Forms\Checkout_Forms_Table
	 */
	public $checkout_form_table;

	/**
	 * The Checkout Forms Meta Table
	 *
	 * @since 2.2.0
	 * @var \WPDevFramework\Database\Checkout_Forms\Checkout_Forms_Meta_Table
	 */
	public $checkout_formmeta_table;

	/**
	 * Loads the table objects for our custom tables.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function init() {

		foreach ( \WPDevFramework\Core\Table_Registry::all() as $property => $factory ) {
			$instance = \WPDevFramework\Core\Table_Registry::instantiate( $property );

			if ( null === $instance ) {
				continue;
			}

			if ( property_exists( $this, $property ) ) {
				$this->{$property} = $instance;
			}
		}

		if ( class_exists( 'WPDev\\Database\\Engine\\Meta_Type_Compat' ) ) {
			\WPDevFramework\Database\Engine\Meta_Type_Compat::register();
		}

	} // end init;

	/**
	 * Returns all the table objects.
	 *
	 * @since 2.0.0
	 * @return array
	 */
	public function get_tables() {

		return get_object_vars($this);

	} // end get_tables;

	/**
	 * Checks if we have all the tables installed.
	 *
	 * @since 2.0.0
	 * @return boolean
	 */
	public function is_installed() {

		$all_installed = true;

		$tables = $this->get_tables();

		foreach ( $tables as $table ) {

			if ( ! is_object( $table ) || ! method_exists( $table, 'exists' ) ) {
				continue;
			}

			if ( ! $table->exists() ) {

				$all_installed = false;

			} // end if;

		} // end foreach;

		return $all_installed;

	} // end is_installed;

} // end class Table_Loader;
