<?php
/**
 * Actions field view.
 *
 * @since 2.0.0
 */
?>
<li class="wpdev-bg-gray-100 <?php echo esc_attr(trim($field->wrapper_classes)); ?>" <?php echo $field->get_wrapper_html_attributes(); ?>>

	<?php foreach ($field->actions as $action_slug => $action) : ?>

		<span class="wpdev-flex wpdev-flex-wrap wpdev-content-center">

		<?php $action = new \WPDevFramework\UI\Field($action_slug, $action); ?>

			<button class="button <?php echo esc_attr($action->classes); ?>" id="action_button" data-action="<?php echo $action->action; ?>" data-object="<?php echo $action->object_id; ?>" value="<?php echo wp_create_nonce($action->action); ?>" <?php echo $field->get_html_attributes(); ?> >

		<?php echo $action->title; ?>

		<?php if ($action->tooltip) : ?>

			<?php echo wpdev_tooltip($action->tooltip); ?>

				<?php endif; ?>

			</button>

			<span data-loading="wpdev_action_button_loading_<?php echo $action->object_id; ?>" id="wpdev_action_button_loading" class="wpdev-blinking-animation wpdev-text-gray-600 wpdev-my-1 wpdev-text-2xs wpdev-uppercase wpdev-font-semibold wpdev-text-center wpdev-self-center wpdev-px-4 wpdev-py wpdev-mt-1 hidden" >

		<?php echo $action->loading_text; ?>

			</span>

		</span>

	<?php endforeach; ?>

</li>
