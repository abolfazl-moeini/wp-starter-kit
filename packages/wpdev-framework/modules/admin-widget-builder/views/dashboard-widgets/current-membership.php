<?php
/**
 * The Current Membership
 *
 * @since 2.0.0
 */
?>
<div class="wpdev-styling <?php echo esc_attr($className); ?>">

  <div class="<?php echo wpdev_env_picker('', 'wpdev-widget-inset'); ?>">

    <!-- Title Element -->
    <div class="wpdev-p-4 wpdev-flex wpdev-items-center <?php echo wpdev_env_picker('', 'wpdev-bg-gray-100 wpdev-border-solid wpdev-border-0 wpdev-border-b wpdev-border-gray-200'); ?>">

      <?php if ($title) : ?>

        <h3 class="wpdev-m-0 <?php echo wpdev_env_picker('', 'wpdev-widget-title'); ?>">

          <?php echo $title; ?>

        </h3>

      <?php endif; ?>

      <?php if (!in_array(wpdev_request('page'), apply_filters('wpdev_hide_membership_change_on_pages', array()), true)) : ?>

        <div class="wpdev-ml-auto">

          <a
            title="<?php esc_attr_e('Update your membership', 'wpdev'); ?>"
            class="wpdev-text-sm wpdev-no-underline button"
            href="<?php echo esc_attr(wpdev_get_membership_update_url($membership)); ?>"
          >

            <?php _e('Change', 'wpdev'); ?>

          </a>

        </div>

      <?php endif; ?>

    </div>
    <!-- Title Element - End -->

    <!-- Product Block -->

    <?php if ($plan) : ?>

      <div class="wpdev-p-4 wpdev-flex wpdev-justify-between wpdev-items-center wpdev-flex-wrap sm:wpdev-flex-nowrap">

        <div class="">

          <div class="wpdev-flex wpdev-items-center">

            <?php if ($display_images && $plan->get_featured_image()) : ?>

              <div class="wpdev-flex-shrink-0 wpdev-mr-4">

                <img
                  class="wpdev-h-8 wpdev-w-8 wpdev-rounded"
                  src="<?php echo esc_url($plan->get_featured_image()); ?>"
                  alt="<?php echo esc_attr($plan->get_name()); ?>"
                >

              </div>

            <?php endif; ?>

            <div class="">

              <span class="wpdev-text-lg wpdev-font-medium wpdev-text-gray-900 wpdev-block">

                <?php echo $plan->get_name(); ?>

                <span class="wpdev-font-mono wpdev-mx-2 wpdev-text-xs"><?php echo $membership->get_hash(); ?></span>

              </span>

              <span class="wpdev-text-sm wpdev-text-gray-600">

                <?php echo $plan->get_price_description(); ?>

              </span>

            </div>

          </div>

          <?php if ($pending_change) : ?>

            <div class="wpdev-mt-4">

              <div class="wpdev-bg-yellow-200 wpdev-text-yellow-700 wpdev-rounded wpdev-p-2">

                <?php printf(__("There's a pending change for this membership, scheduled to take place on <strong>%1\$s</strong>. Changing to <strong>%2\$s</strong>.", 'wpdev'), $pending_change_date, $pending_change); ?>

              </div>

            </div>

          <?php endif; ?>

        </div>

      </div>

    <?php endif; ?>

    <!-- Product Block - End -->

    <?php if ($membership) : ?>

      <div class="wpdev-py-4 wpdev-pb-2 wpdev-px-4 wpdev-grid wpdev-grid-cols-1 wpdev-gap-x-4 wpdev-gap-y-8 sm:wpdev-grid-cols-<?php echo esc_attr((int) $columns); ?> wpdev-border-solid wpdev-border-0 wpdev-border-b wpdev-border-t wpdev-border-gray-200">

        <div class="sm:wpdev-col-span-1">

          <div class="wpdev-text-sm wpdev-font-medium wpdev-text-gray-600">
            <?php _e('Status', 'wpdev'); ?>
          </div>

          <div class="wpdev-mt-1 wpdev-text-sm wpdev-text-gray-900 wpdev-mb-4">

            <span class="<?php echo esc_attr($membership->get_status_class()); ?> wpdev-font-medium wpdev-inline-block wpdev-py-1 wpdev-px-2 wpdev-rounded">

              <?php echo $membership->get_status_label(); ?>

            </span>

          </div>

        </div>

        <div class="sm:wpdev-col-span-1">

          <div class="wpdev-text-sm wpdev-font-medium wpdev-text-gray-600">
            <?php _e('Initial Amount', 'wpdev'); ?>
          </div>

          <div class="wpdev-mt-1 wpdev-text-sm wpdev-text-gray-900 wpdev-mb-4">
            <?php echo wpdev_format_currency($membership->get_initial_amount(), $membership->get_currency()) ?>
          </div>

        </div>

        <?php if ($membership->is_recurring()) : ?>

          <div class="sm:wpdev-col-span-1">

            <div class="wpdev-text-sm wpdev-font-medium wpdev-text-gray-600">
              <?php _e('Times Billed', 'wpdev'); ?>
            </div>

            <div class="wpdev-mt-1 wpdev-text-sm wpdev-text-gray-900 wpdev-mb-4">
              <?php echo $membership->get_times_billed_description(); ?>
            </div>

          </div>

        <?php endif; ?>

        <?php if (!$membership->is_lifetime()) : ?>

          <div class="sm:wpdev-col-span-1">

            <div class="wpdev-text-sm wpdev-font-medium wpdev-text-gray-600">
              <?php _e('Expires', 'wpdev'); ?>
            </div>

            <div class="wpdev-mt-1 wpdev-text-sm wpdev-text-gray-900 wpdev-mb-4">
              <?php echo $membership->get_formatted_date('date_expiration'); ?>
            </div>

          </div>

        <?php endif; ?>

      </div>

      <!-- Additional Packages -->

      <div class="wpdev-hidden">

        <ul class="wpdev-list-none wpdev-p-0 wpdev-m-0 wpdev-border-solid wpdev-border-0 wpdev-border-gray-200">

          <!-- Coupon -->
          <li class="wpdev-text-sm wpdev-text-gray-700 wpdev-border-solid wpdev-border-0 wpdev-border-b wpdev-border-gray-200 wpdev-m-0 wpdev-py-3 wpdev-px-4 wpdev-flex wpdev-items-center wpdev-justify-between">

            <span>

              <span class="wpdev-font-medium wpdev-text-gray-700 wpdev-block">

                Coupon Code

              </span>

              <span class="wpdev-text-sm wpdev-text-gray-600 wpdev-block">

                None applied.

              </span>

            </span>

            <div class="wpdev-ml-4 wpdev-flex-shrink-0 wpdev-flex">

              <a href="#" class="wpdev-no-underline">

                Add Coupon

              </a>

            </div>

          </li>
          <!-- Coupon End -->

        </ul>

      </div>

      <div>

        <!-- Title Element -->
        <div class="wpdev-p-4 wpdev-flex wpdev-items-center <?php echo wpdev_env_picker('', 'wpdev-bg-gray-100 wpdev-border-solid wpdev-border-0 wpdev-border-b wpdev-border-gray-200'); ?>">

          <h3 class="wpdev-m-0 <?php echo wpdev_env_picker('', 'wpdev-widget-title'); ?>">

            <?php echo __('Additional Packages & Services', 'wpdev'); ?>

          </h3>

        </div>
        <!-- Title Element - End -->

        <?php if ($membership->has_addons()) : ?>

          <ul class="wpdev-list-none wpdev-p-0 wpdev-m-0 wpdev-border-solid wpdev-border-0 wpdev-border-t wpdev-border-gray-200">

            <?php foreach ($membership->get_addon_products() as $addon) : ?>

            <!-- Packages and Services -->

            <li class="wpdev-text-sm wpdev-text-gray-700 wpdev-border-solid wpdev-border-0 wpdev-border-b wpdev-border-gray-200 wpdev-m-0 wpdev-py-3 wpdev-px-4 wpdev-flex wpdev-items-center wpdev-justify-between">

              <span>

                <span class="wpdev-font-medium wpdev-text-gray-700 wpdev-block">

                  <?php echo $addon['product']->get_name(); ?>
                  <code class="wpdev-ml-2 wpdev-text-xs wpdev-font-normal">

                      x <?php echo $addon['quantity']?>

                  </code>

                </span>

                <span class="wpdev-text-sm wpdev-text-gray-600 wpdev-block">

                  <!-- <span class="wpdev-text-gray-500 wpdev-line-through">$29 per month</span>  -->
                  <?php echo $addon['product']->get_price_description(); ?>

                </span>

              </span>

              <div class="wpdev-ml-4 wpdev-flex-shrink-0 wpdev-flex">

                <a
                  title="<?php esc_attr_e('Product Details', 'wpdev'); ?>"
                  href="<?php echo esc_attr(wpdev_get_form_url('see_product_details', array(
                    'product' => $addon['product']->get_slug(),
                    'width'   => 500,
                  ))); ?>"
                  class="wubox wpdev-ml-4 wpdev-no-underline"
                >

                  <?php _e('Details', 'wpdev'); ?>

                </a>

                <?php if ($addon['product']->is_recurring() && (!$pending_products || wpdev_get_isset($pending_products, $addon['product']->get_id()))) : ?>

                  <a
                    title="<?php printf(__('Cancel %s', 'wpdev'), $addon['product']->get_name()); ?>"
                    href="<?php echo esc_attr(wpdev_get_form_url('edit_membership_product_modal', array(
                      'membership' => $membership->get_hash(),
                      'product'    => $addon['product']->get_slug(),
                      'width'      => 500,
                    ))); ?>"
                    class="wubox wpdev-ml-4 wpdev-no-underline delete wpdev-text-red-500 hover:wpdev-text-red-600"
                  >

                    <?php _e('Cancel', 'wpdev'); ?>

                  </a>

                <?php endif; ?>

              </div>

            </li>

            <!-- Packages and Services - End -->

            <?php endforeach; ?>

          </ul>

        <?php else : ?>

          <div class="wpdev-px-4 wpdev-py-6 wpdev-text-center wpdev-text-gray-600">
            <?php _e('No packages or services found.', 'wpdev'); ?>
          </div>

        <?php endif; ?>

      </div>

      <?php if ($membership->is_recurring()) : ?>

        <!-- Summary Line - Total Applied -->
        <div class="<?php echo wpdev_env_picker('', 'wpdev-bg-gray-100 wpdev-border-solid wpdev-border-0 wpdev-border-t wpdev-border-gray-200'); ?> wpdev-m-0 wpdev-p-4 wpdev-rounded lg:wpdev-flex wpdev-items-center wpdev-justify-between">

          <div class="wpdev-text-lg">

            <small class="wpdev-block wpdev-text-xs wpdev-uppercase wpdev-font-bold wpdev-text-gray-600">
              <?php _e('Total', 'wpdev'); ?>
            </small>

            <!-- <span class="wpdev-text-gray-500 wpdev-line-through">$29</span> -->

            <span>
              <?php echo wpdev_format_currency($membership->get_amount(), $membership->get_currency()) ?>
            </span>

            <span class="wpdev-text-gray-500 wpdev-text-sm">
              <?php echo $membership->get_recurring_description(); ?>
            </span>

          </div>

        </div>
        <!-- Summary Line - Total Applied End -->

      <?php endif; ?>

    <?php endif; ?>

  </div>

</div>
