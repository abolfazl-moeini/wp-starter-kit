<?php
/**
 * WPDev 1.X to 2.X migrator.
 *
 * @package WPDev
 * @subpackage Installers/Core_Installer
 * @since 2.0.0
 */

namespace WPDevFramework\Installers;

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

} // end class Core_Installer;
