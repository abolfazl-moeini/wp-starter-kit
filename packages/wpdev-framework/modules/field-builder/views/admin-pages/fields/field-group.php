<?php
/**
 * Group field view.
 *
 * @since 2.0.0
 */
?>
<li class="<?php echo esc_attr(trim($field->wrapper_classes)); ?>" <?php echo $field->get_wrapper_html_attributes(); ?>>

  <div class="wpdev-block wpdev-w-full <?php echo esc_attr($field->classes); ?>">

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
     * Instantiate the form for the order details.
     *
     * @since 2.0.0
     */
    $form = new \WPDevFramework\UI\Form($field->id, $field->fields, array(
      'views'                 => 'admin-pages/fields',
      'classes'               => trim('wpdev-flex '.esc_attr($field->classes)),
      'field_wrapper_classes' => 'wpdev-bg-transparent',
    ));

    $form->render();

    ?>

    <?php if ($field->desc) : ?>

      <div class="wpdev-mt-2 wpdev-block wpdev-bg-gray-100 wpdev-rounded wpdev-border-solid wpdev-border-gray-400 wpdev-border-t wpdev-border-l wpdev-border-b wpdev-border-r wpdev-text-2xs wpdev-py-2 wpdev-p-2">

        <?php echo $field->desc; ?>

      </div>

		<?php endif; ?>

  </div>

</li>
