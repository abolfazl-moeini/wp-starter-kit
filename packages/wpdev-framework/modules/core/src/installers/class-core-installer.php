<?php
/**
 * WPDev 1.X to 2.X migrator.
 *
 * @package WPDev
 * @subpackage Installers/Core_Installer
 * @since 2.0.0
 */

namespace WPDevFramework\Installers;

use \WPDevFramework\Integrations\Host_Providers\Closte_Host_Provider;

// Exit if accessed directly
defined('ABSPATH') || exit;

/**
 * WPDev 1.X to 2.X migrator.
 *
 * @since 2.0.0
 */
class Core_Installer extends Base_Installer {

	use \WPDevFramework\Traits\Singleton;

	/**
	 * Init hooks to handle edge cases such as Closte.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function init() {

		add_filter('wpdev_core_installer_install_sunrise', function() {

			$is_closte = defined('CLOSTE_CLIENT_API_KEY') && CLOSTE_CLIENT_API_KEY;

			if ($is_closte) {

				if (!(defined('SUNRISE') && SUNRISE)) {

					// translators: %s is a URL to a documentation link.
					$closte_message = sprintf(__('You are using Closte and they prevent the wp-config.php file from being written to. <a href="%s" target="_blank">Follow these instructions to do it manually</a>.'), wpdev_get_documentation_url('wpdev-closte-config'));

					throw new \Exception($closte_message);

				} // end if;

				return true;

			} // end if;

			return false;

		});

	} // end init;

	/**
	 * Returns the list of migration steps.
	 *
	 * @since 2.0.0
	 * @return array
	 */
	public function get_steps() {

		$has_tables_installed = \WPDevFramework\Loaders\Table_Loader::get_instance()->is_installed();

		$steps = array();

		$steps['database_tables'] = array(
			'done'        => $has_tables_installed,
			'title'       => __('Create Database Tables', 'wpdev'),
			'description' => __('WPDev uses custom tables for performance reasons. We need to create those tables and make sure they are setup properly before we can activate the plugin.', 'wpdev'),
			'pending'     => __('Pending', 'wpdev'),
			'installing'  => __('Creating default tables...', 'wpdev'),
			'success'     => __('Success!', 'wpdev'),
			'help'        => wpdev_get_documentation_url('installation-errors'),
		);

		$steps['sunrise'] = array(
			'done'        => defined('SUNRISE') && SUNRISE && defined('WPDEV_SUNRISE_VERSION'),
			'title'       => __('Install <code>sunrise.php</code> File', 'wpdev'),
			'description' => __('We need to add our own sunrise.php file to the wp-content folder in order to be able to control access to sites and plugins before anything else happens on WordPress. ', 'wpdev'),
			'pending'     => __('Pending', 'wpdev'),
			'installing'  => __('Installing sunrise file...', 'wpdev'),
			'success'     => __('Success!', 'wpdev'),
			'help'        => wpdev_get_documentation_url('installation-errors'),
		);

		return $steps;

	}  // end get_steps;

	/**
	 * Installs our custom database tables.
	 *
	 * @since 2.0.0
	 * @throws \Exception When an error occurs during the creation.
	 * @return void
	 */
	public function _install_database_tables() {

		$tables = \WPDevFramework\Loaders\Table_Loader::get_instance()->get_tables();

		foreach ($tables as $table_name => $table) {

			// Exclude native WP tables, as they already exist.
			$exclude_list = array(
				'site_table',
				'sitemeta_table',
			);

			if (in_array($table_name, $exclude_list, true)) {

				continue;

			} // end if;

			$success = $table->install();

			if ($success === false) {

				// translators: %s is the name of a database table, e.g. wpdev_memberships.
				$error_message = sprintf(__('Installation of the table %s failed', 'wpdev'), $table->get_name());

				throw new \Exception($error_message);

			} // end if;

		} // end foreach;

	} // end _install_database_tables;

	/**
	 * Copies the sunrise.php file and adds the SUNRISE constant.
	 *
	 * @since 2.0.0
	 * @throws \Exception When sunrise copying fails.
	 * @return void
	 */
	public function _install_sunrise() {

		$copy = \WPDevFramework\Sunrise::try_upgrade();

		if (is_wp_error($copy)) {

			throw new \Exception($copy->get_error_message());

		} // end if;

		/**
		 * Allow host providers to install the constant differently.
		 *
		 * Returning true will prevent WPDev from trying to write to the wp-config file.
		 *
		 * @since 2.0.0
		 * @param bool $short_circuit
		 */
		$short_circuit = apply_filters('wpdev_core_installer_install_sunrise', false);

		if ($short_circuit) {

			return;

		} // end if;

		$success = \WPDevFramework\Helpers\WP_Config::get_instance()->inject_wp_config_constant('SUNRISE', true);

		if (is_wp_error($success)) {

			throw new \Exception($success->get_error_message());

		} // end if;

	} // end _install_sunrise;

} // end class Core_Installer;
