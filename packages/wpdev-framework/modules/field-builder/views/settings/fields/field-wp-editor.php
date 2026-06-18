<?php
/**
 * Field wp_editor view (settings context).
 *
 * Renamed from field-wp_editor.php (K1-02): Field::get_template_name() converts
 * underscores to hyphens, so the underscore filename was never matched.
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

      <div style="max-width: 800px;">

        <?php wp_editor(wpdev_get_setting($field->id), $field->id, $field->args); ?>

      </div>

      <?php if ($field->desc) : ?>

        <p class="description" id="<?php echo $field->id; ?>-desc">

          <?php echo $field->desc; ?>

        </p>

      <?php endif; ?>

    </div>

  </div>

</div>
