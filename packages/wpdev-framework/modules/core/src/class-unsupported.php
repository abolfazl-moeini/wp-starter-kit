<?php
/**
 * Manages WPDev v1 Unsupported notices and other checks.
 *
 * @package WPDev
 * @subpackage Unsupported
 * @since 2.0.5
 */

namespace WPDevFramework;

use WPDevFramework\Installers\Migrator;

// Exit if accessed directly
defined('ABSPATH') || exit;

/**
 * Manages WPDev v1 Unsupported notices and other checks.
 *
 * @since 2.0.5
 */
class Unsupported {

	/**
	 * Keeps track of add-ons that if left activated would cause WPDev to crash.
	 *
	 * @var array
	 */
	protected static $unloaded = array();

	/**
	 * Keeps track of add-ons that although supported, can be upgraded.
	 *
	 * @var array
	 */
	protected static $upgradeable = array();

	/**
	 * Keeps track of add-ons that need a upgrader check install created for them.
	 *
	 * @var array
	 */
	protected static $to_upgrade = array();

	/**
	 * Initializes the checks and warning messages.
	 *
	 * @since 2.0.5
	 * @return void
	 */
	public static function init() {

		add_action('plugins_loaded', array('\WPDevFramework\Unsupported', 'unload_unsupported_addons'), 0);

		add_action('plugins_loaded', array('\WPDevFramework\Unsupported', 'force_updater'), 20);

		add_action('in_admin_header', array('\WPDevFramework\Unsupported', 'maybe_add_notices'), 0);

	} // end init;

	/**
	 * Unloads add-ons that are no longer supported, when possible.
	 *
	 * @since 2.0.5
	 * @return void
	 */
	public static function unload_unsupported_addons() {

		/**
		 * List of unsupported add-ons.
		 *
		 * The key is a class to check for the existence of the old add-on.
		 * The value is an array that contains the info about the callback that registers the add-on code,
		 * followed by a boolean flag that let's us know if there's a upload available.
		 *
		 * For historical reasons, we'll override keys as versions progress,
		 * just so we can have a timeline of feature parity for future comparison.
		 *
		 * @since 2.0.5 Original list.
		 */
		$unsupported_v1_addons = array(

			/*
			 * @since 2.0.5
			 */
			'\WPDev_WC'            => array('plugins_loaded', 'wpdev_wc_init', 10, true),
			'\wpdev_Multiple_Logins'      => false,
			'\WPDev_Blocks'        => array('plugins_loaded', 'WPDev_blocks_init', 20, false),
			'\wpdev_Domain_Seller' => array('plugins_loaded', 'wpdev_domain_seller_init', 1, false),
			'\WPDev_PS_Migrator'   => array('plugins_loaded', 'wpdev_ps_migrator_init', 1, false),
		);

		/**
		 * List of supported add-ons with upgrades available.
		 *
		 * @since 2.0.5
		 */
		$supported_but_upgradable = array(
			'\WPDev_PTM',
		);

		foreach ($unsupported_v1_addons as $base_class => $init_info) {

			if (class_exists($base_class)) {

				list($hook, $function, $priority, $upgradeable) = $init_info;

				self::$unloaded[] = $base_class;

				if ($hook) {

					remove_action($hook, $function, $priority);

				} // end if;

				if ($upgradeable) {

					self::$to_upgrade[] = $base_class;

				} // end if;

			} // end if;

		} // end foreach;

		foreach ($supported_but_upgradable as $base_class) {

			if (class_exists($base_class)) {

				self::$upgradeable[] = $base_class;

				self::$to_upgrade[] = $base_class;

			} // end if;

		} // end foreach;

	} // end unload_unsupported_addons;

	/**
	 * Install the newer version of the plugin updater for add-ons that can already be updated.
	 *
	 * @since 2.0.5
	 * @return void
	 */
	public static function force_updater() {

		global $pagenow;

		if ($pagenow !== 'plugins.php') {

			return;

		}

		if ( wpdev()->is_loaded() === false || !is_network_admin()) {

			return;

		} // end if;

		$license_key = \WPDevFramework\License::get_instance()->get_license_key();

		if (!$license_key) {

			return;

		} // end if;

		foreach (self::$to_upgrade as $addon_to_upgrade) {

			$info = self::replace_with($addon_to_upgrade);

			if ($info && wpdev_get_isset($info, 'slug', false)) {

				try {

					$url = add_query_arg(array(
						'action'       => 'get_metadata',
						'slug'         => $info['slug'],
						'beta_program' => 2,
					), 'https://versions.wpdev.ir/updates/');

					$url = wpdev_with_license_key($url);

					$guess_plugin_path = WP_PLUGIN_DIR . '/' . $info['slug'] . '/' . $info['slug'] . '.php';

					if (file_exists($guess_plugin_path)) {

						$checker = \Puc_v4_Factory::buildUpdateChecker($url, $guess_plugin_path, $info['slug']);

					} // end if;

				} catch (\Throwable $exception) {

					// Nothing to do.

				} // end try;

			} // end if;

		} // end foreach;

	} // end force_updater;

	/**
	 * Maybe add necessary admin notices about installing WPDev version 2.
	 *
	 * @since 2.0.5
	 * @return void
	 */
	public static function maybe_add_notices() {

		if (wpdev_request('page') === 'wpdev-setup') {

			return;

		} // end if;

		$message = array();

		$plugins_page_a = sprintf('<a href="%s">%s</a>', network_admin_url('plugins.php'), __('plugins', 'wpdev'));

		/**
		 *  Firstly, lets check if we already run the migration.
		 *  We found some cases that the migration not worked as expected and the option checked in Migrator::is_migration_done()
		 *  is not added. So for this verification we also need to see if we already run the setup.
		 */
		if (Migrator::is_migration_done() === false && Requirements::run_setup() === false) {

			$message[] = '<p>' . __('It seems that you have not run the WPDev upgrader yet. That is the first thing we need to do.', 'wpdev') . '</p>';

			$message[] = sprintf('<a class="button" href="%s">%s</a>', network_admin_url('admin.php?page=wpdev-setup'), __('Visit the Installer to finish the upgrade &rarr;', 'wpdev'));

		} // end if;

		if (count(self::$unloaded) > 0) {

			if ($message) {

				$message[] = '<hr style="margin: 18px 0 10px 0;">';

			} // end if;

			$message[] = '<p>' . __('To make sure you do not experience any crashes on your network, we checked the add-ons installed and deactivated the ones that could cause problems in their currently installed version - or that are no longer supported.', 'wpdev') . '</p><p>' . __('These add-ons include:', 'wpdev') . '</p><ol>';

			foreach (self::$unloaded as $unloaded_addon) {

				$info = self::replace_with($unloaded_addon);

				if ($info) {

					$desc = sprintf($info['desc'], $plugins_page_a);

					$message[] = sprintf('<li><strong>%s</strong>: %s</li>', $info['name'], $desc);

				} // end if;

			} // end foreach;

			$message[] = '</ol>';

		} // end if;

		if (count(self::$upgradeable) > 0) {

			$message[] = '<p>' . __('Other add-ons that you have installed at the moment are still supported, but have new versions with full compatibility with version 2.0:', 'wpdev') . '</p><ol>';

			foreach (self::$upgradeable as $upgradeable_addon) {

				$info = self::replace_with($upgradeable_addon);

				if ($info) {

					$desc = sprintf($info['desc'], $plugins_page_a);

					$message[] = sprintf('<li><strong>%s</strong>: %s</li>', $info['name'], $desc);

				} // end if;

			} // end foreach;

			$message[] = '</ol>';

		} // end if;

		if (empty($message)) {

			return;

		} // end if;

		if ($message && count($message) === 2) {

			$message[] = '<div style="height: 12px;">&nbsp;</div>';

		} // end if;

		$message = array_merge(array('<p>' . __('<strong>Thanks for updating to WPDev version 2.0</strong>!', 'wpdev') . '</p>'), $message);

		$message = implode('', $message);

		if (wpdev()->is_loaded()) {

			wpdev()->notices->add($message, 'warning', 'network-admin');

		} else {

			self::fallback_admin_notice_display($message, 'warning');

		} // end if;

	} // end maybe_add_notices;

	/**
	 * A fallback way to display admin notices when WPDev is not fully loaded yet.
	 *
	 * @since 2.0.5
	 *
	 * @param string $message The message to display.
	 * @param string $type The type of notice. Defaults to warning.
	 * @return void
	 */
	public static function fallback_admin_notice_display($message, $type = 'warning') {

		printf('<div class="notice notice-%s">%s</div>', $type, $message);

	} // end fallback_admin_notice_display;

	/**
	 * Keeps a list of useful info for the add-ons that needed change.
	 *
	 * @since 2.0.5
	 *
	 * @param string $addon The addon to get the info for.
	 * @return array
	 */
	public static function replace_with($addon) {

		$replace_with = array(
			'\WPDev_WC'            => array(
				'name'        => __('WooCommerce Integration', 'wpdev'),
				'replacement' => 'update',
				'slug'        => 'wpdev-woocommerce',
				'version'     => '2.0.0',
				// translators: %s is a link to the plugins page.
				'desc'        => __('A new version with full support for WPDev 2.0 is already out. An update will appear on your %s page.', 'wpdev'),
			),
			'\WPDev_PTM'           => array(
				'name'        => __('Plugin and Theme Manager', 'wpdev'),
				'replacement' => 'update',
				'slug'        => 'wpdev-plugin-and-theme-manager',
				'version'     => '2.0.0',
				// translators: %s is a link to the plugins page.
				'desc'        => __('Although still supported, a new version fully compatible with WPDev 2.0 is available. An update will appear on your %s page.', 'wpdev'),
			),
			'\wpdev_Multiple_Logins'      => array(
				'name'        => __('Multiple Accounts', 'wpdev'),
				'replacement' => 'core',
				'version'     => '2.0.0',
				'desc'        => __('Multiple Accounts is now part of WPDev core. It needs to be activated on WPDev → Settings → Login and Registration, though. You can safely remove this add-on after turning the new option on.', 'wpdev'),
			),
			'\WPDev_Blocks'        => array(
				'name'        => __('Blocks', 'wpdev'),
				'replacement' => 'core',
				'version'     => '2.0.0',
				// translators: %s is a link to the plugins page.
				'desc'        => __('Blocks are now part of WPDev core, although with different blocks available. You can safely delete this add-on on your %s page.', 'wpdev'),
			),
			'\wpdev_Domain_Seller' => array(
				'name'        => __('Domain Seller', 'wpdev'),
				'replacement' => 'soon',
				'version'     => '2.0.0',
				'desc'        => __('A new version of Domain Seller is coming out soon with full support for 2.0', 'wpdev'),
			),
			'\WPDev_PS_Migrator'   => array(
				'name'        => __('Pro Sites Migrator', 'wpdev'),
				'replacement' => 'not-planned',
				'version'     => false,
				'desc'        => __('There are no plans to release a new version of Pro Sites Migrator at the moment.', 'wpdev'),
			),
		);

		return wpdev_get_isset($replace_with, $addon, false);

	} // end replace_with;

} // end class Unsupported;
