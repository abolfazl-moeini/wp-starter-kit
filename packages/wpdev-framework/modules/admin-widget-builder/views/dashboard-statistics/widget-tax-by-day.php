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
  $slug = 'taxes_by_day';
	$headers = array(
		__('Day', 'wpdev'),
		__('Orders', 'wpdev'),
		__('Total Sales', 'wpdev'),
		__('Tax Total', 'wpdev'),
		__('Net Profit', 'wpdev'),
	);

	foreach ($taxes_by_day as $day => $tax_line) {

		$line = array(
			date_i18n(get_option('date_format'), strtotime($day)),
			$tax_line['order_count'],
			wpdev_format_currency($tax_line['total']),
			wpdev_format_currency($tax_line['tax_total']),
			wpdev_format_currency($tax_line['net_profit'])
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
            <th class="wpdev-w-1/3"><?php _e('Day', 'wpdev'); ?></th>
            <th><?php _e('Orders', 'wpdev'); ?></th>
            <th><?php _e('Total Sales', 'wpdev'); ?></th>
            <th><?php _e('Tax Total', 'wpdev'); ?></th>
            <th><?php _e('Net Profit', 'wpdev'); ?></th>
          </tr>
        </thead>

        <tbody>

          <?php if ($taxes_by_day) : ?>

            <?php foreach ($taxes_by_day as $day => $tax_line) : ?>

              <tr>
                <td>
                  <?php echo date_i18n(get_option('date_format'), strtotime($day)); ?>
                </td>
                <td>
                  <?php echo $tax_line['order_count']; ?>
                </td>
                <td>
                  <?php echo wpdev_format_currency($tax_line['total']); ?>
                </td>
                <td>
                  <?php echo wpdev_format_currency($tax_line['tax_total']); ?>
                </td>
                <td>
                  <?php echo wpdev_format_currency($tax_line['net_profit']); ?>
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
