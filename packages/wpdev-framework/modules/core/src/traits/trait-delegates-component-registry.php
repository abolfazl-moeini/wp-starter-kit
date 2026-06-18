<?php
/**
 * Delegates builder component storage to WPDevFramework\Core\Component_Registry (K8).
 *
 * @package WPDevFramework\Core\Traits
 * @since   2.6.0
 */

namespace WPDevFramework\Core\Traits;

defined( 'ABSPATH' ) || exit;

/**
 * Shared init/register/get/all implementation for module Component_Registry classes.
 */
trait Delegates_Component_Registry {

	/**
	 * Local fallback when core registry is unavailable (tests).
	 *
	 * @var array<string, array<string, mixed>>
	 */
	protected static $components = array();

	/**
	 * Module slug used as the core registry namespace (e.g. form-builder).
	 *
	 * @since 2.6.0
	 *
	 * @return string
	 */
	abstract protected static function registry_module_id();

	/**
	 * Boot registry hooks.
	 *
	 * @since 2.6.0
	 * @return void
	 */
	public static function init() {

		$module = static::registry_module_id();

		if ( class_exists( 'WPDev\\Core\\Component_Registry' ) ) {
			\WPDevFramework\Core\Component_Registry::init( $module );
			return;
		}

		/**
		 * Fires when module components can be registered (fallback).
		 *
		 * @since 2.6.0
		 */
		do_action( "wpdev_{$module}_register" );

	} // end init;

	/**
	 * Register a component.
	 *
	 * @since 2.6.0
	 *
	 * @param string               $id   Component id.
	 * @param array<string, mixed> $args Configuration.
	 * @return void
	 */
	public function register( $id, $args ) {

		$module = static::registry_module_id();

		if ( class_exists( 'WPDev\\Core\\Component_Registry' ) ) {
			\WPDevFramework\Core\Component_Registry::register( $module, $id, $args );
			return;
		}

		self::$components[ $id ] = $args;

	} // end register;

	/**
	 * Get a registered component.
	 *
	 * @since 2.6.0
	 *
	 * @param string $id Component id.
	 * @return array<string, mixed>|null
	 */
	public function get( $id ) {

		$module = static::registry_module_id();

		if ( class_exists( 'WPDev\\Core\\Component_Registry' ) ) {
			return \WPDevFramework\Core\Component_Registry::get( $module, $id );
		}

		return self::$components[ $id ] ?? null;

	} // end get;

	/**
	 * Return all registered components for this module.
	 *
	 * @since 2.6.0
	 *
	 * @return array<string, array<string, mixed>>
	 */
	public static function all() {

		$module = static::registry_module_id();

		if ( class_exists( 'WPDev\\Core\\Component_Registry' ) ) {
			return \WPDevFramework\Core\Component_Registry::all( $module );
		}

		return self::$components;

	} // end all;

} // end trait Delegates_Component_Registry;
