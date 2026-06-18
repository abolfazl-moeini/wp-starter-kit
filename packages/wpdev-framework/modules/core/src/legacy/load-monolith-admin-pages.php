<?php
/**
 * Legacy monolith admin page registration (rollback only).
 *
 * @package WPDevFramework\Core\Legacy
 * @since   2.5.0
 */

defined( 'ABSPATH' ) || exit;

/**
 * Instantiate admin pages from the pre-2.4 monolith list.
 *
 * Enabled only when `wpdev_load_monolith_admin_pages` filter is true.
 *
 * @return void
 */
function wpdev_load_legacy_monolith_admin_pages() {

	new \WPDevFramework\Admin_Pages\Checkout_Form_List_Admin_Page();
	new \WPDevFramework\Admin_Pages\Checkout_Form_Edit_Admin_Page();
	new \WPDevFramework\Admin_Pages\Product_List_Admin_Page();
	new \WPDevFramework\Admin_Pages\Product_Edit_Admin_Page();
	new \WPDevFramework\Admin_Pages\Membership_List_Admin_Page();
	new \WPDevFramework\Admin_Pages\Membership_Edit_Admin_Page();
	new \WPDevFramework\Admin_Pages\Payment_List_Admin_Page();
	new \WPDevFramework\Admin_Pages\Payment_Edit_Admin_Page();
	new \WPDevFramework\Admin_Pages\Customer_List_Admin_Page();
	new \WPDevFramework\Admin_Pages\Customer_Edit_Admin_Page();
	new \WPDevFramework\Admin_Pages\Site_List_Admin_Page();
	new \WPDevFramework\Admin_Pages\Site_Edit_Admin_Page();
	new \WPDevFramework\Admin_Pages\Domain_List_Admin_Page();
	new \WPDevFramework\Admin_Pages\Domain_Edit_Admin_Page();
	new \WPDevFramework\Admin_Pages\Discount_Code_List_Admin_Page();
	new \WPDevFramework\Admin_Pages\Discount_Code_Edit_Admin_Page();
	new \WPDevFramework\Admin_Pages\Broadcast_List_Admin_Page();
	new \WPDevFramework\Admin_Pages\Broadcast_Edit_Admin_Page();
	new \WPDevFramework\Admin_Pages\Email_List_Admin_Page();
	new \WPDevFramework\Admin_Pages\Email_Edit_Admin_Page();
	new \WPDevFramework\Admin_Pages\Email_Template_Customize_Admin_Page();
	new \WPDevFramework\Admin_Pages\Invoice_Template_Customize_Admin_Page();
	new \WPDevFramework\Admin_Pages\Template_Previewer_Customize_Admin_Page();
	new \WPDevFramework\Admin_Pages\Hosting_Integration_Wizard_Admin_Page();
	new \WPDevFramework\Admin_Pages\Event_List_Admin_Page();
	new \WPDevFramework\Admin_Pages\Event_View_Admin_Page();
	new \WPDevFramework\Admin_Pages\Webhook_List_Admin_Page();
	new \WPDevFramework\Admin_Pages\Webhook_Edit_Admin_Page();
	new \WPDevFramework\Admin_Pages\Addons_Admin_Page();
	new \WPDevFramework\Admin_Pages\Jobs_List_Admin_Page();
	new \WPDevFramework\Admin_Pages\System_Info_Admin_Page();
	new \WPDevFramework\Admin_Pages\Shortcodes_Admin_Page();
	new \WPDevFramework\Admin_Pages\View_Logs_Admin_Page();
	new \WPDevFramework\Admin_Pages\Customer_Panel\Add_New_Site_Admin_Page();
	new \WPDevFramework\Admin_Pages\Customer_Panel\Checkout_Admin_Page();
	new \WPDevFramework\Admin_Pages\Customer_Panel\Template_Switching_Admin_Page();
	new \WPDevFramework\Tax\Dashboard_Taxes_Tab();

} // end wpdev_load_legacy_monolith_admin_pages;
