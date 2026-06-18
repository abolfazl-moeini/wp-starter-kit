<?php
/**
 * The Current Site view
 *
 * @since 2.0.0
 */
?>
<div class="wpdev-styling <?php echo esc_attr($className); ?>">

  <div class="<?php echo wpdev_env_picker('', 'wpdev-mt-4'); ?>">

    <?php if ($display_breadcrumbs) : ?>

      <div class="wpdev-current-site-breadcrumbs">

        <div class="wpdev-bg-gray-100">

          <nav
            class="wpdev-border wpdev-rounded wpdev-border-solid wpdev-flex wpdev-px-4 <?php echo wpdev_env_picker('wpdev-border-gray-300', 'wpdev-border-gray-400'); ?>"
            aria-label="<?php esc_attr_e('Breadcrumb', 'wpdev'); ?>"
          >

            <ol class="wpdev-p-0 wpdev-m-0 wpdev-w-full wpdev-mx-auto wpdev-flex">

              <li class="wpdev-flex wpdev-m-0 wpdev-p-0">

                <div class="wpdev-flex wpdev-items-center">

                  <svg class="wpdev-flex-shrink-0 wpdev-h-5 wpdev-w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                  </svg>

                  <span class="screen-reader-text"><?php _e('Home'); ?></span>

                </div>

              </li>

              <li class="wpdev-flex wpdev-m-0 wpdev-p-0">
                <div class="wpdev-flex wpdev-items-center">
                  <svg class="wpdev-flex-shrink-0 wpdev-w-6 wpdev-h-full wpdev-text-gray-300" viewBox="0 0 24 44" preserveAspectRatio="none" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path d="M.293 0l22 22-22 22h1.414l22-22-22-22H.293z" />
                  </svg>
                  <a href="<?php echo esc_url($my_sites_url); ?>" class="wpdev-mx-4 wpdev-text-sm wpdev-font-medium wpdev-text-gray-500 hover:wpdev-text-gray-700 wpdev-no-underline">
		                <?php _e('Your Sites', 'wpdev'); ?>
                  </a>
                </div>
              </li>
              <li class="wpdev-flex wpdev-m-0 wpdev-p-0">
                <div class="wpdev-flex wpdev-items-center">
                  <svg class="wpdev-flex-shrink-0 wpdev-w-6 wpdev-h-full wpdev-text-gray-300" viewBox="0 0 24 44" preserveAspectRatio="none" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path d="M.293 0l22 22-22 22h1.414l22-22-22-22H.293z" />
                  </svg>
                  <span class="wpdev-mx-4 wpdev-text-sm wpdev-font-medium wpdev-text-gray-700 hover:wpdev-text-gray-700">
		                <?php echo $current_site->get_title(); ?>
                  </span>
                </div>
              </li>
            </ol>

          </nav>

        </div>

      </div>

    <?php endif; ?>

    <div class="wpdev-py-4 <?php echo wpdev_env_picker('', ''); ?>">

      <div class="wpdev-relative md:wpdev-flex">

        <?php if ($display_image) : ?>

          <div class="wpdev-mb-4 md:wpdev-mb-0 <?php echo $screenshot_position === 'right' ? 'wpdev-order-12 md:wpdev-ml-6' : 'md:wpdev-mr-6'; ?>">

            <img
              style="max-width: <?php echo esc_attr($screenshot_size); ?>px;"
              class="wpdev-w-full wpdev-rounded wpdev-border wpdev-border-solid <?php echo wpdev_env_picker('wpdev-border-gray-300', 'wpdev-border-gray-400'); ?>"
              src="<?php echo $current_site->get_featured_image(); ?>"
              alt="<?php printf(esc_attr__('Site Image: %s', 'wpdev'), $current_site->get_title()); ?>"
            >

          </div>

        <?php endif; ?>

        <div class="wpdev-relative wpdev-flex wpdev-flex-grow wpdev-my-4 wpdev-px-2">

          <div class="wpdev-self-center wpdev-flex-grow">

            <span class="wpdev-text-3xl wpdev-font-bold wpdev-text-gray-900 sm:wpdev-text-4xl wpdev-block wpdev-leading-none">

              <?php echo $current_site->get_title(); ?>

            </span>

            <span class="wpdev-text-sm wpdev-text-gray-600 wpdev-block wpdev-my-3 wpdev-leading-none">

              <?php echo $current_site->get_active_site_url(); ?>

            </span>

            <?php if ($display_description) : ?>

              <span class="wpdev-text-sm wpdev-text-gray-700 wpdev-my-5 wpdev-block wpdev-leading-none">

                <?php echo $current_site->get_description(); ?>

              </span>

            <?php endif; ?>

            <!-- Site Actions -->
            <ul class="wpdev-list-none wpdev-p-0 wpdev-m-0 <?php echo wpdev_env_picker('', 'wpdev-mt-4'); ?>">

              <?php foreach ($actions as $action) : ?>

                <li class="wpdev-my-4 sm:wpdev-m-0 sm:wpdev-inline sm:wpdev-mr-6">

                  <a
                    class="wpdev-text-sm wpdev-no-underline <?php echo esc_attr($action['classes']); ?>"
                    href="<?php echo esc_attr($action['href']); ?>"
                    title="<?php echo esc_attr($action['label']); ?>"
                  >

                    <span class="<?php echo esc_attr($action['icon_classes']); ?>"></span>

                    <?php echo $action['label']; ?>

                  </a>

                </li>

              <?php endforeach; ?>

            </ul>
            <!-- Site Actions End -->

          </div>

        </div>

      </div>

    </div>

  </div>

</div>
