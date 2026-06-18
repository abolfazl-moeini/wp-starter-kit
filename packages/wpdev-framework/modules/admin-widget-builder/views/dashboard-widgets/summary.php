<?php
/**
 * Summary view.
 *
 * @since 2.0.0
 */
?>
<div class="wpdev-styling">

  <ul class="md:wpdev-flex wpdev-m-0">

    <li class="wpdev-p-2 wpdev-w-full md:wpdev-w-4/12 wpdev-relative">

      <div>

        <strong class="wpdev-text-gray-800 wpdev-text-base">
          <?php echo esc_html( (string) ( $signups ?? 0 ) ); ?>
        </strong>

      </div>

      <div class="wpdev-text-md wpdev-text-gray-600">
        <span class="wpdev-block"><?php _e('Signups today', 'wpdev'); ?></span>
      </div>

    </li>

    <li class="wpdev-p-2 wpdev-w-full md:wpdev-w-4/12 wpdev-relative" <?php echo wpdev_tooltip_text(__('MRR stands for Monthly Recurring Revenue', 'wpdev')); ?>>

      <div>

        <strong class="wpdev-text-gray-800 wpdev-text-base">
          <?php echo wpdev_format_currency($mrr); ?>
        </strong>

      </div>

      <div class="wpdev-text-md wpdev-text-gray-600">
        <span class="wpdev-block"><?php _e('MRR', 'wpdev'); ?></span>
      </div>

    </li>

    <li class="wpdev-p-2 wpdev-w-full md:wpdev-w-4/12 wpdev-relative">

      <div>

        <strong class="wpdev-text-gray-800 wpdev-text-base">
          <?php echo wpdev_format_currency($gross_revenue); ?>
        </strong>

      </div>

      <div class="wpdev-text-md wpdev-text-gray-600">
        <span class="wpdev-block"><?php _e('Today\'s gross revenue', 'wpdev'); ?></span>
      </div>

    </li>

  </ul>

</div>
