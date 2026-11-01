<?php
/**
 * Title field partial view.
 *
 * @since 2.0.0
 */
?>

<?php if ($field->title && is_string($field->title)) : ?>

  <span class="wpdev-mar-y-1 wpdev-type-2xs wpdev-uppercase wpdev-font-bold wpdev-block">

    <?php echo $field->title; ?>

    <?php if ($field->tooltip) : ?>

      <?php echo wpdev_tooltip($field->tooltip); ?>

    <?php endif; ?>

  </span>

<?php endif; ?>
