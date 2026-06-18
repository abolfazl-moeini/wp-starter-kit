<?php
/**
 * Custom page layout (K4-04).
 *
 * Callback-only template: inherits the WPDev admin wrap + title bar, then defers
 * the entire body to a render callback. Resolve the callback in priority order:
 *
 *   1. $page->get_render_callback() if the page object exposes one.
 *   2. The `wpdev_admin_page_{$id}_render` action (K4-09 lifecycle hook).
 *   3. The legacy `$content` string.
 *
 * @since 2.6.0
 *
 * @var object $page       Page instance.
 * @var string $page_title Resolved page title markup.
 * @var string $content    Optional pre-rendered content string.
 */

defined( 'ABSPATH' ) || exit;

$page_id = is_object( $page ) && method_exists( $page, 'get_id' ) ? $page->get_id() : '';

$render_callback = is_object( $page ) && method_exists( $page, 'get_render_callback' )
	? $page->get_render_callback()
	: null;
?>
<div id="wpdev-wrap" class="wrap wpdev-styling">

	<div class="sm:wpdev-container sm:wpdev-mx-auto">

		<h1 class="wp-heading-inline">
			<?php echo $page_title; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
		</h1>

		<hr class="wp-header-end">

		<?php
		/**
		 * Fires before the custom page body renders.
		 *
		 * @since 2.6.0
		 *
		 * @param object $page Page instance.
		 */
		do_action( 'wpdev_admin_page_before_custom_render', $page );

		if ( is_callable( $render_callback ) ) {

			call_user_func( $render_callback, $page );

		} elseif ( $page_id && has_action( "wpdev_admin_page_{$page_id}_render" ) ) {

			/**
			 * Renders the body of a custom admin page (K4-09).
			 *
			 * @since 2.6.0
			 *
			 * @param object $page Page instance.
			 */
			do_action( "wpdev_admin_page_{$page_id}_render", $page );

		} elseif ( ! empty( $content ) ) {

			echo $content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped

		} // end if;

		/**
		 * Fires after the custom page body renders.
		 *
		 * @since 2.6.0
		 *
		 * @param object $page Page instance.
		 */
		do_action( 'wpdev_admin_page_after_custom_render', $page );
		?>

	</div>

</div>
