<?php
/**
 * Multi-select field view.
 *
 * @since 2.0.0
 */
?>
<li
  class="<?php echo esc_attr(trim($field->wrapper_classes)); ?>"
  <?php echo $field->get_wrapper_html_attributes(); ?>
>

  <div class="wpdev-w-full">

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

    <ul data-columns="<?php echo esc_attr($field->columns); ?>" class='items wpdev--mx-1 wpdev-overflow-hidden wpdev-multiselect-content wpdev-static wpdev-my-2'>

      <?php foreach ($field->options as $value => $option) : ?>

        <li class="item wpdev-box-border wpdev-m-0 wpdev-my-2">

          <div class="wpdev-bg-gray-100 wpdev-p-3 wpdev-m-0 wpdev-border-gray-300 wpdev-border-solid wpdev-border wpdev-rounded wpdev-items-center wpdev-flex wpdev-justify-between">

            <span class="wpdev-block">

              <span class="wpdev-my-1 wpdev-text-xs wpdev-font-bold wpdev-block">

                <?php echo $option['title']; ?>

              </span>

              <?php if (isset($option['desc']) && !empty($option['desc'])) : ?>

                <span class="wpdev-my-1 wpdev-inline-block wpdev-text-xs">

                  <?php echo $option['desc']; ?>

                </span>

              <?php endif; ?>

            </span>

            <span class="wpdev-block wpdev-ml-2">

              <div class="wpdev-toggle">

                <input <?php checked(in_array($value, (array) $field->value, true)); ?> value="<?php echo esc_attr($value); ?>" id="<?php echo esc_attr("{$field->id}_{$value}"); ?>" type="checkbox" name="<?php echo esc_attr("{$field->id}[]"); ?>" class="wpdev-tgl wpdev-tgl-ios" <?php echo $field->get_html_attributes(); ?>>

                <label for="<?php echo esc_attr("{$field->id}_{$value}"); ?>" class="wpdev-tgl-btn wp-ui-highlight"></label>

              </div>

            </span>

          </div>

        </li>

      <?php endforeach; ?>

    </ul>

  </div>

</li>
