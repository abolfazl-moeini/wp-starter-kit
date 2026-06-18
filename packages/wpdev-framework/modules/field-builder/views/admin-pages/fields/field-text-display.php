<?php
/**
 * Text display field view.
 *
 * @since 2.0.0
 */
?>
<li class="<?php echo esc_attr(trim($field->wrapper_classes)); ?>" <?php echo $field->get_wrapper_html_attributes(); ?>>

  <div class="wpdev-block">

    <?php

    /**
     * Adds the partial title template.
     * @since 2.0.0
     */
    wpdev_get_template('admin-pages/fields/partials/field-title', array(
      'field' => $field,
    ));

    ?>

    <?php if ($field->type === 'date' || $field->date === true) : ?>

      <?php

        if (wpdev_validate_date($field->value)) {

          $date = $field->value;

          $time = strtotime(get_date_from_gmt($date));

          $formatted_value = date_i18n(get_option('date_format'), $time);

          $placeholder = wpdev_get_current_time('timestamp') > $time ? __('%s ago', 'wpdev') : __('In %s', 'wpdev'); // phpcs:ignore

          echo sprintf('<time datetime="%3$s">%1$s</time><br><small>%2$s</small>', $formatted_value, sprintf($placeholder, human_time_diff($time, wpdev_get_current_time('timestamp'))), get_date_from_gmt($date));

        } else {

          _e('None', 'wpdev');

        } // end if;

      ?>

    <?php else : ?>

      <span class="wpdev-my-1 wpdev-inline-block">

        <span id="<?php echo $field->id; ?>_value"><?php echo $field->display_value; ?></span>

        <?php if ($field->copy) : ?>

          <a <?php echo wpdev_tooltip_text(__('Copy', 'wpdev')); ?> class="wpdev-no-underline wp-ui-text-highlight wpdev-copy"  data-clipboard-action="copy" data-clipboard-target="#<?php echo $field->id; ?>_value">

            <span class="dashicons-wpdev-copy wpdev-align-middle"></span>

          </a>

        <?php endif; ?>

      </span>

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
