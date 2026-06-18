<?php
/**
 * Repeater field view.
 *
 * @since 2.0.0
 */
?>
<?php if ($field->title) : ?>

  <li id="" class="<?php echo esc_attr(trim($field->wrapper_classes)); ?>" <?php echo $field->get_wrapper_html_attributes(); ?>>

    <div class="wpdev-w-full wpdev-block">

      <?php

      /**
       * Adds the partial title template.
       * @since 2.0.0
       */
      wpdev_get_template('admin-pages/fields/partials/field-title', array(
        'field' => $field,
      ));

      ?>

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

<?php endif; ?>

<?php

  if (!$field->values && $field->value) {

    $_values = array();

    $columns = array_keys($field->value);

    $values = $field->value;

    foreach ($columns as $column) {

      $count = count(array_pop($field->value));

      for ($i = 0; $i < $count; $i++) {

        $_values[$i][$column] = $field->value[$column][$i];

      } // end if;

    } // end if;

    $field->values = $_values;

  } // end if;

  $fields = array();

  foreach ($field->fields as $key => $value) {
    $fields[$key.'[]'] = $field->fields[$key];
  }

  if (is_array($field->values)) {
    $position = 0;
    $field_len = count($field->values);
    foreach ($field->values as $key => $value) {
      $field_id = esc_attr($field->id);

      $field_id .= $position !== $field_len - 1 ? $key : '';
      $position++;
    ?>
      <li id="<?php echo esc_attr($field_id); ?>-line" class="field-repeater wpdev-bg-gray-100 <?php echo esc_attr($field->wrapper_classes); ?>" <?php echo $field->get_wrapper_html_attributes(); ?>>
        <div class="wpdev-w-full <?php echo esc_attr($field->classes); ?>">
          <?php
            foreach ($value as $field_name => $field_value) {
              $fields[$field_name.'[]']['value'] = $field_value;
            }

            $form = new \WPDevFramework\UI\Form($field->id, $fields, array(
              'views'                 => 'admin-pages/fields',
              'classes'               => 'wpdev-flex',
              'field_wrapper_classes' => 'wpdev-bg-transparent',
            ));

            $form->render();
          ?>
        </div>
      </li>
    <?php

    }
  } else {
  ?>
    <li id="<?php echo esc_attr($field->id); ?>-line" class="field-repeater wpdev-bg-gray-100 <?php echo esc_attr($field->wrapper_classes); ?>" <?php echo $field->get_wrapper_html_attributes(); ?>>

      <div class="wpdev-w-full <?php echo esc_attr($field->classes); ?>">

        <?php
        /**
         * Instantiate the form for the order details.
         *
         * @since 2.0.0
         */
        $form = new \WPDevFramework\UI\Form($field->id, $fields, array(
          'views'                 => 'admin-pages/fields',
          'classes'               => 'wpdev-flex',
          'field_wrapper_classes' => 'wpdev-bg-transparent',
        ));

        $form->render();

        ?>

      </div>

    </li>
  <?php
  }

?>

<li class="<?php echo esc_attr($field->wrapper_classes); ?>" <?php echo $field->get_wrapper_html_attributes(); ?>>

  <a class="button wpdev-w-full wpdev-text-center" href="#" v-on:click.prevent="duplicate_and_clean($event, '.field-repeater')">
      <?php _e('Add new Line', 'wpdev'); ?>
  </a>

</li>
