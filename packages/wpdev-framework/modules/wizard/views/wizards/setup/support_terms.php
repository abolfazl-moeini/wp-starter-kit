<?php
/**
 * Support terms view.
 *
 * @since 2.0.0
 */
?>
<div class="wpdev--mt-7">
  <p><?php _e('This plugin comes with support for issues you may have. Support can be requested via email on <a class="wpdev-no-underline" href="mailto:support@wpdev.ir" target="_blank">support@wpdev.ir</a> and includes:', 'wpdev'); ?></p>

  <ul class="support-available">
    <li class="wpdev-text-green-700">
      <span class="dashicons-wpdev-check"></span>
      <?php _e('Availability of the author to answer questions', 'wpdev'); ?>
    </li>
    <li class="wpdev-text-green-700">
      <span class="dashicons-wpdev-check"></span>
      <?php _e('Answering technical questions about item features', 'wpdev'); ?>
    </li>
    <li class="wpdev-text-green-700">
      <span class="dashicons-wpdev-check"></span>
      <?php _e('Assistance with reported bugs and issues', 'wpdev'); ?>
    </li>
  </ul>

  <p><?php _e('Support <strong>DOES NOT</strong> Include:', 'wpdev'); ?></p>

  <ul class="support-unavailable">
    <li class="wpdev-text-red-500">
      <span class="dashicons-wpdev-circle-with-cross wpdev-align-middle"></span>
      <?php _e('Customization services', 'wpdev'); ?>
    </li>
    <li class="wpdev-text-red-500">
      <span class="dashicons-wpdev-circle-with-cross wpdev-align-middle"></span>
      <?php _e('Installation services', 'wpdev'); ?>
    </li>
    <li class="wpdev-text-red-500">
      <span class="dashicons-wpdev-circle-with-cross wpdev-align-middle"></span>
      <?php _e('Support for 3rd party plugins (i.e. plugins you install yourself later on)', 'wpdev'); ?>
    </li>
  </ul>

</div>
