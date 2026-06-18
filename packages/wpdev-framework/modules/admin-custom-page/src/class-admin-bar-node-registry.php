<?php
/**
 * Admin bar node registry for WPDev top menu shortcuts.
 *
 * @package WPDevFramework\Modules\AdminCustomPage
 * @since   2.8.0
 */

namespace WPDevFramework\Modules\AdminCustomPage;

use WPDevFramework\Core\Registry_Base;

defined( 'ABSPATH' ) || exit;

/**
 * Stores admin bar nodes registered before the menu renders.
 */
class Admin_Bar_Node_Registry extends Registry_Base {

	/**
	 * Registered nodes.
	 *
	 * @var array<string, array<string, mixed>>
	 */
	protected static $nodes = array();

	/**
	 * Register an admin bar node.
	 *
	 * @since 2.8.0
	 *
	 * @param string               $id     Node id.
	 * @param array<string, mixed> $config Node config (parent, title, href, meta, capability, priority).
	 * @param bool                 $replace Replace existing id.
	 * @return bool
	 */
	public static function register( $id, array $config = array(), $replace = true ) {

		$id = self::sanitize_id( $id );

		$normalized = array_merge(
			array(
				'id'         => $id,
				'parent'     => 'wpdev',
				'title'      => '',
				'href'       => '#',
				'meta'       => array(
					'class' => 'wpdev-top-menu',
				),
				'capability' => '',
				'priority'   => 100,
			),
			$config
		);

		$normalized['id']         = $id;
		$normalized['parent']     = self::sanitize_id( (string) $normalized['parent'] );
		$normalized['title']      = (string) $normalized['title'];
		$normalized['href']       = (string) $normalized['href'];
		$normalized['capability'] = trim( (string) $normalized['capability'] );
		$normalized['priority']   = (int) $normalized['priority'];
		$normalized['meta']       = is_array( $normalized['meta'] ) ? $normalized['meta'] : array();

		if ( '' === $normalized['parent'] ) {
			$normalized['parent'] = 'wpdev';
		}

		return self::store( self::$nodes, $id, $normalized, (bool) $replace );

	} // end register;

	/**
	 * List registered nodes sorted by priority.
	 *
	 * @since 2.8.0
	 *
	 * @return array<int, array<string, mixed>>
	 */
	public static function sorted_nodes() {

		$nodes = array_values( self::$nodes );

		usort(
			$nodes,
			static function ( $a, $b ) {
				return ( $a['priority'] ?? 100 ) <=> ( $b['priority'] ?? 100 );
			}
		);

		return $nodes;

	} // end sorted_nodes;

	/**
	 * Reset registry (tests).
	 *
	 * @since 2.8.0
	 *
	 * @return void
	 */
	public static function reset() {

		self::$nodes = array();

	} // end reset;

} // end class Admin_Bar_Node_Registry;
