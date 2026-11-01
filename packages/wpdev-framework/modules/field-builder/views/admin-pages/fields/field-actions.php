<?php
/**
 * Actions field view.
 *
 * @since 2.0.0
 */
?>
<li class="wpdev-surface-gray-100 <?php echo esc_attr(trim($field->wrapper_classes)); ?>" <?php echo $field->get_wrapper_html_attributes(); ?>>

	<?php foreach ($field->actions as $action_slug => $action) : ?>

		<span class="wpdev-row wpdev-row-wrap wpdev-content-center">

		<?php $action = new \WPDevFramework\UI\Field($action_slug, $action); ?>

			<button class="button <?php echo esc_attr($action->classes); ?>" id="action_button" data-action="<?php echo $action->action; ?>" data-object="<?php echo $action->object_id; ?>" value="<?php echo wp_create_nonce($action->action); ?>" <?php echo $field->get_html_attributes(); ?> >

		<?php echo $action->title; ?>

		<?php if ($action->tooltip) : ?>

			<?php echo wpdev_tooltip($action->tooltip); ?>

				<?php endif; ?>

			</button>

			<span data-loading="wpdev_action_button_loading_<?php echo $action->object_id; ?>" id="wpdev_action_button_loading" class="wpdev-blinking-animation wpdev-type-gray-600 wpdev-mar-y-1 wpdev-type-2xs wpdev-uppercase wpdev-font-semibold wpdev-type-center wpdev-self-center wpdev-pad-x-4 wpdev-py wpdev-mar-t-1 hidden" >

		<?php echo $action->loading_text; ?>

			</span>

		</span>

	<?php endforeach; ?>

</li>
