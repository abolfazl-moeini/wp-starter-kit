<?php
/**
 * Wizard view.
 *
 * @since 2.0.0
 */
?>
<div id="wpdev-wrap" class="wrap wpdev-wrap <?php echo esc_attr($classes); ?>">

  <h1 class="wp-heading-inline">
    <!-- This is here for admin notices placement only -->
  </h1>

  <?php if ($logo) : ?>

    <div class="wpdev-text-center">

      <img style="width: 200px;" src="<?php echo esc_attr($logo); ?>" alt="">

    </div>

  <?php endif; ?>

	<?php if (isset($_GET['deleted'])) : ?>

    <div id="message" class="updated notice wpdev-admin-notice notice-success is-dismissible below-h2">

      <p><?php echo esc_html( $page->labels['deleted_message'] ); ?></p>

    </div>

	<?php endif; ?>

  <hr class="wp-header-end">

  <div id="poststuff" class="md:wpdev-flex wpdev-mr-4 md:wpdev-mr-0">

    <div class="md:wpdev-w-2/12 wpdev-pt-10">

      <span class="wpdev-uppercase wpdev-block wpdev-px-4 wpdev-text-gray-700 wpdev-font-bold">

        <?php echo esc_html( $page->get_title() ); ?>

      </span>

      <?php
      /**
       * Allow plugin developers to add additional buttons to list pages
       *
       * @since 1.8.2
       * @param wpdev_Page WPDev Page instance
       */
      do_action('wpdev_page_wizard_after_title', $page);
      ?>

      <!-- Navigator -->
      <ul class="">

        <?php

        /**
         * We need to set a couple of flags in here to control clickable navigation elements.
         * This flag makes sure only steps the user already went through are clickable.
         */
        $is_pre_current_section = true;

        ?>

        <?php foreach ($sections as $section_name => $section) : ?>

			<?php

			/**
			 * Updates the flag after the current section is looped.
			 */
			if ($current_section === $section_name) {

				$is_pre_current_section = false;

			} // end if;

			?>

        <?php if (wpdev_get_isset($section, 'separator')) : ?>

          <!-- Separator Item -->
          <li class="wpdev-sticky wpdev-py-2 wpdev-px-4">&nbsp;</li>

        <?php else : ?>

          <!-- Menu Item -->
          <li class="wpdev-sticky">

            <!-- Menu Link -->
            <a href="<?php echo esc_url($page->get_section_link($section_name)); ?>" class="wpdev-block wpdev-py-2 wpdev-px-4 wpdev-no-underline wpdev-text-sm wpdev-rounded <?php echo !$clickable_navigation && !$is_pre_current_section ? 'wpdev-pointer-events-none' : ''; ?> <?php echo $current_section === $section_name ? 'wpdev-bg-gray-300 wpdev-text-gray-800' : 'wpdev-text-gray-600 hover:wpdev-text-gray-700'; ?>">
              <?php echo esc_html( $section['title'] ); ?>
            </a>
            <!-- End Menu Link -->

            <?php if (!empty($section['sub-sections'])) : ?>

              <!-- Sub-menu -->
              <ul class="classes">

                <?php foreach ($section['sub-sections'] as $sub_section_name => $sub_section) : ?>

                  <li class="classes">
                    <a href="#" class="wpdev-block wpdev-py-2 wpdev-px-4 wpdev-no-underline wpdev-text-gray-500 hover:wpdev-text-gray-600 wpdev-text-sm">
                      &rarr; <?php echo esc_html( $sub_section['title'] ); ?>
                    </a>
                  </li>

                <?php endforeach; ?>

              </ul>
              <!-- End Sub-menu -->

            <?php endif; ?>

          </li>
          <!-- End Menu Item -->

        <?php endif; ?>

        <?php endforeach; ?>

      </ul>
      <!-- End Navigator -->

    </div>

    <div class="md:wpdev-w-8/12 wpdev-px-4 metabox-holder">

      <form method="post" id="<?php echo esc_attr($form_id); ?>">

        <?php

        /**
         * Print Side Metaboxes
         *
         * Allow plugin developers to add new metaboxes
         *
         * @since 1.8.2
         * @param object Object being edited right now
         */
        do_meta_boxes($screen->id, 'normal', false);

        ?>

        <?php wp_nonce_field(sprintf('saving_%s', $current_section), sprintf('saving_%s', $current_section), false); ?>

        <?php wp_nonce_field(sprintf('saving_%s', $current_section), '_wpdev_nonce'); ?>

      </form>

    </div>

  </div>

	<?php
	/**
	 * Allow plugin developers to add scripts to the bottom of the page
	 *
	 * @since 1.8.2
	 * @param wpdev_Page WPDev Page instance
	 */
	do_action('wpdev_page_wizard_footer', $page);
	?>

</div>
