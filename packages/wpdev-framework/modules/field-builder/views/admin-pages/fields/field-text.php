<?php
/**
 * Text field view.
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

    <?php if ($field->type === 'model') : ?>

      <div class="wpdev-row">

        <div class="wpdev-full wpdev-mar-y-1">
          <input class="form-control wpdev-full" name="<?php echo esc_attr($field->id); ?>" type="text" placeholder="<?php echo esc_attr($field->placeholder); ?>" value="<?php echo esc_attr($field->value); ?>" <?php echo $field->get_html_attributes(); ?>>
        </div>

        <?php if (wpdev_get_isset($field->html_attr, 'data-base-link')) : ?>

          <div class="wpdev-mar-l-1 wpdev-mar-y-1" v-cloak>
            <a
              v-bind:href="'<?php echo wpdev_get_isset($field->html_attr, 'data-base-link'); ?>' + '=' + <?php echo wpdev_get_isset($field->html_attr, 'v-model'); ?>"
              target="_blank"
              class="button"
              v-show='<?php echo wpdev_get_isset($field->html_attr, 'v-model'); ?>'
              <?php echo wpdev_tooltip_text(__('View', 'wpdev')); ?>
            >
              <span class="dashicons-wpdev-popup wpdev-mar-0 wpdev-pad-0"></span>
            </a>
          </div>

        <?php endif; ?>

      </div>

    <?php elseif ($field->money) : ?>

      <money class="form-control wpdev-full wpdev-mar-y-1" name="<?php echo esc_attr($field->id); ?>" type="<?php echo esc_attr($field->type); ?>" placeholder="<?php echo esc_attr($field->placeholder); ?>" value="<?php echo esc_attr($field->value); ?>" <?php echo $field->get_html_attributes(); ?>></money>

      <input class="form-control wpdev-full wpdev-mar-y-1" name="<?php echo esc_attr($field->id); ?>" type="<?php echo esc_attr($field->type); ?>" placeholder="<?php echo esc_attr($field->placeholder); ?>" value="<?php echo esc_attr($field->value); ?>" <?php echo $field->get_html_attributes(); ?> v-if="false">

    <?php else : ?>

      <input class="form-control wpdev-full wpdev-mar-y-1" name="<?php echo esc_attr($field->id); ?>" type="<?php echo esc_attr($field->type); ?>" placeholder="<?php echo esc_attr($field->placeholder); ?>" value="<?php echo esc_attr($field->value); ?>" <?php echo $field->get_html_attributes(); ?>>

    <?php endif; ?>

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
