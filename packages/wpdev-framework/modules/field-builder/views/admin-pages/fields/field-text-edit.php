<?php
/**
 * Text edit field view.
 *
 * @since 2.0.0
 */
?>
<li class="<?php echo esc_attr(trim($field->wrapper_classes)); ?>" data-wpdev-app="<?php echo esc_attr($field->id); ?>" data-state='{"edit":false}'>

  <div class="wpdev-block" v-show="!edit">

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

          if ($field->display_value == false) {

            echo __('No date', 'wpdev');

          } else {

            $date = $field->value;

            $time = strtotime(get_date_from_gmt($date));

            $formatted_value = date_i18n(get_option('date_format'), $time);

            $placeholder = wpdev_get_current_time('timestamp') > $time ? __('%s ago', 'wpdev') : __('In %s', 'wpdev'); // phpcs:ignore

            echo sprintf('<time datetime="%3$s">%1$s</time><br><small>%2$s</small>', $formatted_value, sprintf($placeholder, human_time_diff($time, wpdev_get_current_time('timestamp'))), get_date_from_gmt($date));

          } // end if;

        } else {

          _e('None', 'wpdev');

        } // end if;

      ?>

    <?php else : ?>

      <span class="wpdev-my-1 wpdev-inline-block">

        <?php echo $field->display_value; ?>

      </span>

    <?php endif; ?>

  </div>

  <?php if ($field->edit) : ?>

    <div class="wpdev-block" v-show="!edit">
      <a href="#" class="wpdev-p-2 wpdev--m-2 wp-ui-text-highlight" v-on:click="open($event)" data-field="<?php echo esc_attr($field_slug); ?>">
        <?php echo wpdev_tooltip(__('Edit'), 'dashicons-edit'); ?>
      </a>
    </div>

    <div v-cloak class="wpdev-block wpdev-w-full" v-show="edit">

      <?php

      /**
       * Adds the partial title template.
       * @since 2.0.0
       */
      wpdev_get_template('admin-pages/fields/partials/field-title', array(
        'field' => $field,
      ));

      ?>

      <input class="form-control wpdev-w-full wpdev-my-1" name="<?php echo esc_attr($field->id); ?>" type="text" placeholder="<?php echo esc_attr($field->placeholder); ?>" value="<?php echo esc_attr($field->value); ?>" <?php echo $field->get_html_attributes(); ?>>

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

  <?php endif; ?>

  <?php if ($field->copy) : ?>

    <div class="wpdev-block" v-show="!edit">
      <a href="#" class="wpdev-p-2 wpdev--m-2" v-on:click="edit($event, '<?php echo esc_js($field_slug); ?>')" data-field="<?php echo esc_attr($field_slug); ?>">
        <?php echo wpdev_tooltip(__('Copy'), 'dashicons-admin-page'); ?>
      </a>
    </div>

  <?php endif; ?>

</li>
