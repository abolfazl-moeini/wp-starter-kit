<?php
/**
 * Dashboard statistics widget registry (WPDev vs WP core).
 *
 * @package WPDevFramework\Modules\AdminWidgetBuilder
 * @since   2.5.0
 */

namespace WPDevFramework\Modules\AdminWidgetBuilder;

use WPDevFramework\Core\Registry_Base;

defined( 'ABSPATH' ) || exit;

/**
 * Registers WPDev dashboard statistics metaboxes (not WP core dashboard widgets).
 */
class Dashboard_Widget_Registry extends Registry_Base {

	/**
	 * WPDev financial/statistics widgets on the WPDev admin dashboard.
	 */
	public const CONTEXT_WPDEV_STATISTICS = 'wpdev-statistics';

	/**
	 * WordPress core dashboard metaboxes (registered via Dashboard_Widgets in inc/).
	 */
	public const CONTEXT_WP_CORE = 'wp-core';

	/**
	 * Registered widgets.
	 *
	 * @var array<string, array<string, mixed>>
	 */
	protected static $widgets = array();

	/**
	 * Register a statistics dashboard widget.
	 *
	 * @since 2.5.0
	 *
	 * @param string               $id     Metabox id (e.g. wpdev-revenue).
	 * @param array<string, mixed> $config {
	 *     @type string          $tab         Dashboard tab slug (general, taxes, ...).
	 *     @type string          $title       Metabox title.
	 *     @type string          $view        View slug under admin-widget-builder/views.
	 *     @type callable        $datasource  Callable( $page ): array template args.
	 *     @type string          $context     CONTEXT_WPDEV_STATISTICS or CONTEXT_WP_CORE.
	 *     @type string          $capability  Optional capability check.
	 *     @type string          $position    Metabox position. Default normal.
	 *     @type string          $priority    Metabox priority. Default high.
	 * }
	 * @return void
	 */
	public static function register( $id, array $config, $replace = true ) {

		$merged = array_merge(
			array(
				'tab'         => 'general',
				'title'       => '',
				'view'        => '',
				'datasource'  => static function () {
					return array();
				},
				'context'     => self::CONTEXT_WPDEV_STATISTICS,
				'capability'  => '',
				'position'    => 'normal',
				'priority'    => 'high',
			),
			$config
		);

		return self::store( self::$widgets, $id, $merged, (bool) $replace );

	} // end register;

	/**
	 * Get a registered dashboard widget config.
	 *
	 * @since 2.7.0
	 *
	 * @param string $id Widget id.
	 * @return array<string, mixed>|null
	 */
	public static function get( $id ) {

		$id = self::sanitize_id( $id );

		return self::$widgets[ $id ] ?? null;

	} // end get;

	/**
	 * Whether a dashboard widget is registered.
	 *
	 * @since 2.7.0
	 *
	 * @param string $id Widget id.
	 * @return bool
	 */
	public static function has( $id ) {

		return isset( self::$widgets[ self::sanitize_id( $id ) ] );

	} // end has;

	/**
	 * List all registered dashboard widgets.
	 *
	 * @since 2.7.0
	 *
	 * @return array<string, array<string, mixed>>
	 */
	public static function all_widgets() {

		return self::$widgets;

	} // end all_widgets;

	/**
	 * Unregister a dashboard widget.
	 *
	 * @since 2.7.0
	 *
	 * @param string $id Widget id.
	 * @return void
	 */
	public static function unregister( $id ) {

		unset( self::$widgets[ self::sanitize_id( $id ) ] );

	} // end unregister;

	/**
	 * Reset registry state (unit tests).
	 *
	 * @since 2.7.0
	 *
	 * @return void
	 */
	public static function reset() {

		self::$widgets = array();

	} // end reset;

	/**
	 * Return widgets for a context.
	 *
	 * @since 2.5.0
	 *
	 * @param string $context Registry context constant.
	 * @return array<string, array<string, mixed>>
	 */
	public static function for_context( $context ) {

		return array_filter(
			self::$widgets,
			static function ( $widget ) use ( $context ) {
				return ( $widget['context'] ?? '' ) === $context;
			}
		);

	} // end for_context;

	/**
	 * Register metaboxes for a dashboard tab.
	 *
	 * @since 2.5.0
	 *
	 * @param string $tab    Tab slug.
	 * @param object $screen WP_Screen instance.
	 * @param object $page   Dashboard admin page instance.
	 * @return void
	 */
	public static function register_metaboxes( $tab, $screen, $page ) {

		if ( ! $screen || ! isset( $screen->id ) ) {
			return;
		}

		foreach ( self::$widgets as $id => $widget ) {

			if ( $widget['tab'] !== $tab ) {
				continue;
			}

			if ( ! empty( $widget['capability'] ) && ! current_user_can( $widget['capability'] ) ) {
				continue;
			}

			$view       = $widget['view'];
			$datasource = $widget['datasource'];

			add_meta_box(
				$id,
				$widget['title'],
				static function () use ( $view, $datasource, $page ) {
					$args = is_callable( $datasource ) ? (array) call_user_func( $datasource, $page ) : array();
					wpdev_get_template( $view, $args, 'dashboard-statistics/' . basename( $view ) );
				},
				$screen->id,
				$widget['position'],
				$widget['priority']
			);

		} // end foreach;

	} // end register_metaboxes;

} // end class Dashboard_Widget_Registry;
