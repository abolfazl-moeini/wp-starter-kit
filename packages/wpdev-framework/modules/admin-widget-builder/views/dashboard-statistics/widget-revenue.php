<?php
/**
 * Total widget view.
 *
 * @since 2.0.0
 */
?>

<div class="wpdev-styling">
  <ul class="lg:wpdev-flex wpdev-my-0 wpdev-mx-0">

    <li class="wpdev-p-2 wpdev-w-full md:wpdev-w-4/12 wpdev-relative" <?php echo wpdev_tooltip_text(__('MRR stands for Monthly Recurring Revenue', 'wpdev')); ?>>

      <div>

        <strong class="wpdev-text-gray-800 wpdev-text-2xl md:wpdev-text-xl">
          <?php echo wpdev_format_currency($mrr); ?>
        </strong>

      </div>

      <div class="wpdev-text-md wpdev-text-gray-600">
        <span class="wpdev-block"><?php _e('MRR', 'wpdev'); ?></span>
      </div>

    </li>

    <li class="wpdev-p-2 wpdev-w-full md:wpdev-w-4/12 wpdev-relative">

      <div>

        <strong class="wpdev-text-gray-800 wpdev-text-2xl md:wpdev-text-xl">
          <?php echo wpdev_format_currency($gross_revenue); ?>
        </strong>

      </div>

      <div class="wpdev-text-md wpdev-text-gray-600">
        <span class="wpdev-block"><?php _e('Gross Revenue', 'wpdev'); ?></span>
      </div>

    </li>

    <li class="wpdev-p-2 wpdev-w-full md:wpdev-w-4/12 wpdev-relative">

      <div>

        <strong class="wpdev-text-gray-800 wpdev-text-2xl md:wpdev-text-xl">
          <?php echo wpdev_format_currency($refunds); ?>
        </strong>

      </div>

      <div class="wpdev-text-md wpdev-text-gray-600">
        <span class="wpdev-block"><?php _e('Refunded', 'wpdev'); ?></span>
      </div>

    </li>

  </ul>

  <div class="wpdev--mx-3 wpdev--mb-3 wpdev-mt-2">

    <table class="wp-list-table widefat fixed striped wpdev-border-t-1 wpdev-border-l-0 wpdev-border-r-0">

        <thead>
          <tr>
            <th><?php _e('Product', 'wpdev'); ?></th>
            <th class="wpdev-text-right"><?php _e('Revenue', 'wpdev'); ?></th>
          </tr>
        </thead>

        <tbody>

          <?php if ( function_exists( 'wpdev_get_products' ) && wpdev_get_products() ) : ?>

            <?php foreach ($product_stats as $stats) : ?>

              <tr>
                <td>
                  <?php echo $stats['label']; ?>
                </td>
                <td class="wpdev-text-right">
                  <?php echo wpdev_format_currency($stats['revenue']); ?>
                </td>
              </tr>

            <?php endforeach; ?>

          <?php else : ?>

            <tr>
              <td colspan="2">
                <?php _e('No Products found.', 'wpdev'); ?>
              </td>
            </tr>

          <?php endif; ?>

        </tbody>

    </table>

  </div>

</div>
