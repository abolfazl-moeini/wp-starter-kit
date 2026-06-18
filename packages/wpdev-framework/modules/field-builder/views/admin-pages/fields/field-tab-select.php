<?php
/**
 * Tab select field view.
 *
 * @since 2.0.0
 */
?>
<li class="<?php echo esc_attr(trim($field->wrapper_classes)); ?> wpdev-bg-gray-200" style="margin-bottom: -1px;" <?php echo $field->get_wrapper_html_attributes(); ?>>

  <div class="wpdev--m-4 wpdev-px-1">

    <?php foreach ($field->options as $option_value => $option_label) : ?>

      <label
        class="wpdev-mt-1 wpdev-inline-block wpdev-uppercase wpdev-text-xs wpdev-text-gray-500 wpdev-px-4 wpdev-py-3 wpdev-font-bold wpdev-border-solid wpdev-border wpdev-border-b-0 wpdev-border-transparent wpdev-rounded-tl wpdev-rounded-tr "
        v-bind:class="'<?php echo esc_attr($option_value); ?>' == <?php echo esc_attr($field->id); ?> ? 'wpdev-bg-white wpdev-text-gray-600 wpdev-border-gray-300' : ''"
      >

        <?php echo $option_label; ?>

        <input class="wpdev-w-0 wpdev-h-0 wpdev-overflow-hidden wpdev-hidden" type="radio" name="<?php echo esc_attr($field->id); ?>" value="<?php echo esc_attr($option_value); ?>" <?php echo $field->get_html_attributes(); ?>>

      </label>

    <?php endforeach; ?>

  </div>

</li>
