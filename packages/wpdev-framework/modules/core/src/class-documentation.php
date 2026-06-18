<?php
/**
 * This helper class allow us to keep our external link references
 * in one place for better control; Links are also filterable;
 *
 * @package WPDev
 * @subpackage Documentation
 * @since 2.0.0
 */

namespace WPDevFramework;

// Exit if accessed directly
defined('ABSPATH') || exit;

/**
 * This helper class allow us to keep our external link references
 * in one place for better control; Links are also filterable;
 *
 * @since 2.0.0
 */
class Documentation {

	use \WPDevFramework\Traits\Singleton;

	/**
	 * Holds the links so we can retrieve them later
	 *
	 * @var array
	 */
	protected $links;

	/**
	 * Holds the default link
	 *
	 * @var string
	 */
	protected $default_link = 'https://help.wpdev.ir/';

	/**
	 * Set the default links.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function init() {

		$links = array();

		// WPDev Dashboard
		$links['wpdev'] = 'https://help.wpdev.ir/en/articles/4803213-understanding-the-wpdev-dashboard';

		// Settings Page
		$links['wpdev-settings'] = 'https://help.wpdev.ir';

		// Checkout Pages
		$links['wpdev-checkout-forms']         = 'https://help.wpdev.ir/en/articles/4803465-checkout-forms';
		$links['wpdev-edit-checkout-form']     = 'https://help.wpdev.ir/en/articles/4803465-checkout-forms';
		$links['wpdev-populate-site-template'] = 'https://help.wpdev.ir/en/articles/4803661-pre-populate-site-template-with-data-from-checkout-forms';

		// Products
		$links['wpdev-products']     = 'https://help.wpdev.ir/en/articles/4803960-managing-your-products';
		$links['wpdev-edit-product'] = 'https://help.wpdev.ir/en/articles/4803960-managing-your-products';

		// Memberships
		$links['wpdev-memberships']     = 'https://help.wpdev.ir/en/articles/4803989-managing-memberships';
		$links['wpdev-edit-membership'] = 'https://help.wpdev.ir/en/articles/4803989-managing-memberships';

		// Payments
		$links['wpdev-payments']     = 'https://help.wpdev.ir/en/articles/4804023-managing-payments-and-invoices';
		$links['wpdev-edit-payment'] = 'https://help.wpdev.ir/en/articles/4804023-managing-payments-and-invoices';

		// WP Config Closte Instructions
		$links['wpdev-closte-config'] = 'https://help.wpdev.ir/en/articles/4807812-setting-the-sunrise-constant-to-true-on-closte';

		// Requirements
		$links['wpdev-requirements'] = 'https://help.wpdev.ir/en/articles/4829561-wpdev-requirements';

		// Installer - Migrator
		$links['installation-errors'] = 'https://help.wpdev.ir/en/articles/4829568-installation-errors';
		$links['migration-errors']    = 'https://help.wpdev.ir/en/articles/4829587-migration-errors';

		// Multiple Accounts
		$links['multiple-accounts'] = 'https://help.wpdev.ir/article/303-accounts-taken-care-of-with-wpdev-multiple-accounts';

		$this->links = apply_filters('wpdev_documentation_links_list', $links);

	} // end init;

	/**
	 * Checks if a link exists.
	 *
	 * @since 2.0.0
	 *
	 * @param  string $slug The slug of the link to be returned.
	 * @return boolean
	 */
	public function has_link($slug) {

		return (bool) $this->get_link($slug, false);

	} // end has_link;

	/**
	 * Retrieves a link registered
	 *
	 * @since 1.7.0
	 * @param  string $slug The slug of the link to be returned.
	 * @param  bool   $return_default If we should return a default value.
	 * @return string
	 */
	public function get_link($slug, $return_default = true) {

		$default = $return_default ? $this->default_link : false;

		$link = wpdev_get_isset($this->links, $slug, $default);

		/**
		 * Allow plugin developers to filter the links.
		 * Not sure how that could be useful, but it doesn't hurt to have it
		 *
		 * @since 1.7.0
		 * @param string $link         The link registered
		 * @param string $slug         The slug used to retrieve the link
		 * @param string $default_link The default link registered
		 */
		return apply_filters('wpdev_documentation_get_link', $link, $slug, $this->default_link);

	} // end get_link;

	/**
	 * Add a new link to the list of links available for reference
	 *
	 * @since 2.0.0
	 * @param string $slug The slug of a new link.
	 * @param string $link The documentation link.
	 * @return void
	 */
	public function register_link($slug, $link) {

		$this->links[$slug] = $link;

	}  // end register_link;

} // end class Documentation;
