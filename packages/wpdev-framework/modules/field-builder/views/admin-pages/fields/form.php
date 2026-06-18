<?php
/**
 * Form view.
 *
 * @since 2.0.0
 */
?>
<div class="wpdev-styling">

  <?php echo $form->before; ?>

  <div class="wpdev-flex wpdev-flex-wrap">

    <?php if ($form->wrap_in_form_tag) : ?>

      <form
        id="<?php echo esc_attr($form_slug); ?>"
        action="<?php echo esc_attr($form->action); ?>"
        method="<?php echo esc_attr($form->method); ?>"
        <?php echo $form->get_html_attributes(); ?>
      >

    <?php endif; ?>

    <ul id="wpdev-form-<?php echo esc_attr($form->id); ?>" class="wpdev-flex-grow <?php echo esc_attr(trim($form->classes)); ?>" <?php echo $form->get_html_attributes(); ?>>

      <?php echo $rendered_fields; ?>

    </ul>

    <?php if ($form->wrap_in_form_tag) : ?>

    </form>

    <?php endif; ?>

    <?php echo $form->after; ?>

  </div>

</div>
