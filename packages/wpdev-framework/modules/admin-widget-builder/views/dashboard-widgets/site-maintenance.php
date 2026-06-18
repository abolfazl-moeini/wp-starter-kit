<?php
/**
 * Maintenance Mode toggle.
 *
 * @since 2.0.0
 */
?>
<div class="wpdev-styling <?php echo esc_attr($className); ?>">

  <div class="<?php echo wpdev_env_picker('', 'wpdev-widget-inset'); ?>">

    <?php $form->render(); ?>

  </div>

</div>

<style>
.wpdev-styling h3 {
  font-weight: 600 !important;
  font-size: 90% !important;
}
</style>
