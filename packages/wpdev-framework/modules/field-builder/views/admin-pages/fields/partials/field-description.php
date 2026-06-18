<?php
/**
 * Description field partial view.
 *
 * @since 2.0.0
 */
?>

<?php if ($field->desc) : ?>

  <p class="description wpdev-text-2xs" id="<?php echo $field->id; ?>-desc">

    <?php echo $field->desc; ?>

  </p>

<?php endif; ?>
