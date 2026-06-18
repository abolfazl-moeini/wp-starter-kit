<?php
/**
 * Header field view.
 *
 * @since 2.0.0
 */
?>
<li class="wpdev-bg-gray-100 wpdev-py-4 <?php echo esc_attr(trim($field->wrapper_classes)); ?>" <?php echo $field->get_wrapper_html_attributes(); ?>>

  <div class="wpdev-block wpdev-w-full">

    <h3 class="wpdev-my-1 wpdev-text-base wpdev-text-gray-800">

      <?php echo $field->title; ?>

      <?php if ($field->tooltip) : ?>

        <?php echo wpdev_tooltip($field->tooltip); ?>

      <?php endif; ?>

    </h3>

    <?php if ($field->desc) : ?>

    <p class="wpdev-mt-1 wpdev-mb-0 wpdev-text-gray-700">

      <?php echo $field->desc; ?>

    </p>

    <?php endif; ?>

  </div>

</li>
