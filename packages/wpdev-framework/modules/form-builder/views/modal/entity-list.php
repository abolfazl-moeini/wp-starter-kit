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

				<li class="wpdev-p-2 wpdev-m-0 wpdev-border-t wpdev-border-l-0 wpdev-border-r-0 wpdev-border-b-0 wpdev-border-gray-200 wpdev-border-solid">

					<a title="<?php echo esc_attr( $target['display_name'] ?? '' ); ?>" href="<?php echo esc_url( $target['link'] ?? '#' ); ?>" class="<?php echo esc_attr( $modal_class ); ?> wpdev-table-card wpdev-text-gray-700 wpdev-p-2 wpdev-flex wpdev-flex-grow wpdev-rounded wpdev-items-center wpdev-border wpdev-border-solid wpdev-border-gray-300 wpdev-no-underline">

						<div class="wpdev-flex wpdev-relative wpdev-h-6 wpdev-w-6 wpdev-rounded-full wpdev-ring-2 wpdev-mx-4 wpdev-my-2 wpdev-box-border wpdev-ring-white wpdev-bg-gray-300 wpdev-items-center wpdev-justify-center">

							<?php echo $target['avatar'] ?? ''; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>

						</div>

						<div class="wpdev-pl-2">

							<strong class="wpdev-block"><?php echo esc_html( $target['display_name'] ?? '' ); ?><small class="wpdev-font-normal"> (#<?php echo esc_html( (string) ( $target['id'] ?? '' ) ); ?>)</small></strong>

							<small><?php echo esc_html( $target['description'] ?? '' ); ?></small>

						</div>

					</a>

				</li>

			<?php endforeach; ?>

		</ul>

	<?php else : ?>

		<ul class="wpdev-widget-list">

			<li class="wpdev-p-2 wpdev-m-0 wpdev-border-t wpdev-border-l-0 wpdev-border-r-0 wpdev-border-b-0 wpdev-border-gray-400 wpdev-border-solid">

				<div class="wpdev-p-2 wpdev-mr-1 wpdev-flex wpdev-rounded wpdev-items-center wpdev-border wpdev-border-solid wpdev-border-gray-300 wpdev-bg-white wpdev-relative wpdev-overflow-hidden">

					<span class="dashicons dashicons-wpdev-block wpdev-text-gray-600 wpdev-px-1 wpdev-pr-3">&nbsp;</span>

					<div>

						<span class="wpdev-block wpdev-py-3 wpdev-text-gray-600 wpdev-text-2xs wpdev-font-bold wpdev-uppercase">

							<?php echo esc_html( $empty_label ); ?>

						</span>

					</div>

				</div>

			</li>

		</ul>

	<?php endif; ?>

</div>
