<?php
/**
 * Account summary view.
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

      <?php if (wpdev_request('page') !== 'account') : ?>

        <div class="wpdev-ml-auto">

          <a
            title="<?php esc_attr_e('See More', 'wpdev'); ?>"
            class="wpdev-text-sm wpdev-no-underline button"
            href="<?php echo $element->get_manage_url($site->get_id()); ?>"
          >

            <?php _e('See More', 'wpdev'); ?>

          </a>

        </div>

      <?php endif; ?>

    </div>
    <!-- Title Element - End -->

    <ul class="md:wpdev-flex wpdev-m-0 wpdev-list-none wpdev-p-4">

    <?php if ($product) : ?>

      <li class="wpdev-flex-1 wpdev-relative wpdev-m-0">

        <div>

          <strong class="wpdev-text-gray-800 wpdev-text-base">

		        <?php echo $product->get_name(); ?>

          </strong>

        </div>

        <div class="wpdev-text-sm wpdev-text-gray-600">
          <span class="wpdev-block"><?php _e('Your current plan', 'wpdev'); ?></span>
          <!-- <a href="#" class="wpdev-no-underline"><?php _e('Manage &rarr;', 'wpdev'); ?></a> -->
        </div>

      </li>

    <?php endif; ?>

    <?php if ($site_trial) : ?>

    <li class="wpdev-flex-1 wpdev-relative wpdev-m-0">

      <div>

        <strong class="wpdev-text-gray-800 wpdev-text-base">
		      <?php printf(_n('%s day', '%s days', $site_trial, 'wpdev'), $site_trial); ?>
        </strong>

      </div>

      <div class="wpdev-text-sm wpdev-text-gray-600">
        <span class="wpdev-block"><?php _e('Remaining time in trial', 'wpdev'); ?></span>
        <!-- <a href="#" class="wpdev-no-underline"><?php _e('Upgrade &rarr;', 'wpdev'); ?></a> -->
      </div>

    </li>

    <?php endif; ?>

    <li class="wpdev-flex-1 wpdev-relative wpdev-m-0">

      <div>

        <strong class="wpdev-text-gray-800 wpdev-text-base">
          <?php
			/**
			 * Display space used
			 */
			printf($message, size_format($space_used), size_format($space_allowed));
			?>
        </strong>

        <?php if (!$unlimited_space) : ?>

          <span class="wpdev-p-1 wpdev-bg-gray-200 wpdev-inline wpdev-align-text-bottom wpdev-rounded wpdev-text-center wpdev-text-xs wpdev-text-gray-600">
            <?php echo $percentage; ?>%
          </span>

        <?php endif; ?>

      </div>

      <div class="wpdev-text-sm wpdev-text-gray-600">
        <span class="wpdev-block"><?php _e('Disk space used', 'wpdev'); ?></span>
        <!-- <a href="#" class="wpdev-no-underline"><?php _e('Upgrade &rarr;', 'wpdev'); ?></a> -->
      </div>

    </li>

  </ul>

</div>

</div>
