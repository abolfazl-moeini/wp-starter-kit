<?php
/**
 * Settings section registry.
 *
 * @package WPDevFramework\Modules\SettingsPanelBuilder
 * @since   2.5.0
 */

namespace WPDevFramework\Modules\SettingsPanelBuilder;

use WPDevFramework\Core\Registry_Base;

defined( 'ABSPATH' ) || exit;

/**
 * Registers settings sections and side panels for the settings admin UI.
 */
class Settings_Section_Registry extends Registry_Base {

	/**
	 * Registered sections keyed by slug.
	 *
	 * @var array<string, array<string, mixed>>
	 */
	protected static $sections = array();

	/**
	 * Register a settings section.
	 *
	 * @since 2.5.0
	 *
	 * @param string               $slug   Section slug.
	 * @param array<string, mixed> $config Section config (title, icon, fields, side_panel, etc.).
	 * @return void
	 */
	public static function register( $slug, array $config, $replace = true ) {

		return self::store( self::$sections, $slug, $config, (bool) $replace );

	} // end register;

	/**
	 * Whether a section is registered.
	 *
	 * @since 2.7.0
	 *
	 * @param string $slug Section slug.
	 * @return bool
	 */
	public static function has( $slug ) {

		return null !== self::get( $slug );

	} // end has;

	/**
	 * Unregister a section.
	 *
	 * @since 2.7.0
	 *
	 * @param string $slug Section slug.
	 * @return void
	 */
	public static function unregister( $slug ) {

		unset( self::$sections[ self::sanitize_id( $slug ) ] );

	} // end unregister;

	/**
	 * Reset registry state (unit tests).
	 *
	 * @since 2.7.0
	 *
	 * @return void
	 */
	public static function reset() {

		self::$sections = array();

	} // end reset;

	/**
	 * Get a registered section.
	 *
	 * @since 2.5.0
	 *
	 * @param string $slug Section slug.
	 * @return array<string, mixed>|null
	 */
	public static function get( $slug ) {

		$slug = \sanitize_key( $slug );

		return self::$sections[ $slug ] ?? null;

	} // end get;

	/**
	 * Return all registered sections.
	 *
	 * @since 2.5.0
	 *
	 * @return array<string, array<string, mixed>>
	 */
	public static function all() {

		return self::$sections;

	} // end all;

} // end class Settings_Section_Registry;
