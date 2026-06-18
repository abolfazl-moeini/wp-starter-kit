<?php
/**
 * Jumper command public API.
 *
 * @package WPDevFramework\Modules\AdminWidgetBuilder
 * @since   2.8.0
 */

use WPDevFramework\Modules\AdminWidgetBuilder\Jumper_Command_Registry;
use WPDevFramework\Modules\AdminWidgetBuilder\Jumper_Namespace_Registry;

defined( 'ABSPATH' ) || exit;

/**
 * Register a Jumper command.
 *
 * @since 2.8.0
 *
 * @param string               $id      Command id.
 * @param array<string, mixed> $config  Command config.
 * @param bool                 $replace Replace existing id.
 * @return bool
 */
function wpdev_register_jumper_command( $id, array $config = array(), $replace = true ) {

	return Jumper_Command_Registry::register( $id, $config, $replace );

} // end wpdev_register_jumper_command;

/**
 * Get a registered Jumper command.
 *
 * @since 2.8.0
 *
 * @param string $id Command id.
 * @return array<string, mixed>|null
 */
function wpdev_get_jumper_command( $id ) {

	return Jumper_Command_Registry::get( $id );

} // end wpdev_get_jumper_command;

/**
 * Whether a Jumper command is registered.
 *
 * @since 2.8.0
 *
 * @param string $id Command id.
 * @return bool
 */
function wpdev_has_jumper_command( $id ) {

	return Jumper_Command_Registry::has( $id );

} // end wpdev_has_jumper_command;

/**
 * List all registered Jumper commands.
 *
 * @since 2.8.0
 *
 * @return array<string, array<string, mixed>>
 */
function wpdev_list_jumper_commands() {

	return Jumper_Command_Registry::all_commands();

} // end wpdev_list_jumper_commands;

/**
 * Unregister a Jumper command.
 *
 * @since 2.8.0
 *
 * @param string $id Command id.
 * @return void
 */
function wpdev_unregister_jumper_command( $id ) {

	Jumper_Command_Registry::unregister( $id );

} // end wpdev_unregister_jumper_command;

/**
 * Register a Jumper namespace.
 *
 * @since 2.8.0
 *
 * @param string               $id      Namespace id.
 * @param array<string, mixed> $config  Namespace config.
 * @param bool                 $replace Replace existing id.
 * @return bool
 */
function wpdev_register_jumper_namespace( $id, array $config = array(), $replace = true ) {

	return Jumper_Namespace_Registry::register( $id, $config, $replace );

} // end wpdev_register_jumper_namespace;

/**
 * Get a registered Jumper namespace.
 *
 * @since 2.8.0
 *
 * @param string $id Namespace id.
 * @return array<string, mixed>|null
 */
function wpdev_get_jumper_namespace( $id ) {

	return Jumper_Namespace_Registry::get( $id );

} // end wpdev_get_jumper_namespace;

/**
 * List all registered Jumper namespaces.
 *
 * @since 2.8.0
 *
 * @return array<string, array<string, mixed>>
 */
function wpdev_list_jumper_namespaces() {

	return Jumper_Namespace_Registry::all_namespaces();

} // end wpdev_list_jumper_namespaces;
