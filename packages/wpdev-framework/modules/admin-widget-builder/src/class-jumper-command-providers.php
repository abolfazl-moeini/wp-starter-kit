<?php
/**
 * Jumper auto-discovery command providers.
 *
 * @package WPDevFramework\Modules\AdminWidgetBuilder
 * @since   2.8.0
 */

namespace WPDevFramework\Modules\AdminWidgetBuilder;

defined( 'ABSPATH' ) || exit;

/**
 * Auto-registers Jumper commands from existing module registrations.
 */
class Jumper_Command_Providers {

	/**
	 * Whether providers are already booted.
	 *
	 * @var bool
	 */
	protected static $booted = false;

	/**
	 * Boot providers.
	 *
	 * @since 2.8.0
	 * @return void
	 */
	public static function boot() {

		if ( self::$booted ) {
			return;
		}

		self::$booted = true;

		add_action( 'wpdev_module_admin_pages_registered', array( __CLASS__, 'register_module_admin_page_commands' ), 20, 2 );

	} // end boot;

	/**
	 * Register commands from a module's admin pages.
	 *
	 * @since 2.8.0
	 *
	 * @param string   $module_id    Module slug.
	 * @param string[] $page_classes Registered page classes.
	 * @return void
	 */
	public static function register_module_admin_page_commands( $module_id, array $page_classes ) {

		$module_id = sanitize_key( (string) $module_id );

		if ( '' === $module_id || empty( $page_classes ) ) {
			return;
		}

		self::ensure_namespace( $module_id, $page_classes );

		foreach ( $page_classes as $page_class ) {
			$command = self::build_command_from_page_class( $module_id, (string) $page_class );

			if ( empty( $command ) ) {
				continue;
			}

			wpdev_register_jumper_command( $command['id'], $command['config'] );
		}

	} // end register_module_admin_page_commands;

	/**
	 * Ensure module namespace exists for grouping.
	 *
	 * @since 2.8.0
	 *
	 * @param string   $module_id    Module slug.
	 * @param string[] $page_classes Module page classes.
	 * @return void
	 */
	protected static function ensure_namespace( $module_id, array $page_classes ) {

		if ( wpdev_get_jumper_namespace( $module_id ) ) {
			return;
		}

		$label = 0 === strpos( $module_id, 'wpdev-' )
			? substr( $module_id, 5 )
			: $module_id;

		wpdev_register_jumper_namespace(
			$module_id,
			array(
				'plugin'   => (string) apply_filters( 'wpdev_jumper_namespace_plugin', 'WPDev', $module_id, $page_classes ),
				'label'    => Jumper_Namespace_Registry::humanize_id( $label ),
				'priority' => (int) apply_filters( 'wpdev_jumper_namespace_priority', 100, $module_id, $page_classes ),
			)
		);

	} // end ensure_namespace;

	/**
	 * Build a command from an admin page class.
	 *
	 * @since 2.8.0
	 *
	 * @param string $module_id Module slug.
	 * @param string $page_class Page class name.
	 * @return array<string, mixed>
	 */
	protected static function build_command_from_page_class( $module_id, $page_class ) {

		if ( '' === $page_class || ! class_exists( $page_class ) ) {
			return array();
		}

		$page_id = self::extract_page_id( $page_class );

		if ( '' === $page_id ) {
			return array();
		}

		$mode         = self::infer_page_mode( $page_id, $page_class );
		$resource     = self::infer_resource_label( $page_id, $page_class );
		$command_slug = self::sanitize_id_fallback( $mode . '-' . $resource );
		$title        = 'edit' === $mode
			? sprintf( __( 'Create New %s', 'wpdev' ), $resource )
			: sprintf( __( 'Go to %s', 'wpdev' ), $resource );

		$priority = 'edit' === $mode ? 20 : 40;

		return array(
			'id'     => $module_id . '/' . $command_slug,
			'config' => array(
				'namespace'  => $module_id,
				'title'      => $title,
				'type'       => 'link',
				'url'        => network_admin_url( 'admin.php?page=' . $page_id ),
				'keywords'   => self::build_keywords( $resource, $mode ),
				'priority'   => $priority,
				'capability' => 'manage_network',
			),
		);

	} // end build_command_from_page_class;

	/**
	 * Extract protected page id from class default properties.
	 *
	 * @since 2.8.0
	 *
	 * @param string $page_class Admin page class.
	 * @return string
	 */
	protected static function extract_page_id( $page_class ) {

		try {
			$reflection = new \ReflectionClass( $page_class );
			$defaults   = $reflection->getDefaultProperties();
		} catch ( \Throwable $exception ) {
			return '';
		}

		return isset( $defaults['id'] ) ? sanitize_key( (string) $defaults['id'] ) : '';

	} // end extract_page_id;

	/**
	 * Infer command intent from page id/class.
	 *
	 * @since 2.8.0
	 *
	 * @param string $page_id Page id.
	 * @param string $page_class Class name.
	 * @return string edit|list
	 */
	protected static function infer_page_mode( $page_id, $page_class ) {

		if ( false !== strpos( $page_id, 'edit-' ) || false !== stripos( $page_class, 'edit' ) ) {
			return 'edit';
		}

		return 'list';

	} // end infer_page_mode;

	/**
	 * Build a human label from page id/class.
	 *
	 * @since 2.8.0
	 *
	 * @param string $page_id Page id.
	 * @param string $page_class Class name.
	 * @return string
	 */
	protected static function infer_resource_label( $page_id, $page_class ) {

		$label = preg_replace(
			'/^(wpdev\-)?(edit\-|view\-)?/',
			'',
			$page_id
		);

		$label = str_replace( '-', ' ', (string) $label );
		$label = trim( preg_replace( '/\s+/', ' ', $label ) );

		if ( '' !== $label ) {
			return ucwords( $label );
		}

		$short = preg_replace( '/.*\\\\/', '', $page_class );
		$short = preg_replace( '/(_Admin_Page|Admin_Page)$/', '', (string) $short );
		$short = str_replace( '_', ' ', (string) $short );

		return ucwords( trim( preg_replace( '/\s+/', ' ', $short ) ) );

	} // end infer_resource_label;

	/**
	 * Build command keywords.
	 *
	 * @since 2.8.0
	 *
	 * @param string $resource Resource label.
	 * @param string $mode     edit|list.
	 * @return array<int, string>
	 */
	protected static function build_keywords( $resource, $mode ) {

		$keywords = array( strtolower( $resource ) );

		if ( 'edit' === $mode ) {
			$keywords[] = 'create';
			$keywords[] = 'new';
			$keywords[] = 'add';
		} else {
			$keywords[] = 'go';
			$keywords[] = 'open';
			$keywords[] = 'list';
		}

		return array_values( array_unique( $keywords ) );

	} // end build_keywords;

	/**
	 * Sanitize id fallback for PHP 7 compatibility.
	 *
	 * @since 2.8.0
	 *
	 * @param string $value Raw id.
	 * @return string
	 */
	protected static function sanitize_id_fallback( $value ) {

		$value = strtolower( preg_replace( '/[^a-z0-9\-_]+/', '-', (string) $value ) );
		$value = trim( preg_replace( '/-+/', '-', $value ), '-' );

		return '' === $value ? 'command' : $value;

	} // end sanitize_id_fallback;

} // end class Jumper_Command_Providers;
