<?php
/**
 * Note field view.
 *
 * @since 2.0.0
 */
?>
<div class="wpdev-my-6">

  <div class="wpdev-flex">

    <?php if ($field->title) : ?>

    <div class="wpdev-w-1/3">

      <label for="<?php echo esc_attr($field->id); ?>">

        <?php echo $field->title; ?>

      </label>

    </div>

    <?php endif; ?>

    <div class="<?php echo esc_attr($field->title ? 'wpdev-w-2/3' : 'wpdev-w-full'); ?>">

      <?php if ($field->desc) : ?>

        <p class="description" id="<?php echo $field->id; ?>-desc">

          <?php echo $field->desc; ?>

        </p>

      <?php endif; ?>

    </div>

  </div>

  <?php // if (isset($field['tooltip'])) {echo wpdev_Util::tooltip($field['tooltip']);} ?>

</div>
