<?php
/**
 * Jumper command registry.
 *
 * @package WPDevFramework\Modules\AdminWidgetBuilder
 * @since   2.8.0
 */

namespace WPDevFramework\Modules\AdminWidgetBuilder;

use WPDevFramework\Core\Registry_Base;

defined( 'ABSPATH' ) || exit;

/**
 * Registry for Jumper commands.
 */
class Jumper_Command_Registry extends Registry_Base {

	/**
	 * Registered commands.
	 *
	 * @var array<string, array<string, mixed>>
	 */
	protected static $commands = array();

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
	public static function register( $id, array $config = array(), $replace = true ) {

		$id = self::sanitize_id( $id );

		$normalized = array_merge(
			array(
				'id'         => $id,
				'namespace'  => 'general',
				'title'      => '',
				'type'       => 'link',
				'url'        => '',
				'js_action'  => '',
				'callback'   => null,
				'icon'       => '',
				'keywords'   => array(),
				'capability' => '',
				'priority'   => 100,
			),
			$config
		);

		$normalized['id']         = $id;
		$normalized['namespace']  = self::sanitize_id( $normalized['namespace'] );
		$normalized['title']      = trim( (string) $normalized['title'] );
		$normalized['type']       = 'action' === $normalized['type'] ? 'action' : 'link';
		$normalized['url']        = trim( (string) $normalized['url'] );
		$normalized['js_action']  = trim( (string) $normalized['js_action'] );
		$normalized['icon']       = trim( (string) $normalized['icon'] );
		$normalized['capability'] = trim( (string) $normalized['capability'] );
		$normalized['priority']   = (int) $normalized['priority'];
		$normalized['keywords']   = self::normalize_keywords( $normalized['keywords'] );

		if ( '' === $normalized['namespace'] ) {
			$normalized['namespace'] = 'general';
		}

		if ( '' === $normalized['title'] ) {
			$normalized['title'] = Jumper_Namespace_Registry::humanize_id( str_replace( '/', '-', $id ) );
		}

		if ( ! Jumper_Namespace_Registry::has( $normalized['namespace'] ) ) {
			Jumper_Namespace_Registry::register( $normalized['namespace'] );
		}

		return self::store( self::$commands, $id, $normalized, (bool) $replace );

	} // end register;

	/**
	 * Get a command.
	 *
	 * @since 2.8.0
	 *
	 * @param string $id Command id.
	 * @return array<string, mixed>|null
	 */
	public static function get( $id ) {

		$id = self::sanitize_id( $id );

		return self::$commands[ $id ] ?? null;

	} // end get;

	/**
	 * Whether a command exists.
	 *
	 * @since 2.8.0
	 *
	 * @param string $id Command id.
	 * @return bool
	 */
	public static function has( $id ) {

		return isset( self::$commands[ self::sanitize_id( $id ) ] );

	} // end has;

	/**
	 * List all registered commands.
	 *
	 * @since 2.8.0
	 *
	 * @return array<string, array<string, mixed>>
	 */
	public static function all_commands() {

		return self::$commands;

	} // end all_commands;

	/**
	 * Unregister a command.
	 *
	 * @since 2.8.0
	 *
	 * @param string $id Command id.
	 * @return void
	 */
	public static function unregister( $id ) {

		unset( self::$commands[ self::sanitize_id( $id ) ] );

	} // end unregister;

	/**
	 * Reset registry state (tests).
	 *
	 * @since 2.8.0
	 *
	 * @return void
	 */
	public static function reset() {

		self::$commands = array();

	} // end reset;

	/**
	 * List commands for a namespace.
	 *
	 * @since 2.8.0
	 *
	 * @param string $namespace_id Namespace id.
	 * @return array<string, array<string, mixed>>
	 */
	public static function for_namespace( $namespace_id ) {

		$namespace_id = self::sanitize_id( $namespace_id );

		return array_filter(
			self::$commands,
			static function ( $command ) use ( $namespace_id ) {
				return ( $command['namespace'] ?? '' ) === $namespace_id;
			}
		);

	} // end for_namespace;

	/**
	 * Whether the current user is allowed to see/run a command.
	 *
	 * @since 2.8.0
	 *
	 * @param array<string, mixed> $command Command config.
	 * @return bool
	 */
	public static function is_allowed( array $command ) {

		$capability = trim( (string) ( $command['capability'] ?? '' ) );

		if ( ! function_exists( 'current_user_can' ) ) {
			return true;
		}

		if ( '' === $capability ) {
			$capability = 'manage_network';
		}

		if ( function_exists( 'wpdev_admin_capability_for' ) ) {
			$capability = wpdev_admin_capability_for( $capability );
		}

		return current_user_can( $capability );

	} // end is_allowed;

	/**
	 * Build grouped options for jumper.js localization.
	 *
	 * @since 2.8.0
	 *
	 * @return array<int, array<string, mixed>>
	 */
	public static function grouped() {

		$grouped = array();

		foreach ( self::$commands as $command_id => $command ) {
			if ( ! self::is_allowed( $command ) ) {
				continue;
			}

			$namespace_id = $command['namespace'];
			$namespace    = Jumper_Namespace_Registry::get( $namespace_id );

			if ( ! $namespace ) {
				$namespace = array(
					'id'       => $namespace_id,
					'plugin'   => 'WPDev',
					'label'    => Jumper_Namespace_Registry::humanize_id( $namespace_id ),
					'icon'     => '',
					'priority' => 100,
				);
			}

			$group_value = 'jumper-ns-' . $namespace_id;
			$group_label = sprintf( '%s · %s', $namespace['plugin'], $namespace['label'] );

			if ( ! isset( $grouped[ $group_value ] ) ) {
				$grouped[ $group_value ] = array(
					'value'    => $group_value,
					'label'    => $group_label,
					'priority' => (int) $namespace['priority'],
					'commands' => array(),
				);
			}

			$grouped[ $group_value ]['commands'][] = array(
				'id'            => $command_id,
				'value'         => 'jumper-command:' . $command_id,
				'group'         => $group_value,
				'group_label'   => $group_label,
				'namespace'     => $namespace_id,
				'plugin'        => $namespace['plugin'],
				'section'       => $namespace['label'],
				'model'         => 'jumper-command',
				'type'          => $command['type'],
				'title'         => $command['title'],
				'text'          => $command['title'],
				'url'           => $command['url'],
				'js_action'     => $command['js_action'],
				'server_action' => is_callable( $command['callback'] ),
				'icon'          => $command['icon'],
				'keywords'      => $command['keywords'],
				'priority'      => (int) $command['priority'],
			);
		}

		foreach ( $grouped as $group_key => $group ) {
			usort(
				$group['commands'],
				static function ( $left, $right ) {
					$left_priority  = (int) ( $left['priority'] ?? 100 );
					$right_priority = (int) ( $right['priority'] ?? 100 );

					if ( $left_priority === $right_priority ) {
						return strcmp( (string) $left['title'], (string) $right['title'] );
					}

					return $left_priority <=> $right_priority;
				}
			);

			$grouped[ $group_key ] = $group;
		}

		$grouped = array_values( $grouped );

		usort(
			$grouped,
			static function ( $left, $right ) {
				$left_priority  = (int) ( $left['priority'] ?? 100 );
				$right_priority = (int) ( $right['priority'] ?? 100 );

				if ( $left_priority === $right_priority ) {
					return strcmp( (string) $left['label'], (string) $right['label'] );
				}

				return $left_priority <=> $right_priority;
			}
		);

		return $grouped;

	} // end grouped;

	/**
	 * Normalize keywords into a unique lowercase list.
	 *
	 * @since 2.8.0
	 *
	 * @param mixed $keywords Keyword value.
	 * @return array<int, string>
	 */
	protected static function normalize_keywords( $keywords ) {

		$keywords = is_array( $keywords ) ? $keywords : array();
		$clean    = array();

		foreach ( $keywords as $keyword ) {
			$keyword = trim( strtolower( (string) $keyword ) );

			if ( '' === $keyword ) {
				continue;
			}

			$clean[] = $keyword;
		}

		return array_values( array_unique( $clean ) );

	} // end normalize_keywords;

} // end class Jumper_Command_Registry;
