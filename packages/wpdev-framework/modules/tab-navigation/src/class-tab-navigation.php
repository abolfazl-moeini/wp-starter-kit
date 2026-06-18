<?php
/**
 * Shared tab navigation partial renderer.
 *
 * @package WPDevFramework\Modules\TabNavigation
 * @since   2.5.0
 */

namespace WPDevFramework\Modules\TabNavigation;

defined( 'ABSPATH' ) || exit;

/**
 * Renders tab navigation used by list views, wizards, and metabox tabs.
 */
class Tab_Navigation {

	/**
	 * Render tab navigation markup.
	 *
	 * @since 2.5.0
	 *
	 * @param array<int, array<string, mixed>> $tabs     Tab definitions (slug, label, url, current).
	 * @param array<string, mixed>             $options  Optional wrapper classes/id.
	 * @return void
	 */
	public static function render( array $tabs, array $options = array() ) {

		$options = wp_parse_args(
			$options,
			array(
				'wrapper_class' => 'nav-tab-wrapper wpdev-nav-tab-wrapper',
				'wrapper_id'    => '',
			)
		);

		printf(
			'<div class="%s"%s>',
			esc_attr( $options['wrapper_class'] ),
			$options['wrapper_id'] ? ' id="' . esc_attr( $options['wrapper_id'] ) . '"' : ''
		);

		foreach ( $tabs as $tab ) {
			$slug     = isset( $tab['slug'] ) ? \sanitize_key( $tab['slug'] ) : '';
			$label    = isset( $tab['label'] ) ? $tab['label'] : $slug;
			$url      = isset( $tab['url'] ) ? $tab['url'] : '#';
			$current  = ! empty( $tab['current'] );
			$disabled = ! empty( $tab['disabled'] );
			$badge    = isset( $tab['badge'] ) ? (string) $tab['badge'] : '';
			$class    = 'nav-tab' . ( $current ? ' nav-tab-active' : '' ) . ( $disabled ? ' nav-tab-disabled' : '' );

			$label_html = \esc_html( $label );

			if ( '' !== $badge ) {
				$label_html .= ' <span class="count">' . \esc_html( $badge ) . '</span>';
			}

			if ( $disabled ) {
				printf(
					'<span class="%s" aria-disabled="true">%s</span>',
					\esc_attr( $class ),
					$label_html
				);
				continue;
			}

			printf(
				'<a href="%s" class="%s">%s</a>',
				\esc_url( $url ),
				\esc_attr( $class ),
				$label_html
			);
		}

		echo '</div>';

	} // end render;

	/**
	 * Convert list-table view definitions to tab navigation items (K4-10).
	 *
	 * @since 2.6.0
	 *
	 * @param array<string, array<string, mixed>> $views Views from Base_List_Table::get_views().
	 * @return array<int, array<string, mixed>>
	 */
	public static function from_list_table_views( array $views ) {

		$tabs = array();

		foreach ( $views as $slug => $view ) {
			$field = isset( $view['field'] ) ? $view['field'] : 'view';
			$tabs[] = array(
				'slug'    => (string) $slug,
				'label'   => isset( $view['label'] ) ? $view['label'] : (string) $slug,
				'url'     => isset( $view['url'] ) ? $view['url'] : '#',
				'current' => function_exists( 'wpdev_request' )
					? wpdev_request( $field, 'all' ) === $slug
					: false,
			);
		}

		return $tabs;

	} // end from_list_table_views;

} // end class Tab_Navigation;
