<?php
/**
 * Entity list modal body (framework reusable renderer).
 *
 * @package WPDevFramework\Modules\FormBuilder
 * @since   2.8.0
 *
 * @var array<int, array<string, mixed>> $targets
 * @var string                           $wrapper_class
 * @var string                           $modal_class
 * @var string                           $empty_label
 */

defined( 'ABSPATH' ) || exit;

$empty_label = $empty_label ?? __( 'No Targets', 'wpdev' );
?>
<div class="<?php echo esc_attr( $wrapper_class ); ?>">

	<?php if ( ! empty( $targets ) ) : ?>

		<ul class="wpdev-widget-list">

			<?php foreach ( $targets as $target ) : ?>

				<li class="wpdev-pad-2 wpdev-mar-0 wpdev-border-t wpdev-border-l-0 wpdev-border-r-0 wpdev-border-b-0 wpdev-border-gray-200 wpdev-border-solid">

					<a title="<?php echo esc_attr( $target['display_name'] ?? '' ); ?>" href="<?php echo esc_url( $target['link'] ?? '#' ); ?>" class="<?php echo esc_attr( $modal_class ); ?> wpdev-table-card wpdev-type-gray-700 wpdev-pad-2 wpdev-row wpdev-grow wpdev-radius wpdev-items-center wpdev-border wpdev-border-solid wpdev-border-gray-300 wpdev-no-underline">

						<div class="wpdev-row wpdev-relative wpdev-h-6 wpdev-w-6 wpdev-radius-full wpdev-ring-2 wpdev-mar-x-4 wpdev-mar-y-2 wpdev-box-border wpdev-ring-white wpdev-surface-gray-300 wpdev-items-center wpdev-justify-center">

							<?php echo $target['avatar'] ?? ''; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>

						</div>

						<div class="wpdev-pad-l-2">

							<strong class="wpdev-block"><?php echo esc_html( $target['display_name'] ?? '' ); ?><small class="wpdev-font-normal"> (#<?php echo esc_html( (string) ( $target['id'] ?? '' ) ); ?>)</small></strong>

							<small><?php echo esc_html( $target['description'] ?? '' ); ?></small>

						</div>

					</a>

				</li>

			<?php endforeach; ?>

		</ul>

	<?php else : ?>

		<ul class="wpdev-widget-list">

			<li class="wpdev-pad-2 wpdev-mar-0 wpdev-border-t wpdev-border-l-0 wpdev-border-r-0 wpdev-border-b-0 wpdev-border-gray-400 wpdev-border-solid">

				<div class="wpdev-pad-2 wpdev-mar-r-1 wpdev-row wpdev-radius wpdev-items-center wpdev-border wpdev-border-solid wpdev-border-gray-300 wpdev-surface-white wpdev-relative wpdev-overflow-hidden">

					<span class="dashicons dashicons-wpdev-block wpdev-type-gray-600 wpdev-pad-x-1 wpdev-pad-r-3">&nbsp;</span>

					<div>

						<span class="wpdev-block wpdev-pad-y-3 wpdev-type-gray-600 wpdev-type-2xs wpdev-font-bold wpdev-uppercase">

							<?php echo esc_html( $empty_label ); ?>

						</span>

					</div>

				</div>

			</li>

		</ul>

	<?php endif; ?>

</div>
