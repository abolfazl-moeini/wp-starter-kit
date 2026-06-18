<?php
/**
 * Total widget view.
 *
 * @since 2.0.0
 */
?>
<div class="wpdev-styling">

  <div class="wpdev-widget-inset">

  <?php

  $data = array();
  $slug = 'taxes_by_code';
  $headers = array(
    __('Tax', 'wpdev'),
    __('Rate', 'wpdev'),
    __('Orders', 'wpdev'),
    __('Tax Total', 'wpdev'),
  );

  foreach ($taxes_by_rate as $tax_line) {

    $line = array(
      wpdev_get_isset($tax_line, 'title', 'No Name'),
      $tax_line['tax_rate'],
      $tax_line['order_count'],
      wpdev_format_currency($tax_line['tax_total']),
    );

    $data[] = $line;

  } // end foreach;

  $page->render_csv_button(array(
    'headers' => $headers,
    'data'    => $data,
    'slug'    => $slug
  ));

  ?>

    <table class="wp-list-table widefat fixed striped wpdev-border-none">

        <thead>
          <tr>
            <th><?php _e('Tax', 'wpdev'); ?></th>
            <th><?php _e('Rate', 'wpdev'); ?></th>
            <th><?php _e('Orders', 'wpdev'); ?></th>
            <th><?php _e('Tax Total', 'wpdev'); ?></th>
          </tr>
        </thead>

        <tbody>

          <?php if ($taxes_by_rate) : ?>

            <?php foreach ($taxes_by_rate as $tax_line) : ?>

              <tr>
                <td>
                  <?php echo wpdev_get_isset($tax_line, 'title', 'No Name'); ?>
                </td>
                <td>
                  <?php echo $tax_line['tax_rate']; ?>%
                </td>
                <td>
                  <?php echo $tax_line['order_count']; ?>
                </td>
                <td>
                  <?php echo wpdev_format_currency($tax_line['tax_total']); ?>
                </td>
              </tr>

            <?php endforeach; ?>

          <?php else : ?>

              <tr>
                <td colspan="4">
                  <?php _e('No Taxes found.', 'wpdev'); ?>
                </td>
              </tr>

          <?php endif; ?>

        </tbody>

    </table>

  </div>

</div>
