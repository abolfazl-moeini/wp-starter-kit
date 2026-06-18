<?php
/**
 * Invoices
 *
 * @since 2.0.0
 */
?>
<div class="wpdev-styling <?php echo esc_attr($className); ?>">

  <div class="<?php echo wpdev_env_picker('', 'wpdev-widget-inset'); ?>">

    <?php if ($title) : ?>

      <!-- Title Element -->

      <div class="wpdev-p-4 wpdev-flex wpdev-items-center <?php echo wpdev_env_picker('', 'wpdev-bg-gray-100 wpdev-border-solid wpdev-border-0 wpdev-border-b wpdev-border-gray-400'); ?>">

          <h3 class="wpdev-m-0 <?php echo wpdev_env_picker('', 'wpdev-widget-title'); ?>">

            <?php echo $title; ?>

          </h3>

      </div>

      <!-- Title Element - End -->

    <?php endif; ?>

    <table class="striped <?php echo wpdev_env_picker('', 'wp-list-table widefat wpdev-border-none'); ?>">

      <tbody class="wpdev-align-baseline">

        <?php foreach ($membership->get_payments(array('number' => !empty($limit) ? $limit : null)) as $payment) : ?>

          <!-- Invoice Item -->
          <tr>

            <td class="wpdev-align-middle wpdev-py-4 wpdev-px-2">

              <?php

                $download_link = sprintf('<a target="_blank" class="wpdev-no-underline wpdev-ml-2" href="%s" title="%s">

                  <span class="dashicons-wpdev-download"></span>

                </a>', $payment->get_invoice_url(), esc_attr__('Download Invoice', 'wpdev'));

                $payment_column =  $payment->get_status() === 'pending' ? array(
                  'pay_now' => array(
                    'url'    => add_query_arg(array('payment' => $payment->get_hash()), wpdev_get_registration_url()),
                    'icon' => 'dashicons-wpdev-credit-card wpdev-align-middle wpdev-mr-1',
                    'label' => __('Go to payment', 'wpdev'),
                    'value' => __('Pay Now', 'wpdev'),
                  ),
                ) : array();

                echo wpdev_responsive_table_row(array(
                  'url'    => false,
                  'title'  => $payment->get_invoice_number().$download_link,
                  'status' => wpdev_format_currency($payment->get_total(), $payment->get_currency()),
                ), array_merge(array(
                  'status' => array(
                    'url'    => false,
                    'icon' => wpdev_get_payment_icon_classes($payment->get_status()).' wpdev-mr-1',
                    'value' => $payment->get_status_label(),
                  )),
                  $payment_column
                ), array(
                  'date_created' => array(
                    'url'    => false,
                    'icon'  => 'dashicons-wpdev-calendar1 wpdev-align-middle wpdev-mr-1',
                    'label' => '',
                    'value' => $payment->get_formatted_date('date_created'),
                  ),
                ));

              ?>

            </td>

          </tr>
          <!-- Invoice Item - End -->

      <?php endforeach; ?>

      </tbody>

    </table>

  </div>

</div>
