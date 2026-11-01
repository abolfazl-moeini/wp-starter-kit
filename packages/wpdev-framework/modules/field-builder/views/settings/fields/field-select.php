<?php
/**
 * Select field view.
 *
 * @since 2.0.0
 */
?>
<div class="wpdev-mar-y-6">

  <div class="wpdev-row">

    <div class="wpdev-w-1/3">

      <label for="<?php echo esc_attr($field->id); ?>">

        <?php echo $field->title; ?>

      </label>

    </div>

    <div class="wpdev-w-2/3">

      <select name="<?php echo esc_attr($field->id); ?>" id="<?php echo esc_attr($field->id); ?>" class="regular-text">

        <?php
        $options = is_array($field->options) ? $field->options : array();
        $current_val = $field->value !== null && $field->value !== false ? $field->value : wpdev_get_setting($field->id);
        $has_match = false;
        foreach ($options as $value => $option) :
          $is_selected = false;
          if (is_array($current_val)) {
            $is_selected = in_array((string) $value, array_map('strval', $current_val), true);
          } elseif ($current_val !== null && $current_val !== false && $current_val !== '') {
            $is_selected = (string) $value === (string) $current_val;
          }
          if ($is_selected) {
            $has_match = true;
          }
        ?>

          <option <?php selected($is_selected); ?> value="<?php echo esc_attr($value); ?>">

            <?php echo $option; ?>

          </option>

        <?php endforeach; ?>

        <?php if (!$has_match && $current_val !== null && $current_val !== false && $current_val !== '' && !is_array($current_val)) : ?>
          <option selected="selected" value="<?php echo esc_attr($current_val); ?>">
            <?php echo esc_html($current_val); ?>
          </option>
        <?php endif; ?>

      </select>

      <?php if ($field->desc) : ?>

        <p class="description" id="<?php echo $field->id; ?>-desc">

          <?php echo $field->desc; ?>

        </p>

      <?php endif; ?>

    </div>

  </div>

  <?php // if (isset($field['tooltip'])) {echo wpdev_Util::tooltip($field['tooltip']);} ?>

</div>
