<?php
/**
 * Displays the Jumper UI.
 *
 * @package WPDev/Views
 * @subpackage Jumper
 * @since 2.0.0
 */

?>
<div id="wpdev-jumper" style="display: none;" class="wpdev-styling">

  <div class="wpdev-jumper-icon-container wpdev-relative wpdev-w-full wpdev-bg-gray-100 wpdev-rounded">

    <select id="wpdev-jumper-select" data-placeholder="<?php esc_attr_e('Search Anything...', 'wpdev'); ?>">

      <option></option>

      <?php if (!count($menu_groups)) : ?>

        <option></option>

        <optgroup label="<?php esc_attr_e('Error', 'wpdev'); ?>">

          <option value="<?php echo network_admin_url('?wpdev-rebuild-jumper=1'); ?>">

            <?php _e('Click to rebuild menu list', 'wpdev'); ?>

          </option>

        </optgroup>

      <?php endif; ?>

      <?php foreach ($menu_groups as $optgroup => $menus) : ?>

        <optgroup label="<?php esc_attr_e('Menu', 'wpdev'); ?> - <?php echo esc_attr($optgroup); ?>" value="<?php esc_attr_e('Menu', 'wpdev'); ?> - <?php echo esc_attr($optgroup); ?>">

          <?php foreach ($menus as $url => $menu) : ?>

            <option value="<?php echo esc_attr($url); ?>">

              <?php echo $menu; ?>

            </option>

          <?php endforeach; ?>

        </optgroup>

      <?php endforeach; ?>

      <optgroup label="<?php esc_attr_e('Settings', 'wpdev'); ?>" value="setting"></optgroup>

      <optgroup label="<?php esc_attr_e('Users', 'wpdev'); ?>" value="user"></optgroup>

      <optgroup label="<?php esc_attr_e('Customers', 'wpdev'); ?>" value="customer"></optgroup>

      <optgroup label="<?php esc_attr_e('Products', 'wpdev'); ?>" value="product"></optgroup>

      <optgroup label="<?php esc_attr_e('Domains', 'wpdev'); ?>" value="domain"></optgroup>

      <optgroup label="<?php esc_attr_e('Sites', 'wpdev'); ?>" value="site"></optgroup>

      <optgroup label="<?php esc_attr_e('Memberships', 'wpdev'); ?>" value="membership"></optgroup>

      <optgroup label="<?php esc_attr_e('Payments', 'wpdev'); ?>" value="payment"></optgroup>

      <optgroup label="<?php esc_attr_e('Discount Codes', 'wpdev'); ?>" value="discount-code"></optgroup>

      <optgroup label="<?php esc_attr_e('Webhooks', 'wpdev'); ?>" value="webhook"></optgroup>

      <optgroup label="<?php esc_attr_e('Broadcasts', 'wpdev'); ?>" value="broadcast"></optgroup>

      <optgroup label="<?php esc_attr_e('Checkout Forms', 'wpdev'); ?>" value="checkout-form"></optgroup>

      <?php

      /**
       * Allow plugin developers to add new opt-groups.
       *
       * @since 2.0.0
       */
      do_action('wpdev_jumper_options');

      ?>

    </select>

  </div>

  <div class="wpdev-jumper-redirecting wpdev-bg-gray-200">

    <?php _e('Redirecting you to the target page...', 'wpdev'); ?>

  </div>

  <div class="wpdev-jumper-loading wpdev-bg-gray-200">

    <?php _e('Searching Results...', 'wpdev'); ?>

  </div>

</div>
