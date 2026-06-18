<?php
/**
 * Login Form
 *
 * @since 2.0.0
 */
?>
<div class="wpdev-styling <?php echo esc_attr($className); ?>">

  <?php if ($logged) : ?>

  <!-- Already Logged Block -->

    <div class="wpdev-p-4 wpdev-bg-yellow-200 wpdev-rounded <?php echo wpdev_env_picker('wpdev-mb-4', 'wpdev-mt-2 wpdev-shadow-sm'); ?>">

      <?php

        // translators: 1$s is the display name of the user currently logged in.
        printf(__('Not %1$s? <a href="%2$s" class="wpdev-no-underline">Log in</a> using your account.', 'wpdev'), wp_get_current_user()->display_name, $login_url);

      ?>

    </div>

  <!-- Already Logged Block - End -->

  <?php else : ?>

    <!-- Title Element -->
    <div class="wpdev-pb-4 wpdev-flex wpdev-items-center">

      <?php if ($display_title) : ?>

        <h2 class="wpdev-m-0 <?php echo wpdev_env_picker('', 'wpdev-widget-title'); ?>">

          <?php echo $title; ?>

        </h2>

      <?php endif; ?>

      <?php if (wpdev_get_setting('enable_registration', true)) : ?>

        <div class="wpdev-ml-auto">

          <a
            title="<?php esc_attr_e('Update Billing Address', 'wpdev'); ?>"
            class="wpdev-text-sm wpdev-no-underline button"
            href="<?php echo wpdev_get_registration_url(); ?>"
          >

            <?php _e('Create an Account', 'wpdev'); ?>

          </a>

        </div>

      <?php endif; ?>

    </div>
    <!-- Title Element - End -->

    <?php $form->render(); ?>

  <?php endif; ?>

</div>
