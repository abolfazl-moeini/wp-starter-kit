<?php
/**
 * Select field view.
 *
 * @since 2.0.0
 */
?>
<li class="<?php echo esc_attr(trim($field->wrapper_classes)); ?>" <?php echo $field->get_wrapper_html_attributes(); ?>>

  <div class="wpdev-block wpdev-full">

    <?php

    /**
     * Adds the partial title template.
     * @since 2.0.0
     */
    wpdev_get_template('admin-pages/fields/partials/field-title', array(
      'field' => $field,
    ));

    ?>

    <select class="form-control wpdev-full wpdev-mar-y-1" name="<?php echo esc_attr($field->id); ?><?php echo isset($field->html_attr['multiple']) && $field->html_attr['multiple'] ? '[]' : ''; ?>" <?php echo $field->get_html_attributes(); ?> placeholder="<?php echo $field->placeholder; ?>">

      <?php
      $options = is_array($field->options) ? $field->options : array();
      $current_val = $field->value;
      $has_match = false;
      foreach ($options as $option_value => $option_label) :
        $is_selected = false;
        if (is_array($current_val)) {
          $is_selected = in_array((string) $option_value, array_map('strval', $current_val), true);
        } elseif ($current_val !== null && $current_val !== false && $current_val !== '') {
          $is_selected = (string) $option_value === (string) $current_val;
        }
        if ($is_selected) {
          $has_match = true;
        }
      ?>

        <option <?php selected($is_selected); ?> value="<?php echo esc_attr($option_value); ?>">

          <?php echo $option_label; ?>

        </option>

      <?php endforeach; ?>

      <?php if (!$has_match && $current_val !== null && $current_val !== false && $current_val !== '' && !is_array($current_val)) : ?>
        <option selected="selected" value="<?php echo esc_attr($current_val); ?>">
          <?php echo esc_html($current_val); ?>
        </option>
      <?php endif; ?>

      <?php if ($field->options_template) : ?>

        <?php echo $field->options_template; ?>

      <?php endif; ?>

    </select>

    <?php

    /**
     * Adds the partial title template.
     * @since 2.0.0
     */
    wpdev_get_template('admin-pages/fields/partials/field-description', array(
      'field' => $field,
    ));

    ?>

  </div>

</li>
