<?php
/**
 * Ready view.
 *
 * @since 2.0.0
 */
?>
<div class="wpdev-bg-white wpdev-p-4 wpdev--mx-6 wpdev-flex wpdev-content-center" style="height: 400px;">

  <div class="wpdev-self-center wpdev-text-center wpdev-w-full">

    <span class="dashicons dashicons-yes-alt wpdev-text-green-400 wpdev-w-auto wpdev-h-auto wpdev-text-5xl wpdev-mb-2"></span>

    <h1 class="wpdev-text-gray-800">
      <?php echo sprintf(__('We are ready, %s!', 'wpdev'), apply_filters('wpdev_setup_step_done_name', isset($page->customer->first) ? $page->customer->first : __('my friend', 'wpdev'))); ?>
    </h1>

    <p class="wpdev-text-lg wpdev-text-gray-600 wpdev-my-4">
      <?php _e('We told you this was going to be a walk in the park!', 'wpdev'); ?>
    </p>

    <p class="wpdev-text-lg wpdev-text-gray-600 wpdev-my-4">
      <?php _e('You now have everything you need in place to start building your Website as a Service business!', 'wpdev'); ?>
    </p>

    <p class="wpdev-text-lg wpdev-text-gray-600 wpdev-my-4">
      <?php _e('Don\'t worry! We\'ll guide you through the first steps.', 'wpdev'); ?>
    </p>

    <p>
      <a href="https://twitter.com/share" class="twitter-share-button" data-url="https://wpdev.ir" data-text="<?php echo esc_attr('I just created my own premium WordPress site network with #wpdev'); ?>" data-via="wpdev" data-size="large">Tell the World!</a>

			<script>!function(d,s,id){var js,fjs=d.getElementsByTagName(s)[0];if(!d.getElementById(id)){js=d.createElement(s);js.id=id;js.src="//platform.twitter.com/widgets.js";fjs.parentNode.insertBefore(js,fjs);}}(document,"script","twitter-wjs");</script>
    </p>

  </div>

</div>

<!-- Submit Box -->
<div class="wpdev-bg-gray-100 wpdev--m-in wpdev-mt-4 wpdev-p-4 wpdev-overflow-hidden wpdev-border-t wpdev-border-solid wpdev-border-l-0 wpdev-border-r-0 wpdev-border-b-0 wpdev-border-gray-300">

  <span class="wpdev-float-right">

    <a href="<?php echo esc_url(wpdev_network_admin_url('wpdev-about')); ?>" class="button button-primary button-large">
     <?php _e('Finish!', 'wpdev'); ?>
    </a>

  </span>

</div>
<!-- End Submit Box -->

