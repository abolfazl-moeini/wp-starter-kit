<?php
/**
 * Multi-select field view.
 *
 * @since 2.0.0
 */

$is_checkbox = ! empty( $is_checkbox ) || (
	( isset( $field->style ) && 'checkbox' === $field->style )
	|| ! empty( $field->as_checkbox )
	|| ( isset( $field->type ) && in_array( $field->type, array( 'multi_checkbox', 'multicheckbox', 'multi-checkbox', 'checkboxes' ), true ) )
);

$field_atts = method_exists( $field, 'get_attributes' ) ? $field->get_attributes() : array();

$exact_items    = isset( $field->exact_items ) ? (int) $field->exact_items : ( isset( $field_atts['exact_items'] ) ? (int) $field_atts['exact_items'] : 0 );
$min_items      = isset( $field->min_items ) ? (int) $field->min_items : ( isset( $field_atts['min_items'] ) ? (int) $field_atts['min_items'] : 0 );
$max_items      = isset( $field->max_items ) ? (int) $field->max_items : ( isset( $field_atts['max_items'] ) ? (int) $field_atts['max_items'] : 0 );
$disable_on_max = ! empty( $field->disable_on_max ) || ! empty( $field_atts['disable_on_max'] );

if ( isset( $field->args ) && is_array( $field->args ) ) {
	if ( ! $exact_items && isset( $field->args['exact_items'] ) ) {
		$exact_items = (int) $field->args['exact_items'];
	}
	if ( ! $min_items && isset( $field->args['min_items'] ) ) {
		$min_items = (int) $field->args['min_items'];
	}
	if ( ! $max_items && isset( $field->args['max_items'] ) ) {
		$max_items = (int) $field->args['max_items'];
	}
	if ( ! $disable_on_max && ! empty( $field->args['disable_on_max'] ) ) {
		$disable_on_max = true;
	}
}

$has_selection_limit = ( $exact_items > 0 || $min_items > 0 || $max_items > 0 || ! empty( $field->selection_limit ) || ! empty( $field_atts['selection_limit'] ) );
$total_options       = ( isset( $field->options ) && is_countable( $field->options ) ) ? count( $field->options ) : ( is_array( $field->options ) ? count( $field->options ) : 0 );

$limit_notices  = isset( $field->limit_notices ) ? $field->limit_notices : ( isset( $field_atts['limit_notices'] ) ? $field_atts['limit_notices'] : ( isset( $field->args['limit_notices'] ) ? $field->args['limit_notices'] : null ) );
$notice_valid   = is_array( $limit_notices ) && ! empty( $limit_notices['valid'] ) ? $limit_notices['valid'] : '';
$notice_invalid = is_array( $limit_notices ) && ! empty( $limit_notices['invalid'] ) ? $limit_notices['invalid'] : '';

$checked_values = is_array( $field->value ) ? $field->value : ( ! empty( $field->value ) ? (array) $field->value : array() );
$checked_count  = count( $checked_values );
?>
<li
  class="<?php echo esc_attr( trim( $field->wrapper_classes ) ); ?><?php if ( $has_selection_limit ) : ?> wpdev-selection-limit-field<?php endif; ?>"
  <?php echo $field->get_wrapper_html_attributes(); ?>
  <?php if ( $has_selection_limit ) : ?>
    data-selection-limit="1"
    data-exact-items="<?php echo esc_attr( (string) $exact_items ); ?>"
    data-min-items="<?php echo esc_attr( (string) $min_items ); ?>"
    data-max-items="<?php echo esc_attr( (string) $max_items ); ?>"
    data-disable-on-max="<?php echo $disable_on_max ? '1' : '0'; ?>"
    data-total-options="<?php echo esc_attr( (string) $total_options ); ?>"
    <?php if ( ! empty( $notice_valid ) ) : ?> data-notice-valid="<?php echo esc_attr( $notice_valid ); ?>"<?php endif; ?>
    <?php if ( ! empty( $notice_invalid ) ) : ?> data-notice-invalid="<?php echo esc_attr( $notice_invalid ); ?>"<?php endif; ?>
  <?php endif; ?>
>

  <div class="wpdev-full">

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

    <ul data-columns="<?php echo esc_attr($field->columns); ?>" class='items wpdev--mx-1 wpdev-overflow-hidden wpdev-multiselect-content wpdev-static wpdev-mar-y-2'>

      <?php foreach ((array) $field->options as $value => $option) :
        $is_val_checked     = in_array( $value, $checked_values, true );
        $is_disabled_on_max = $disable_on_max && $exact_items > 0 && $checked_count >= $exact_items && ! $is_val_checked;
      ?>

        <li class="item wpdev-box-border wpdev-mar-0 wpdev-mar-y-2">

          <div class="wpdev-surface-gray-100 wpdev-pad-3 wpdev-mar-0 wpdev-border-gray-300 wpdev-border-solid wpdev-border wpdev-radius wpdev-items-center wpdev-row wpdev-justify-between">

            <?php if ( $is_checkbox ) : ?>
            <label for="<?php echo esc_attr("{$field->id}_{$value}"); ?>" class="wpdev-block wpdev-cursor-pointer wpdev-flex-grow">
            <?php else : ?>
            <span class="wpdev-block">
            <?php endif; ?>

              <span class="wpdev-mar-y-1 wpdev-type-xs wpdev-font-bold wpdev-block">

                <?php echo esc_html(is_array($option) ? ($option['title'] ?? '') : (string) $option); ?>
                <?php if ( is_array( $option ) && ! empty( $option['badge'] ) ) : ?>
                  <span class="wpdev-badge wpdev-badge-info wpdev-type-xs wpdev-pad-x-2 wpdev-pad-y-1 wpdev-radius" style="margin-inline-start:0.5rem;font-size:10px;">
                    <?php echo esc_html( $option['badge'] ); ?>
                  </span>
                <?php endif; ?>

              </span>

              <?php if (isset($option['desc']) && !empty($option['desc'])) : ?>

                <span class="wpdev-mar-y-1 wpdev-inline-block wpdev-type-xs">

                  <?php echo esc_html($option['desc']); ?>

                </span>

              <?php endif; ?>

            <?php if ( $is_checkbox ) : ?>
            </label>
            <?php else : ?>
            </span>
            <?php endif; ?>

            <?php if ( $is_checkbox ) : ?>

              <span class="wpdev-block wpdev-mar-l-2">

                <input <?php checked($is_val_checked); ?> <?php disabled($is_disabled_on_max); ?> value="<?php echo esc_attr($value); ?>" id="<?php echo esc_attr("{$field->id}_{$value}"); ?>" type="checkbox" name="<?php echo esc_attr("{$field->id}[]"); ?>" class="wpdev-checkbox" <?php echo $field->get_html_attributes(); ?>>

              </span>

            <?php else : ?>

              <span class="wpdev-block wpdev-mar-l-2" dir="ltr">

                <div class="wpdev-toggle" dir="ltr">

                  <input <?php checked(in_array($value, (array) $field->value, true)); ?> value="<?php echo esc_attr($value); ?>" id="<?php echo esc_attr("{$field->id}_{$value}"); ?>" type="checkbox" name="<?php echo esc_attr("{$field->id}[]"); ?>" class="wpdev-tgl wpdev-tgl-ios" <?php echo $field->get_html_attributes(); ?>>

                  <label for="<?php echo esc_attr("{$field->id}_{$value}"); ?>" class="wpdev-tgl-btn wp-ui-highlight"></label>

                </div>

              </span>

            <?php endif; ?>

          </div>

        </li>

      <?php endforeach; ?>

    </ul>

    <?php if ( $has_selection_limit ) : ?>
      <div class="wpdev-selection-limit-wrap wpdev-mar-t-2" data-field-id="<?php echo esc_attr( $field->id ); ?>">
        <span class="wpdev-limit-message wpdev-type-xs wpdev-font-semibold<?php echo ( $exact_items > 0 && $checked_count === $exact_items ) ? ' is-valid wpdev-type-green-600' : ( ( $exact_items > 0 && $checked_count !== $exact_items ) ? ' is-invalid wpdev-type-red-600' : '' ); ?>">
          <?php
          if ( $exact_items > 0 ) {
            if ( $checked_count === $exact_items ) {
              echo esc_html( sprintf( ! empty( $notice_valid ) ? $notice_valid : __( '✓ دقیقاً %d خدمت انتخاب شده است.', 'wpdev' ), $exact_items ) );
            } else {
              echo esc_html( sprintf( ! empty( $notice_invalid ) ? $notice_invalid : __( '⚠ خطا: باید دقیقاً %d خدمت انتخاب شود. (تعداد فعلی: %d مورد)', 'wpdev' ), $exact_items, $checked_count ) );
            }
          }
          ?>
        </span>
      </div>
    <?php endif; ?>
 
    <?php
    $quick_add = isset( $field->quick_add ) ? (array) $field->quick_add : ( isset( $field_atts['quick_add'] ) ? (array) $field_atts['quick_add'] : [] );
    if ( ! empty( $quick_add['taxonomy'] ) && function_exists( 'wpdev_get_form_url' ) ) :
      $qa_form_id   = ! empty( $quick_add['form_id'] ) ? (string) $quick_add['form_id'] : 'wpdev_quick_add_term';
      $qa_modal_url = wpdev_get_form_url( $qa_form_id, [
        'width'    => (int) ( $quick_add['width'] ?? 460 ),
        'height'   => (int) ( $quick_add['height'] ?? 280 ),
        'taxonomy' => (string) $quick_add['taxonomy'],
        'field_id' => (string) $field->id,
      ] );
      $qa_btn_label = ! empty( $quick_add['button_label'] ) ? (string) $quick_add['button_label'] : __( 'Quick Add', 'wpdev' );
    ?>
      <div class="wpdev-mar-t-2">
        <a href="<?php echo esc_url( $qa_modal_url ); ?>" class="button wpdev-btn wpdev-btn-secondary wubox" data-field-id="<?php echo esc_attr( $field->id ); ?>" data-taxonomy="<?php echo esc_attr( $quick_add['taxonomy'] ); ?>">
          <span class="dashicons dashicons-plus-alt2" style="vertical-align:text-top;margin-inline-end:4px;"></span>
          <?php echo esc_html( $qa_btn_label ); ?>
        </a>
      </div>
    <?php endif; ?>

  </div>

</li>
