<?php
/**
 * Textarea field view.
 *
 * @since 2.0.0
 */
?>
<div class="wpdev-my-6">

  <div class="wpdev-flex">

    <div class="wpdev-w-1/3">

      <label for="<?php echo esc_attr($field->id); ?>">

        <?php echo $field->title; ?>

      </label>

    </div>

    <div class="wpdev-w-2/3">

      <textarea cols="60" rows="7" name="<?php echo esc_attr($field->id); ?>" id="<?php echo esc_attr($field->id); ?>" class="regular-text" placeholder="<?php echo $field->placeholder ? esc_attr($field->placeholder) : ''; ?>"><?php echo esc_textarea(stripslashes(wpdev_get_setting($field_slug))); ?></textarea>

      <?php if ($field->desc) : ?>

        <p class="description" id="<?php echo $field->id; ?>-desc">

          <?php echo $field->desc; ?>

        </p>

      <?php endif; ?>

    </div>

  </div>

  <?php // if (isset($field['tooltip'])) {echo wpdev_Util::tooltip($field['tooltip']);} ?>

</div>
