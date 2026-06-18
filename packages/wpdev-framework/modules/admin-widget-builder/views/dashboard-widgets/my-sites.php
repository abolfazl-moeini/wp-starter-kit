<?php
/**
 * My Sites
 *
 * @since 2.0.0
 */

$current_site = wpdev_get_current_site();

$add_new_url = wpdev_get_setting('enable_multiple_sites') ? $element->get_new_site_url() : wpdev_get_registration_url();

// Redirect back to this page after create the site
$add_new_url = add_query_arg(array(
  'redirect_url' => urlencode(wpdev_get_current_url()),
), $add_new_url);

$show_add_new = wpdev_get_setting('enable_multiple_sites') || wpdev_get_setting('enable_multiple_memberships');

$show_add_new = apply_filters('wpdev_my_sites_show_add_new', $show_add_new);

if (empty($sites) && function_exists('wpdev_render_empty_state')) :

	$empty_args = array(
		'message'                  => __("You don't have any sites yet.", 'wpdev'),
		'sub_message'              => __('Get started by creating your first site.', 'wpdev'),
		'link_label'               => '',
		'link_url'                 => '',
		'link_icon'                => 'dashicons-wpdev-circle-with-plus',
		'display_background_image' => true,
	);

	if ($show_add_new && !empty($add_new_url)) {

		$empty_args['link_url']   = $add_new_url;
		$empty_args['link_label'] = __('Add a new Site', 'wpdev');

	} elseif (is_user_logged_in() && is_super_admin() && !wpdev_get_current_customer()) {

		$empty_args['message']     = __('No customer sites to display.', 'wpdev');
		$empty_args['sub_message'] = __('This page lists sites for customer accounts. Switch to a customer account, or manage sites from the network admin.', 'wpdev');
		$empty_args['link_url']    = is_multisite() ? network_admin_url('sites.php') : '';
		$empty_args['link_label']  = is_multisite() ? __('Go to Network Sites', 'wpdev') : '';

	} elseif (is_user_logged_in() && function_exists('wpdev_get_registration_url') && wpdev_get_setting('enable_registration', true)) {

		$empty_args['link_url']   = wpdev_get_registration_url();
		$empty_args['link_label'] = __('Get Started', 'wpdev');
		$empty_args['sub_message'] = __('Choose a plan to launch your first site.', 'wpdev');

	} elseif (!is_user_logged_in()) {

		$empty_args['sub_message'] = __('Log in to see the sites on your account.', 'wpdev');
		$empty_args['link_url']    = wp_login_url(wpdev_get_current_url());
		$empty_args['link_label']  = __('Log In', 'wpdev');

	} else {

		$empty_args['sub_message'] = __('Contact the network administrator to create your first site.', 'wpdev');

	} // end if;

	$empty_args = apply_filters('wpdev_my_sites_empty_state_args', $empty_args, $sites);

	echo wpdev_render_empty_state($empty_args);

	return;

endif;

?>
<div class="wpdev-styling <?php echo esc_attr($className); ?>">

  <div class="<?php echo wpdev_env_picker('wpdev-mb-4', ''); ?>">

    <div class="wpdev-relative">

      <div
        class="wpdev-grid wpdev-gap-5 wpdev-grid-cols-<?php echo esc_attr((int) $columns); ?> sm:wpdev-grid-cols-<?php echo esc_attr((int) $columns); ?> xl:wpdev-grid-cols-<?php echo esc_attr((int) $columns); ?> lg:wpdev-max-w-none <?php echo wpdev_env_picker('', 'wpdev-py-4'); ?>">

        <?php foreach ((array) $sites as $site) : ?>

          <div class="wpdev-flex wpdev-flex-col wpdev-rounded-lg wpdev-overflow-hidden wpdev-border-solid wpdev-border wpdev-border-gray-300">

            <div class="wpdev-flex-shrink-0">

              <div class="wpdev-absolute wpdev-m-2">

                <?php if ($site->get_membership()) : ?>

                  <?php if ($site->get_id()) : ?>

                    <span
                      class="wpdev-shadow-sm wpdev-inline-flex wpdev-items-center wpdev-px-2 wpdev-py-1 wpdev-rounded wpdev-text-sm wpdev-font-medium <?php echo $site->get_membership()->get_status_class(); ?>"
                    >
                      <?php echo $site->get_membership()->get_status_label(); ?>
                    </span>

                  <?php else : ?>

                    <span
                      class="wpdev-shadow-sm wpdev-inline-flex wpdev-items-center wpdev-px-2 wpdev-py-1 wpdev-rounded wpdev-text-sm wpdev-font-medium wpdev-bg-purple-200 wpdev-text-purple-700"
                    >
                      <?php echo __('Pending', 'wpdev'); ?>
                    </span>

                  <?php endif; ?>

                <?php endif; ?>

                <!-- <span
                  class="wpdev-shadow-sm wpdev-inline-flex wpdev-items-center wpdev-px-2 wpdev-py-1 wpdev-rounded wpdev-text-sm wpdev-font-medium wpdev-bg-yellow-200 wpdev-text-yellow-800">
                  <span class="dashicons-wpdev-warning wpdev-mr-1 wpdev-text-xs"></span>
                  Billing Issues
                </span> -->

                <?php if ($site->get_id() && $site->is_customer_primary_site()) : ?>

                  <span
                    class="wpdev-shadow-sm wpdev-inline-flex wpdev-items-center wpdev-px-2 wpdev-py-1 wpdev-rounded wpdev-text-sm wpdev-font-medium wpdev-bg-gray-800 wpdev-text-gray-300">
                    <?php _e('Primary', 'wpdev'); ?>
                  </span>

                <?php endif; ?>

                <!-- <span
                  class="wpdev-shadow-sm wpdev-inline-flex wpdev-items-center wpdev-px-2 wpdev-py-1 wpdev-rounded wpdev-text-sm wpdev-font-medium wpdev-bg-red-100 wpdev-text-red-800">
                  <span class="dashicons-wpdev-warning wpdev-mr-1 wpdev-text-xs"></span>
                  Offline
                </span> -->

              </div>

              <?php if ($display_images) : ?>

                <img
                  class="wpdev-h-48 wpdev-w-full wpdev-object-cover wpdev-block"
                  src="<?php echo $site->get_featured_image(); ?>"
                  alt="<?php printf(esc_attr__('Site Image: %s', 'wpdev'), $site->get_title()); ?>"
                  style="background-color: rgba(255, 255, 255, 0.5)"
                >

              <?php else : ?>

                <div class="">&nbsp;</div>

              <?php endif; ?>

            </div>

            <div class="wpdev-flex-1 wpdev-bg-white wpdev-py-6 wpdev-px-4 wpdev-flex wpdev-flex-col wpdev-justify-between">

              <div class="wpdev-flex-1">

                <?php if ($site->get_id()): ?>
                  <a href="<?php echo esc_attr($site->get_active_site_url()); ?>" class="wpdev-block wpdev-no-underline">

                    <span class="wpdev-text-base wpdev-font-semibold wpdev-text-gray-800 wpdev-block" <?php echo wpdev_tooltip_text(__('Visit Site', 'wpdev')); ?>>
                      <?php echo $site->get_title(); ?> <span class="wpdev-text-sm dashicons-wpdev-popup"></span>
                    </span>

                    <span class="wpdev-text-xs wpdev-text-gray-600 wpdev-block wpdev-mt-2">
                      <?php echo str_replace(array('http://', 'https://'), '', $site->get_active_site_url()); ?>
                    </span>

                  </a>
                <?php else : ?>
                  <div class="wpdev-block wpdev-no-underline">

                    <span class="wpdev-text-base wpdev-font-semibold wpdev-text-gray-800 wpdev-block">
                      <?php echo $site->get_title(); ?>
                    </span>

                  </div>
                <?php endif; ?>

              </div>

            </div>

            <?php if ($site->get_id()): ?>

              <ul
                class="wpdev-p-0 wpdev-m-0 wpdev-px-4 wpdev-text-center wpdev-py-2 wpdev-my-0 wpdev-bg-gray-100 wpdev-border-solid wpdev-border-0 wpdev-border-t wpdev-border-gray-300">

                <?php if ( wpdev()->currents->get_site() && wpdev()->currents->get_site()->get_id() == $site->get_id()) : ?>

                  <li class="wpdev-block wpdev-my-2">
                    <span
                      class="wpdev-w-full wpdev-no-underline <?php echo wpdev_env_picker('wpdev-text-sm', 'button button-primary button-disabled'); ?>">
                      <?php _e('Current Site', 'wpdev'); ?>
                    </span>
                  </li>

                <?php else : ?>

                  <li class="wpdev-block wpdev-my-2">
                    <a href="<?php echo esc_url($element->get_manage_url($site->get_id(), $site_manage_type, $custom_manage_page)); ?>"
                      class="wpdev-w-full wpdev-no-underline <?php echo wpdev_env_picker('wpdev-text-sm', 'button button-primary'); ?>">
                      <?php _e('Manage', 'wpdev'); ?>
                    </a>
                  </li>

                <?php endif; ?>

              </ul>

            <?php endif; ?>

          </div>

        <?php endforeach; ?>

        <?php if ($show_add_new) : ?>

          <a href="<?php echo esc_url($add_new_url); ?>"
            class="wpdev-no-underline wpdev-text-gray-600 wpdev-flex wpdev-flex-col wpdev-rounded-lg wpdev-border-2 wpdev-border-dashed wpdev-border-gray-400 wpdev-overflow-hidden wpdev-items-center wpdev-justify-center"
            style="background-color: rgba(255, 255, 255, 0.1)">

            <span class="wpdev-text-center wpdev-p-8">
              <span class="wpdev-text-3xl dashicons-wpdev-circle-with-plus"></span>
              <span class="wpdev-text-lg wpdev-mt-2 wpdev-block"><?php _e('Add new Site', 'wpdev'); ?></span>
            </span>

          </a>

        <?php endif; ?>

      </div>

    </div>

  </div>

</div>

<!-- <div class="md:wpdev-grid-cols-4"></div> -->
<!-- <div class="md:wpdev-grid-cols-5"></div> -->
<!-- <div class="md:wpdev-grid-cols-6"></div> -->
