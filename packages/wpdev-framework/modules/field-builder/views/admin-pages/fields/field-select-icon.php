<?php
/**
 * Select icon field view.
 *
 * @since 2.0.0
 */
?>
<li class="<?php echo esc_attr(trim($field->wrapper_classes)); ?>" <?php echo $field->get_wrapper_html_attributes(); ?>>

  <div class="wpdev-block wpdev-w-full">

    <?php

    /**
     * Adds the partial title template.
     * @since 2.0.0
     */
    wpdev_get_template('admin-pages/fields/partials/field-title', array(
      'field' => $field,
    ));

    /**
     * Adds the partial title template.
     * @since 2.0.0
     */
    wpdev_get_template('admin-pages/fields/partials/field-description', array(
      'field' => $field,
    ));

    ?>

    <div class="wpdev-flex wpdev-flex-wrap wpdev--mx-2 wpdev-mt-2">

      <?php foreach ($field->options as $option_value => $option) : ?>

        <?php

          /*
           * Set the default keys.
           */
          $option = wp_parse_args($option, array(
            'tooltip' => '',
          ));

        ?>

        <div class="wpdev-p-2 wpdev-box-border wpdev-flex <?php echo esc_attr($field->classes); ?>" style="height: 110px;">

          <label class="wpdev-w-full wpdev-relative wpdev-rounded wpdev-p-1 wpdev-border-solid wpdev-border wpdev-flex wpdev-items-center wpdev-justify-center wpdev-bg-gray-100 wpdev-text-gray-600 wpdev-border-gray-300" v-bind:class="require('<?php echo esc_attr($field->id); ?>', '<?php echo esc_attr($option_value); ?>') ? 'wpdev-bg-gray-200 wpdev-text-gray-700 wpdev-border-gray-400 selected' : '' " for="<?php echo esc_attr($field->id.'-'.$option_value); ?>">

            <div class="wpdev-text-center" <?php echo wpdev_tooltip_text($option['tooltip']); ?>>

              <span class="wpdev-block wpdev-text-2xl wpdev-mb-2 <?php echo esc_attr($option['icon']); ?>"></span>

              <input class="wpdev-w-0 wpdev-h-0 wpdev-hidden" id="<?php echo esc_attr($field->id.'-'.$option_value); ?>" type="radio" <?php checked($option_value, $field->value); ?> value="<?php echo esc_attr($option_value); ?>" name="<?php echo esc_attr($field->id); ?>" <?php echo $field->get_html_attributes(); ?>>

              <span class="wpdev-uppercase wpdev-text-2xs wpdev-font-semibold">

                <?php echo $option['title']; ?>

              </span>

            </div>

          </label>

        </div>

      <?php endforeach; ?>

    </div>

  </div>

</li>
