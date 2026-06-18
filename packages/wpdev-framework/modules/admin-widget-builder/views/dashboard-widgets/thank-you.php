<?php
/**
 * Thank You Element
 *
 * @since 2.0.0
 */
?>
<div id="wpdev-thank-you-element" class="wpdev-styling <?php echo esc_attr($className); ?>">

  <div class="<?php echo wpdev_env_picker('', 'wpdev-widget-inset'); ?>">

    <?php if (in_array($payment->get_status(), array('completed'))) : ?>

      <!-- Thank You -->
      <div id="wpdev-thank-you-message-block">

        <!-- Title Element -->
        <div class="wpdev-p-4 wpdev-flex wpdev-items-center <?php echo wpdev_env_picker('', 'wpdev-bg-gray-100'); ?>">

          <?php if ($title) : ?>

            <h3 class="wpdev-m-0 <?php echo wpdev_env_picker('', 'wpdev-widget-title'); ?>">

              <?php echo $title; ?>

            </h3>

          <?php endif; ?>

        </div>
        <!-- Title Element - End -->

        <!-- Body Content -->
        <div class="wpdev-thank-you-message wpdev-px-4">

          <?php echo do_shortcode($thank_you_message); ?>

        </div>
        <!-- Body Content - End -->

        <ul class="wpdev-thank-you-info wpdev-grid wpdev-grid-cols-3 wpdev-gap-4 wpdev-m-0 wpdev-px-4 wpdev-py-6 wpdev-list-none">

          <!-- Info Item -->
          <li>

            <span class="wpdev-uppercase wpdev-text-sm wpdev-block">

              <?php _e('Order ID', 'wpdev'); ?>

            </span>

            <span class="wpdev-text-md wpdev-font-bold wpdev-block">

              <?php echo $payment->get_hash(); ?>

              <small class="wpdev-text-gray-600 wpdev-font-normal wpdev-m-0 wpdev-block">

                <?php echo date_i18n(get_option('date_format'), strtotime($payment->get_date_created())); ?>

              </small>

            </span>

          </li>
          <!-- Info Item - End -->

          <!-- Info Item -->
          <li>

            <span class="wpdev-uppercase wpdev-text-sm wpdev-block">

              <?php _e('Email', 'wpdev'); ?>

            </span>

            <span class="wpdev-text-md wpdev-font-bold wpdev-block">

              <?php echo $customer->get_email_address(); ?>

            </span>

          </li>
          <!-- Info Item - End -->

          <!-- Info Item -->
          <li>

            <span class="wpdev-uppercase wpdev-text-sm wpdev-block">

              <?php _e('Total', 'wpdev'); ?>

            </span>

            <span class="wpdev-text-md wpdev-font-bold wpdev-block">

              <?php echo wpdev_format_currency($payment->get_total(), $payment->get_currency()); ?>

            </span>

          </li>
          <!-- Info Item - End -->

        </ul>

      </div>
      <!-- Thank You - End -->

    <?php else : ?>

      <!-- Thank You -->
      <div id="wpdev-thank-you-message-block">

        <!-- Title Element -->
        <div class="wpdev-p-4 wpdev-flex wpdev-items-center <?php echo wpdev_env_picker('', 'wpdev-bg-gray-100'); ?>">

          <?php if ($title_pending) : ?>

            <h3 class="wpdev-m-0 <?php echo wpdev_env_picker('', 'wpdev-widget-title'); ?>">

              <?php echo $title_pending; ?>

            </h3>

          <?php endif; ?>

        </div>
        <!-- Title Element - End -->

        <!-- Body Content -->
        <div class="wpdev-thank-you-message wpdev-px-4">

          <?php echo do_shortcode($thank_you_message_pending); ?>

        </div>
        <!-- Body Content - End -->

        <ul class="wpdev-thank-you-info wpdev-grid wpdev-grid-cols-2 wpdev-gap-4 wpdev-m-0 wpdev-px-4 wpdev-py-6 wpdev-list-none">

          <!-- Info Item -->
          <li>

            <span class="wpdev-uppercase wpdev-text-sm wpdev-block">

              <?php _e('Order ID', 'wpdev'); ?>

            </span>

            <span class="wpdev-text-md wpdev-font-bold wpdev-block">

              <?php echo $payment->get_hash(); ?>

            </span>

          </li>
          <!-- Info Item - End -->

          <!-- Info Item -->
          <li>

            <span class="wpdev-uppercase wpdev-text-sm wpdev-block">

              <?php _e('Date', 'wpdev'); ?>

            </span>

            <span class="wpdev-text-md wpdev-font-bold wpdev-block">

              <?php echo date_i18n(get_option('date_format'), strtotime($payment->get_date_created())); ?>

            </span>

          </li>
          <!-- Info Item - End -->

          <!-- Info Item -->
          <li>

            <span class="wpdev-uppercase wpdev-text-sm wpdev-block">

              <?php _e('Email', 'wpdev'); ?>

            </span>

            <span class="wpdev-text-md wpdev-font-bold wpdev-block">

              <?php echo $customer->get_email_address(); ?>

            </span>

          </li>
          <!-- Info Item - End -->

          <!-- Info Item -->
          <li>

            <span class="wpdev-uppercase wpdev-text-sm wpdev-block">

              <?php _e('Total', 'wpdev'); ?>

            </span>

            <span class="wpdev-text-md wpdev-font-bold wpdev-block">

              <?php echo wpdev_format_currency($payment->get_total(), $payment->get_currency()); ?>

            </span>

          </li>
          <!-- Info Item - End -->

        </ul>

      </div>
      <!-- Thank You - End -->

    <?php endif; ?>

    <?php do_action('wpdev_thank_you_before_info_blocks', $payment, $membership, $customer); ?>

    <!-- Sites -->
    <div id="wpdev-thank-you-sites">

      <!-- Title Element -->
      <div class="wpdev-p-4 wpdev-flex wpdev-items-center <?php echo wpdev_env_picker('', 'wpdev-bg-gray-100'); ?>">

        <?php if ('Site') : ?>

          <h4 class="wpdev-m-0 <?php echo wpdev_env_picker('', 'wpdev-widget-title'); ?>">

            <?php echo _e('Site', 'wpdev'); ?>

          </h4>

        <?php endif; ?>

      </div>
      <!-- Title Element - End -->

      <!-- Body Content -->
      <div class="wpdev-thank-you-pending-site wpdev-px-4 wpdev-mb-4">

        <?php do_action('wpdev_thank_you_site_block', $payment, $membership, $customer); ?>

        <div id="wpdev-sites">

          <?php if ($membership->get_sites()) : ?>

            <?php foreach ($membership->get_sites() as $site) : ?>

              <div class="wpdev-bg-gray-100 wpdev-p-4 wpdev-rounded wpdev-mb-2 sm:wpdev-flex wpdev-items-center">

                <div class="wpdev-flex-shrink sm:wpdev-mr-4">

                  <img
                    class="sm:wpdev-w-12 sm:wpdev-h-12 wpdev-mb-4 sm:wpdev-mb-0 wpdev-rounded"
                    src="<?php echo $site->get_featured_image('thumbnail'); ?>"
                  />

                </div>

                <div class="wpdev-flex-grow">

                  <h5 class="wpdev-mb-1">

                    <?php echo ucfirst($site->get_title()); ?>

                    <?php if ($site->get_type() === 'pending') : ?>

                      <span class="wpdev-align-middle wpdev-inline-block wpdev-rounded wpdev-px-2 wpdev-py-1 wpdev-uppercase wpdev-text-xs wpdev-font-bold <?php echo esc_attr($site->get_type_class()); ?>">
                        <?php echo $site->get_type_label(); ?>
                      </span>

                      <span v-cloak v-if="creating && false" class="wpdev-align-middle wpdev-inline-block wpdev-rounded wpdev-px-2 wpdev-py-1 wpdev-uppercase wpdev-text-xs wpdev-font-bold wpdev-text-gray-700 wpdev-bg-gray-300">
                        {{ progress }}%
                      </span>

                    <?php else : ?>

                      <span class="wpdev-align-middle wpdev-inline-block wpdev-rounded wpdev-px-2 wpdev-py-1 wpdev-uppercase wpdev-text-xs wpdev-font-bold wpdev-bg-green-300 wpdev-text-green-700">
                        <?php _e('Ready!', 'wpdev'); ?>
                      </span>

                    <?php endif; ?>

                  </h5>

                  <div class="wpdev-truncate">

                    <span class="wpdev-text-sm">

                      <?php echo $site->get_active_site_url(); ?>

                    </span>

                  </div>

                </div>

                <div class="wpdev-justify-align-end sm:wpdev-ml-4">

                  <?php if ($site->get_type() === 'pending') : ?>

                    <a v-if="!creating" href="<?php echo wpdev_get_current_url(); ?>" class="wpdev-block sm:wpdev-inline-block wpdev-no-underline">
                      <span class="dashicons-wpdev-cycle wpdev-align-middle wpdev-mr-1"></span>
                      <?php _e('Check Status', 'wpdev'); ?>
                    </a>
                    <div v-else class="wpdev-block sm:wpdev-inline-block wpdev-no-underline">
                      <span class="dashicons-wpdev-loader wpdev-align-middle wpdev-mr-1 wpdev-spin" style="display: inline-block;"></span>
                      <?php _e('Creating', 'wpdev'); ?>
                    </div>

                  <?php else : ?>

                    <a href="<?php echo esc_attr(get_admin_url($site->get_id())); ?>" class="wpdev-block sm:wpdev-inline-block wpdev-no-underline sm:wpdev-mr-4">
                      <span class="dashicons-wpdev-gauge wpdev-align-middle wpdev-mr-1"></span>
                      <?php _e('Admin Panel', 'wpdev'); ?>
                    </a>

                    <a href="<?php echo esc_attr(wpdev_with_sso(get_site_url($site->get_id()))); ?>" class="wpdev-block sm:wpdev-inline-block wpdev-no-underline" target="_blank">
                      <span class="dashicons-wpdev-browser wpdev-align-middle wpdev-mr-1"></span>
                      <?php _e('Visit', 'wpdev'); ?>
                    </a>

                  <?php endif; ?>

                </div>

              </div>

            <?php endforeach; ?>

          <?php else : ?>

            <div class="wpdev-bg-gray-100 wpdev-p-4 wpdev-rounded">

              <?php echo do_shortcode($no_sites_message); ?>

            </div>

          <?php endif; ?>

        </div>

      </div>
      <!-- Body Content - End -->

    </div>
    <!-- Sites - End -->

    <!-- Order Details -->
    <div id="wpdev-thank-you-order-details">

      <!-- Title Element -->
      <div class="wpdev-p-4 wpdev-flex wpdev-items-center <?php echo wpdev_env_picker('', 'wpdev-bg-gray-100'); ?>">

        <?php if ('Order Details') : ?>

          <h4 class="wpdev-m-0 <?php echo wpdev_env_picker('', 'wpdev-widget-title'); ?>">

            <?php echo _e('Order Details', 'wpdev'); ?>

          </h4>

        <?php endif; ?>

      </div>
      <!-- Title Element - End -->

      <!-- Body Content -->
      <div class="wpdev-thank-you-message wpdev-px-4 wpdev-mb-4">

        <table>

          <thead class="wpdev-bg-gray-100">

            <tr>
              <th class="wpdev-text-left wpdev-py-2 wpdev-px-4"><?php _e('Product', 'wpdev'); ?></th>
              <th class="wpdev-text-left wpdev-py-2 wpdev-px-4"><?php _e('Total', 'wpdev'); ?></th>
            </tr>

          </thead>

          <tbody>

            <?php foreach ($payment->get_line_items() as $line_item) : ?>

              <tr>

                <td class="wpdev-py-2 wpdev-px-4">
                  <?php echo $line_item->get_title(); ?>
                  <code class="wpdev-ml-1">x<?php echo $line_item->get_quantity(); ?></code>
                </td>

                <td class="wpdev-py-2 wpdev-px-4">
                  <?php echo wpdev_format_currency($line_item->get_subtotal(), $payment->get_currency()); ?>
                </td>

              </tr>

            <?php endforeach; ?>

          </tbody>

          <tfoot class="wpdev-bg-gray-100">

            <tr>
              <th class="wpdev-text-left wpdev-py-2 wpdev-px-4"><?php _e('Subtotal', 'wpdev'); ?></th>
              <th class="wpdev-text-left wpdev-py-2 wpdev-px-4"><?php echo wpdev_format_currency($payment->get_subtotal(), $payment->get_currency()); ?></th>
            </tr>

            <?php foreach ($payment->get_tax_breakthrough() as $rate => $total) : ?>

              <tr>
                <th class="wpdev-text-left wpdev-py-2 wpdev-px-4"><?php printf(__('Tax (%s%%)', 'wpdev'), $rate); ?></th>
                <th class="wpdev-text-left wpdev-py-2 wpdev-px-4"><?php echo wpdev_format_currency($total, $payment->get_currency()); ?></th>
              </tr>

            <?php endforeach; ?>

            <tr>
              <th class="wpdev-text-left wpdev-py-2 wpdev-px-4"><?php _e('Total', 'wpdev'); ?></th>
              <th class="wpdev-text-left wpdev-py-2 wpdev-px-4"><?php echo wpdev_format_currency($payment->get_total(), $payment->get_currency()); ?></th>
            </tr>

          </tfoot>

        </table>

      </div>
      <!-- Body Content - End -->

    </div>
    <!-- Order Details - End -->

    <!-- Billing Address -->
    <div id="wpdev-thank-you-billing-address">

      <!-- Title Element -->
      <div class="wpdev-p-4 wpdev-flex wpdev-items-center <?php echo wpdev_env_picker('', 'wpdev-bg-gray-100'); ?>">

        <?php if ('Billing Address') : ?>

          <h4 class="wpdev-m-0 <?php echo wpdev_env_picker('', 'wpdev-widget-title'); ?>">

            <?php echo _e('Billing Address', 'wpdev'); ?>

          </h4>

        <?php endif; ?>

      </div>
      <!-- Title Element - End -->

      <!-- Body Content -->
      <div class="wpdev-thank-you-billing-address wpdev-p-4 wpdev-mx-4 wpdev-bg-gray-100 wpdev-rounded">

        <?php echo $membership->get_billing_address()->to_string('<br>'); ?>

      </div>
      <!-- Body Content - End -->

    </div>
    <!-- Billing Address - End -->

  </div>

</div>
