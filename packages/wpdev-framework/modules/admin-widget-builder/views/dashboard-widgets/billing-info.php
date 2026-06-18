<?php
/**
 * Billing Info
 *
 * @since 2.0.0
 */
?>
<div class="wpdev-styling <?php echo esc_attr($className); ?>">

  <div class="<?php echo wpdev_env_picker('', 'wpdev-widget-inset'); ?>">

    <!-- Billing Address -->

    <div id="wpdev-billing-address">

      <!-- Title Element -->
      <div class="wpdev-p-4 wpdev-flex wpdev-items-center <?php echo wpdev_env_picker('', 'wpdev-bg-gray-100'); ?>">

        <?php if ($title) : ?>

          <h3 class="wpdev-m-0 <?php echo wpdev_env_picker('', 'wpdev-widget-title'); ?>">

            <?php echo $title; ?>

          </h3>

        <?php endif; ?>

        <div class="wpdev-ml-auto">

          <a
            title="<?php esc_attr_e('Update Billing Address', 'wpdev'); ?>"
            class="wpdev-text-sm wpdev-no-underline wubox button"
            href="<?php echo $update_billing_address_link; ?>"
          >

            <?php _e('Update', 'wpdev'); ?>

          </a>

        </div>

      </div>
      <!-- Title Element - End -->

      <?php if (!$billing_address->exists()) : ?>

        <div class="wpdev-p-4 wpdev-border-t wpdev-border-solid wpdev-border-0 wpdev-border-gray-200">

          <div class="wpdev-p-4 wpdev-bg-gray-100 wpdev-rounded">

            <?php printf(__('No billing address found. Click <a title="%1$s" href="%2$s" class="wubox wpdev-no-underline">here</a> to add one.', 'wpdev'), __('Update Billing Address', 'wpdev'), $update_billing_address_link); ?>

          </div>

        </div>

      <?php else : ?>

        <div class="wpdev-overflow-hidden">

          <?php foreach ($billing_address->to_array(true) as $label => $value) : ?>

          <div class="wpdev-border-t wpdev-border-solid wpdev-border-0 wpdev-border-gray-200 wpdev-px-4 wpdev-py-2 sm:wpdev-p-0">

            <div class="sm:wpdev-divide-y sm:wpdev-divide-gray-200">
              <div class="wpdev-py-4 sm:wpdev-grid sm:wpdev-grid-cols-3 sm:wpdev-gap-4 sm:wpdev-px-4">
                <div class="wpdev-text-sm wpdev-font-medium wpdev-text-gray-600">
				<?php echo $label; ?>
                </div>
                <div class="wpdev-mt-1 wpdev-text-sm wpdev-text-gray-900 sm:wpdev-mt-0 sm:wpdev-col-span-2">
				<?php echo $value; ?>
                </div>
              </div>
            </div>

          </div>

          <?php endforeach; ?>

        </div>

      <?php endif; ?>

    </div>

    <!-- Billing Address - End -->

    <?php if ($membership->is_recurring() && false) : ?>

      <!-- Payment Method -->

      <div id="wpdev-payment-method">

        <!-- Title Element -->
        <div class="wpdev-p-4 wpdev-flex wpdev-items-center <?php echo wpdev_env_picker('', 'wpdev-bg-gray-100 wpdev-border-solid wpdev-border-0 wpdev-border-b wpdev-border-t wpdev-border-gray-200'); ?>">

          <?php if (true) : ?>

            <h3 class="wpdev-m-0 <?php echo wpdev_env_picker('', 'wpdev-widget-title'); ?>">

              <?php echo __('Payment Method', 'wpdev'); ?>

            </h3>

          <?php endif; ?>

          <div class="wpdev-ml-auto">

            <a
              title="<?php esc_attr_e('Update Billing Address', 'wpdev'); ?>"
              class="wpdev-text-sm wpdev-no-underline wubox button"
              href="<?php echo $update_billing_address_link; ?>"
            >

              <?php _e('Update', 'wpdev'); ?>

            </a>

          </div>

        </div>
        <!-- Title Element - End -->

        <div class="">

          <div class="wpdev-p-4">

            <div class="sm:wpdev-flex sm:wpdev-items-center sm:wpdev-justify-between">

              <h4 class="screen-reader-text">Visa</h4>

              <div class="sm:wpdev-flex sm:wpdev-items-center">

                <svg class="wpdev-h-8 wpdev-w-auto sm:wpdev-flex-shrink-0 sm:wpdev-h-6" viewBox="0 0 36 24" aria-hidden="true">
                  <rect width="36" height="24" fill="#224DBA" rx="4" />
                  <path fill="#fff"
                    d="M10.925 15.673H8.874l-1.538-6c-.073-.276-.228-.52-.456-.635A6.575 6.575 0 005 8.403v-.231h3.304c.456 0 .798.347.855.75l.798 4.328 2.05-5.078h1.994l-3.076 7.5zm4.216 0h-1.937L14.8 8.172h1.937l-1.595 7.5zm4.101-5.422c.057-.404.399-.635.798-.635a3.54 3.54 0 011.88.346l.342-1.615A4.808 4.808 0 0020.496 8c-1.88 0-3.248 1.039-3.248 2.481 0 1.097.969 1.673 1.653 2.02.74.346 1.025.577.968.923 0 .519-.57.75-1.139.75a4.795 4.795 0 01-1.994-.462l-.342 1.616a5.48 5.48 0 002.108.404c2.108.057 3.418-.981 3.418-2.539 0-1.962-2.678-2.077-2.678-2.942zm9.457 5.422L27.16 8.172h-1.652a.858.858 0 00-.798.577l-2.848 6.924h1.994l.398-1.096h2.45l.228 1.096h1.766zm-2.905-5.482l.57 2.827h-1.596l1.026-2.827z" />
                </svg>

                <div class="wpdev-mt-3 sm:wpdev-mt-0 sm:wpdev-ml-4">

                  <div class="wpdev-text-sm wpdev-font-medium wpdev-text-gray-900">
                    Ending with 4242
                  </div>

                  <div class="wpdev-mt-1 wpdev-text-sm wpdev-text-gray-600 sm:wpdev-flex sm:wpdev-items-center">

                    <div>
                      Expires 12/20
                    </div>

                    <span class="wpdev-hidden sm:wpdev-mx-2 sm:wpdev-inline md:wpdev-hidden lg:wpdev-inline" aria-hidden="true">
                      &middot;
                    </span>

                    <div class="wpdev-mt-1 sm:wpdev-mt-0 sm:wpdev-inline md:wpdev-hidden lg:wpdev-inline">
                      Last updated on 22 Aug 2017
                    </div>

                  </div>

                </div>

              </div>

            </div>

          </div>

        </div>

      </div>

      <!-- Payment Method - End -->

    <?php endif; ?>

  </div>

</div>
