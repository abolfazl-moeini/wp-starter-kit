<?php
/**
 * Repeater field view.
 *
 * @since 2.0.0
 */
?>
<?php if ($field->title) : ?>

  <li id="" class="<?php echo esc_attr(trim($field->wrapper_classes)); ?>" <?php echo $field->get_wrapper_html_attributes(); ?>>

    <div class="wpdev-full wpdev-block">

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
    if (is_array($field->value)) {
      if (isset($field->value[0]) && is_array($field->value[0])) {
        // Already row-major array of rows
        $field->values = array_values($field->value);
      } else {
        // Column-major array of columns
        $_values = array();
        $cols = $field->value;
        $max_count = 0;
        foreach ($cols as $col_name => $col_vals) {
          if (is_array($col_vals)) {
            $max_count = max($max_count, count($col_vals));
          }
        }
        for ($i = 0; $i < $max_count; $i++) {
          $row = array();
          foreach ($cols as $col_name => $col_vals) {
            $row[$col_name] = is_array($col_vals) && isset($col_vals[$i]) ? $col_vals[$i] : '';
          }
          $_values[] = $row;
        }
        $field->values = $_values;
      }
    }
  }

  $defined_fields = array();
  if (is_array($field->fields)) {
    foreach ($field->fields as $key => $sub_field_config) {
      if (!is_array($sub_field_config)) {
        continue;
      }
      $clean_key = rtrim((string) $key, '[]');
      $defined_fields[$clean_key] = $sub_field_config;
    }
  }

  // Nested form defaults: wrap + gap so many subfields do not crush into one row.
  $repeater_form_classes = trim( 'wpdev-row wpdev-flex-wrap wpdev-full wpdev-gap-4 ' . (string) $field->classes );
  $repeater_field_wrapper = 'wpdev-surface-transparent wpdev-box-border wpdev-pad-2 wpdev-full';

  $field_atts = method_exists( $field, 'get_attributes' ) ? $field->get_attributes() : array();

  // Sortable defaults to true unless explicitly disabled.
  $is_sortable = true;
  if ( array_key_exists( 'sortable', $field_atts ) ) {
    $is_sortable = (bool) $field_atts['sortable'];
  } elseif ( isset( $field->sortable ) ) {
    $is_sortable = (bool) $field->sortable;
  }

  // Accordion mode support.
  $is_accordion = ! empty( $field->accordion );
  $item_label   = ! empty( $field->item_label )
    ? $field->item_label
    : ( ! empty( $field->item_title ) ? $field->item_title : __( 'Item', 'wpdev' ) );

  // 'add_new' control flag: defaults to true unless explicitly false/0 or disable_add_new is non-empty.
  $show_add_new = true;
  if ( array_key_exists( 'add_new', $field_atts ) ) {
    $show_add_new = (bool) $field_atts['add_new'];
  } elseif ( isset( $field->add_new ) ) {
    $show_add_new = (bool) $field->add_new;
  }
  if ( ! empty( $field->disable_add_new ) ) {
    $show_add_new = false;
  }

  $button_label = ! empty( $field->button ) ? $field->button : ( ! empty( $field->button_label ) ? $field->button_label : __( 'Add New Item', 'wpdev' ) );

  // 'allow_empty' control flag: when true, allows 0 rows without rendering an initial dummy row.
  $allow_empty = ! empty( $field->allow_empty );
  if ( array_key_exists( 'allow_empty', $field_atts ) ) {
    $allow_empty = (bool) $field_atts['allow_empty'];
  }

  // Empty state configuration.
  $empty_state_config = null;
  if ( isset( $field->empty_state ) ) {
    $empty_state_config = $field->empty_state;
  } elseif ( isset( $field_atts['empty_state'] ) ) {
    $empty_state_config = $field_atts['empty_state'];
  }
  $has_empty_state = ! empty( $empty_state_config );
  $empty_message   = __( 'No items found.', 'wpdev' );
  $empty_icon      = 'dashicons-info';
  if ( is_array( $empty_state_config ) ) {
    if ( ! empty( $empty_state_config['message'] ) ) {
      $empty_message = $empty_state_config['message'];
    }
    if ( ! empty( $empty_state_config['icon'] ) ) {
      $empty_icon = $empty_state_config['icon'];
    }
  }
  if ( $has_empty_state ) {
    $allow_empty = true;
  }

  // Accordion badge field configuration (origin pill / sub-badge).
  $badge_field = ! empty( $field->badge_field ) ? $field->badge_field : ( ! empty( $field_atts['badge_field'] ) ? $field_atts['badge_field'] : '' );

  /**
   * Sort handle control for reordering rows.
   */
  $repeater_sort_handle = static function ( $in_header = false ) {
    $style = $in_header
      ? 'cursor:grab;margin-inline-end:0.5rem;flex-shrink:0;'
      : 'position:absolute;top:0.5rem;inset-inline-start:0.5rem;z-index:2;cursor:grab;';
    ?>
    <span
      class="wpdev-repeater-sort-handle wpdev-cursor-grab wpdev-no-underline wpdev-type-center wpdev-row-inline wpdev-items-center wpdev-justify-center wpdev-surface-gray-200 wpdev-opacity-70 hover:wpdev-opacity-100 wpdev-radius wpdev-type-gray-700 wpdev-w-6 wpdev-h-6 wpdev-shadow-xs"
      style="<?php echo esc_attr( $style ); ?>"
      title="<?php echo esc_attr__( 'Drag to reorder', 'wpdev' ); ?>"
      aria-label="<?php echo esc_attr__( 'Drag to reorder', 'wpdev' ); ?>"
    >
      <span class="dashicons dashicons-menu wpdev-align-middle" aria-hidden="true" style="font-size:16px;line-height:24px;width:16px;height:24px;"></span>
    </span>
    <?php
  };

  /**
   * Remove-line control (cloned with the row by duplicate_and_clean).
   * Click is handled via delegated listener in vue-apps (clones have no Vue bind).
   */
  $repeater_remove_button = static function ( $in_header = false ) {
    $style = $in_header
      ? 'flex-shrink:0;'
      : 'position:absolute;top:0.5rem;inset-inline-end:0.5rem;z-index:2;';
    ?>
    <a
      href="#"
      class="wpdev-remove-repeater-line wpdev-no-underline wpdev-type-center wpdev-row-inline wpdev-items-center wpdev-justify-center wpdev-surface-black wpdev-opacity-60 hover:wpdev-opacity-100 wpdev-radius-full wpdev-type-white wpdev-w-5 wpdev-h-5 wpdev-shadow-sm"
      style="<?php echo esc_attr( $style ); ?>"
      title="<?php echo esc_attr__( 'Remove line', 'wpdev' ); ?>"
      aria-label="<?php echo esc_attr__( 'Remove line', 'wpdev' ); ?>"
    >
      <span class="dashicons-wpdev-cross wpdev-align-middle" aria-hidden="true"></span>
    </a>
    <?php
  };

  $repeater_item_class = 'field-repeater field-repeater-' . sanitize_html_class( $field->id );
  if ( $is_sortable ) {
    $repeater_item_class .= ' wpdev-repeater-sortable-item';
  }
  if ( $is_accordion ) {
    $repeater_item_class .= ' wpdev-repeater-accordion-item';
  }

  $render_repeater_row = function ( $key, $value, $position, $is_last ) use (
    $field,
    $is_sortable,
    $is_accordion,
    $item_label,
    $badge_field,
    $repeater_item_class,
    $defined_fields,
    $repeater_form_classes,
    $repeater_field_wrapper,
    $repeater_sort_handle,
    $repeater_remove_button
  ) {
    $field_id = esc_attr( $field->id );
    if ( null !== $key && ! $is_last ) {
      $field_id .= $key;
    }

    $is_open = ( ! $is_accordion ) || ( 0 === $position );

    $item_classes = $repeater_item_class;
    if ( $is_accordion ) {
      if ( $is_open ) {
        $item_classes .= ' is-open';
      }
      $item_classes .= ' wpdev-block wpdev-full wpdev-relative wpdev-surface-white wpdev-border wpdev-border-gray-300 wpdev-radius wpdev-mar-b-4 wpdev-overflow-hidden';
      $item_style    = 'display:flex !important;flex-direction:column !important;width:100% !important;max-width:100% !important;box-sizing:border-box !important;padding:0 !important;';
    } else {
      $item_classes .= ' wpdev-block wpdev-full wpdev-relative wpdev-surface-gray-100 wpdev-radius wpdev-pad-4 wpdev-mar-b-4';
      $item_style    = 'display:block !important;width:100% !important;box-sizing:border-box !important;' . ( $is_sortable ? 'padding-inline-start:2.5rem;' : '' );
    }

    $row_title = '';
    if ( is_array( $value ) ) {
      foreach ( array( 'title', 'step_title', 'name', 'label', 'heading' ) as $title_key ) {
        if ( ! empty( $value[ $title_key ] ) && is_scalar( $value[ $title_key ] ) ) {
          $row_title = (string) $value[ $title_key ];
          break;
        } elseif ( ! empty( $value[ $field->id . '__' . $title_key ] ) && is_scalar( $value[ $field->id . '__' . $title_key ] ) ) {
          $row_title = (string) $value[ $field->id . '__' . $title_key ];
          break;
        }
      }
    }

    $sub_badge = '';
    if ( is_array( $value ) ) {
      if ( ! empty( $value['sub_badge'] ) && is_scalar( $value['sub_badge'] ) ) {
        $sub_badge = (string) $value['sub_badge'];
      } elseif ( ! empty( $badge_field ) ) {
        if ( ! empty( $value[ $badge_field ] ) && is_scalar( $value[ $badge_field ] ) ) {
          $sub_badge = (string) $value[ $badge_field ];
        } elseif ( ! empty( $value[ $field->id . '__' . $badge_field ] ) && is_scalar( $value[ $field->id . '__' . $badge_field ] ) ) {
          $sub_badge = (string) $value[ $field->id . '__' . $badge_field ];
        }
      }
    }
    ?>
    <li
      id="<?php echo esc_attr( $field_id ); ?>-line"
      class="<?php echo esc_attr( trim( $item_classes ) ); ?>"
      <?php echo $field->get_wrapper_html_attributes(); ?>
      <?php if ( $is_sortable ) : ?> data-repeater-sortable-id="<?php echo esc_attr( sanitize_html_class( $field->id ) ); ?>"<?php endif; ?>
      style="<?php echo esc_attr( $item_style ); ?>"
    >
      <?php if ( $is_accordion ) : ?>
        <div
          class="wpdev-repeater-accordion-header wpdev-row wpdev-items-center wpdev-justify-between wpdev-cursor-pointer wpdev-pad-y-3 wpdev-pad-x-4 wpdev-full"
          role="button"
          tabindex="0"
          style="display:flex !important;flex-direction:row !important;align-items:center !important;justify-content:space-between !important;width:100% !important;max-width:100% !important;box-sizing:border-box !important;flex-shrink:0 !important;"
          aria-expanded="<?php echo $is_open ? 'true' : 'false'; ?>"
          data-item-label="<?php echo esc_attr( $item_label ); ?>"
          <?php if ( ! empty( $badge_field ) ) : ?> data-badge-field="<?php echo esc_attr( $badge_field ); ?>"<?php endif; ?>
        >
          <div class="wpdev-row wpdev-items-center wpdev-flex-grow wpdev-gap-2">
            <?php if ( $is_sortable ) { $repeater_sort_handle( true ); } ?>
            <span class="wpdev-repeater-accordion-title wpdev-font-semibold wpdev-type-gray-800 wpdev-type-sm">
              <span class="wpdev-repeater-accordion-label"><?php echo esc_html( $item_label ); ?></span>
              <span class="wpdev-repeater-accordion-badge">#<span class="wpdev-repeater-accordion-index"><?php echo ( $position + 1 ); ?></span></span>
              <?php if ( ! empty( $row_title ) ) : ?>
                <span class="wpdev-repeater-accordion-custom-title wpdev-type-gray-600 wpdev-font-normal">&mdash; <?php echo esc_html( $row_title ); ?></span>
              <?php endif; ?>
              <?php if ( ! empty( $sub_badge ) ) : ?>
                <span class="wpdev-repeater-accordion-sub-badge wpdev-badge wpdev-badge-info wpdev-pad-x-2 wpdev-pad-y-1 wpdev-radius wpdev-type-xs wpdev-font-medium wpdev-surface-blue-50 wpdev-type-blue-700 wpdev-border wpdev-border-blue-200" style="margin-inline-start:0.5rem;"><?php echo esc_html( $sub_badge ); ?></span>
              <?php endif; ?>
            </span>
          </div>
          <div class="wpdev-row wpdev-items-center wpdev-gap-3">
            <?php $repeater_remove_button( true ); ?>
            <span class="wpdev-repeater-accordion-chevron dashicons dashicons-arrow-down-alt2 wpdev-type-gray-600" aria-hidden="true"></span>
          </div>
        </div>
        <div class="wpdev-repeater-accordion-content wpdev-full wpdev-pad-4"<?php if ( ! $is_open ) : ?> style="display:none;"<?php else : ?> style="display:block;width:100% !important;max-width:100% !important;box-sizing:border-box !important;flex-grow:1 !important;clear:both !important;"<?php endif; ?>>
          <?php
            $row_fields = array();
            foreach ( $defined_fields as $sub_key => $sub_config ) {
              $sub_config_copy = $sub_config;
              $val = null;
              if ( is_array( $value ) ) {
                if ( isset( $value[ $sub_key ] ) ) {
                  $val = $value[ $sub_key ];
                } elseif ( isset( $value[ $field->id . '__' . $sub_key ] ) ) {
                  $val = $value[ $field->id . '__' . $sub_key ];
                }
              }
              $sub_config_copy['value'] = $val;
              $form_key = isset( $sub_config['id'] ) ? $sub_config['id'] : $sub_key . '[]';
              $row_fields[ $form_key ] = $sub_config_copy;
            }

            $form = new \WPDevFramework\UI\Form( $field->id, $row_fields, array(
              'views'                 => 'admin-pages/fields',
              'classes'               => $repeater_form_classes,
              'field_wrapper_classes' => $repeater_field_wrapper,
            ) );

            $form->render();
          ?>
        </div>
      <?php else : ?>
        <?php if ( $is_sortable ) { $repeater_sort_handle( false ); } ?>
        <?php $repeater_remove_button( false ); ?>
        <div class="wpdev-full">
          <?php
            $row_fields = array();
            foreach ( $defined_fields as $sub_key => $sub_config ) {
              $sub_config_copy = $sub_config;
              $val = null;
              if ( is_array( $value ) ) {
                if ( isset( $value[ $sub_key ] ) ) {
                  $val = $value[ $sub_key ];
                } elseif ( isset( $value[ $field->id . '__' . $sub_key ] ) ) {
                  $val = $value[ $field->id . '__' . $sub_key ];
                }
              }
              $sub_config_copy['value'] = $val;
              $form_key = isset( $sub_config['id'] ) ? $sub_config['id'] : $sub_key . '[]';
              $row_fields[ $form_key ] = $sub_config_copy;
            }

            $form = new \WPDevFramework\UI\Form( $field->id, $row_fields, array(
              'views'                 => 'admin-pages/fields',
              'classes'               => $repeater_form_classes,
              'field_wrapper_classes' => $repeater_field_wrapper,
            ) );

            $form->render();
          ?>
        </div>
      <?php endif; ?>
    </li>
    <?php
  };

  if ( is_array( $field->values ) && count( $field->values ) > 0 ) {
    $position  = 0;
    $field_len = count( $field->values );
    foreach ( $field->values as $key => $value ) {
      $render_repeater_row( $key, $value, $position, $position === $field_len - 1 );
      $position++;
    }
  } elseif ( empty( $allow_empty ) ) {
    $render_repeater_row( null, null, 0, true );
  }

  if ( $has_empty_state ) :
    $has_rows = is_array( $field->values ) && count( $field->values ) > 0;
    ?>
    <li
      id="wpdev-repeater-<?php echo esc_attr( sanitize_html_class( $field->id ) ); ?>-empty-state"
      class="wpdev-repeater-empty-state field-repeater-<?php echo esc_attr( sanitize_html_class( $field->id ) ); ?>-empty-state wpdev-block wpdev-full wpdev-pad-6 wpdev-type-center wpdev-surface-gray-50 wpdev-border-dashed wpdev-border-gray-300 wpdev-radius wpdev-mar-b-4"
      style="<?php echo $has_rows ? 'display:none;' : 'display:block;'; ?>"
    >
      <?php if ( ! empty( $empty_icon ) ) : ?>
        <span class="dashicons <?php echo esc_attr( $empty_icon ); ?> wpdev-type-gray-500 wpdev-type-xl wpdev-block wpdev-mar-b-2" style="font-size:28px;width:28px;height:28px;margin:0 auto 8px auto;" aria-hidden="true"></span>
      <?php endif; ?>
      <p class="wpdev-type-gray-600 wpdev-type-sm wpdev-mar-0 wpdev-font-medium"><?php echo esc_html( $empty_message ); ?></p>
    </li>
  <?php endif; ?>

<?php if ( $show_add_new ) : ?>
<li class="wpdev-block wpdev-full wpdev-pad-0 wpdev-mar-b-4" style="display:block !important;width:100% !important;box-sizing:border-box !important;" <?php echo $field->get_wrapper_html_attributes(); ?>>

  <a class="button wpdev-full wpdev-type-center" href="#" style="display:block !important;width:100% !important;text-align:center !important;" v-on:click.prevent="duplicate_and_clean($event, '.field-repeater-<?php echo esc_attr( sanitize_html_class( $field->id ) ); ?>')">
      <?php echo esc_html( $button_label ); ?>
  </a>

</li>
<?php endif; ?>
